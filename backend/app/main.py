import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.api.dependencies import cleanup_dependencies, get_file_service, get_sam3_model
from app.api.routes import segmentation, websocket
from app.config import settings
from app.utils.error_handlers import register_error_handlers
from app.utils.logging import setup_logging
from app.utils.middleware import RequestLoggingMiddleware

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.
    
    Handles:
    - Loading SAM3 model on startup
    - Starting periodic cleanup task
    - Cleanup on shutdown
    """
    logger.info("Starting SAM3 Segmentation Service...")
    
    try:
        sam3_model = get_sam3_model()
        await sam3_model.load()
        logger.info("SAM3 model loaded successfully")
    except Exception as e:
        logger.exception(f"Failed to load SAM3 model: {e}")
        raise
    
    cleanup_task = asyncio.create_task(_periodic_cleanup())
    logger.info("Started periodic cleanup task")
    
    yield
    
    logger.info("Shutting down SAM3 Segmentation Service...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        logger.info("Cleanup task cancelled")
    
    await cleanup_dependencies()
    logger.info("Shutdown complete")


async def _periodic_cleanup() -> None:
    """Periodic task to cleanup old result files."""
    file_service = get_file_service()
    
    while True:
        try:
            await asyncio.sleep(3600)
            
            logger.info("Running periodic cleanup...")
            deleted_count = await file_service.cleanup_old_results()
            logger.info(f"Periodic cleanup completed: deleted {deleted_count} directories")
            
        except asyncio.CancelledError:
            logger.info("Periodic cleanup task cancelled")
            raise
        except Exception as e:
            logger.exception(f"Periodic cleanup failed: {e}")


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application.
    
    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="SAM3 Segmentation Service",
        version="1.0.0",
        description="Image segmentation service using SAM3 model with real-time WebSocket support",
        lifespan=lifespan,
    )
    
    app.add_middleware(RequestLoggingMiddleware)
    logger.info("Request logging middleware registered")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS configured with origins: {settings.cors_origins}")
    
    register_error_handlers(app)
    
    app.include_router(segmentation.router)
    app.include_router(websocket.router)
    logger.info("API routers registered")
    
    settings.outputs_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/outputs", StaticFiles(directory=str(settings.outputs_dir)), name="outputs")
    logger.info(f"Static files mounted at /outputs -> {settings.outputs_dir}")
    
    if settings.examples_dir.exists():
        app.mount("/examples", StaticFiles(directory=str(settings.examples_dir)), name="examples")
        logger.info(f"Static files mounted at /examples -> {settings.examples_dir}")
    else:
        logger.warning(f"Examples directory not found: {settings.examples_dir}")
    
    return app


app = create_app()


def main():
    """Run the application with uvicorn."""
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
