import asyncio
import json
import logging
import random
import re
from typing import Any, Dict, List, Literal, Optional, Set

from google.adk import Agent, Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types
from pydantic import BaseModel, Field

from .tool_registry import ToolRegistry

logger = logging.getLogger(__name__)


class PlanStep(BaseModel):
    """A single step in a refinement plan."""

    tool_name: str = Field(..., description="Name of the tool to use from the registry")
    tool_input: Dict[str, Any] = Field(
        default_factory=dict, description="Validated arguments for the tool"
    )
    step_description: str = Field(
        ..., description="Goal-oriented description for the user"
    )
    ui_options: Dict[str, List[str]] = Field(
        default_factory=dict,
        description=(
            "Optional UI candidate values keyed by tool_input field name. "
            "Use this so users can quickly pick from model-reasoned options."
        ),
    )


class GenerationDraft(BaseModel):
    """Editable generation parameters shown in the chat clarification UI."""

    main_subject: str = Field(..., description="Primary subject to generate")
    background_setting: str = Field(
        ..., description="Scene environment or location"
    )
    style_or_medium: str = Field(
        ..., description="Visual medium/style direction"
    )
    lighting: str = Field(..., description="Lighting setup")
    composition: str = Field(
        "", description="Composition direction such as centered/rule of thirds"
    )
    extra_details: str = Field(
        "", description="Optional additional details for prompt polishing"
    )
    polished_prompt: str = Field(
        "", description="Model-crafted polished prompt from these fields"
    )


class AnalysisResult(BaseModel):
    """Structured query analysis used by the orchestrator/UI."""

    intent: Literal["generation", "refinement"] = Field(
        ..., description="Classified intent"
    )
    explanation: str = Field(..., description="Why this classification was made")
    plan: Optional[List[PlanStep]] = Field(
        None, description="Proposed list of steps if intent is refinement"
    )
    generation_draft: Optional[GenerationDraft] = Field(
        None,
        description="Suggested editable generation fields for new-scene requests",
    )


class PenguinAnalyzer:
    """
    LLM-driven analyzer for generation vs refinement.
    The model decides intent directly from user request + optional scene context.
    """

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.session_service = InMemorySessionService()
        self.max_llm_retries = 2

    _LOCATION_OPTIONS = [
        "center",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "center-left",
        "center-right",
    ]
    _SIZE_OPTIONS = ["small", "medium", "large", "very large"]
    _ORIENTATION_OPTIONS = ["front-facing", "left", "right", "back", "angled"]
    _LIGHTING_OPTIONS = ["natural", "studio", "soft diffused", "dramatic", "golden hour"]
    _CAMERA_OPTIONS = ["eye-level", "overhead", "low-angle", "high-angle"]
    _LENS_OPTIONS = ["wide-angle", "standard", "portrait", "macro"]
    _COMPOSITION_OPTIONS = [
        "centered",
        "rule-of-thirds",
        "diagonal",
        "symmetrical",
        "asymmetrical",
    ]
    _COLOR_SCHEME_OPTIONS = ["vibrant", "muted", "monochrome", "warm", "cool", "pastel", "cinematic"]
    _MOOD_OPTIONS = ["neutral", "cheerful", "dramatic", "serene", "mysterious"]
    _STYLE_MEDIUM_OPTIONS = ["photograph", "painting", "digital art", "sketch", "3D render"]
    _AESTHETIC_STYLE_OPTIONS = [
        "realistic",
        "artistic",
        "vintage",
        "modern",
        "dramatic",
        "surreal",
        "minimalism",
        "abstract",
        "cinematic",
    ]
    _OBJECT_PROPERTY_OPTIONS = [
        "location",
        "relative_size",
        "orientation",
        "description",
        "shape_and_color",
        "texture",
        "appearance_details",
        "pose",
        "expression",
        "action",
    ]
    _HEX_COLOR_RE = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})")

    def _get_system_instruction(self) -> str:
        """Build a single prompt that handles both generation and refinement."""
        schemas = ToolRegistry.get_all_schemas()

        tool_lines: List[str] = []
        for name, schema in schemas.items():
            description = schema.get("description", "No description")
            props = schema.get("properties", {})
            required = schema.get("required", [])
            tool_lines.append(
                f"- {name}: {description}\n"
                f"  properties={json.dumps(props, ensure_ascii=True)}\n"
                f"  required={json.dumps(required, ensure_ascii=True)}"
            )

        tools_text = "\n".join(tool_lines)

        return f"""You are the Penguin planning model for product-photography workflows.
Your job is to choose intent and produce a machine-usable plan.

You handle BOTH:
1) generation: create a brand-new image/scene.
2) refinement: edit an existing loaded scene.

Inputs:
- user query
- optional current scene context (seed + structured prompt).

Decision policy:
- Choose \"generation\" when the user clearly wants a brand-new scene.
- Choose \"refinement\" when the user asks to modify the current scene or object properties.
- If context exists and user language is ambiguous, use your best judgment and explain why.

Refinement planning policy:
- For \"refinement\", return a non-empty \"plan\" (1-5 steps).
- Every step must use one valid tool_name from the tool list.
- tool_input must match the tool schema and required fields.
- Keep steps concrete and executable. Avoid vague tool_input.
- Use select_object before object-specific changes when object targeting is unclear.
- For adjust_object_property:
  - Prefer property=\"description\" for semantic replacement requests like \"change girl to man\".
  - Include at least one target hint: mask_id, object_index/index, or object_name.
  - If exact mask_id is unknown, use object_name (for example, \"girl\") and optionally object_index.
- Include ui_options for every refinement step:
  - ui_options is an object keyed by tool_input field (for example: \"conditions\", \"value\").
  - Each key should have 3-7 concise candidate values the user can pick from.
  - The first candidate should usually be the value currently in tool_input for that field.
  - For adjust_object_property value options, include both:
    - \"value\": generic options for the current property.
    - \"value_for_<property>\": property-specific options, e.g. \"value_for_shape_and_color\".
  - For color-related fields, include meaningful color suggestions (hex palette and/or named schemes) when relevant.

UI-compatible tool_input conventions (important):
- update_lighting:
  - Prefer numeric fields direction_x, direction_y, rotation, tilt.
  - Use shadows as integer 0-5.
  - conditions should be one of: natural, studio, soft diffused, dramatic, golden hour.
- update_photographic:
  - camera_angle should be one of: eye-level, overhead, low-angle, high-angle.
  - lens_focal_length should be one of: wide-angle, standard, portrait, macro.
  - depth_of_field and focus should be integers in 0-100.
- update_aesthetics:
  - composition should be one of: centered, rule-of-thirds, diagonal, symmetrical, asymmetrical.
  - color_scheme should be one of: vibrant, muted, monochrome, warm, cool, pastel, cinematic.
  - mood_atmosphere should be one of: neutral, cheerful, dramatic, serene, mysterious.

Generation policy:
- For \"generation\", set \"plan\" to null.
- For \"generation\", you MUST return a non-null generation_draft with meaningful values.
- generation_draft values should be concrete, editable defaults (not placeholders).
- polished_prompt should read like a high-quality production prompt.

Available tools and schemas:
{tools_text}

Output requirements (strict):
- Return ONLY valid JSON.
- No markdown, no prose outside JSON.
- Use EXACT schema:
{{
  \"intent\": \"generation\" | \"refinement\",
  \"explanation\": \"string\",
  \"plan\": null | [
    {{
      \"tool_name\": \"string\",
      \"tool_input\": {{ ... }},
      \"step_description\": \"string\",
      \"ui_options\": {{
        \"field_name\": [\"option 1\", \"option 2\", \"option 3\"]
      }}
    }}
  ],
  \"generation_draft\": null | {{
      \"main_subject\": \"string\",
      \"background_setting\": \"string\",
      \"style_or_medium\": \"string\",
      \"lighting\": \"string\",
      \"composition\": \"string\",
      \"extra_details\": \"string\",
      \"polished_prompt\": \"string\"
  }}
}}
"""

    def _get_generation_polisher_instruction(self) -> str:
        return """You are Penguin's generation prompt polisher.
You receive:
- an original user query
- an editable generation draft with structured fields
- optional scene context

Your task:
1) Improve the structured fields while preserving user intent.
2) Fill weak/empty fields with plausible, production-grade defaults.
3) Produce a polished_prompt that is concise, vivid, and ready for image generation.

Rules:
- Do NOT output markdown.
- Return ONLY valid JSON.
- Keep field values concrete and editable.
- polished_prompt must align with the structured fields.

Return EXACT schema:
{
  "main_subject": "string",
  "background_setting": "string",
  "style_or_medium": "string",
  "lighting": "string",
  "composition": "string",
  "extra_details": "string",
  "polished_prompt": "string"
}
"""

    @staticmethod
    def _build_context_summary(image_context: Optional[Dict[str, Any]]) -> Optional[str]:
        if not isinstance(image_context, dict):
            return None

        structured_prompt = image_context.get("structured_prompt")
        context_payload: Dict[str, Any] = {
            "seed": image_context.get("seed"),
            "generation_id": image_context.get("generation_id"),
            "selected_mask_id": image_context.get("selected_mask_id"),
        }
        if isinstance(structured_prompt, dict):
            context_payload.update(
                {
                    "short_description": structured_prompt.get("short_description"),
                    "background_setting": structured_prompt.get("background_setting"),
                    "objects": structured_prompt.get("objects"),
                    "lighting": structured_prompt.get("lighting"),
                    "aesthetics": structured_prompt.get("aesthetics"),
                    "photographic_characteristics": structured_prompt.get(
                        "photographic_characteristics"
                    ),
                    "style_medium": structured_prompt.get("style_medium"),
                    "artistic_style": structured_prompt.get("artistic_style"),
                }
            )

        masks_catalog = image_context.get("masks_catalog")
        if isinstance(masks_catalog, list) and masks_catalog:
            context_payload["masks_catalog"] = masks_catalog

        memory_context = image_context.get("memory_context")
        if isinstance(memory_context, dict) and memory_context:
            context_payload["memory"] = memory_context

        compact = {
            key: value
            for key, value in context_payload.items()
            if value not in (None, "", [], {})
        }
        if not compact:
            return None
        return json.dumps(compact, ensure_ascii=True)

    @staticmethod
    def _extract_text(content: Any) -> str:
        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, dict):
            try:
                return json.dumps(content, ensure_ascii=True)
            except Exception:
                return str(content)

        parts = getattr(content, "parts", None)
        if parts:
            chunks: List[str] = []
            for part in parts:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text.strip():
                    chunks.append(text)
            if chunks:
                return "".join(chunks)

        text_attr = getattr(content, "text", None)
        if isinstance(text_attr, str):
            return text_attr
        return str(content)

    @staticmethod
    def _parse_json_payload(text: str) -> Dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            fence_end = cleaned.find("\n")
            if fence_end != -1:
                cleaned = cleaned[fence_end + 1 :]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]

        return json.loads(cleaned)

    @staticmethod
    def _is_rate_limited_error(exc: Exception) -> bool:
        seen: Set[int] = set()
        current: Optional[BaseException] = exc

        while current is not None and id(current) not in seen:
            seen.add(id(current))

            status_code = getattr(current, "status_code", None)
            if status_code == 429:
                return True

            message = str(current).lower()
            if any(
                token in message
                for token in (
                    "resource_exhausted",
                    "rate limit",
                    "too many requests",
                    "status code 429",
                    "error code-429",
                )
            ):
                return True

            current = getattr(current, "__cause__", None) or getattr(
                current, "__context__", None
            )

        return False

    async def _run_agent_for_text(
        self,
        *,
        runner: Runner,
        session_id: str,
        user_text: str,
    ) -> str:
        delay_seconds = 1.0
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.max_llm_retries + 2):
            try:
                final_text: Optional[str] = None
                async for event in runner.run_async(
                    user_id="default_user",
                    session_id=session_id,
                    new_message=types.UserContent(parts=[types.Part(text=user_text)]),
                ):
                    if not event.content:
                        continue
                    event_text = self._extract_text(event.content).strip()
                    if event_text:
                        final_text = event_text

                if not final_text:
                    raise ValueError("Agent failed to produce any content")

                return final_text

            except Exception as exc:
                last_exc = exc
                should_retry = self._is_rate_limited_error(exc) and (
                    attempt <= self.max_llm_retries
                )
                if not should_retry:
                    raise

                jitter = random.uniform(0.0, 0.4)
                wait_time = delay_seconds + jitter
                logger.warning(
                    f"LLM rate limit on attempt {attempt}/{self.max_llm_retries + 1}; "
                    f"retrying in {wait_time:.2f}s"
                )
                await asyncio.sleep(wait_time)
                delay_seconds *= 2.0

        if last_exc:
            raise last_exc
        raise RuntimeError("Agent request failed unexpectedly")

    def _build_analysis_fallback_explanation(self, exc: Exception) -> str:
        if self._is_rate_limited_error(exc):
            return (
                "AI analysis is temporarily rate-limited. "
                "I prepared a fallback generation draft so you can continue."
            )
        return (
            "AI analysis failed, so I prepared a fallback generation draft. "
            "You can still adjust and generate."
        )

    @staticmethod
    def _canonical_tool_name(tool_name: str) -> str:
        normalized = (tool_name or "").strip().lower()
        aliases = {
            "object_selection": "select_object",
            "update_camera": "update_photographic",
            "update_photography": "update_photographic",
            "update_lighting_conditions": "update_lighting",
            "update_scene_background": "update_background",
        }
        return aliases.get(normalized, normalized)

    @staticmethod
    def _unique_options(values: List[str], max_items: int = 10) -> List[str]:
        seen: Set[str] = set()
        result: List[str] = []
        for raw in values:
            text = str(raw).strip()
            if not text:
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            result.append(text)
            if len(result) >= max_items:
                break
        return result

    def _normalize_ui_options(self, raw_ui_options: Any) -> Dict[str, List[str]]:
        if not isinstance(raw_ui_options, dict):
            return {}

        normalized: Dict[str, List[str]] = {}
        for raw_key, raw_value in raw_ui_options.items():
            if not isinstance(raw_key, str):
                continue
            key = raw_key.strip()
            if not key:
                continue

            candidates: List[str] = []
            if isinstance(raw_value, str):
                candidates = [
                    part.strip()
                    for part in re.split(r"[\n,;]+", raw_value)
                    if isinstance(part, str) and part.strip()
                ]
            elif isinstance(raw_value, list):
                for item in raw_value:
                    if isinstance(item, (str, int, float, bool)):
                        text = str(item).strip()
                        if text:
                            candidates.append(text)

            cleaned = self._unique_options(candidates)
            if cleaned:
                normalized[key] = cleaned

        return normalized

    def _extract_color_candidates(self, value: Any) -> List[str]:
        if value is None:
            return []
        text = str(value)
        colors = [token.upper() for token in self._HEX_COLOR_RE.findall(text)]
        if colors:
            return self._unique_options(colors, max_items=8)
        return []

    def _build_default_ui_options(
        self, canonical_tool: str, tool_input: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        defaults: Dict[str, List[str]] = {}

        if canonical_tool == "update_lighting":
            defaults["conditions"] = list(self._LIGHTING_OPTIONS)
            defaults["shadows"] = ["0", "1", "2", "3", "4", "5"]

        elif canonical_tool == "update_photographic":
            defaults["camera_angle"] = list(self._CAMERA_OPTIONS)
            defaults["lens_focal_length"] = list(self._LENS_OPTIONS)
            defaults["depth_of_field"] = ["20", "35", "50", "65", "80"]
            defaults["focus"] = ["30", "50", "70", "85", "95"]

        elif canonical_tool == "update_aesthetics":
            defaults["composition"] = list(self._COMPOSITION_OPTIONS)
            defaults["color_scheme"] = list(self._COLOR_SCHEME_OPTIONS)
            defaults["mood_atmosphere"] = list(self._MOOD_OPTIONS)
            defaults["style_medium"] = list(self._STYLE_MEDIUM_OPTIONS)
            defaults["aesthetic_style"] = list(self._AESTHETIC_STYLE_OPTIONS)

            color_from_value = self._extract_color_candidates(tool_input.get("color_scheme"))
            if color_from_value:
                defaults["color_scheme"] = self._unique_options(
                    color_from_value + defaults["color_scheme"]
                )

        elif canonical_tool == "adjust_object_property":
            defaults["property"] = list(self._OBJECT_PROPERTY_OPTIONS)
            raw_property = str(tool_input.get("property") or "").strip().lower()

            if raw_property == "location":
                defaults["value"] = list(self._LOCATION_OPTIONS)
            elif raw_property == "relative_size":
                defaults["value"] = list(self._SIZE_OPTIONS)
            elif raw_property == "orientation":
                defaults["value"] = list(self._ORIENTATION_OPTIONS)
            elif raw_property == "shape_and_color":
                colors = self._extract_color_candidates(tool_input.get("value"))
                value_options = self._unique_options(
                    colors
                    + ["warm tones", "cool tones", "monochrome", "high contrast"]
                    + ["#E63946", "#457B9D", "#F4A261", "#2A9D8F", "#264653"]
                )
                defaults["value"] = value_options
                defaults["value_for_shape_and_color"] = value_options

        elif canonical_tool == "update_background":
            defaults["background_setting"] = [
                "minimal clean studio",
                "warm indoor editorial set",
                "urban outdoor setting",
                "soft natural environment",
            ]

        return defaults

    def _merge_ui_options(
        self,
        canonical_tool: str,
        tool_input: Dict[str, Any],
        llm_ui_options: Dict[str, List[str]],
    ) -> Dict[str, List[str]]:
        merged = self._build_default_ui_options(canonical_tool, tool_input)

        for key, values in llm_ui_options.items():
            merged[key] = self._unique_options(values + merged.get(key, []))

        for key, raw_value in tool_input.items():
            if isinstance(raw_value, (str, int, float, bool)):
                text = str(raw_value).strip()
                if text:
                    merged[key] = self._unique_options([text] + merged.get(key, []))

        if canonical_tool == "adjust_object_property":
            prop = str(tool_input.get("property") or "").strip().lower()
            if prop:
                value_key = f"value_for_{prop}"
                shared_values = merged.get("value", [])
                specific_values = merged.get(value_key, [])
                combined = self._unique_options(specific_values + shared_values)
                if combined:
                    merged[value_key] = combined
                    if "value" not in llm_ui_options:
                        merged["value"] = combined

        cleaned: Dict[str, List[str]] = {}
        for key, values in merged.items():
            unique_values = self._unique_options(values)
            if unique_values:
                cleaned[key] = unique_values
        return cleaned

    def _normalize_plan_step(self, step: PlanStep) -> Optional[PlanStep]:
        canonical_tool = self._canonical_tool_name(step.tool_name)
        if canonical_tool not in ToolRegistry.TOOLS:
            logger.warning(f"Dropping unsupported tool step: {step.tool_name}")
            return None

        tool_input = dict(step.tool_input or {})

        if canonical_tool == "update_lighting":
            if isinstance(tool_input.get("conditions"), str):
                tool_input["conditions"] = tool_input["conditions"].strip().lower()
            if isinstance(tool_input.get("direction"), dict):
                direction = tool_input["direction"]
                for key in ("x", "y", "rotation", "tilt"):
                    if key in direction and f"direction_{key}" not in tool_input:
                        if key in ("x", "y"):
                            tool_input[f"direction_{key}"] = direction.get(key)
                        else:
                            tool_input[key] = direction.get(key)

        if canonical_tool == "update_photographic":
            if isinstance(tool_input.get("camera_angle"), str):
                camera_angle = tool_input["camera_angle"].strip().lower().replace(" ", "-")
                tool_input["camera_angle"] = camera_angle
            if isinstance(tool_input.get("lens_focal_length"), str):
                tool_input["lens_focal_length"] = (
                    tool_input["lens_focal_length"].strip().lower()
                )

        if canonical_tool == "update_aesthetics":
            if isinstance(tool_input.get("composition"), str):
                tool_input["composition"] = (
                    tool_input["composition"].strip().lower().replace(" ", "-")
                )
            if isinstance(tool_input.get("color_scheme"), str):
                tool_input["color_scheme"] = tool_input["color_scheme"].strip().lower()
            if isinstance(tool_input.get("mood_atmosphere"), str):
                tool_input["mood_atmosphere"] = (
                    tool_input["mood_atmosphere"].strip().lower()
                )
            if (
                "mood_atmosphere" not in tool_input
                and isinstance(tool_input.get("mood"), str)
            ):
                tool_input["mood_atmosphere"] = tool_input["mood"].strip().lower()

        if canonical_tool == "adjust_object_property":
            property_aliases = {
                "appearance": "appearance_details",
                "details": "appearance_details",
                "color": "shape_and_color",
                "shape": "shape_and_color",
                "size": "relative_size",
                "scale": "relative_size",
                "position": "location",
                "placement": "location",
                "angle": "orientation",
                "direction": "orientation",
                "gender": "description",
                "identity": "description",
                "person": "description",
                "character": "description",
                "subject": "description",
            }

            raw_property = tool_input.get("property")
            if isinstance(raw_property, str):
                normalized_property = raw_property.strip().lower()
                tool_input["property"] = property_aliases.get(
                    normalized_property, normalized_property
                )

            if "value" in tool_input and tool_input.get("value") is not None:
                tool_input["value"] = str(tool_input.get("value")).strip()

            raw_mask_id = tool_input.get("mask_id")
            if raw_mask_id is not None:
                cleaned_mask_id = str(raw_mask_id).strip()
                tool_input["mask_id"] = cleaned_mask_id
                if not cleaned_mask_id:
                    tool_input.pop("mask_id", None)

            if "object_index" in tool_input:
                try:
                    tool_input["object_index"] = int(tool_input["object_index"])
                except Exception:
                    tool_input.pop("object_index", None)

            if "index" in tool_input:
                try:
                    tool_input["index"] = int(tool_input["index"])
                except Exception:
                    tool_input.pop("index", None)

            if not isinstance(tool_input.get("object_name"), str):
                if isinstance(tool_input.get("prompt"), str):
                    tool_input["object_name"] = tool_input["prompt"].strip()
            elif not tool_input["object_name"].strip():
                tool_input.pop("object_name", None)
            else:
                tool_input["object_name"] = tool_input["object_name"].strip()

        llm_ui_options = self._normalize_ui_options(step.ui_options)
        merged_ui_options = self._merge_ui_options(
            canonical_tool=canonical_tool,
            tool_input=tool_input,
            llm_ui_options=llm_ui_options,
        )

        return PlanStep(
            tool_name=canonical_tool,
            tool_input=tool_input,
            step_description=step.step_description,
            ui_options=merged_ui_options,
        )

    @staticmethod
    def _fallback_generation_draft(query: str) -> GenerationDraft:
        cleaned = " ".join((query or "").split()).strip()
        subject = cleaned or "a compelling product subject"
        background = "a visually coherent scene environment"
        style = "realistic product photograph"
        lighting = "natural soft directional light"
        composition = "centered with balanced negative space"
        extra_details = "high detail, clean textures, premium commercial look"
        polished_prompt = (
            f"{subject}, in {background}, style: {style}, lighting: {lighting}, "
            f"composition: {composition}, details: {extra_details}"
        )
        return GenerationDraft(
            main_subject=subject,
            background_setting=background,
            style_or_medium=style,
            lighting=lighting,
            composition=composition,
            extra_details=extra_details,
            polished_prompt=polished_prompt,
        )

    @staticmethod
    def _coerce_generation_draft(
        generation_draft: Any, query: str
    ) -> GenerationDraft:
        if isinstance(generation_draft, GenerationDraft):
            return PenguinAnalyzer._ensure_polished_prompt(generation_draft)

        fallback = PenguinAnalyzer._fallback_generation_draft(query)
        if not isinstance(generation_draft, dict):
            return fallback

        def _pick_text(key: str, default: str) -> str:
            raw = generation_draft.get(key)
            if isinstance(raw, str):
                cleaned = raw.strip()
                if cleaned:
                    return cleaned
            return default

        draft = GenerationDraft(
            main_subject=_pick_text("main_subject", fallback.main_subject),
            background_setting=_pick_text(
                "background_setting", fallback.background_setting
            ),
            style_or_medium=_pick_text("style_or_medium", fallback.style_or_medium),
            lighting=_pick_text("lighting", fallback.lighting),
            composition=_pick_text("composition", fallback.composition),
            extra_details=_pick_text("extra_details", fallback.extra_details),
            polished_prompt=_pick_text("polished_prompt", ""),
        )
        return PenguinAnalyzer._ensure_polished_prompt(draft)

    @staticmethod
    def _ensure_polished_prompt(draft: GenerationDraft) -> GenerationDraft:
        if draft.polished_prompt and draft.polished_prompt.strip():
            return draft
        polished_prompt = (
            f"{draft.main_subject}, in {draft.background_setting}, "
            f"style: {draft.style_or_medium}, lighting: {draft.lighting}, "
            f"composition: {draft.composition}, details: {draft.extra_details}"
        ).strip()
        return GenerationDraft(
            main_subject=draft.main_subject,
            background_setting=draft.background_setting,
            style_or_medium=draft.style_or_medium,
            lighting=draft.lighting,
            composition=draft.composition,
            extra_details=draft.extra_details,
            polished_prompt=polished_prompt,
        )

    async def polish_generation_draft(
        self,
        query: str,
        generation_draft: Dict[str, Any],
        image_context: Optional[Dict[str, Any]] = None,
    ) -> GenerationDraft:
        base_draft = self._coerce_generation_draft(generation_draft, query)
        context_summary = self._build_context_summary(image_context)
        payload = {
            "query": query,
            "generation_draft": base_draft.model_dump(),
            "scene_context": context_summary,
        }

        agent = Agent(
            name="penguin_generation_polisher",
            model=self.model_name,
            instruction=self._get_generation_polisher_instruction(),
        )
        runner = Runner(
            app_name="PenguinAgentic",
            agent=agent,
            session_service=self.session_service,
            auto_create_session=True,
        )

        try:
            final_text = await self._run_agent_for_text(
                runner=runner,
                session_id="current_generation_polish",
                user_text=json.dumps(payload, ensure_ascii=True),
            )

            parsed = self._parse_json_payload(final_text)
            polished = GenerationDraft.model_validate(parsed)
            return self._ensure_polished_prompt(polished)
        except Exception as exc:
            if self._is_rate_limited_error(exc):
                logger.warning(
                    "Generation polishing rate-limited; using deterministic fallback"
                )
            else:
                logger.error(f"Generation polishing failed: {exc}")
            return self._ensure_polished_prompt(base_draft)

    async def analyze(
        self, query: str, image_context: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        logger.info(f"Analyzing query: {query}")

        context_summary = self._build_context_summary(image_context)
        user_content = query
        if context_summary:
            user_content = (
                f"User request:\n{query}\n\nCurrent scene context:\n{context_summary}"
            )

        agent = Agent(
            name="penguin_analyzer",
            model=self.model_name,
            instruction=self._get_system_instruction(),
        )
        runner = Runner(
            app_name="PenguinAgentic",
            agent=agent,
            session_service=self.session_service,
            auto_create_session=True,
        )

        try:
            final_text = await self._run_agent_for_text(
                runner=runner,
                session_id="current_analysis",
                user_text=user_content,
            )

            payload = self._parse_json_payload(final_text)
            analysis = AnalysisResult.model_validate(payload)
            if analysis.intent == "generation":
                analysis.plan = None
                if analysis.generation_draft is None:
                    analysis.generation_draft = self._fallback_generation_draft(query)
            else:
                normalized_plan: List[PlanStep] = []
                for step in analysis.plan or []:
                    normalized = self._normalize_plan_step(step)
                    if normalized:
                        normalized_plan.append(normalized)
                analysis.plan = normalized_plan
                analysis.generation_draft = None
            return analysis

        except Exception as exc:
            logger.error(f"Analysis failed: {exc}")
            return AnalysisResult(
                intent="generation",
                explanation=self._build_analysis_fallback_explanation(exc),
                plan=None,
                generation_draft=self._fallback_generation_draft(query),
            )
