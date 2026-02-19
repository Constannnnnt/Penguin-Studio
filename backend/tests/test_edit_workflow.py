from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.routes.generation import (
    EditRequest,
    _build_edit_parameters,
    _normalize_optional_string,
    _resolve_single_source_image,
    _execute_edit_workflow,
)
from app.services.bria_service import GenerationResult, StructuredPrompt


def _minimal_structured_prompt() -> dict:
    return {
        "short_description": "A product photo",
        "objects": [],
        "background_setting": "studio background",
        "lighting": {"conditions": "studio", "direction": "front", "shadows": "soft"},
        "aesthetics": {
            "composition": "centered",
            "color_scheme": "neutral",
            "mood_atmosphere": "clean",
            "preference_score": "high",
            "aesthetic_score": "high",
        },
        "photographic_characteristics": {
            "depth_of_field": "shallow",
            "focus": "sharp",
            "camera_angle": "eye-level",
            "lens_focal_length": "50mm",
        },
        "style_medium": "photograph",
        "context": "Studio product photography context.",
    }


def test_resolve_single_source_image_prefers_source_image() -> None:
    request = EditRequest(
        source_image="https://example.com/source.png",
        structured_prompt=_minimal_structured_prompt(),
        seed=123,
    )
    assert _resolve_single_source_image(request) == "https://example.com/source.png"


def test_resolve_single_source_image_from_images_single_entry() -> None:
    request = EditRequest(
        images=["https://example.com/source.png"],
        structured_prompt=_minimal_structured_prompt(),
        seed=123,
    )
    assert _resolve_single_source_image(request) == "https://example.com/source.png"


def test_resolve_single_source_image_rejects_multiple_images() -> None:
    request = EditRequest(
        images=["https://example.com/a.png", "https://example.com/b.png"],
        structured_prompt=_minimal_structured_prompt(),
        seed=123,
    )
    with pytest.raises(HTTPException) as exc:
        _resolve_single_source_image(request)
    assert exc.value.status_code == 400


def test_build_edit_parameters_rejects_invalid_model_version() -> None:
    request = EditRequest(
        source_image="https://example.com/source.png",
        structured_prompt=_minimal_structured_prompt(),
        seed=123,
        model_version="FIBO-edit-v2",
    )
    with pytest.raises(HTTPException) as exc:
        _build_edit_parameters(request)
    assert exc.value.status_code == 400


def test_normalize_optional_string_cleans_placeholder_values() -> None:
    assert _normalize_optional_string("  hello ") == "hello"
    assert _normalize_optional_string("[object Object]") is None
    assert _normalize_optional_string("{}") is None
    assert _normalize_optional_string("   ") is None


@pytest.mark.asyncio
async def test_execute_edit_workflow_success() -> None:
    request = EditRequest(
        source_image="https://example.com/source.png",
        structured_prompt=_minimal_structured_prompt(),
        seed=123,
        modification_prompt="make it warmer",
        steps_num=30,
    )

    structured_prompt = StructuredPrompt(**_minimal_structured_prompt())
    mock_bria_service = AsyncMock()
    mock_bria_service.edit_image.return_value = GenerationResult(
        image_url="https://example.com/edited.png",
        structured_prompt=structured_prompt,
        seed=123,
        generation_time_ms=100.0,
    )
    mock_bria_service.save_generation.return_value = "gen-123"

    response = await _execute_edit_workflow(request, mock_bria_service, "req-1")

    assert response.status == "completed"
    assert response.id == "gen-123"
    assert response.image_url == "https://example.com/edited.png"
    assert mock_bria_service.edit_image.await_count == 1
    assert mock_bria_service.save_generation.await_count == 1
