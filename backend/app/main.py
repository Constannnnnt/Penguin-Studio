import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.api.dependencies import cleanup_dependencies, get_file_service, get_sam3_model
from app.api.routes import segmentation, websocket, scene_parsing, generation
from app.config import settings
from app.utils.error_handlers import register_error_handlers
from app.utils.logging import setup_logging

setup_logging()

# Ensure Google API key is available for ADK/Gemini clients
if settings.google_api_key:
    os.environ.setdefault("GOOGLE_API_KEY", settings.google_api_key)
    os.environ.setdefault("GEMINI_API_KEY", settings.google_api_key)


class CORSStaticFiles(StaticFiles):
    """StaticFiles with CORS headers for cross-origin access."""

    async def __call__(self, scope, receive, send) -> None:
        # Determine allowed origin based on settings
        origin = ""
        for name, value in scope.get("headers", []):
            if name == b"origin":
                origin = value.decode("utf-8")
                break

        allowed_origins = settings.cors_origins
        allow_origin_header = "null"

        if "*" in allowed_origins:
            allow_origin_header = "*"
        elif origin and origin in allowed_origins:
            allow_origin_header = origin

        # Handle OPTIONS preflight requests
        if scope["type"] == "http" and scope["method"] == "OPTIONS":
            response = Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": allow_origin_header,
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                },
            )
            await response(scope, receive, send)
            return

        # Wrap send to add CORS headers to response
        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append(
                    (
                        b"access-control-allow-origin",
                        allow_origin_header.encode("utf-8"),
                    )
                )
                headers.append((b"access-control-allow-methods", b"GET, OPTIONS"))
                headers.append((b"access-control-allow-headers", b"*"))
                message["headers"] = headers
            await send(message)

        await super().__call__(scope, receive, send_with_cors)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.

    Handles:
    - Loading model on startup
    - Starting periodic cleanup task
    - Cleanup on shutdown
    """
    logger.info("Starting Segmentation Service...")

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

    logger.info("Shutting down Segmentation Service...")
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
            logger.info(
                f"Periodic cleanup completed: deleted {deleted_count} directories"
            )

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
        title="Penguin Studio Service",
        version="1.0.0",
        lifespan=lifespan,
    )

    # app.add_middleware(RequestLoggingMiddleware)
    # logger.info("Request logging middleware registered")

    # CORS middleware for API routes
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    logger.info(f"CORS configured with origins: {settings.cors_origins}")

    register_error_handlers(app)

    app.include_router(segmentation.router)
    app.include_router(websocket.router)
    app.include_router(scene_parsing.router)
    app.include_router(generation.router)
    logger.info("API routers registered")

    settings.outputs_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/outputs", CORSStaticFiles(directory=str(settings.outputs_dir)), name="outputs"
    )
    logger.info(
        f"Static files mounted at /outputs -> {settings.outputs_dir} (with CORS)"
    )

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
