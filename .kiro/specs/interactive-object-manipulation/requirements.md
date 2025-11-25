# Requirements Document

## Introduction

This document specifies the requirements for an enhanced interactive object manipulation system in the Penguin application. The system transforms the Objects tab from a simple metadata viewer into a comprehensive object inspector and manipulation interface. Users can view detailed JSON information for each detected object, see which prompt tier was used for segmentation, manipulate object positions and scales, and update metadata based on visual transformations. The system provides bidirectional synchronization between mask overlays and the object list, with hover interactions that navigate and highlight corresponding items.

## Glossary

- **Penguin Application**: The React frontend application with IDE-like layout for image generation and management
- **Objects Tab**: The tab in the Controls Panel that displays a list of all detected objects with their metadata
- **Object List**: A scrollable list showing all detected objects from the segmentation result
- **Object List Item**: A single entry in the object list representing one detected object
- **Mask Overlay**: A visual layer displaying segmentation masks on top of the original image
- **Hover Synchronization**: Bidirectional highlighting between mask overlays and object list items
- **Prompt Tier**: The level of detail used in the segmentation prompt (CORE, CORE_VISUAL, or CORE_VISUAL_SPATIAL)
- **Visual Indicator**: A semi-transparent overlay showing the original position of a moved mask
- **Object Manipulation**: User actions to move, scale, or transform mask overlays
- **Metadata Update**: Automatic modification of object properties based on visual transformations
- **Image Edit Tools**: Controls for adjusting visual properties like brightness, contrast, saturation
- **Original Position Indicator**: A gray overlay marking where a mask was before being moved

## Requirements

### Requirement 1

**User Story:** As a user, I want the Objects tab to display a list of all detected objects, so that I can see all objects in the image at a glance

#### Acceptance Criteria

1. THE Objects Tab SHALL display a scrollable list of all detected objects from the segmentation result
2. WHEN segmentation results are loaded, THE Objects Tab SHALL populate the list with one item per detected object
3. THE Objects Tab SHALL display objects in order of confidence score with highest confidence first
4. WHEN no segmentation results exist, THE Objects Tab SHALL display a message "No objects detected. Upload an image for segmentation."
5. THE Objects Tab SHALL update the list immediately when new segmentation results are received

### Requirement 2

**User Story:** As a user, I want each object list item to show core information, so that I can quickly identify objects

#### Acceptance Criteria

1. THE Object List Item SHALL display the object label prominently as a heading
2. THE Object List Item SHALL display the confidence score as a percentage with a visual progress bar
3. THE Object List Item SHALL display a small thumbnail preview of the mask
4. THE Object List Item SHALL use a colored border matching the mask overlay color for visual correlation
5. THE Object List Item SHALL be collapsible to show or hide detailed information

### Requirement 3

**User Story:** As a user, I want to see the exact prompt used for each object, so that I understand how it was detected

#### Acceptance Criteria

1. THE Object List Item SHALL display the prompt tier used for detection (CORE, CORE_VISUAL, or CORE_VISUAL_SPATIAL)
2. THE Object List Item SHALL display the exact prompt text sent to the SAM3 model
3. WHERE the prompt tier is CORE, THE Object List Item SHALL show only the core description
4. WHERE the prompt tier is CORE_VISUAL, THE Object List Item SHALL show the core description and visual attributes
5. WHERE the prompt tier is CORE_VISUAL_SPATIAL, THE Object List Item SHALL show the core description, visual attributes, and spatial context

### Requirement 4

**User Story:** As a user, I want to see all JSON metadata for each object, so that I can access complete object information

#### Acceptance Criteria

1. THE Object List Item SHALL display all properties from the original JSON metadata when expanded
2. THE Object List Item SHALL display the description field from the JSON
3. THE Object List Item SHALL display location, relationship, relative_size, shape_and_color, texture, appearance_details, and orientation fields
4. THE Object List Item SHALL format JSON properties in a readable key-value layout
5. THE Object List Item SHALL handle missing JSON properties gracefully by not displaying empty fields

### Requirement 5

**User Story:** As a user, I want hovering over a mask to highlight the corresponding list item, so that I can identify which object I'm looking at

#### Acceptance Criteria

1. WHEN a user hovers over a mask overlay, THE Objects Tab SHALL scroll to the corresponding object list item
2. WHEN a user hovers over a mask overlay, THE Objects Tab SHALL highlight the corresponding object list item with a distinct background color
3. WHEN a user hovers over a mask overlay, THE Objects Tab SHALL expand the corresponding object list item if it is collapsed
4. WHEN a user moves the mouse away from a mask, THE Objects Tab SHALL remove the highlight from the object list item
5. THE Objects Tab SHALL complete the scroll and highlight animation within 200 milliseconds

### Requirement 6

**User Story:** As a user, I want hovering over a list item to highlight the corresponding mask, so that I can locate objects in the image

#### Acceptance Criteria

1. WHEN a user hovers over an object list item, THE Image Viewer SHALL highlight the corresponding mask overlay
2. WHEN a user hovers over an object list item, THE Image Viewer SHALL increase the mask opacity to 70%
3. WHEN a user hovers over an object list item, THE Image Viewer SHALL add a colored border to the mask
4. WHEN a user moves the mouse away from a list item, THE Image Viewer SHALL return the mask to its default state
5. THE Image Viewer SHALL update the mask highlight within 50 milliseconds for responsive interaction

### Requirement 7

**User Story:** As a user, I want to drag masks to new positions, so that I can rearrange objects in the scene

#### Acceptance Criteria

1. WHEN a user clicks and drags a mask overlay, THE Image Viewer SHALL move the mask to follow the mouse cursor
2. WHEN a mask is being dragged, THE Image Viewer SHALL display a semi-transparent gray indicator at the mask's original position
3. WHEN a user releases the mouse button, THE Image Viewer SHALL fix the mask at the new position
4. THE Image Viewer SHALL constrain mask movement to stay within the image boundaries
5. THE Image Viewer SHALL update the mask position in real-time during dragging with no visible lag

### Requirement 8

**User Story:** As a user, I want the original position indicator to remain visible, so that I can see where the object was before moving it

#### Acceptance Criteria

1. WHEN a mask is moved from its original position, THE Image Viewer SHALL display a gray semi-transparent overlay at the original bounding box location
2. THE Original Position Indicator SHALL have 30% opacity to be visible but not distracting
3. THE Original Position Indicator SHALL remain visible until the mask is moved back to its original position
4. THE Original Position Indicator SHALL use a dashed border to distinguish it from active masks
5. WHEN a mask is moved back to within 5 pixels of its original position, THE Image Viewer SHALL remove the original position indicator

### Requirement 9

**User Story:** As a user, I want object metadata to update when I move a mask, so that location and relationship information stays accurate

#### Acceptance Criteria

1. WHEN a mask is moved to a new position, THE Penguin Application SHALL update the object's location field in the metadata
2. WHEN a mask is moved, THE Penguin Application SHALL recalculate and update the relationship field based on new spatial relationships with other objects
3. WHEN a mask is moved, THE Penguin Application SHALL update the orientation field if the relative position changes significantly
4. THE Penguin Application SHALL update metadata within 100 milliseconds of the mask movement completing
5. THE Objects Tab SHALL reflect the updated metadata immediately in the object list item

### Requirement 10

**User Story:** As a user, I want to scale masks by dragging their corners, so that I can adjust object sizes

#### Acceptance Criteria

1. WHEN a mask is selected, THE Image Viewer SHALL display resize handles at the four corners of the bounding box
2. WHEN a user drags a resize handle, THE Image Viewer SHALL scale the mask proportionally
3. WHEN a mask is being scaled, THE Image Viewer SHALL maintain the aspect ratio of the mask
4. WHEN a user releases the resize handle, THE Image Viewer SHALL fix the mask at the new size
5. THE Image Viewer SHALL update the mask size in real-time during scaling with no visible lag

### Requirement 11

**User Story:** As a user, I want object metadata to update when I scale a mask, so that size information stays accurate

#### Acceptance Criteria

1. WHEN a mask is scaled, THE Penguin Application SHALL update the object's relative_size field in the metadata
2. WHEN a mask is scaled, THE Penguin Application SHALL recalculate and update the area_pixels and area_percentage fields
3. WHEN a mask is scaled, THE Penguin Application SHALL update the bounding_box coordinates
4. THE Penguin Application SHALL update metadata within 100 milliseconds of the scaling operation completing
5. THE Objects Tab SHALL reflect the updated size information immediately in the object list item

### Requirement 12

**User Story:** As a user, I want image edit adjustments to update object appearance metadata, so that visual descriptions stay accurate

#### Acceptance Criteria

1. WHEN a user adjusts brightness on a selected mask, THE Penguin Application SHALL update the appearance_details field to include the brightness adjustment value
2. WHEN a user adjusts contrast on a selected mask, THE Penguin Application SHALL update the appearance_details field to include the contrast adjustment value
3. WHEN a user adjusts saturation on a selected mask, THE Penguin Application SHALL update the shape_and_color field to reflect the saturation change
4. WHEN a user adjusts hue on a selected mask, THE Penguin Application SHALL update the shape_and_color field to reflect the color shift
5. WHEN a user adjusts texture-related properties on a selected mask, THE Penguin Application SHALL update the texture field accordingly

### Requirement 13

**User Story:** As a user, I want to apply image edits to individual masks, so that I can adjust specific objects without affecting others

#### Acceptance Criteria

1. WHEN a mask is selected, THE Image Edit Controls SHALL apply adjustments only to that mask
2. THE Image Viewer SHALL render the selected mask with the applied image edit transformations
3. THE Image Viewer SHALL render non-selected masks without the image edit transformations
4. WHEN a user deselects a mask, THE Image Viewer SHALL preserve the applied transformations on that mask
5. THE Penguin Application SHALL store image edit state per mask in the segmentation store

### Requirement 14

**User Story:** As a user, I want smooth animations during object interactions, so that the interface feels polished

#### Acceptance Criteria

1. WHEN an object list item is highlighted, THE Objects Tab SHALL animate the background color change over 150 milliseconds
2. WHEN an object list item is scrolled into view, THE Objects Tab SHALL use smooth scrolling with 200 millisecond duration
3. WHEN a mask is highlighted, THE Image Viewer SHALL animate the opacity change over 150 milliseconds
4. WHEN the original position indicator appears, THE Image Viewer SHALL fade it in over 200 milliseconds
5. THE Penguin Application SHALL use CSS transitions for all animations to ensure smooth performance

### Requirement 15

**User Story:** As a user, I want to reset a mask to its original position and size, so that I can undo my changes

#### Acceptance Criteria

1. THE Object List Item SHALL provide a "Reset Position" button when a mask has been moved
2. WHEN a user clicks the Reset Position button, THE Image Viewer SHALL animate the mask back to its original position over 300 milliseconds
3. WHEN a mask is reset, THE Penguin Application SHALL restore the original metadata values for location, relationship, and orientation
4. WHEN a mask is reset, THE Image Viewer SHALL remove the original position indicator
5. THE Object List Item SHALL hide the Reset Position button when the mask is at its original position

### Requirement 16

**User Story:** As a user, I want to see bounding box information in the object list, so that I understand object positioning

#### Acceptance Criteria

1. THE Object List Item SHALL display the bounding box coordinates (x1, y1, x2, y2) when expanded
2. THE Object List Item SHALL display the centroid coordinates
3. THE Object List Item SHALL display the area in pixels and as a percentage of the total image
4. THE Object List Item SHALL update these values in real-time when the mask is moved or scaled
5. THE Object List Item SHALL format coordinate values to whole numbers for readability

### Requirement 17

**User Story:** As a developer, I want mask manipulation state managed centrally, so that components stay synchronized

#### Acceptance Criteria

1. THE Segmentation Store SHALL maintain the original position and size for each mask
2. THE Segmentation Store SHALL maintain the current position and size for each mask
3. THE Segmentation Store SHALL maintain per-mask image edit transformations
4. THE Segmentation Store SHALL provide actions for moving, scaling, and resetting masks
5. THE Segmentation Store SHALL provide actions for updating object metadata based on transformations

### Requirement 18

**User Story:** As a user, I want visual feedback during drag operations, so that I know the system is responding

#### Acceptance Criteria

1. WHEN a user starts dragging a mask, THE Image Viewer SHALL change the cursor to a "grabbing" cursor
2. WHEN a mask is being dragged, THE Image Viewer SHALL reduce the mask opacity to 50% to show it is being moved
3. WHEN a user hovers over a resize handle, THE Image Viewer SHALL change the cursor to a resize cursor
4. WHEN a mask is being scaled, THE Image Viewer SHALL show a dashed outline preview of the new size
5. THE Image Viewer SHALL restore normal cursor and opacity when the drag or scale operation completes

### Requirement 19

**User Story:** As a user, I want to click on an object list item to select the corresponding mask, so that I can focus on specific objects

#### Acceptance Criteria

1. WHEN a user clicks on an object list item, THE Image Viewer SHALL select the corresponding mask
2. WHEN a mask is selected via the object list, THE Image Viewer SHALL highlight the mask with a distinct border
3. WHEN a mask is selected via the object list, THE Image Viewer SHALL scroll the image to center the mask if it is not fully visible
4. WHEN a user clicks on a different object list item, THE Image Viewer SHALL deselect the previous mask and select the new one
5. THE Object List Item SHALL show a visual indicator (such as a checkmark or highlight) when its mask is selected

### Requirement 20

**User Story:** As a user, I want keyboard shortcuts for object manipulation, so that I can work efficiently

#### Acceptance Criteria

1. WHEN a mask is selected and the user presses arrow keys, THE Image Viewer SHALL move the mask by 1 pixel in the arrow direction
2. WHEN a mask is selected and the user presses Shift+arrow keys, THE Image Viewer SHALL move the mask by 10 pixels in the arrow direction
3. WHEN a mask is selected and the user presses 'R', THE Penguin Application SHALL reset the mask to its original position and size
4. WHEN a mask is selected and the user presses Delete or Backspace, THE Penguin Application SHALL hide the mask from view
5. WHEN the user presses Escape, THE Image Viewer SHALL deselect any selected mask
