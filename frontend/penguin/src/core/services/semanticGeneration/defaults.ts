import type {
  SemanticJSON,
  ObjectDescription,
  LightingDescription,
  AestheticsDescription,
  PhotographicDescription,
} from './types';

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default object description
 */
export const DEFAULT_OBJECT_DESCRIPTION: ObjectDescription = {
  description: 'An object in the scene',
  location: 'in the center',
  relationship: 'standalone',
  relative_size: 'medium',
  shape_and_color: 'neutral colored',
  texture: 'smooth',
  appearance_details: 'standard appearance',
  orientation: 'facing forward',
};

/**
 * Default lighting description
 */
export const DEFAULT_LIGHTING_DESCRIPTION: LightingDescription = {
  conditions: 'natural lighting',
  direction: 'from above and slightly in front',
  shadows: 'soft shadows',
};

/**
 * Default aesthetics description
 */
export const DEFAULT_AESTHETICS_DESCRIPTION: AestheticsDescription = {
  composition: 'balanced composition',
  color_scheme: 'natural colors',
  mood_atmosphere: 'neutral atmosphere',
  preference_score: '5',
  aesthetic_score: '5',
};

/**
 * Default photographic characteristics
 */
export const DEFAULT_PHOTOGRAPHIC_DESCRIPTION: PhotographicDescription = {
  depth_of_field: 'medium depth of field',
  focus: 'sharp focus',
  camera_angle: 'eye-level',
  lens_focal_length: 'standard lens (50mm)',
};

/**
 * Default semantic JSON
 */
export const DEFAULT_SEMANTIC_JSON: SemanticJSON = {
  short_description: 'A scene with objects in a neutral setting.',
  objects: [],
  background_setting: 'neutral background',
  lighting: DEFAULT_LIGHTING_DESCRIPTION,
  aesthetics: DEFAULT_AESTHETICS_DESCRIPTION,
  photographic_characteristics: DEFAULT_PHOTOGRAPHIC_DESCRIPTION,
  style_medium: 'photograph',
};

// ============================================================================
// Default Value Provider
// ============================================================================

/**
 * Logger for default value warnings
 */
const logDefaultWarning = (fieldName: string, defaultValue: unknown): void => {
  console.warn(
    `[SemanticGeneration] Using default value for missing field "${fieldName}":`,
    defaultValue
  );
};

/**
 * Provides default value for a missing object description field
 */
export function getDefaultObjectDescriptionField(
  fieldName: keyof ObjectDescription
): string | number | undefined {
  const defaultValue = DEFAULT_OBJECT_DESCRIPTION[fieldName];
  logDefaultWarning(`object.${fieldName}`, defaultValue);
  return defaultValue;
}

/**
 * Provides default value for a missing lighting field
 */
export function getDefaultLightingField(
  fieldName: keyof LightingDescription
): string {
  const defaultValue = DEFAULT_LIGHTING_DESCRIPTION[fieldName];
  logDefaultWarning(`lighting.${fieldName}`, defaultValue);
  return defaultValue;
}

/**
 * Provides default value for a missing aesthetics field
 */
export function getDefaultAestheticsField(
  fieldName: keyof AestheticsDescription
): string {
  const defaultValue = DEFAULT_AESTHETICS_DESCRIPTION[fieldName];
  logDefaultWarning(`aesthetics.${fieldName}`, defaultValue);
  return defaultValue;
}

/**
 * Provides default value for a missing photographic characteristics field
 */
export function getDefaultPhotographicField(
  fieldName: keyof PhotographicDescription
): string {
  const defaultValue = DEFAULT_PHOTOGRAPHIC_DESCRIPTION[fieldName];
  logDefaultWarning(`photographic_characteristics.${fieldName}`, defaultValue);
  return defaultValue;
}

/**
 * Provides default value for any missing top-level field
 */
export function getDefaultFieldValue(
  fieldName: keyof SemanticJSON
): unknown {
  const defaultValue = DEFAULT_SEMANTIC_JSON[fieldName];
  logDefaultWarning(fieldName, defaultValue);
  return defaultValue;
}

/**
 * Fills in missing fields in an object description with defaults
 */
export function fillObjectDescriptionDefaults(
  obj: Partial<ObjectDescription>
): ObjectDescription {
  const filled: ObjectDescription = { ...DEFAULT_OBJECT_DESCRIPTION };
  
  for (const key of Object.keys(DEFAULT_OBJECT_DESCRIPTION) as Array<keyof ObjectDescription>) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      filled[key] = obj[key] as never;
    } else if (obj[key] === undefined || obj[key] === null) {
      logDefaultWarning(`object.${key}`, filled[key]);
    }
  }
  
  return filled;
}

/**
 * Fills in missing fields in a lighting description with defaults
 */
export function fillLightingDefaults(
  lighting: Partial<LightingDescription>
): LightingDescription {
  const filled: LightingDescription = { ...DEFAULT_LIGHTING_DESCRIPTION };
  
  for (const key of Object.keys(DEFAULT_LIGHTING_DESCRIPTION) as Array<keyof LightingDescription>) {
    if (lighting[key] !== undefined && lighting[key] !== null && lighting[key] !== '') {
      filled[key] = lighting[key] as string;
    } else if (lighting[key] === undefined || lighting[key] === null) {
      logDefaultWarning(`lighting.${key}`, filled[key]);
    }
  }
  
  return filled;
}

/**
 * Fills in missing fields in an aesthetics description with defaults
 */
export function fillAestheticsDefaults(
  aesthetics: Partial<AestheticsDescription>
): AestheticsDescription {
  const filled: AestheticsDescription = { ...DEFAULT_AESTHETICS_DESCRIPTION };
  
  for (const key of Object.keys(DEFAULT_AESTHETICS_DESCRIPTION) as Array<keyof AestheticsDescription>) {
    if (aesthetics[key] !== undefined && aesthetics[key] !== null && aesthetics[key] !== '') {
      filled[key] = aesthetics[key] as string;
    } else if (aesthetics[key] === undefined || aesthetics[key] === null) {
      logDefaultWarning(`aesthetics.${key}`, filled[key]);
    }
  }
  
  return filled;
}

/**
 * Fills in missing fields in photographic characteristics with defaults
 */
export function fillPhotographicDefaults(
  photo: Partial<PhotographicDescription>
): PhotographicDescription {
  const filled: PhotographicDescription = { ...DEFAULT_PHOTOGRAPHIC_DESCRIPTION };
  
  for (const key of Object.keys(DEFAULT_PHOTOGRAPHIC_DESCRIPTION) as Array<keyof PhotographicDescription>) {
    if (photo[key] !== undefined && photo[key] !== null && photo[key] !== '') {
      filled[key] = photo[key] as string;
    } else if (photo[key] === undefined || photo[key] === null) {
      logDefaultWarning(`photographic_characteristics.${key}`, filled[key]);
    }
  }
  
  return filled;
}

/**
 * Fills in missing top-level fields in semantic JSON with defaults
 */
export function fillSemanticJSONDefaults(
  json: Partial<SemanticJSON>
): SemanticJSON {
  const filled: SemanticJSON = {
    short_description: json.short_description || DEFAULT_SEMANTIC_JSON.short_description,
    objects: json.objects || DEFAULT_SEMANTIC_JSON.objects,
    background_setting: json.background_setting || DEFAULT_SEMANTIC_JSON.background_setting,
    lighting: json.lighting || DEFAULT_SEMANTIC_JSON.lighting,
    aesthetics: json.aesthetics || DEFAULT_SEMANTIC_JSON.aesthetics,
    photographic_characteristics: json.photographic_characteristics || DEFAULT_SEMANTIC_JSON.photographic_characteristics,
    style_medium: json.style_medium || DEFAULT_SEMANTIC_JSON.style_medium,
  };
  
  // Log warnings for missing required fields
  if (!json.short_description) {
    logDefaultWarning('short_description', filled.short_description);
  }
  if (!json.objects) {
    logDefaultWarning('objects', filled.objects);
  }
  if (!json.background_setting) {
    logDefaultWarning('background_setting', filled.background_setting);
  }
  if (!json.lighting) {
    logDefaultWarning('lighting', filled.lighting);
  }
  if (!json.aesthetics) {
    logDefaultWarning('aesthetics', filled.aesthetics);
  }
  if (!json.photographic_characteristics) {
    logDefaultWarning('photographic_characteristics', filled.photographic_characteristics);
  }
  if (!json.style_medium) {
    logDefaultWarning('style_medium', filled.style_medium);
  }
  
  // Copy optional fields if present
  if (json.context) {
    filled.context = json.context;
  }
  if (json.artistic_style) {
    filled.artistic_style = json.artistic_style;
  }
  if (json.text_render) {
    filled.text_render = json.text_render;
  }
  
  return filled;
}

/**
 * Checks if a field can have a default value provided
 */
export function canProvideDefault(fieldName: string): boolean {
  // All fields in the semantic JSON can have defaults
  return fieldName in DEFAULT_SEMANTIC_JSON;
}

/**
 * Gets a sensible default for a specific field type
 */
export function getDefaultForFieldType(fieldType: string): unknown {
  switch (fieldType) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}
