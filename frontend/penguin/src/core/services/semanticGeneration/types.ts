import type {
  SceneConfiguration,
} from '@/core/types';
import type {
  SegmentationResponse,
  MaskManipulationState,
} from '@/features/segmentation/store/segmentationStore';

// ============================================================================
// Error Types
// ============================================================================

export class SemanticGenerationError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SemanticGenerationError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends SemanticGenerationError {
  field: string;
  expectedType: string;
  actualValue: unknown;

  constructor(field: string, expectedType: string, actualValue: unknown) {
    super(
      `Validation failed for field "${field}": expected ${expectedType}, got ${typeof actualValue}`,
      'VALIDATION_ERROR'
    );
    this.name = 'ValidationError';
    this.field = field;
    this.expectedType = expectedType;
    this.actualValue = actualValue;
  }
}

export class MissingFieldError extends SemanticGenerationError {
  field: string;
  canProvideDefault: boolean;

  constructor(field: string, canProvideDefault: boolean) {
    super(
      `Required field "${field}" is missing${canProvideDefault ? ' (default will be provided)' : ''}`,
      'MISSING_FIELD'
    );
    this.name = 'MissingFieldError';
    this.field = field;
    this.canProvideDefault = canProvideDefault;
  }
}

export class ConversionError extends SemanticGenerationError {
  field: string;
  value: unknown;
  reason: string;

  constructor(field: string, value: unknown, reason: string) {
    super(
      `Failed to convert field "${field}": ${reason}`,
      'CONVERSION_ERROR'
    );
    this.name = 'ConversionError';
    this.field = field;
    this.value = value;
    this.reason = reason;
  }
}

// ============================================================================
// Input Types (Combined State)
// ============================================================================

export interface CombinedState {
  sceneConfig: SceneConfiguration;
  results: SegmentationResponse | null;
  maskManipulation: Map<string, MaskManipulationState>;
}

// ============================================================================
// Output Types (Semantic JSON)
// ============================================================================

export interface ObjectDescription {
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

export interface LightingDescription {
  conditions: string;
  direction: string;
  shadows: string;
}

export interface AestheticsDescription {
  composition: string;
  color_scheme: string;
  mood_atmosphere: string;
  preference_score: string;
  aesthetic_score: string;
}

export interface PhotographicDescription {
  depth_of_field: string;
  focus: string;
  camera_angle: string;
  lens_focal_length: string;
}

export interface TextRender {
  text: string;
  position: string;
  style: string;
}

export interface SemanticJSON {
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

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SaveResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// ============================================================================
// JSON Builder Component Types
// ============================================================================

export interface JSONComponents {
  shortDescription: string;
  objects: ObjectDescription[];
  backgroundSetting: string;
  lighting: LightingDescription;
  aesthetics: AestheticsDescription;
  photographicCharacteristics: PhotographicDescription;
  styleMedium: string;
  context?: string;
  artisticStyle?: string;
  textRender?: TextRender[];
}
