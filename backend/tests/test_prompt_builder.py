from app.detection.prompt_builder import PromptBuilder
from app.detection.types import PromptSpec, PromptTier


def test_extract_label_prefers_head_noun():
    builder = PromptBuilder()
    text = "Scattered, delicate snowflakes gently falling through the air."

    label = builder.extract_label(text)

    assert label in {"snowflakes", "snowflake"}


def test_build_variants_include_compact_noun_fallbacks():
    builder = PromptBuilder(max_variants_per_tier=8)
    spec = PromptSpec(
        label="snowflakes",
        core="Scattered delicate snowflakes gently falling through the air",
        visual=["tiny translucent white crystalline flakes"],
        locations=["throughout the entire frame"],
        relations=[],
        orientations=[],
    )

    variants = builder.build_variants(spec, PromptTier.CORE_VISUAL)
    lowered = {v.lower() for v in variants}

    assert any(v in lowered for v in {"snowflakes", "snowflake"})
    assert any("translucent" in v for v in lowered)
    assert len(variants) <= 8


def test_build_freeform_variants_dedups_and_preserves_original():
    builder = PromptBuilder(max_variants_per_tier=8)
    variants = builder.build_freeform_variants(
        "A cluster of small balloons floating near the lettering"
    )

    assert variants
    assert variants[0].lower().startswith("a cluster of small balloons")
    assert any("balloon" in v.lower() for v in variants)
