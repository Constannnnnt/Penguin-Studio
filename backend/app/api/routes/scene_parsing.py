"""
Scene parsing API routes for enhanced scene tab.

Provides endpoints for semantic parsing of JSON metadata to extract
scene configuration parameters with confidence scoring.
"""

import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel, Field

from app.services.scene_parsing_service import SceneParsingService, get_scene_parsing_service
from app.utils.exceptions import ProcessingException, ValidationException

router = APIRouter(prefix="/api/v1/scene", tags=["scene-parsing"])


class SceneParsingRequest(BaseModel):
    """Request schema for scene parsing."""
    
    metadata: Dict[str, Any] = Field(
        ..., 
        description="JSON metadata containing scene information"
    )


class LightingDirectionValue(BaseModel):
    """Lighting direction configuration."""
    
    x: float = Field(..., ge=0, le=100, description="Horizontal position (0-100)")
    y: float = Field(..., ge=0, le=100, description="Vertical position (0-100)")
    rotation: float = Field(..., ge=0, le=360, description="Rotation angle (0-360 degrees)")
    tilt: float = Field(..., ge=-90, le=90, description="Tilt angle (-90 to 90 degrees)")


class SemanticValue(BaseModel):
    """Semantic parsing result with confidence."""
    
    value: str = Field(..., description="Parsed value")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")
    isCustom: bool = Field(..., description="Whether value is custom (not in predefined options)")


class NumericValue(BaseModel):
    """Numeric parsing result with confidence."""
    
    value: float = Field(..., description="Parsed numeric value")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")


class LightingDirectionResult(BaseModel):
    """Lighting direction parsing result."""
    
    value: LightingDirectionValue = Field(..., description="Lighting direction configuration")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")


class PhotographicCharacteristics(BaseModel):
    """Parsed photographic characteristics."""
    
    camera_angle: SemanticValue = Field(..., description="Camera angle configuration")
    lens_focal_length: SemanticValue = Field(..., description="Lens focal length configuration")
    depth_of_field: NumericValue = Field(..., description="Depth of field value (0-100)")
    focus: NumericValue = Field(..., description="Focus value (0-100)")


class LightingConfiguration(BaseModel):
    """Parsed lighting configuration."""
    
    conditions: SemanticValue = Field(..., description="Lighting conditions")
    direction: LightingDirectionResult = Field(..., description="Lighting direction")
    shadows: NumericValue = Field(..., description="Shadow intensity (0-5)")


class AestheticsConfiguration(BaseModel):
    """Parsed aesthetics configuration."""
    
    style_medium: SemanticValue = Field(..., description="Style medium")
    aesthetic_style: SemanticValue = Field(..., description="Aesthetic style")


class SceneParsingResponse(BaseModel):
    """Response schema for scene parsing."""
    
    background_setting: str = Field(..., description="Background setting description")
    photographic_characteristics: PhotographicCharacteristics = Field(
        ..., description="Parsed photographic characteristics"
    )
    lighting: LightingConfiguration = Field(..., description="Parsed lighting configuration")
    aesthetics: AestheticsConfiguration = Field(..., description="Parsed aesthetics configuration")


@router.post("/parse", response_model=SceneParsingResponse)
async def parse_scene_metadata(
    request: SceneParsingRequest,
    scene_service: SceneParsingService = Depends(get_scene_parsing_service),
) -> SceneParsingResponse:
    """
    Parse scene metadata using semantic similarity matching.
    
    Processes JSON metadata and extracts scene configuration parameters
    including camera settings, lighting, and aesthetics with confidence scores.
    
    Args:
        request: Scene parsing request with JSON metadata
        scene_service: Scene parsing service dependency
        
    Returns:
        Parsed scene configuration with confidence scores
        
    Raises:
        HTTPException: 400 for validation errors, 500 for processing errors
    """
    try:
        logger.info("Received scene parsing request")
        
        # Validate metadata structure
        if not isinstance(request.metadata, dict):
            raise ValidationException("Metadata must be a valid JSON object")
        
        # Parse the metadata
        parsed_result = scene_service.parse_scene_metadata(request.metadata)
        
        # Convert to response format
        response = SceneParsingResponse(
            background_setting=parsed_result["background_setting"],
            photographic_characteristics=PhotographicCharacteristics(
                camera_angle=SemanticValue(**parsed_result["photographic_characteristics"]["camera_angle"]),
                lens_focal_length=SemanticValue(**parsed_result["photographic_characteristics"]["lens_focal_length"]),
                depth_of_field=NumericValue(**parsed_result["photographic_characteristics"]["depth_of_field"]),
                focus=NumericValue(**parsed_result["photographic_characteristics"]["focus"])
            ),
            lighting=LightingConfiguration(
                conditions=SemanticValue(**parsed_result["lighting"]["conditions"]),
                direction=LightingDirectionResult(
                    value=LightingDirectionValue(**parsed_result["lighting"]["direction"]["value"]),
                    confidence=parsed_result["lighting"]["direction"]["confidence"]
                ),
                shadows=NumericValue(**parsed_result["lighting"]["shadows"])
            ),
            aesthetics=AestheticsConfiguration(
                style_medium=SemanticValue(**parsed_result["aesthetics"]["style_medium"]),
                aesthetic_style=SemanticValue(**parsed_result["aesthetics"]["aesthetic_style"])
            )
        )
        
        logger.info("Scene parsing completed successfully")
        return response
        
    except ValidationException:
        raise
    except ProcessingException:
        raise
    except Exception as e:
        logger.exception(f"Scene parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scene parsing failed: {str(e)}"
        )


@router.get("/options")
async def get_parsing_options() -> Dict[str, Any]:
    """
    Get available options for scene parsing.
    
    Returns predefined options for camera angles, lens types, lighting conditions,
    and aesthetic styles that can be matched during semantic parsing.
    
    Returns:
        Dictionary containing all predefined parsing options
    """
    try:
        logger.info("Retrieving scene parsing options")
        
        options = {
            "camera_angles": SceneParsingService.CAMERA_ANGLE_OPTIONS,
            "lens_types": SceneParsingService.LENS_TYPE_OPTIONS,
            "lighting_conditions": SceneParsingService.LIGHTING_CONDITION_OPTIONS,
            "style_mediums": SceneParsingService.STYLE_MEDIUM_OPTIONS,
            "aesthetic_styles": SceneParsingService.AESTHETIC_STYLE_OPTIONS,
            "shadow_intensities": list(range(6)),  # 0-5
            "depth_of_field_range": {"min": 0, "max": 100},
            "focus_range": {"min": 0, "max": 100},
            "lighting_direction_ranges": {
                "x": {"min": 0, "max": 100},
                "y": {"min": 0, "max": 100},
                "rotation": {"min": 0, "max": 360},
                "tilt": {"min": -90, "max": 90}
            }
        }
        
        logger.info("Scene parsing options retrieved successfully")
        return options
        
    except Exception as e:
        logger.exception(f"Failed to retrieve parsing options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve parsing options: {str(e)}"
        )


@router.post("/validate")
async def validate_scene_configuration(
    configuration: SceneParsingResponse
) -> Dict[str, Any]:
    """
    Validate a scene configuration.
    
    Checks that all values are within expected ranges and formats.
    
    Args:
        configuration: Scene configuration to validate
        
    Returns:
        Validation result with any errors or warnings
    """
    try:
        logger.info("Validating scene configuration")
        
        errors = []
        warnings = []
        
        # Validate photographic characteristics
        photo = configuration.photographic_characteristics
        
        if photo.depth_of_field.value < 0 or photo.depth_of_field.value > 100:
            errors.append("Depth of field must be between 0 and 100")
        
        if photo.focus.value < 0 or photo.focus.value > 100:
            errors.append("Focus must be between 0 and 100")
        
        # Validate lighting
        lighting = configuration.lighting
        
        if lighting.shadows.value < 0 or lighting.shadows.value > 5:
            errors.append("Shadow intensity must be between 0 and 5")
        
        direction = lighting.direction.value
        if direction.x < 0 or direction.x > 100:
            errors.append("Lighting direction x must be between 0 and 100")
        if direction.y < 0 or direction.y > 100:
            errors.append("Lighting direction y must be between 0 and 100")
        if direction.rotation < 0 or direction.rotation > 360:
            errors.append("Lighting direction rotation must be between 0 and 360")
        if direction.tilt < -90 or direction.tilt > 90:
            errors.append("Lighting direction tilt must be between -90 and 90")
        
        # Check for low confidence values
        if photo.camera_angle.confidence < 0.5:
            warnings.append("Low confidence for camera angle parsing")
        if photo.lens_focal_length.confidence < 0.5:
            warnings.append("Low confidence for lens focal length parsing")
        if lighting.conditions.confidence < 0.5:
            warnings.append("Low confidence for lighting conditions parsing")
        
        result = {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
        
        logger.info(f"Scene configuration validation completed: valid={result['valid']}")
        return result
        
    except Exception as e:
        logger.exception(f"Scene configuration validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )