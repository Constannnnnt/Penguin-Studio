# Design Document

## Overview

The Semantic Generation Service is the inverse of the Semantic Parsing Service. While semantic parsing converts natural language JSON into structured frontend state, semantic generation converts structured frontend state back into natural language JSON. This enables users to export their edited scenes in the same semantic format used for input, creating a complete round-trip capability.

The service takes the current state from Zustand stores (configStore and segmentationStore), processes all scene configuration, object metadata, and transformations, and generates a semantic JSON file that matches the format of the example files (01.json, 02.json, 03.json).

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  Config Store  │         │ Segmentation     │           │
│  │                │         │ Store            │           │
│  │ - Scene Config │         │ - Objects        │           │
│  │ - Aesthetics   │         │ - Metadata       │           │
│  │ - Camera       │         │ - Transforms     │           │
│  │ - Lighting     │         │ - Image Edits    │           │
│  └────────┬───────┘         └────────┬─────────┘           │
│           │                          │                      │
│           └──────────┬───────────────┘                      │
│                      │                                      │
│                      ▼                                      │
│         ┌────────────────────────────┐                     │
│         │ Semantic Generation        │                     │
│         │ Service                    │                     │
│         │                            │                     │
│         │ - Value Converters         │                     │
│         │ - Description Generators   │                     │
│         │ - JSON Builder             │                     │
│         │ - Validator                │                     │
│         └────────────┬───────────────┘                     │
│                      │                                      │
│                      ▼                                      │
│         ┌────────────────────────────┐                     │
│         │  Semantic JSON Output      │                     │
│         │                            │                     │
│         │  {                         │                     │
│         │    short_description,      │                     │
│         │    objects: [...],         │                     │
│         │    background_setting,     │                     │
│         │    lighting: {...},        │                     │
│         │    aesthetics: {...},      │                     │
│         │    ...                     │                     │
│         │  }                         │                     │
│         └────────────┬───────────────┘                     │
│                      │                                      │
│                      ▼                                      │
│         ┌────────────────────────────┐                     │
│         │  File Save / Download      │                     │
│         └────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. User triggers "Refine" or "Export" action
2. Service reads current state from stores
3. Value converters transform numeric/enum values to natural language
4. Description generators create coherent text from metadata
5. JSON builder assembles complete semantic JSON structure
6. Validator checks output against schema
7. File is saved/downloaded with user notification

## Components and Interfaces

### 1. SemanticGenerationService

Main service class that orchestrates the generation process.

```typescript
interface SemanticGenerationService {
  /**
   * Generate semantic JSON from current frontend state
   * @param state - Combined state from stores
   * @returns Semantic JSON object
   * @throws ValidationException if state is invalid
   */
  generateSemanticJSON(state: CombinedState): SemanticJSON;
  
  /**
   * Save semantic JSON to file
   * @param json - Semantic JSON object
   * @param filename - Output filename
   * @returns Promise resolving to save result
   */
  saveToFile(json: SemanticJSON, filename: string): Promise<SaveResult>;
  
  /**
   * Validate semantic JSON against schema
   * @param json - JSON to validate
   * @returns Validation result with errors if any
   */
  validate(json: SemanticJSON): ValidationResult;
}
```

### 2. ValueConverters

Utility functions for converting structured values to natural language.

```typescript
interface ValueConverters {
  /**
   * Convert camera angle to descriptive text
   */
  convertCameraAngle(angle: CameraAngle | string): string;
  
  /**
   * Convert lens focal length to descriptive text
   */
  convertLensFocalLength(lens: LensType | string): string;
  
  /**
   * Convert depth of field (0-100) to descriptive text
   */
  convertDepthOfField(value: number): string;
  
  /**
   * Convert focus value (0-100) to descriptive text
   */
  convertFocus(value: number): string;
  
  /**
   * Convert lighting conditions to descriptive text
   */
  convertLightingConditions(conditions: LightingCondition | string): string;
  
  /**
   * Convert 6DOF lighting direction to natural language
   */
  convertLightingDirection(direction: LightingDirectionValue): string;
  
  /**
   * Convert shadow intensity (0-5) to descriptive text
   */
  convertShadowIntensity(intensity: ShadowIntensity): string;
  
  /**
   * Convert style medium to descriptive text
   */
  convertStyleMedium(medium: StyleMedium | string): string;
  
  /**
   * Convert aesthetic style to descriptive text
   */
  convertAestheticStyle(style: AestheticStyle | string): string;
}
```

### 3. DescriptionGenerators

Functions for generating natural language descriptions from metadata.

```typescript
interface DescriptionGenerators {
  /**
   * Generate short description for entire scene
   */
  generateShortDescription(state: CombinedState): string;
  
  /**
   * Generate object description from metadata
   */
  generateObjectDescription(
    metadata: MaskMetadata,
    manipulation: MaskManipulationState
  ): ObjectDescription;
  
  /**
   * Generate background setting description
   */
  generateBackgroundDescription(background: string): string;
  
  /**
   * Generate lighting description
   */
  generateLightingDescription(lighting: LightingConfig): LightingDescription;
  
  /**
   * Generate aesthetics description
   */
  generateAestheticsDescription(aesthetics: AestheticsConfig): AestheticsDescription;
  
  /**
   * Generate photographic characteristics description
   */
  generatePhotographicDescription(
    photo: PhotographicConfig
  ): PhotographicDescription;
}
```

### 4. JSONBuilder

Assembles the complete semantic JSON structure.

```typescript
interface JSONBuilder {
  /**
   * Build complete semantic JSON from components
   */
  build(components: JSONComponents): SemanticJSON;
  
  /**
   * Build objects array from segmentation results
   */
  buildObjects(
    masks: MaskMetadata[],
    manipulations: Map<string, MaskManipulationState>
  ): ObjectDescription[];
  
  /**
   * Build lighting object
   */
  buildLighting(lighting: LightingConfig): LightingDescription;
  
  /**
   * Build aesthetics object
   */
  buildAesthetics(aesthetics: AestheticsConfig): AestheticsDescription;
  
  /**
   * Build photographic characteristics object
   */
  buildPhotographicCharacteristics(
    photo: PhotographicConfig
  ): PhotographicDescription;
}
```

## Data Models

### Input Types (from stores)

```typescript
interface CombinedState {
  // From configStore
  sceneConfig: SceneConfiguration;
  config: PenguinConfig;
  
  // From segmentationStore
  results: SegmentationResponse | null;
  maskManipulation: Map<string, MaskManipulationState>;
}

interface SceneConfiguration {
  background_setting: string;
  photographic_characteristics: PhotographicConfig;
  lighting: LightingConfig;
  aesthetics: AestheticsConfig;
}

interface MaskMetadata {
  mask_id: string;
  objectId?: string;
  label: string;
  confidence: number;
  bounding_box: BoundingBox;
  area_pixels: number;
  area_percentage: number;
  centroid: [number, number];
  mask_url: string;
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

interface MaskManipulationState {
  maskId: string;
  originalBoundingBox: BoundingBox;
  currentBoundingBox: BoundingBox;
  transform: MaskTransform;
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | null;
  isHidden: boolean;
}

interface MaskTransform {
  position: { x: number; y: number };
  scale: { width: number; height: number };
  imageEdits: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    exposure: number;
    vibrance: number;
  };
}
```

### Output Types (semantic JSON)

```typescript
interface SemanticJSON {
  short_description: string;
  objects: ObjectDescription[];
  background_setting: string;
  lighting: LightingDescription;
  aesthetics: AestheticsDescription;
  photographic_characteristics: PhotographicDescription;
  style_medium: string;
  context?: string;
  artistic_style?: string;
  text_render?: TextRender[];
}

interface ObjectDescription {
  description: string;
  location: string;
  relationship: string;
  relative_size: string;
  shape_and_color: string;
  texture: string;
  appearance_details: string;
  orientation: string;
  number_of_objects?: number;
  pose?: string;
  expression?: string;
  action?: string;
}

interface LightingDescription {
  conditions: string;
  direction: string;
  shadows: string;
}

interface AestheticsDescription {
  composition: string;
  color_scheme: string;
  mood_atmosphere: string;
  preference_score: string;
  aesthetic_score: string;
}

interface PhotographicDescription {
  depth_of_field: string;
  focus: string;
  camera_angle: string;
  lens_focal_length: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Generation completeness
*For any* valid frontend state, generating semantic JSON should produce an object containing all required fields (short_description, objects, background_setting, lighting, aesthetics, photographic_characteristics, style_medium)
**Validates: Requirements 1.2, 9.1, 9.2, 11.3**

### Property 2: Value conversion consistency
*For any* predefined enum value (camera angle, lens type, lighting condition, style medium, aesthetic style), converting to semantic text and back should preserve the semantic meaning
**Validates: Requirements 2.1, 2.2, 2.5, 7.1-7.5**

### Property 3: Numeric range mapping
*For any* numeric value in valid range (depth of field 0-100, focus 0-100, shadow intensity 0-5), converting to semantic text should produce non-empty descriptive text
**Validates: Requirements 2.3, 2.4, 4.1-4.6**

### Property 4: Lighting direction coherence
*For any* lighting direction value (x, y, rotation, tilt), the generated description should mention both horizontal and vertical positioning
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 5: Object metadata preservation
*For any* object with metadata, generating its description should include information from all non-empty metadata fields (description, location, relationship, size, shape_and_color, texture, appearance_details, orientation)
**Validates: Requirements 5.1, 8.1**

### Property 6: Transform reflection in metadata
*For any* object with position transform, the generated location field should differ from the original location
**Validates: Requirements 5.2**

### Property 7: Scale reflection in metadata
*For any* object with scale transform (width or height ≠ 1.0), the generated relative_size field should reflect the size change
**Validates: Requirements 5.3**

### Property 8: Image edit reflection in metadata
*For any* object with non-zero image edits (brightness, contrast, saturation, hue, blur, exposure, vibrance), the generated appearance_details or shape_and_color fields should reflect those edits
**Validates: Requirements 5.4, 12.1-12.7**

### Property 9: Short description comprehensiveness
*For any* scene with objects, background, lighting, and aesthetics set, the generated short_description should contain references to at least two of these categories
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 10: Short description length constraint
*For any* generated short_description, it should contain between 2 and 4 sentences (defined as text segments ending with '.', '!', or '?')
**Validates: Requirements 6.4**

### Property 11: Custom value pass-through
*For any* custom user-entered value (camera angle, lens type, lighting condition, style medium, aesthetic style), the generated JSON should contain that exact custom text
**Validates: Requirements 7.1-7.5, 6.5**

### Property 12: Relationship update on position change
*For any* two objects where one is moved significantly (>10% of image dimensions), the relationship description should be updated to reflect the new spatial arrangement
**Validates: Requirements 8.2, 8.5**

### Property 13: Validation schema compliance
*For any* generated semantic JSON, validating it against the schema should return no errors
**Validates: Requirements 10.1, 10.4**

### Property 14: Error reporting specificity
*For any* invalid state that causes validation failure, the error message should contain the specific field name that is invalid
**Validates: Requirements 10.3, 10.5**

### Property 15: Default value provision
*For any* state with missing required fields, generating semantic JSON should either provide default values or throw a descriptive error
**Validates: Requirements 10.2**

### Property 16: Round-trip consistency (with semantic parsing)
*For any* semantic JSON generated from state, parsing it back through the semantic parsing service should produce equivalent state values (within tolerance for numeric conversions)
**Validates: Requirements 1.1, 1.2, 1.3** (This is the ultimate correctness property - ensuring the generation is the true inverse of parsing)

## Error Handling

### Error Types

```typescript
class SemanticGenerationError extends Error {
  code: string;
  details?: Record<string, any>;
}

class ValidationError extends SemanticGenerationError {
  code = 'VALIDATION_ERROR';
  field: string;
  expectedType: string;
  actualValue: any;
}

class MissingFieldError extends SemanticGenerationError {
  code = 'MISSING_FIELD';
  field: string;
  canProvideDefault: boolean;
}

class ConversionError extends SemanticGenerationError {
  code = 'CONVERSION_ERROR';
  field: string;
  value: any;
  reason: string;
}
```

### Error Handling Strategy

1. **Validation Errors**: Collect all validation errors before throwing, provide complete error report
2. **Missing Fields**: Attempt to provide sensible defaults, log warnings for missing optional fields
3. **Conversion Errors**: Fall back to string representation of value, log warning
4. **File Save Errors**: Catch and wrap file system errors, provide user-friendly messages

### Logging

```typescript
// Log levels for different operations
logger.info('Starting semantic JSON generation');
logger.debug('Converting camera angle:', angle);
logger.warn('Missing optional field:', field);
logger.error('Validation failed:', errors);
```

## Testing Strategy

### Unit Tests

1. **Value Converter Tests**
   - Test each converter function with all valid enum values
   - Test numeric converters with boundary values (0, 50, 100)
   - Test custom value pass-through
   - Test edge cases (null, undefined, empty string)

2. **Description Generator Tests**
   - Test short description generation with various state combinations
   - Test object description generation with complete and partial metadata
   - Test lighting description with all direction combinations
   - Test aesthetic description generation

3. **JSON Builder Tests**
   - Test building complete JSON from valid components
   - Test building with missing optional fields
   - Test building with custom values

4. **Validator Tests**
   - Test validation with valid JSON
   - Test validation with missing required fields
   - Test validation with invalid field types
   - Test error message specificity

### Property-Based Tests

We will use **fast-check** for TypeScript property-based testing. Each property-based test should run a minimum of 100 iterations.

1. **Property 1: Generation completeness**
   - Generate random valid frontend states
   - Verify all required fields are present in output
   - Tag: **Feature: semantic-generation-service, Property 1: Generation completeness**

2. **Property 2: Value conversion consistency**
   - Generate random enum values
   - Convert to semantic text
   - Verify semantic meaning is preserved
   - Tag: **Feature: semantic-generation-service, Property 2: Value conversion consistency**

3. **Property 3: Numeric range mapping**
   - Generate random numeric values in valid ranges
   - Convert to semantic text
   - Verify output is non-empty and descriptive
   - Tag: **Feature: semantic-generation-service, Property 3: Numeric range mapping**

4. **Property 4: Lighting direction coherence**
   - Generate random lighting direction values
   - Convert to description
   - Verify both horizontal and vertical positioning are mentioned
   - Tag: **Feature: semantic-generation-service, Property 4: Lighting direction coherence**

5. **Property 5: Object metadata preservation**
   - Generate random objects with complete metadata
   - Generate descriptions
   - Verify all metadata fields are represented
   - Tag: **Feature: semantic-generation-service, Property 5: Object metadata preservation**

6. **Property 6: Transform reflection in metadata**
   - Generate random objects with position transforms
   - Generate descriptions
   - Verify location field differs from original
   - Tag: **Feature: semantic-generation-service, Property 6: Transform reflection in metadata**

7. **Property 7: Scale reflection in metadata**
   - Generate random objects with scale transforms
   - Generate descriptions
   - Verify relative_size reflects the change
   - Tag: **Feature: semantic-generation-service, Property 7: Scale reflection in metadata**

8. **Property 8: Image edit reflection in metadata**
   - Generate random objects with image edits
   - Generate descriptions
   - Verify edits are reflected in appearance/color fields
   - Tag: **Feature: semantic-generation-service, Property 8: Image edit reflection in metadata**

9. **Property 9: Short description comprehensiveness**
   - Generate random complete scenes
   - Generate short descriptions
   - Verify at least two categories are mentioned
   - Tag: **Feature: semantic-generation-service, Property 9: Short description comprehensiveness**

10. **Property 10: Short description length constraint**
    - Generate random scenes
    - Generate short descriptions
    - Verify 2-4 sentence length
    - Tag: **Feature: semantic-generation-service, Property 10: Short description length constraint**

11. **Property 11: Custom value pass-through**
    - Generate random custom values
    - Generate JSON
    - Verify exact custom text is preserved
    - Tag: **Feature: semantic-generation-service, Property 11: Custom value pass-through**

12. **Property 12: Relationship update on position change**
    - Generate random object pairs
    - Move one object significantly
    - Verify relationship description updates
    - Tag: **Feature: semantic-generation-service, Property 12: Relationship update on position change**

13. **Property 13: Validation schema compliance**
    - Generate random valid states
    - Generate JSON
    - Verify validation passes
    - Tag: **Feature: semantic-generation-service, Property 13: Validation schema compliance**

14. **Property 14: Error reporting specificity**
    - Generate random invalid states
    - Attempt generation
    - Verify error messages contain field names
    - Tag: **Feature: semantic-generation-service, Property 14: Error reporting specificity**

15. **Property 15: Default value provision**
    - Generate random states with missing fields
    - Generate JSON
    - Verify defaults are provided or errors are descriptive
    - Tag: **Feature: semantic-generation-service, Property 15: Default value provision**

16. **Property 16: Round-trip consistency**
    - Generate random semantic JSON
    - Parse to state
    - Generate back to JSON
    - Verify equivalence (within tolerance)
    - Tag: **Feature: semantic-generation-service, Property 16: Round-trip consistency**

### Integration Tests

1. **End-to-End Generation Test**
   - Load example state from stores
   - Generate semantic JSON
   - Validate output
   - Save to file
   - Verify file contents

2. **Round-Trip Test**
   - Load example JSON (01.json, 02.json, 03.json)
   - Parse to state
   - Generate back to JSON
   - Compare with original (allowing for semantic equivalence)

3. **User Workflow Test**
   - Simulate user editing scene
   - Generate JSON at various stages
   - Verify each generation is valid

## Implementation Notes

### Value Conversion Mappings

```typescript
// Depth of field mapping (0-100 to text)
const DEPTH_OF_FIELD_MAP = {
  0-20: 'very shallow',
  21-40: 'shallow',
  41-60: 'medium',
  61-80: 'deep',
  81-100: 'very deep'
};

// Focus mapping (0-100 to text)
const FOCUS_MAP = {
  0-20: 'soft focus',
  21-40: 'slight soft focus',
  41-60: 'sharp focus',
  61-80: 'very sharp focus',
  81-100: 'hyper sharp focus'
};

// Shadow intensity mapping (0-5 to text)
const SHADOW_INTENSITY_MAP = {
  0: 'no shadows',
  1: 'subtle shadows',
  2: 'soft shadows',
  3: 'moderate shadows',
  4: 'strong shadows',
  5: 'dramatic shadows'
};
```

### Lighting Direction Algorithm

```typescript
function convertLightingDirection(direction: LightingDirectionValue): string {
  const { x, y, rotation, tilt } = direction;
  
  // Determine horizontal position
  let horizontal = '';
  if (x < 30) horizontal = 'from the left';
  else if (x > 70) horizontal = 'from the right';
  else horizontal = 'centered';
  
  // Determine vertical position
  let vertical = '';
  if (y < 30) vertical = 'from above';
  else if (y > 70) vertical = 'from below';
  else vertical = 'at eye-level';
  
  // Incorporate tilt
  let tiltDesc = '';
  if (Math.abs(tilt) > 30) {
    tiltDesc = tilt < 0 ? ', angled downward' : ', angled upward';
  }
  
  // Incorporate rotation if significant
  let rotationDesc = '';
  if (rotation > 45 && rotation < 135) {
    rotationDesc = ', from the side';
  }
  
  return `${vertical} and ${horizontal}${tiltDesc}${rotationDesc}`;
}
```

### Short Description Generation Strategy

1. Start with object count and primary objects
2. Add background setting if notable
3. Add lighting characteristics if distinctive
4. Add aesthetic/mood if set
5. Ensure 2-4 sentences, combining related information

Example:
```typescript
function generateShortDescription(state: CombinedState): string {
  const sentences: string[] = [];
  
  // Sentence 1: Objects
  if (state.results?.masks.length) {
    const objectLabels = state.results.masks.map(m => m.label).slice(0, 3);
    sentences.push(`A scene featuring ${objectLabels.join(', ')}.`);
  }
  
  // Sentence 2: Background and lighting
  const bg = state.sceneConfig.background_setting;
  const lighting = convertLightingConditions(state.sceneConfig.lighting.conditions);
  sentences.push(`Set against ${bg}, with ${lighting}.`);
  
  // Sentence 3: Aesthetics
  const mood = state.sceneConfig.aesthetics.mood_atmosphere;
  const style = state.sceneConfig.aesthetics.aesthetic_style;
  sentences.push(`The overall mood is ${mood}, with a ${style} aesthetic.`);
  
  return sentences.join(' ');
}
```

## Performance Considerations

1. **Caching**: Cache converted values for repeated conversions
2. **Lazy Evaluation**: Only generate descriptions for visible/selected objects initially
3. **Debouncing**: Debounce generation during rapid user edits
4. **Async Processing**: Use async/await for file operations
5. **Memory**: Clear large intermediate data structures after generation

## Security Considerations

1. **Input Validation**: Validate all state values before processing
2. **Output Sanitization**: Sanitize generated text to prevent injection
3. **File Path Validation**: Validate file paths before saving
4. **Size Limits**: Enforce reasonable limits on generated JSON size
5. **Error Messages**: Don't expose internal system details in error messages

## Future Enhancements

1. **Template System**: Allow users to customize description templates
2. **Multi-Language Support**: Generate descriptions in multiple languages
3. **Compression**: Optionally compress generated JSON for storage
4. **Versioning**: Include schema version in generated JSON
5. **Diff Generation**: Generate only changed fields for incremental updates
6. **AI Enhancement**: Use LLM to improve description quality and coherence
