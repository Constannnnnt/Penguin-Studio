import sys

from loguru import logger

from app.config import settings


def setup_logging() -> None:
    """Configure loguru based on settings."""
    logger.remove()
    
    log_level = settings.log_level.upper()
    
    if settings.log_format == "json":
        logger.add(
            sys.stdout,
            level=log_level,
            serialize=True,
            backtrace=True,
            diagnose=True,
        )
    else:
        logger.add(
            sys.stdout,
            level=log_level,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
            backtrace=True,
            diagnose=True,
        )
