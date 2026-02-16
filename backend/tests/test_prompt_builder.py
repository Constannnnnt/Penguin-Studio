import sys
from unittest.mock import MagicMock
import pytest

# Mock torch before importing app modules to avoid dependency issues in test environment
if "torch" not in sys.modules:
    sys.modules["torch"] = MagicMock()

from app.detection.prompt_builder import PromptBuilder
from app.detection.types import PromptSpec, PromptTier

class TestPromptBuilder:
    """Tests for PromptBuilder class."""

    @pytest.fixture
    def builder(self):
        """Returns a default PromptBuilder instance."""
        return PromptBuilder()

    def test_join_clause_list_basic(self, builder):
        """Test joining a list of valid strings."""
        items = ["red", "round", "shiny"]
        result = builder._join_clause_list(items)
        assert result == "red, round, shiny"

    def test_join_clause_list_filtering(self, builder):
        """Test filtering of empty or whitespace-only strings."""
        items = ["red", "", "  ", "shiny", None]
        # Note: The implementation checks `if s and s.strip()`. None is falsy so it's skipped.
        result = builder._join_clause_list(items)
        assert result == "red, shiny"

    def test_join_clause_list_max_items(self, builder):
        """Test limiting the number of items joined."""
        items = ["one", "two", "three", "four", "five"]
        result = builder._join_clause_list(items, max_items=3)
        assert result == "one, two, three"

    def test_join_clause_list_empty(self, builder):
        """Test returning None for empty or all-invalid input."""
        assert builder._join_clause_list([]) is None
        assert builder._join_clause_list(["", "   "]) is None

    def test_truncate_to_word_limit_short(self, builder):
        """Test that short text is not truncated."""
        text = "This is a short text."
        result = builder._truncate_to_word_limit(text, max_words=10)
        assert result == text

    def test_truncate_to_word_limit_clean_break(self, builder):
        """Test truncation at a comma or period when exceeding max words."""
        # text has 12 words. Limit to 10.
        text = "one two three, four five. six seven, eight nine ten eleven twelve"
        result = builder._truncate_to_word_limit(text, max_words=10)
        assert result == "one two three, four five. six seven"

    def test_truncate_to_word_limit_hard_break(self, builder):
        """Test truncation when no clean break is found."""
        text = "one two three four five six seven eight nine ten eleven"
        result = builder._truncate_to_word_limit(text, max_words=5)
        assert result == "one two three four five"

    def test_build_core(self, builder):
        """Test building a prompt with CORE tier."""
        spec = PromptSpec(label="cat", core="a fluffy cat", visual=["orange", "striped"])
        result = builder.build(spec, PromptTier.CORE)
        # Should only contain core. visual ignored.
        assert result == "a fluffy cat"

    def test_build_core_visual(self, builder):
        """Test building a prompt with CORE_VISUAL tier."""
        spec = PromptSpec(label="cat", core="cat", visual=["orange", "striped", "sleeping"])
        result = builder.build(spec, PromptTier.CORE_VISUAL)
        # "cat. orange, striped, sleeping"
        assert result == "cat. orange, striped, sleeping"

    def test_build_core_visual_capped(self, builder):
        """Test that visual descriptors are capped in CORE_VISUAL."""
        # default max_visual_descriptors is 4
        visuals = ["one", "two", "three", "four", "five"]
        spec = PromptSpec(label="obj", core="obj", visual=visuals)
        result = builder.build(spec, PromptTier.CORE_VISUAL)
        assert "five" not in result
        assert "one, two, three, four" in result

    def test_build_core_visual_spatial(self, builder):
        """Test building a prompt with CORE_VISUAL_SPATIAL tier."""
        # Spatial info is deprecated but included.
        spec = PromptSpec(
            label="lamp",
            core="lamp",
            visual=["tall"],
            locations=["center"],
            relations=["on table"],
            orientations=["upright"]
        )
        result = builder.build(spec, PromptTier.CORE_VISUAL_SPATIAL)
        # "lamp. tall. located at center, on table, oriented upright"
        assert "lamp" in result
        assert "tall" in result
        assert "located at center" in result
        assert "on table" in result
        assert "oriented upright" in result

    def test_build_empty_fields(self, builder):
        """Test handling of empty or None fields."""
        # core defaults to "object" in build if None/Empty
        spec = PromptSpec(label="obj", core="")
        result = builder.build(spec, PromptTier.CORE)
        assert result == "object"

        spec2 = PromptSpec(label="obj", core="obj", visual=[])
        result2 = builder.build(spec2, PromptTier.CORE_VISUAL)
        assert result2 == "obj"

    def test_build_word_limit(self, builder):
        """Test overall prompt word limit enforcement."""
        # builder has max_prompt_words = 20
        long_core = "word " * 25
        spec = PromptSpec(label="long", core=long_core)
        result = builder.build(spec, PromptTier.CORE)
        assert len(result.split()) <= 20
