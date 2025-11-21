# Requirements Document

## Introduction

This document specifies the requirements for integrating the Penguin frontend application with the SAM3 segmentation backend service. The system enables users to simulate image generation by loading local example images, uploading them to the library, processing them through SAM3 for object detection and segmentation, and displaying interactive mask overlays with metadata visualization. The integration provides a complete workflow from mockup generation through segmentation to interactive object exploration.

## Glossary

- **Penguin Application**: The React frontend application with IDE-like layout for image generation and management
- **SAM3 Backend**: The FastAPI backend service that provides image segmentation using the SAM3 model
- **Library Panel**: The left panel in the IDE layout that displays uploaded images and project files
- **Image Viewer**: The central workspace component that displays images with overlay capabilities
- **Controls Panel**: The right panel containing tabbed controls including object metadata display
- **Upload for Segmentation Button**: A mockup button that simulates generation by loading local example images
- **Segmentation Request**: An API call to the SAM3 backend containing an image and optional JSON metadata
- **Mask Overlay**: A visual layer displaying segmentation masks on top of the original image
- **Object Metadata Panel**: A tab in the Controls Panel showing detailed information about detected objects
- **Hover Interaction**: User action of moving the mouse over a mask to highlight and display object information
- **Library Upload**: The process of adding a generated/loaded image to the Library Panel for persistent access
- **Example Data**: Local image and JSON files stored in backend/examples used for mockup simulation

## Requirements

### Requirement 1

**User Story:** As a user, I want to click "Upload for Segmentation" to simulate generation with local examples, so that I can test the segmentation workflow without actual generation

#### Acceptance Criteria

1. THE Controls Panel SHALL provide an "Upload for Segmentation" button in the Generation Controls tab
2. WHEN a user clicks the Upload for Segmentation button, THE Penguin Application SHALL load a predefined example image from the backend examples directory
3. THE Penguin Application SHALL load the corresponding JSON metadata file that matches the example image
4. THE Penguin Application SHALL display the loaded image in the Image Viewer within 500 milliseconds
5. THE Penguin Application SHALL show a loading indicator during the image loading process

### Requirement 2

**User Story:** As a user, I want loaded images automatically added to the library, so that I can access them later without reloading

#### Acceptance Criteria

1. WHEN an example image is loaded via Upload for Segmentation, THE Penguin Application SHALL add the image to the Library Panel
2. THE Library Panel SHALL display the newly added image with a thumbnail and filename
3. THE Library Panel SHALL organize images by upload timestamp with most recent first
4. WHEN a user clicks on a library image, THE Image Viewer SHALL display that image
5. THE Penguin Application SHALL persist library entries in browser local storage

### Requirement 3

**User Story:** As a user, I want the loaded image and JSON automatically sent to SAM3 for segmentation, so that object detection happens seamlessly

#### Acceptance Criteria

1. WHEN an image is loaded via Upload for Segmentation, THE Penguin Application SHALL send a POST request to the SAM3 Backend at `/api/v1/segment`
2. THE Penguin Application SHALL include the image file in the multipart form data request
3. THE Penguin Application SHALL include the JSON metadata file in the multipart form data request
4. THE Penguin Application SHALL extract object descriptions from the JSON metadata to use as segmentation prompts
5. THE Penguin Application SHALL display a processing indicator while waiting for the SAM3 Backend response

### Requirement 4

**User Story:** As a user, I want segmentation masks overlaid on the original image, so that I can see detected objects visually

#### Acceptance Criteria

1. WHEN THE SAM3 Backend returns segmentation results, THE Image Viewer SHALL overlay all mask images on the original image
2. THE Image Viewer SHALL render masks with 40% opacity to allow viewing the original image underneath
3. THE Image Viewer SHALL position each mask according to its bounding box coordinates
4. THE Image Viewer SHALL assign each mask a unique color for visual distinction
5. THE Image Viewer SHALL render masks in order of confidence score with highest confidence on top

### Requirement 5

**User Story:** As a user, I want to hover over masks to see which object they represent, so that I can identify detected objects interactively

#### Acceptance Criteria

1. WHEN a user hovers the mouse over a mask, THE Image Viewer SHALL highlight that mask by increasing its opacity to 70%
2. WHEN a user hovers over a mask, THE Image Viewer SHALL display a tooltip showing the object label and confidence score
3. WHEN a user hovers over a mask, THE Controls Panel SHALL display the full object metadata in the Object Metadata Panel
4. WHEN a user moves the mouse away from a mask, THE Image Viewer SHALL return the mask to its default 40% opacity
5. THE Image Viewer SHALL update hover states within 50 milliseconds for responsive interaction

### Requirement 6

**User Story:** As a user, I want an Object Panel showing details about clicked objects, so that I can see comprehensive information from the original JSON

#### Acceptance Criteria

1. THE Controls Panel SHALL provide an "Object" tab as a sixth tab alongside other buttons/tabs under the Generation COntrols (with a title Description)
2. WHEN a user clicks a mask, THE Object Panel SHALL display the object's description from the original JSON
3. WHERE the JSON includes additional properties, THE Object Panel SHALL display those properties in a structured format

### Requirement 7

**User Story:** As a user, I want the system to handle multiple example images, so that I can test segmentation with different scenes

#### Acceptance Criteria

1. THE Penguin Application SHALL support loading any image from the backend/examples directory
2. THE Penguin Application SHALL provide a dropdown or selection UI to choose which example to load
3. WHEN a user selects a different example, THE Penguin Application SHALL clear previous segmentation results
4. THE Penguin Application SHALL load the new example image and JSON metadata
5. THE Penguin Application SHALL automatically trigger segmentation for the newly selected example

### Requirement 9

**User Story:** As a user, I want error handling for failed segmentation requests, so that I understand when something goes wrong

#### Acceptance Criteria

1. IF THE SAM3 Backend returns an error response, THEN THE Penguin Application SHALL display an error message to the user
2. THE Penguin Application SHALL display specific error messages for common failures including network errors, invalid image format, and backend unavailability
3. WHEN a segmentation request fails, THE Penguin Application SHALL provide a "Retry" button to attempt the request again
4. THE Penguin Application SHALL log detailed error information to the browser console for debugging
5. THE Penguin Application SHALL clear any loading indicators when an error occurs

### Requirement 10

**User Story:** As a user, I want real-time progress updates during segmentation, so that I know the system is processing my request

#### Acceptance Criteria

1. THE Penguin Application SHALL establish a WebSocket connection to the SAM3 Backend at `/ws/segment`
2. WHEN segmentation is in progress, THE Penguin Application SHALL display a progress bar showing completion percentage
3. THE Penguin Application SHALL update the progress bar in real-time as progress messages are received from the backend
4. THE Penguin Application SHALL display status messages such as "Loading model", "Processing image", and "Generating masks"
5. WHEN segmentation completes, THE Penguin Application SHALL hide the progress indicator and display the results

### Requirement 11

**User Story:** As a user, I want to click on masks to select objects, so that I can keep object metadata visible without hovering

#### Acceptance Criteria

1. WHEN a user clicks on a mask, THE Image Viewer SHALL select that mask and keep it highlighted
2. WHEN a mask is selected, THE Object Metadata Panel SHALL display that object's information persistently
3. WHEN a user clicks on a different mask, THE Image Viewer SHALL deselect the previous mask and select the new one
4. WHEN a user clicks on empty space in the Image Viewer, THE Image Viewer SHALL deselect any selected mask
5. THE Image Viewer SHALL indicate selected masks with a distinct border color different from hover highlighting

### Requirement 12

**User Story:** As a user, I want to toggle mask visibility, so that I can compare the original image with segmented results

#### Acceptance Criteria

1. THE Image Viewer SHALL provide a "Show Masks" toggle button
2. WHEN a user clicks the Show Masks toggle, THE Image Viewer SHALL hide all mask overlays
3. WHEN masks are hidden and the user clicks the toggle again, THE Image Viewer SHALL show all mask overlays
4. THE Penguin Application SHALL persist the mask visibility state during the user session
5. THE Image Viewer SHALL display the current mask visibility state clearly in the toggle button

### Requirement 13

**User Story:** As a developer, I want a centralized state management for segmentation data, so that components can access results consistently

#### Acceptance Criteria

1. THE Penguin Application SHALL create a Zustand store for segmentation state management
2. THE segmentation store SHALL maintain the current segmentation results including masks, bounding boxes, and metadata
3. THE segmentation store SHALL maintain the selected mask ID and hovered mask ID
4. THE segmentation store SHALL provide actions for uploading images, selecting masks, and clearing results
5. THE segmentation store SHALL handle API communication with the SAM3 Backend

### Requirement 14

**User Story:** As a user, I want smooth animations when interacting with masks, so that the interface feels polished and responsive

#### Acceptance Criteria

1. WHEN a mask is hovered, THE Image Viewer SHALL animate the opacity change over 150 milliseconds
2. WHEN a mask is selected, THE Image Viewer SHALL animate the border appearance over 200 milliseconds
3. WHEN the Object Metadata Panel updates, THE Controls Panel SHALL fade in the new content over 100 milliseconds
4. THE Penguin Application SHALL use CSS transitions for all mask interaction animations
5. THE Penguin Application SHALL ensure animations do not impact interaction responsiveness