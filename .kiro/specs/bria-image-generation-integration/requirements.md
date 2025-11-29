# Requirements Document

## Introduction

This document specifies the requirements for integrating Bria's FIBO image generation API into the application. The integration enables users to generate high-quality, commercially-licensed images from text prompts, automatically process them through the existing SAM3 segmentation pipeline, and refine generated images using structured prompts. This creates a complete workflow from text prompt to segmented, editable scene.

## Glossary

- **Bria API**: Bria's commercial image generation service using the FIBO model
- **FIBO**: Bria's next-generation visual model trained on structured JSON descriptions
- **VLM Bridge**: Vision-Language Model that translates text/images into structured prompts
- **Structured Prompt**: Detailed JSON description of an image used by FIBO for generation
- **Generation Endpoint**: API endpoint that generates images from prompts
- **Refinement Endpoint**: API endpoint that refines images using structured prompts
- **Seed**: Random seed value for deterministic image generation
- **Image Workspace**: Text input area where users enter generation prompts
- **Auto-Processing**: Automatic segmentation of generated images without manual upload

## Requirements

### Requirement 1

**User Story:** As a user, I want to generate images from text prompts, so that I can create custom scenes for editing.

#### Acceptance Criteria

1. WHEN a user enters a text prompt in the workspace input area THEN the system SHALL display the prompt in the UI
2. WHEN a user clicks the "Generate" button THEN the system SHALL send the prompt to the Bria API
3. WHEN the API returns a generated image THEN the system SHALL display the image in the workspace
4. WHEN the API returns a structured prompt THEN the system SHALL store it with the image
5. WHEN the API returns a seed value THEN the system SHALL store it for potential refinement

### Requirement 2

**User Story:** As a user, I want generated images to be automatically processed, so that I can immediately start editing objects.

#### Acceptance Criteria

1. WHEN an image is successfully generated THEN the system SHALL automatically send it to the SAM3 segmentation service
2. WHEN segmentation completes THEN the system SHALL display detected objects with masks
3. WHEN segmentation completes THEN the system SHALL populate object metadata from the structured prompt
4. WHEN segmentation completes THEN the system SHALL enable all editing features
5. WHEN auto-processing fails THEN the system SHALL display an error and allow manual retry

### Requirement 4

**User Story:** As a user, I want to refine generated images by editing their structured prompts, so that I can make precise adjustments.

#### Acceptance Criteria

1. WHEN a user edits object metadata or scene configuration THEN the system SHALL update the stored structured prompt
2. WHEN a user clicks "Refine" THEN the system SHALL send the updated structured prompt and original seed to the API
3. WHEN refinement completes THEN the system SHALL replace the current image with the refined version
4. WHEN refinement completes THEN the system SHALL automatically re-segment the refined image
5. WHEN refinement fails THEN the system SHALL preserve the original image and display an error

### Requirement 5

**User Story:** As a user, I want to provide reference images with my prompts, so that I can generate images inspired by existing visuals.

#### Acceptance Criteria

1. WHEN a user uploads a reference image THEN the system SHALL display it in the workspace
2. WHEN a user enters a prompt with a reference image THEN the system SHALL send both to the API
3. WHEN the API processes the reference image THEN the system SHALL generate an image inspired by it
4. WHEN using a reference image THEN the system SHALL support the same refinement workflow
5. WHEN a reference image is removed THEN the system SHALL revert to text-only generation

### Requirement 6

**User Story:** As a developer, I want to store generated images and metadata, so that users can access their generation history.

#### Acceptance Criteria

1. WHEN an image is generated THEN the system SHALL save it to a designated images folder
2. WHEN an image is generated THEN the system SHALL save the structured prompt as a JSON file
3. WHEN an image is generated THEN the system SHALL save the seed value with the metadata
4. WHEN an image is generated THEN the system SHALL save the original text prompt
5. WHEN an image is generated THEN the system SHALL create a unique identifier linking all related files

### Requirement 7

**User Story:** As a user, I want to see generation progress, so that I know the system is working.

#### Acceptance Criteria

1. WHEN generation starts THEN the system SHALL display a loading indicator
2. WHILE generation is in progress THEN the system SHALL disable the generate button
3. WHEN generation completes THEN the system SHALL hide the loading indicator
4. WHEN generation duration exceeds 5 seconds THEN the system SHALL display a progress message
5. WHEN generation fails THEN the system SHALL display a specific error message

### Requirement 8

**User Story:** As a developer, I want to handle API errors gracefully, so that users receive helpful feedback.

#### Acceptance Criteria

1. WHEN the API returns a 401 error THEN the system SHALL display "Invalid API key"
2. WHEN the API returns a 429 error THEN the system SHALL display "Rate limit exceeded, please try again later"
3. WHEN the API returns a 500 error THEN the system SHALL display "Service temporarily unavailable"
4. WHEN the network request fails THEN the system SHALL display "Network error, check your connection"
5. WHEN an error occurs THEN the system SHALL log detailed error information for debugging

### Requirement 9

**User Story:** As a user, I want to configure generation parameters, so that I can control image characteristics.

#### Acceptance Criteria

1. WHEN the user accesses generation configuration THEN the system SHALL provide aspect ratio options (1:1, 16:9, 9:16, 4:3, 3:4)
2. WHEN the user accesses generation configuration THEN the system SHALL provide resolution options (512, 768, 1024)
3. WHEN the user accesses generation configuration THEN the system SHALL provide a custom seed input field for reproducibility
4. WHEN generation parameters are set THEN the system SHALL include them in the API request
5. WHEN generation parameters are not set THEN the system SHALL use default values

### Requirement 10

**User Story:** As a developer, I want to implement the Bria API client, so that all API interactions are centralized.

#### Acceptance Criteria

1. WHEN implementing the client THEN the system SHALL create a BriaAPIClient class or module
2. WHEN the client is initialized THEN the system SHALL require an API key
3. WHEN the client makes requests THEN the system SHALL include proper authentication headers
4. WHEN the client receives responses THEN the system SHALL parse and validate them
5. WHEN the client encounters errors THEN the system SHALL throw typed exceptions

### Requirement 11

**User Story:** As a user, I want IP-related prompts to be handled appropriately, so that I understand generation limitations.

#### Acceptance Criteria

1. WHEN the API detects IP-related content in a prompt THEN the system SHALL display a warning message
2. WHEN an IP warning is received THEN the system SHALL explain that results may differ from expectations
3. WHEN an IP warning is received THEN the system SHALL still display the generated image
4. WHEN an IP warning is received THEN the system SHALL log the warning for analytics
5. WHEN no IP warning is received THEN the system SHALL proceed normally

### Requirement 12

**User Story:** As a user, I want to save my generation settings, so that I don't have to reconfigure them each time.

#### Acceptance Criteria

1. WHEN generation settings are changed THEN the system SHALL persist them to local storage
2. WHEN the application loads THEN the system SHALL restore saved generation settings from local storage
3. WHEN loaded settings are invalid THEN the system SHALL use default values
4. WHEN the user resets settings THEN the system SHALL clear saved preferences from local storage
5. WHEN settings are saved THEN the system SHALL display visual confirmation

### Requirement 13

**User Story:** As a developer, I want to integrate with the existing segmentation pipeline, so that generated images flow seamlessly into the editing workflow.

#### Acceptance Criteria

1. WHEN an image is generated THEN the system SHALL convert it to the format expected by SAM3
2. WHEN calling segmentation THEN the system SHALL use the existing segmentation service
3. WHEN segmentation results arrive THEN the system SHALL use the existing result handling logic
4. WHEN populating metadata THEN the system SHALL map structured prompt fields to object metadata
5. WHEN the pipeline completes THEN the system SHALL enable the same editing features as uploaded images

### Requirement 14

**User Story:** As a user, I want to compare original and refined images, so that I can see the effect of my changes.

#### Acceptance Criteria

1. WHEN refinement completes THEN the system SHALL offer to display a before/after comparison
2. WHILE viewing comparison mode THEN the system SHALL display original and refined images side-by-side
3. WHILE viewing comparison mode THEN the system SHALL provide toggle controls between versions
4. WHEN a version is selected in comparison mode THEN the system SHALL set it as the active image
5. WHEN comparison mode is closed THEN the system SHALL return to normal editing mode

### Requirement 15

**User Story:** As a developer, I want to implement rate limiting and caching, so that API usage is optimized.

#### Acceptance Criteria

1. WHEN multiple generation requests are submitted within a short time period THEN the system SHALL queue them to respect API rate limits
2. WHEN a generation request is queued THEN the system SHALL display the wait time to the user
3. WHEN a generation request matches a cached result THEN the system SHALL offer to reuse the cached result
4. WHEN a cached result is used THEN the system SHALL display an indicator that the image is from cache
5. WHEN a cached result age exceeds 24 hours THEN the system SHALL regenerate the image instead of using cache
