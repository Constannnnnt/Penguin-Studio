import pytest
from unittest.mock import Mock, patch, MagicMock
from PIL import Image
import torch

from app.models.sam3_model import SAM3Model


class TestSAM3Model:
    """Tests for SAM3Model with mocked processor."""

    @pytest.fixture
    def mock_processor(self):
        """Create a mock SAM3 processor."""
        processor = Mock()
        processor.set_image = Mock()
        processor.reset_all_prompts = Mock()
        processor.set_text_prompt = Mock()
        return processor

    @pytest.fixture
    def sam3_model(self):
        """Create a SAM3Model instance."""
        return SAM3Model(
            device="cpu",
            confidence_threshold=0.5,
            box_threshold=0.15,
            text_threshold=0.22,
            iou_threshold=0.45,
        )

    def test_initialization(self, sam3_model):
        """Test SAM3Model initialization."""
        assert sam3_model.device == "cpu"
        assert sam3_model.confidence_threshold == 0.5
        assert sam3_model.box_threshold == 0.15
        assert sam3_model.text_threshold == 0.22
        assert sam3_model.iou_threshold == 0.45
        assert sam3_model.is_loaded is False
        assert sam3_model.processor is None

    def test_get_health_status_before_load(self, sam3_model):
        """Test health status before model is loaded."""
        status = sam3_model.get_health_status()
        assert status["model_loaded"] is False
        assert status["device"] == "cpu"
        assert status["confidence_threshold"] == 0.5
        assert status["load_error"] is None
        assert "cuda_available" in status

    @pytest.mark.asyncio
    async def test_load_success(self, sam3_model, mock_processor):
        """Test successful model loading."""
        with patch.object(
            sam3_model, "_load_sam3_processor", return_value=mock_processor
        ):
            await sam3_model.load()
            assert sam3_model.is_loaded is True
            assert sam3_model.processor is not None
            assert sam3_model._load_error is None

    @pytest.mark.asyncio
    async def test_load_failure(self, sam3_model):
        """Test model loading failure."""
        with patch.object(
            sam3_model,
            "_load_sam3_processor",
            side_effect=RuntimeError("Model not found"),
        ):
            with pytest.raises(RuntimeError) as exc_info:
                await sam3_model.load()
            assert "SAM3 model loading failed" in str(exc_info.value)
            assert sam3_model.is_loaded is False
            assert sam3_model._load_error is not None

    def test_detect_without_loading(self, sam3_model):
        """Test that detect raises error when model is not loaded."""
        image = Image.new("RGB", (640, 480))
        with pytest.raises(RuntimeError) as exc_info:
            sam3_model.detect(image, ["person"])
        assert "SAM3 model is not loaded" in str(exc_info.value)

    def test_detect_without_prompts(self, sam3_model, mock_processor):
        """Test that detect raises error when no prompts provided."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True
        image = Image.new("RGB", (640, 480))

        with pytest.raises(ValueError) as exc_info:
            sam3_model.detect(image, [])
        assert "At least one prompt is required" in str(exc_info.value)

    def test_detect_with_single_prompt(self, sam3_model, mock_processor):
        """Test detection with a single prompt."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True

        image = Image.new("RGB", (640, 480))
        prompt = "person"

        state = {
            "boxes": torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            "scores": torch.tensor([0.95]),
            "masks": torch.ones((1, 1, 480, 640), dtype=torch.bool),
        }

        mock_processor.set_image.return_value = state
        mock_processor.set_text_prompt.return_value = state

        result = sam3_model.detect(image, [prompt])

        assert result.boxes_xyxy.shape[0] == 1
        assert result.scores.shape[0] == 1
        assert len(result.labels) == 1
        assert result.labels[0] == prompt
        assert result.masks.shape[0] == 1

    def test_detect_with_multiple_prompts(self, sam3_model, mock_processor):
        """Test detection with multiple prompts."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True

        image = Image.new("RGB", (640, 480))
        prompts = ["person", "car"]

        state1 = {
            "boxes": torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            "scores": torch.tensor([0.95]),
            "masks": torch.ones((1, 1, 480, 640), dtype=torch.bool),
        }

        state2 = {
            "boxes": torch.tensor([[200.0, 100.0, 400.0, 300.0]]),
            "scores": torch.tensor([0.85]),
            "masks": torch.ones((1, 1, 480, 640), dtype=torch.bool),
        }

        mock_processor.set_image.side_effect = [state1, state2]
        mock_processor.set_text_prompt.side_effect = [state1, state2]

        result = sam3_model.detect(image, prompts)

        assert result.boxes_xyxy.shape[0] == 2
        assert result.scores.shape[0] == 2
        assert len(result.labels) == 2
        assert result.labels[0] == "person"
        assert result.labels[1] == "car"

    def test_detect_with_no_detections(self, sam3_model, mock_processor):
        """Test detection when no objects are found."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True

        image = Image.new("RGB", (640, 480))
        prompt = "unicorn"

        state = {
            "boxes": torch.zeros((0, 4)),
            "scores": torch.zeros((0,)),
            "masks": torch.zeros((0, 1, 480, 640), dtype=torch.bool),
        }

        mock_processor.set_image.return_value = state
        mock_processor.set_text_prompt.return_value = state

        result = sam3_model.detect(image, [prompt])

        assert result.boxes_xyxy.shape[0] == 0
        assert result.scores.shape[0] == 0
        assert len(result.labels) == 0
        assert result.masks.shape[0] == 0

    def test_detect_filters_empty_prompts(self, sam3_model, mock_processor):
        """Test that empty prompts are filtered out."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True

        image = Image.new("RGB", (640, 480))
        prompts = ["person", "  ", "car"]

        state = {
            "boxes": torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            "scores": torch.tensor([0.95]),
            "masks": torch.ones((1, 1, 480, 640), dtype=torch.bool),
        }

        mock_processor.set_image.return_value = state
        mock_processor.set_text_prompt.return_value = state

        result = sam3_model.detect(image, prompts)

        assert mock_processor.set_text_prompt.call_count == 2

    def test_detect_handles_processor_error(self, sam3_model, mock_processor):
        """Test that detection errors are properly handled."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True

        image = Image.new("RGB", (640, 480))
        prompt = "person"

        mock_processor.set_image.side_effect = RuntimeError("GPU out of memory")

        with pytest.raises(RuntimeError) as exc_info:
            sam3_model.detect(image, [prompt])
        assert "SAM3 detection failed" in str(exc_info.value)

    def test_get_health_status_after_load(self, sam3_model, mock_processor):
        """Test health status after successful load."""
        sam3_model.processor = mock_processor
        sam3_model.is_loaded = True

        status = sam3_model.get_health_status()
        assert status["model_loaded"] is True
        assert status["device"] == "cpu"
        assert status["load_error"] is None

    def test_get_health_status_after_load_error(self, sam3_model):
        """Test health status after load error."""
        sam3_model._load_error = "Model file not found"
        sam3_model.is_loaded = False

        status = sam3_model.get_health_status()
        assert status["model_loaded"] is False
        assert status["load_error"] == "Model file not found"
