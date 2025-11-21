import pytest
import asyncio
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
import torch
import numpy as np
from PIL import Image

from app.services.file_service import FileService


class TestFileService:
    """Tests for FileService operations."""

    @pytest.fixture
    def temp_dirs(self, tmp_path):
        """Create temporary directories for testing."""
        uploads_dir = tmp_path / "uploads"
        outputs_dir = tmp_path / "outputs"
        uploads_dir.mkdir()
        outputs_dir.mkdir()
        return uploads_dir, outputs_dir

    @pytest.fixture
    def file_service(self, temp_dirs):
        """Create a FileService instance with temporary directories."""
        uploads_dir, outputs_dir = temp_dirs
        return FileService(uploads_dir=uploads_dir, outputs_dir=outputs_dir)

    @pytest.fixture
    def mock_upload_file(self):
        """Create a mock UploadFile."""
        mock_file = Mock()
        mock_file.filename = "test_image.png"
        mock_file.read = AsyncMock(return_value=b"fake image data")
        return mock_file

    def test_initialization(self, file_service, temp_dirs):
        """Test FileService initialization."""
        uploads_dir, outputs_dir = temp_dirs
        assert file_service.uploads_dir == uploads_dir
        assert file_service.outputs_dir == outputs_dir
        assert uploads_dir.exists()
        assert outputs_dir.exists()

    @pytest.mark.asyncio
    async def test_save_upload_success(self, file_service, mock_upload_file, temp_dirs):
        """Test successful file upload."""
        result_id = "test-result-123"
        uploads_dir, _ = temp_dirs

        file_path = await file_service.save_upload(mock_upload_file, result_id)

        assert file_path.exists()
        assert file_path.parent == uploads_dir / result_id
        assert file_path.name == "original.png"
        assert file_path.read_bytes() == b"fake image data"

    @pytest.mark.asyncio
    async def test_save_upload_creates_result_directory(
        self, file_service, mock_upload_file, temp_dirs
    ):
        """Test that save_upload creates result directory."""
        result_id = "test-result-456"
        uploads_dir, _ = temp_dirs

        await file_service.save_upload(mock_upload_file, result_id)

        result_dir = uploads_dir / result_id
        assert result_dir.exists()
        assert result_dir.is_dir()

    @pytest.mark.asyncio
    async def test_save_upload_preserves_extension(
        self, file_service, temp_dirs
    ):
        """Test that file extension is preserved."""
        result_id = "test-result-789"

        mock_file = Mock()
        mock_file.filename = "test_image.jpg"
        mock_file.read = AsyncMock(return_value=b"fake jpeg data")

        file_path = await file_service.save_upload(mock_file, result_id)

        assert file_path.suffix == ".jpg"
        assert file_path.name == "original.jpg"

    @pytest.mark.asyncio
    async def test_save_mask_success(self, file_service, temp_dirs):
        """Test successful mask saving."""
        result_id = "test-result-mask"
        mask_index = 0
        _, outputs_dir = temp_dirs

        mask_tensor = torch.ones((1, 1, 100, 100), dtype=torch.bool)

        mask_url = await file_service.save_mask(mask_tensor, result_id, mask_index)

        assert mask_url == f"/outputs/{result_id}/mask_{mask_index}.png"

        mask_path = outputs_dir / result_id / f"mask_{mask_index}.png"
        assert mask_path.exists()

        saved_image = Image.open(mask_path)
        assert saved_image.mode == "L"
        assert saved_image.size == (100, 100)

    @pytest.mark.asyncio
    async def test_save_mask_handles_4d_tensor(self, file_service, temp_dirs):
        """Test mask saving with 4D tensor."""
        result_id = "test-4d-mask"
        mask_index = 0

        mask_tensor = torch.ones((1, 1, 50, 50), dtype=torch.bool)

        mask_url = await file_service.save_mask(mask_tensor, result_id, mask_index)

        assert mask_url == f"/outputs/{result_id}/mask_{mask_index}.png"

    @pytest.mark.asyncio
    async def test_save_mask_handles_3d_tensor(self, file_service, temp_dirs):
        """Test mask saving with 3D tensor."""
        result_id = "test-3d-mask"
        mask_index = 1

        mask_tensor = torch.ones((1, 50, 50), dtype=torch.bool)

        mask_url = await file_service.save_mask(mask_tensor, result_id, mask_index)

        assert mask_url == f"/outputs/{result_id}/mask_{mask_index}.png"

    @pytest.mark.asyncio
    async def test_save_mask_converts_bool_to_uint8(self, file_service, temp_dirs):
        """Test that boolean masks are converted to uint8."""
        result_id = "test-bool-mask"
        mask_index = 0
        _, outputs_dir = temp_dirs

        mask_tensor = torch.tensor([[True, False], [False, True]], dtype=torch.bool)

        await file_service.save_mask(mask_tensor, result_id, mask_index)

        mask_path = outputs_dir / result_id / f"mask_{mask_index}.png"
        saved_image = Image.open(mask_path)
        mask_array = np.array(saved_image)

        assert mask_array.dtype == np.uint8
        assert mask_array[0, 0] == 255
        assert mask_array[0, 1] == 0

    @pytest.mark.asyncio
    async def test_save_mask_converts_float_to_uint8(self, file_service, temp_dirs):
        """Test that float masks are converted to uint8."""
        result_id = "test-float-mask"
        mask_index = 0
        _, outputs_dir = temp_dirs

        mask_tensor = torch.tensor([[1.0, 0.0], [0.5, 0.25]], dtype=torch.float32)

        await file_service.save_mask(mask_tensor, result_id, mask_index)

        mask_path = outputs_dir / result_id / f"mask_{mask_index}.png"
        saved_image = Image.open(mask_path)
        mask_array = np.array(saved_image)

        assert mask_array.dtype == np.uint8

    def test_get_result_path(self, file_service, temp_dirs):
        """Test getting result file path."""
        result_id = "test-result-path"
        filename = "mask_0.png"
        _, outputs_dir = temp_dirs

        result_path = file_service.get_result_path(result_id, filename)

        expected_path = outputs_dir / result_id / filename
        assert result_path == expected_path

    @pytest.mark.asyncio
    async def test_cleanup_old_results(self, file_service, temp_dirs):
        """Test cleanup of old result files."""
        uploads_dir, outputs_dir = temp_dirs

        old_result_dir = outputs_dir / "old-result"
        old_result_dir.mkdir()
        (old_result_dir / "mask_0.png").write_text("old mask")

        import time
        old_mtime = time.time() - (25 * 3600)
        import os
        os.utime(old_result_dir, (old_mtime, old_mtime))

        deleted_count = await file_service.cleanup_old_results(max_age_hours=24)

        assert deleted_count == 1
        assert not old_result_dir.exists()

    @pytest.mark.asyncio
    async def test_cleanup_preserves_recent_results(self, file_service, temp_dirs):
        """Test that cleanup preserves recent results."""
        uploads_dir, outputs_dir = temp_dirs

        recent_result_dir = outputs_dir / "recent-result"
        recent_result_dir.mkdir()
        (recent_result_dir / "mask_0.png").write_text("recent mask")

        deleted_count = await file_service.cleanup_old_results(max_age_hours=24)

        assert deleted_count == 0
        assert recent_result_dir.exists()

    def test_generate_result_id(self):
        """Test result ID generation."""
        result_id = FileService.generate_result_id()

        assert isinstance(result_id, str)
        assert len(result_id) > 0

        result_id2 = FileService.generate_result_id()
        assert result_id != result_id2

    @pytest.mark.asyncio
    async def test_save_upload_handles_read_error(self, file_service):
        """Test handling of file read errors."""
        result_id = "test-error"

        mock_file = Mock()
        mock_file.filename = "test.png"
        mock_file.read = AsyncMock(side_effect=IOError("Read failed"))

        with pytest.raises(RuntimeError) as exc_info:
            await file_service.save_upload(mock_file, result_id)
        assert "Failed to save uploaded file" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_save_mask_handles_invalid_tensor(self, file_service):
        """Test handling of invalid mask tensor."""
        result_id = "test-invalid"
        mask_index = 0

        invalid_tensor = torch.tensor([1, 2, 3])

        with pytest.raises(RuntimeError) as exc_info:
            await file_service.save_mask(invalid_tensor, result_id, mask_index)
        assert "Failed to save mask image" in str(exc_info.value)
