import asyncio
import base64
import io
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from loguru import logger
from PIL import Image

from app.api.dependencies import get_segmentation_service, get_ws_manager
from app.services.segmentation_service import SegmentationService
from app.services.websocket_manager import WebSocketManager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/segment")
async def websocket_segment(
    websocket: WebSocket,
    ws_manager: WebSocketManager = Depends(get_ws_manager),
    segmentation_service: SegmentationService = Depends(get_segmentation_service),
) -> None:
    """
    WebSocket endpoint for real-time segmentation.
    
    Accepts WebSocket connections and processes segmentation requests with
    real-time progress updates.
    
    Message format from client:
    {
        "action": "segment",
        "image_data": "base64_encoded_image_data",
        "prompts": ["prompt1", "prompt2"],  // optional
        "metadata": {...}  // optional JSON metadata
    }
    
    Message format to client:
    - Connection: {"type": "connected", "data": {...}, "timestamp": "..."}
    - Progress: {"type": "progress", "data": {"progress": 50, "message": "..."}, "timestamp": "..."}
    - Result: {"type": "result", "data": {...}, "timestamp": "..."}
    - Error: {"type": "error", "data": {"error": "..."}, "timestamp": "..."}
    """
    client_id = str(uuid.uuid4())
    
    try:
        await ws_manager.connect(websocket, client_id)
        logger.info(f"WebSocket client connected: client_id={client_id}")
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                action = message.get("action")
                
                if action == "segment":
                    task = asyncio.create_task(
                        _process_websocket_segmentation(
                            client_id=client_id,
                            message=message,
                            ws_manager=ws_manager,
                            segmentation_service=segmentation_service,
                        )
                    )
                    ws_manager.register_task(client_id, task)
                    
                elif action == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "data": {"message": "pong"},
                        "timestamp": None,
                    })
                    
                else:
                    await ws_manager.send_error(
                        client_id,
                        f"Unknown action: {action}. Supported actions: segment, ping",
                    )
                    
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON from client_id={client_id}: {e}")
                await ws_manager.send_error(
                    client_id,
                    f"Invalid JSON message: {str(e)}",
                )
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket client disconnected: client_id={client_id}")
                break
                
            except Exception as e:
                logger.exception(f"Error processing message from client_id={client_id}: {e}")
                await ws_manager.send_error(
                    client_id,
                    f"Error processing message: {str(e)}",
                )
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected during connection: client_id={client_id}")
        
    except Exception as e:
        logger.exception(f"WebSocket error for client_id={client_id}: {e}")
        
    finally:
        await ws_manager.disconnect(client_id)
        logger.info(f"WebSocket cleanup completed for client_id={client_id}")


async def _process_websocket_segmentation(
    client_id: str,
    message: Dict[str, Any],
    ws_manager: WebSocketManager,
    segmentation_service: SegmentationService,
) -> None:
    """
    Process segmentation request from WebSocket message.
    
    Args:
        client_id: Unique client identifier
        message: WebSocket message containing segmentation request
        ws_manager: WebSocket manager for sending updates
        segmentation_service: Service for processing segmentation
    """
    try:
        image_data = message.get("image_data")
        if not image_data:
            await ws_manager.send_error(client_id, "Missing image_data in request")
            return
        
        prompts: Optional[List[str]] = message.get("prompts")
        metadata_dict: Optional[Dict[str, Any]] = message.get("metadata")
        
        logger.info(
            f"Processing WebSocket segmentation: client_id={client_id}, "
            f"has_prompts={prompts is not None}, has_metadata={metadata_dict is not None}"
        )
        
        try:
            if image_data.startswith("data:image"):
                image_data = image_data.split(",", 1)[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
        except Exception as e:
            logger.warning(f"Failed to decode image for client_id={client_id}: {e}")
            await ws_manager.send_error(client_id, f"Invalid image data: {str(e)}")
            return
        
        from fastapi import UploadFile
        from io import BytesIO
        
        image_buffer = BytesIO()
        image.save(image_buffer, format="PNG")
        image_buffer.seek(0)
        
        image_file = UploadFile(
            file=image_buffer,
            filename="websocket_image.png",
        )
        
        metadata_file = None
        if metadata_dict:
            try:
                metadata_json = json.dumps(metadata_dict)
                metadata_buffer = BytesIO(metadata_json.encode("utf-8"))
                metadata_file = UploadFile(
                    file=metadata_buffer,
                    filename="metadata.json",
                )
            except Exception as e:
                logger.warning(f"Failed to process metadata for client_id={client_id}: {e}")
        
        def progress_callback(progress: int, message: str) -> None:
            """Callback to send progress updates via WebSocket."""
            asyncio.create_task(ws_manager.send_progress(client_id, progress, message))
        
        result = await segmentation_service.process_segmentation(
            image_file=image_file,
            metadata_file=metadata_file,
            prompts=prompts,
            progress_callback=progress_callback,
        )
        
        await ws_manager.send_result(client_id, result)
        
        logger.info(
            f"WebSocket segmentation completed: client_id={client_id}, "
            f"result_id={result.result_id}, masks={len(result.masks)}"
        )
        
    except asyncio.CancelledError:
        logger.info(f"Segmentation cancelled for client_id={client_id}")
        await ws_manager.send_error(client_id, "Segmentation cancelled")
        raise
        
    except Exception as e:
        logger.exception(f"WebSocket segmentation failed for client_id={client_id}: {e}")
        await ws_manager.send_error(client_id, f"Segmentation failed: {str(e)}")
