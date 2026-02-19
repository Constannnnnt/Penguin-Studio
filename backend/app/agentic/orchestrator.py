import logging
import uuid
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from pydantic import BaseModel, Field
from .analyzer import PenguinAnalyzer, AnalysisResult, PlanStep
from app.services.bria_service import BriaService, get_bria_service, StructuredPrompt
from app.services.segmentation_service import SegmentationService

if TYPE_CHECKING:
    from app.services.agent_memory_service import AgentMemoryService

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
        memory_service: Optional["AgentMemoryService"] = None,
    ):
        self.analyzer = analyzer or PenguinAnalyzer()
        self.bria_service = bria_service or get_bria_service()
        self.segmentation_service = segmentation_service  # Optional dependency
        self.memory_service = memory_service
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

        persisted_context: Dict[str, Any] = {}
        if self.memory_service and session_id:
            try:
                stored = self.memory_service.get_session_context(session_id)
                if isinstance(stored, dict):
                    persisted_context = dict(stored)
            except Exception as exc:
                logger.warning(f"Failed reading memory context for session {session_id}: {exc}")

        merged_context: Dict[str, Any] = {}
        if persisted_context:
            merged_context.update(persisted_context)
        if isinstance(image_context, dict):
            merged_context.update(image_context)

        # 1. Run Analysis
        analysis = await self.analyzer.analyze(query, merged_context or None)

        # 2. Create session state
        status = "awaiting_approval" if analysis.intent == "refinement" else "executing"

        session = WorkflowSession(
            session_id=session_id,
            user_query=query,
            analysis=analysis,
            status=status,
            image_context=merged_context or {},
        )

        self.active_sessions[session_id] = session

        if self.memory_service:
            try:
                self.memory_service.upsert_session_context(
                    session_id=session_id,
                    image_context=session.image_context,
                    query=query,
                )
            except Exception as exc:
                logger.warning(f"Failed persisting session context {session_id}: {exc}")

        return session

    async def polish_generation_draft(
        self,
        query: str,
        generation_draft: Dict[str, Any],
        image_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        polished = await self.analyzer.polish_generation_draft(
            query=query,
            generation_draft=generation_draft,
            image_context=image_context,
        )
        return polished.model_dump()

    async def approve_and_execute(
        self, session_id: str, overrides: Optional[List[PlanStep]] = None
    ) -> WorkflowSession:
        """
        Executes the plan in the session. Allows partial overrides from the user's interactive UI.
        """
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        plan: Optional[List[PlanStep]]
        if overrides is not None:
            parsed_overrides: List[PlanStep] = []
            for raw_step in overrides:
                if isinstance(raw_step, PlanStep):
                    parsed_overrides.append(raw_step)
                    continue
                if isinstance(raw_step, dict):
                    try:
                        parsed_overrides.append(PlanStep.model_validate(raw_step))
                    except Exception as exc:
                        logger.warning(f"Skipping invalid override step: {exc}")
            plan = parsed_overrides
        else:
            plan = session.analysis.plan

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
        if self.memory_service:
            try:
                self.memory_service.upsert_session_context(
                    session_id=session.session_id,
                    image_context=session.image_context,
                    query=session.user_query,
                )
            except Exception as exc:
                logger.warning(f"Failed updating memory for session {session.session_id}: {exc}")
        return session

    async def _dispatch_tool(
        self, tool_name: str, tool_input: Dict[str, Any], session: WorkflowSession
    ) -> Any:
        """
        Internal dispatcher that routes tool calls to the correct backend services.
        Maps LLM intention to code execution on Bria and other services.
        """
        normalized_tool_name = self._normalize_tool_name(tool_name)
        logger.info(
            f"Dispatching tool '{normalized_tool_name}' for session {session.session_id}"
        )

        # 1. Background / Scene Tools (Bria Refinement)
        if normalized_tool_name in [
            "update_lighting",
            "update_aesthetics",
            "update_photographic",
            "update_background",
        ]:
            return await self._execute_bria_refinement(
                normalized_tool_name, tool_input, session
            )

        # 2. Selection Tools
        if normalized_tool_name == "select_object":
            # Selection is a logical focus shift, usually doesn't trigger a generation by itself
            return {
                "status": "focused",
                "object": tool_input.get("prompt") or tool_input.get("object_name"),
            }

        # 3. Object / local image tools currently execute on the frontend client.
        if normalized_tool_name in [
            "adjust_object_property",
            "adjust_object_image_edit",
            "set_global_brightness",
            "set_global_contrast",
            "set_global_saturation",
            "set_global_exposure",
            "set_global_vibrance",
            "set_global_hue",
            "set_global_blur",
            "set_global_sharpen",
            "set_global_rotation",
            "toggle_global_flip",
        ]:
            return {
                "status": "frontend_handled",
                "tool": normalized_tool_name,
                "tool_input": tool_input,
            }

        logger.warning(f"No execution logic defined for tool: {normalized_tool_name}")
        return {"status": "no_op", "tool": normalized_tool_name}

    @staticmethod
    def _normalize_tool_name(tool_name: str) -> str:
        aliases = {
            "object_selection": "select_object",
        }
        normalized = (tool_name or "").strip().lower()
        return aliases.get(normalized, normalized)

    async def _execute_bria_refinement(
        self, tool_name: str, tool_input: Dict[str, Any], session: WorkflowSession
    ) -> Any:
        """Handles tools that modify the global scene via Bria's structured prompt."""
        image_ctx = session.image_context
        if not image_ctx or "structured_prompt" not in image_ctx:
            raise ValueError(
                "No image context found for refinement. Generate an image first."
            )
        source_image = image_ctx.get("source_image") or image_ctx.get("image_url")
        if not source_image:
            raise ValueError(
                "No source image found for refinement. Load or generate an image first."
            )
        mask = image_ctx.get("mask")

        # Reconstruct structured prompt
        sp = StructuredPrompt(**image_ctx["structured_prompt"])
        seed = image_ctx.get("seed", 0)

        # Apply updates based on tool
        if tool_name == "update_lighting":
            normalized = dict(tool_input)
            direction_value = normalized.get("direction")
            if isinstance(direction_value, dict):
                direction_parts: List[str] = []
                for key in ("x", "y", "rotation", "tilt"):
                    if key in direction_value:
                        direction_parts.append(f"{key}:{direction_value[key]}")
                if direction_parts:
                    normalized["direction"] = ", ".join(direction_parts)

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

            style_medium_value = normalized.pop("style_medium", None)
            aesthetic_style_value = normalized.pop("aesthetic_style", None)
            if aesthetic_style_value is None:
                aesthetic_style_value = normalized.pop("artistic_style", None)

            for k, v in normalized.items():
                if hasattr(sp.aesthetics, k):
                    setattr(sp.aesthetics, k, str(v))

            if style_medium_value is not None:
                sp.style_medium = str(style_medium_value)
            if aesthetic_style_value is not None:
                sp.artistic_style = str(aesthetic_style_value)
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
        result = await self.bria_service.edit_image(
            source_image=str(source_image),
            structured_prompt=sp,
            seed=seed,
            modification_prompt=session.user_query,
            mask=str(mask) if isinstance(mask, str) and mask.strip() else None,
        )

        # Update session context with NEW structured prompt for subsequent steps
        new_sp_dict = result.structured_prompt.model_dump()
        session.image_context["structured_prompt"] = new_sp_dict
        session.image_context["seed"] = result.seed
        session.image_context["source_image"] = result.image_url
        session.image_context["image_url"] = result.image_url

        return {
            "image_url": result.image_url,
            "seed": result.seed,
            "structured_prompt": new_sp_dict,
        }

    def get_session(self, session_id: str) -> Optional[WorkflowSession]:
        return self.active_sessions.get(session_id)
