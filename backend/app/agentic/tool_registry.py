"""
Tool Registry for the Penguin agentic framework.

This module defines the tools accessible to the agent and provides their
JSON schemas for both the LLM (planning) and the frontend (UI rendering).
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# =============================================================================
# 1. Image Tools (Basic Adjustments)
# =============================================================================


class SetGlobalBrightness(BaseModel):
    """Adjust the global brightness of the image."""

    value: int = Field(
        ..., ge=-100, le=100, description="Brightness value from -100 to 100"
    )


class SetGlobalContrast(BaseModel):
    """Adjust the global contrast of the image."""

    value: int = Field(
        ..., ge=-100, le=100, description="Contrast value from -100 to 100"
    )


class SetGlobalSaturation(BaseModel):
    """Adjust the global saturation of the image."""

    value: int = Field(
        ..., ge=-100, le=100, description="Saturation value from -100 to 100"
    )


class SetGlobalExposure(BaseModel):
    """Adjust the global exposure of the image."""

    value: int = Field(
        ..., ge=-100, le=100, description="Exposure value from -100 to 100"
    )


class SetGlobalVibrance(BaseModel):
    """Adjust the global vibrance of the image."""

    value: int = Field(
        ..., ge=-100, le=100, description="Vibrance value from -100 to 100"
    )


class SetGlobalHue(BaseModel):
    """Adjust the global hue of the image."""

    value: int = Field(
        ..., ge=-180, le=180, description="Hue rotation from -180 to 180 degrees"
    )


class SetGlobalBlur(BaseModel):
    """Adjust the global blur of the image."""

    value: int = Field(..., ge=0, le=100, description="Blur amount from 0 to 100")


class SetGlobalSharpen(BaseModel):
    """Adjust the global sharpen level of the image."""

    value: int = Field(..., ge=0, le=100, description="Sharpen amount from 0 to 100")


class SetGlobalRotation(BaseModel):
    """Rotate the image."""

    angle: Literal[0, 90, 180, 270] = Field(
        ..., description="Rotation angle in degrees"
    )


class ToggleGlobalFlip(BaseModel):
    """Flip the image horizontally or vertically."""

    axis: Literal["horizontal", "vertical"] = Field(
        ..., description="Axis to flip along"
    )


# =============================================================================
# 2. Scene Tools (AI Refinement)
# =============================================================================


class UpdateLighting(BaseModel):
    """Update lighting conditions and shadows."""

    conditions: Optional[str] = Field(
        None, description="Lighting conditions (e.g., 'natural', 'studio', 'dramatic')"
    )
    shadows: Optional[int] = Field(
        None, ge=0, le=5, description="Shadow intensity from 0 (none) to 5 (dramatic)"
    )
    direction: Optional[str] = Field(
        None,
        description="Lighting direction string (e.g., 'x:50, y:30, rotation:0, tilt:0')",
    )


class UpdatePhotographic(BaseModel):
    """Update photographic characteristics like depth of field and focus."""

    depth_of_field: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Depth of field from 0 (very shallow) to 100 (everything in focus)",
    )
    focus: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Focus sharpness from 0 (soft) to 100 (hyper sharp)",
    )
    camera_angle: Optional[str] = Field(
        None, description="Camera angle (e.g., 'eye-level', 'overhead', 'low-angle')"
    )


class UpdateAesthetics(BaseModel):
    """Update aesthetic properties like composition and color scheme."""

    composition: Optional[str] = Field(
        None, description="Composition type (e.g., 'centered', 'rule of thirds')"
    )
    color_scheme: Optional[str] = Field(
        None, description="Color scheme (e.g., 'vibrant', 'muted', 'warm')"
    )
    mood_atmosphere: Optional[str] = Field(
        None, description="Mood or atmosphere (e.g., 'elegant', 'energetic')"
    )


class UpdateBackground(BaseModel):
    """Update the background setting description."""

    background_setting: str = Field(
        ...,
        description="Description of the background (e.g., 'a minimalist studio', 'a lush forest')",
    )


# =============================================================================
# 3. Object Tools (Segmentation & Masking)
# =============================================================================


class SelectObject(BaseModel):
    """Identify and select a specific object in the scene using a text prompt."""

    prompt: str = Field(
        ...,
        description="Text description of the object to find (e.g., 'the red gemstone')",
    )


class AdjustObjectProperty(BaseModel):
    """Adjust spatial properties of a specific object."""

    mask_id: str = Field(..., description="The ID of the object mask")
    property: Literal["location", "relative_size", "orientation"] = Field(
        ..., description="Property to adjust"
    )
    value: str = Field(
        ...,
        description="New value for the property (e.g., 'top-right', 'large', '45 degrees')",
    )


class AdjustObjectImageEdit(BaseModel):
    """Apply image adjustments to a specific object mask only."""

    mask_id: str = Field(..., description="The ID of the object mask")
    edit_type: Literal[
        "brightness", "contrast", "saturation", "hue", "blur", "exposure", "vibrance"
    ] = Field(..., description="Type of adjustment")
    value: int = Field(..., description="Adjustment value (matching global ranges)")


# =============================================================================
# Tool Registry Class
# =============================================================================


class ToolRegistry:
    """Registry for all Penguin agent tools."""

    TOOLS = {
        # Image Tools
        "set_global_brightness": SetGlobalBrightness,
        "set_global_contrast": SetGlobalContrast,
        "set_global_saturation": SetGlobalSaturation,
        "set_global_exposure": SetGlobalExposure,
        "set_global_vibrance": SetGlobalVibrance,
        "set_global_hue": SetGlobalHue,
        "set_global_blur": SetGlobalBlur,
        "set_global_sharpen": SetGlobalSharpen,
        "set_global_rotation": SetGlobalRotation,
        "toggle_global_flip": ToggleGlobalFlip,
        # Scene Tools
        "update_lighting": UpdateLighting,
        "update_photographic": UpdatePhotographic,
        "update_aesthetics": UpdateAesthetics,
        "update_background": UpdateBackground,
        # Object Tools
        "select_object": SelectObject,
        "adjust_object_property": AdjustObjectProperty,
        "adjust_object_image_edit": AdjustObjectImageEdit,
    }

    @classmethod
    def get_tool_schema(cls, tool_name: str) -> Dict[str, Any]:
        """Get the JSON schema for a specific tool."""
        if tool_name not in cls.TOOLS:
            raise ValueError(f"Tool {tool_name} not found in registry")
        return cls.TOOLS[tool_name].schema()

    @classmethod
    def list_tools(cls) -> List[str]:
        """List all available tool names."""
        return list(cls.TOOLS.keys())

    @classmethod
    def get_all_schemas(cls) -> Dict[str, Dict[str, Any]]:
        """Get schemas for all registered tools."""
        return {name: model.schema() for name, model in cls.TOOLS.items()}
