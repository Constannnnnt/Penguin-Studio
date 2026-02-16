from typing import List
import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

# Add thirdparty/sam3 directory to sys.path
THIRDPARTY_SAM3 = ROOT.parent / "thirdparty" / "sam3"
if str(THIRDPARTY_SAM3) not in sys.path:
    sys.path.append(str(THIRDPARTY_SAM3))

from app.detection.field_spec_builder import FieldSpecBuilder
from app.detection.types import PromptSpec, PromptTier
from app.detection.prompt_builder import PromptBuilder

import json


def main():
    project_root = ROOT
    prompt_json = project_root / "examples" / "01.json"
    outputs_dir = project_root / "outputs"
    outputs_dir.mkdir(parents=True, exist_ok=True)

    objects = json.load(prompt_json.open())["objects"]

    base_builder = FieldSpecBuilder()
    specs: List[PromptSpec] = []
    for i, obj in enumerate(objects):
        spec = base_builder.parse(obj, label=f"object_{i}")
        specs.append(spec)

    prompt_builder = PromptBuilder()

    for spec in specs:
        print(f"=== {spec.label} ===")
        print("CORE:")
        print("  ", prompt_builder.build(spec, PromptTier.CORE))
        print("CORE+VISUAL:")
        print("  ", prompt_builder.build(spec, PromptTier.CORE_VISUAL))
        print("CORE+VISUAL+SPATIAL:")
        print("  ", prompt_builder.build(spec, PromptTier.CORE_VISUAL_SPATIAL))
        print()


if __name__ == "__main__":
    main()
