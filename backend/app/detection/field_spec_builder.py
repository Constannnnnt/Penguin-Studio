
from app.detection.types import PromptSpec
from typing import List, Any, Dict
class FieldSpecBuilder:
    """
    Build a PromptSpec just from the JSON structure.

    Strategy:
      - core = first sentence of `description` (or "object" fallback)
      - visual_descriptors seeded from:
          - shape_and_color
          - texture
          - appearance_details
          - relative_size
      - spatial_descriptors seeded from:
          - location
          - relationship
          - orientation
    """

    VISUAL_FIELDS = {"shape_and_color", "texture", "appearance_details", "relative_size"}
    LOCATION_FIELDS = {"location"}
    RELATION_FIELDS = {"relationship"}
    ORIENTATION_FIELDS = {"orientation"}

    def _clean(self, v: Any) -> str:
        return str(v).strip() if v is not None else ""

    def parse(self, raw: Dict[str, Any], label: str) -> PromptSpec:
        desc_full = self._clean(raw.get("description", ""))
        core = ""
        if desc_full:
            core = desc_full.split(".")[0].strip() or desc_full
        
        visual: List[str] = []
        locations: List[str] = []
        relations: List[str] = []
        orientations: List[str] = []

        for k, v in raw.items():
            if k == "description":
                continue
            vs = self._clean(v)

            if not vs:
                continue

            if k in self.VISUAL_FIELDS:
                visual.append(vs)
            elif k in self.LOCATION_FIELDS:
                locations.append(vs)
            elif k in self.RELATION_FIELDS:
                relations.append(vs)
            elif k in self.ORIENTATION_FIELDS:
                orientations.append(vs)

        return PromptSpec(
            label = label,
            core = core,
            visual=visual,
            locations=locations,
            relations=relations,
            orientations=orientations,
        )


