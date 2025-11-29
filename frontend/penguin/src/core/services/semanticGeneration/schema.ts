// Types are used for documentation purposes
// Types imported for documentation purposes
// @ts-expect-error - Types used in JSDoc comments
import type {
  SemanticJSON,
  ObjectDescription,
  LightingDescription,
  AestheticsDescription,
  PhotographicDescription,
  TextRender,
} from './types';

// ============================================================================
// JSON Schema Definition
// ============================================================================

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
}

export interface SchemaDefinition {
  [key: string]: FieldSchema;
}

// ============================================================================
// Object Description Schema
// ============================================================================

export const objectDescriptionSchema: SchemaDefinition = {
  description: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
  location: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  relationship: {
    type: 'string',
    required: true,
    minLength: 0,
    maxLength: 500,
  },
  relative_size: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  shape_and_color: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 500,
  },
  texture: {
    type: 'string',
    required: true,
    minLength: 0,
    maxLength: 300,
  },
  appearance_details: {
    type: 'string',
    required: true,
    minLength: 0,
    maxLength: 500,
  },
  orientation: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  number_of_objects: {
    type: 'number',
    required: false,
    min: 1,
  },
  pose: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 200,
  },
  expression: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 200,
  },
  action: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 200,
  },
};

// ============================================================================
// Lighting Description Schema
// ============================================================================

export const lightingDescriptionSchema: SchemaDefinition = {
  conditions: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 300,
  },
  direction: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 300,
  },
  shadows: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
};

// ============================================================================
// Aesthetics Description Schema
// ============================================================================

export const aestheticsDescriptionSchema: SchemaDefinition = {
  composition: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 500,
  },
  color_scheme: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 300,
  },
  mood_atmosphere: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 300,
  },
  preference_score: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  aesthetic_score: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
};

// ============================================================================
// Photographic Description Schema
// ============================================================================

export const photographicDescriptionSchema: SchemaDefinition = {
  depth_of_field: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  focus: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  camera_angle: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  lens_focal_length: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
};

// ============================================================================
// Text Render Schema
// ============================================================================

export const textRenderSchema: SchemaDefinition = {
  text: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 500,
  },
  position: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  style: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 300,
  },
};

// ============================================================================
// Semantic JSON Schema
// ============================================================================

export const semanticJSONSchema: SchemaDefinition = {
  short_description: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
  objects: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      required: true,
      properties: objectDescriptionSchema,
    },
  },
  background_setting: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
  lighting: {
    type: 'object',
    required: true,
    properties: lightingDescriptionSchema,
  },
  aesthetics: {
    type: 'object',
    required: true,
    properties: aestheticsDescriptionSchema,
  },
  photographic_characteristics: {
    type: 'object',
    required: true,
    properties: photographicDescriptionSchema,
  },
  style_medium: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  context: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 1000,
  },
  artistic_style: {
    type: 'string',
    required: false,
    minLength: 1,
    maxLength: 200,
  },
  text_render: {
    type: 'array',
    required: false,
    items: {
      type: 'object',
      required: true,
      properties: textRenderSchema,
    },
  },
};
