import pytest
from unittest.mock import AsyncMock, patch
from app.agentic.orchestrator import PenguinOrchestrator
from app.agentic.analyzer import AnalysisResult, PlanStep
from app.services.bria_service import GenerationResult, StructuredPrompt


@pytest.mark.asyncio
async def test_orchestrator_initialization():
    orchestrator = PenguinOrchestrator()
    assert orchestrator.analyzer is not None
    assert orchestrator.active_sessions == {}


@pytest.mark.asyncio
async def test_orchestrator_analyze_refinement():
    # Mock behavior of the analyzer to avoid real LLM calls
    mock_result = AnalysisResult(
        intent="refinement",
        explanation="User mentioned softer shadows which maps to lighting adjustment.",
        plan=[
            PlanStep(
                tool_name="update_lighting",
                tool_input={"shadows": 2},
                step_description="Softening the shadows as requested.",
            )
        ],
    )

    with patch(
        "app.agentic.analyzer.PenguinAnalyzer.analyze", new_callable=AsyncMock
    ) as mock_analyze:
        mock_analyze.return_value = mock_result

        orchestrator = PenguinOrchestrator()
        session = await orchestrator.analyze_request("Make the shadows softer")

        assert session.analysis.intent == "refinement"
        assert session.status == "awaiting_approval"
        assert len(session.analysis.plan) == 1
        assert session.analysis.plan[0].tool_name == "update_lighting"


@pytest.mark.asyncio
async def test_orchestrator_analyze_generation():
    mock_result = AnalysisResult(
        intent="generation", explanation="User wants to create a new scene.", plan=None
    )

    with patch(
        "app.agentic.analyzer.PenguinAnalyzer.analyze", new_callable=AsyncMock
    ) as mock_analyze:
        mock_analyze.return_value = mock_result

        orchestrator = PenguinOrchestrator()
        session = await orchestrator.analyze_request("A bottle of perfume on a beach")

        assert session.analysis.intent == "generation"
        assert session.status == "executing"  # Generation intent auto-starts execution
        assert session.analysis.plan is None


@pytest.mark.asyncio
async def test_orchestrator_execution_flow():
    mock_result = AnalysisResult(
        intent="refinement",
        explanation="Refining aesthetics.",
        plan=[
            PlanStep(
                tool_name="update_aesthetics",
                tool_input={"mood": "dramatic"},
                step_description="Applying dramatic mood.",
            )
        ],
    )

    image_context = {
        "seed": 42,
        "source_image": "https://example.com/source.png",
        "structured_prompt": {
            "short_description": "Studio product shot",
            "objects": [],
            "background_setting": "solid background",
            "lighting": {
                "conditions": "studio",
                "direction": "front",
                "shadows": "soft",
            },
            "aesthetics": {
                "composition": "centered",
                "color_scheme": "neutral",
                "mood_atmosphere": "clean",
                "preference_score": "",
                "aesthetic_score": "",
            },
            "photographic_characteristics": {
                "depth_of_field": "deep",
                "focus": "sharp",
                "camera_angle": "eye-level",
                "lens_focal_length": "50mm",
            },
            "style_medium": "photograph",
        },
    }

    mock_bria_result = GenerationResult(
        image_url="https://example.com/edited.png",
        structured_prompt=StructuredPrompt(**image_context["structured_prompt"]),
        seed=42,
        generation_time_ms=100.0,
    )

    with patch(
        "app.agentic.analyzer.PenguinAnalyzer.analyze", new_callable=AsyncMock
    ) as mock_analyze, patch(
        "app.services.bria_service.BriaService.refine_image", new_callable=AsyncMock
    ) as mock_refine:
        mock_analyze.return_value = mock_result
        mock_refine.return_value = mock_bria_result

        orchestrator = PenguinOrchestrator()
        session = await orchestrator.analyze_request(
            "Make it more dramatic", image_context=image_context
        )

        # Approve and execute
        final_session = await orchestrator.approve_and_execute(session.session_id)

        assert final_session.status == "completed"
        assert len(final_session.execution_results) == 1
        assert final_session.execution_results[0]["tool"] == "update_aesthetics"
        assert final_session.execution_results[0]["status"] == "success"
        assert mock_refine.await_count == 1


@pytest.mark.asyncio
async def test_orchestrator_session_not_found():
    orchestrator = PenguinOrchestrator()
    with pytest.raises(ValueError, match="Session non_existent not found"):
        await orchestrator.approve_and_execute("non_existent")
