# Design Document

## Overview

The Enhanced Scene Tab redesigns the existing scene configuration interface to provide comprehensive controls for background settings, camera/photographic characteristics, lighting configuration, and aesthetic styles. The design integrates semantic parsing from JSON metadata, introduces new UI components including sliders and interactive lighting direction controls, and consolidates aesthetic and style settings into a unified interface.

## Architecture

The enhanced scene tab follows a modular component architecture that extends the existing Penguin application patterns:

```
EnhancedSceneTab
├── BackgroundSection (uses existing textarea pattern)
├── CameraSection (enhanced with sliders + custom inputs)
├── LightingSection (enhanced with interactive direction control)
└── AestheticsSection (consolidated aesthetics + medium)
```

### Component Hierarchy

- **EnhancedSceneTab**: Main container component that replaces the existing ScenePanel
- **BackgroundSection**: Simple textarea for background_setting (minimal changes)
- **CameraSection**: Enhanced camera controls with buttons + sliders + custom inputs
- **LightingSection**: Enhanced lighting controls with interactive direction indicator
- **AestheticsSection**: Consolidated aesthetics and medium controls
- **LightingDirectionControl**: New interactive component for 6DOF lighting direction
- **DiscreteSlider**: New slider component with discrete value steps
- **CustomInputButton**: New button component that expands to show input field

### Data Flow

1. **JSON Metadata Parsing**: Backend performs semantic similarity parsing
2. **Default Value Application**: Parsed values set as defaults in UI controls
3. **User Interaction**: UI controls update configuration state
4. **State Management**: Zustand store manages scene configuration
5. **Generation Integration**: Configuration included in image generation requests

## Components and Interfaces

### EnhancedSceneTab Component

```typescript
interface EnhancedSceneTabProps {
  // No props - uses store for state management
}

interface SceneConfiguration {
  background_setting: string;
  photographic_characteristics: {
    camera_angle: CameraAngle | string; // string for custom
    lens_focal_length: LensType | string; // string for custom
    depth_of_field: DepthOfFieldValue; // 0-100 scale
    focus: FocusValue; // 0-100 scale
  };
  lighting: {
    conditions: LightingCondition | string; // string for custom
    direction: LightingDirectionValue; // x, y, rotation, tilt
    shadows: ShadowIntensity; // discrete 0-5 scale
  };
  aesthetics: {
    style_medium: StyleMedium | string; // string for custom
    aesthetic_style: AestheticStyle | string; // string for custom
    composition: CompositionType;
    color_scheme: ColorScheme;
    mood_atmosphere: MoodType;
  };
}
```

### CameraSection Component

Enhances existing camera controls with sliders for depth of field and focus:

```typescript
interface CameraSectionProps {
  photographicCharacteristics: PhotographicCharacteristics;
  onUpdate: (field: string, value: unknown) => void;
}

// Button groups for camera_angle and lens_focal_length
const CAMERA_ANGLE_OPTIONS = [
  'eye-level', 'overhead', 'low-angle', 'high-angle', 'custom'
];

const LENS_FOCAL_LENGTH_OPTIONS = [
  'wide-angle', 'standard', 'portrait', 'macro', 'custom'
];

// Slider ranges for depth_of_field and focus
const DEPTH_OF_FIELD_RANGE = {
  min: 0,
  max: 100,
  labels: ['Very Shallow', 'Shallow', 'Medium', 'Deep', 'Very Deep']
};

const FOCUS_RANGE = {
  min: 0,
  max: 100,
  labels: ['Soft Focus', 'Slight Soft', 'Sharp', 'Very Sharp', 'Hyper Sharp']
};
```

### LightingSection Component

Enhanced lighting controls with interactive direction control:

```typescript
interface LightingSectionProps {
  lighting: LightingConfig;
  onUpdate: (field: string, value: unknown) => void;
}

// Button group for lighting conditions
const LIGHTING_CONDITIONS_OPTIONS = [
  'natural', 'studio', 'soft diffused', 'dramatic', 'golden hour', 'custom'
];

// Discrete slider for shadows
const SHADOW_INTENSITY_OPTIONS = [
  'none', 'subtle', 'soft', 'moderate', 'strong', 'dramatic'
];

// Interactive lighting direction
interface LightingDirectionValue {
  x: number; // 0-100 (left to right)
  y: number; // 0-100 (top to bottom)
  rotation: number; // 0-360 degrees
  tilt: number; // -90 to 90 degrees (up/down angle)
}
```

### LightingDirectionControl Component

New interactive component for 6DOF lighting direction:

```typescript
interface LightingDirectionControlProps {
  value: LightingDirectionValue;
  onChange: (value: LightingDirectionValue) => void;
  className?: string;
}

interface FlashlightIconProps {
  x: number;
  y: number;
  rotation: number;
  tilt: number;
  onDrag: (x: number, y: number) => void;
  onRotate: (rotation: number, tilt: number) => void;
}
```

The component renders:
- Rectangle representing image area (aspect ratio 16:9)
- Draggable flashlight icon indicating light position
- Rotation handles for 6DOF orientation
- Text display of current values below rectangle

### DiscreteSlider Component

New slider component with discrete value steps:

```typescript
interface DiscreteSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: string[];
  className?: string;
}
```

Features:
- Discrete steps corresponding to option labels
- Visual indicators at each step
- Current value display as text
- Keyboard navigation support
- Touch-friendly for mobile

### CustomInputButton Component

New button component that expands to show input field:

```typescript
interface CustomInputButtonProps {
  label: string;
  value?: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
}
```

Behavior:
- Initially displays as button labeled "Custom"
- Expands to show input field when clicked
- Includes submit/cancel actions
- Validates input before submission

### AestheticsSection Component

Consolidated aesthetics and medium controls:

```typescript
interface AestheticsSectionProps {
  aesthetics: AestheticsConfig;
  styleMedium: StyleMedium | string;
  onUpdate: (field: string, value: unknown) => void;
}

// Combined style and aesthetic options
const STYLE_MEDIUM_OPTIONS = [
  'photograph', 'painting', 'digital art', 'sketch', '3D render', 'custom'
];

const AESTHETIC_STYLE_OPTIONS = [
  'realistic', 'artistic', 'vintage', 'modern', 'dramatic', 'custom'
];
```

## Data Models

### Enhanced Configuration Types

```typescript
// Extended camera angle type with custom support
type CameraAngle = 
  | 'eye-level' | 'overhead' | 'low-angle' | 'high-angle' 
  | string; // custom values

// Extended lens type with custom support  
type LensType = 
  | 'wide-angle' | 'standard' | 'portrait' | 'macro'
  | string; // custom values

// Numeric depth of field (0-100 scale)
type DepthOfFieldValue = number;

// Numeric focus value (0-100 scale)
type FocusValue = number;

// Extended lighting condition with custom support
type LightingCondition = 
  | 'natural' | 'studio' | 'soft diffused' | 'dramatic' | 'golden hour'
  | string; // custom values

// Discrete shadow intensity (0-5 scale)
type ShadowIntensity = 0 | 1 | 2 | 3 | 4 | 5;

// 6DOF lighting direction
interface LightingDirectionValue {
  x: number; // 0-100 (left to right)
  y: number; // 0-100 (top to bottom) 
  rotation: number; // 0-360 degrees
  tilt: number; // -90 to 90 degrees
}

// Extended style types with custom support
type StyleMedium = 
  | 'photograph' | 'painting' | 'digital art' | 'sketch' | '3D render'
  | string; // custom values

type AestheticStyle = 
  | 'realistic' | 'artistic' | 'vintage' | 'modern' | 'dramatic'
  | string; // custom values
```

### Semantic Parsing Response

```typescript
interface SemanticParsingResponse {
  background_setting: string;
  photographic_characteristics: {
    camera_angle: {
      value: CameraAngle;
      confidence: number;
      isCustom: boolean;
    };
    lens_focal_length: {
      value: LensType;
      confidence: number;
      isCustom: boolean;
    };
    depth_of_field: {
      value: number; // 0-100 scale
      confidence: number;
    };
    focus: {
      value: number; // 0-100 scale
      confidence: number;
    };
  };
  lighting: {
    conditions: {
      value: LightingCondition;
      confidence: number;
      isCustom: boolean;
    };
    direction: {
      value: LightingDirectionValue;
      confidence: number;
    };
    shadows: {
      value: ShadowIntensity;
      confidence: number;
    };
  };
  aesthetics: {
    style_medium: {
      value: StyleMedium;
      confidence: number;
      isCustom: boolean;
    };
    aesthetic_style: {
      value: AestheticStyle;
      confidence: number;
      isCustom: boolean;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.1, 1.2, 1.3 can be combined into a comprehensive background parsing and state management property
- Properties 2.2, 2.6 can be combined into a comprehensive camera parsing and UI state property  
- Properties 3.2, 3.3 can be combined into a comprehensive depth/focus parsing property
- Properties 4.3, 4.5 can be combined into a comprehensive lighting condition property
- Properties 5.2, 5.4 can be combined into a comprehensive shadow parsing and state property
- Properties 6.3, 6.4, 6.5, 6.7 can be combined into a comprehensive lighting direction property
- Properties 7.2, 7.3, 7.7 can be combined into a comprehensive aesthetic parsing and state property
- Properties 8.1, 8.2, 8.3, 8.4, 8.6 can be combined into a comprehensive semantic parsing property
- Properties 9.1, 9.2, 9.3, 9.5, 9.6 can be combined into a comprehensive UI feedback property
- Properties 10.1, 10.2, 10.3, 10.4, 10.5 can be combined into a comprehensive state management property

### Core Properties

Property 1: Background configuration round trip
*For any* JSON metadata with background_setting field, parsing then applying to UI then reading from state should preserve the background value, with fallback to default when field is missing
**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

Property 2: Camera controls semantic parsing
*For any* JSON metadata with photographic_characteristics, the system should parse camera_angle and lens_focal_length values and pre-select corresponding UI buttons, with custom input support for unmatched values
**Validates: Requirements 2.2, 2.5, 2.6**

Property 3: Depth and focus slider parsing
*For any* JSON metadata with depth_of_field and focus values, the system should parse and map these to appropriate slider positions on 0-100 scales
**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

Property 4: Lighting conditions parsing and state
*For any* JSON metadata with lighting conditions, the system should parse and pre-select matching buttons, with custom input support and proper state updates
**Validates: Requirements 4.3, 4.4, 4.5**

Property 5: Shadow intensity parsing and control
*For any* JSON metadata with shadow information, the system should parse shadow characteristics and map to discrete slider values with proper text feedback
**Validates: Requirements 5.2, 5.4, 5.5**

Property 6: Lighting direction interactive control
*For any* lighting direction interaction (drag, rotate, tilt), the system should update flashlight icon position and orientation within rectangle boundaries and reflect changes in configuration state
**Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7**

Property 7: Aesthetic and style parsing
*For any* JSON metadata with style_medium and aesthetics values, the system should parse and pre-select matching buttons with custom input support for both style and aesthetic controls
**Validates: Requirements 7.2, 7.3, 7.6, 7.7**

Property 8: Comprehensive semantic parsing
*For any* valid JSON metadata, the backend should perform semantic similarity parsing for all scene-related fields and return appropriate UI control values with confidence scores and custom flags
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6**

Property 9: UI feedback consistency
*For any* scene control modification (button, slider, custom input, lighting direction), the system should immediately update visual state and provide appropriate feedback
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

Property 10: Scene configuration state management
*For any* scene configuration operation (set, modify, reset, load), the system should properly manage state, include parameters in generation requests, and track changes
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Prework Analysis

<function_calls>
<invoke name="prework">
<parameter name="featureName">enhanced-scene-tab
## Erro
r Handling

### Input Validation

- **Custom Input Validation**: Validate custom text inputs for reasonable length and content
- **Slider Range Validation**: Ensure slider values stay within 0-100 range
- **Lighting Direction Bounds**: Constrain flashlight icon within rectangle boundaries
- **JSON Parsing Errors**: Handle malformed or missing JSON metadata gracefully

### Fallback Strategies

- **Missing Metadata**: Provide sensible defaults when JSON fields are missing
- **Parsing Failures**: Fall back to "custom" options when semantic parsing fails
- **Network Errors**: Cache last known configuration for offline resilience
- **State Corruption**: Reset to defaults if configuration state becomes invalid

### User Feedback

- **Validation Errors**: Display clear error messages for invalid inputs
- **Loading States**: Show loading indicators during semantic parsing
- **Success Confirmation**: Provide visual feedback when settings are saved
- **Warning Messages**: Alert users when using low-confidence parsed values

## Testing Strategy

### Unit Testing Approach

Unit tests will focus on:
- Individual component rendering and behavior
- State management functions and updates
- Input validation and error handling
- Event handler functionality
- Custom input component interactions

### Property-Based Testing Approach

Property-based tests will use **fast-check** library for TypeScript and run a minimum of 100 iterations per test. Each property-based test will be tagged with comments referencing the design document properties.

**Property-based testing requirements**:
- Generate random JSON metadata with various field combinations
- Test semantic parsing with diverse input values
- Validate UI state consistency across all possible configurations
- Verify slider behavior across full range of values
- Test lighting direction control with random positions and orientations

**Test generators will include**:
- `arbitraryJSONMetadata()`: Generates realistic JSON metadata structures
- `arbitraryLightingDirection()`: Generates valid lighting direction values
- `arbitrarySceneConfiguration()`: Generates complete scene configurations
- `arbitraryCustomInputs()`: Generates various custom input strings

### Integration Testing

Integration tests will verify:
- End-to-end scene configuration workflow
- Backend semantic parsing integration
- State persistence across component updates
- Generation request parameter inclusion

### Accessibility Testing

Accessibility tests will ensure:
- Keyboard navigation for all interactive elements
- Screen reader compatibility for sliders and custom inputs
- ARIA labels and roles for complex controls
- Color contrast compliance for all visual indicators

### Performance Testing

Performance tests will validate:
- Smooth drag interactions for lighting direction control
- Responsive slider updates without lag
- Efficient re-rendering during rapid configuration changes
- Memory usage during extended interaction sessions

## Implementation Notes

### Semantic Parsing Integration

The backend semantic parsing service should:
- Use vector similarity for matching JSON values to UI options
- Return confidence scores for all matches
- Provide fallback suggestions for low-confidence matches
- Cache parsing results for performance

### State Management Patterns

- Use Zustand store for scene configuration state
- Implement optimistic updates for immediate UI feedback
- Debounce rapid changes to prevent excessive API calls
- Maintain undo/redo history for user convenience

### Responsive Design Considerations

- Ensure lighting direction control scales appropriately on mobile
- Provide touch-friendly slider interactions
- Adapt button layouts for different screen sizes
- Maintain usability across desktop, tablet, and mobile devices

### Performance Optimizations

- Memoize expensive parsing operations
- Use React.memo for component optimization
- Implement virtual scrolling for large option lists
- Lazy load custom input components when needed

### Accessibility Requirements

- Provide keyboard shortcuts for common actions
- Implement focus management for modal interactions
- Use semantic HTML elements where possible
- Ensure all interactive elements meet WCAG 2.1 AA standards