import json
import logging
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from google.adk import Agent, Runner
from google.genai import types
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from .tool_registry import ToolRegistry

# Configure logging
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


class AnalysisResult(BaseModel):
    """The structured result of query analysis."""

    intent: Literal["generation", "refinement"] = Field(
        ..., description="Classified intent"
    )
    explanation: str = Field(..., description="Why this classification was made")
    plan: Optional[List[PlanStep]] = Field(
        None, description="Proposed list of steps if intent is refinement"
    )


class PenguinAnalyzer:
    """
    PenguinAnalyzer uses Google ADK to interpret user requests.
    It identifies if a user wants to generate a new image or refine an existing one.
    """

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.session_service = InMemorySessionService()

    def _get_system_instruction(self) -> str:
        """Constructs the system prompt with tool definitions."""
        schemas = ToolRegistry.get_all_schemas()

        tools_summary = []
        for name, schema in schemas.items():
            desc = schema.get("description", "No description")
            props = schema.get("properties", {})
            params = ", ".join([f"{k} ({v.get('type')})" for k, v in props.items()])
            tools_summary.append(f"- {name}: {desc}. Params: [{params}]")

        tools_text = "\n".join(tools_summary)

        return f"""You are the Penguin AI Analyzer. Penguin is an AI-powered product photography platform.
Your task is to classify user queries and generate structured refinement plans.

INTENT CLASSIFICATION:
1. 'generation': The user wants to create a new image from scratch (e.g., "A bottle of wine on a sunset beach").
2. 'refinement': The user wants to modify an existing scene, adjust parameters, or change specific object properties (e.g., "Make the shadows softer", "Move the perfume to the left", "Change the background to a forest").

AVAILABLE REFINEMENT TOOLS:
{tools_text}

PLANNING RULES:
- For 'refinement' intent, you MUST provide a 'plan' consisting of one or more steps.
- Each step MUST use a 'tool_name' from the list above.
- The 'tool_input' MUST match the tool's parameter requirements.
- The 'step_description' should be a natural language explanation of what that specific step achieves.
- If the user query is vague but clearly a modification, propose the most likely tool (e.g., "Make it look better" -> update_aesthetics).

The user may also mention specific objects. Use 'select_object' first to get a mask_id if you need to adjust a specific thing.

RESPONSE FORMAT (STRICT):
- Return ONLY a valid JSON object. No markdown, no prose, no code fences.
- Do not include any keys other than the schema below.
- For generation intent, set "plan" to null.

Schema:
{{
  "intent": "generation" | "refinement",
  "explanation": "string",
  "plan": null | [
    {{
      "tool_name": "string",
      "tool_input": {{ ... }},
      "step_description": "string"
    }}
  ]
}}
"""

    async def analyze(
        self, query: str, image_context: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """Analyzes a user query and returns a structured AnalysisResult."""
        logger.info(f"Analyzing query: {query}")

        context_summary: Optional[str] = None
        if image_context:
            structured_prompt = image_context.get("structured_prompt")
            context_payload: Dict[str, Any] = {"seed": image_context.get("seed")}
            if isinstance(structured_prompt, dict):
                context_payload.update(
                    {
                        "short_description": structured_prompt.get("short_description"),
                        "background_setting": structured_prompt.get(
                            "background_setting"
                        ),
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
            context_summary = json.dumps(context_payload, ensure_ascii=True)

        # Define the analyzer agent
        agent = Agent(
            name="penguin_analyzer",
            model=self.model_name,
            instruction=self._get_system_instruction(),
        )

        # Initialize Runner with required services
        runner = Runner(
            app_name="PenguinAgentic",
            agent=agent,
            session_service=self.session_service,
            auto_create_session=True,
        )

        try:
            # Run the agent async and collect events
            final_text: Optional[str] = None
            user_content = query
            if context_summary:
                user_content = (
                    f"{query}\n\nCurrent scene context (structured prompt):\n{context_summary}"
                )

            def extract_text(content: Any) -> str:
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

            def parse_json_payload(text: str) -> Dict[str, Any]:
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

            async for event in runner.run_async(
                user_id="default_user",
                session_id="current_analysis",
                new_message=types.UserContent(parts=[types.Part(text=user_content)]),
            ):
                if event.content:
                    event_text = extract_text(event.content).strip()
                    if event_text:
                        final_text = event_text

            if not final_text:
                raise ValueError("Agent failed to produce any content")

            payload = parse_json_payload(final_text)
            return AnalysisResult.parse_obj(payload)

        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            # Return a safe fallback or re-raise
            return AnalysisResult(
                intent="generation",  # Default to generation if we can't refine
                explanation=f"Error during analysis: {str(e)}",
                plan=None,
            )
