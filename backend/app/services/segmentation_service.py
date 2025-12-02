import asyncio
import json
import math
import time
from typing import Any, Callable, Dict, List, Optional
from pathlib import Path
import torch
from fastapi import UploadFile
from loguru import logger
from PIL import Image

from app.detection.types import DetectionResult
from app.models.sam3_model import SAM3Model
from app.models.schemas import (
    BoundingBox,
    MaskMetadata,
    ObjectMetadata,
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
        output_dir: Optional[Path] = None,
        result_id_override: Optional[str] = None,
    ) -> SegmentationResponse:
        """
        Main segmentation workflow.
        
        Steps:
        1. Save uploaded image
        2. Parse metadata and extract prompts
        3. Run SAM3 detection
        4. Generate and save mask images
        5. Create response with URLs
        
        Args:
            image_file: Uploaded image file
            metadata_file: Optional metadata JSON file
            prompts: Optional text prompts for segmentation
            progress_callback: Optional callback for progress updates
            output_dir: Optional custom output directory (for saving masks with generations)
            result_id_override: Optional result ID to use instead of generating new one
        """
        start_time = time.time()
        result_id = result_id_override or FileService.generate_result_id()
        
        # Use custom output dir or default
        actual_output_dir = output_dir or (self.file_service.outputs_dir / result_id)
        actual_output_dir.mkdir(parents=True, exist_ok=True)

        try:
            if progress_callback:
                progress_callback(0, "Starting segmentation...")

            if progress_callback:
                progress_callback(10, "Saving uploaded image...")
            
            # If custom output_dir, save image there; otherwise use default
            if output_dir:
                image_path = output_dir / "original.png"
                content = await image_file.read()
                await image_file.seek(0)
                image_path.write_bytes(content)
            else:
                image_path = await self.file_service.save_upload(image_file, result_id)

            loop = asyncio.get_event_loop()
            image = await loop.run_in_executor(
                None, lambda: Image.open(image_path).convert("RGB")
            )

            if progress_callback:
                progress_callback(20, "Extracting prompts...")
            parsed_metadata = None
            if metadata_file:
                parsed_metadata = await self._parse_metadata(metadata_file)
            
            prompt_sets = await self._build_prompt_sets(parsed_metadata, prompts)
            if not prompt_sets:
                prompt_sets = self.prompt_pipeline.build_from_prompts(["object"])

            logger.info(
                f"Processing segmentation for result_id={result_id} "
                f"with {sum(len(s.plans) for s in prompt_sets)} prompt candidates "
                f"across {len(prompt_sets)} objects"
            )

            if progress_callback:
                progress_callback(30, "Running SAM3 detection...")
            detection_result, prompt_info = await loop.run_in_executor(
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
                detection_result, image, result_id, output_dir=output_dir
            )

            if progress_callback:
                progress_callback(80, "Calculating mask metadata...")
            
            # Save original image (skip if using custom output_dir with existing image)
            if not output_dir:
                original_image_path = self.file_service.outputs_dir / result_id / "original.png"
                original_image_path.parent.mkdir(parents=True, exist_ok=True)
                await loop.run_in_executor(None, image.save, original_image_path)

            masks_metadata = self._calculate_mask_metadata(
                detection_result, mask_urls, img_width, img_height, prompt_info, parsed_metadata
            )

            processing_time_ms = (time.time() - start_time) * 1000

            if progress_callback:
                progress_callback(100, "Segmentation complete!")

            # Use appropriate URL based on output directory
            if output_dir:
                folder_name = output_dir.name
                original_url = f"/outputs/{folder_name}/generated.png"
            else:
                original_url = f"/outputs/{result_id}/original.png"

            response = SegmentationResponse(
                result_id=result_id,
                original_image_url=original_url,
                masks=masks_metadata,
                processing_time_ms=processing_time_ms,
                metadata=parsed_metadata if isinstance(parsed_metadata, dict) else None,
            )

            # Save segmentation metadata for later retrieval
            await self._save_segmentation_meta(
                actual_output_dir, masks_metadata, parsed_metadata
            )

            logger.info(
                f"Segmentation completed for result_id={result_id} "
                f"in {processing_time_ms:.2f}ms with {len(masks_metadata)} masks"
            )

            return response

        except ValueError as e:
            logger.warning(f"Segmentation validation failed for result_id={result_id}: {e}")
            raise
        except Exception as e:
            logger.exception(f"Segmentation failed for result_id={result_id}: {e}")
            raise RuntimeError(f"Segmentation processing failed: {e}") from e

    async def _build_prompt_sets(
        self, parsed_metadata: Optional[Dict[str, Any]], prompts: Optional[List[str]]
    ) -> List[PromptPlanSet]:
        """Prepare tiered prompt plan sets from free-form prompts and metadata."""
        prompt_sets: List[PromptPlanSet] = []

        if prompts:
            prompt_sets.extend(self.prompt_pipeline.build_from_prompts(prompts))

        if parsed_metadata:
            objects = parsed_metadata.get("objects") if isinstance(parsed_metadata, dict) else None
            if isinstance(objects, list):
                prompt_sets.extend(self.prompt_pipeline.build_from_objects(objects))

        return prompt_sets

    async def _parse_metadata(self, metadata_file: UploadFile) -> Dict[str, Any]:
        """Parse JSON metadata file."""
        try:
            content = await metadata_file.read()
            if content is None:
                raise ValueError("Invalid JSON metadata: empty content")

            if isinstance(content, (bytes, bytearray)):
                if not content.strip():
                    raise ValueError("Invalid JSON metadata: empty content")
            elif isinstance(content, str):
                if not content.strip():
                    raise ValueError("Invalid JSON metadata: empty content")

            metadata = json.loads(content)
            return metadata
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse metadata JSON: {e}")
            raise ValueError(f"Invalid JSON metadata: {e}") from e
        except ValueError as e:
            logger.error(f"Invalid metadata content: {e}")
            raise
        except Exception as e:
            logger.exception(f"Failed to read metadata file: {e}")
            raise RuntimeError(f"Failed to read metadata: {e}") from e

    async def _generate_mask_images(
        self, detection_result: DetectionResult, original_image: Image.Image, result_id: str,
        output_dir: Optional[Path] = None
    ) -> List[str]:
        """Convert mask tensors to PNG files and return URLs."""
        mask_urls = []

        try:
            num_masks = detection_result.masks.shape[0]

            for i in range(num_masks):
                mask_tensor = detection_result.masks[i]
                mask_url = await self.file_service.save_mask(
                    mask_tensor, result_id, i, output_dir=output_dir
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
        prompt_info: List[Dict[str, Any]],
        parsed_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[MaskMetadata]:
        """Calculate centroids, areas, and other mask metadata."""
        masks_metadata = []

        try:
            total_pixels = max(int(image_width) * int(image_height), 1)
            
            objects_metadata = []
            if parsed_metadata and isinstance(parsed_metadata, dict):
                objects_list = parsed_metadata.get("objects", [])
                if isinstance(objects_list, list):
                    objects_metadata = objects_list

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
                
                prompt_tier = None
                prompt_text = None
                prompt_object = None
                object_id = None
                if i < len(prompt_info):
                    info = prompt_info[i]
                    tier_value = info.get("tier")
                    if tier_value:
                        prompt_tier = tier_value.upper()
                    prompt_text = info.get("text")
                    object_id = info.get("object_id")
                    # Extract short object name from prompt_text
                    prompt_object = self._extract_prompt_object(prompt_text)
                
                object_metadata = self._match_object_metadata(
                    label, prompt_text, objects_metadata, i
                )

                # Clamp coordinates to non-negative to satisfy schema validation
                bbox = self._clamp_box(box, image_width, image_height)

                try:
                    mask_metadata = MaskMetadata(
                        mask_id=f"mask_{i}",
                        object_id=object_id,
                        label=label,
                        confidence=float(score.item()),
                        bounding_box=bbox,
                        area_pixels=area_pixels,
                        area_percentage=float(area_percentage),
                        centroid=(centroid_x, centroid_y),
                        mask_url=mask_urls[i],
                        prompt_tier=prompt_tier,
                        prompt_text=prompt_text,
                        prompt_object=prompt_object,
                        object_metadata=object_metadata,
                    )
                    masks_metadata.append(mask_metadata)
                except Exception as meta_err:
                    logger.warning(
                        "Skipping mask %s due to metadata validation error: %s",
                        f"mask_{i}",
                        meta_err,
                    )
                    continue

            logger.debug(f"Calculated metadata for {len(masks_metadata)} masks")
            return masks_metadata

        except Exception as e:
            logger.exception(f"Failed to calculate mask metadata: {e}")
            raise RuntimeError(f"Failed to calculate mask metadata: {e}") from e
    
    def _match_object_metadata(
        self,
        label: str,
        prompt_text: Optional[str],
        objects_metadata: List[Dict[str, Any]],
        fallback_index: int,
    ) -> Optional[ObjectMetadata]:
        """
        Match detected mask with object metadata from JSON.
        
        Matching strategy:
        1. Try to match by description similarity with label/prompt
        2. Fall back to index-based matching
        3. Return None if no match found
        """
        if not objects_metadata:
            return None
        
        matched_obj = None
        
        for obj in objects_metadata:
            if not isinstance(obj, dict):
                continue
            
            obj_desc = obj.get("description", "").lower()
            
            if label and label.lower() in obj_desc:
                matched_obj = obj
                break
            
            if prompt_text and any(
                word in obj_desc for word in prompt_text.lower().split() if len(word) > 3
            ):
                matched_obj = obj
                break
        
        if not matched_obj and fallback_index < len(objects_metadata):
            matched_obj = objects_metadata[fallback_index]
        
        if matched_obj and isinstance(matched_obj, dict):
            try:
                return ObjectMetadata(
                    description=matched_obj.get("description", ""),
                    location=matched_obj.get("location", ""),
                    relationship=matched_obj.get("relationship", ""),
                    relative_size=matched_obj.get("relative_size", ""),
                    shape_and_color=matched_obj.get("shape_and_color", ""),
                    texture=matched_obj.get("texture", ""),
                    appearance_details=matched_obj.get("appearance_details", ""),
                    orientation=matched_obj.get("orientation", ""),
                )
            except Exception as e:
                logger.warning(
                    f"Failed to parse object metadata for label={label}: {e}"
                )
                return None
        
        return None

    def _run_tiered_detection(
        self, image: Image.Image, prompt_sets: List[PromptPlanSet]
    ) -> tuple[DetectionResult, List[Dict[str, Any]]]:
        """
        Attempt detection per object across tiers until we get hits, then merge.
        Returns detection result and prompt information for each mask.
        """
        per_object_results: List[DetectionResult] = []
        prompt_info: List[Dict[str, Any]] = []
        fallback_size = self._get_image_dims(image)

        for obj_idx, prompt_set in enumerate(prompt_sets):
            for plan in prompt_set.plans:
                result = self.sam3_model.detect(image, [plan.text])
                if result.boxes_xyxy.shape[0] > 0:
                    relabeled = self._relabel_detection(result, plan.label)
                    per_object_results.append(relabeled)
                    
                    for _ in range(relabeled.boxes_xyxy.shape[0]):
                        prompt_info.append({
                            "tier": plan.tier.value,
                            "text": plan.text,
                            "label": plan.label,
                            "object_id": f"object_{obj_idx}",
                        })
                    
                    logger.debug(
                        f"Detected {relabeled.boxes_xyxy.shape[0]} boxes "
                        f"for label={plan.label} using tier={plan.tier.value}"
                    )
                    break

        combined_result = self._combine_detection_results(per_object_results, fallback_size)
        return combined_result, prompt_info

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
    def _clamp_box(
        box: Any, image_width: int, image_height: int
    ) -> BoundingBox:
        """Clamp bounding box coordinates to valid, non-negative image bounds."""
        def _to_number(val: Any) -> float:
            try:
                if hasattr(val, "item"):
                    val = val.item()
                return float(val)
            except Exception:
                return 0.0

        w = float(image_width) if image_width and image_width > 0 else float("inf")
        h = float(image_height) if image_height and image_height > 0 else float("inf")

        raw_x1 = _to_number(box[0])
        raw_y1 = _to_number(box[1])
        raw_x2 = _to_number(box[2])
        raw_y2 = _to_number(box[3])

        def _sanitize(value: float, minimum: float = 0.0, maximum: float = float("inf")) -> float:
            if not math.isfinite(value):
                value = 0.0
            value = max(minimum, value)
            return min(value, maximum)

        x1 = _sanitize(raw_x1, 0.0)
        y1 = _sanitize(raw_y1, 0.0)
        x2 = _sanitize(raw_x2, x1, w)
        y2 = _sanitize(raw_y2, y1, h)

        return BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)

    async def _save_segmentation_meta(
        self,
        output_dir: Path,
        masks_metadata: List[MaskMetadata],
        parsed_metadata: Optional[Dict[str, Any]],
    ) -> None:
        """
        Save segmentation metadata linking masks to objects.
        
        This file enables reconstruction of mask-object relationships
        when loading a generation later.
        """
        segmentation_meta = {
            "masks": [
                {
                    "mask_id": m.mask_id,
                    "object_id": m.object_id,
                    "label": m.label,
                    "confidence": m.confidence,
                    "bounding_box": {
                        "x1": m.bounding_box.x1,
                        "y1": m.bounding_box.y1,
                        "x2": m.bounding_box.x2,
                        "y2": m.bounding_box.y2,
                    },
                    "area_pixels": m.area_pixels,
                    "area_percentage": m.area_percentage,
                    "centroid": list(m.centroid),
                    "mask_url": m.mask_url,
                    "prompt_tier": m.prompt_tier,
                    "prompt_text": m.prompt_text,
                    "prompt_object": m.prompt_object,
                    "object_metadata": (
                        m.object_metadata.model_dump() if m.object_metadata else None
                    ),
                }
                for m in masks_metadata
            ],
            "source_metadata": parsed_metadata,
        }
        
        meta_path = output_dir / "segmentation_meta.json"
        meta_path.write_text(json.dumps(segmentation_meta, indent=2))
        logger.debug(f"Saved segmentation metadata to {meta_path}")

    @staticmethod
    def _extract_prompt_object(prompt_text: Optional[str]) -> Optional[str]:
        """
        Extract the main noun/entity from prompt_text.
        
        Strategy:
        1. Look for common concrete nouns (objects you can see)
        2. In English noun phrases, the head noun is typically the last noun
        3. Skip modifiers, adjectives, and abstract words
        
        Examples:
        - "A modern public transport bus" -> "bus"
        - "a red apple on a table" -> "apple"
        - "the golden retriever dog" -> "dog"
        - "small wooden chair" -> "chair"
        - "person wearing a hat" -> "person"
        """
        if not prompt_text:
            return None
        
        text = prompt_text.strip().lower()
        if not text:
            return None
        
        # Remove common articles and determiners at the start
        articles = ["a ", "an ", "the ", "this ", "that ", "some ", "any "]
        for article in articles:
            if text.startswith(article):
                text = text[len(article):]
                break
        
        # Split by common phrase separators to get the main subject phrase
        # (before "on", "in", "with", "wearing", etc.)
        separators = [" on ", " in ", " with ", " wearing ", " holding ", " near ", " by ", " at ", " painted ", ", "]
        main_phrase = text
        for sep in separators:
            if sep in text:
                main_phrase = text.split(sep)[0]
                break
        
        # Split into words
        words = main_phrase.split()
        if not words:
            return None
        
        # Common concrete nouns (objects that can be visually identified)
        concrete_nouns = {
            # Vehicles
            "car", "bus", "truck", "van", "motorcycle", "bike", "bicycle", "train", "plane", "boat", "ship",
            # Animals
            "dog", "cat", "bird", "horse", "cow", "sheep", "fish", "lion", "tiger", "bear", "elephant",
            "rabbit", "mouse", "deer", "wolf", "fox", "monkey", "gorilla", "penguin", "duck", "chicken",
            # People
            "person", "man", "woman", "child", "boy", "girl", "baby", "people", "crowd",
            # Furniture
            "chair", "table", "desk", "sofa", "couch", "bed", "lamp", "shelf", "cabinet", "drawer",
            # Food
            "apple", "orange", "banana", "pizza", "burger", "sandwich", "cake", "bread", "fruit", "vegetable",
            # Objects
            "ball", "box", "bag", "bottle", "cup", "glass", "plate", "bowl", "book", "phone", "computer",
            "laptop", "camera", "clock", "watch", "key", "door", "window", "wall", "floor", "ceiling",
            # Nature
            "tree", "flower", "plant", "grass", "rock", "stone", "mountain", "river", "lake", "ocean", "beach",
            # Buildings
            "house", "building", "tower", "bridge", "road", "street", "path",
            # Clothing
            "hat", "shirt", "dress", "pants", "shoes", "jacket", "coat",
        }
        
        # Words that are typically modifiers, not the main noun
        modifiers = {
            # Adjectives
            "small", "large", "big", "tiny", "huge", "tall", "short", "long", "wide", "narrow",
            "red", "blue", "green", "yellow", "black", "white", "brown", "golden", "silver", "orange", "pink", "purple",
            "old", "new", "young", "ancient", "modern", "vintage", "classic", "contemporary",
            "wooden", "metal", "plastic", "glass", "stone", "leather", "fabric", "cotton", "silk",
            "beautiful", "ugly", "pretty", "handsome", "cute", "elegant", "fancy",
            "happy", "sad", "angry", "calm", "peaceful", "cheerful",
            "bright", "dark", "light", "dim", "shiny", "matte", "glossy",
            "soft", "hard", "smooth", "rough", "fuzzy", "fluffy",
            "wet", "dry", "hot", "cold", "warm", "cool", "frozen",
            "clean", "dirty", "fresh", "stale",
            "full", "empty", "open", "closed",
            "fast", "slow", "quick",
            "loud", "quiet", "silent",
            "heavy", "lightweight",
            "expensive", "cheap",
            "simple", "complex", "plain", "fancy",
            "round", "square", "rectangular", "circular", "oval",
            "striped", "spotted", "patterned", "solid",
            "subtle", "bold", "vibrant", "muted", "pastel",
            # Common non-noun words in descriptions
            "public", "private", "commercial", "residential", "industrial",
            "transport", "transportation",
            "style", "type", "kind", "sort",
            "looking", "facing", "standing", "sitting", "lying",
        }
        
        # First pass: look for known concrete nouns (prefer last one found - head noun)
        found_noun = None
        for word in words:
            clean_word = word.strip(".,!?;:'\"")
            if clean_word in concrete_nouns:
                found_noun = clean_word
        
        if found_noun:
            return found_noun
        
        # Second pass: find the last non-modifier word (likely the head noun)
        for word in reversed(words):
            clean_word = word.strip(".,!?;:'\"")
            if clean_word and clean_word not in modifiers and len(clean_word) > 2:
                return clean_word
        
        # Fallback: return the last word
        return words[-1].strip(".,!?;:'\"") if words else None

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
