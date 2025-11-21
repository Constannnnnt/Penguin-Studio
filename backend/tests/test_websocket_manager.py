import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from app.services.websocket_manager import WebSocketManager
from app.models.schemas import SegmentationResponse, MaskMetadata, BoundingBox


class TestWebSocketManager:
    """Tests for WebSocketManager connection lifecycle."""

    @pytest.fixture
    def ws_manager(self):
        """Create a WebSocketManager instance."""
        return WebSocketManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket."""
        ws = Mock()
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        ws.close = AsyncMock()
        return ws

    def test_initialization(self, ws_manager):
        """Test WebSocketManager initialization."""
        assert isinstance(ws_manager.active_connections, dict)
        assert isinstance(ws_manager.connection_tasks, dict)
        assert len(ws_manager.active_connections) == 0
        assert len(ws_manager.connection_tasks) == 0

    @pytest.mark.asyncio
    async def test_connect_success(self, ws_manager, mock_websocket):
        """Test successful WebSocket connection."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)

        mock_websocket.accept.assert_called_once()
        assert client_id in ws_manager.active_connections
        assert ws_manager.active_connections[client_id] == mock_websocket
        mock_websocket.send_json.assert_called_once()

        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "connected"
        assert call_args["data"]["client_id"] == client_id

    @pytest.mark.asyncio
    async def test_connect_multiple_clients(self, ws_manager):
        """Test connecting multiple clients."""
        ws1 = Mock()
        ws1.accept = AsyncMock()
        ws1.send_json = AsyncMock()

        ws2 = Mock()
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()

        await ws_manager.connect(ws1, "client-1")
        await ws_manager.connect(ws2, "client-2")

        assert len(ws_manager.active_connections) == 2
        assert "client-1" in ws_manager.active_connections
        assert "client-2" in ws_manager.active_connections

    @pytest.mark.asyncio
    async def test_disconnect_success(self, ws_manager, mock_websocket):
        """Test successful WebSocket disconnection."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)
        assert client_id in ws_manager.active_connections

        await ws_manager.disconnect(client_id)

        mock_websocket.close.assert_called_once()
        assert client_id not in ws_manager.active_connections

    @pytest.mark.asyncio
    async def test_disconnect_with_active_task(self, ws_manager, mock_websocket):
        """Test disconnection with active task cancellation."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)

        async def dummy_task():
            await asyncio.sleep(10)

        task = asyncio.create_task(dummy_task())
        ws_manager.connection_tasks[client_id] = task

        await ws_manager.disconnect(client_id)

        assert task.cancelled()
        assert client_id not in ws_manager.connection_tasks
        assert client_id not in ws_manager.active_connections

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_client(self, ws_manager):
        """Test disconnecting a client that doesn't exist."""
        await ws_manager.disconnect("nonexistent-client")

        assert len(ws_manager.active_connections) == 0

    @pytest.mark.asyncio
    async def test_send_progress(self, ws_manager, mock_websocket):
        """Test sending progress update."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)
        mock_websocket.send_json.reset_mock()

        await ws_manager.send_progress(client_id, 50, "Processing...")

        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "progress"
        assert call_args["data"]["progress"] == 50
        assert call_args["data"]["message"] == "Processing..."

    @pytest.mark.asyncio
    async def test_send_progress_to_disconnected_client(
        self, ws_manager, mock_websocket
    ):
        """Test sending progress to disconnected client."""
        client_id = "client-123"

        await ws_manager.send_progress(client_id, 50, "Processing...")

        mock_websocket.send_json.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_result(self, ws_manager, mock_websocket):
        """Test sending segmentation result."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)
        mock_websocket.send_json.reset_mock()

        bbox = BoundingBox(x1=10.0, y1=20.0, x2=100.0, y2=200.0)
        mask = MaskMetadata(
            mask_id="mask_0",
            label="person",
            confidence=0.95,
            bounding_box=bbox,
            area_pixels=5000,
            area_percentage=2.5,
            centroid=(50, 100),
            mask_url="/outputs/test/mask_0.png",
        )
        result = SegmentationResponse(
            result_id="test-123",
            original_image_url="/outputs/test/original.png",
            masks=[mask],
            processing_time_ms=1500.0,
        )

        await ws_manager.send_result(client_id, result)

        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "result"
        assert call_args["data"]["result_id"] == "test-123"
        assert len(call_args["data"]["masks"]) == 1

    @pytest.mark.asyncio
    async def test_send_error(self, ws_manager, mock_websocket):
        """Test sending error message."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)
        mock_websocket.send_json.reset_mock()

        await ws_manager.send_error(client_id, "Processing failed")

        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "error"
        assert call_args["data"]["error"] == "Processing failed"

    @pytest.mark.asyncio
    async def test_send_message_handles_send_error(self, ws_manager, mock_websocket):
        """Test handling of send errors."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)
        mock_websocket.send_json = AsyncMock(side_effect=Exception("Send failed"))

        await ws_manager.send_progress(client_id, 50, "Processing...")

        assert client_id not in ws_manager.active_connections

    def test_register_task(self, ws_manager):
        """Test registering a task for a client."""
        client_id = "client-123"
        mock_task = Mock(spec=asyncio.Task)

        ws_manager.register_task(client_id, mock_task)

        assert client_id in ws_manager.connection_tasks
        assert ws_manager.connection_tasks[client_id] == mock_task

    def test_is_connected(self, ws_manager, mock_websocket):
        """Test checking if client is connected."""
        client_id = "client-123"

        assert not ws_manager.is_connected(client_id)

        ws_manager.active_connections[client_id] = mock_websocket

        assert ws_manager.is_connected(client_id)

    def test_get_connection_count(self, ws_manager, mock_websocket):
        """Test getting connection count."""
        assert ws_manager.get_connection_count() == 0

        ws_manager.active_connections["client-1"] = mock_websocket
        assert ws_manager.get_connection_count() == 1

        ws_manager.active_connections["client-2"] = mock_websocket
        assert ws_manager.get_connection_count() == 2

    @pytest.mark.asyncio
    async def test_multiple_progress_updates(self, ws_manager, mock_websocket):
        """Test sending multiple progress updates."""
        client_id = "client-123"

        await ws_manager.connect(mock_websocket, client_id)
        mock_websocket.send_json.reset_mock()

        await ws_manager.send_progress(client_id, 0, "Starting...")
        await ws_manager.send_progress(client_id, 50, "Processing...")
        await ws_manager.send_progress(client_id, 100, "Complete!")

        assert mock_websocket.send_json.call_count == 3

    @pytest.mark.asyncio
    async def test_connect_handles_accept_error(self, ws_manager):
        """Test handling of WebSocket accept errors."""
        mock_ws = Mock()
        mock_ws.accept = AsyncMock(side_effect=Exception("Accept failed"))

        with pytest.raises(Exception) as exc_info:
            await ws_manager.connect(mock_ws, "client-123")

        assert "Accept failed" in str(exc_info.value)
        assert "client-123" not in ws_manager.active_connections

    @pytest.mark.asyncio
    async def test_disconnect_handles_close_error(self, ws_manager):
        """Test handling of WebSocket close errors."""
        client_id = "client-123"

        mock_ws = Mock()
        mock_ws.accept = AsyncMock()
        mock_ws.send_json = AsyncMock()
        mock_ws.close = AsyncMock(side_effect=Exception("Close failed"))

        await ws_manager.connect(mock_ws, client_id)

        await ws_manager.disconnect(client_id)

        assert client_id not in ws_manager.active_connections
