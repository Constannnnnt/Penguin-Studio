import asyncio
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

import sam3
import torch
from loguru import logger
from PIL import Image
from sam3 import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor

from app.detection.types import DetectionResult


class SAM3Model:
    """Wrapper for SAM3 processor with lifecycle management."""

    def __init__(
        self,
        device: str,
        confidence_threshold: float,
        box_threshold: float = 0.15,
        text_threshold: float = 0.22,
        iou_threshold: float = 0.45,
    ) -> None:
        self.processor: Optional[Sam3Processor] = None
        self.device = device
        self.confidence_threshold = confidence_threshold
        self.box_threshold = box_threshold
        self.text_threshold = text_threshold
        self.iou_threshold = iou_threshold
        self.is_loaded = False
        self._load_error: Optional[str] = None
        self._lock = Lock()

    async def load(self) -> None:
        """Load SAM3 model asynchronously during startup."""
        try:
            logger.info(f"Loading SAM3 model on device: {self.device}")

            loop = asyncio.get_event_loop()
            self.processor = await loop.run_in_executor(
                None, self._load_sam3_processor
            )

            self.is_loaded = True
            logger.info(
                f"SAM3 model loaded successfully on {self.device} "
                f"(confidence_threshold={self.confidence_threshold})"
            )

        except Exception as e:
            self._load_error = str(e)
            self.is_loaded = False
            logger.exception(f"Failed to load SAM3 model: {e}")
            raise RuntimeError(f"SAM3 model loading failed: {e}") from e

    def _load_sam3_processor(self) -> Sam3Processor:
        """Internal method to load SAM3 processor synchronously."""
        bpe_path = (
            Path(sam3.__file__).resolve().parent.parent
            / "assets"
            / "bpe_simple_vocab_16e6.txt.gz"
        )

        if not bpe_path.exists():
            raise FileNotFoundError(f"BPE vocabulary file not found: {bpe_path}")

        model = build_sam3_image_model(
            bpe_path=str(bpe_path), device=self.device, enable_segmentation=True
        )

        return Sam3Processor(
            model=model, device=self.device, confidence_threshold=self.confidence_threshold
        )

    def detect(self, image: Image.Image, prompts: List[str]) -> DetectionResult:
        """Run detection on image with text prompts."""
        if not self.is_loaded or self.processor is None:
            raise RuntimeError(
                "SAM3 model is not loaded. Call load() before detect()."
            )

        if not prompts:
            raise ValueError("At least one prompt is required for detection")

        try:
            with self._lock:
                all_boxes = []
                all_scores = []
                all_labels = []
                all_masks = []

                for prompt in prompts:
                    prompt = prompt.strip()
                    if not prompt:
                        continue

                    state = self.processor.set_image(image)
                    self.processor.reset_all_prompts(state)
                    state = self.processor.set_text_prompt(prompt=prompt, state=state)

                    boxes = state.get("boxes", torch.zeros((0, 4)))
                    scores = state.get("scores", torch.zeros((0,)))
                    masks = state.get(
                        "masks",
                        torch.zeros((0, 1, image.height, image.width), dtype=torch.bool),
                    )

                    boxes = boxes.detach().cpu()
                    scores = scores.detach().cpu()
                    masks = masks.detach().cpu()

                    num_detections = scores.shape[0]
                    if num_detections > 0:
                        all_boxes.append(boxes)
                        all_scores.append(scores)
                        all_labels.extend([prompt] * num_detections)
                        all_masks.append(masks)

                if not all_boxes:
                    return DetectionResult(
                        boxes_xyxy=torch.zeros((0, 4)),
                        scores=torch.zeros((0,)),
                        labels=[],
                        masks=torch.zeros((0, 1, image.height, image.width), dtype=torch.bool),
                    )

                combined_boxes = torch.cat(all_boxes, dim=0)
                combined_scores = torch.cat(all_scores, dim=0)
                combined_masks = torch.cat(all_masks, dim=0)

                return DetectionResult(
                    boxes_xyxy=combined_boxes,
                    scores=combined_scores,
                    labels=all_labels,
                    masks=combined_masks,
                )

        except Exception as e:
            logger.exception(f"Detection failed: {e}")
            raise RuntimeError(f"SAM3 detection failed: {e}") from e

    def get_health_status(self) -> Dict[str, Any]:
        """Return model health and readiness information."""
        return {
            "model_loaded": self.is_loaded,
            "device": self.device,
            "confidence_threshold": self.confidence_threshold,
            "box_threshold": self.box_threshold,
            "text_threshold": self.text_threshold,
            "iou_threshold": self.iou_threshold,
            "load_error": self._load_error,
            "cuda_available": torch.cuda.is_available(),
        }
