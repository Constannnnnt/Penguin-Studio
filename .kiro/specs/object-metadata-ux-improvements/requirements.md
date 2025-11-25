# Requirements Document

## Introduction

This specification addresses critical UX and functionality issues in the object segmentation interface. The system currently displays spatial information (bounding box, centroid, area) prominently while hiding rich semantic metadata (prompt, description, relationships, appearance details). Additionally, mask manipulation and image editing features are not functioning correctly, and the hover tooltip shows area instead of the more useful prompt text.

## Glossary

- **Mask**: A segmented region of an image representing a detected object
- **Object Metadata**: Semantic information about a detected object including description, location, relationship, size, shape, color, texture, appearance details, and orientation
- **Spatial Information**: Numerical data about mask position and size including bounding box coordinates, centroid, area in pixels, and area percentage
- **Prompt Text**: The text description used to identify or describe the object during segmentation
- **Mask Manipulation**: User interactions to move, resize, or transform masks on the canvas
- **Image Edits**: Visual filters applied to masks including brightness, contrast, saturation, hue, blur, exposure, and vibrance
- **Hover Tooltip**: Information displayed when the user hovers over a mask on the canvas
- **Object List**: The panel displaying all detected objects with their metadata
- **DraggableMaskOverlay**: The component that renders interactive masks on the canvas

## Requirements

### Requirement 1

**User Story:** As a user, I want to see rich semantic metadata about detected objects in the object list, so that I can understand what each object represents and its characteristics.

#### Acceptance Criteria

1. WHEN the object list displays detected objects THEN the system SHALL show prompt text, description, location, relationship, relative_size, shape_and_color, texture, appearance_details, and orientation for each object
2. WHEN object metadata is available THEN the system SHALL prioritize displaying semantic information over spatial information
3. WHEN the user expands an object in the list THEN the system SHALL display all available metadata fields with clear labels
4. WHEN metadata fields are empty or undefined THEN the system SHALL hide those fields rather than showing empty values
5. WHEN the object list renders THEN the system SHALL organize metadata into logical sections with semantic metadata displayed before spatial information

### Requirement 2

**User Story:** As a user, I want spatial information to be de-emphasized or hidden by default, so that I can focus on the semantic meaning of objects rather than technical coordinates.

#### Acceptance Criteria

1. WHEN the object list displays object details THEN the system SHALL place spatial information (bounding box, centroid, area) in a collapsible or secondary section
2. WHEN a user views object metadata THEN the system SHALL display semantic fields (description, appearance, relationships) before spatial coordinates
3. WHEN spatial information is displayed THEN the system SHALL use a visually de-emphasized style compared to semantic metadata
4. WHEN the user has not explicitly requested spatial data THEN the system SHALL collapse or hide the spatial information section by default
5. WHEN the user needs spatial information for debugging or technical purposes THEN the system SHALL provide an option to expand and view it

### Requirement 3

**User Story:** As a user, I want to see the object's prompt text when hovering over a mask on the canvas, so that I can quickly identify what each mask represents without checking the object list.

#### Acceptance Criteria

1. WHEN the user hovers over a mask on the canvas THEN the system SHALL display a tooltip containing the prompt text
2. WHEN prompt text is unavailable THEN the system SHALL display the object label as a fallback
3. WHEN the tooltip is displayed THEN the system SHALL position it near the cursor without obscuring the mask
4. WHEN the user moves the cursor away from the mask THEN the system SHALL hide the tooltip within 200 milliseconds
5. WHEN multiple masks overlap THEN the system SHALL display the tooltip for the topmost mask under the cursor

### Requirement 4

**User Story:** As a user, I want to drag masks to reposition them on the canvas, so that I can arrange objects for composition or editing purposes.

#### Acceptance Criteria

1. WHEN a user selects a mask and drags it THEN the system SHALL update the mask position in real-time following the cursor
2. WHEN dragging a mask THEN the system SHALL constrain the mask within the image boundaries
3. WHEN the user releases the mouse button THEN the system SHALL finalize the mask position and update the bounding box coordinates
4. WHEN a mask is dragged THEN the system SHALL update the location and relationship metadata to reflect the new position
5. WHEN dragging begins THEN the system SHALL provide visual feedback by changing the cursor to a grabbing state and reducing mask opacity

### Requirement 5

**User Story:** As a user, I want to resize masks using corner handles, so that I can adjust object boundaries for better composition or editing.

#### Acceptance Criteria

1. WHEN a mask is selected THEN the system SHALL display resize handles at all four corners (northwest, northeast, southwest, southeast)
2. WHEN the user drags a resize handle THEN the system SHALL update the mask size while maintaining the aspect ratio
3. WHEN resizing a mask THEN the system SHALL constrain the mask within the image boundaries
4. WHEN the user releases the resize handle THEN the system SHALL finalize the new size and update the bounding box, area, and relative_size metadata
5. WHEN resizing occurs THEN the system SHALL provide visual feedback with a dashed outline preview and appropriate resize cursor

### Requirement 6

**User Story:** As a user, I want to apply image edits (brightness, contrast, saturation, etc.) to selected masks, so that I can adjust the appearance of individual objects.

#### Acceptance Criteria

1. WHEN a mask is selected THEN the system SHALL enable image editing controls for that mask
2. WHEN the user adjusts brightness, contrast, exposure, or blur THEN the system SHALL apply the filter to the selected mask in real-time
3. WHEN the user adjusts saturation, hue, or vibrance THEN the system SHALL apply the color adjustment to the selected mask in real-time
4. WHEN image edits are applied THEN the system SHALL update the appearance_details and shape_and_color metadata to reflect the changes
5. WHEN the user resets a mask transform THEN the system SHALL remove all image edits and restore the original appearance

### Requirement 7

**User Story:** As a user, I want clear visual feedback that image edits apply to the selected mask, so that I understand which object is being modified.

#### Acceptance Criteria

1. WHEN image editing controls are visible THEN the system SHALL clearly indicate which mask is currently selected for editing
2. WHEN a mask has active image edits THEN the system SHALL display a visual indicator on the mask in the object list
3. WHEN the user hovers over image editing controls THEN the system SHALL provide tooltips explaining that edits apply to the selected mask
4. WHEN no mask is selected THEN the system SHALL disable or hide image editing controls
5. WHEN switching between masks THEN the system SHALL immediately update the image editing controls to reflect the newly selected mask's current edits

### Requirement 8

**User Story:** As a developer, I want the mask manipulation state to be properly synchronized with the UI, so that drag, resize, and edit operations work reliably.

#### Acceptance Criteria

1. WHEN the user initiates a drag operation THEN the system SHALL set the isDragging flag to true in the manipulation state
2. WHEN the user initiates a resize operation THEN the system SHALL set the isResizing flag to true and store the active resize handle
3. WHEN drag or resize operations complete THEN the system SHALL reset the appropriate flags and finalize the transformation
4. WHEN the manipulation state changes THEN the system SHALL trigger re-renders only for affected components
5. WHEN multiple masks exist THEN the system SHALL maintain independent manipulation states for each mask without interference
