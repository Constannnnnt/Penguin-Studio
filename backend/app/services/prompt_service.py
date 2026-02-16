import re
from dataclasses import dataclass
from typing import Any, Dict, List, Sequence

from app.detection.field_spec_builder import FieldSpecBuilder
from app.detection.prompt_builder import PromptBuilder
from app.detection.semantic_refiner import SemanticRefiner
from app.detection.types import PromptPlan, PromptSpec, PromptTier


@dataclass
class PromptPlanSet:
    """
    A set of tiered prompt candidates for a single object.
    The first prompt in the list that yields detections wins.
    """

    label: str
    plans: List[PromptPlan]


class PromptPipeline:
    """
    Build tiered prompts from raw metadata for SAM3 detection.

    Steps:
      - Parse raw JSON into PromptSpec (FieldSpecBuilder)
      - Refine with NLP/dedup (SemanticRefiner)
      - Render prompt strings per PromptTier (PromptBuilder)
    """

    def __init__(
        self,
        field_parser: FieldSpecBuilder | None = None,
        refiner: SemanticRefiner | None = None,
        prompt_builder: PromptBuilder | None = None,
        tier_order: Sequence[PromptTier] | None = None,
    ) -> None:
        self.field_parser = field_parser or FieldSpecBuilder()
        self.refiner = refiner or SemanticRefiner()
        self.prompt_builder = prompt_builder or PromptBuilder()
        # Start from concise prompts, then add visual detail.
        # CORE_VISUAL_SPATIAL remains optional but is not used by default.
        self.tier_order: Sequence[PromptTier] = tier_order or (
            PromptTier.CORE,
            PromptTier.CORE_VISUAL,
        )

    @staticmethod
    def _is_placeholder_label(label: str) -> bool:
        return bool(re.fullmatch(r"object_\d+", label.strip().lower()))

    def _derive_label(self, obj: Dict[str, Any], idx: int) -> str:
        raw_label = str(obj.get("label") or obj.get("name") or "").strip()
        if raw_label:
            return raw_label

        desc = str(obj.get("description") or "").strip()
        if desc:
            # Use prompt-builder heuristics so labels remain short and meaningful.
            return self.prompt_builder.extract_label(desc)

        return f"object_{idx}"

    def _render_tier_variants(self, spec: PromptSpec, tier: PromptTier) -> List[str]:
        variants = self.prompt_builder.build_variants(spec, tier)
        if variants:
            return variants
        return [self.prompt_builder.build(spec, tier)]

    def build_from_objects(self, objects: List[Dict[str, Any]]) -> List[PromptPlanSet]:
        """Build tiered prompt plans for each object in metadata."""
        prompt_sets: List[PromptPlanSet] = []

        for idx, obj in enumerate(objects):
            spec_label = self._derive_label(obj, idx)

            spec: PromptSpec = self.field_parser.parse(obj, spec_label)
            spec = self.refiner.refine(obj, spec)

            # If we still have a placeholder label, upgrade it from refined core text.
            if self._is_placeholder_label(spec.label):
                upgraded = self.prompt_builder.extract_label(spec.core)
                if upgraded and not self._is_placeholder_label(upgraded):
                    spec.label = upgraded

            plans: List[PromptPlan] = []
            seen_texts: set[str] = set()
            for tier in self.tier_order:
                for text in self._render_tier_variants(spec, tier):
                    normalized = text.strip().lower()
                    if not normalized or normalized in seen_texts:
                        continue
                    seen_texts.add(normalized)
                    plans.append(
                        PromptPlan(
                            label=spec.label,
                            tier=tier,
                            text=text,
                        )
                    )

            if not plans:
                plans.append(
                    PromptPlan(
                        label=spec.label,
                        tier=PromptTier.CORE,
                        text="object",
                    )
                )

            prompt_sets.append(PromptPlanSet(label=spec.label, plans=plans))

        return prompt_sets

    def build_from_prompts(self, prompts: List[str]) -> List[PromptPlanSet]:
        """Wrap free-form prompts in PromptPlanSets for uniform handling."""
        prompt_sets: List[PromptPlanSet] = []

        for idx, prompt in enumerate(prompts):
            text = prompt.strip()
            if not text:
                continue

            label = text
            variant_texts = self.prompt_builder.build_freeform_variants(text)
            if not variant_texts:
                variant_texts = [text]

            plans = [
                PromptPlan(label=label, tier=PromptTier.CORE, text=candidate)
                for candidate in variant_texts
            ]
            prompt_sets.append(PromptPlanSet(label=label, plans=plans))

        return prompt_sets
