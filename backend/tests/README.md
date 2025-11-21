# Unit Tests for SAM3 Segmentation Service

This directory contains comprehensive unit tests for the core components of the SAM3 Segmentation Service.

## Test Coverage

### 1. Schema Validation Tests (`test_schemas.py`)
Tests for Pydantic schema validation covering:
- **BoundingBox**: Coordinate validation, negative value rejection
- **MaskMetadata**: Confidence range validation, area validation
- **SegmentationResponse**: Response structure, processing time validation
- **WebSocketMessage**: Message type validation, data structure
- **ErrorResponse**: Error formatting and details
- **SegmentationRequest**: Prompt validation, empty list rejection
- **FileValidation**: Image type validation, file size limits

**Total Tests**: 26

### 2. SAM3Model Tests (`test_sam3_model.py`)
Tests for SAM3Model wrapper with mocked processor:
- Model initialization and configuration
- Health status reporting before and after loading
- Successful and failed model loading
- Detection with single and multiple prompts
- Empty prompt filtering
- No detection scenarios
- Error handling for unloaded model and processor failures

**Total Tests**: 13

### 3. FileService Tests (`test_file_service.py`)
Tests for file management operations:
- Service initialization with temporary directories
- Upload file saving with result ID organization
- File extension preservation
- Mask tensor saving (4D, 3D, boolean, float)
- Mask format conversion (bool to uint8, float to uint8)
- Result path resolution
- Old result cleanup with age-based deletion
- Recent result preservation
- Unique result ID generation
- Error handling for read failures and invalid tensors

**Total Tests**: 15

### 4. SegmentationService Tests (`test_segmentation_service.py`)
Tests for segmentation workflow orchestration with mocks:
- Basic segmentation workflow
- Metadata file parsing and prompt extraction
- Progress callback integration
- Default prompt usage
- Prompt extraction from various metadata formats (description, label, name)
- Empty prompt filtering
- Mixed field type handling
- Invalid metadata format handling
- JSON parsing (valid and invalid)
- Detection error handling

**Total Tests**: 14

### 5. WebSocketManager Tests (`test_websocket_manager.py`)
Tests for WebSocket connection lifecycle:
- Manager initialization
- Connection acceptance and registration
- Multiple client connections
- Disconnection and cleanup
- Active task cancellation on disconnect
- Progress update sending
- Result message sending
- Error message sending
- Message sending to disconnected clients
- Send error handling with automatic disconnection
- Task registration
- Connection status checking
- Connection count tracking
- Multiple progress updates
- WebSocket accept and close error handling

**Total Tests**: 17

## Running Tests

### Run all tests:
```bash
uv run python -m pytest tests/ -q --tb=short
```

### Run specific test file:
```bash
uv run python -m pytest tests/test_schemas.py -q --tb=short
```

### Run with verbose output:
```bash
uv run python -m pytest tests/ -v
```

### Run specific test:
```bash
uv run python -m pytest tests/test_schemas.py::TestBoundingBox::test_valid_bounding_box -v
```

## Test Configuration

Tests use:
- **pytest**: Test framework
- **pytest-asyncio**: Async test support
- **unittest.mock**: Mocking dependencies
- **tmp_path**: Pytest fixture for temporary directories

## Mocking Strategy

- **SAM3 Model**: Mocked to avoid loading actual model weights
- **File Operations**: Use temporary directories for isolation
- **WebSocket**: Mocked WebSocket connections
- **Detection Results**: Synthetic torch tensors for testing

## Coverage Summary

Total unit tests: **85**
All tests passing: ✓

The tests focus on:
- Core functional logic validation
- Error handling and edge cases
- Input validation and sanitization
- Service integration with mocked dependencies
- Async operation correctness
