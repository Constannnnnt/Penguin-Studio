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
    async def test_parse_metadata_empty_content(self, segmentation_service):
        mock_file = Mock()
        mock_file.read = AsyncMock(return_value=b"   ")

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
    async def test_process_segmentation_propagates_metadata_error(
        self,
        segmentation_service,
        mock_upload_file,
        mock_file_service,
        tmp_path,
    ):
        result_id = "metadata-error"

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )

        metadata_file = Mock()
        metadata_file.read = AsyncMock(return_value=b"")

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_image.convert = Mock(return_value=mock_image)
            mock_open.return_value = mock_image

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                with pytest.raises(ValueError) as exc_info:
                    await segmentation_service.process_segmentation(
                        image_file=mock_upload_file,
                        metadata_file=metadata_file,
                        prompts=None,
                    )

        assert "Invalid JSON metadata" in str(exc_info.value)

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

        result, prompt_info = segmentation_service._run_tiered_detection(image, [plans])

        assert result.boxes_xyxy.shape[0] == 1
        assert result.labels == ["test-label"]
        assert mock_sam3_model.detect.call_count == 2
        assert len(prompt_info) == 1
        assert prompt_info[0]["tier"] == PromptTier.CORE_VISUAL.value
        assert prompt_info[0]["text"] == "second"

    @pytest.mark.asyncio
    async def test_tiered_detection_uses_relaxed_threshold_for_particle_objects(
        self, segmentation_service, mock_sam3_model
    ):
        low_conf_particle = DetectionResult(
            boxes_xyxy=torch.tensor([[1.0, 2.0, 3.0, 4.0]]),
            scores=torch.tensor([0.25]),  # below 0.4 global threshold
            labels=["unused"],
            masks=torch.ones((1, 1, 10, 10), dtype=torch.bool),
        )

        plans = PromptPlanSet(
            label="snowflakes",
            plans=[
                PromptPlan(
                    label="snowflakes",
                    tier=PromptTier.CORE,
                    text="snowflakes",
                ),
            ],
        )

        mock_sam3_model.detect = Mock(return_value=low_conf_particle)

        image = Mock(spec=Image.Image)
        image.width = 10
        image.height = 10

        result, prompt_info = segmentation_service._run_tiered_detection(image, [plans])

        assert result.boxes_xyxy.shape[0] == 1
        assert result.labels == ["snowflakes"]
        assert len(prompt_info) == 1
        assert prompt_info[0]["tier"] == PromptTier.CORE.value

    @pytest.mark.asyncio
    async def test_tiered_detection_keeps_default_threshold_for_non_particle_objects(
        self, segmentation_service, mock_sam3_model
    ):
        low_conf_non_particle = DetectionResult(
            boxes_xyxy=torch.tensor([[1.0, 2.0, 3.0, 4.0]]),
            scores=torch.tensor([0.25]),  # below default threshold
            labels=["unused"],
            masks=torch.ones((1, 1, 10, 10), dtype=torch.bool),
        )

        plans = PromptPlanSet(
            label="car",
            plans=[
                PromptPlan(
                    label="car",
                    tier=PromptTier.CORE,
                    text="car",
                ),
            ],
        )

        mock_sam3_model.detect = Mock(return_value=low_conf_non_particle)

        image = Mock(spec=Image.Image)
        image.width = 10
        image.height = 10

        result, prompt_info = segmentation_service._run_tiered_detection(image, [plans])

        assert result.boxes_xyxy.shape[0] == 0
        assert result.labels == []
        assert prompt_info == []

    def test_deduplicate_detection_result_merges_overlapping_masks(self, segmentation_service):
        overlapping_masks = torch.zeros((2, 1, 16, 16), dtype=torch.bool)
        overlapping_masks[0, 0, 2:10, 2:10] = True
        overlapping_masks[1, 0, 3:11, 3:11] = True

        detection = DetectionResult(
            boxes_xyxy=torch.tensor(
                [[2.0, 2.0, 9.0, 9.0], [3.0, 3.0, 10.0, 10.0]], dtype=torch.float32
            ),
            scores=torch.tensor([0.92, 0.88], dtype=torch.float32),
            labels=["person", "person"],
            masks=overlapping_masks,
        )
        prompt_info = [
            {"object_id": "object_0", "text": "person"},
            {"object_id": "object_0", "text": "person"},
        ]

        deduped, deduped_info = segmentation_service._deduplicate_detection_result(
            detection, prompt_info
        )

        assert deduped.boxes_xyxy.shape[0] == 1
        assert deduped.masks.shape[0] == 1
        assert len(deduped_info) == 1

    @pytest.mark.asyncio
    async def test_response_includes_prompt_tier_and_text(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        """Test that response includes prompt_tier and prompt_text for each mask."""
        result_id = "test-prompt-tier"

        detection_result_person = DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.95]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )
        
        detection_result_car = DetectionResult(
            boxes_xyxy=torch.tensor([[150.0, 50.0, 250.0, 150.0]]),
            scores=torch.tensor([0.88]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            side_effect=[
                f"/outputs/{result_id}/mask_0.png",
                f"/outputs/{result_id}/mask_1.png",
            ]
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(side_effect=[detection_result_person, detection_result_car])

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=None,
                    prompts=["person", "car"],
                )

        assert len(response.masks) == 2
        
        assert response.masks[0].prompt_tier == "CORE"
        assert response.masks[0].prompt_text == "person"
        assert response.masks[0].label == "person"
        
        assert response.masks[1].prompt_tier == "CORE"
        assert response.masks[1].prompt_text == "car"
        assert response.masks[1].label == "car"

    @pytest.mark.asyncio
    async def test_response_includes_different_prompt_tiers(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        """Test that different prompt tiers are correctly tracked in response."""
        result_id = "test-multi-tier"

        detection_result_core = DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.95]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )
        
        detection_result_visual = DetectionResult(
            boxes_xyxy=torch.tensor([[150.0, 50.0, 250.0, 150.0]]),
            scores=torch.tensor([0.88]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            side_effect=[
                f"/outputs/{result_id}/mask_0.png",
                f"/outputs/{result_id}/mask_1.png",
            ]
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            empty_result = DetectionResult(
                boxes_xyxy=torch.zeros((0, 4)),
                scores=torch.zeros((0,)),
                labels=[],
                masks=torch.zeros((0, 1, 480, 640), dtype=torch.bool),
            )
            
            mock_sam3_model.detect = Mock(
                side_effect=[
                    detection_result_core,
                    empty_result,
                    detection_result_visual,
                ]
            )

            plans = [
                PromptPlanSet(
                    label="person",
                    plans=[
                        PromptPlan(label="person", tier=PromptTier.CORE, text="person"),
                    ],
                ),
                PromptPlanSet(
                    label="car",
                    plans=[
                        PromptPlan(label="car", tier=PromptTier.CORE, text="car"),
                        PromptPlan(label="car", tier=PromptTier.CORE_VISUAL, text="red car with wheels"),
                    ],
                ),
            ]

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                with patch.object(
                    segmentation_service.prompt_pipeline,
                    "build_from_prompts",
                    return_value=plans,
                ):
                    response = await segmentation_service.process_segmentation(
                        image_file=mock_upload_file,
                        metadata_file=None,
                        prompts=["person", "car"],
                    )

        assert len(response.masks) == 2
        
        assert response.masks[0].prompt_tier == "CORE"
        assert response.masks[0].prompt_text == "person"
        assert response.masks[0].label == "person"
        
        assert response.masks[1].prompt_tier == "CORE_VISUAL"
        assert response.masks[1].prompt_text == "red car with wheels"
        assert response.masks[1].label == "car"

    @pytest.mark.asyncio
    async def test_object_metadata_included_in_response(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        """Test that object metadata from JSON is included in mask response."""
        result_id = "test-object-metadata"

        metadata_content = json.dumps(
            {
                "objects": [
                    {
                        "description": "A luxurious ring with a thick, golden chain-link band",
                        "location": "center",
                        "relationship": "The band holds the red gemstone securely",
                        "relative_size": "large within frame",
                        "shape_and_color": "Curved, interlocking golden links",
                        "texture": "smooth, metallic",
                        "appearance_details": "The links are uniform in size and have a high-shine finish",
                        "orientation": "circular, with the gemstone facing upwards",
                    },
                    {
                        "description": "A vibrant, translucent red gemstone, cut into a teardrop shape",
                        "location": "top-center of the ring",
                        "relationship": "It is the focal point of the ring",
                        "relative_size": "medium within the ring",
                        "shape_and_color": "Teardrop-shaped, deep red",
                        "texture": "smooth, glassy",
                        "appearance_details": "The gemstone has multiple facets",
                        "orientation": "vertical, with the pointed end facing downwards",
                    },
                ]
            }
        )

        mock_metadata_file = Mock()
        mock_metadata_file.read = AsyncMock(return_value=metadata_content.encode())

        detection_result_ring = DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.95]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )
        
        detection_result_gemstone = DetectionResult(
            boxes_xyxy=torch.tensor([[150.0, 50.0, 250.0, 150.0]]),
            scores=torch.tensor([0.88]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            side_effect=[
                f"/outputs/{result_id}/mask_0.png",
                f"/outputs/{result_id}/mask_1.png",
            ]
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(side_effect=[detection_result_ring, detection_result_gemstone])

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=mock_metadata_file,
                    prompts=None,
                )

        assert len(response.masks) == 2
        
        assert response.masks[0].object_metadata is not None
        assert "ring" in response.masks[0].object_metadata.description.lower()
        assert response.masks[0].object_metadata.location == "center"
        assert response.masks[0].object_metadata.shape_and_color == "Curved, interlocking golden links"
        
        assert response.masks[1].object_metadata is not None
        assert "gemstone" in response.masks[1].object_metadata.description.lower()
        assert response.masks[1].object_metadata.location == "top-center of the ring"
        assert response.masks[1].object_metadata.shape_and_color == "Teardrop-shaped, deep red"

    @pytest.mark.asyncio
    async def test_object_metadata_matches_by_description(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        """Test that object metadata is matched by description similarity, not just index."""
        result_id = "test-metadata-matching"

        metadata_content = json.dumps(
            {
                "objects": [
                    {
                        "description": "A red sports car with sleek design",
                        "location": "left side",
                        "relationship": "parked next to building",
                        "relative_size": "large",
                        "shape_and_color": "red, aerodynamic",
                        "texture": "glossy paint",
                        "appearance_details": "modern sports car",
                        "orientation": "facing right",
                    },
                    {
                        "description": "A person walking on the sidewalk",
                        "location": "right side",
                        "relationship": "walking past the car",
                        "relative_size": "medium",
                        "shape_and_color": "human figure",
                        "texture": "fabric clothing",
                        "appearance_details": "casual attire",
                        "orientation": "standing upright",
                    },
                ]
            }
        )

        mock_metadata_file = Mock()
        mock_metadata_file.read = AsyncMock(return_value=metadata_content.encode())

        detection_result_person = DetectionResult(
            boxes_xyxy=torch.tensor([[150.0, 50.0, 250.0, 150.0]]),
            scores=torch.tensor([0.92]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )
        
        detection_result_car = DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.88]),
            labels=["unused"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

        mock_file_service.save_upload = AsyncMock(
            return_value=tmp_path / "uploads" / result_id / "original.png"
        )
        mock_file_service.save_mask = AsyncMock(
            side_effect=[
                f"/outputs/{result_id}/mask_0.png",
                f"/outputs/{result_id}/mask_1.png",
            ]
        )

        with patch("app.services.segmentation_service.Image.open") as mock_open:
            mock_image = Mock(spec=Image.Image)
            mock_image.width = 640
            mock_image.height = 480
            mock_image.save = Mock()
            mock_open.return_value = mock_image

            mock_sam3_model.detect = Mock(side_effect=[detection_result_person, detection_result_car])

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=mock_metadata_file,
                    prompts=None,
                )

        assert len(response.masks) == 2
        
        assert response.masks[0].object_metadata is not None
        assert "car" in response.masks[0].object_metadata.description.lower()
        assert response.masks[0].object_metadata.location == "left side"
        
        assert response.masks[1].object_metadata is not None
        assert "person" in response.masks[1].object_metadata.description.lower()
        assert response.masks[1].object_metadata.location == "right side"

    @pytest.mark.asyncio
    async def test_object_metadata_handles_missing_fields(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        """Test that missing metadata fields are handled gracefully."""
        result_id = "test-missing-fields"

        metadata_content = json.dumps(
            {
                "objects": [
                    {
                        "description": "A simple object",
                        "location": "center",
                        "relative_size": "medium",
                        "shape_and_color": "blue rectangle",
                        "orientation": "horizontal",
                    }
                ]
            }
        )

        mock_metadata_file = Mock()
        mock_metadata_file.read = AsyncMock(return_value=metadata_content.encode())

        detection_result = DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.95]),
            labels=["object"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

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

            mock_sam3_model.detect = Mock(return_value=detection_result)

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=mock_metadata_file,
                    prompts=None,
                )

        assert len(response.masks) == 1
        assert response.masks[0].object_metadata is not None
        assert response.masks[0].object_metadata.description == "A simple object"
        assert response.masks[0].object_metadata.relationship == ""
        assert response.masks[0].object_metadata.texture == ""
        assert response.masks[0].object_metadata.appearance_details == ""

    @pytest.mark.asyncio
    async def test_object_metadata_none_when_no_metadata_file(
        self,
        segmentation_service,
        mock_upload_file,
        mock_sam3_model,
        mock_file_service,
        tmp_path,
    ):
        """Test that object_metadata is None when no metadata file is provided."""
        result_id = "test-no-metadata"

        detection_result = DetectionResult(
            boxes_xyxy=torch.tensor([[10.0, 20.0, 100.0, 200.0]]),
            scores=torch.tensor([0.95]),
            labels=["person"],
            masks=torch.ones((1, 1, 480, 640), dtype=torch.bool),
        )

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

            mock_sam3_model.detect = Mock(return_value=detection_result)

            with patch(
                "app.services.file_service.FileService.generate_result_id",
                return_value=result_id,
            ):
                response = await segmentation_service.process_segmentation(
                    image_file=mock_upload_file,
                    metadata_file=None,
                    prompts=["person"],
                )

        assert len(response.masks) == 1
        assert response.masks[0].object_metadata is None
