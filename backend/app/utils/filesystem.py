from pathlib import Path

from app.config import settings


def ensure_directories() -> None:
    """Create required directories if they don't exist."""
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.outputs_dir.mkdir(parents=True, exist_ok=True)
