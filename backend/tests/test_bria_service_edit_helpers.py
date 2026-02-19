from app.services.bria_service import BriaService, ValidationError


def test_ensure_edit_context_preserves_existing_context() -> None:
    payload = {
        "short_description": "A scene",
        "background_setting": "studio",
        "context": "Existing context",
    }
    out = BriaService._ensure_edit_context(payload)
    assert out["context"] == "Existing context"


def test_ensure_edit_context_builds_fallback() -> None:
    payload = {
        "short_description": "A scene",
        "background_setting": "studio",
    }
    out = BriaService._ensure_edit_context(payload)
    assert "context" in out
    assert "A scene" in out["context"]


def test_skip_mask_for_spatial_instruction() -> None:
    assert BriaService._should_skip_mask_for_instruction(
        "move subject to top right",
        {},
    )
    assert BriaService._should_skip_mask_for_instruction(
        None,
        {"edit_instruction": "resize object to small"},
    )
    assert not BriaService._should_skip_mask_for_instruction(
        "change shirt texture to denim",
        {},
    )


def test_retry_without_mask_when_validation_mentions_mask() -> None:
    error = ValidationError(
        "Validation failed",
        details={"details": "input image and the input mask must be of the same size"},
        status_code=422,
    )
    assert BriaService._should_retry_edit_without_mask(
        error,
        "change shirt texture to denim",
        {},
    )
