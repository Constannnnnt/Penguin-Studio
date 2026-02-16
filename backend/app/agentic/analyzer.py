import asyncio
import json
import logging
import random
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
      \"step_description\": \"string\"
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
        context_payload: Dict[str, Any] = {"seed": image_context.get("seed")}
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

        return PlanStep(
            tool_name=canonical_tool,
            tool_input=tool_input,
            step_description=step.step_description,
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
