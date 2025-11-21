import pytest
from datetime import datetime
from pydantic import ValidationError

from app.models.schemas import (
    BoundingBox,
    MaskMetadata,
    SegmentationResponse,
    WebSocketMessage,
    ErrorResponse,
    SegmentationRequest,
    FileValidation,
)


class TestBoundingBox:
    """Tests for BoundingBox schema validation."""

    def test_valid_bounding_box(self):
        """Test creating a valid bounding box."""
        bbox = BoundingBox(x1=10.0, y1=20.0, x2=100.0, y2=200.0)
        assert bbox.x1 == 10.0
        assert bbox.y1 == 20.0
        assert bbox.x2 == 100.0
        assert bbox.y2 == 200.0

    def test_negative_coordinates_rejected(self):
        """Test that negative coordinates are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            BoundingBox(x1=-10.0, y1=20.0, x2=100.0, y2=200.0)
        assert "Coordinates must be non-negative" in str(exc_info.value)

    def test_zero_coordinates_allowed(self):
        """Test that zero coordinates are allowed."""
        bbox = BoundingBox(x1=0.0, y1=0.0, x2=100.0, y2=200.0)
        assert bbox.x1 == 0.0
        assert bbox.y1 == 0.0


class TestMaskMetadata:
    """Tests for MaskMetadata schema validation."""

    def test_valid_mask_metadata(self):
        """Test creating valid mask metadata."""
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
        assert mask.mask_id == "mask_0"
        assert mask.label == "person"
        assert mask.confidence == 0.95
        assert mask.area_pixels == 5000

    def test_confidence_out_of_range(self):
        """Test that confidence outside [0, 1] is rejected."""
        bbox = BoundingBox(x1=10.0, y1=20.0, x2=100.0, y2=200.0)
        with pytest.raises(ValidationError):
            MaskMetadata(
                mask_id="mask_0",
                label="person",
                confidence=1.5,
                bounding_box=bbox,
                area_pixels=5000,
                area_percentage=2.5,
                centroid=(50, 100),
                mask_url="/outputs/test/mask_0.png",
            )

    def test_negative_area_rejected(self):
        """Test that negative area is rejected."""
        bbox = BoundingBox(x1=10.0, y1=20.0, x2=100.0, y2=200.0)
        with pytest.raises(ValidationError):
            MaskMetadata(
                mask_id="mask_0",
                label="person",
                confidence=0.95,
                bounding_box=bbox,
                area_pixels=-100,
                area_percentage=2.5,
                centroid=(50, 100),
                mask_url="/outputs/test/mask_0.png",
            )


class TestSegmentationResponse:
    """Tests for SegmentationResponse schema validation."""

    def test_valid_segmentation_response(self):
        """Test creating a valid segmentation response."""
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
        response = SegmentationResponse(
            result_id="test-123",
            original_image_url="/outputs/test/original.png",
            masks=[mask],
            processing_time_ms=1500.0,
        )
        assert response.result_id == "test-123"
        assert len(response.masks) == 1
        assert response.processing_time_ms == 1500.0
        assert isinstance(response.timestamp, datetime)

    def test_empty_masks_list(self):
        """Test response with no masks."""
        response = SegmentationResponse(
            result_id="test-123",
            original_image_url="/outputs/test/original.png",
            masks=[],
            processing_time_ms=1500.0,
        )
        assert len(response.masks) == 0

    def test_negative_processing_time_rejected(self):
        """Test that negative processing time is rejected."""
        with pytest.raises(ValidationError):
            SegmentationResponse(
                result_id="test-123",
                original_image_url="/outputs/test/original.png",
                masks=[],
                processing_time_ms=-100.0,
            )


class TestWebSocketMessage:
    """Tests for WebSocketMessage schema validation."""

    def test_valid_progress_message(self):
        """Test creating a valid progress message."""
        msg = WebSocketMessage(
            type="progress", data={"progress": 50, "message": "Processing..."}
        )
        assert msg.type == "progress"
        assert msg.data["progress"] == 50
        assert isinstance(msg.timestamp, datetime)

    def test_valid_result_message(self):
        """Test creating a valid result message."""
        msg = WebSocketMessage(type="result", data={"result_id": "test-123"})
        assert msg.type == "result"
        assert msg.data["result_id"] == "test-123"

    def test_valid_error_message(self):
        """Test creating a valid error message."""
        msg = WebSocketMessage(type="error", data={"error": "Processing failed"})
        assert msg.type == "error"
        assert msg.data["error"] == "Processing failed"

    def test_invalid_message_type(self):
        """Test that invalid message type is rejected."""
        with pytest.raises(ValidationError):
            WebSocketMessage(type="invalid", data={})


class TestErrorResponse:
    """Tests for ErrorResponse schema validation."""

    def test_valid_error_response(self):
        """Test creating a valid error response."""
        error = ErrorResponse(
            error="ValidationError",
            detail="Invalid input",
            request_id="req-123",
        )
        assert error.error == "ValidationError"
        assert error.detail == "Invalid input"
        assert error.request_id == "req-123"
        assert isinstance(error.timestamp, datetime)

    def test_error_response_with_details(self):
        """Test error response with additional details."""
        error = ErrorResponse(
            error="ValidationError",
            detail="Invalid input",
            request_id="req-123",
            details={"field": "image", "reason": "File too large"},
        )
        assert error.details["field"] == "image"
        assert error.details["reason"] == "File too large"


class TestSegmentationRequest:
    """Tests for SegmentationRequest schema validation."""

    def test_valid_request_with_prompts(self):
        """Test creating a valid request with prompts."""
        request = SegmentationRequest(prompts=["person", "car", "building"])
        assert len(request.prompts) == 3
        assert request.prompts[0] == "person"

    def test_request_without_prompts(self):
        """Test creating a request without prompts."""
        request = SegmentationRequest(prompts=None)
        assert request.prompts is None

    def test_empty_prompts_list_rejected(self):
        """Test that empty prompts list is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            SegmentationRequest(prompts=[])
        assert "Prompts list cannot be empty" in str(exc_info.value)

    def test_empty_string_prompts_rejected(self):
        """Test that empty string prompts are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            SegmentationRequest(prompts=["person", "  ", "car"])
        assert "Prompts cannot be empty strings" in str(exc_info.value)


class TestFileValidation:
    """Tests for FileValidation utility methods."""

    def test_validate_valid_image_types(self):
        """Test validation of valid image types."""
        assert FileValidation.validate_image_type("image/png", "test.png")
        assert FileValidation.validate_image_type("image/jpeg", "test.jpg")
        assert FileValidation.validate_image_type("image/jpg", "test.jpeg")

    def test_validate_invalid_image_types(self):
        """Test rejection of invalid image types."""
        assert not FileValidation.validate_image_type("image/gif", "test.gif")
        assert not FileValidation.validate_image_type("image/bmp", "test.bmp")
        assert not FileValidation.validate_image_type("text/plain", "test.txt")

    def test_validate_mismatched_extension(self):
        """Test that validation allows valid extensions regardless of content type mismatch."""
        assert FileValidation.validate_image_type("image/png", "test.jpg")

    def test_validate_file_size_within_limits(self):
        """Test validation of file size within limits."""
        assert FileValidation.validate_file_size(1024)
        assert FileValidation.validate_file_size(5 * 1024 * 1024)
        assert FileValidation.validate_file_size(10 * 1024 * 1024)

    def test_validate_file_size_exceeds_limit(self):
        """Test rejection of file size exceeding limit."""
        assert not FileValidation.validate_file_size(11 * 1024 * 1024)
        assert not FileValidation.validate_file_size(20 * 1024 * 1024)

    def test_validate_zero_file_size(self):
        """Test rejection of zero file size."""
        assert not FileValidation.validate_file_size(0)

    def test_validate_negative_file_size(self):
        """Test rejection of negative file size."""
        assert not FileValidation.validate_file_size(-100)
