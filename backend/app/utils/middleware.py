"""Middleware for request logging and context management."""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.metrics_service import get_metrics_service


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging all HTTP requests with context.

    Adds request_id to request state and logs request/response details.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware or route handler

        Returns:
            HTTP response
        """
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.time()
        metrics_service = get_metrics_service()

        should_track_metrics = not request.url.path.startswith("/api/v1/metrics")

        if should_track_metrics:
            metrics_service.record_request()

        logger.info(
            f"Request started: request_id={request_id}, "
            f"method={request.method}, path={request.url.path}, "
            f"client={request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)

            process_time = (time.time() - start_time) * 1000

            if should_track_metrics:
                metrics_service.record_processing_time(process_time)

                if 200 <= response.status_code < 400:
                    metrics_service.record_success()
                else:
                    metrics_service.record_error()

            logger.info(
                f"Request completed: request_id={request_id}, "
                f"method={request.method}, path={request.url.path}, "
                f"status={response.status_code}, "
                f"duration_ms={process_time:.2f}"
            )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

            return response

        except Exception as exc:
            process_time = (time.time() - start_time) * 1000

            if should_track_metrics:
                metrics_service.record_processing_time(process_time)
                metrics_service.record_error()

            logger.error(
                f"Request failed: request_id={request_id}, "
                f"method={request.method}, path={request.url.path}, "
                f"duration_ms={process_time:.2f}, error={str(exc)}"
            )

            raise
