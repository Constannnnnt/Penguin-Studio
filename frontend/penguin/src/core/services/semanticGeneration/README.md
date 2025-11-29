# Semantic Generation Service

This service converts frontend application state (scene configuration, object metadata, and manipulations) back into the semantic JSON format. It is the inverse of the semantic parsing service.

## Directory Structure

```
semanticGeneration/
├── README.md                 # This file
├── index.ts                  # Main exports
├── types.ts                  # Type definitions and error classes
├── interfaces.ts             # Service interfaces
├── test-utils.ts             # Fast-check arbitraries and test configuration
├── valueConverters.ts        # Value conversion utilities (to be implemented)
├── descriptionGenerators.ts  # Description generation functions (to be implemented)
├── jsonBuilder.ts            # JSON assembly logic (to be implemented)
├── validator.ts              # JSON validation logic (to be implemented)
└── service.ts                # Main service implementation (to be implemented)
```

## Core Components

### 1. Types and Interfaces
- **types.ts**: Error classes, input/output types, validation types
- **interfaces.ts**: Service interfaces for all components

### 2. Value Converters
Converts structured values to natural language:
- Camera angles, lens types, lighting conditions
- Numeric ranges (depth of field, focus, shadow intensity)
- 6DOF lighting direction
- Style and aesthetic values

### 3. Description Generators
Generates natural language descriptions:
- Short scene descriptions
- Object descriptions from metadata
- Background, lighting, aesthetics descriptions
- Photographic characteristics

### 4. JSON Builder
Assembles complete semantic JSON structure:
- Builds objects array from masks
- Combines all components into final JSON

### 5. Validator
Validates generated JSON:
- Schema compliance checking
- Required field validation
- Type validation
- Error reporting

### 6. Main Service
Orchestrates the generation process:
- Reads state from stores
- Coordinates all components
- Handles errors and logging
- Saves files

## Property-Based Testing

This service uses **fast-check** for property-based testing with a minimum of 100 iterations per test.

### Test Configuration
```typescript
import { PBT_CONFIG } from './test-utils';

fc.assert(
  fc.property(arbCameraAngle(), (angle) => {
    // test logic
  }),
  PBT_CONFIG
);
```

### Available Arbitraries
- `arbCameraAngle()`: Camera angle values
- `arbLensType()`: Lens type values
- `arbDepthOfField()`: 0-100 numeric values
- `arbFocusValue()`: 0-100 numeric values
- `arbLightingCondition()`: Lighting condition values
- `arbLightingDirection()`: 6DOF lighting direction
- `arbShadowIntensity()`: 0-5 discrete values
- `arbStyleMedium()`: Style medium values
- `arbAestheticStyle()`: Aesthetic style values

## Error Handling

### Error Types
- **SemanticGenerationError**: Base error class
- **ValidationError**: Schema validation failures
- **MissingFieldError**: Required fields missing
- **ConversionError**: Value conversion failures

### Error Strategy
1. Collect all validation errors before throwing
2. Provide sensible defaults for missing optional fields
3. Fall back to string representation for conversion errors
4. Wrap file system errors with user-friendly messages

## Usage Example

```typescript
import { SemanticGenerationServiceImpl } from '@/services/semanticGeneration/service';
import { useConfigStore } from '@/store/configStore';
import { useSegmentationStore } from '@/store/segmentationStore';

const service = new SemanticGenerationServiceImpl();

// Get current state
const state = {
  sceneConfig: useConfigStore.getState().sceneConfig,
  results: useSegmentationStore.getState().results,
  maskManipulation: useSegmentationStore.getState().maskManipulation,
};

// Generate semantic JSON
const json = service.generateSemanticJSON(state);

// Validate
const validation = service.validate(json);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Save to file
const result = await service.saveToFile(json, 'scene.json');
if (result.success) {
  console.log('Saved to:', result.filename);
}
```

## Implementation Status

- [x] Project structure created
- [x] Type definitions defined
- [x] Interfaces defined
- [x] Error classes implemented
- [x] Fast-check configured
- [x] Test utilities created
- [x] Value converters implementation
- [x] Description generators implementation
- [x] JSON builder implementation
- [x] Validator implementation
- [x] Main service implementation
- [x] State reader implementation
- [x] File saver implementation
- [x] User notification implementation
- [ ] UI integration

## New Components

### SemanticGenerationService
Main service class that orchestrates semantic JSON generation:
- `generateSemanticJSON(state?)`: Generate semantic JSON from state
- `validate(json)`: Validate semantic JSON against schema
- `saveToFile(json, filename)`: Save JSON to file and trigger download

### State Reader
Functions for reading and validating current state:
- `readCurrentState()`: Read combined state from stores
- `validateStateCompleteness()`: Check if state is complete
- `getSafeStateCopy()`: Get deep copy of state

### File Saver
Utilities for saving semantic JSON files:
- `saveSemanticJSONToFile(json, filename)`: Save JSON to file
- `generateSemanticJSONFilename(prefix)`: Generate timestamped filename
- `isValidFilename(filename)`: Validate filename safety
- `sanitizeFilename(filename)`: Sanitize filename

### Notifier
User notification functions using toast notifications:
- `notifySaveSuccess(result)`: Notify successful save
- `notifySaveError(error)`: Notify save error
- `notifyValidationErrors(result)`: Notify validation errors
- `notifyGenerationStarted()`: Notify generation started
- `notifyMissingState(fields)`: Notify missing required state
- `notifyStateWarnings(warnings)`: Notify state warnings
- `notify(type, title, description)`: Generic notification

## Quick Start

```typescript
import { semanticGenerationService } from '@/services/semanticGeneration';

// Generate and save in one go
const json = semanticGenerationService.generateSemanticJSON();
const result = await semanticGenerationService.saveToFile(json, 'my-scene.json');
```

See [USAGE.md](./USAGE.md) for detailed usage examples and best practices.
