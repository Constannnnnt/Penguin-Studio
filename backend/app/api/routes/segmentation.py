import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from loguru import logger

from app.api.dependencies import get_file_service, get_sam3_model, get_segmentation_service
from app.config import settings
from app.models.sam3_model import SAM3Model
from app.models.schemas import (
    ErrorResponse,
    FileNode,
    FileValidation,
    SceneMetadata,
    SegmentationResponse,
)
from app.services.file_service import FileService
from app.services.metrics_service import get_metrics_service
from app.services.segmentation_service import SegmentationService
from app.utils.filesystem import write_json_async
from app.utils.exceptions import (
    NotFoundException,
    ProcessingException,
    ServiceUnavailableException,
    ValidationException,
)

router = APIRouter(prefix="/api/v1", tags=["segmentation"])


def _format_path(*parts: str) -> str:
    path = "/".join(part.strip("/") for part in parts if part)
    return f"/{path}" if not path.startswith("/") else path


def _get_secure_result_dir(file_service: FileService, result_id: str) -> Path:
    """
    Resolve result directory and ensure it is within safe outputs directory.
    Raises NotFoundException if path traversal detected or directory does not exist.
    """
    result_dir = (file_service.outputs_dir / result_id).resolve()
    outputs_dir_resolved = file_service.outputs_dir.resolve()

    if not result_dir.is_relative_to(outputs_dir_resolved) or not result_dir.exists():
        raise NotFoundException(
            "Result not found", details={"result_id": result_id}
        )
    return result_dir


def _build_file_node(
    path: Path, base_url: str, parent_path: str, name: Optional[str] = None
) -> FileNode:
    stat = path.stat()
    node_path = _format_path(parent_path, name or path.name)

    if path.is_dir():
        children = []
        for child in path.iterdir():
            if child.is_dir():
                children.append(
                    _build_file_node(child, f"{base_url}/{child.name}", node_path)
                )
            elif child.suffix.lower() in {".png", ".jpg", ".jpeg", ".json"}:
                children.append(
                    _build_file_node(child, base_url, node_path, child.name)
                )

        # Sort directories first, then files by modified date descending
        children.sort(
            key=lambda c: (
                0 if c.type == "directory" else 1,
                -(
                    c.modified_at.timestamp()
                    if c.modified_at is not None
                    else 0
                ),
            )
        )

        return FileNode(
            name=name or path.name,
            path=node_path,
            type="directory",
            children=children,
            modified_at=datetime.fromtimestamp(stat.st_mtime),
        )

    return FileNode(
        name=name or path.name,
        path=node_path,
        type="file",
        extension=path.suffix.lstrip(".").lower() or None,
        modified_at=datetime.fromtimestamp(stat.st_mtime),
        size=stat.st_size if stat else None,
        url=f"{base_url}/{path.name}",
    )


def _build_library_tree(file_service: FileService) -> FileNode:
    """Construct a file tree rooted at Home with examples and results."""
    root = FileNode(name="Home", path="/", type="directory", children=[])

    # try:
    #     examples_dir = settings.examples_dir
    #     if examples_dir.exists():
    #         examples_node = _build_file_node(
    #             examples_dir, "/examples", "/", name="examples"
    #         )
    #         if examples_node.children:
    #             root.children.append(examples_node)
    # except Exception as e:
    #     logger.warning(f"Failed to build examples tree: {e}")

    try:
        results_dir = file_service.outputs_dir
        if results_dir.exists():
            children = []
            for result_dir in results_dir.iterdir():
                if not result_dir.is_dir():
                    continue
                result_node = _build_file_node(
                    result_dir,
                    f"/outputs/{result_dir.name}",
                    "/results",
                    name=result_dir.name,
                )
                children.append(result_node)

            children.sort(
                key=lambda n: n.modified_at or datetime.min,
                reverse=True,
            )

            results_node = FileNode(
                name="results",
                path="/results",
                type="directory",
                children=children,
            )
            root.children.append(results_node)
    except Exception as e:
        logger.warning(f"Failed to build results tree: {e}")

    return root


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
        result_dir = _get_secure_result_dir(file_service, result_id)

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


@router.get("/library", response_model=FileNode)
async def get_library(
    file_service: FileService = Depends(get_file_service),
) -> FileNode:
    """
    Return a simple file tree with examples and saved results.

    This powers the Library panel in the UI so users can browse available
    example files and generated outputs.
    """
    try:
        tree = _build_library_tree(file_service)
        return tree
    except Exception as e:
        logger.exception(f"Failed to build library tree: {e}")
        raise ProcessingException(
            "Failed to load library",
            details={"error_type": e.__class__.__name__},
        )


@router.post("/results/{result_id}/metadata")
async def save_result_metadata(
    result_id: str,
    metadata: SceneMetadata,
    file_service: FileService = Depends(get_file_service),
) -> Dict[str, str]:
    """
    Persist updated scene/object metadata alongside a segmentation result.

    The payload mirrors the example JSON format (see backend/examples/*.json).
    """
    try:
        result_dir = _get_secure_result_dir(file_service, result_id)
        result_dir.mkdir(parents=True, exist_ok=True)
        metadata_path = result_dir / "metadata.json"
        await write_json_async(metadata_path, metadata.model_dump(), indent=2)

        logger.info(
            f"Saved metadata for result_id={result_id} to {metadata_path.as_posix()}"
        )

        return {
            "status": "ok",
            "path": f"/outputs/{result_id}/metadata.json",
        }
    except NotFoundException:
        raise
    except Exception as e:
        logger.exception(f"Failed to save metadata for result_id={result_id}: {e}")
        raise ProcessingException(
            "Failed to save metadata",
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
