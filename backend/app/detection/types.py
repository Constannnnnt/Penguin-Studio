from dataclasses import dataclass, field
from typing import List
from enum import Enum
import torch

class PromptTier(str, Enum):
    CORE = "core"                               # minimal, short description
    CORE_VISUAL = "core_visual"                 # core, visual appearance
    CORE_VISUAL_SPATIAL = "core_visual_spatial" # core, visual, spatial context

@dataclass
class PromptSpec:
    label: str
    core: str
    visual: List[str] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)
    relations: List[str] = field(default_factory=list)
    orientations: List[str] = field(default_factory=list)

@dataclass
class PromptPlan:
    """Built prompt ready to send to the detector."""

    label: str
    tier: PromptTier
    text: str

@dataclass
class DetectionResult:
    boxes_xyxy: torch.Tensor
    scores: torch.Tensor
    labels: List[str]
    masks: torch.Tensor
