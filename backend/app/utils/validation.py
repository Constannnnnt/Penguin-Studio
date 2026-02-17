from fastapi import UploadFile
from app.models.schemas import FileValidation
from app.utils.exceptions import ValidationException

async def validate_upload_file_size(file: UploadFile, max_size_bytes: int = FileValidation.MAX_FILE_SIZE_BYTES) -> None:
    """
    Validate file size by reading in chunks to avoid memory exhaustion (DoS).
    Resets file cursor to 0 after validation.

    Args:
        file: The uploaded file to check.
        max_size_bytes: The maximum allowed size in bytes.

    Raises:
        ValidationException: If the file size exceeds the limit.
    """
    size = 0
    chunk_size = 1024 * 1024  # 1MB

    # Ensure we start from the beginning
    await file.seek(0)

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        size += len(chunk)
        if size > max_size_bytes:
            raise ValidationException(
                "Image file size exceeds maximum allowed size",
                details={
                    "max_size_bytes": max_size_bytes,
                    "max_size_mb": max_size_bytes / (1024 * 1024),
                },
            )

    # Reset cursor for subsequent reads
    await file.seek(0)
