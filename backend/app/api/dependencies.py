from typing import Generator

from loguru import logger

from app.config import settings
from app.models.sam3_model import SAM3Model
from app.services.file_service import FileService
from app.services.segmentation_service import SegmentationService
from app.services.websocket_manager import WebSocketManager

_sam3_model: SAM3Model | None = None
_file_service: FileService | None = None
_segmentation_service: SegmentationService | None = None
_ws_manager: WebSocketManager | None = None


def get_sam3_model() -> SAM3Model:
    """Dependency to get SAM3 model instance."""
    global _sam3_model
    if _sam3_model is None:
        _sam3_model = SAM3Model(
            device=settings.device,
            confidence_threshold=settings.confidence_threshold,
            box_threshold=settings.box_threshold,
            text_threshold=settings.text_threshold,
            iou_threshold=settings.iou_threshold,
        )
    return _sam3_model


def get_file_service() -> FileService:
    """Dependency to get file service instance."""
    global _file_service
    if _file_service is None:
        _file_service = FileService(
            uploads_dir=settings.uploads_dir,
            outputs_dir=settings.outputs_dir,
        )
    return _file_service


def get_segmentation_service() -> SegmentationService:
    """Dependency to get segmentation service instance."""
    global _segmentation_service
    if _segmentation_service is None:
        _segmentation_service = SegmentationService(
            sam3_model=get_sam3_model(),
            file_service=get_file_service(),
        )
    return _segmentation_service


def get_ws_manager() -> WebSocketManager:
    """Dependency to get WebSocket manager singleton instance."""
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WebSocketManager()
    return _ws_manager


async def cleanup_dependencies() -> None:
    """Cleanup all singleton dependencies on shutdown."""
    global _sam3_model, _file_service, _segmentation_service, _ws_manager
    
    logger.info("Cleaning up dependencies...")
    
    if _ws_manager is not None:
        for client_id in list(_ws_manager.active_connections.keys()):
            await _ws_manager.disconnect(client_id)
        logger.info("WebSocket connections closed")
    
    _sam3_model = None
    _file_service = None
    _segmentation_service = None
    _ws_manager = None
    
    logger.info("Dependencies cleanup completed")
