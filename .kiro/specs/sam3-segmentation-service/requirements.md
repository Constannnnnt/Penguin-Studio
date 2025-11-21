# Requirements Document

## Introduction

This document specifies the requirements for a SAM3-based image segmentation service that follows MVVM (Model-View-ViewModel) architecture. The system provides real-time image segmentation capabilities through a FastAPI backend, processes images and JSON metadata, generates segmentation masks, and delivers results to a React frontend for interactive visualization. The service enables users to upload images, receive segmented masks, and interact with detected objects through a web interface.

## Glossary

- **SAM3_Service**: The FastAPI-based backend application that hosts the SAM3 model and provides segmentation endpoints
- **SAM3_Model**: The Segment Anything Model 3 used for image segmentation and object detection
- **Segmentation_Request**: An HTTP request containing an image file and optional JSON metadata for processing
- **Segmentation_Response**: The API response containing the original image, segmentation masks, bounding boxes, and metadata
- **Mask_Overlay**: A visual representation of segmentation masks overlaid on the original image
- **Frontend_Client**: The React-based web application that consumes the segmentation service
- **WebSocket_Channel**: A bidirectional communication channel for real-time updates between backend and frontend
- **Detection_Result**: A data structure containing boxes, scores, labels, and masks from SAM3 processing
- **MVVM_Architecture**: Model-View-ViewModel architectural pattern separating business logic, data, and presentation

## Requirements

### Requirement 1

**User Story:** As a backend developer, I want the SAM3 model to be loaded and ready when the FastAPI service starts, so that segmentation requests can be processed immediately without initialization delays

#### Acceptance Criteria

1. WHEN THE SAM3_Service starts, THE SAM3_Service SHALL load the SAM3_Model into memory with the configured device (CUDA or CPU)
2. WHEN THE SAM3_Model loading completes, THE SAM3_Service SHALL log the successful initialization with device information and model readiness status
3. IF THE SAM3_Model fails to load, THEN THE SAM3_Service SHALL log the error details and exit with a non-zero status code
4. THE SAM3_Service SHALL expose a health check endpoint that returns the model readiness status
5. WHILE THE SAM3_Service is running, THE SAM3_Service SHALL maintain the SAM3_Model in memory for request processing

### Requirement 2

**User Story:** As an API consumer, I want to submit images and optional JSON metadata for segmentation, so that I can receive detected objects and their masks

#### Acceptance Criteria

1. THE SAM3_Service SHALL provide a POST endpoint at `/api/v1/segment` that accepts multipart form data with image and optional JSON files
2. WHEN a Segmentation_Request is received, THE SAM3_Service SHALL validate that the image file is in PNG, JPG, or JPEG format
3. WHEN a Segmentation_Request includes JSON metadata, THE SAM3_Service SHALL parse the objects array and extract description fields for prompts
4. IF the image format is invalid, THEN THE SAM3_Service SHALL return HTTP 400 with a descriptive error message
5. THE SAM3_Service SHALL support image files up to 10 megabytes in size

### Requirement 3

**User Story:** As a backend developer, I want the service to process images using SAM3 with extracted prompts, so that accurate segmentation masks are generated for detected objects

#### Acceptance Criteria

1. WHEN THE SAM3_Service receives a valid Segmentation_Request, THE SAM3_Service SHALL extract text prompts from the JSON metadata or use default prompts
2. THE SAM3_Service SHALL invoke the SAM3_Model with the image and extracted prompts to generate Detection_Result
3. WHEN THE SAM3_Model completes processing, THE SAM3_Service SHALL extract bounding boxes, confidence scores, labels, and binary masks from the Detection_Result
4. THE SAM3_Service SHALL convert mask tensors to serializable format (base64-encoded PNG or numpy arrays)
5. IF THE SAM3_Model processing fails, THEN THE SAM3_Service SHALL return HTTP 500 with error details and request identifier

### Requirement 4

**User Story:** As a frontend developer, I want to receive segmentation results in a structured JSON format, so that I can visualize masks and enable user interaction with detected objects

#### Acceptance Criteria

1. THE SAM3_Service SHALL return a Segmentation_Response containing the original image URL, array of segmentation masks, bounding boxes, labels, and confidence scores
2. WHEN THE SAM3_Service generates a Segmentation_Response, THE SAM3_Service SHALL include unique identifiers for each detected object
3. THE SAM3_Service SHALL encode segmentation masks as base64 PNG images or provide URLs to stored mask files
4. THE SAM3_Service SHALL include bounding box coordinates in XYXY format normalized to image dimensions
5. THE SAM3_Service SHALL return the response within 5 seconds for images under 2 megapixels

### Requirement 5

**User Story:** As a frontend developer, I want to establish a WebSocket connection for real-time segmentation updates, so that users can see processing progress and results immediately

#### Acceptance Criteria

1. THE SAM3_Service SHALL provide a WebSocket endpoint at `/ws/segment` for real-time communication
2. WHEN a Frontend_Client connects to the WebSocket_Channel, THE SAM3_Service SHALL send a connection acknowledgment message
3. WHEN THE SAM3_Service processes a segmentation request, THE SAM3_Service SHALL send progress updates (0-100%) through the WebSocket_Channel
4. WHEN THE SAM3_Service completes segmentation, THE SAM3_Service SHALL send the complete Segmentation_Response through the WebSocket_Channel
5. IF the WebSocket_Channel disconnects during processing, THEN THE SAM3_Service SHALL cancel the associated segmentation task

### Requirement 6

**User Story:** As a system administrator, I want the service to store processed images and masks temporarily, so that results can be retrieved and displayed in the frontend

#### Acceptance Criteria

1. THE SAM3_Service SHALL create an outputs directory for storing processed images and segmentation masks
2. WHEN THE SAM3_Service completes segmentation, THE SAM3_Service SHALL save the original image and each mask as separate PNG files with unique identifiers
3. THE SAM3_Service SHALL provide a GET endpoint at `/api/v1/results/{result_id}` to retrieve stored segmentation results
4. THE SAM3_Service SHALL automatically delete result files older than 24 hours to manage storage
5. THE SAM3_Service SHALL serve static files from the outputs directory with appropriate CORS headers for frontend access

### Requirement 7

**User Story:** As a frontend developer, I want to receive mask metadata including object labels and positions, so that I can implement interactive hover and click functionality

#### Acceptance Criteria

1. THE SAM3_Service SHALL include object labels, bounding box coordinates, and confidence scores in the Segmentation_Response
2. WHEN a Frontend_Client requests mask metadata, THE SAM3_Service SHALL return a mapping of mask identifiers to object descriptions
3. THE SAM3_Service SHALL provide pixel coordinates for mask centroids to enable tooltip positioning
4. THE SAM3_Service SHALL include mask area in pixels and percentage of total image area
5. WHERE the JSON metadata includes relationship information, THE SAM3_Service SHALL include object relationships in the response

### Requirement 8

**User Story:** As a backend developer, I want to implement MVVM architecture with clear separation of concerns, so that the codebase is maintainable and testable

#### Acceptance Criteria

1. THE SAM3_Service SHALL organize code into Model (data and business logic), View (API endpoints), and ViewModel (data transformation) layers
2. THE SAM3_Service SHALL define Pydantic models for all request and response schemas in the Model layer
3. THE SAM3_Service SHALL implement service classes in the ViewModel layer that orchestrate SAM3_Model operations and data transformations
4. THE SAM3_Service SHALL implement FastAPI routers in the View layer that handle HTTP requests and delegate to ViewModel services
5. THE SAM3_Service SHALL use dependency injection for SAM3_Model and configuration to enable testing with mocks

### Requirement 9

**User Story:** As a frontend developer, I want the API to support CORS for the React application, so that the frontend can make cross-origin requests to the backend

#### Acceptance Criteria

1. THE SAM3_Service SHALL configure CORS middleware to allow requests from the frontend origin (http://localhost:5173)
2. THE SAM3_Service SHALL allow GET, POST, PUT, DELETE, and OPTIONS HTTP methods in CORS configuration
3. THE SAM3_Service SHALL allow Content-Type, Authorization, and X-Request-ID headers in CORS configuration
4. WHERE the service is deployed to production, THE SAM3_Service SHALL read allowed origins from environment variables
5. THE SAM3_Service SHALL include appropriate CORS headers in all API responses

### Requirement 10

**User Story:** As a system operator, I want comprehensive logging and error handling, so that I can monitor service health and debug issues effectively

#### Acceptance Criteria

1. THE SAM3_Service SHALL log all incoming requests with timestamp, endpoint, and request identifier
2. WHEN an error occurs during processing, THE SAM3_Service SHALL log the full stack trace with request context
3. THE SAM3_Service SHALL implement structured logging with JSON format for production environments
4. THE SAM3_Service SHALL expose a `/metrics` endpoint with request count, error rate, and average processing time
5. IF THE SAM3_Model encounters an out-of-memory error, THEN THE SAM3_Service SHALL log the error and return HTTP 503 with retry-after header
