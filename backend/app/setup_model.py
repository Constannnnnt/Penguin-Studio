
from pathlib import Path

import sam3
import torch
from sam3 import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor


from app.detection.sam3_detector import Sam3Detector

def load_sam3(device: str, confidence_threshold: float = 0.5) -> Sam3Processor:
    """Build a SAM3 predictor for image segmentation."""
    bpe_path = (
        Path(sam3.__file__).resolve().parent.parent
        / "assets"
        / "bpe_simple_vocab_16e6.txt.gz"
    )
    model = build_sam3_image_model(
        bpe_path=str(bpe_path), device=device, enable_segmentation=True
    )
    return Sam3Processor(
        model=model, device=device, confidence_threshold=confidence_threshold
    )


def setup_models(device: str | None = None) -> Sam3Detector:
    """Return a ready-to-use SAM3 detector."""
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    sam3_processor = load_sam3(device=device, confidence_threshold=0.5)

    print("Download SAM3 model successfully")
    return Sam3Detector(processor=sam3_processor)

if __name__ == "__main__":
    setup_models()
