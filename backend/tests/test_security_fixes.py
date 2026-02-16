import pytest
import sys
import asyncio
from pathlib import Path
from unittest.mock import Mock, AsyncMock

# Mock everything before imports
mock_settings = Mock()
mock_settings.uploads_dir = Path("uploads")
mock_settings.outputs_dir = Path("outputs")

# Extensive list of modules to mock
mock_modules = [
    "numpy", "torch", "PIL", "fastapi", "loguru", "pydantic",
    "pydantic_settings", "spacy", "einops", "app.config",
    "app.detection.types", "app.models.sam3_model", "app.models.schemas",
    "sentence_transformers", "google.adk", "cv2", "matplotlib", "pandas",
    "skimage", "sklearn", "transformers", "accelerate"
]
for mod in mock_modules:
    sys.modules[mod] = Mock()

sys.modules["app.config"].settings = mock_settings
sys.modules["app.detection"] = Mock()
sys.modules["app.models"] = Mock()
sys.modules["app.services.segmentation_service"] = Mock()
sys.modules["app.services.websocket_manager"] = Mock()
sys.modules["app.services.scene_parsing_service"] = Mock()
sys.modules["app.services.metrics_service"] = Mock()
sys.modules["app.services.bria_service"] = Mock()
sys.modules["app.services.prompt_service"] = Mock()

from app.utils.filesystem import safe_join
from app.services.file_service import FileService

class TestSecurityFixes:
    """Tests for security vulnerability fixes."""

    def test_safe_join_valid(self, tmp_path):
        """Test safe_join with valid paths."""
        base = tmp_path / "base"
        base.mkdir()

        target = safe_join(base, "sub", "file.txt")
        assert target == (base / "sub" / "file.txt").resolve()

        sub = base / "existing"
        sub.mkdir()
        target = safe_join(base, "existing")
        assert target == sub.resolve()

    def test_safe_join_traversal(self, tmp_path):
        """Test safe_join detects path traversal."""
        base = tmp_path / "base"
        base.mkdir()

        with pytest.raises(ValueError, match="Security Alert: Path traversal detected"):
            safe_join(base, "..", "outside.txt")

        with pytest.raises(ValueError, match="Security Alert: Path traversal detected"):
            safe_join(base, "/etc/passwd")

    def test_file_service_save_upload_traversal(self, tmp_path):
        """Test FileService.save_upload prevents path traversal."""
        async def run_test():
            uploads_dir = tmp_path / "uploads"
            outputs_dir = tmp_path / "outputs"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            outputs_dir.mkdir(parents=True, exist_ok=True)

            file_service = FileService(uploads_dir=uploads_dir, outputs_dir=outputs_dir)

            mock_file = Mock()
            mock_file.filename = "test.png"
            mock_file.read = AsyncMock(return_value=b"data")

            traversal_id = "../malicious"

            with pytest.raises(RuntimeError) as exc_info:
                await file_service.save_upload(mock_file, traversal_id)

            assert "Security Alert: Path traversal detected" in str(exc_info.value)
            assert not (tmp_path / "malicious").exists()

        asyncio.run(run_test())

    def test_file_service_save_mask_traversal(self, tmp_path):
        """Test FileService.save_mask prevents path traversal."""
        async def run_test():
            uploads_dir = tmp_path / "uploads"
            outputs_dir = tmp_path / "outputs"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            outputs_dir.mkdir(parents=True, exist_ok=True)

            file_service = FileService(uploads_dir=uploads_dir, outputs_dir=outputs_dir)

            mask_tensor = Mock()
            mask_tensor.dim.return_value = 4

            traversal_id = "../../etc"

            with pytest.raises(RuntimeError) as exc_info:
                await file_service.save_mask(mask_tensor, traversal_id, 0)

            assert "Security Alert: Path traversal detected" in str(exc_info.value)

        asyncio.run(run_test())

    def test_file_service_get_result_path_traversal(self, tmp_path):
        """Test FileService.get_result_path prevents path traversal."""
        uploads_dir = tmp_path / "uploads"
        outputs_dir = tmp_path / "outputs"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        outputs_dir.mkdir(parents=True, exist_ok=True)

        file_service = FileService(uploads_dir=uploads_dir, outputs_dir=outputs_dir)

        traversal_id = "../outside"

        with pytest.raises(ValueError, match="Security Alert: Path traversal detected"):
            file_service.get_result_path(traversal_id, "file.png")
