# Implementation Plan

- [x] 1. Set up project structure and configuration





  - Create MVVM directory structure (models/, services/, api/)
  - Implement Settings class with environment variable loading
  - Create .env.example file with all configuration options
  - Set up logging configuration with JSON and text formatters
  - _Requirements: 1.1, 1.2, 9.4, 10.3_



- [x] 2. Implement Model layer core components



- [ ] 2.1 Create Pydantic schemas for requests and responses
  - Define BoundingBox, MaskMetadata, SegmentationResponse schemas
  - Define WebSocketMessage schema with type discriminators
  - Define ErrorResponse schema for standardized error handling


  - Add validation rules for file types and sizes
  - _Requirements: 2.2, 4.1, 4.2, 4.3, 4.4, 8.2_




- [x] 2.2 Implement SAM3Model wrapper class


  - Create SAM3Model class with async load() method
  - Implement detect() method wrapping existing Sam3Detector
  - Add get_health_status() method for health checks
  - Implement proper error handling for model loading failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.5_



- [ ] 3. Implement ViewModel layer services

- [ ] 3.1 Create FileService for file management
  - Implement save_upload() for storing uploaded files
  - Implement save_mask() to convert tensors to PNG files
  - Implement get_result_path() for file path resolution
  - Implement cleanup_old_results() with age-based deletion


  - Create uploads/ and outputs/ directories on initialization
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 3.2 Implement SegmentationService orchestration
  - Create process_segmentation() main workflow method



  - Implement _extract_prompts_from_metadata() to parse JSON objects


  - Implement _generate_mask_images() to save masks as PNG files
  - Implement _calculate_mask_metadata() for centroids and areas
  - Add progress callback support for WebSocket updates
  - Handle errors and wrap in ErrorResponse
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 7.1, 7.2, 7.3, 7.4_



- [ ] 3.3 Implement WebSocketManager for real-time communication
  - Create connection management with active_connections dict
  - Implement connect() and disconnect() methods
  - Implement send_progress() for progress updates
  - Implement send_result() for final results


  - Implement send_error() for error messages
  - Handle connection cleanup and task cancellation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Implement View layer API endpoints





- [ ] 4.1 Create REST API router for segmentation
  - Implement POST /api/v1/segment endpoint with multipart form handling
  - Implement GET /api/v1/results/{result_id} endpoint
  - Implement GET /health endpoint with model status




  - Add request validation and error responses
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 6.3, 10.1_

- [ ] 4.2 Create WebSocket endpoint for real-time segmentation
  - Implement /ws/segment WebSocket endpoint
  - Handle client connection and message parsing




  - Integrate with WebSocketManager for broadcasting
  - Process segmentation requests with progress callbacks
  - Handle disconnection and cleanup
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_







- [ ] 4.3 Configure FastAPI application with middleware
  - Create FastAPI app instance with metadata

  - Configure CORS middleware with allowed origins
  - Add startup event to load SAM3 model
  - Add startup task for periodic cleanup


  - Mount static files for outputs directory

  - Include routers for segmentation and WebSocket
  - _Requirements: 1.1, 1.2, 6.5, 9.1, 9.2, 9.3, 9.5_

- [x] 5. Implement dependency injection and lifecycle management




  - Create get_sam3_model() dependency
  - Create get_segmentation_service() dependency
  - Create get_file_service() dependency
  - Create get_ws_manager() dependency with singleton pattern
  - Implement proper cleanup on shutdown


  - _Requirements: 8.5_

- [ ] 6. Add comprehensive error handling and logging

  - Implement structured logging with request context
  - Add error handlers for validation errors (400)
  - Add error handlers for processing errors (500)
  - Add error handlers for not found errors (404)
  - Add error handlers for service unavailable (503)
  - Log all requests with timestamps and identifiers
  - _Requirements: 1.3, 2.4, 3.5, 10.1, 10.2, 10.3, 10.5_

- [ ] 7. Implement metrics and monitoring endpoint

  - Create metrics collection system
  - Track request count, success/error rates
  - Track average processing time
  - Implement GET /metrics endpoint
  - _Requirements: 10.4_

- [x] 8. Create frontend integration components

- [x] 8.1 Create Zustand store for segmentation state
  - Define SegmentationState interface
  - Implement uploadImage() action with fetch API
  - Implement selectMask() and clearResults() actions
  - Add error handling and loading states
  - _Requirements: 4.1, 4.2, 7.1_

- [x] 8.2 Create WebSocket hook for real-time updates
  - Implement useSegmentationWebSocket hook
  - Handle WebSocket connection lifecycle
  - Parse and dispatch progress, result, and error messages
  - Implement sendSegmentationRequest() method
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8.3 Create MaskViewer component for interactive visualization
  - Implement MaskViewer component with image overlay
  - Add hover detection for mask highlighting
  - Add click handling for mask selection
  - Display tooltips with label and confidence
  - Position masks using bounding box coordinates
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 8.4 Integrate segmentation into existing WorkspacePanel

  - Add file upload controls to WorkspacePanel
  - Connect to segmentation store
  - Replace or extend ImageViewer with MaskViewer
  - Add UI for selecting between original and masked views
  - _Requirements: 4.1, 7.1_
-

- [x] 9. Write unit tests for core components





  - Write tests for Pydantic schema validation
  - Write tests for SAM3Model with mocked processor
  - Write tests for FileService operations
  - Write tests for SegmentationService workflow with mocks
  - Write tests for WebSocketManager connection lifecycle
  - _Requirements: All_

- [ ]* 10. Write integration tests for API endpoints
  - Write test for POST /api/v1/segment with sample image
  - Write test for GET /api/v1/results/{result_id}
  - Write test for GET /health endpoint
  - Write test for WebSocket connection and messaging
  - Write test for error handling scenarios
  - _Requirements: All_

- [ ] 11. Create documentation and deployment files
  - Write README.md with setup instructions
  - Create Dockerfile for containerization
  - Create docker-compose.yml for local development
  - Document API endpoints with OpenAPI examples
  - Add example curl commands for testing
  - _Requirements: All_
