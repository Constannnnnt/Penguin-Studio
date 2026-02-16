import asyncio
import time
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from fastapi import UploadFile
from loguru import logger
from PIL import Image

from app.config import settings


class FileService:
    """Manages file storage and retrieval for segmentation results."""

    def __init__(
        self, uploads_dir: Optional[Path] = None, outputs_dir: Optional[Path] = None
    ) -> None:
        self.uploads_dir = uploads_dir or settings.uploads_dir
        self.outputs_dir = outputs_dir or settings.outputs_dir

        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.outputs_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            f"FileService initialized: uploads={self.uploads_dir}, "
            f"outputs={self.outputs_dir}"
        )

    async def save_upload(self, file: UploadFile, result_id: str) -> Path:
        """Save uploaded file with unique identifier."""
        try:
            result_dir = self.uploads_dir / result_id
            result_dir.mkdir(parents=True, exist_ok=True)

            file_extension = Path(file.filename or "image.png").suffix
            file_path = result_dir / f"original{file_extension}"

            content = await file.read()

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, file_path.write_bytes, content)

            logger.info(f"Saved upload to {file_path} ({len(content)} bytes)")
            return file_path

        except Exception as e:
            logger.exception(f"Failed to save upload for result_id={result_id}: {e}")
            raise RuntimeError(f"Failed to save uploaded file: {e}") from e

    async def save_mask(
        self,
        mask_array: torch.Tensor,
        result_id: str,
        mask_index: int,
        output_dir: Optional[Path] = None,
    ) -> str:
        """Save mask as PNG and return URL."""
        try:
            result_dir = output_dir or (self.outputs_dir / result_id)
            result_dir.mkdir(parents=True, exist_ok=True)

            mask_filename = f"mask_{mask_index}.png"
            mask_path = result_dir / mask_filename

            if mask_array.dim() == 4:
                mask_array = mask_array.squeeze(0).squeeze(0)
            elif mask_array.dim() == 3:
                mask_array = mask_array.squeeze(0)

            mask_np = mask_array.cpu().numpy()

            if mask_np.dtype == bool:
                mask_np = mask_np.astype(np.uint8) * 255
            elif mask_np.dtype == np.float32 or mask_np.dtype == np.float64:
                mask_np = (mask_np * 255).astype(np.uint8)

            # Encode mask into alpha channel so frontends can use it directly as a CSS mask.
            rgba = np.zeros((*mask_np.shape, 4), dtype=np.uint8)
            rgba[..., 3] = mask_np  # alpha
            mask_image = Image.fromarray(rgba, mode="RGBA")

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, mask_image.save, mask_path)

            # Generate URL based on the actual output directory
            if output_dir:
                # Extract the folder name from the output_dir path
                folder_name = output_dir.name
                mask_url = f"/outputs/{folder_name}/{mask_filename}"
            else:
                mask_url = f"/outputs/{result_id}/{mask_filename}"
            logger.debug(f"Saved mask to {mask_path}, URL: {mask_url}")

            return mask_url

        except Exception as e:
            logger.exception(
                f"Failed to save mask {mask_index} for result_id={result_id}: {e}"
            )
            raise RuntimeError(f"Failed to save mask image: {e}") from e

    def get_result_path(self, result_id: str, filename: str) -> Path:
        """Get path for result file."""
        return self.outputs_dir / result_id / filename

    async def cleanup_old_results(self, max_age_hours: Optional[int] = None) -> int:
        """Delete result files older than specified age."""
        max_age = max_age_hours or settings.cleanup_age_hours
        cutoff_time = time.time() - (max_age * 3600)
        deleted_count = 0

        try:
            for directory in [self.uploads_dir]:
                if not directory.exists():
                    continue

                for result_dir in directory.iterdir():
                    if not result_dir.is_dir():
                        continue

                    try:
                        dir_mtime = result_dir.stat().st_mtime
                        if dir_mtime < cutoff_time:
                            loop = asyncio.get_event_loop()
                            await loop.run_in_executor(
                                None, self._remove_directory, result_dir
                            )
                            deleted_count += 1
                            logger.info(
                                f"Deleted old result directory: {result_dir.name}"
                            )
                    except Exception as e:
                        logger.warning(f"Failed to delete directory {result_dir}: {e}")

            logger.info(
                f"Cleanup completed: deleted {deleted_count} result directories "
                f"older than {max_age} hours"
            )
            return deleted_count

        except Exception as e:
            logger.exception(f"Cleanup failed: {e}")
            return deleted_count

    @staticmethod
    def _remove_directory(directory: Path) -> None:
        """Remove directory and all its contents."""
        import shutil

        shutil.rmtree(directory)

    @staticmethod
    def generate_result_id() -> str:
        """Generate unique result identifier."""
        return str(uuid.uuid4())
