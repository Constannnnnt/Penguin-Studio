# Design Document

## Overview

The Aesthetics Visual Reference enhancement transforms the Aesthetics Section from a simple dropdown-based interface into an interactive, visually-guided experience. Users can expand collapsible sections to view preview images or color swatches that demonstrate what each aesthetic option looks like before selecting it. The Color Scheme section integrates with the Image Controls Tab to automatically apply corresponding color adjustments, creating a seamless workflow for achieving desired visual styles.

## Architecture

The enhancement follows a component-based architecture with three main layers:

```
AestheticsSection (Enhanced)
├── CollapsibleAestheticOption (Reusable Component)
│   ├── Header (Label + Current Value + Dropdown Button)
│   └── ExpandedContent
│       ├── PreviewGrid (for image-based options)
│       └── ColorSwatchGrid (for color scheme)
├── ColorSchemeIntegration (Service Layer)
│   ├── ColorSchemeMappings (Constants)
│   └── ImageControlsUpdater (State Management)
└── AnimationController (UI Layer)
    ├── ExpandCollapseAnimation
    └── IconRotationAnimation
```

### Key Design Decisions

1. **Reusable Collapsible Component**: A single `CollapsibleAestheticOption` component handles all aesthetic sections, reducing code duplication and ensuring consistent behavior.

2. **Accordion Pattern**: Only one section can be expanded at a time, keeping the interface clean and focused.

3. **Color Scheme Mappings as Constants**: RGB/HDR values are defined as constants for maintainability and consistency.

4. **Integration via Store**: Color scheme changes update the imageEditStore directly, ensuring synchronization with Image Controls Tab.

5. **Lazy Loading**: Preview images are loaded only when sections are expanded, improving initial load performance.

## Components and Interfaces

### CollapsibleAestheticOption Component

```typescript
interface CollapsibleAestheticOptionProps {
  label: string;
  currentValue: string;
  options: AestheticOption[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  renderPreview: 'image' | 'color-swatch';
}

interface AestheticOption {
  value: string;
  label: string;
  previewSrc?: string; // For image previews
  colorValues?: ColorAdjustments; // For color scheme
}

interface ColorAdjustments {
  saturation: number;
  temperature: number;
  tint: number;
  vibrance: number;
}
```

### Enhanced AestheticsSection Component

```typescript
interface AestheticsSectionProps {
  // Uses configStore for state management
}

interface AestheticsSectionState {
  expandedSection: AestheticSectionType | null;
  previousColorAdjustments: ColorAdjustments | null;
}

type AestheticSectionType = 
  | 'style-medium'
  | 'aesthetic-style'
  | 'composition'
  | 'mood-atmosphere'
  | 'color-scheme';
```

### PreviewGrid Component

```typescript
interface PreviewGridProps {
  options: AestheticOption[];
  onSelect: (value: string) => void;
  currentValue: string;
}

// Renders a grid of preview images with hover effects
// Highlights the currently selected option
// Handles image loading errors with fallback placeholders
```

### ColorSwatchGrid Component

```typescript
interface ColorSwatchGridProps {
  options: ColorSchemeOption[];
  onSelect: (value: string) => void;
  currentValue: string;
}

interface ColorSchemeOption extends AestheticOption {
  swatchGradient: string; // CSS gradient string
  colorValues: ColorAdjustments;
}

// Renders a grid of color swatches with gradients
// Shows color scheme name below each swatch
// Applies hover effects for interactivity
```

## Data Models

### Color Scheme Mappings

```typescript
const COLOR_SCHEME_MAPPINGS: Record<string, ColorAdjustments> = {
  vibrant: {
    saturation: 40,
    temperature: 0,
    tint: 0,
    vibrance: 50,
  },
  muted: {
    saturation: -30,
    temperature: 0,
    tint: 0,
    vibrance: -20,
  },
  monochrome: {
    saturation: -100,
    temperature: 0,
    tint: 0,
    vibrance: -100,
  },
  warm: {
    saturation: 10,
    temperature: 35,
    tint: 15,
    vibrance: 20,
  },
  cool: {
    saturation: 10,
    temperature: -35,
    tint: -15,
    vibrance: 20,
  },
};
```

### Preview Image Paths

```typescript
const STYLE_MEDIUM_PREVIEWS: Record<string, string> = {
  photograph: '/previews/style-medium/photograph.jpg',
  painting: '/previews/style-medium/painting.jpg',
  'digital-art': '/previews/style-medium/digital-art.jpg',
  sketch: '/previews/style-medium/sketch.jpg',
  '3d-render': '/previews/style-medium/3d-render.jpg',
};

const AESTHETIC_STYLE_PREVIEWS: Record<string, string> = {
  realistic: '/previews/aesthetic-style/realistic.jpg',
  artistic: '/previews/aesthetic-style/artistic.jpg',
  stylized: '/previews/aesthetic-style/stylized.jpg',
  abstract: '/previews/aesthetic-style/abstract.jpg',
  minimalist: '/previews/aesthetic-style/minimalist.jpg',
};

const COMPOSITION_PREVIEWS: Record<string, string> = {
  centered: '/previews/composition/centered.jpg',
  'rule-of-thirds': '/previews/composition/rule-of-thirds.jpg',
  diagonal: '/previews/composition/diagonal.jpg',
  symmetrical: '/previews/composition/symmetrical.jpg',
  asymmetrical: '/previews/composition/asymmetrical.jpg',
};

const MOOD_ATMOSPHERE_PREVIEWS: Record<string, string> = {
  neutral: '/previews/mood/neutral.jpg',
  cheerful: '/previews/mood/cheerful.jpg',
  dramatic: '/previews/mood/dramatic.jpg',
  serene: '/previews/mood/serene.jpg',
  mysterious: '/previews/mood/mysterious.jpg',
};
```

### Color Swatch Gradients

```typescript
const COLOR_SCHEME_SWATCHES: Record<string, string> = {
  vibrant: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #FFE66D 100%)',
  muted: 'linear-gradient(135deg, #A8A8A8 0%, #C4C4C4 50%, #D8D8D8 100%)',
  monochrome: 'linear-gradient(135deg, #000000 0%, #808080 50%, #FFFFFF 100%)',
  warm: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FDC830 100%)',
  cool: 'linear-gradient(135deg, #4A90E2 0%, #50C9C3 50%, #A8E6CF 100%)',
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, the following consolidations eliminate redundancy:

- Requirements 1.2, 2.2, 3.2, 4.2, 5.2 all describe the same collapsible behavior → combine into Property 1
- Requirements 1.3, 2.3, 3.3, 4.3 all describe preview image rendering → combine into Property 2
- Requirements 1.4, 2.4, 3.4, 4.4 all describe collapse behavior → combine into Property 3
- Requirements 1.5, 2.5, 3.5, 4.5 all describe selection behavior → combine into Property 4
- Requirements 5.4 and 5.5 both describe color adjustment application → combine into Property 5
- Requirements 6.1, 6.2, 6.3, 6.4, 6.5 all describe section ordering → combine into Property 6
- Requirements 7.2, 7.3, 7.4, 7.5, 7.6 are specific examples of 7.1 → combine into Property 7
- Requirements 8.1 and 8.2 describe the same animation behavior → combine into Property 8
- Requirements 8.3 and 8.4 describe icon rotation state → combine into Property 9

### Core Properties

Property 1: Collapsible section toggle behavior
*For any* aesthetic section, clicking the dropdown button should toggle the expanded state, showing options when expanded and hiding them when collapsed
**Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2**

Property 2: Preview rendering completeness
*For any* aesthetic section with image previews, when expanded, the system should render a preview image for each available option
**Validates: Requirements 1.3, 2.3, 3.3, 4.3**

Property 3: Collapse state consistency
*For any* aesthetic section, when collapsed, the system should hide all preview content and display only the header row with label, current value, and dropdown button
**Validates: Requirements 1.4, 2.4, 3.4, 4.4**

Property 4: Selection and collapse behavior
*For any* aesthetic option selection, the system should update the configuration with the selected value and collapse the section
**Validates: Requirements 1.5, 2.5, 3.5, 4.5**

Property 5: Color scheme adjustment application
*For any* color scheme selection, the system should apply all corresponding RGB/HDR adjustment values (saturation, temperature, tint, vibrance) to the Image Controls Tab
**Validates: Requirements 5.4, 5.5**

Property 6: Section ordering consistency
*For any* rendering of the Aesthetics Section, the sections should appear in the order: Style Medium, Aesthetic Style, Composition, Mood & Atmosphere, Color Scheme
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

Property 7: Color scheme mapping completeness
*For any* color scheme option, the system should have defined RGB/HDR adjustment values in the mapping constants
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

Property 8: Expansion animation triggering
*For any* section toggle action, the system should trigger smooth expand or collapse animations
**Validates: Requirements 8.1, 8.2**

Property 9: Icon rotation state synchronization
*For any* section expanded state change, the dropdown icon rotation should reflect the current state (rotated when expanded, default when collapsed)
**Validates: Requirements 8.3, 8.4**

Property 10: Accordion behavior enforcement
*For any* section expansion, if another section is currently expanded, the system should collapse the previously expanded section
**Validates: Requirements 8.5**

Property 11: Preview image sizing consistency
*For any* section with preview images, all images within that section should have consistent dimensions
**Validates: Requirements 9.1**

Property 12: Hover feedback provision
*For any* preview image or color swatch, hovering should trigger visual feedback indicating selectability
**Validates: Requirements 9.2**

Property 13: Aspect ratio preservation
*For any* preview image rendering, the system should maintain the original aspect ratio to prevent distortion
**Validates: Requirements 9.3**

Property 14: Responsive image scaling
*For any* viewport size change, preview images should scale appropriately while maintaining their aspect ratios
**Validates: Requirements 9.4**

Property 15: Image load error handling
*For any* preview image that fails to load, the system should display a fallback placeholder containing the option name
**Validates: Requirements 9.5**

Property 16: Previous value storage
*For any* color scheme application, the system should store the current color adjustment values before applying the new scheme
**Validates: Requirements 10.1**

Property 17: Color scheme reversion
*For any* stored previous color adjustment values, the system should provide a mechanism to restore those values
**Validates: Requirements 10.2**

Property 18: Manual adjustment preservation
*For any* manual color adjustment made after applying a color scheme, the system should preserve those manual changes
**Validates: Requirements 10.3**

Property 19: Immediate color scheme application
*For any* color scheme selection, the system should apply the new scheme immediately without requiring user confirmation
**Validates: Requirements 10.4**

Property 20: Reset completeness
*For any* image edit reset action, the system should clear both color scheme selections and all manual color adjustments
**Validates: Requirements 10.5**

## Error Handling

### Image Loading Failures

- **Preview Image 404**: Display fallback placeholder with option name and icon
- **Network Timeout**: Show loading state, then fallback after timeout
- **Corrupted Image**: Detect and replace with placeholder
- **Missing Image Path**: Log warning and show placeholder immediately

### State Management Errors

- **Invalid Color Scheme**: Validate against known mappings, fallback to neutral
- **Missing Previous Values**: Disable revert functionality if no previous state exists
- **Store Update Failures**: Log error and show user notification
- **Concurrent Updates**: Use optimistic updates with rollback on failure

### Animation Errors

- **Animation Not Supported**: Fallback to instant expand/collapse
- **Performance Issues**: Reduce animation complexity on low-end devices
- **Animation Interruption**: Allow new animations to cancel previous ones

### Integration Errors

- **Image Controls Tab Not Available**: Queue color adjustments for later application
- **Store Not Initialized**: Wait for store initialization before applying changes
- **Invalid Adjustment Values**: Clamp values to valid ranges before application

## Testing Strategy

### Unit Testing Approach

Unit tests will focus on:
- CollapsibleAestheticOption component rendering and interaction
- PreviewGrid and ColorSwatchGrid component behavior
- Color scheme mapping constant completeness
- State management functions for expand/collapse
- Image loading error handling
- Animation trigger logic

### Property-Based Testing Approach

Property-based tests will use **fast-check** library for TypeScript and run a minimum of 100 iterations per test. Each property-based test will be tagged with comments referencing the design document properties.

**Property-based testing requirements**:
- Generate random section states (expanded/collapsed)
- Test color scheme mappings with all defined schemes
- Validate preview image rendering across all options
- Test accordion behavior with random section selections
- Verify responsive behavior at various viewport sizes

**Test generators will include**:
- `arbitraryAestheticSection()`: Generates random aesthetic section configurations
- `arbitraryColorScheme()`: Generates valid color scheme selections
- `arbitraryColorAdjustments()`: Generates valid RGB/HDR adjustment values
- `arbitraryViewportSize()`: Generates various screen dimensions
- `arbitraryImageLoadState()`: Generates success/failure states for image loading

### Integration Testing

Integration tests will verify:
- End-to-end color scheme selection and Image Controls Tab updates
- Section expansion/collapse with state persistence
- Preview image loading and fallback behavior
- Accordion behavior across multiple sections
- Responsive layout changes at different breakpoints

### Accessibility Testing

Accessibility tests will ensure:
- Keyboard navigation for collapsible sections (Enter/Space to toggle)
- Screen reader announcements for section state changes
- ARIA labels for preview images and color swatches
- Focus management when sections expand/collapse
- Color contrast compliance for all text and UI elements

### Visual Regression Testing

Visual regression tests will validate:
- Preview image layout and sizing consistency
- Color swatch gradient rendering accuracy
- Animation smoothness and timing
- Responsive layout at various breakpoints
- Hover state visual feedback

## Implementation Notes

### Preview Image Strategy

Preview images should be:
- **Optimized**: Use WebP format with JPEG fallback
- **Sized Appropriately**: 200x150px for consistent grid layout
- **Lazy Loaded**: Load only when section is expanded
- **Cached**: Use browser caching for repeated views
- **Accessible**: Include alt text describing the aesthetic

### Animation Performance

To ensure smooth animations:
- Use CSS transforms (translate, scale) instead of position changes
- Leverage `will-change` property for animated elements
- Use `requestAnimationFrame` for JavaScript-driven animations
- Implement `prefers-reduced-motion` media query support
- Keep animation duration under 300ms for responsiveness

### Color Scheme Integration

When applying color schemes:
- Store previous values before applying new scheme
- Apply all adjustments atomically to prevent partial updates
- Debounce rapid scheme changes to prevent performance issues
- Provide visual feedback during application
- Allow manual overrides after scheme application

### Responsive Considerations

- **Mobile**: Single column grid for previews, larger touch targets
- **Tablet**: Two-column grid for previews, medium-sized images
- **Desktop**: Three-column grid for previews, full-sized images
- **Large Desktop**: Four-column grid with larger previews

### State Management

Use Zustand store patterns:
- `expandedSection`: Track which section is currently expanded
- `previousColorAdjustments`: Store values before color scheme application
- `colorSchemeHistory`: Maintain history for undo/redo functionality
- Implement selectors for efficient re-rendering

### Accessibility Implementation

- Use semantic HTML (`<button>`, `<section>`, `<img>`)
- Implement ARIA attributes (`aria-expanded`, `aria-controls`, `aria-label`)
- Ensure keyboard navigation with proper focus management
- Provide screen reader announcements for state changes
- Support high contrast mode for color swatches

### Performance Optimizations

- Memoize preview grid rendering with `React.memo`
- Use `useMemo` for color scheme mapping lookups
- Implement intersection observer for lazy loading
- Debounce rapid section toggles
- Use CSS containment for animation performance
