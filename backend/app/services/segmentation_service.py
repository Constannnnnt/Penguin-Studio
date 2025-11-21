import asyncio
import json
import time
from typing import Any, Callable, Dict, List, Optional

import torch
from fastapi import UploadFile
from loguru import logger
from PIL import Image

from app.config import settings
from app.detection.types import DetectionResult
from app.models.sam3_model import SAM3Model
from app.models.schemas import (
    BoundingBox,
    MaskMetadata,
    SegmentationResponse,
)
from app.services.file_service import FileService
from app.services.prompt_service import PromptPipeline, PromptPlanSet


class SegmentationService:
    """Orchestrates segmentation workflow."""

    def __init__(
        self,
        sam3_model: SAM3Model,
        file_service: FileService,
        prompt_pipeline: PromptPipeline | None = None,
    ) -> None:
        self.sam3_model = sam3_model
        self.file_service = file_service
        self.prompt_pipeline = prompt_pipeline or PromptPipeline()

    async def process_segmentation(
        self,
        image_file: UploadFile,
        metadata_file: Optional[UploadFile] = None,
        prompts: Optional[List[str]] = None,
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> SegmentationResponse:
        """
        Main segmentation workflow.
        
        Steps:
        1. Save uploaded image
        2. Parse metadata and extract prompts
        3. Run SAM3 detection
        4. Generate and save mask images
        5. Create response with URLs
        """
        start_time = time.time()
        result_id = FileService.generate_result_id()

        try:
            if progress_callback:
                progress_callback(0, "Starting segmentation...")

            if progress_callback:
                progress_callback(10, "Saving uploaded image...")
            image_path = await self.file_service.save_upload(image_file, result_id)

            loop = asyncio.get_event_loop()
            image = await loop.run_in_executor(
                None, lambda: Image.open(image_path).convert("RGB")
            )

            if progress_callback:
                progress_callback(20, "Extracting prompts...")
            prompt_sets = await self._build_prompt_sets(metadata_file, prompts)
            if not prompt_sets:
                prompt_sets = self.prompt_pipeline.build_from_prompts(["object"])

            logger.info(
                f"Processing segmentation for result_id={result_id} "
                f"with {sum(len(s.plans) for s in prompt_sets)} prompt candidates "
                f"across {len(prompt_sets)} objects"
            )

            if progress_callback:
                progress_callback(30, "Running SAM3 detection...")
            detection_result = await loop.run_in_executor(
                None, self._run_tiered_detection, image, prompt_sets
            )
            img_width, img_height = self._get_image_dims(image)
            if detection_result.masks.numel() > 0 and detection_result.masks.dim() >= 4:
                # Prefer mask-derived dims to avoid Mock width/height in tests.
                img_height = detection_result.masks.shape[-2]
                img_width = detection_result.masks.shape[-1]

            if progress_callback:
                progress_callback(60, "Generating mask images...")
            mask_urls = await self._generate_mask_images(
                detection_result, image, result_id
            )

            if progress_callback:
                progress_callback(80, "Calculating mask metadata...")
            original_image_path = self.file_service.outputs_dir / result_id / "original.png"
            original_image_path.parent.mkdir(parents=True, exist_ok=True)
            await loop.run_in_executor(None, image.save, original_image_path)

            masks_metadata = self._calculate_mask_metadata(
                detection_result, mask_urls, img_width, img_height
            )

            processing_time_ms = (time.time() - start_time) * 1000

            if progress_callback:
                progress_callback(100, "Segmentation complete!")

            response = SegmentationResponse(
                result_id=result_id,
                original_image_url=f"/outputs/{result_id}/original.png",
                masks=masks_metadata,
                processing_time_ms=processing_time_ms,
            )

            logger.info(
                f"Segmentation completed for result_id={result_id} "
                f"in {processing_time_ms:.2f}ms with {len(masks_metadata)} masks"
            )

            return response

        except Exception as e:
            logger.exception(f"Segmentation failed for result_id={result_id}: {e}")
            raise RuntimeError(f"Segmentation processing failed: {e}") from e

    async def _build_prompt_sets(
        self, metadata_file: Optional[UploadFile], prompts: Optional[List[str]]
    ) -> List[PromptPlanSet]:
        """Prepare tiered prompt plan sets from free-form prompts and metadata."""
        prompt_sets: List[PromptPlanSet] = []

        if prompts:
            prompt_sets.extend(self.prompt_pipeline.build_from_prompts(prompts))

        if metadata_file:
            metadata = await self._parse_metadata(metadata_file)
            objects = metadata.get("objects") if isinstance(metadata, dict) else None
            if isinstance(objects, list):
                prompt_sets.extend(self.prompt_pipeline.build_from_objects(objects))

        return prompt_sets

    async def _parse_metadata(self, metadata_file: UploadFile) -> Dict[str, Any]:
        """Parse JSON metadata file."""
        try:
            content = await metadata_file.read()
            metadata = json.loads(content)
            return metadata
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse metadata JSON: {e}")
            raise ValueError(f"Invalid JSON metadata: {e}") from e
        except Exception as e:
            logger.exception(f"Failed to read metadata file: {e}")
            raise RuntimeError(f"Failed to read metadata: {e}") from e

    async def _generate_mask_images(
        self, detection_result: DetectionResult, original_image: Image.Image, result_id: str
    ) -> List[str]:
        """Convert mask tensors to PNG files and return URLs."""
        mask_urls = []

        try:
            num_masks = detection_result.masks.shape[0]

            for i in range(num_masks):
                mask_tensor = detection_result.masks[i]
                mask_url = await self.file_service.save_mask(
                    mask_tensor, result_id, i
                )
                mask_urls.append(mask_url)

            logger.debug(f"Generated {len(mask_urls)} mask images for result_id={result_id}")
            return mask_urls

        except Exception as e:
            logger.exception(f"Failed to generate mask images: {e}")
            raise RuntimeError(f"Failed to generate mask images: {e}") from e

    def _calculate_mask_metadata(
        self,
        detection_result: DetectionResult,
        mask_urls: List[str],
        image_width: int,
        image_height: int,
    ) -> List[MaskMetadata]:
        """Calculate centroids, areas, and other mask metadata."""
        masks_metadata = []

        try:
            total_pixels = max(int(image_width) * int(image_height), 1)

            for i in range(len(mask_urls)):
                box = detection_result.boxes_xyxy[i]
                score = detection_result.scores[i]
                label = detection_result.labels[i]
                mask = detection_result.masks[i]

                if mask.dim() == 4:
                    mask = mask.squeeze(0).squeeze(0)
                elif mask.dim() == 3:
                    mask = mask.squeeze(0)

                mask_np = mask.cpu().numpy()
                area_pixels = int(mask_np.sum())

                y_coords, x_coords = mask_np.nonzero()
                if len(y_coords) > 0 and len(x_coords) > 0:
                    centroid_x = int(x_coords.mean())
                    centroid_y = int(y_coords.mean())
                else:
                    centroid_x = int((box[0].item() + box[2].item()) / 2)
                    centroid_y = int((box[1].item() + box[3].item()) / 2)

                area_percentage = (area_pixels / total_pixels) * 100

                mask_metadata = MaskMetadata(
                    mask_id=f"mask_{i}",
                    label=label,
                    confidence=float(score.item()),
                    bounding_box=BoundingBox(
                        x1=float(box[0].item()),
                        y1=float(box[1].item()),
                        x2=float(box[2].item()),
                        y2=float(box[3].item()),
                    ),
                    area_pixels=area_pixels,
                    area_percentage=float(area_percentage),
                    centroid=(centroid_x, centroid_y),
                    mask_url=mask_urls[i],
                )

                masks_metadata.append(mask_metadata)

            logger.debug(f"Calculated metadata for {len(masks_metadata)} masks")
            return masks_metadata

        except Exception as e:
            logger.exception(f"Failed to calculate mask metadata: {e}")
            raise RuntimeError(f"Failed to calculate mask metadata: {e}") from e

    def _run_tiered_detection(
        self, image: Image.Image, prompt_sets: List[PromptPlanSet]
    ) -> DetectionResult:
        """
        Attempt detection per object across tiers until we get hits, then merge.
        """
        per_object_results: List[DetectionResult] = []
        fallback_size = self._get_image_dims(image)

        for prompt_set in prompt_sets:
            for plan in prompt_set.plans:
                result = self.sam3_model.detect(image, [plan.text])
                if result.boxes_xyxy.shape[0] > 0:
                    relabeled = self._relabel_detection(result, plan.label)
                    per_object_results.append(relabeled)
                    logger.debug(
                        f"Detected {relabeled.boxes_xyxy.shape[0]} boxes "
                        f"for label={plan.label} using tier={plan.tier.value}"
                    )
                    break

        return self._combine_detection_results(per_object_results, fallback_size)

    @staticmethod
    def _relabel_detection(result: DetectionResult, label: str) -> DetectionResult:
        """Assign friendly labels to detections instead of raw prompt strings."""
        num = result.scores.shape[0]
        return DetectionResult(
            boxes_xyxy=result.boxes_xyxy,
            scores=result.scores,
            labels=[label for _ in range(num)],
            masks=result.masks,
        )

    @staticmethod
    def _combine_detection_results(
        results: List[DetectionResult], fallback_size: tuple[int, int]
    ) -> DetectionResult:
        """Merge per-prompt DetectionResults into a single result."""
        if not results:
            width, height = fallback_size
            return DetectionResult(
                boxes_xyxy=torch.zeros((0, 4)),
                scores=torch.zeros((0,)),
                labels=[],
                masks=torch.zeros(
                    (0, 1, height, width),
                    dtype=torch.bool,
                ),
            )

        boxes = torch.cat([r.boxes_xyxy for r in results], dim=0)
        scores = torch.cat([r.scores for r in results], dim=0)
        labels: List[str] = []
        masks = torch.cat([r.masks for r in results], dim=0)

        for r in results:
            labels.extend(r.labels)

        return DetectionResult(
            boxes_xyxy=boxes,
            scores=scores,
            labels=labels,
            masks=masks,
        )

    @staticmethod
    def _get_image_dims(image: Image.Image) -> tuple[int, int]:
        """Best-effort extraction of integer width/height from PIL image or mock."""
        def _to_int(val: Any) -> Optional[int]:
            try:
                return int(val)
            except Exception:
                return None

        w = _to_int(getattr(image, "width", None))
        h = _to_int(getattr(image, "height", None))
        if w is not None and h is not None:
            return w, h

        size = getattr(image, "size", None)
        if isinstance(size, (list, tuple)) and len(size) >= 2:
            w = _to_int(size[0])
            h = _to_int(size[1])
            if w is not None and h is not None:
                return w, h

        return (0, 0)
