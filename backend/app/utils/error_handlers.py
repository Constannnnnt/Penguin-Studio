"""Error handlers for FastAPI application."""

import traceback
from datetime import datetime
from typing import Any, Dict

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import ValidationError

from app.models.schemas import ErrorResponse
from app.utils.exceptions import (
    NotFoundException,
    ProcessingException,
    SAM3ServiceException,
    ServiceUnavailableException,
    ValidationException,
)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle FastAPI validation errors (422).
    
    Converts Pydantic validation errors to standardized 400 responses.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"Validation error: request_id={request_id}, "
        f"path={request.url.path}, errors={exc.errors()}"
    )
    
    error_details = {
        "validation_errors": exc.errors(),
        "body": exc.body if hasattr(exc, "body") else None,
    }
    
    error_response = ErrorResponse(
        error="Validation Error",
        detail="Request validation failed. Check the validation_errors field for details.",
        request_id=request_id,
        timestamp=datetime.utcnow(),
        details=error_details,
    )
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=error_response.model_dump(mode="json"),
    )


async def pydantic_validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """
    Handle Pydantic validation errors.
    
    Converts Pydantic validation errors to standardized 400 responses.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"Pydantic validation error: request_id={request_id}, "
        f"path={request.url.path}, errors={exc.errors()}"
    )
    
    error_response = ErrorResponse(
        error="Validation Error",
        detail="Data validation failed",
        request_id=request_id,
        timestamp=datetime.utcnow(),
        details={"validation_errors": exc.errors()},
    )
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=error_response.model_dump(mode="json"),
    )


async def sam3_service_exception_handler(
    request: Request, exc: SAM3ServiceException
) -> JSONResponse:
    """
    Handle custom SAM3 service exceptions.
    
    Provides standardized error responses for application-specific errors.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    if exc.status_code >= 500:
        logger.error(
            f"SAM3 service exception: request_id={request_id}, "
            f"status={exc.status_code}, error={exc.message}"
        )
    else:
        logger.warning(
            f"SAM3 service exception: request_id={request_id}, "
            f"status={exc.status_code}, error={exc.message}"
        )
    
    error_response = ErrorResponse(
        error=exc.__class__.__name__.replace("Exception", " Error"),
        detail=exc.message,
        request_id=request_id,
        timestamp=datetime.utcnow(),
        details=exc.details,
    )
    
    headers = {}
    if isinstance(exc, ServiceUnavailableException) and exc.retry_after:
        headers["Retry-After"] = str(exc.retry_after)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode="json"),
        headers=headers,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions.
    
    Logs full stack trace and returns generic 500 error to client.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.exception(
        f"Unhandled exception: request_id={request_id}, "
        f"path={request.url.path}, error={str(exc)}"
    )
    
    error_response = ErrorResponse(
        error="Internal Server Error",
        detail="An unexpected error occurred. Please try again later.",
        request_id=request_id,
        timestamp=datetime.utcnow(),
        details={
            "error_type": exc.__class__.__name__,
            "traceback": traceback.format_exc(),
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(mode="json"),
    )


def register_error_handlers(app) -> None:
    """
    Register all error handlers with the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)
    app.add_exception_handler(ValidationException, sam3_service_exception_handler)
    app.add_exception_handler(NotFoundException, sam3_service_exception_handler)
    app.add_exception_handler(ProcessingException, sam3_service_exception_handler)
    app.add_exception_handler(ServiceUnavailableException, sam3_service_exception_handler)
    app.add_exception_handler(SAM3ServiceException, sam3_service_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("Error handlers registered")
