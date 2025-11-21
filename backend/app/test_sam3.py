import json
from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from PIL import Image

from app.detection.types import DetectionResult
from app.setup_model import setup_models # noqa: E402
from app.detection.types import PromptSpec # noqa: E402
from app.detection.prompt_builder import PromptBuilder # noqa: E402
from app.detection.semantic_refiner import SemanticRefiner # noqa: E402
from app.detection.types import PromptTier # noqa: E402
from app.detection.field_spec_builder import FieldSpecBuilder # noqa: E402


def _color_map(n: int) -> Iterable:
    cmap = plt.cm.get_cmap("tab10", max(n, 1))
    for idx in range(n):
        yield cmap(idx % cmap.N)


def _visualize(
    image: Image.Image, result: DetectionResult, output_path: Path
) -> None:
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.imshow(image)
    colors = list(_color_map(len(result.boxes_xyxy)))

    for idx, (box, mask) in enumerate(zip(result.boxes_xyxy, result.masks)):
        color = colors[idx]
        x0, y0, x1, y1 = [float(x) for x in box.tolist()]
        width, height = x1 - x0, y1 - y0
        ax.add_patch(
            patches.Rectangle(
                (x0, y0),
                width,
                height,
                linewidth=2,
                edgecolor=color,
                facecolor="none",
            )
        )

        mask_np = mask.squeeze().numpy().astype(bool)
        overlay = np.zeros((*mask_np.shape, 4), dtype=np.float32)
        overlay[..., 0:3] = color[0:3]
        overlay[..., 3] = mask_np * 0.4
        ax.imshow(overlay)

        ax.text(
            x0,
            max(0, y0 - 5),
            f"{result.labels[idx]} ({result.scores[idx]:.2f})",
            color=color,
            fontsize=9,
            bbox=dict(facecolor="white", alpha=0.7, edgecolor="none"),
        )

    ax.axis("off")
    fig.savefig(output_path, bbox_inches="tight", pad_inches=0)
    plt.close(fig)


def _save_json(result: DetectionResult, output_path: Path) -> None:
    payload = []
    for box, score, label in zip(result.boxes_xyxy, result.scores, result.labels):
        payload.append(
            {
                "label": label,
                "score": float(score),
                "box_xyxy": [float(x) for x in box.tolist()],
            }
        )
    output_path.write_text(json.dumps(payload, indent=2))


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    image_path = project_root / "examples" / "01.png"
    prompt_json = project_root / "examples" / "01.json"
    outputs_dir = project_root / "outputs"
    outputs_dir.mkdir(parents=True, exist_ok=True)

    objects = json.load(prompt_json.open())["objects"]

    detector = setup_models()
    parser = FieldSpecBuilder()
    refiner = SemanticRefiner()
    builder = PromptBuilder()


    for index, obj in enumerate(objects):

        for tier in PromptTier:
            prompt = builder.build(parser.parse(obj, "object_" + str(index)), tier)
            result = detector.detect(str(image_path), prompt=prompt)

            print(f"Tier: {tier}")
            print(f"Detected {len(result.labels)} object(s) for prompt '{prompt}'.")
            if len(result.labels) == 0:
                continue
            for idx, (box, score, label) in enumerate(
                zip(result.boxes_xyxy, result.scores, result.labels)
            ):
                coords = [round(x, 2) for x in box.tolist()]
                print(f"{idx+1:02d}: {label} | score={score:.3f} | box={coords}")

            viz_path = outputs_dir / f"sam3_detection_overlay_{index}_{tier.name}.png"
            json_path = outputs_dir / f"sam3_detection_{index}_{tier.name}.json"
            _visualize(Image.open(image_path).convert("RGB"), result, viz_path)
            _save_json(result, json_path)
            print(f"Saved visualization to {viz_path}")
            print(f"Saved results to {json_path}")
            break


if __name__ == "__main__":
    main()
