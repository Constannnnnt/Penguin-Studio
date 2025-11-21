import json
from unittest.mock import AsyncMock, Mock, patch

import pytest
import torch
from PIL import Image

from app.detection.types import DetectionResult, PromptTier
from app.models.sam3_model import SAM3Model
from app.services.file_service import FileService
from app.services.prompt_service import PromptPlan, PromptPlanSet
from app.services.segmentation_service import SegmentationService


class DummyPromptPipeline:
    """Lightweight prompt builder for tests (avoids spaCy)."""

    def build_from_prompts(self, prompts):
        plans = []
        for text in prompts:
            text = text.strip()
            if not text:
                continue
            plans.append(
                PromptPlanSet(
                    label=text,
                    plans=[PromptPlan(label=text, tier=PromptTier.CORE, text=text)],
                )
            )
        return plans

    def build_from_objects(self, objects):
        plans = []
        for idx, obj in enumerate(objects):
            label = (
                obj.get("label")
                or obj.get("name")
                or obj.get("description")
                or f"object_{idx}"
            )
            text = obj.get("description") or label
            plans.append(
                PromptPlanSet(
                    label=label,
                    plans=[PromptPlan(label=label, tier=PromptTier.CORE, text=text)],
                )
            )
        return plans


class TestSegmentationService:
    """Tests for SegmentationService workflow with mocks."""

    @pytest.fixture
    def mock_sam3_model(self):
        model = Mock(spec=SAM3Model)
        model.is_loaded = True
        return model

    @pytest.fixture
    def mock_file_service(self, tmp_path):
        service = Mock(spec=FileService)
        service.uploads_dir = tmp_path / "uploads"
        service.outputs_dir = tmp_path / "outputs"
        service.uploads_dir.mkdir()
        service.outputs_dir.mkdir()
        return service

    @pytest.fixture
    def prompt_pipeline(self):
        return DummyPromptPipeline()

    @pytest.fixture
    def segmentation_service(self, mock_sam3_model, mock_file_service, prompt_pipeline):
        return SegmentationService(
            sam3_model=mock_sam3_model,
            file_service=mock_file_service,
            prompt_pipeline=prompt_pipeline,
        )

    @pytest.fixture
    def mock_upload_file(self):
        mock_file = Mock()
        mock_file.filename = "test_image.png"
        mock_file.read = AsyncMock(return_value=b"fake image data")
        return mock_file

    @pytest.fixture
    def mock_detection_result(self):
        return DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.95]),
            labels=["person"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

    @pytest.mark.asyncio
    async def test_process_segmentation_basic_workflow(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        mock_detection_result,
        tmp_path,
    ):
        result_id = "test-123"

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            return_value=f"/outputs/{result_id}/mask_0.png"
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(return_value=mock_detection_result)

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file, metadata_file=None, prompts=["person"]
                )

        assert response.result_id == result_id
        assert len(response.masks) == 1
        assert response.masks[0].label == "person"
        assert abs(response.masks[0].confidence - 0.95) < 0.01
        assert response.processing_time_ms > 0
        mock_sam3_model.detect.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_segmentation_with_metadata(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        mock_detection_result,
        tmp_path,
    ):
        result_id = "test-metadata"

        metadata_content = json.dumps(
            {
                "objects": [
                    {"description": "person walking"},
                    {"description": "red car"},
                ]
            }
        )

        mock_metadata_file = Mock()
        mock_metadata_file.read = AsyncMock(return_value=metadata_content.encode())

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            return_value=f"/outputs/{result_id}/mask_0.png"
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(return_value=mock_detection_result)

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=mock_metadata_file,
                    prompts=None,
                )

        # Two objects => two detection attempts
        assert mock_sam3_model.detect.call_count == 2
        assert len(response.masks) == 2
        captured_prompts = [call.args[1][0] for call in mock_sam3_model.detect.call_args_list]
        assert "person walking" in captured_prompts
        assert "red car" in captured_prompts

    @pytest.mark.asyncio
    async def test_process_segmentation_with_progress_callback(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        mock_detection_result,
        tmp_path,
    ):
        result_id = "test-progress"
        progress_updates = []

        def progress_callback(progress, message):
            progress_updates.append((progress, message))

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            return_value=f"/outputs/{result_id}/mask_0.png"
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(return_value=mock_detection_result)

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=None,
                    prompts=["person"],
                    progress_callback=progress_callback,
                )

        assert progress_updates[0] == (0, "Starting segmentation...")
        assert progress_updates[-1] == (100, "Segmentation complete!")

    @pytest.mark.asyncio
    async def test_process_segmentation_default_prompt(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        mock_detection_result,
        tmp_path,
    ):
        result_id = "test-default"

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            return_value=f"/outputs/{result_id}/mask_0.png"
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(return_value=mock_detection_result)

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                await segmentation_service.process_segmentation(
                    image_file=mock_upload_file, metadata_file=None, prompts=None
                )

        mock_sam3_model.detect.assert_called_once()
        used_prompt = mock_sam3_model.detect.call_args[0][1][0]
        assert used_prompt == "object"

    @pytest.mark.asyncio
    async def test_parse_metadata_valid_json(self, segmentation_service):
        metadata_content = json.dumps({"objects": [{"description": "person"}]})

        mock_file = Mock()
        mock_file.read = AsyncMock(return_value=metadata_content.encode())

        metadata = await segmentation_service._parse_metadata(mock_file)

        assert "objects" in metadata
        assert len(metadata["objects"]) == 1

    @pytest.mark.asyncio
    async def test_parse_metadata_invalid_json(self, segmentation_service):
        mock_file = Mock()
        mock_file.read = AsyncMock(return_value=b"not valid json")

        with pytest.raises(ValueError) as exc_info:
            await segmentation_service._parse_metadata(mock_file)
        assert "Invalid JSON metadata" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_process_segmentation_handles_detection_error(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        result_id = "test-error"

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(
                side_effect=RuntimeError("Detection failed")
            )

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                with pytest.raises(RuntimeError) as exc_info:
                    await segmentation_service.process_segmentation(
                        image_file=mock_upload_file,
                        metadata_file=None,
                        prompts=["person"],
                    )

        assert "Segmentation processing failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_tiered_detection_falls_back_to_next_prompt(
        self, segmentation_service, mock_sam3_model
    ):
        empty_result = DetectionResult(
            boxes_xyxy=torch.zeros((0, 4)),
            scores=torch.zeros((0,)),
            labels=[],
            masks=torch.zeros((0, 1, 10, 10), dtype=torch.bool),
        )
        hit_result = DetectionResult(
            boxes_xyxy=torch.tensor([[1.0, 2.0, 3.0, 4.0]]),
            scores=torch.tensor([0.9]),
            labels=["unused"],
            masks=torch.ones((1, 1, 10, 10), dtype=torch.bool),
        )

        plans = PromptPlanSet(
            label="test-label",
            plans=[
                PromptPlan(label="test-label", tier=PromptTier.CORE, text="first"),
                PromptPlan(label="test-label", tier=PromptTier.CORE_VISUAL, text="second"),
            ],
        )

        segmentation_service.prompt_pipeline = DummyPromptPipeline()

        mock_sam3_model.detect = Mock(side_effect=[empty_result, hit_result])

        image = Mock(spec=Image.Image)
        image.width = 10
        image.height = 10

        result = segmentation_service._run_tiered_detection(image, [plans])

        assert result.boxes_xyxy.shape[0] == 1
        assert result.labels == ["test-label"]
        assert mock_sam3_model.detect.call_count == 2
