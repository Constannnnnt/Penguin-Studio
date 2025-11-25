# Design Document

## Overview

This design addresses critical UX and functionality issues in the object segmentation interface. The primary goals are to:

1. Prioritize semantic metadata over spatial information in the object list
2. Display prompt text in hover tooltips instead of area information
3. Fix mask manipulation (drag and resize) functionality
4. Ensure image edits apply correctly to selected masks
5. Improve visual feedback and user understanding of which mask is being edited

The solution involves refactoring the MetadataSection, BoundingBoxSection, and DraggableMaskOverlay components, adding a tooltip system, and ensuring proper state synchronization in the segmentation store.

## Architecture

### Component Structure

```
IDELayout
├── WorkspacePanel
│   └── ObjectsTab
│       └── ObjectListItem (multiple)
│           ├── PromptSection
│           ├── MetadataSection (refactored)
│           └── BoundingBoxSection (refactored, collapsible)
└── ImageViewer
    ├── DraggableMaskOverlay (multiple, with tooltip)
    │   ├── ResizeHandles
    │   ├── MaskTooltip (new)
    │   └── OriginalPositionIndicator
    └── ImageControlsTab (clarified UX)
```

### State Management

The segmentation store manages:
- Mask metadata including semantic and spatial information
- Mask manipulation state (drag, resize, image edits)
- Selected and hovered mask IDs
- Tooltip visibility and content

### Key Changes

1. **MetadataSection**: Reorder fields to show semantic metadata first, hide empty fields
2. **BoundingBoxSection**: Make collapsible, collapsed by default, visually de-emphasized
3. **DraggableMaskOverlay**: Add tooltip showing prompt text on hover
4. **ImageControlsTab**: Add clear indication that edits apply to selected mask
5. **Segmentation Store**: Ensure manipulation state flags are properly managed

## Components and Interfaces

### MaskTooltip Component (New)

```typescript
interface MaskTooltipProps {
  mask: MaskMetadata;
  visible: boolean;
  position: { x: number; y: number };
}

export const MaskTooltip: React.FC<MaskTooltipProps> = ({ mask, visible, position }) => {
  // Display prompt text or label as fallback
  // Position near cursor without obscuring mask
  // Fade in/out with 200ms transition
};
```

### MetadataSection Component (Refactored)

```typescript
interface MetadataSectionProps {
  mask: MaskMetadata;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({ mask }) => {
  // Display fields in priority order:
  // 1. prompt text (if available)
  // 2. description
  // 3. location
  // 4. relationship
  // 5. relative_size
  // 6. shape_and_color
  // 7. texture
  // 8. appearance_details
  // 9. orientation
  // Hide fields that are empty or undefined
};
```

### BoundingBoxSection Component (Refactored)

```typescript
interface BoundingBoxSectionProps {
  mask: MaskMetadata;
  defaultCollapsed?: boolean;
}

export const BoundingBoxSection: React.FC<BoundingBoxSectionProps> = ({ 
  mask, 
  defaultCollapsed = true 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Collapsible section with de-emphasized styling
  // Shows bounding box, centroid, area when expanded
};
```

### DraggableMaskOverlay Component (Enhanced)

```typescript
interface DraggableMaskOverlayProps {
  mask: MaskMetadata;
  isSelected: boolean;
  isHovered: boolean;
  imageSize: { width: number; height: number };
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// Add tooltip state and rendering
// Ensure drag and resize handlers properly update store flags
// Apply image edit filters from manipulation state
```

### ImageControlsTab Component (Enhanced)

```typescript
// Add visual indicator showing which mask is selected
// Display selected mask label/prompt in controls header
// Show tooltips explaining edits apply to selected mask
// Disable controls when no mask is selected
```

## Data Models

### MaskMetadata (Existing, No Changes)

```typescript
interface MaskMetadata {
  mask_id: string;
  label: string;
  confidence: number;
  bounding_box: BoundingBox;
  area_pixels: number;
  area_percentage: number;
  centroid: [number, number];
  mask_url: string;
  promptTier?: 'CORE' | 'CORE_VISUAL' | 'CORE_VISUAL_SPATIAL';
  promptText?: string;
  objectMetadata?: {
    description: string;
    location: string;
    relationship: string;
    relative_size: string;
    shape_and_color: string;
    texture: string;
    appearance_details: string;
    orientation: string;
  };
}
```

### MaskManipulationState (Existing, Ensure Proper Usage)

```typescript
interface MaskManipulationState {
  maskId: string;
  originalBoundingBox: BoundingBox;
  currentBoundingBox: BoundingBox;
  transform: MaskTransform;
  isDragging: boolean;  // Must be set/unset correctly
  isResizing: boolean;  // Must be set/unset correctly
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | null;
  isHidden: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Semantic metadata fields are rendered when present

*For any* mask with non-empty objectMetadata fields, rendering the MetadataSection should produce DOM elements for each non-empty field (description, location, relationship, relative_size, shape_and_color, texture, appearance_details, orientation).

**Validates: Requirements 1.1, 1.4**

### Property 2: Semantic metadata appears before spatial information

*For any* mask with both semantic and spatial information, the DOM order should place semantic metadata elements before spatial information elements.

**Validates: Requirements 1.2, 1.5, 2.2**

### Property 3: Empty metadata fields are not rendered

*For any* mask with some empty or undefined objectMetadata fields, those fields should not appear in the rendered DOM.

**Validates: Requirements 1.4**

### Property 4: Spatial information section is collapsible

*For any* mask, the BoundingBoxSection should render with a collapse/expand control that toggles visibility of spatial data.

**Validates: Requirements 2.1, 2.5**

### Property 5: Tooltip displays prompt text on hover

*For any* mask with promptText, hovering over the mask overlay should display a tooltip containing that prompt text.

**Validates: Requirements 3.1**

### Property 6: Tooltip positioning does not obscure mask

*For any* mask and cursor position, the tooltip position should be offset from the cursor such that it does not overlap the mask's bounding box.

**Validates: Requirements 3.3**

### Property 7: Dragging updates mask position

*For any* mask and drag delta (dx, dy), dragging the mask should update the currentBoundingBox by (dx, dy) while constraining to image boundaries.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: Dragging updates location metadata

*For any* mask that is dragged to a new position, the location metadata should be updated to reflect the new position relative to the image.

**Validates: Requirements 4.4**

### Property 9: Drag operation sets isDragging flag

*For any* mask, initiating a drag should set isDragging to true in the manipulation state, and completing the drag should set it to false.

**Validates: Requirements 4.5, 8.1, 8.3**

### Property 10: Resizing maintains aspect ratio

*For any* mask and resize operation, the new bounding box dimensions should maintain the same aspect ratio as the original bounding box.

**Validates: Requirements 5.2**

### Property 11: Resizing updates size metadata

*For any* mask that is resized, the area_pixels, area_percentage, and relative_size metadata should be updated to reflect the new dimensions.

**Validates: Requirements 5.4**

### Property 12: Resize operation sets isResizing flag

*For any* mask, initiating a resize should set isResizing to true and store the resize handle, and completing the resize should set isResizing to false and clear the handle.

**Validates: Requirements 5.5, 8.2, 8.3**

### Property 13: Image edits apply filters to mask

*For any* mask and image edit values (brightness, contrast, saturation, etc.), applying the edits should result in the corresponding CSS filters being applied to the mask overlay.

**Validates: Requirements 6.2, 6.3**

### Property 14: Image edits update appearance metadata

*For any* mask with image edits applied, the appearance_details and shape_and_color metadata should be updated to describe the visual changes.

**Validates: Requirements 6.4**

### Property 15: Reset removes all transformations

*For any* mask with transformations (position changes, size changes, image edits), resetting should restore the original bounding box, remove all filters, and reset metadata.

**Validates: Requirements 6.5**

### Property 16: Selected mask is visually indicated

*For any* selected mask, the mask overlay and object list item should have distinct visual styling (border, background, icon) that differs from unselected masks.

**Validates: Requirements 7.1**

### Property 17: Image editing controls reflect selected mask

*For any* selected mask with image edits, the image editing control values should match the mask's current edit values.

**Validates: Requirements 7.5**

### Property 18: Multiple masks maintain independent state

*For any* two different masks with manipulation states, modifying one mask's state (position, size, edits) should not affect the other mask's state.

**Validates: Requirements 8.5**

## Error Handling

### Drag/Resize Errors

- If drag/resize calculations produce invalid bounding boxes (negative dimensions, out of bounds), constrain to valid values
- If manipulation state is corrupted, reset to original bounding box
- Log warnings for unexpected state transitions

### Metadata Update Errors

- If metadata update fails, maintain previous metadata values
- If metadata fields are missing, use empty strings as defaults
- Validate metadata structure before rendering

### Tooltip Errors

- If prompt text is unavailable, fall back to label
- If tooltip positioning fails, use default offset from cursor
- Handle rapid hover/unhover events with debouncing

## Testing Strategy

### Unit Testing

Unit tests will cover:
- MetadataSection renders correct fields in correct order
- BoundingBoxSection collapse/expand functionality
- MaskTooltip positioning logic
- Empty field filtering in MetadataSection
- Image edit filter string generation
- Bounding box constraint calculations

### Property-Based Testing

We will use **fast-check** for TypeScript property-based testing. Each property-based test will run a minimum of 100 iterations.

Property-based tests will verify:
- **Property 1**: Semantic metadata rendering (generate random masks with various metadata combinations)
- **Property 2**: DOM ordering of semantic vs spatial info (generate masks, verify element order)
- **Property 3**: Empty field filtering (generate masks with random empty fields)
- **Property 7**: Drag position updates with boundary constraints (generate random drag deltas)
- **Property 10**: Aspect ratio maintenance during resize (generate random resize operations)
- **Property 13**: Filter application from edit values (generate random edit values)
- **Property 18**: State isolation between masks (generate multiple masks, apply random operations)

Each property test will be tagged with:
```typescript
// Feature: object-metadata-ux-improvements, Property N: [property description]
```

### Integration Testing

Integration tests will verify:
- Complete drag workflow from mousedown to mouseup
- Complete resize workflow with handle selection
- Image edit application and metadata update flow
- Tooltip show/hide on hover/unhover
- Selection state synchronization between components

### Manual Testing Checklist

- Verify semantic metadata is more prominent than spatial data
- Confirm tooltip shows prompt text on hover
- Test drag and resize with various masks
- Verify image edits apply only to selected mask
- Check that multiple masks can be manipulated independently
- Ensure spatial information can be expanded when needed
