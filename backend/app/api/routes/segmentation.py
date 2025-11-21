import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from loguru import logger

from app.api.dependencies import get_sam3_model, get_segmentation_service
from app.models.sam3_model import SAM3Model
from app.models.schemas import (
    ErrorResponse,
    FileValidation,
    SegmentationResponse,
)
from app.services.metrics_service import get_metrics_service
from app.services.segmentation_service import SegmentationService
from app.utils.exceptions import (
    NotFoundException,
    ProcessingException,
    ServiceUnavailableException,
    ValidationException,
)

router = APIRouter(prefix="/api/v1", tags=["segmentation"])


@router.post("/segment", response_model=SegmentationResponse)
async def segment_image(
    image: UploadFile = File(..., description="Image file (PNG, JPG, JPEG)"),
    metadata: Optional[UploadFile] = File(None, description="Optional JSON metadata file"),
    prompts: Optional[str] = Form(None, description="Optional comma-separated text prompts"),
    segmentation_service: SegmentationService = Depends(get_segmentation_service),
) -> SegmentationResponse:
    """
    Segment an image using SAM3 model.
    
    Upload an image file and optionally provide metadata or text prompts
    for segmentation. The service will detect objects and return segmentation
    masks with bounding boxes and metadata.
    
    Args:
        image: Image file (PNG, JPG, JPEG format, max 10MB)
        metadata: Optional JSON file with object descriptions
        prompts: Optional comma-separated text prompts for detection
        
    Returns:
        SegmentationResponse with result ID, image URLs, and mask metadata
        
    Raises:
        HTTPException: 400 for validation errors, 500 for processing errors
    """
    request_id = str(uuid.uuid4())
    
    try:
        logger.info(
            f"Received segmentation request: request_id={request_id}, "
            f"image={image.filename}, has_metadata={metadata is not None}, "
            f"has_prompts={prompts is not None}"
        )
        
        if not image.content_type:
            raise ValidationException(
                "Image content type is required",
                details={"filename": image.filename},
            )
        
        if not FileValidation.validate_image_type(image.content_type, image.filename or ""):
            raise ValidationException(
                f"Invalid image format. Allowed formats: PNG, JPG, JPEG",
                details={
                    "received_content_type": image.content_type,
                    "filename": image.filename,
                    "allowed_types": list(FileValidation.ALLOWED_IMAGE_TYPES),
                },
            )
        
        image_content = await image.read()
        if not FileValidation.validate_file_size(len(image_content)):
            raise ValidationException(
                f"Image file size exceeds maximum allowed size",
                details={
                    "file_size_bytes": len(image_content),
                    "max_size_bytes": FileValidation.MAX_FILE_SIZE_BYTES,
                    "max_size_mb": FileValidation.MAX_FILE_SIZE_BYTES / (1024 * 1024),
                },
            )
        
        await image.seek(0)
        
        if metadata:
            if metadata.content_type != "application/json":
                raise ValidationException(
                    "Metadata must be JSON format",
                    details={
                        "received_content_type": metadata.content_type,
                        "expected_content_type": "application/json",
                    },
                )
            
            metadata_content = await metadata.read()
            try:
                json.loads(metadata_content)
            except json.JSONDecodeError as e:
                raise ValidationException(
                    "Invalid JSON metadata",
                    details={"json_error": str(e)},
                )
            await metadata.seek(0)
        
        prompt_list: Optional[List[str]] = None
        if prompts:
            prompt_list = [p.strip() for p in prompts.split(",") if p.strip()]
            if not prompt_list:
                raise ValidationException("Prompts cannot be empty if provided")
        
        result = await segmentation_service.process_segmentation(
            image_file=image,
            metadata_file=metadata,
            prompts=prompt_list,
        )
        
        logger.info(
            f"Segmentation completed: request_id={request_id}, "
            f"result_id={result.result_id}, masks={len(result.masks)}"
        )
        
        return result
        
    except (ValidationException, NotFoundException, ProcessingException, ServiceUnavailableException):
        raise
    except ValueError as e:
        logger.warning(f"Validation error for request_id={request_id}: {e}")
        raise ValidationException(str(e))
    except Exception as e:
        logger.exception(f"Segmentation failed for request_id={request_id}: {e}")
        raise ProcessingException(
            "Segmentation processing failed",
            details={"error_type": e.__class__.__name__},
        )


@router.get("/results/{result_id}", response_model=SegmentationResponse)
async def get_result(
    result_id: str,
    segmentation_service: SegmentationService = Depends(get_segmentation_service),
) -> SegmentationResponse:
    """
    Retrieve previously processed segmentation result.
    
    Args:
        result_id: Unique identifier for the segmentation result
        
    Returns:
        SegmentationResponse with the stored result
        
    Raises:
        HTTPException: 404 if result not found, 500 for other errors
    """
    try:
        logger.info(f"Retrieving result: result_id={result_id}")
        
        file_service = segmentation_service.file_service
        result_dir = file_service.outputs_dir / result_id
        
        if not result_dir.exists():
            raise NotFoundException(
                f"Result not found",
                details={"result_id": result_id},
            )
        
        original_image_path = result_dir / "original.png"
        if not original_image_path.exists():
            raise NotFoundException(
                "Original image not found for result",
                details={"result_id": result_id},
            )
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Result retrieval not yet fully implemented. "
                   "Results are currently only available immediately after processing.",
        )
        
    except (NotFoundException, HTTPException):
        raise
    except Exception as e:
        logger.exception(f"Failed to retrieve result {result_id}: {e}")
        raise ProcessingException(
            "Failed to retrieve result",
            details={"result_id": result_id, "error_type": e.__class__.__name__},
        )


@router.get("/health")
async def health_check(
    sam3_model: SAM3Model = Depends(get_sam3_model),
) -> Dict[str, Any]:
    """
    Check service and model health status.
    
    Returns health information including model readiness, device configuration,
    and system status.
    
    Returns:
        Dictionary with health status information
    """
    try:
        health_status = sam3_model.get_health_status()
        
        overall_status = "healthy" if health_status["model_loaded"] else "unhealthy"
        
        response = {
            "status": overall_status,
            "service": "SAM3 Segmentation Service",
            "model": health_status,
        }
        
        logger.debug(f"Health check: status={overall_status}")
        
        if not health_status["model_loaded"]:
            raise ServiceUnavailableException(
                "SAM3 model is not loaded",
                retry_after=30,
                details=health_status,
            )
        
        return response
        
    except ServiceUnavailableException:
        raise
    except Exception as e:
        logger.exception(f"Health check failed: {e}")
        raise ServiceUnavailableException(
            "Health check failed",
            retry_after=60,
            details={"error_type": e.__class__.__name__},
        )


@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """
    Get application metrics and performance statistics.
    
    Returns metrics including request counts, success/error rates,
    and average processing time.
    
    Returns:
        Dictionary containing application metrics:
        - requests_total: Total number of requests processed
        - requests_success: Number of successful requests
        - requests_failed: Number of failed requests
        - success_rate_percent: Success rate as percentage
        - error_rate_percent: Error rate as percentage
        - avg_processing_time_ms: Average processing time in milliseconds
        - uptime_seconds: Service uptime in seconds
        - start_time: Service start timestamp
    """
    try:
        metrics_service = get_metrics_service()
        metrics = metrics_service.get_metrics()
        
        logger.debug(f"Metrics retrieved: {metrics}")
        
        return metrics
        
    except Exception as e:
        logger.exception(f"Failed to retrieve metrics: {e}")
        raise ProcessingException(
            "Failed to retrieve metrics",
            details={"error_type": e.__class__.__name__},
        )
