from dataclasses import dataclass


@dataclass
class ModelConfig:
    box_threshold: float = 0.15
    text_threshold: float = 0.22
    iou_threshold: float = 0.45
