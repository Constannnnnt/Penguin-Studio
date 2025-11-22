from pathlib import Path
from typing import List, Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration with environment variable loading."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")

    cors_origins: List[str] = Field(
        default=["http://localhost:5173"],
        description="Allowed CORS origins",
    )

    device: str = Field(default="cuda", description="Device for model (cuda or cpu)")
    confidence_threshold: float = Field(
        default=0.5, description="Confidence threshold for detections"
    )
    box_threshold: float = Field(
        default=0.15, description="Box threshold for SAM3 model"
    )
    text_threshold: float = Field(
        default=0.22, description="Text threshold for SAM3 model"
    )
    iou_threshold: float = Field(
        default=0.45, description="IOU threshold for SAM3 model"
    )

    uploads_dir: Path = Field(default=Path("uploads"), description="Uploads directory")
    outputs_dir: Path = Field(default=Path("outputs"), description="Outputs directory")
    examples_dir: Path = Field(default=Path("examples"), description="Examples directory")
    max_file_size_mb: int = Field(
        default=10, description="Maximum file size in megabytes"
    )
    cleanup_age_hours: int = Field(
        default=24, description="Age in hours before cleaning up old results"
    )

    log_level: str = Field(default="INFO", description="Logging level")
    log_format: Literal["json", "text"] = Field(
        default="text", description="Logging format (json or text)"
    )


settings = Settings()
