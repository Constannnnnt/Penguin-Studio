import asyncio
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from loguru import logger

from app.models.schemas import WebSocketMessage


class WebSocketManager:
    """Manages WebSocket connections and message broadcasting."""

    def __init__(self) -> None:
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_tasks: Dict[str, asyncio.Task] = {}
        logger.info("WebSocketManager initialized")

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept and register WebSocket connection."""
        try:
            await websocket.accept()
            self.active_connections[client_id] = websocket

            await self._send_message(
                client_id,
                WebSocketMessage(
                    type="connected",
                    data={"client_id": client_id, "message": "Connected successfully"},
                    timestamp=datetime.utcnow(),
                ),
            )

            logger.info(
                f"WebSocket connected: client_id={client_id}, "
                f"total_connections={len(self.active_connections)}"
            )

        except Exception as e:
            logger.exception(
                f"Failed to connect WebSocket for client_id={client_id}: {e}"
            )
            raise

    async def disconnect(self, client_id: str) -> None:
        """Remove WebSocket connection and cancel tasks."""
        try:
            if client_id in self.connection_tasks:
                task = self.connection_tasks[client_id]
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        logger.debug(f"Task cancelled for client_id={client_id}")
                del self.connection_tasks[client_id]

            if client_id in self.active_connections:
                websocket = self.active_connections[client_id]
                try:
                    await websocket.close()
                except Exception as e:
                    logger.warning(
                        f"Error closing WebSocket for client_id={client_id}: {e}"
                    )
                del self.active_connections[client_id]

            logger.info(
                f"WebSocket disconnected: client_id={client_id}, "
                f"remaining_connections={len(self.active_connections)}"
            )

        except Exception as e:
            logger.exception(f"Error during disconnect for client_id={client_id}: {e}")

    async def send_progress(self, client_id: str, progress: int, message: str) -> None:
        """Send progress update to client."""
        try:
            ws_message = WebSocketMessage(
                type="progress",
                data={"progress": progress, "message": message},
                timestamp=datetime.utcnow(),
            )
            await self._send_message(client_id, ws_message)
            logger.debug(f"Sent progress to client_id={client_id}: {progress}%")

        except Exception as e:
            logger.warning(f"Failed to send progress to client_id={client_id}: {e}")

    async def send_result(
        self, client_id: str, result: Any, event_type: str = "result"
    ) -> None:
        """Send segmentation result to client."""
        try:
            payload = jsonable_encoder(result)
            ws_message = WebSocketMessage(
                type=event_type,
                data=payload,
                timestamp=datetime.utcnow(),
            )
            await self._send_message(client_id, ws_message)
            result_id = (
                payload.get("result_id") if isinstance(payload, dict) else None
            )
            if result_id:
                logger.info(
                    f"Sent result to client_id={client_id}, result_id={result_id}"
                )
            else:
                logger.info(
                    f"Sent {event_type} to client_id={client_id}"
                )

        except Exception as e:
            logger.exception(f"Failed to send result to client_id={client_id}: {e}")

    async def send_error(self, client_id: str, error: str) -> None:
        """Send error message to client."""
        try:
            ws_message = WebSocketMessage(
                type="error",
                data={"error": error},
                timestamp=datetime.utcnow(),
            )
            await self._send_message(client_id, ws_message)
            logger.warning(f"Sent error to client_id={client_id}: {error}")

        except Exception as e:
            logger.exception(
                f"Failed to send error message to client_id={client_id}: {e}"
            )

    async def _send_message(self, client_id: str, message: WebSocketMessage) -> None:
        """Internal method to send message to specific client."""
        if client_id not in self.active_connections:
            logger.warning(f"Cannot send message: client_id={client_id} not connected")
            return

        websocket = self.active_connections[client_id]

        try:
            await websocket.send_json(jsonable_encoder(message))
        except Exception as e:
            logger.exception(f"Failed to send message to client_id={client_id}: {e}")
            await self.disconnect(client_id)

    def register_task(self, client_id: str, task: asyncio.Task) -> None:
        """Register a task associated with a client connection."""
        self.connection_tasks[client_id] = task
        logger.debug(f"Registered task for client_id={client_id}")

    def is_connected(self, client_id: str) -> bool:
        """Check if a client is currently connected."""
        return client_id in self.active_connections

    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)
