# Design Document

## Overview

The Bria Image Generation Integration adds AI-powered image generation capabilities to the application using Bria's FIBO model. Users can generate high-quality, commercially-licensed images from text prompts, optionally include reference images for inspiration, and refine generated images by editing their structured prompts. Generated images automatically flow through the existing SAM3 segmentation pipeline, enabling immediate object detection and editing.

The integration uses Bria's `/v2/image/generate` endpoint which follows a two-step generation process:
1. **VLM Bridge**: Translates user input (text/images) into a detailed structured JSON prompt
2. **FIBO Model**: Generates the final image based on the structured prompt

This architecture enables precise control over image generation and supports iterative refinement workflows.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Application                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Image Workspace Component                      │ │
│  │  - Text prompt input                                        │ │
│  │  - Reference image upload                                   │ │
│  │  - Generation parameters (quality, aspect ratio, etc.)      │ │
│  │  - Generate/Refine buttons                                  │ │
│  └────────────┬───────────────────────────────────────────────┘ │
│               │                                                  │
│               ▼                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Bria Generation Store (Zustand)                   │ │
│  │  - Generation state & history                               │ │
│  │  - Current image & structured prompt                        │ │
│  │  - Generation parameters                                    │ │
│  │  - Loading/error states                                     │ │
│  └────────────┬───────────────────────────────────────────────┘ │
│               │                                                  │
│               ▼                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Bria API Client Service                        │ │
│  │  - Authentication                                            │ │
│  │  - Request formatting                                        │ │
│  │  - Response parsing                                          │ │
│  │  - Error handling                                            │ │
│  │  - Rate limiting                                             │ │
│  └────────────┬───────────────────────────────────────────────┘ │
│               │                                                  │
└───────────────┼──────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Bria API                                    │
│                                                                    │
│  ┌──────────────────────┐                                          │
│  │  /v2/image/generate  │                                          │
│  │  (Gemini Bridge)     │                                          │
│  └──────────┬───────────┘                                          │
│             │                                                      │
│             ▼                                                      │
│    Returns: image_url,                                             │
│            structured_prompt,                                      │
│            seed                                                    │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                  Auto-Processing Pipeline                          │
│                                                                    │
│  1. Download generated image                                      │
│  2. Send to SAM3 segmentation service                             │
│  3. Receive masks & object metadata                               │
│  4. Map structured prompt to object metadata                      │
│  5. Initialize mask manipulation states                           │
│  6. Display in workspace with editing enabled                     │
└───────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

#### Generation Flow
1. User enters text prompt and optionally uploads reference image
2. User configures generation parameters (quality, aspect ratio, resolution, seed)
3. User clicks "Generate" button
4. BriaGenerationStore validates inputs and calls BriaAPIClient
5. BriaAPIClient sends request to appropriate endpoint (premium or lite)
6. API returns image URL, structured prompt, and seed
7. Store saves all data and triggers auto-processing
8. Image is downloaded and sent to SAM3 segmentation
9. Segmentation results are displayed with masks and metadata
10. User can immediately edit objects

#### Refinement Flow
1. User completes auto-processing pipeline (image generated and segmented)
2. User edits values in Scene tab (background, lighting, aesthetics, etc.) and/or Objects tab (object descriptions, properties, etc.)
3. System parses edited values back into structured prompt format (similar to semantic generation service)
4. User clicks "Refine" button
5. Store validates and prepares refinement request with updated structured prompt + original seed
6. BriaAPIClient sends structured prompt + seed to `/v2/image/generate` endpoint
7. API returns refined image with updated structured prompt
8. Store replaces current image and triggers re-segmentation
9. Updated segmentation results are displayed with new masks and metadata

## Components and Interfaces

### 1. BriaAPIClient

Service class for interacting with Bria's API.

```typescript
interface BriaAPIClient {
  /**
   * Generate image using Gemini bridge
   */
  generateImage(request: GenerationRequest): Promise<GenerationResult>;
  
  /**
   * Refine existing image with updated structured prompt
   */
  refineImage(request: RefinementRequest): Promise<GenerationResult>;
  
  /**
   * Check API health and authentication
   */
  checkHealth(): Promise<HealthStatus>;
}

interface GenerationRequest {
  prompt?: string;
  images?: string[]; // Base64 encoded or URLs
  structured_prompt?: StructuredPrompt;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: 512 | 768 | 1024;
  seed?: number;
  num_inference_steps?: number;
}

interface RefinementRequest {
  structured_prompt: StructuredPrompt;
  seed: number;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: 512 | 768 | 1024;
}

interface GenerationResult {
  image_url: string;
  structured_prompt: StructuredPrompt;
  seed: number;
  generation_time_ms: number;
  ip_warning?: string;
}

interface StructuredPrompt {
  short_description: string;
  objects: Array<{
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
  }>;
  background_setting: string;
  lighting: {
    conditions: string;
    direction: string;
    shadows: string;
  };
  aesthetics: {
    composition: string;
    color_scheme: string;
    mood_atmosphere: string;
    preference_score: string;
    aesthetic_score: string;
  };
  photographic_characteristics: {
    depth_of_field: string;
    focus: string;
    camera_angle: string;
    lens_focal_length: string;
  };
  style_medium: string;
  text_render?: Array<{
    text: string;
    location: string;
    size: string;
    color: string;
    font: string;
    appearance_details: string;
  }>;
  context?: string;
  artistic_style?: string;
}

interface HealthStatus {
  healthy: boolean;
  authenticated: boolean;
  rate_limit_remaining?: number;
  rate_limit_reset?: number;
}
```

### 2. BriaGenerationStore

Zustand store for managing generation state.

```typescript
interface BriaGenerationState {
  // Current generation
  currentImage: string | null;
  currentStructuredPrompt: StructuredPrompt | null;
  currentSeed: number | null;
  
  // Generation history
  history: GenerationHistoryItem[];
  
  // UI state
  isGenerating: boolean;
  isRefining: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  ipWarning: string | null;
  
  // Generation parameters
  parameters: GenerationParameters;
  
  // Actions
  generateImage: (prompt: string, referenceImages?: File[]) => Promise<void>;
  refineImage: (sceneConfig: SceneConfiguration, objects: ObjectMetadata[]) => Promise<void>;
  updateParameters: (params: Partial<GenerationParameters>) => void;
  updateStructuredPrompt: (prompt: Partial<StructuredPrompt>) => void;
  clearCurrent: () => void;
  loadFromHistory: (id: string) => void;
  deleteFromHistory: (id: string) => void;
}

interface GenerationParameters {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: 512 | 768 | 1024;
  seed: number | null; // null for random
  numInferenceSteps: number;
}

interface GenerationHistoryItem {
  id: string;
  timestamp: string;
  prompt: string;
  imageUrl: string;
  structuredPrompt: StructuredPrompt;
  seed: number;
  parameters: GenerationParameters;
}
```

### 3. ImageWorkspace Component

React component for the generation interface.

```typescript
interface ImageWorkspaceProps {
  onImageGenerated?: (imageUrl: string) => void;
}

const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({ onImageGenerated }) => {
  // Component implementation
};
```

### 4. GenerationStorage Service

Service for persisting generated images and metadata.

```typescript
interface GenerationStorage {
  /**
   * Save generated image and metadata
   */
  saveGeneration(
    imageBlob: Blob,
    structuredPrompt: StructuredPrompt,
    metadata: GenerationMetadata
  ): Promise<string>; // Returns generation ID
  
  /**
   * Load generation by ID
   */
  loadGeneration(id: string): Promise<SavedGeneration | null>;
  
  /**
   * List all saved generations
   */
  listGenerations(): Promise<GenerationSummary[]>;
  
  /**
   * Delete generation
   */
  deleteGeneration(id: string): Promise<void>;
}

interface GenerationMetadata {
  prompt: string;
  seed: number;
  parameters: GenerationParameters;
  timestamp: string;
}

interface SavedGeneration {
  id: string;
  imageUrl: string;
  structuredPrompt: StructuredPrompt;
  metadata: GenerationMetadata;
}

interface GenerationSummary {
  id: string;
  prompt: string;
  thumbnailUrl: string;
  timestamp: string;
}
```

### 5. AutoProcessingPipeline

Service for automatically processing generated images.

```typescript
interface AutoProcessingPipeline {
  /**
   * Process generated image through segmentation pipeline
   */
  processGeneratedImage(
    imageUrl: string,
    structuredPrompt: StructuredPrompt
  ): Promise<ProcessingResult>;
  
  /**
   * Map structured prompt to object metadata
   */
  mapStructuredPromptToMetadata(
    structuredPrompt: StructuredPrompt,
    masks: MaskMetadata[]
  ): MaskMetadata[];
}

interface ProcessingResult {
  segmentationResponse: SegmentationResponse;
  mappedMetadata: MaskMetadata[];
}
```

### 6. StructuredPromptBuilder

Service for converting UI edits back to structured prompt format (similar to semantic generation service).

```typescript
interface StructuredPromptBuilder {
  /**
   * Build structured prompt from scene and object metadata
   */
  buildFromMetadata(
    sceneConfig: SceneConfiguration,
    objects: ObjectMetadata[]
  ): StructuredPrompt;
  
  /**
   * Update existing structured prompt with changes
   */
  updateStructuredPrompt(
    basePrompt: StructuredPrompt,
    sceneChanges: Partial<SceneConfiguration>,
    objectChanges: ObjectMetadata[]
  ): StructuredPrompt;
  
  /**
   * Validate structured prompt completeness
   */
  validatePrompt(prompt: StructuredPrompt): ValidationResult;
}

interface SceneConfiguration {
  backgroundSetting?: string;
  lighting?: {
    conditions?: string;
    direction?: string;
    shadows?: string;
  };
  aesthetics?: {
    composition?: string;
    colorScheme?: string;
    moodAtmosphere?: string;
    preferenceScore?: string;
    aestheticScore?: string;
  };
  photographicCharacteristics?: {
    depthOfField?: string;
    focus?: string;
    cameraAngle?: string;
    lensFocalLength?: string;
  };
  styleMedium?: string;
  context?: string;
  artisticStyle?: string;
}

interface ObjectMetadata {
  id: string;
  description?: string;
  location?: string;
  relationship?: string;
  relativeSize?: string;
  shapeAndColor?: string;
  texture?: string;
  appearanceDetails?: string;
  orientation?: string;
  numberOfObjects?: number;
  pose?: string;
  expression?: string;
  action?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

## Data Models

### Request/Response Types

```typescript
// Bria API Request
interface BriaGenerateRequest {
  prompt?: string;
  images?: string[];
  structured_prompt?: StructuredPrompt;
  aspect_ratio?: string;
  resolution?: number;
  seed?: number;
  num_inference_steps?: number;
}

// Bria API Response
interface BriaGenerateResponse {
  result_id: string;
  image_url: string;
  structured_prompt: StructuredPrompt;
  seed: number;
  generation_time_ms: number;
  ip_warning?: {
    detected: boolean;
    message: string;
  };
}

// Error Response
interface BriaErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Storage Schema

```typescript
// IndexedDB Schema for local storage
interface GenerationDB {
  generations: {
    key: string; // generation ID
    value: {
      id: string;
      imageBlob: Blob;
      structuredPrompt: StructuredPrompt;
      metadata: GenerationMetadata;
    };
    indexes: {
      timestamp: string;
      prompt: string;
    };
  };
}

// File system structure (for saved images)
// images/
//   generated/
//     {generation-id}.png
//     {generation-id}.json (structured prompt)
//     {generation-id}.meta.json (metadata)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API call on generate
*For any* valid text prompt, clicking the generate button should trigger an API call with the prompt in the request payload
**Validates: Requirements 1.2**

### Property 2: Image display on success
*For any* successful API response containing an image URL, the image should be displayed in the workspace
**Validates: Requirements 1.3**

### Property 3: Structured prompt storage
*For any* API response containing a structured prompt, the structured prompt should be stored alongside the image
**Validates: Requirements 1.4**

### Property 4: Seed storage
*For any* API response containing a seed value, the seed should be stored for potential refinement
**Validates: Requirements 1.5**

### Property 5: Auto-segmentation trigger
*For any* successfully generated image, the system should automatically send it to the SAM3 segmentation service
**Validates: Requirements 2.1**

### Property 6: Object display after segmentation
*For any* successful segmentation response, detected objects with masks should be displayed
**Validates: Requirements 2.2**

### Property 7: Metadata population from structured prompt
*For any* segmentation with an associated structured prompt, object metadata should be populated from the structured prompt fields
**Validates: Requirements 2.3**

### Property 8: Editing enabled after segmentation
*For any* successful segmentation completion, all editing features should be enabled
**Validates: Requirements 2.4**

### Property 9: Error display on processing failure
*For any* auto-processing failure, an error message should be displayed and manual retry should be available
**Validates: Requirements 2.5**

### Property 10: Structured prompt update on metadata edit
*For any* object metadata or scene configuration edit in the Scene or Objects tabs, the system should parse the edited values back into structured prompt format
**Validates: Requirements 4.1**

### Property 11: Refine request includes prompt and seed
*For any* refine action, the API request should include the updated structured prompt and the original seed value
**Validates: Requirements 4.2**

### Property 12: Image replacement on refinement
*For any* successful refinement, the current image should be replaced with the refined version
**Validates: Requirements 4.3**

### Property 13: Re-segmentation after refinement
*For any* successful refinement, the refined image should be automatically re-segmented
**Validates: Requirements 4.4**

### Property 14: Original preservation on refinement failure
*For any* refinement failure, the original image should be preserved and an error should be displayed
**Validates: Requirements 4.5**

### Property 15: Reference image display
*For any* valid reference image upload, the image should be displayed in the workspace
**Validates: Requirements 5.1**

### Property 16: Combined request with reference image
*For any* generation with both prompt and reference image, both should be included in the API request
**Validates: Requirements 5.2**

### Property 17: Refinement support with reference images
*For any* generation that used a reference image, the refinement workflow should function identically to text-only generations
**Validates: Requirements 5.4**

### Property 18: Mode change on reference removal
*For any* reference image removal, the generation mode should revert to text-only
**Validates: Requirements 5.5**

### Property 19: Image file storage
*For any* successful generation, the image should be saved to the designated images folder
**Validates: Requirements 6.1**

### Property 20: Structured prompt file storage
*For any* successful generation, the structured prompt should be saved as a JSON file
**Validates: Requirements 6.2**

### Property 21: Seed metadata storage
*For any* successful generation, the seed value should be saved with the metadata
**Validates: Requirements 6.3**

### Property 22: Original prompt storage
*For any* successful generation, the original text prompt should be saved
**Validates: Requirements 6.4**

### Property 23: Unique identifier creation
*For any* successful generation, a unique identifier should be created that links the image, structured prompt, and metadata files
**Validates: Requirements 6.5**

### Property 24: Loading indicator on start
*For any* generation start, a loading indicator should be displayed
**Validates: Requirements 7.1**

### Property 25: Button disabled during generation
*For any* ongoing generation, the generate button should be disabled
**Validates: Requirements 7.2**

### Property 26: Loading indicator hidden on completion
*For any* generation completion (success or failure), the loading indicator should be hidden
**Validates: Requirements 7.3**

### Property 27: Error message on failure
*For any* generation failure, a specific error message should be displayed
**Validates: Requirements 7.5**

### Property 28: Error logging
*For any* error occurrence, detailed error information should be logged for debugging
**Validates: Requirements 8.5**

### Property 29: Parameters included in request
*For any* set generation parameters (aspect ratio, resolution, seed), they should be included in the API request
**Validates: Requirements 9.4**

### Property 30: Default parameters when unset
*For any* unset generation parameters, sensible default values should be used
**Validates: Requirements 9.5**

### Property 31: API key requirement
*For any* BriaAPIClient initialization without an API key, initialization should fail with a clear error
**Validates: Requirements 10.2**

### Property 32: Authentication headers present
*For any* API request made by the client, proper authentication headers should be included
**Validates: Requirements 10.3**

### Property 33: Response parsing and validation
*For any* API response received by the client, it should be parsed and validated before being returned
**Validates: Requirements 10.4**

### Property 34: Typed exceptions on errors
*For any* error encountered by the client, a typed exception should be thrown
**Validates: Requirements 10.5**

### Property 35: IP warning display
*For any* API response with an IP warning, a warning message should be displayed to the user
**Validates: Requirements 11.1**

### Property 36: IP warning explanation
*For any* IP warning, an explanation that results may differ from expectations should be provided
**Validates: Requirements 11.2**

### Property 37: Image display despite IP warning
*For any* API response with an IP warning, the generated image should still be displayed
**Validates: Requirements 11.3**

### Property 38: IP warning logging
*For any* IP warning, the warning should be logged for analytics purposes
**Validates: Requirements 11.4**

### Property 39: Settings persistence
*For any* generation settings change, the new settings should be persisted to local storage
**Validates: Requirements 12.1**

### Property 40: Settings restoration on load
*For any* application load with saved settings in local storage, the settings should be restored
**Validates: Requirements 12.2**

### Property 41: Fallback to defaults for invalid settings
*For any* invalid settings loaded from storage, the system should fall back to default values
**Validates: Requirements 12.3**

### Property 42: Settings cleared on reset
*For any* settings reset action, saved preferences should be cleared from local storage
**Validates: Requirements 12.4**

### Property 43: Visual confirmation on settings save
*For any* settings save operation, visual confirmation should be provided to the user
**Validates: Requirements 12.5**

### Property 44: Format conversion for SAM3
*For any* generated image, it should be converted to the format expected by the SAM3 segmentation service
**Validates: Requirements 13.1**

### Property 45: Metadata mapping from structured prompt
*For any* structured prompt with object descriptions, the fields should be mapped to the corresponding object metadata after segmentation
**Validates: Requirements 13.4**

### Property 46: Editing features enabled after pipeline
*For any* completed auto-processing pipeline, the same editing features available for uploaded images should be enabled
**Validates: Requirements 13.5**

### Property 47: Comparison offer after refinement
*For any* successful refinement, the system should offer to show a before/after comparison
**Validates: Requirements 14.1**

### Property 48: Side-by-side display in comparison
*For any* comparison view, original and refined images should be displayed side-by-side
**Validates: Requirements 14.2**

### Property 49: Version toggling in comparison
*For any* comparison view, the user should be able to toggle between versions
**Validates: Requirements 14.3**

### Property 50: Active image on version selection
*For any* version selection in comparison mode, the selected version should become the active image
**Validates: Requirements 14.4**

### Property 51: Normal mode on comparison close
*For any* comparison close action, the system should return to normal editing mode
**Validates: Requirements 14.5**

### Property 52: Request queuing for rate limits
*For any* multiple rapid generation requests, they should be queued to respect API rate limits
**Validates: Requirements 15.1**

### Property 53: User notification of queue wait
*For any* queued request, the user should be informed of the wait time or queue position
**Validates: Requirements 15.2**

### Property 54: Cache offer for duplicate prompts
*For any* generation request with a prompt identical to a recent cached result, the system should offer to reuse the cached result
**Validates: Requirements 15.3**

### Property 55: Cache indication
*For any* result loaded from cache, the system should indicate that the image is from cache
**Validates: Requirements 15.4**

### Property 56: Regeneration for stale cache
*For any* cached result older than 24 hours, the system should regenerate the image instead of using the cache
**Validates: Requirements 15.5**

## Error Handling

### Error Types

```typescript
class BriaAPIError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  
  constructor(message: string, code: string, statusCode?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BriaAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class AuthenticationError extends BriaAPIError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

class RateLimitError extends BriaAPIError {
  retryAfter?: number;
  
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.retryAfter = retryAfter;
  }
}

class ServiceUnavailableError extends BriaAPIError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 'SERVICE_UNAVAILABLE', 500);
  }
}

class NetworkError extends BriaAPIError {
  constructor(message: string = 'Network error, check your connection') {
    super(message, 'NETWORK_ERROR');
  }
}

class ValidationError extends BriaAPIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

class ProcessingError extends BriaAPIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROCESSING_ERROR', 500, details);
  }
}
```

### Error Handling Strategy

1. **API Errors**: Map HTTP status codes to specific error types
   - 401 → AuthenticationError
   - 429 → RateLimitError
   - 500/502/503 → ServiceUnavailableError
   - 400 → ValidationError
   - Network failures → NetworkError

2. **User-Facing Messages**: Provide clear, actionable error messages
   - Authentication: "Invalid API key. Please check your configuration."
   - Rate Limit: "Rate limit exceeded. Please try again in X seconds."
   - Service: "Service temporarily unavailable. Please try again later."
   - Network: "Network error. Please check your connection."
   - Validation: "Invalid request: [specific validation error]"

3. **Error Recovery**:
   - Automatic retry for transient errors (with exponential backoff)
   - Manual retry option for all errors
   - Preserve user input on errors
   - Log detailed error information for debugging

4. **IP Warning Handling**:
   - Display warning banner (non-blocking)
   - Explain that results may differ from expectations
   - Still show generated image
   - Log warning for analytics

### Logging

```typescript
// Log levels for different operations
logger.info('Starting image generation', { prompt, parameters });
logger.debug('API request', { endpoint, payload });
logger.warn('IP-related content detected', { prompt, warning });
logger.error('Generation failed', { error, prompt, parameters });
```

## Testing Strategy

### Unit Tests

1. **BriaAPIClient Tests**
   - Test request formatting for premium and lite endpoints
   - Test authentication header inclusion
   - Test response parsing and validation
   - Test error mapping (401, 429, 500, network)
   - Test retry logic with exponential backoff
   - Test rate limiting queue

2. **BriaGenerationStore Tests**
   - Test state updates during generation lifecycle
   - Test parameter updates and persistence
   - Test structured prompt updates
   - Test history management (add, load, delete)
   - Test error state handling
   - Test IP warning handling

3. **GenerationStorage Tests**
   - Test saving generation with all metadata
   - Test loading generation by ID
   - Test listing generations
   - Test deleting generation
   - Test file system structure creation

4. **AutoProcessingPipeline Tests**
   - Test image download and format conversion
   - Test segmentation service integration
   - Test metadata mapping from structured prompt
   - Test error handling during processing

5. **StructuredPromptBuilder Tests**
   - Test building structured prompt from scene config and objects
   - Test updating existing structured prompt with changes
   - Test validation of structured prompt completeness
   - Test short description generation
   - Test handling of optional fields

6. **ImageWorkspace Component Tests**
   - Test prompt input and validation
   - Test reference image upload
   - Test parameter configuration UI
   - Test generate button state (enabled/disabled)
   - Test loading indicator display
   - Test error message display
   - Test IP warning display

### Property-Based Tests

We will use **fast-check** for TypeScript property-based testing. Each property-based test should run a minimum of 100 iterations.

1. **Property 1: API call on generate**
   - Generate random valid prompts
   - Verify API is called with prompt in payload
   - Tag: **Feature: bria-image-generation-integration, Property 1: API call on generate**

2. **Property 2: Image display on success**
   - Generate random successful API responses
   - Verify image is displayed
   - Tag: **Feature: bria-image-generation-integration, Property 2: Image display on success**

3. **Property 3: Structured prompt storage**
   - Generate random API responses with structured prompts
   - Verify structured prompt is stored
   - Tag: **Feature: bria-image-generation-integration, Property 3: Structured prompt storage**

4. **Property 4: Seed storage**
   - Generate random API responses with seeds
   - Verify seed is stored
   - Tag: **Feature: bria-image-generation-integration, Property 4: Seed storage**

5. **Property 5: Auto-segmentation trigger**
   - Generate random successful generations
   - Verify segmentation service is called
   - Tag: **Feature: bria-image-generation-integration, Property 5: Auto-segmentation trigger**

6. **Property 10: Structured prompt update on metadata edit**
   - Generate random metadata edits
   - Verify structured prompt is updated
   - Tag: **Feature: bria-image-generation-integration, Property 10: Structured prompt update on metadata edit**

7. **Property 29: Parameters included in request**
   - Generate random parameter combinations
   - Verify all set parameters are in request
   - Tag: **Feature: bria-image-generation-integration, Property 29: Parameters included in request**

8. **Property 30: Default parameters when unset**
   - Generate random requests with missing parameters
   - Verify defaults are used
   - Tag: **Feature: bria-image-generation-integration, Property 30: Default parameters when unset**

9. **Property 32: Authentication headers present**
   - Generate random API requests
   - Verify authentication headers are present
   - Tag: **Feature: bria-image-generation-integration, Property 32: Authentication headers present**

10. **Property 45: Metadata mapping from structured prompt**
    - Generate random structured prompts and segmentation results
    - Verify metadata is correctly mapped
    - Tag: **Feature: bria-image-generation-integration, Property 45: Metadata mapping from structured prompt**

### Integration Tests

1. **End-to-End Generation Test**
   - Enter prompt
   - Click generate
   - Verify API call
   - Mock API response
   - Verify image display
   - Verify auto-segmentation
   - Verify editing enabled

2. **Refinement Workflow Test**
   - Generate initial image
   - Complete auto-processing (segmentation)
   - Edit values in Scene and Objects tabs
   - Verify structured prompt is rebuilt from edits
   - Click refine
   - Verify API call with updated structured prompt and original seed
   - Mock refined response
   - Verify image replacement
   - Verify re-segmentation

3. **Reference Image Test**
   - Upload reference image
   - Enter prompt
   - Generate
   - Verify both sent to API
   - Verify result handling

4. **Error Recovery Test**
   - Trigger various error conditions
   - Verify error messages
   - Verify retry functionality
   - Verify state preservation

5. **Storage Test**
   - Generate image
   - Verify files saved (image, JSON, metadata)
   - Load from history
   - Verify correct restoration

## Implementation Notes

### API Client Configuration

```typescript
const BRIA_API_CONFIG = {
  baseUrl: 'https://api.bria.ai',
  endpoints: {
    generate: '/v2/image/generate',
  },
  timeout: 60000, // 60 seconds for generation
  retryAttempts: 3,
  retryDelay: 1000, // Start with 1 second
  retryBackoffMultiplier: 2, // Exponential backoff
};
```

### Request/Response Handling

```typescript
// Request formatting
const formatGenerationRequest = (
  prompt: string,
  parameters: GenerationParameters,
  referenceImages?: string[]
): BriaGenerateRequest => {
  return {
    prompt,
    ...(referenceImages && { images: referenceImages }),
    aspect_ratio: parameters.aspectRatio,
    resolution: parameters.resolution,
    ...(parameters.seed && { seed: parameters.seed }),
    num_inference_steps: parameters.numInferenceSteps,
  };
};

// Response validation
const validateGenerationResponse = (response: unknown): GenerationResult => {
  if (!isObject(response)) {
    throw new ValidationError('Invalid response format');
  }
  
  if (!response.image_url || typeof response.image_url !== 'string') {
    throw new ValidationError('Missing or invalid image_url');
  }
  
  if (!response.structured_prompt || !isObject(response.structured_prompt)) {
    throw new ValidationError('Missing or invalid structured_prompt');
  }
  
  if (typeof response.seed !== 'number') {
    throw new ValidationError('Missing or invalid seed');
  }
  
  return response as GenerationResult;
};
```

### Metadata Mapping Strategy

```typescript
const mapStructuredPromptToMetadata = (
  structuredPrompt: StructuredPrompt,
  masks: MaskMetadata[]
): MaskMetadata[] => {
  // Match objects from structured prompt to detected masks
  // Use similarity scoring based on:
  // 1. Spatial location (bounding box overlap)
  // 2. Label similarity (if available)
  // 3. Size similarity
  
  return masks.map((mask, index) => {
    const promptObject = structuredPrompt.objects[index];
    
    if (!promptObject) {
      return mask;
    }
    
    return {
      ...mask,
      objectMetadata: {
        description: promptObject.description,
        location: promptObject.location,
        relationship: promptObject.relationship,
        relative_size: promptObject.relative_size,
        shape_and_color: promptObject.shape_and_color,
        texture: promptObject.texture,
        appearance_details: promptObject.appearance_details,
        orientation: promptObject.orientation,
      },
    };
  });
};
```

### Structured Prompt Building Strategy

```typescript
const buildStructuredPromptFromMetadata = (
  sceneConfig: SceneConfiguration,
  objects: ObjectMetadata[]
): StructuredPrompt => {
  // Convert UI edits back to structured prompt format
  // Similar to semantic generation service approach
  
  return {
    short_description: generateShortDescription(objects, sceneConfig),
    objects: objects.map(obj => ({
      description: obj.description || '',
      location: obj.location || '',
      relationship: obj.relationship || '',
      relative_size: obj.relativeSize || '',
      shape_and_color: obj.shapeAndColor || '',
      texture: obj.texture || '',
      appearance_details: obj.appearanceDetails || '',
      orientation: obj.orientation || '',
      ...(obj.numberOfObjects && { number_of_objects: obj.numberOfObjects }),
      ...(obj.pose && { pose: obj.pose }),
      ...(obj.expression && { expression: obj.expression }),
      ...(obj.action && { action: obj.action }),
    })),
    background_setting: sceneConfig.backgroundSetting || '',
    lighting: {
      conditions: sceneConfig.lighting?.conditions || '',
      direction: sceneConfig.lighting?.direction || '',
      shadows: sceneConfig.lighting?.shadows || '',
    },
    aesthetics: {
      composition: sceneConfig.aesthetics?.composition || '',
      color_scheme: sceneConfig.aesthetics?.colorScheme || '',
      mood_atmosphere: sceneConfig.aesthetics?.moodAtmosphere || '',
      preference_score: sceneConfig.aesthetics?.preferenceScore || '',
      aesthetic_score: sceneConfig.aesthetics?.aestheticScore || '',
    },
    photographic_characteristics: {
      depth_of_field: sceneConfig.photographicCharacteristics?.depthOfField || '',
      focus: sceneConfig.photographicCharacteristics?.focus || '',
      camera_angle: sceneConfig.photographicCharacteristics?.cameraAngle || '',
      lens_focal_length: sceneConfig.photographicCharacteristics?.lensFocalLength || '',
    },
    style_medium: sceneConfig.styleMedium || '',
    ...(sceneConfig.context && { context: sceneConfig.context }),
    ...(sceneConfig.artisticStyle && { artistic_style: sceneConfig.artisticStyle }),
  };
};

const generateShortDescription = (
  objects: ObjectMetadata[],
  sceneConfig: SceneConfiguration
): string => {
  // Generate concise description from objects and scene
  const objectDescriptions = objects
    .map(obj => obj.description)
    .filter(Boolean)
    .join(', ');
  
  const setting = sceneConfig.backgroundSetting || 'scene';
  
  return `${objectDescriptions} in ${setting}`;
};
```

### Rate Limiting Implementation

```typescript
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests
  
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }
      
      const fn = this.queue.shift();
      if (fn) {
        this.lastRequestTime = Date.now();
        await fn();
      }
    }
    
    this.processing = false;
  }
}
```

### Caching Strategy

```typescript
interface CacheEntry {
  prompt: string;
  parameters: GenerationParameters;
  result: GenerationResult;
  timestamp: number;
}

class GenerationCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  getCacheKey(prompt: string, parameters: GenerationParameters): string {
    return `${prompt}:${JSON.stringify(parameters)}`;
  }
  
  get(prompt: string, parameters: GenerationParameters): GenerationResult | null {
    const key = this.getCacheKey(prompt, parameters);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }
  
  set(prompt: string, parameters: GenerationParameters, result: GenerationResult): void {
    const key = this.getCacheKey(prompt, parameters);
    this.cache.set(key, {
      prompt,
      parameters,
      result,
      timestamp: Date.now(),
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

## Performance Considerations

1. **Image Loading**: Use progressive loading for generated images
2. **Caching**: Cache API responses for identical prompts (24-hour TTL)
3. **Debouncing**: Debounce structured prompt updates during rapid edits
4. **Lazy Loading**: Lazy load generation history thumbnails
5. **Memory Management**: Clear old cache entries and limit history size
6. **Parallel Processing**: Process segmentation while downloading image
7. **Optimistic Updates**: Show loading states immediately for better UX

## Security Considerations

1. **API Key Storage**: Store API key securely (environment variables, not in code)
2. **Input Validation**: Validate all user inputs before sending to API
3. **Output Sanitization**: Sanitize structured prompts before display
4. **Rate Limiting**: Implement client-side rate limiting to prevent abuse
5. **Error Messages**: Don't expose sensitive information in error messages
6. **HTTPS Only**: Ensure all API calls use HTTPS
7. **Content Security**: Validate image URLs before loading

## Future Enhancements

1. **Batch Generation**: Generate multiple variations from one prompt
2. **Style Transfer**: Apply styles from reference images to generated images
3. **Inpainting**: Edit specific regions of generated images
4. **Upscaling**: Increase resolution of generated images
5. **Animation**: Generate image sequences for animations
6. **Collaborative Editing**: Share and collaborate on generated images
7. **Advanced Caching**: Implement semantic similarity-based caching
8. **A/B Testing**: Compare different generation parameters
9. **Template Library**: Save and reuse structured prompt templates
10. **API Usage Analytics**: Track and visualize API usage patterns

