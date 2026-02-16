"""
Image generation API routes using Bria's FIBO model.

Provides endpoints for generating images from text prompts,
refining images with structured prompts, and managing generation history.
"""

import asyncio
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field

from app.api.dependencies import get_segmentation_service
from app.config import settings
from app.utils.filesystem import glob_async, read_json_async, write_json_async, safe_join
from app.services.bria_service import (
    BriaService,
    GenerationParameters,
    StructuredPrompt,
    get_bria_service,
    BriaAPIError,
    AuthenticationError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
)
from app.services.segmentation_service import SegmentationService

router = APIRouter(prefix="/api", tags=["generation"])


class GenerateRequest(BaseModel):
    """Request schema for image generation."""
    prompt: Optional[str] = Field(None, description="Text prompt for generation")
    images: Optional[List[str]] = Field(None, description="Reference image URLs or base64")
    structured_prompt: Optional[Dict[str, Any]] = Field(None, description="Structured prompt")
    aspect_ratio: str = Field("1:1", description="Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)")
    resolution: int = Field(1024, description="Resolution (512, 768, 1024)")
    seed: Optional[int] = Field(None, description="Seed for reproducibility")
    num_inference_steps: int = Field(50, description="Number of inference steps")
    skip_cache: bool = Field(False, description="Skip cache lookup")


class RefineRequest(BaseModel):
    """Request schema for image refinement."""
    structured_prompt: Dict[str, Any] = Field(..., description="Updated structured prompt")
    seed: int = Field(..., description="Original seed for consistency")
    modification_prompt: Optional[str] = Field(None, description="Optional prompt describing modification (e.g., 'add sunlight')")
    aspect_ratio: str = Field("1:1", description="Aspect ratio")
    resolution: int = Field(1024, description="Resolution")


class GenerateResponse(BaseModel):
    """Response schema for image generation."""
    id: str = Field(..., description="Generation ID")
    status: str = Field(..., description="Generation status")
    image_url: Optional[str] = Field(None, description="Generated image URL")
    structured_prompt: Optional[Dict[str, Any]] = Field(None, description="Structured prompt")
    seed: Optional[int] = Field(None, description="Seed used")
    generation_time_ms: Optional[float] = Field(None, description="Generation time in ms")
    ip_warning: Optional[str] = Field(None, description="IP-related warning message")
    from_cache: bool = Field(False, description="Whether result was from cache")
    error: Optional[str] = Field(None, description="Error message if failed")


class CacheStatusResponse(BaseModel):
    """Response for cache status check."""
    available: bool = Field(..., description="Whether cached result exists")
    age_seconds: Optional[float] = Field(None, description="Age of cached result")


class StructuredPromptRequest(BaseModel):
    """Request schema for structured prompt generation."""
    prompt: Optional[str] = Field(None, description="Text prompt")
    images: Optional[List[str]] = Field(None, description="Reference image URLs")
    structured_prompt: Optional[Dict[str, Any]] = Field(None, description="Existing structured prompt to refine")
    modification_prompt: Optional[str] = Field(None, description="Modification prompt (e.g., 'add sunlight')")


class StructuredPromptResponse(BaseModel):
    """Response schema for structured prompt generation."""
    structured_prompt: Dict[str, Any] = Field(..., description="Generated structured prompt")


def _handle_bria_error(e: BriaAPIError, request_id: str) -> None:
    """Convert Bria API errors to HTTP exceptions."""
    logger.error(f"Bria API error for request_id={request_id}: {e.code} - {e}")

    if isinstance(e, AuthenticationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    elif isinstance(e, RateLimitError):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded, please try again later",
            headers={"Retry-After": str(e.retry_after)} if e.retry_after else None,
        )
    elif isinstance(e, ServiceUnavailableError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable",
        )
    elif isinstance(e, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Generation failed",
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate_image(
    request: GenerateRequest,
    bria_service: BriaService = Depends(get_bria_service),
) -> GenerateResponse:
    """
    Generate an image from a text prompt using Bria's FIBO model.

    The API uses a two-step process:
    1. VLM Bridge translates the prompt into a structured JSON description
    2. FIBO model generates the image based on the structured prompt

    Args:
        request: Generation request with prompt and parameters

    Returns:
        GenerateResponse with image URL, structured prompt, and seed
    """
    request_id = str(uuid.uuid4())

    logger.info(
        f"Generation request: request_id={request_id}, "
        f"prompt={request.prompt[:50] if request.prompt else 'none'}..., "
        f"has_images={request.images is not None}, "
        f"has_structured_prompt={request.structured_prompt is not None}"
    )

    try:
        # Build parameters
        parameters = GenerationParameters(
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            seed=request.seed,
            num_inference_steps=request.num_inference_steps,
        )

        # Parse structured prompt if provided
        structured_prompt = None
        if request.structured_prompt:
            structured_prompt = StructuredPrompt(**request.structured_prompt)

        # Generate image
        result = await bria_service.generate_image(
            prompt=request.prompt,
            images=request.images,
            structured_prompt=structured_prompt,
            parameters=parameters,
            skip_cache=request.skip_cache,
        )

        # Save generation to disk
        generation_id = await bria_service.save_generation(
            result=result,
            prompt=request.prompt or "",
            parameters=parameters,
        )

        logger.info(
            f"Generation completed: request_id={request_id}, "
            f"generation_id={generation_id}, seed={result.seed}, "
            f"from_cache={result.from_cache}"
        )

        return GenerateResponse(
            id=generation_id,
            status="completed",
            image_url=result.image_url,
            structured_prompt=result.structured_prompt.model_dump(exclude_none=True),
            seed=result.seed,
            generation_time_ms=result.generation_time_ms,
            ip_warning=result.ip_warning,
            from_cache=result.from_cache,
        )

    except BriaAPIError as e:
        _handle_bria_error(e, request_id)
    except Exception as e:
        logger.exception(f"Generation failed for request_id={request_id}: {e}")
        return GenerateResponse(
            id=request_id,
            status="failed",
            error=str(e),
        )


@router.post("/structured-prompt", response_model=StructuredPromptResponse)
async def generate_structured_prompt(
    request: StructuredPromptRequest,
    bria_service: BriaService = Depends(get_bria_service),
) -> StructuredPromptResponse:
    """
    Generate or refine a structured prompt using Bria's VLM bridge.

    This endpoint generates a structured JSON prompt without generating an image.
    Useful for:
    - Converting text prompt to structured prompt
    - Analyzing reference images
    - Refining an existing structured prompt with modifications

    Args:
        request: Request with prompt, images, or structured_prompt to refine

    Returns:
        StructuredPromptResponse with the generated structured prompt
    """
    request_id = str(uuid.uuid4())

    logger.info(
        f"Structured prompt request: request_id={request_id}, "
        f"has_prompt={request.prompt is not None}, "
        f"has_images={request.images is not None}, "
        f"has_structured_prompt={request.structured_prompt is not None}"
    )

    try:
        # Parse existing structured prompt if provided
        existing_prompt = None
        if request.structured_prompt:
            existing_prompt = StructuredPrompt(**request.structured_prompt)

        # Generate structured prompt
        result = await bria_service.generate_structured_prompt(
            prompt=request.prompt,
            images=request.images,
            structured_prompt=existing_prompt,
            modification_prompt=request.modification_prompt,
        )

        logger.info(f"Structured prompt generated: request_id={request_id}")

        return StructuredPromptResponse(
            structured_prompt=result.model_dump(exclude_none=True),
        )

    except BriaAPIError as e:
        _handle_bria_error(e, request_id)
    except Exception as e:
        logger.exception(f"Structured prompt generation failed for request_id={request_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/refine", response_model=GenerateResponse)
async def refine_image(
    request: RefineRequest,
    bria_service: BriaService = Depends(get_bria_service),
) -> GenerateResponse:
    """
    Refine an image using an updated structured prompt and original seed.

    This allows precise adjustments to a generated image by modifying
    the structured prompt while maintaining consistency via the seed.

    Args:
        request: Refinement request with structured prompt and seed

    Returns:
        GenerateResponse with refined image URL and updated structured prompt
    """
    request_id = str(uuid.uuid4())

    logger.info(
        f"Refinement request: request_id={request_id}, seed={request.seed}"
    )

    try:
        # Parse structured prompt
        structured_prompt = StructuredPrompt(**request.structured_prompt)

        # Build parameters
        parameters = GenerationParameters(
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            seed=request.seed,
        )

        # Refine image
        result = await bria_service.refine_image(
            structured_prompt=structured_prompt,
            seed=request.seed,
            modification_prompt=request.modification_prompt,
            parameters=parameters,
        )

        # Save refined generation
        generation_id = await bria_service.save_generation(
            result=result,
            prompt=structured_prompt.short_description,
            parameters=parameters,
        )

        logger.info(
            f"Refinement completed: request_id={request_id}, "
            f"generation_id={generation_id}"
        )

        return GenerateResponse(
            id=generation_id,
            status="completed",
            image_url=result.image_url,
            structured_prompt=result.structured_prompt.model_dump(exclude_none=True),
            seed=result.seed,
            generation_time_ms=result.generation_time_ms,
            ip_warning=result.ip_warning,
            from_cache=False,
        )

    except BriaAPIError as e:
        _handle_bria_error(e, request_id)
    except Exception as e:
        logger.exception(f"Refinement failed for request_id={request_id}: {e}")
        return GenerateResponse(
            id=request_id,
            status="failed",
            error=str(e),
        )


@router.get("/generate/{generation_id}", response_model=GenerateResponse)
async def get_generation(
    generation_id: str,
) -> GenerateResponse:
    """
    Get a previously generated image by ID.

    This endpoint is used for polling generation status when using
    async generation (not currently implemented - generations are synchronous).

    Args:
        generation_id: Unique generation identifier

    Returns:
        GenerateResponse with generation details
    """
    from app.config import settings
    import json

    generation_dir = safe_join(settings.outputs_dir, generation_id)

    if not generation_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation not found: {generation_id}",
        )

    try:
        # Load metadata
        metadata_path = generation_dir / "metadata.json"
        if metadata_path.exists():
            metadata = await read_json_async(metadata_path)
        else:
            metadata = {}

        # Load structured prompt
        prompt_path = generation_dir / "structured_prompt.json"
        structured_prompt = None
        if prompt_path.exists():
            structured_prompt = await read_json_async(prompt_path)

        # Check for image
        image_path = generation_dir / "generated.png"
        image_url = f"/outputs/{generation_id}/generated.png" if image_path.exists() else None

        return GenerateResponse(
            id=generation_id,
            status="completed" if image_url else "pending",
            image_url=image_url,
            structured_prompt=structured_prompt,
            seed=metadata.get("seed"),
            ip_warning=metadata.get("ip_warning"),
            from_cache=False,
        )

    except Exception as e:
        logger.exception(f"Failed to load generation {generation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load generation",
        )


@router.post("/generate/check-cache", response_model=CacheStatusResponse)
async def check_cache(
    request: GenerateRequest,
    bria_service: BriaService = Depends(get_bria_service),
) -> CacheStatusResponse:
    """
    Check if a cached result exists for the given prompt and parameters.

    Args:
        request: Generation request to check

    Returns:
        CacheStatusResponse indicating cache availability
    """
    if not request.prompt:
        return CacheStatusResponse(available=False)

    parameters = GenerationParameters(
        aspect_ratio=request.aspect_ratio,
        resolution=request.resolution,
        seed=request.seed,
        num_inference_steps=request.num_inference_steps,
    )

    available = bria_service.has_cached_result(request.prompt, parameters)
    age = bria_service.get_cache_age(request.prompt, parameters) if available else None

    return CacheStatusResponse(available=available, age_seconds=age)


@router.post("/generate/clear-cache")
async def clear_cache(
    bria_service: BriaService = Depends(get_bria_service),
) -> Dict[str, Any]:
    """
    Clear the generation cache.

    Returns:
        Dictionary with number of entries cleared
    """
    count = bria_service.clear_cache()
    return {"cleared": count}


@router.get("/generate/health")
async def generation_health(
    bria_service: BriaService = Depends(get_bria_service),
) -> Dict[str, Any]:
    """
    Check Bria API health and configuration status.

    Returns:
        Health status including API key configuration
    """
    has_api_key = bool(bria_service.api_key)

    return {
        "status": "healthy" if has_api_key else "degraded",
        "api_key_configured": has_api_key,
        "cache_entries": len(bria_service._cache),
    }


@router.post("/segment-generation/{generation_id}")
async def segment_generation(
    generation_id: str,
    prompts: Optional[str] = None,
    segmentation_service: SegmentationService = Depends(get_segmentation_service),
) -> Dict[str, Any]:
    """
    Segment a previously generated image.

    This endpoint triggers segmentation on an existing generation.
    The segmentation results are stored in a new result folder.

    Args:
        generation_id: ID of the generation to segment
        prompts: Optional comma-separated text prompts for segmentation

    Returns:
        Segmentation results with mask information
    """
    from io import BytesIO

    generation_dir = safe_join(settings.outputs_dir, generation_id)

    if not generation_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation not found: {generation_id}",
        )

    image_path = generation_dir / "generated.png"
    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generated image not found: {generation_id}",
        )

    try:
        # Load metadata if exists
        metadata_path = generation_dir / "structured_prompt.json"
        metadata_dict = None
        if metadata_path.exists():
            metadata_dict = await read_json_async(metadata_path)

        # Read image file
        loop = asyncio.get_event_loop()
        image_bytes = await loop.run_in_executor(None, image_path.read_bytes)

        # Create file-like objects for segmentation service
        from fastapi import UploadFile

        image_file = UploadFile(
            filename="generated.png",
            file=BytesIO(image_bytes),
        )

        metadata_file = None
        if metadata_dict:
            metadata_bytes = json.dumps(metadata_dict).encode()
            metadata_file = UploadFile(
                filename="metadata.json",
                file=BytesIO(metadata_bytes),
            )

        # Process segmentation - save masks in the same generation folder
        result = await segmentation_service.process_segmentation(
            image_file=image_file,
            metadata_file=metadata_file,
            prompts=prompts.split(",") if prompts else None,
            output_dir=generation_dir,
            result_id_override=generation_id,
        )

        logger.info(
            f"Segmentation completed for generation {generation_id}: "
            f"masks={len(result.masks)}"
        )

        return {
            "generation_id": generation_id,
            "result_id": generation_id,
            "original_image_url": f"/outputs/{generation_id}/generated.png",
            "masks": [mask.model_dump() for mask in result.masks],
            "timestamp": result.timestamp,
        }

    except Exception as e:
        logger.exception(f"Segmentation failed for generation {generation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Segmentation failed: {str(e)}",
        )


class LoadGenerationResponse(BaseModel):
    """Response for loading a generation."""
    generation_id: str
    image_url: str
    structured_prompt: Dict[str, Any]
    prompt_versions: List[str]
    masks: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None
    seed: Optional[int] = None


class SavePromptRequest(BaseModel):
    """Request to save a new prompt version."""
    structured_prompt: Dict[str, Any]


class SavePromptResponse(BaseModel):
    """Response after saving a prompt version."""
    filename: str
    timestamp: str


@router.get("/load-generation/{generation_id}", response_model=LoadGenerationResponse)
async def load_generation(generation_id: str) -> LoadGenerationResponse:
    """
    Load a generation folder with all its data.

    Returns the image, structured prompt, all prompt versions, and masks.
    If segmentation_meta.json exists, masks include full object metadata.
    No segmentation is performed - just reads existing files.
    """
    generation_dir = safe_join(settings.outputs_dir, generation_id)

    if not generation_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation not found: {generation_id}",
        )

    # Check for image
    image_path = generation_dir / "generated.png"
    if not image_path.exists():
        # Try original.png for older results
        image_path = generation_dir / "original.png"

    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found in generation: {generation_id}",
        )

    image_url = f"/outputs/{generation_id}/{image_path.name}"

    # Load structured prompt (latest version)
    structured_prompt = {}
    prompt_path = generation_dir / "structured_prompt.json"
    if prompt_path.exists():
        structured_prompt = await read_json_async(prompt_path)

    # Find all prompt versions
    prompt_versions = []
    found_files = await glob_async(generation_dir, "structured_prompt*.json")
    for f in sorted(found_files):
        prompt_versions.append(f.name)

    # Load masks - prefer segmentation_meta.json for full object metadata
    masks = []
    seg_meta_path = generation_dir / "segmentation_meta.json"

    if seg_meta_path.exists():
        # Rich metadata available - use it
        seg_meta = await read_json_async(seg_meta_path)
        masks = seg_meta.get("masks", [])
        logger.debug(f"Loaded {len(masks)} masks from segmentation_meta.json")
    else:
        # Fallback to basic mask file enumeration
        mask_files = await glob_async(generation_dir, "mask_*.png")
        for i, mask_file in enumerate(sorted(mask_files)):
            mask_url = f"/outputs/{generation_id}/{mask_file.name}"
            masks.append({
                "mask_id": f"mask_{i}",
                "mask_url": mask_url,
                "label": f"Object {i + 1}",
            })

    # Load metadata if exists
    metadata = None
    metadata_path = generation_dir / "metadata.json"
    if metadata_path.exists():
        metadata = await read_json_async(metadata_path)

    seed = None
    if isinstance(metadata, dict):
        seed = metadata.get("seed")
        if seed is None:
            params = metadata.get("parameters")
            if isinstance(params, dict):
                seed = params.get("seed")

    logger.info(f"Loaded generation {generation_id}: {len(masks)} masks, {len(prompt_versions)} prompt versions")

    return LoadGenerationResponse(
        generation_id=generation_id,
        image_url=image_url,
        structured_prompt=structured_prompt,
        prompt_versions=prompt_versions,
        masks=masks,
        metadata=metadata,
        seed=seed,
    )


@router.post("/generation/{generation_id}/save-prompt", response_model=SavePromptResponse)
async def save_prompt_version(
    generation_id: str,
    request: SavePromptRequest,
) -> SavePromptResponse:
    """
    Save a new version of the structured prompt.

    Creates a timestamped file, preserving the original.
    """
    from datetime import datetime

    generation_dir = safe_join(settings.outputs_dir, generation_id)

    if not generation_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation not found: {generation_id}",
        )

    # Generate timestamped filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"structured_prompt_{timestamp}.json"
    prompt_path = generation_dir / filename

    # Save the new version
    await write_json_async(prompt_path, request.structured_prompt)

    logger.info(f"Saved prompt version for {generation_id}: {filename}")

    return SavePromptResponse(
        filename=filename,
        timestamp=timestamp,
    )
