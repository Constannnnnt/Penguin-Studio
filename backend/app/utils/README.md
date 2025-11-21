# Error Handling and Logging

This directory contains utilities for comprehensive error handling and logging in the SAM3 Segmentation Service.

## Components

### Custom Exceptions (`exceptions.py`)

Custom exception classes for different error scenarios:

- `ValidationException` (400): Input validation errors
- `NotFoundException` (404): Resource not found errors
- `ProcessingException` (500): Processing and internal errors
- `ServiceUnavailableException` (503): Service unavailable errors with retry-after support

All exceptions inherit from `SAM3ServiceException` and include:
- HTTP status code
- Error message
- Optional details dictionary for additional context

### Error Handlers (`error_handlers.py`)

FastAPI exception handlers that convert exceptions to standardized JSON responses:

- `validation_exception_handler`: Handles FastAPI/Pydantic validation errors
- `sam3_service_exception_handler`: Handles custom SAM3 exceptions
- `generic_exception_handler`: Catches all unhandled exceptions

All error responses follow the `ErrorResponse` schema with:
- Error type
- Detailed message
- Request ID for tracking
- Timestamp
- Additional details

### Request Logging Middleware (`middleware.py`)

- `RequestLoggingMiddleware`: Logs all HTTP requests with timing and context
- `RequestContextFilter`: Adds request ID to all log records

Features:
- Automatic request ID generation
- Request/response logging with duration
- Request ID in response headers
- Process time in response headers

### Logging Configuration (`logging.py`)

Configures structured logging with:
- JSON or text format support
- Request context in all logs
- Configurable log levels
- Custom JSON formatter for structured logs

## Usage

### Raising Custom Exceptions

```python
from app.utils.exceptions import ValidationException, NotFoundException

raise ValidationException(
    "Invalid image format",
    details={"received": "text/plain", "expected": ["image/png", "image/jpeg"]}
)

raise NotFoundException(
    "Result not found",
    details={"result_id": "abc123"}
)
```

### Error Response Format

```json
{
  "error": "Validation Error",
  "detail": "Invalid image format",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "received": "text/plain",
    "expected": ["image/png", "image/jpeg"]
  }
}
```

### Log Format

Text format:
```
2024-01-15 10:30:00 - app.api.routes.segmentation - INFO - [550e8400-e29b-41d4-a716-446655440000] - Received segmentation request
```

JSON format:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "logger": "app.api.routes.segmentation",
  "message": "Received segmentation request",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Configuration

Set in `.env` or environment variables:

```bash
LOG_LEVEL=INFO
LOG_FORMAT=json
```

## Testing

Run error handling tests:

```bash
uv run python -m pytest app/test_error_handling.py -k "asyncio" -q
```
