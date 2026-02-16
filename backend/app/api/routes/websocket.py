import asyncio
import base64
import io
import json
import uuid
from io import BytesIO
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, UploadFile
from loguru import logger
from PIL import Image

from app.api.dependencies import (
    get_segmentation_service,
    get_ws_manager,
    get_orchestrator,
)
from app.models.schemas import FileValidation
from app.services.segmentation_service import SegmentationService
from app.services.websocket_manager import WebSocketManager
from app.agentic.orchestrator import PenguinOrchestrator


router = APIRouter(tags=["websocket"])


@router.websocket("/ws/segment")
async def websocket_segment(
    websocket: WebSocket,
    ws_manager: WebSocketManager = Depends(get_ws_manager),
    segmentation_service: SegmentationService = Depends(get_segmentation_service),
    orchestrator: PenguinOrchestrator = Depends(get_orchestrator),
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
                try:
                    data = await websocket.receive_text()
                except RuntimeError as e:
                    if 'Need to call "accept" first' in str(e):
                        logger.info(
                            f"WebSocket client disconnected abruptly: client_id={client_id}"
                        )
                        break
                    raise
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

                elif action == "agentic":
                    task = asyncio.create_task(
                        _process_websocket_agentic(
                            client_id=client_id,
                            message=message,
                            ws_manager=ws_manager,
                            orchestrator=orchestrator,
                        )
                    )
                    ws_manager.register_task(client_id, task)

                elif action == "ping":
                    await websocket.send_json(
                        {
                            "type": "pong",
                            "data": {"message": "pong"},
                            "timestamp": None,
                        }
                    )

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
                logger.exception(
                    f"Error processing message from client_id={client_id}: {e}"
                )
                await ws_manager.send_error(
                    client_id,
                    f"Error processing message: {str(e)}",
                )

    except WebSocketDisconnect:
        logger.info(
            f"WebSocket client disconnected during connection: client_id={client_id}"
        )

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
            if not FileValidation.validate_file_size(len(image_bytes)):
                await ws_manager.send_error(
                    client_id,
                    "Image file is too large. Maximum size is 10MB.",
                )
                return

            image = Image.open(io.BytesIO(image_bytes))
            image_format = image.format.lower() if image.format else None
            if image_format:
                content_type = f"image/{image_format}"
                if not FileValidation.validate_image_type(
                    content_type, f"websocket.{image_format}"
                ):
                    await ws_manager.send_error(
                        client_id,
                        f"Unsupported image format: {image_format}",
                    )
                    return

        except Exception as e:
            logger.warning(f"Failed to decode image for client_id={client_id}: {e}")
            await ws_manager.send_error(
                client_id,
                f"Invalid image data: {str(e)}",
            )
            return

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
                logger.warning(
                    f"Failed to process metadata for client_id={client_id}: {e}"
                )

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
        logger.exception(
            f"WebSocket segmentation failed for client_id={client_id}: {e}"
        )
        await ws_manager.send_error(client_id, f"Segmentation failed: {str(e)}")


async def _process_websocket_agentic(
    client_id: str,
    message: Dict[str, Any],
    ws_manager: WebSocketManager,
    orchestrator: PenguinOrchestrator,
) -> None:
    """
    Process agentic commands (analyze, execute) via WebSocket.
    """
    raw_sub_action = message.get("sub_action")
    sub_action = (
        str(raw_sub_action).strip().lower()
        if raw_sub_action is not None
        else ""
    )
    sub_action_aliases = {
        "polish-generation": "polish_generation",
        "polishgeneration": "polish_generation",
        "polish_prompt": "polish_generation",
        "rethink_prompt": "polish_generation",
        "rethink_generation": "polish_generation",
        "rethink-prompt": "polish_generation",
    }
    sub_action = sub_action_aliases.get(sub_action, sub_action)
    session_id = message.get("session_id")

    try:
        if sub_action == "analyze":
            query = message.get("query")
            image_context = message.get("image_context")
            if not query:
                await ws_manager.send_error(
                    client_id, "Missing query for agentic analysis"
                )
                return

            await ws_manager.send_progress(client_id, 20, "Analyzing your request...")
            session = await orchestrator.analyze_request(
                query, session_id, image_context
            )

            await ws_manager.send_result(
                client_id,
                {
                    "type": "analysis",
                    "session_id": session.session_id,
                    "intent": session.analysis.intent,
                    "explanation": session.analysis.explanation,
                    "plan": [
                        step.model_dump() for step in (session.analysis.plan or [])
                    ],
                    "generation_draft": (
                        session.analysis.generation_draft.model_dump()
                        if session.analysis.generation_draft
                        else None
                    ),
                },
                event_type="analysis",
            )

        elif sub_action == "execute":
            if not session_id:
                await ws_manager.send_error(
                    client_id, "Missing session_id for agentic execution"
                )
                return

            overrides = message.get("overrides")

            await ws_manager.send_progress(
                client_id, 10, "Starting refinement workflow..."
            )

            # Execute the plan
            session = await orchestrator.approve_and_execute(session_id, overrides)

            if session.status == "failed":
                errors = [
                    res
                    for res in session.execution_results
                    if res["status"] == "failed"
                ]
                await ws_manager.send_error(
                    client_id,
                    f"Agentic execution failed: {errors[0].get('error') if errors else 'Unknown error'}",
                )
                return

            await ws_manager.send_result(
                client_id,
                {
                    "type": "execution_complete",
                    "session_id": session.session_id,
                    "results": session.execution_results,
                },
                event_type="execution_complete",
            )

        elif sub_action == "polish_generation":
            query = message.get("query")
            generation_draft = message.get("generation_draft")
            image_context = message.get("image_context")
            msg_id = message.get("msg_id")
            auto_generate = bool(message.get("auto_generate", False))

            if not isinstance(query, str) or not query.strip():
                await ws_manager.send_error(
                    client_id, "Missing query for generation polishing"
                )
                return
            if not isinstance(generation_draft, dict):
                await ws_manager.send_error(
                    client_id, "Missing generation_draft for generation polishing"
                )
                return

            await ws_manager.send_progress(
                client_id, 30, "Polishing generation prompt..."
            )
            try:
                polished = await orchestrator.polish_generation_draft(
                    query=query,
                    generation_draft=generation_draft,
                    image_context=image_context
                    if isinstance(image_context, dict)
                    else None,
                )

                await ws_manager.send_result(
                    client_id,
                    {
                        "type": "generation_polished",
                        "msg_id": msg_id,
                        "generation_draft": polished,
                        "auto_generate": auto_generate,
                    },
                    event_type="generation_polished",
                )
            except Exception as exc:
                logger.exception(
                    f"Generation polishing failed for client_id={client_id}: {exc}"
                )
                await ws_manager.send_result(
                    client_id,
                    {
                        "type": "generation_polish_failed",
                        "msg_id": msg_id,
                        "auto_generate": auto_generate,
                        "error": str(exc),
                    },
                    event_type="generation_polish_failed",
                )

        else:
            await ws_manager.send_error(
                client_id, f"Unknown agentic sub_action: {sub_action}"
            )

    except Exception as e:
        logger.exception(f"Agentic command failed for client_id={client_id}: {e}")
        await ws_manager.send_error(client_id, f"Agentic processing failed: {str(e)}")
