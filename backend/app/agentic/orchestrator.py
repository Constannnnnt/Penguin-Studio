import logging
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from .analyzer import PenguinAnalyzer, AnalysisResult, PlanStep
from app.services.bria_service import BriaService, get_bria_service, StructuredPrompt
from app.services.segmentation_service import SegmentationService

logger = logging.getLogger(__name__)


class WorkflowSession(BaseModel):
    """State of an ongoing agentic interaction."""

    session_id: str
    user_query: str
    analysis: AnalysisResult
    current_step_index: int = 0
    status: str = "awaiting_approval"  # awaiting_approval, executing, completed, failed
    execution_results: List[Dict[str, Any]] = Field(default_factory=list)
    image_context: Dict[str, Any] = Field(
        default_factory=dict
    )  # Stores seed, structured_prompt, etc.


class PenguinOrchestrator:
    """
    Orchestrates the end-to-end agentic workflow in Penguin.

    It bridges the high-level LLM planning (Analyzer) with the low-level
    image processing services (Bria, SAM3, etc.).
    """

    def __init__(
        self,
        analyzer: Optional[PenguinAnalyzer] = None,
        bria_service: Optional[BriaService] = None,
        segmentation_service: Optional[SegmentationService] = None,
    ):
        self.analyzer = analyzer or PenguinAnalyzer()
        self.bria_service = bria_service or get_bria_service()
        self.segmentation_service = segmentation_service  # Optional dependency
        self.active_sessions: Dict[str, WorkflowSession] = {}

    async def analyze_request(
        self,
        query: str,
        session_id: Optional[str] = None,
        image_context: Optional[Dict[str, Any]] = None,
    ) -> WorkflowSession:
        """
        Takes a raw user query, analyzes it, and creates a workflow session.
        """
        if not session_id:
            session_id = str(uuid.uuid4())

        logger.info(f"Analyzing request: '{query}' for session: {session_id}")

        # 1. Run Analysis
        analysis = await self.analyzer.analyze(query, image_context)

        # 2. Create session state
        status = "awaiting_approval" if analysis.intent == "refinement" else "executing"

        session = WorkflowSession(
            session_id=session_id,
            user_query=query,
            analysis=analysis,
            status=status,
            image_context=image_context or {},
        )

        self.active_sessions[session_id] = session
        return session

    async def approve_and_execute(
        self, session_id: str, overrides: Optional[List[PlanStep]] = None
    ) -> WorkflowSession:
        """
        Executes the plan in the session. Allows partial overrides from the user's interactive UI.
        """
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        plan = overrides if overrides is not None else session.analysis.plan

        if not plan:
            logger.info(
                f"No plan to execute for session {session_id} (likely generation intent)"
            )
            session.status = "completed"
            return session

        session.status = "executing"
        logger.info(f"Executing {len(plan)} steps for session {session_id}")

        for i, step in enumerate(plan):
            session.current_step_index = i
            try:
                # Dispatch tool execution
                result = await self._dispatch_tool(
                    step.tool_name, step.tool_input, session
                )
                session.execution_results.append(
                    {
                        "step": step.step_description,
                        "tool": step.tool_name,
                        "status": "success",
                        "result": result,
                    }
                )
            except Exception as e:
                logger.error(f"Step {i} ({step.tool_name}) failed: {str(e)}")
                session.execution_results.append(
                    {
                        "step": step.step_description,
                        "tool": step.tool_name,
                        "status": "failed",
                        "error": str(e),
                    }
                )
                session.status = "failed"
                return session

        session.status = "completed"
        return session

    async def _dispatch_tool(
        self, tool_name: str, tool_input: Dict[str, Any], session: WorkflowSession
    ) -> Any:
        """
        Internal dispatcher that routes tool calls to the correct backend services.
        Maps LLM intention to code execution on Bria and other services.
        """
        logger.info(f"Dispatching tool '{tool_name}' for session {session.session_id}")

        # 1. Background / Scene Tools (Bria Refinement)
        if tool_name in [
            "update_lighting",
            "update_aesthetics",
            "update_photographic",
            "update_background",
        ]:
            return await self._execute_bria_refinement(tool_name, tool_input, session)

        # 2. Selection Tools
        if tool_name in ["select_object", "object_selection"]:
            # Selection is a logical focus shift, usually doesn't trigger a generation by itself
            return {
                "status": "focused",
                "object": tool_input.get("prompt") or tool_input.get("object_name"),
            }

        logger.warning(f"No execution logic defined for tool: {tool_name}")
        return {"status": "no_op", "tool": tool_name}

    async def _execute_bria_refinement(
        self, tool_name: str, tool_input: Dict[str, Any], session: WorkflowSession
    ) -> Any:
        """Handles tools that modify the global scene via Bria's structured prompt."""
        image_ctx = session.image_context
        if not image_ctx or "structured_prompt" not in image_ctx:
            raise ValueError(
                "No image context found for refinement. Generate an image first."
            )

        # Reconstruct structured prompt
        sp = StructuredPrompt(**image_ctx["structured_prompt"])
        seed = image_ctx.get("seed", 0)

        # Apply updates based on tool
        if tool_name == "update_lighting":
            normalized = dict(tool_input)
            if "direction" not in normalized:
                direction_parts: List[str] = []
                if "direction_x" in normalized:
                    direction_parts.append(f"x:{normalized['direction_x']}")
                if "direction_y" in normalized:
                    direction_parts.append(f"y:{normalized['direction_y']}")
                if "rotation" in normalized:
                    direction_parts.append(f"rotation:{normalized['rotation']}")
                if "tilt" in normalized:
                    direction_parts.append(f"tilt:{normalized['tilt']}")
                if direction_parts:
                    normalized["direction"] = ", ".join(direction_parts)

            for k, v in normalized.items():
                if hasattr(sp.lighting, k):
                    setattr(sp.lighting, k, str(v))
        elif tool_name == "update_aesthetics":
            normalized = dict(tool_input)
            if "mood_atmosphere" not in normalized and "mood" in normalized:
                normalized["mood_atmosphere"] = normalized["mood"]

            for k, v in normalized.items():
                if hasattr(sp.aesthetics, k):
                    setattr(sp.aesthetics, k, str(v))
        elif tool_name == "update_photographic":
            for k, v in tool_input.items():
                if hasattr(sp.photographic_characteristics, k):
                    setattr(sp.photographic_characteristics, k, str(v))
        elif tool_name == "update_background":
            background_setting = tool_input.get("background_setting")
            if background_setting is None:
                background_setting = tool_input.get("setting")
            if background_setting is not None:
                sp.background_setting = str(background_setting)

        # Call Bria refinement
        logger.info(f"Calling Bria refinement for {tool_name}")
        result = await self.bria_service.refine_image(
            structured_prompt=sp, seed=seed, modification_prompt=session.user_query
        )

        # Update session context with NEW structured prompt for subsequent steps
        new_sp_dict = result.structured_prompt.model_dump()
        session.image_context["structured_prompt"] = new_sp_dict

        return {
            "image_url": result.image_url,
            "seed": result.seed,
            "structured_prompt": new_sp_dict,
        }

    def get_session(self, session_id: str) -> Optional[WorkflowSession]:
        return self.active_sessions.get(session_id)
