from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field, field_validator


class BoundingBox(BaseModel):
    """Bounding box in XYXY format."""

    x1: float = Field(..., description="Left x coordinate")
    y1: float = Field(..., description="Top y coordinate")
    x2: float = Field(..., description="Right x coordinate")
    y2: float = Field(..., description="Bottom y coordinate")

    @field_validator("x1", "x2", "y1", "y2")
    @classmethod
    def validate_coordinates(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Coordinates must be non-negative")
        return v


class ObjectMetadata(BaseModel):
    """Object metadata from JSON input."""

    description: str = Field(..., description="Object description")
    location: str = Field(..., description="Object location in scene")
    relationship: str = Field(default="", description="Relationship to other objects")
    relative_size: str = Field(..., description="Relative size of object")
    shape_and_color: str = Field(..., description="Shape and color description")
    texture: str = Field(default="", description="Texture description")
    appearance_details: str = Field(default="", description="Appearance details")
    orientation: str = Field(..., description="Object orientation")


class MaskMetadata(BaseModel):
    """Metadata for a single segmentation mask."""

    mask_id: str = Field(..., description="Unique identifier for the mask")
    object_id: Optional[str] = Field(
        None, description="Identifier for the logical object this mask belongs to"
    )
    label: str = Field(..., description="Object label/description")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    bounding_box: BoundingBox = Field(..., description="Bounding box coordinates")
    area_pixels: int = Field(..., ge=0, description="Mask area in pixels")
    area_percentage: float = Field(
        ..., ge=0.0, le=100.0, description="Mask area as percentage of image"
    )
    centroid: Tuple[int, int] = Field(..., description="Mask centroid coordinates")
    mask_url: str = Field(..., description="URL to mask image file")
    prompt_tier: Optional[Literal["CORE", "CORE_VISUAL", "CORE_VISUAL_SPATIAL"]] = Field(
        None, description="Prompt tier used for detection"
    )
    prompt_text: Optional[str] = Field(None, description="Exact prompt text used")
    object_metadata: Optional[ObjectMetadata] = Field(
        None, description="Object metadata from JSON input"
    )


class SegmentationResponse(BaseModel):
    """Response schema for segmentation results."""

    result_id: str = Field(..., description="Unique identifier for the result")
    original_image_url: str = Field(..., description="URL to original image")
    masks: List[MaskMetadata] = Field(
        default_factory=list, description="List of segmentation masks"
    )
    processing_time_ms: float = Field(
        ..., ge=0, description="Processing time in milliseconds"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Result timestamp"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional parsed metadata from upload"
    )


class FileNode(BaseModel):
    """Represents a simple file tree node for the UI library panel."""

    name: str = Field(..., description="Display name")
    path: str = Field(..., description="Path from root, prefixed with /")
    type: Literal["file", "directory"] = Field(..., description="Node type")
    children: List["FileNode"] = Field(
        default_factory=list, description="Child nodes for directories"
    )
    extension: Optional[str] = Field(
        default=None, description="File extension without dot"
    )
    modified_at: Optional[datetime] = Field(
        default=None, description="Last modified timestamp"
    )
    size: Optional[int] = Field(default=None, description="File size in bytes")
    url: Optional[str] = Field(default=None, description="HTTP URL for the file")


class WebSocketMessage(BaseModel):
    """WebSocket message schema with type discriminators."""

    type: Literal["progress", "result", "error", "connected"] = Field(
        ..., description="Message type"
    )
    data: Dict[str, Any] = Field(..., description="Message payload")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Message timestamp"
    )


class ErrorResponse(BaseModel):
    """Standardized error response schema."""

    error: str = Field(..., description="Error type or category")
    detail: str = Field(..., description="Detailed error message")
    request_id: str = Field(..., description="Request identifier for tracking")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Error timestamp"
    )
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details and context"
    )


class SegmentationRequest(BaseModel):
    """Request schema for segmentation validation."""

    prompts: Optional[List[str]] = Field(
        None, description="Optional text prompts for segmentation"
    )

    @field_validator("prompts")
    @classmethod
    def validate_prompts(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if len(v) == 0:
                raise ValueError("Prompts list cannot be empty if provided")
            for prompt in v:
                if not prompt.strip():
                    raise ValueError("Prompts cannot be empty strings")
        return v


class LightingMetadata(BaseModel):
    conditions: str = Field(..., description="Lighting conditions")
    direction: str = Field(..., description="Lighting direction")
    shadows: str = Field(..., description="Shadow description")


class AestheticsMetadata(BaseModel):
    composition: str = Field(..., description="Composition description")
    color_scheme: str = Field(..., description="Color scheme")
    mood_atmosphere: str = Field(..., description="Mood and atmosphere")
    preference_score: str = Field(..., description="Preference score")
    aesthetic_score: str = Field(..., description="Aesthetic score")


class PhotographicMetadata(BaseModel):
    depth_of_field: str = Field(..., description="Depth of field description")
    focus: str = Field(..., description="Focus description")
    camera_angle: str = Field(..., description="Camera angle")
    lens_focal_length: str = Field(..., description="Lens focal length")


class SceneMetadata(BaseModel):
    """Metadata document persisted alongside segmentation results."""

    short_description: str = Field(..., description="Brief scene description")
    objects: List[ObjectMetadata] = Field(
        default_factory=list, description="List of objects in the scene"
    )
    background_setting: str = Field(..., description="Background setting")
    lighting: LightingMetadata = Field(..., description="Lighting details")
    aesthetics: AestheticsMetadata = Field(..., description="Aesthetic details")
    photographic_characteristics: PhotographicMetadata = Field(
        ..., description="Photographic characteristics"
    )
    style_medium: str = Field(..., description="Style medium")
    artistic_style: Optional[str] = Field(
        default=None, description="Optional artistic style"
    )
    context: Optional[str] = Field(
        default=None, description="Optional scene context or notes"
    )


# Resolve forward references for recursive models
FileNode.model_rebuild()
SceneMetadata.model_rebuild()


class FileValidation:
    """File validation constants and methods."""

    ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg"}
    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

    @staticmethod
    def validate_image_type(content_type: str, filename: str) -> bool:
        """Validate image file type by content type and extension."""
        if content_type not in FileValidation.ALLOWED_IMAGE_TYPES:
            return False

        extension = filename.lower().split(".")[-1] if "." in filename else ""
        return f".{extension}" in FileValidation.ALLOWED_EXTENSIONS

    @staticmethod
    def validate_file_size(size: int) -> bool:
        """Validate file size is within limits."""
        return 0 < size <= FileValidation.MAX_FILE_SIZE_BYTES
