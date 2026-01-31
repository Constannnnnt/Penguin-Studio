import logging
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from google.adk import Agent, Runner
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
"""

    async def analyze(self, query: str) -> AnalysisResult:
        """Analyzes a user query and returns a structured AnalysisResult."""
        logger.info(f"Analyzing query: {query}")

        # Define the analyzer agent
        agent = Agent(
            name="penguin_analyzer",
            model=self.model_name,
            instruction=self._get_system_instruction(),
            output_schema=AnalysisResult,
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
            final_content = None
            async for event in runner.run_async(
                user_id="default_user",
                session_id="current_analysis",
                new_message={"role": "user", "content": query},
            ):
                # When output_schema is set, ADK typically returns the parsed model in the content
                if event.content:
                    final_content = event.content

            if not final_content:
                raise ValueError("Agent failed to produce any content")

            # If ADK returned a dict or the model instance directly
            if isinstance(final_content, AnalysisResult):
                return final_content

            if isinstance(final_content, dict):
                return AnalysisResult.parse_obj(final_content)

            # Fallback: if it's a string (though unlikely with output_schema)
            if isinstance(final_content, str):
                import json

                return AnalysisResult.parse_obj(json.loads(final_content))

            raise TypeError(
                f"Unexpected content type from agent: {type(final_content)}"
            )

        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            # Return a safe fallback or re-raise
            return AnalysisResult(
                intent="generation",  # Default to generation if we can't refine
                explanation=f"Error during analysis: {str(e)}",
                plan=None,
            )
