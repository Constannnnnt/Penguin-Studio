import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import UploadFile
from app.api.routes.segmentation import segment_image
from app.utils.exceptions import ValidationException
from app.models.schemas import FileValidation

@pytest.mark.asyncio
async def test_segmentation_upload_limit_read_behavior():
    """
    Test that the implementation reads the file in chunks
    to validate size, preventing DoS.
    """
    # Mock dependencies
    segmentation_service = AsyncMock()

    # Mock UploadFile
    image_file = MagicMock(spec=UploadFile)
    image_file.filename = "test.png"
    image_file.content_type = "image/png"

    # Mock read to return a small content
    # First call returns content, subsequent calls return empty (EOF)
    image_file.read = AsyncMock(side_effect=[b"chunk", b""])
    image_file.seek = AsyncMock()

    # Call the endpoint function directly
    try:
        await segment_image(
            image=image_file,
            metadata=None,
            prompts=None,
            segmentation_service=segmentation_service
        )
    except Exception:
        # We don't care about subsequent errors
        pass

    # Verify read was called
    image_file.read.assert_called()

    # Check arguments of the first call
    args, _ = image_file.read.call_args
    assert args, "Expected read() to be called with chunk size argument"
    chunk_size = args[0]
    assert isinstance(chunk_size, int) and chunk_size > 0, f"Expected positive integer chunk size, got {chunk_size}"
    assert chunk_size <= 10 * 1024 * 1024, "Chunk size should be reasonable (e.g. 1MB)"
