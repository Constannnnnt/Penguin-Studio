"""Custom exception classes for the application."""

from typing import Any, Dict, Optional


class SAM3ServiceException(Exception):
    """Base exception for SAM3 service errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(SAM3ServiceException):
    """Exception for validation errors (400)."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class NotFoundException(SAM3ServiceException):
    """Exception for resource not found errors (404)."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, details=details)


class ProcessingException(SAM3ServiceException):
    """Exception for processing errors (500)."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=500, details=details)


class ServiceUnavailableException(SAM3ServiceException):
    """Exception for service unavailable errors (503)."""

    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, status_code=503, details=details)
        self.retry_after = retry_after
