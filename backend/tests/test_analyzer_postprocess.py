from app.agentic.analyzer import PenguinAnalyzer


def test_build_context_summary_returns_none_without_context():
    assert PenguinAnalyzer._build_context_summary(None) is None
    assert PenguinAnalyzer._build_context_summary({}) is None


def test_build_context_summary_contains_scene_fields():
    context = {
        "seed": 123,
        "structured_prompt": {
            "short_description": "person portrait",
            "background_setting": "city street",
            "objects": [{"description": "person"}],
            "lighting": {"conditions": "natural"},
        },
    }

    summary = PenguinAnalyzer._build_context_summary(context)

    assert summary is not None
    assert "person portrait" in summary
    assert "city street" in summary
    assert "\"seed\": 123" in summary


def test_parse_json_payload_accepts_code_fence():
    payload = PenguinAnalyzer._parse_json_payload(
        """```json
{\"intent\":\"generation\",\"explanation\":\"new scene\",\"plan\":null}
```"""
    )

    assert payload["intent"] == "generation"
    assert payload["plan"] is None


def test_parse_json_payload_extracts_wrapped_json():
    payload = PenguinAnalyzer._parse_json_payload(
        "Result: {\"intent\":\"refinement\",\"explanation\":\"edit\",\"plan\":[]}"
    )

    assert payload["intent"] == "refinement"
    assert payload["plan"] == []


def test_system_instruction_mentions_dual_intent_and_tools():
    analyzer = PenguinAnalyzer()
    instruction = analyzer._get_system_instruction()

    assert "generation" in instruction
    assert "refinement" in instruction
    assert "update_background" in instruction


def test_fallback_generation_draft_contains_core_fields():
    draft = PenguinAnalyzer._fallback_generation_draft(
        "a man wearing sunglasses in a snowy scene"
    )

    assert draft.main_subject
    assert draft.background_setting
    assert draft.style_or_medium
    assert draft.lighting
    assert draft.polished_prompt


def test_coerce_generation_draft_fills_missing_fields():
    draft = PenguinAnalyzer._coerce_generation_draft(
        {"main_subject": "a watch on marble", "lighting": "studio key light"},
        "a watch on marble",
    )

    assert draft.main_subject == "a watch on marble"
    assert draft.lighting == "studio key light"
    assert draft.background_setting
    assert draft.polished_prompt


def test_coerce_generation_draft_handles_invalid_input():
    draft = PenguinAnalyzer._coerce_generation_draft(
        generation_draft="not-a-dict", query="a minimalist coffee scene"
    )

    assert draft.main_subject
    assert draft.polished_prompt


def test_is_rate_limited_error_detects_resource_exhausted():
    exc = RuntimeError("429 RESOURCE_EXHAUSTED from provider")
    assert PenguinAnalyzer._is_rate_limited_error(exc) is True


def test_analysis_fallback_explanation_for_rate_limit():
    analyzer = PenguinAnalyzer()
    explanation = analyzer._build_analysis_fallback_explanation(
        RuntimeError("resource_exhausted")
    )
    assert "rate-limited" in explanation
