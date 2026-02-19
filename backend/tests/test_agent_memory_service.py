from pathlib import Path

from app.services.agent_memory_service import AgentMemoryService


def test_memory_service_persists_session_and_events(tmp_path: Path) -> None:
    service = AgentMemoryService(memory_dir=tmp_path / "agent-memory")

    session_id = "sess-1"
    image_context = {
        "generation_id": "gen-123",
        "seed": 42,
        "source_image": "/outputs/gen-123/generated.png",
        "selected_mask_id": "mask_2",
    }

    snapshot = service.upsert_session_context(
        session_id=session_id,
        image_context=image_context,
        client_id="client-1",
        query="make the coat purple",
    )

    assert snapshot["session_id"] == session_id
    assert snapshot["seed"] == 42
    assert snapshot["project_key"] == "generation:gen-123"

    event = service.append_event(
        event_type="analysis",
        session_id=session_id,
        client_id="client-1",
        query="make the coat purple",
        image_context=image_context,
        payload={"intent": "refinement"},
    )
    assert event["event_type"] == "analysis"
    assert event["project_key"] == "generation:gen-123"

    memory_context = service.build_memory_context(
        query="change coat color",
        session_id=session_id,
        image_context=image_context,
    )

    assert memory_context.get("project_key") == "generation:gen-123"
    assert "session" in memory_context
    assert memory_context["session"]["selected_mask_id"] == "mask_2"
    assert memory_context.get("recent_events")

