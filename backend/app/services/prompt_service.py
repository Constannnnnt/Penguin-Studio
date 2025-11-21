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
        self.tier_order: Sequence[PromptTier] = tier_order or (
            PromptTier.CORE,
            PromptTier.CORE_VISUAL,
            PromptTier.CORE_VISUAL_SPATIAL,
        )

    def build_from_objects(self, objects: List[Dict[str, Any]]) -> List[PromptPlanSet]:
        """Build tiered prompt plans for each object in metadata."""
        prompt_sets: List[PromptPlanSet] = []

        for idx, obj in enumerate(objects):
            spec_label = obj.get("label") or obj.get("name") or f"object_{idx}"

            spec: PromptSpec = self.field_parser.parse(obj, spec_label)
            spec = self.refiner.refine(obj, spec)

            plans = [
                PromptPlan(
                    label=spec.label,
                    tier=tier,
                    text=self.prompt_builder.build(spec, tier),
                )
                for tier in self.tier_order
            ]

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
            plans = [PromptPlan(label=label, tier=PromptTier.CORE, text=text)]
            prompt_sets.append(PromptPlanSet(label=label, plans=plans))

        return prompt_sets

