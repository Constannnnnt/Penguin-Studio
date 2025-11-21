


from dataclasses import dataclass
from typing import List, Sequence, Optional

from app.detection.types import PromptSpec, PromptTier


@dataclass
class PromptBuilder:
    clause_joiner: str = ", "

    def _join_clause_list(self, lst: Sequence[str]) -> Optional[str]:
        cleaned = [s.strip() for s in lst if s and s.strip()]
        if not cleaned:
            return None
        return self.clause_joiner.join(cleaned)

    def build(self, spec: PromptSpec, tier: PromptTier) -> str:
        sentences: List[str] = []

        core = (spec.core or "object").strip().rstrip(".")
        sentences.append(core)

        if tier in (PromptTier.CORE_VISUAL, PromptTier.CORE_VISUAL_SPATIAL):
            visual_clause = self._join_clause_list(spec.visual)
            if visual_clause:
                sentences.append(visual_clause.rstrip("."))

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

        return ". ".join(sentences)
        