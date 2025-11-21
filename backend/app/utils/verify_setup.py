"""Verification script for project setup."""
from pathlib import Path

from loguru import logger

from app.config import settings
from app.utils.filesystem import ensure_directories
from app.utils.logging import setup_logging


def verify_setup() -> None:
    """Verify that the project structure and configuration are set up correctly."""
    print("=" * 60)
    print("SAM3 Segmentation Service - Setup Verification")
    print("=" * 60)

    print("\n1. Configuration Settings:")
    print(f"   - Host: {settings.host}")
    print(f"   - Port: {settings.port}")
    print(f"   - Device: {settings.device}")
    print(f"   - CORS Origins: {settings.cors_origins}")
    print(f"   - Log Level: {settings.log_level}")
    print(f"   - Log Format: {settings.log_format}")

    print("\n2. Directory Structure:")
    base_path = Path(__file__).parent.parent
    directories = {
        "Models": base_path / "models",
        "Services": base_path / "services",
        "API": base_path / "api",
        "Utils": base_path / "utils",
        "Uploads": settings.uploads_dir,
        "Outputs": settings.outputs_dir,
    }

    for name, path in directories.items():
        exists = "✓" if path.exists() else "✗"
        print(f"   {exists} {name}: {path}")

    print("\n3. Creating Required Directories:")
    ensure_directories()
    print(f"   ✓ Uploads directory: {settings.uploads_dir}")
    print(f"   ✓ Outputs directory: {settings.outputs_dir}")

    print("\n4. Logging Configuration:")
    setup_logging()
    logger.info("Logging system initialized successfully")
    print(f"   ✓ Logging configured with {settings.log_format} format")

    print("\n" + "=" * 60)
    print("Setup verification complete!")
    print("=" * 60)


if __name__ == "__main__":
    verify_setup()
