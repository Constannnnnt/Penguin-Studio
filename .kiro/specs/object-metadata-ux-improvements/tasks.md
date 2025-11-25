# Implementation Plan

- [x] 1. Refactor MetadataSection to prioritize semantic information





  - Reorder metadata fields to show semantic information first (prompt, description, location, relationship, relative_size, shape_and_color, texture, appearance_details, orientation)
  - Filter out empty or undefined fields before rendering
  - Add clear section heading for "Object Metadata"
  - Ensure fields are displayed with proper labels and formatting
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for semantic metadata rendering
  - **Property 1: Semantic metadata fields are rendered when present**
  - **Validates: Requirements 1.1, 1.4**

- [ ]* 1.2 Write property test for empty field filtering
  - **Property 3: Empty metadata fields are not rendered**
  - **Validates: Requirements 1.4**

- [x] 2. Refactor BoundingBoxSection to be collapsible and de-emphasized





  - Add collapse/expand functionality with default collapsed state
  - Add visual de-emphasis (lighter text color, smaller font, or secondary styling)
  - Rename section heading to "Spatial Information" or "Technical Details"
  - Ensure expand/collapse control is accessible
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.1 Write property test for collapsible section
  - **Property 4: Spatial information section is collapsible**
  - **Validates: Requirements 2.1, 2.5**

- [ ]* 2.2 Write property test for DOM ordering
  - **Property 2: Semantic metadata appears before spatial information**
  - **Validates: Requirements 1.2, 1.5, 2.2**
-

- [x] 3. Create MaskTooltip component




  - Create new component that displays prompt text or label as fallback
  - Implement positioning logic to place tooltip near cursor without obscuring mask
  - Add fade in/out transitions (200ms)
  - Handle edge cases where tooltip would go off-screen
  - Make tooltip accessible with proper ARIA attributes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 3.1 Write property test for tooltip content
  - **Property 5: Tooltip displays prompt text on hover**
  - **Validates: Requirements 3.1**

- [ ]* 3.2 Write property test for tooltip positioning
  - **Property 6: Tooltip positioning does not obscure mask**
  - **Validates: Requirements 3.3**
-

- [x] 4. Integrate MaskTooltip into DraggableMaskOverlay




  - Add tooltip state (visible, position) to DraggableMaskOverlay
  - Track mouse position during hover
  - Show tooltip on mouseenter, hide on mouseleave with 200ms delay
  - Pass mask prompt text or label to tooltip
  - Ensure tooltip appears above other overlays (z-index)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
-

- [x] 5. Fix drag functionality in DraggableMaskOverlay




  - Ensure startDragMask is called on mousedown and sets isDragging flag
  - Verify updateMaskPosition is called during mousemove with correct deltas
  - Ensure endDragMask is called on mouseup and resets isDragging flag
  - Verify position updates are constrained to image boundaries
  - Test that location metadata is updated after drag completes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 5.1 Write property test for drag position updates
  - **Property 7: Dragging updates mask position**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ]* 5.2 Write property test for drag metadata updates
  - **Property 8: Dragging updates location metadata**
  - **Validates: Requirements 4.4**

- [ ]* 5.3 Write property test for drag state management
  - **Property 9: Drag operation sets isDragging flag**
  - **Validates: Requirements 4.5, 8.1, 8.3**
-

- [x] 6. Fix resize functionality in DraggableMaskOverlay




  - Ensure startResizeMask is called when resize handle is grabbed and sets isResizing flag
  - Verify updateMaskSize is called during resize with correct bounding box
  - Ensure aspect ratio is maintained during resize
  - Verify resize is constrained to image boundaries
  - Ensure endResizeMask is called on mouseup and resets isResizing flag
  - Test that area and relative_size metadata are updated after resize completes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 6.1 Write property test for aspect ratio maintenance
  - **Property 10: Resizing maintains aspect ratio**
  - **Validates: Requirements 5.2**

- [ ]* 6.2 Write property test for resize metadata updates
  - **Property 11: Resizing updates size metadata**
  - **Validates: Requirements 5.4**

- [ ]* 6.3 Write property test for resize state management
  - **Property 12: Resize operation sets isResizing flag**
  - **Validates: Requirements 5.5, 8.2, 8.3**
-

- [x] 7. Verify image edit application to masks




  - Ensure applyImageEditToMask correctly updates the manipulation state
  - Verify CSS filters are generated from edit values and applied to mask overlay
  - Test that filters are applied in real-time as sliders are adjusted
  - Ensure appearance_details and shape_and_color metadata are updated
  - Verify reset functionality removes all filters and restores original state
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 7.1 Write property test for filter application
  - **Property 13: Image edits apply filters to mask**
  - **Validates: Requirements 6.2, 6.3**

- [ ]* 7.2 Write property test for edit metadata updates
  - **Property 14: Image edits update appearance metadata**
  - **Validates: Requirements 6.4**

- [ ]* 7.3 Write property test for reset functionality
  - **Property 15: Reset removes all transformations**
  - **Validates: Requirements 6.5**
-

- [x] 8. Enhance ImageControlsTab with selection indicators




  - Add header showing currently selected mask label/prompt
  - Display visual indicator (icon, badge) showing which mask is selected
  - Add tooltips to editing controls explaining they apply to selected mask
  - Disable or hide controls when no mask is selected
  - Ensure controls update immediately when switching between masks
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 8.1 Write property test for selection indication
  - **Property 16: Selected mask is visually indicated**
  - **Validates: Requirements 7.1**

- [ ]* 8.2 Write property test for control synchronization
  - **Property 17: Image editing controls reflect selected mask**
  - **Validates: Requirements 7.5**
-

- [x] 9. Add visual indicator for masks with active edits




  - Add badge or icon to ObjectListItem when mask has non-default image edits
  - Show indicator in both collapsed and expanded states
  - Make indicator visually distinct but not distracting
  - Add tooltip explaining the indicator
  - _Requirements: 7.2_

- [x] 10. Verify state isolation between masks



















  - Test that manipulating one mask does not affect other masks
  - Verify each mask maintains independent manipulation state
  - Test with multiple masks being dragged, resized, and edited
  - Ensure state updates trigger re-renders only for affected masks
  - _Requirements: 8.5_

- [ ]* 10.1 Write property test for state isolation
  - **Property 18: Multiple masks maintain independent state**
  - **Validates: Requirements 8.5**

- [ ] 11. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
