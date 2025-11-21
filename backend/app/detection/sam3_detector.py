from typing import List

import torch
from PIL import Image
from sam3.model.sam3_image_processor import Sam3Processor

from app.detection.backend import DetectionBackend
from app.detection.types import DetectionResult

class Sam3Detector(DetectionBackend):

    def __init__(self, processor: Sam3Processor) -> None:
        self.processor = processor

    def detect(self, image_path: str, prompt: str) -> DetectionResult:
        image = self._load_image(image_path)
        state = self._forward(image, prompt)

        boxes = state.get("boxes", torch.zeros((0, 4)))
        scores = state.get("scores", torch.zeros((0,)))
        masks = state.get(
            "masks",
            torch.zeros((0, 1, image.height, image.width), dtype=torch.bool),
        )

        # Move results to CPU for downstream processing/visualization.
        boxes = boxes.detach().cpu()
        scores = scores.detach().cpu()
        masks = masks.detach().cpu()

        labels: List[str] = [prompt for _ in range(scores.shape[0])]
        return DetectionResult(
            boxes_xyxy=boxes,
            scores=scores,
            labels=labels,
            masks=masks,
        )

    def _forward(self, image: Image.Image, prompt: str) -> dict:
        prompt = prompt.strip()
        state = self.processor.set_image(image)
        self.processor.reset_all_prompts(state)
        state = self.processor.set_text_prompt(prompt=prompt, state=state)
        return state

    @staticmethod
    def _load_image(image_path: str) -> Image.Image:
        return Image.open(image_path).convert("RGB")
    
