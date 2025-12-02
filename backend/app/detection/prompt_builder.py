


from dataclasses import dataclass
from typing import List, Sequence, Optional

from app.detection.types import PromptSpec, PromptTier


@dataclass
class PromptBuilder:
    """
    Builds prompt strings for SAM3 detection from PromptSpec.
    
    Design decisions:
    - Cap visual descriptors to prevent overly long prompts (SAM3 works best with 5-15 words)
    - Prioritize distinctive visual features over generic ones
    - CORE_VISUAL_SPATIAL tier is deprecated (spatial info doesn't help visual segmentation)
    """
    clause_joiner: str = ", "
    max_visual_descriptors: int = 4  # Cap to prevent verbose prompts
    max_prompt_words: int = 20  # Soft limit for total prompt length

    def _join_clause_list(self, lst: Sequence[str], max_items: Optional[int] = None) -> Optional[str]:
        cleaned = [s.strip() for s in lst if s and s.strip()]
        if not cleaned:
            return None
        if max_items is not None:
            cleaned = cleaned[:max_items]
        return self.clause_joiner.join(cleaned)

    def _truncate_to_word_limit(self, text: str, max_words: int) -> str:
        """Truncate text to approximately max_words, ending at a clean boundary."""
        words = text.split()
        if len(words) <= max_words:
            return text
        # Find a clean cut point (at comma or period)
        truncated = " ".join(words[:max_words])
        # Try to end at a comma or period
        for sep in [", ", ". "]:
            last_sep = truncated.rfind(sep)
            if last_sep > len(truncated) // 2:
                return truncated[:last_sep]
        return truncated

    def build(self, spec: PromptSpec, tier: PromptTier) -> str:
        sentences: List[str] = []

        core = (spec.core or "object").strip().rstrip(".")
        sentences.append(core)

        if tier in (PromptTier.CORE_VISUAL, PromptTier.CORE_VISUAL_SPATIAL):
            # Cap visual descriptors to prevent overly long prompts
            visual_clause = self._join_clause_list(spec.visual, self.max_visual_descriptors)
            if visual_clause:
                sentences.append(visual_clause.rstrip("."))

        # CORE_VISUAL_SPATIAL: spatial info is deprecated but kept for backward compatibility
        # Spatial descriptions like "located at center" don't help SAM3's visual understanding
        if tier == PromptTier.CORE_VISUAL_SPATIAL:
            spatial_bits: List[str] = []
            if spec.locations:
                spatial_bits.append(f"located at {spec.locations[0]}")
            if spec.relations:
                spatial_bits.append(spec.relations[0])
            if spec.orientations:
                spatial_bits.append(f"oriented {spec.orientations[0]}")

            spatial_clause = self._join_clause_list(spatial_bits)
            if spatial_clause:
                sentences.append(spatial_clause.rstrip("."))

        result = ". ".join(sentences)
        
        # Apply soft word limit
        return self._truncate_to_word_limit(result, self.max_prompt_words)
        