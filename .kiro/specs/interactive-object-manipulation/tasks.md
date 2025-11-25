# Implementation Plan

- [x] 1. Extend segmentation store with mask manipulation state





  - Add mask manipulation state map to store interface
  - Add original and current bounding box tracking per mask
  - Add per-mask transform state (position, scale, image edits)
  - Add drag and resize state flags
  - Implement actions for starting/updating/ending drag operations
  - Implement actions for starting/updating/ending resize operations
  - Implement action for resetting mask transforms
  - Implement actions for hiding/showing masks
  - Implement action for applying image edits to specific masks
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ]* 1.1 Write property test for mask manipulation state management
  - **Feature: interactive-object-manipulation, Property 62: Store maintains original position**
  - **Feature: interactive-object-manipulation, Property 63: Store maintains current position**
  - **Feature: interactive-object-manipulation, Property 64: Store maintains per-mask edits**
  - **Validates: Requirements 17.1, 17.2, 17.3**
-

- [x] 2. Enhance mask metadata interface with prompt tier and object metadata




  - Extend MaskMetadata interface to include promptTier field
  - Add promptText field to store exact prompt used
  - Add objectMetadata field with all JSON properties
  - Update backend API response transformation to include new fields
  - Update mock data for testing
  - _Requirements: 3.1, 3.2, 4.1_

- [ ]* 2.1 Write property test for metadata structure
  - **Feature: interactive-object-manipulation, Property 8: Prompt tier displayed**
  - **Feature: interactive-object-manipulation, Property 9: Prompt text displayed**
  - **Validates: Requirements 3.1, 3.2**
-

- [x] 3. Create Objects Tab component




  - Create ObjectsTab component file
  - Implement scrollable list container
  - Read segmentation results from store
  - Sort masks by confidence descending
  - Render ObjectListItem for each mask
  - Implement empty state when no objects detected
  - Add scroll-to-item functionality for hovered masks
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1_

- [ ]* 3.1 Write property test for object list rendering
  - **Feature: interactive-object-manipulation, Property 1: Object list length equals mask count**
  - **Feature: interactive-object-manipulation, Property 2: Object list sorted by confidence**
  - **Validates: Requirements 1.2, 1.3**
-

- [x] 4. Create Object List Item component




  - Create ObjectListItem component file
  - Implement collapsible item with expand/collapse button
  - Display object label as heading
  - Display confidence score with progress bar
  - Display mask thumbnail with colored border
  - Implement hover handlers to sync with mask overlays
  - Implement click handler to select mask
  - Add visual indicator for selected state
  - Auto-expand when hovered
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 19.1, 19.5_

- [ ]* 4.1 Write property test for object list item display
  - **Feature: interactive-object-manipulation, Property 3: Object list item displays label**
  - **Feature: interactive-object-manipulation, Property 4: Object list item displays confidence**
  - **Feature: interactive-object-manipulation, Property 5: Object list item displays mask thumbnail**
  - **Feature: interactive-object-manipulation, Property 6: Object list item border matches mask color**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
-

- [x] 5. Create Prompt Section component




  - Create PromptSection component file
  - Display prompt tier with appropriate badge variant
  - Display exact prompt text in monospace font
  - Implement conditional rendering based on tier
  - Style CORE tier prompts differently from CORE_VISUAL and CORE_VISUAL_SPATIAL
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 5.1 Write property test for prompt tier display
  - **Feature: interactive-object-manipulation, Property 10: CORE tier shows core only**
  - **Feature: interactive-object-manipulation, Property 11: CORE_VISUAL tier shows core and visual**
  - **Feature: interactive-object-manipulation, Property 12: CORE_VISUAL_SPATIAL tier shows all**
  - **Validates: Requirements 3.3, 3.4, 3.5**
-

- [x] 6. Create Metadata Section component



  - Create MetadataSection component file
  - Display all object metadata fields in key-value format
  - Filter out empty or null fields
  - Display description, location, relationship, relative_size fields
  - Display shape_and_color, texture, appearance_details, orientation fields
  - Format fields in readable layout
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ]* 6.1 Write property test for metadata display
  - **Feature: interactive-object-manipulation, Property 13: All metadata fields displayed**
  - **Feature: interactive-object-manipulation, Property 14: Empty fields filtered**
  - **Validates: Requirements 4.1, 4.5**

- [x] 7. Create Bounding Box Section component




  - Create BoundingBoxSection component file
  - Display bounding box coordinates (x1, y1, x2, y2)
  - Display centroid coordinates
  - Display area in pixels and percentage
  - Format coordinates as whole numbers
  - Read current bounding box from manipulation state if available
  - Update display in real-time when mask is transformed
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 7.1 Write property test for bounding box display
  - **Feature: interactive-object-manipulation, Property 57: Bounding box displayed**
  - **Feature: interactive-object-manipulation, Property 58: Centroid displayed**
  - **Feature: interactive-object-manipulation, Property 59: Area displayed**
  - **Feature: interactive-object-manipulation, Property 61: Coordinates formatted as integers**
  - **Validates: Requirements 16.1, 16.2, 16.3, 16.5**
-

- [x] 8. Implement bidirectional hover synchronization




  - Add hover handlers to ObjectListItem that update hoveredMaskId in store
  - Add hover handlers to mask overlays that update hoveredMaskId in store
  - Implement scroll-to-item when mask is hovered
  - Implement highlight styling for hovered list items
  - Implement highlight styling for hovered masks
  - Add smooth scroll animation
  - Add highlight transition animations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_

- [ ]* 8.1 Write property test for hover synchronization
  - **Feature: interactive-object-manipulation, Property 15: Hover mask highlights list item**
  - **Feature: interactive-object-manipulation, Property 16: Hover mask expands list item**
  - **Feature: interactive-object-manipulation, Property 18: Hover list item highlights mask**
  - **Feature: interactive-object-manipulation, Property 19: Hover list item increases mask opacity**
  - **Validates: Requirements 5.2, 5.3, 6.1, 6.2**

- [x] 9. Create Draggable Mask Overlay component





  - Create DraggableMaskOverlay component file
  - Implement mouse down handler to start drag
  - Implement mouse move handler to update position during drag
  - Implement mouse up handler to end drag
  - Calculate position delta in image coordinates
  - Update cursor to "grabbing" during drag
  - Reduce opacity to 50% during drag
  - Apply per-mask image edit filters
  - Constrain movement to image boundaries
  - _Requirements: 7.1, 7.3, 7.4, 18.1, 18.2_

- [ ]* 9.1 Write property test for drag operations
  - **Feature: interactive-object-manipulation, Property 22: Drag updates mask position**
  - **Feature: interactive-object-manipulation, Property 24: Release fixes mask position**
  - **Feature: interactive-object-manipulation, Property 25: Drag constrained to boundaries**
  - **Validates: Requirements 7.1, 7.3, 7.4**
-

- [x] 10. Create Original Position Indicator component



  - Create OriginalPositionIndicator component file
  - Display semi-transparent gray overlay at original bounding box
  - Set opacity to 30%
  - Use dashed border style
  - Add fade-in animation
  - Make non-interactive with pointer-events: none
  - _Requirements: 7.2, 8.1, 8.2, 8.3, 8.4_

- [ ]* 10.1 Write property test for original position indicator
  - **Feature: interactive-object-manipulation, Property 23: Drag shows original position indicator**
  - **Feature: interactive-object-manipulation, Property 26: Original indicator has correct opacity**
  - **Feature: interactive-object-manipulation, Property 28: Original indicator has dashed border**
  - **Validates: Requirements 7.2, 8.2, 8.4**
-

- [x] 11. Implement original position indicator logic




  - Show indicator when mask position differs from original
  - Hide indicator when mask is within 5 pixels of original position
  - Hide indicator when mask is reset
  - Calculate distance between current and original positions
  - _Requirements: 8.3, 8.5, 15.4_

- [ ]* 11.1 Write property test for indicator visibility logic
  - **Feature: interactive-object-manipulation, Property 27: Original indicator persists until reset**
  - **Feature: interactive-object-manipulation, Property 29: Original indicator removed near original**
  - **Validates: Requirements 8.3, 8.5**

- [x] 12. Create Resize Handles component




  - Create ResizeHandles component file
  - Render four corner handles (nw, ne, sw, se)
  - Position handles at corners of bounding box
  - Style handles as small circles with border
  - Implement mouse down handler to start resize
  - Change cursor to appropriate resize cursor on hover
  - Only render when mask is selected
  - _Requirements: 10.1, 18.3_

- [ ]* 12.1 Write property test for resize handles
  - **Feature: interactive-object-manipulation, Property 34: Selected mask shows resize handles**
  - **Feature: interactive-object-manipulation, Property 67: Resize handle cursor**
  - **Validates: Requirements 10.1, 18.3**

- [x] 13. Implement resize functionality





  - Add mouse move handler for resize operations
  - Calculate new dimensions based on handle being dragged
  - Maintain aspect ratio during resize
  - Update mask bounding box in store
  - Show dashed outline preview during resize
  - Constrain resize to minimum size
  - _Requirements: 10.2, 10.3, 10.4, 18.4_

- [ ]* 13.1 Write property test for resize operations
  - **Feature: interactive-object-manipulation, Property 35: Resize scales mask proportionally**
  - **Feature: interactive-object-manipulation, Property 36: Resize maintains aspect ratio**
  - **Feature: interactive-object-manipulation, Property 37: Release fixes mask size**
  - **Validates: Requirements 10.2, 10.3, 10.4**
-

- [x] 14. Create Metadata Updater class



  - Create MetadataUpdater class file
  - Implement updateLocationMetadata method
  - Implement updateRelationshipMetadata method
  - Implement updateOrientationMetadata method
  - Implement updateRelativeSizeMetadata method
  - Implement updateAppearanceDetailsFromEdits method
  - Implement updateShapeAndColorFromEdits method
  - Add helper method for calculating spatial directions
  - _Requirements: 9.1, 9.2, 9.3, 11.1, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 14.1 Write property test for location metadata updates
  - **Feature: interactive-object-manipulation, Property 30: Move updates location metadata**
  - **Validates: Requirements 9.1**

- [ ]* 14.2 Write property test for relationship metadata updates
  - **Feature: interactive-object-manipulation, Property 31: Move updates relationship metadata**
  - **Validates: Requirements 9.2**

- [ ]* 14.3 Write property test for orientation metadata updates
  - **Feature: interactive-object-manipulation, Property 32: Move updates orientation metadata**
  - **Validates: Requirements 9.3**

- [ ]* 14.4 Write property test for size metadata updates
  - **Feature: interactive-object-manipulation, Property 38: Scale updates relative_size metadata**
  - **Feature: interactive-object-manipulation, Property 39: Scale updates area fields**
  - **Feature: interactive-object-manipulation, Property 40: Scale updates bounding_box**
  - **Validates: Requirements 11.1, 11.2, 11.3**

- [ ]* 14.5 Write property test for appearance metadata updates
  - **Feature: interactive-object-manipulation, Property 42: Brightness updates appearance_details**
  - **Feature: interactive-object-manipulation, Property 43: Contrast updates appearance_details**
  - **Feature: interactive-object-manipulation, Property 44: Saturation updates shape_and_color**
  - **Feature: interactive-object-manipulation, Property 45: Hue updates shape_and_color**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

- [x] 15. Integrate metadata updates with drag operations




  - Call MetadataUpdater when drag ends
  - Update location field based on new position
  - Update relationship field based on proximity to other objects
  - Update orientation field based on position change
  - Store updated metadata in segmentation store
  - Trigger re-render of object list item
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ]* 15.1 Write property test for drag metadata synchronization
  - **Feature: interactive-object-manipulation, Property 33: Metadata reflected in list**
  - **Validates: Requirements 9.5**
-

- [x] 16. Integrate metadata updates with resize operations



  - Call MetadataUpdater when resize ends
  - Update relative_size field based on new dimensions
  - Recalculate area_pixels and area_percentage
  - Update bounding_box coordinates
  - Store updated metadata in segmentation store
  - Trigger re-render of object list item
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [ ]* 16.1 Write property test for resize metadata synchronization
  - **Feature: interactive-object-manipulation, Property 41: Size reflected in list**
  - **Validates: Requirements 11.5**

-

- [x] 17. Implement per-mask image edit controls



  - Modify image edit controls to apply to selected mask only
  - Store image edit state per mask in manipulation state
  - Apply CSS filters to individual masks based on their edit state
  - Preserve edits when mask is deselected
  - Implement combineImageEditFilters utility function
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]* 17.1 Write property test for per-mask edits
  - **Feature: interactive-object-manipulation, Property 47: Edits apply only to selected mask**
  - **Feature: interactive-object-manipulation, Property 48: Selected mask renders with edits**
  - **Feature: interactive-object-manipulation, Property 49: Non-selected masks render without edits**
  - **Feature: interactive-object-manipulation, Property 50: Deselect preserves edits**
  - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

- [x] 18. Integrate image edit metadata updates





  - Call MetadataUpdater when image edits are applied
  - Update appearance_details for brightness, contrast, exposure, blur
  - Update shape_and_color for saturation, hue, vibrance
  - Update texture field for texture-related adjustments
  - Store updated metadata in segmentation store
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 18.1 Write property test for image edit metadata updates
  - **Feature: interactive-object-manipulation, Property 46: Texture edits update texture field**
  - **Validates: Requirements 12.5**
-

- [x] 19. Implement reset functionality




  - Add Reset Position button to ObjectListItem
  - Show button only when mask has been moved
  - Implement resetMaskTransform action in store
  - Restore original bounding box
  - Restore original metadata values
  - Remove original position indicator
  - Animate mask back to original position
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 19.1 Write property test for reset functionality
  - **Feature: interactive-object-manipulation, Property 52: Reset button shown when moved**
  - **Feature: interactive-object-manipulation, Property 53: Reset restores position**
  - **Feature: interactive-object-manipulation, Property 54: Reset restores metadata**
  - **Feature: interactive-object-manipulation, Property 55: Reset removes indicator**
  - **Feature: interactive-object-manipulation, Property 56: Reset button hidden at original**
  - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
-

- [x] 20. Implement click selection synchronization




  - Add click handler to ObjectListItem to select mask
  - Add click handler to mask overlay to select mask
  - Update selectedMaskId in store
  - Highlight selected mask with distinct border
  - Show visual indicator in selected list item
  - Scroll image to center selected mask if not visible
  - Deselect previous mask when new mask is selected
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ]* 20.1 Write property test for selection synchronization
  - **Feature: interactive-object-manipulation, Property 70: Click list item selects mask**
  - **Feature: interactive-object-manipulation, Property 71: Selected mask has border**
  - **Feature: interactive-object-manipulation, Property 73: New selection deselects previous**
  - **Feature: interactive-object-manipulation, Property 74: Selected item shows indicator**
  - **Validates: Requirements 19.1, 19.2, 19.4, 19.5**
-

- [x] 21. Implement keyboard shortcuts




  - Create useObjectManipulationKeyboard hook
  - Implement arrow key handlers for 1-pixel movement
  - Implement Shift+arrow key handlers for 10-pixel movement
  - Implement 'R' key handler for reset
  - Implement Delete/Backspace key handlers for hide
  - Implement Escape key handler for deselect
  - Only activate shortcuts when mask is selected
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ]* 21.1 Write property test for keyboard shortcuts
  - **Feature: interactive-object-manipulation, Property 75: Arrow keys move mask 1 pixel**
  - **Feature: interactive-object-manipulation, Property 76: Shift+arrow moves mask 10 pixels**
  - **Feature: interactive-object-manipulation, Property 77: R key resets mask**
  - **Feature: interactive-object-manipulation, Property 78: Delete key hides mask**
  - **Feature: interactive-object-manipulation, Property 79: Escape deselects mask**
  - **Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5**
-

- [x] 22. Add utility functions



  - Implement areBoundingBoxesEqual function
  - Implement getMaskColor function for consistent colors
  - Implement combineImageEditFilters function
  - Implement constrainBoundingBox function
  - Add unit tests for utility functions
  - _Requirements: 7.4, 8.5_


- [x] 23. Implement visual feedback for drag operations




  - Update cursor styles during drag
  - Update opacity during drag
  - Restore cursor and opacity when drag completes
  - Add transition animations
  - _Requirements: 18.1, 18.2, 18.5_

- [ ]* 23.1 Write property test for drag visual feedback
  - **Feature: interactive-object-manipulation, Property 65: Drag cursor is grabbing**
  - **Feature: interactive-object-manipulation, Property 66: Drag reduces opacity**
  - **Feature: interactive-object-manipulation, Property 69: Complete restores cursor and opacity**
  - **Validates: Requirements 18.1, 18.2, 18.5**
-

- [x] 24. Implement visual feedback for resize operations




  - Show dashed outline preview during resize
  - Update cursor on resize handle hover
  - Restore cursor when resize completes
  - _Requirements: 18.3, 18.4, 18.5_

- [ ]* 24.1 Write property test for resize visual feedback
  - **Feature: interactive-object-manipulation, Property 68: Resize shows preview**
  - **Validates: Requirements 18.4**
-

- [x] 25. Add accessibility features




  - Add ARIA labels to object list items
  - Add ARIA labels to mask overlays
  - Add aria-selected attribute for selected items
  - Add aria-expanded attribute for expandable items
  - Add aria-grabbed attribute for draggable masks
  - Implement keyboard navigation for list items
  - Add screen reader announcements for manipulations
  - _Requirements: All_
- [x] 26. Integrate Objects Tab into Controls Panel



- [ ] 26. Integrate Objects Tab into Controls Panel

  - Update ControlsPanel component to include Objects tab
  - Add "Objects" tab to TabsList
  - Render ObjectsTab in TabsContent
  - Update layout store to include objects tab state
  - Test tab switching between Image, Description, and Objects
  - _Requirements: 1.1_
-

- [x] 27. Update backend to include prompt tier in response



  - Modify segmentation service to track prompt tier used
  - Add promptTier field to mask metadata in response
  - Add promptText field with exact prompt sent to SAM3
  - Update API response schema
  - Test with different prompt tiers
  - _Requirements: 3.1, 3.2_

- [x] 28. Update backend to include object metadata in response





  - Parse object metadata from input JSON
  - Associate metadata with detected masks by matching descriptions
  - Include objectMetadata in mask response
  - Handle cases where metadata is missing
  - Test with example JSON files
  - _Requirements: 4.1_

- [x] 29. Add performance optimizations





  - Memoize ObjectListItem component
  - Implement debounced metadata updates
  - Add virtualization for large object lists
  - Optimize re-renders with React.memo
  - Profile and optimize expensive calculations
  - _Requirements: All_

- [ ] 30. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
