import type { EditorSchema, FieldSchema } from '@fibo-ui/core';

type ToolUiOptions = Record<string, string[]>;

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isHexColor = (value: string): boolean => HEX_COLOR_REGEX.test(value.trim());

const mergeUnique = (...collections: string[][]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  collections.forEach((collection) => {
    collection.forEach((item) => {
      const value = String(item || '').trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(value);
    });
  });
  return result;
};

const normalizeSuggestionValues = (rawValue: unknown): string[] => {
  if (Array.isArray(rawValue)) {
    return mergeUnique(
      rawValue
        .map((item) => (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
          ? String(item).trim()
          : ''))
        .filter(Boolean)
    ).slice(0, 12);
  }
  if (typeof rawValue === 'string') {
    return mergeUnique(
      rawValue
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean)
    ).slice(0, 12);
  }
  return [];
};

const normalizeToolUiOptions = (uiOptions?: ToolUiOptions): ToolUiOptions => {
  if (!uiOptions) return {};
  const normalized: ToolUiOptions = {};
  Object.entries(uiOptions).forEach(([key, rawValue]) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;
    const values = normalizeSuggestionValues(rawValue);
    if (values.length > 0) {
      normalized[normalizedKey] = values;
    }
  });
  return normalized;
};

const cloneEditorSchema = (schema: EditorSchema): EditorSchema =>
  JSON.parse(JSON.stringify(schema)) as EditorSchema;

const splitColorSuggestions = (values: string[]): { hex: string[]; named: string[] } => {
  const hex: string[] = [];
  const named: string[] = [];
  values.forEach((value) => {
    const token = value.trim();
    if (!token) return;
    if (isHexColor(token)) {
      hex.push(token.toUpperCase());
    } else {
      named.push(token);
    }
  });
  return {
    hex: mergeUnique(hex),
    named: mergeUnique(named),
  };
};

const getPropertySpecificValueSuggestions = (
  property: unknown,
  uiOptions: ToolUiOptions
): string[] => {
  const normalizedProperty = String(property || '').trim().toLowerCase();
  if (!normalizedProperty) {
    return normalizeSuggestionValues(uiOptions.value);
  }

  const keys = [
    `value_for_${normalizedProperty}`,
    `value:${normalizedProperty}`,
    `value.${normalizedProperty}`,
    normalizedProperty,
    'value',
  ];

  const collected: string[] = [];
  keys.forEach((key) => {
    const values = normalizeSuggestionValues(uiOptions[key]);
    if (values.length > 0) {
      collected.push(...values);
    }
  });
  return mergeUnique(collected);
};

const backgroundSchema: EditorSchema = {
  background_setting: {
    type: 'string',
    label: 'Background Setting',
    widget: 'textarea',
    description: 'Describe the environment in detail.',
  },
  setting: {
    type: 'string',
    hidden: true,
  },
};

const lightingSchema: EditorSchema = {
  conditions: {
    type: 'string',
    label: 'Conditions',
    widget: 'select',
    enum: ['natural', 'studio', 'soft diffused', 'dramatic', 'golden hour'],
    default: 'natural',
  },
  shadows: {
    type: 'number',
    label: 'Shadows',
    min: 0,
    max: 5,
    step: 1,
    widget: 'slider',
    default: 2,
  },
  direction: {
    type: 'object',
    label: 'Direction',
    widget: 'lighting-direction',
    default: { x: 50, y: 50, rotation: 0, tilt: 0 },
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      rotation: { type: 'number' },
      tilt: { type: 'number' },
    },
  },
  direction_x: {
    type: 'number',
    label: 'Direction X',
    min: 0,
    max: 100,
    step: 1,
    widget: 'slider',
    hidden: true,
  },
  direction_y: {
    type: 'number',
    label: 'Direction Y',
    min: 0,
    max: 100,
    step: 1,
    widget: 'slider',
    hidden: true,
  },
  rotation: {
    type: 'number',
    label: 'Rotation',
    min: 0,
    max: 360,
    step: 1,
    widget: 'slider',
    hidden: true,
  },
  tilt: {
    type: 'number',
    label: 'Tilt',
    min: -90,
    max: 90,
    step: 1,
    widget: 'slider',
    hidden: true,
  },
};

const photographicSchema: EditorSchema = {
  depth_of_field: {
    type: 'number',
    label: 'Depth of Field (Blur)',
    min: 0,
    max: 100,
    step: 1,
    widget: 'slider',
    default: 50,
  },
  focus: {
    type: 'number',
    label: 'Focus Sharpness',
    min: 0,
    max: 100,
    step: 1,
    widget: 'slider',
    default: 75,
  },
  camera_angle: {
    type: 'string',
    label: 'Camera Angle',
    widget: 'select',
    enum: ['eye-level', 'overhead', 'low-angle', 'high-angle'],
    default: 'eye-level',
  },
  lens_focal_length: {
    type: 'string',
    label: 'Lens Type',
    widget: 'select',
    enum: ['wide-angle', 'standard', 'portrait', 'macro'],
    default: 'standard',
  },
};

const aestheticsSchema: EditorSchema = {
  composition: {
    type: 'string',
    label: 'Composition',
    widget: 'select',
    enum: ['centered', 'rule-of-thirds', 'diagonal', 'symmetrical', 'asymmetrical'],
    default: 'centered',
  },
  color_scheme: {
    type: 'string',
    label: 'Color Palette',
    widget: 'color-palette',
    enum: ['vibrant', 'muted', 'monochrome', 'warm', 'cool', 'pastel', 'cinematic'],
  },
  mood_atmosphere: {
    type: 'string',
    label: 'Mood',
    widget: 'select',
    enum: ['neutral', 'cheerful', 'dramatic', 'serene', 'mysterious'],
    default: 'neutral',
  },
  mood: {
    type: 'string',
    hidden: true,
  },
  style_medium: {
    type: 'string',
    label: 'Style Medium',
    widget: 'text',
    description: 'Use any medium (e.g., photograph, watercolor, editorial photo, 3D render).',
  },
  aesthetic_style: {
    type: 'string',
    label: 'Aesthetic Style',
    widget: 'text',
    description: 'Use any style direction (e.g., cinematic noir, modern minimal, surreal collage).',
  },
  artistic_style: {
    type: 'string',
    hidden: true,
  },
};

const selectObjectSchema: EditorSchema = {
  prompt: {
    type: 'string',
    label: 'Object Prompt',
    widget: 'text',
    description: 'Describe the object to select.',
  },
  object_name: {
    type: 'string',
    hidden: true,
  },
};

const isColorProperty = (value: unknown): boolean => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === 'shape_and_color' ||
    normalized.includes('color') ||
    normalized.includes('palette') ||
    normalized.includes('hue') ||
    normalized.includes('saturation') ||
    normalized.includes('tone')
  );
};

const isStyleProperty = (value: unknown): boolean => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('style') ||
    normalized.includes('aesthetic') ||
    normalized.includes('artistic') ||
    normalized.includes('medium')
  );
};

const makeAdjustObjectPropertySchema = (
  toolInput?: Record<string, unknown>,
  uiOptions?: ToolUiOptions
): EditorSchema => {
  const property = toolInput?.property;
  const normalizedUiOptions = normalizeToolUiOptions(uiOptions);
  const valueSuggestions = getPropertySpecificValueSuggestions(property, normalizedUiOptions);

  const colorSuggestions = splitColorSuggestions(valueSuggestions);
  const valueSchema: FieldSchema = isColorProperty(property)
    ? {
      type: 'string',
      label: 'Color Palette',
      widget: 'color-palette',
      enum: mergeUnique(
        colorSuggestions.named,
        ['vibrant', 'muted', 'monochrome', 'warm', 'cool', 'pastel', 'cinematic']
      ),
      ...(colorSuggestions.hex.length > 0
        ? ({
          palette_presets: colorSuggestions.hex,
        } as unknown as Record<string, unknown>)
        : {}),
      description: 'Pick one or more colors, or add custom palette text.',
    }
    : isStyleProperty(property)
      ? {
        type: 'string',
        label: 'Style Value',
        widget: 'text',
        ...(valueSuggestions.length > 0 ? { enum: valueSuggestions } : {}),
        description: 'Enter any style direction or artistic treatment.',
      }
      : {
        type: 'string',
        label: 'Value',
        widget: 'text',
        ...(valueSuggestions.length > 0 ? { enum: valueSuggestions } : {}),
      };

  return {
    mask_id: {
      type: 'string',
      label: 'Mask ID',
      widget: 'text',
    },
    property: {
      type: 'string',
      label: 'Property',
      widget: 'select',
      enum: mergeUnique(
        normalizeSuggestionValues(normalizedUiOptions.property),
        [
          'location',
          'relative_size',
          'orientation',
          'description',
          'color',
          'shape_and_color',
          'texture',
          'appearance_details',
          'pose',
          'expression',
          'action',
        ]
      ),
    },
    value: valueSchema,
    object_index: {
      type: 'number',
      hidden: true,
    },
    index: {
      type: 'number',
      hidden: true,
    },
  };
};

const adjustObjectImageEditSchema: EditorSchema = {
  mask_id: {
    type: 'string',
    label: 'Mask ID',
    widget: 'text',
  },
  edit_type: {
    type: 'string',
    label: 'Edit Type',
    widget: 'select',
    enum: ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'exposure', 'vibrance'],
  },
  value: {
    type: 'number',
    label: 'Value',
    min: -180,
    max: 180,
    step: 1,
    widget: 'slider',
  },
};

const makeGlobalAdjustmentSchema = (
  label: string,
  min: number,
  max: number,
  defaultValue = 0
): EditorSchema => ({
  value: {
    type: 'number',
    label,
    min,
    max,
    step: 1,
    default: defaultValue,
    widget: 'slider',
  },
});

const setGlobalRotationSchema: EditorSchema = {
  angle: {
    type: 'number',
    label: 'Rotation',
    min: 0,
    max: 270,
    step: 90,
    default: 0,
    widget: 'slider',
  },
};

const toggleGlobalFlipSchema: EditorSchema = {
  axis: {
    type: 'string',
    label: 'Flip Axis',
    widget: 'select',
    enum: ['horizontal', 'vertical'],
  },
};

const CANONICAL_TOOL_ALIASES: Record<string, string> = {
  object_selection: 'select_object',
  update_camera: 'update_photographic',
  update_photography: 'update_photographic',
  update_lighting_conditions: 'update_lighting',
  update_scene_background: 'update_background',
};

const looksLikeColorField = (key: string): boolean => {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('color') ||
    normalized.includes('palette') ||
    normalized.includes('hue') ||
    normalized.includes('saturation') ||
    normalized.includes('tone')
  );
};

const inferFieldSchema = (key: string, value: unknown): FieldSchema => {
  if (typeof value === 'number') {
    return {
      type: 'number',
      label: key.replace(/_/g, ' '),
      widget: 'slider',
      min: -100,
      max: 100,
      step: 1,
    };
  }

  if (typeof value === 'boolean') {
    return {
      type: 'boolean',
      label: key.replace(/_/g, ' '),
    };
  }

  if (Array.isArray(value)) {
    return {
      type: 'array',
      label: key.replace(/_/g, ' '),
      items: { type: 'string' },
    };
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const properties: Record<string, FieldSchema> = {};
    Object.entries(objectValue).forEach(([childKey, childValue]) => {
      properties[childKey] = inferFieldSchema(childKey, childValue);
    });

    return {
      type: 'object',
      label: key.replace(/_/g, ' '),
      properties,
    };
  }

  const colorField = looksLikeColorField(key);
  if (colorField) {
    return {
      type: 'string',
      label: key.replace(/_/g, ' '),
      widget: 'color-palette',
      enum: ['vibrant', 'muted', 'monochrome', 'warm', 'cool', 'pastel', 'cinematic'],
    };
  }

  return {
    type: 'string',
    label: key.replace(/_/g, ' '),
    widget: 'text',
  };
};

const inferSchemaFromToolInput = (toolInput?: Record<string, unknown>): EditorSchema => {
  if (!toolInput || Object.keys(toolInput).length === 0) {
    return {};
  }

  const inferred: EditorSchema = {};
  Object.entries(toolInput).forEach(([key, value]) => {
    inferred[key] = inferFieldSchema(key, value);
  });
  return inferred;
};

const applyUiOptionsToSchema = (
  schema: EditorSchema,
  toolInput?: Record<string, unknown>,
  uiOptions?: ToolUiOptions
): EditorSchema => {
  const normalizedUiOptions = normalizeToolUiOptions(uiOptions);
  if (Object.keys(normalizedUiOptions).length === 0) return schema;

  const next = cloneEditorSchema(schema);
  Object.entries(normalizedUiOptions).forEach(([key, suggestedValues]) => {
    const field = next[key];
    if (!field || field.type !== 'string') return;

    const fieldRecord = field as FieldSchema & {
      enum?: string[];
      palette_presets?: string[];
    };
    if (fieldRecord.widget === 'color-palette') {
      const { hex, named } = splitColorSuggestions(suggestedValues);
      fieldRecord.enum = mergeUnique(named, Array.isArray(fieldRecord.enum) ? fieldRecord.enum : []);
      fieldRecord.palette_presets = mergeUnique(
        hex,
        Array.isArray(fieldRecord.palette_presets) ? fieldRecord.palette_presets : []
      );
      return;
    }

    fieldRecord.enum = mergeUnique(
      suggestedValues,
      Array.isArray(fieldRecord.enum) ? fieldRecord.enum : []
    );
  });

  if (toolInput?.property && next.value && next.value.type === 'string') {
    const valueField = next.value as FieldSchema & { enum?: string[]; widget?: string };
    const valueSuggestions = getPropertySpecificValueSuggestions(toolInput.property, normalizedUiOptions);
    if (valueSuggestions.length > 0 && valueField.widget !== 'color-palette') {
      valueField.enum = mergeUnique(
        valueSuggestions,
        Array.isArray(valueField.enum) ? valueField.enum : []
      );
    }
  }

  return next;
};

export const getToolSchema = (
  toolName: string,
  toolInput?: Record<string, unknown>,
  uiOptions?: ToolUiOptions
): EditorSchema => {
  const normalizedToolName = (toolName || '').trim().toLowerCase();
  const canonicalToolName = CANONICAL_TOOL_ALIASES[normalizedToolName] || normalizedToolName;

  const withUiOptions = (schema: EditorSchema): EditorSchema =>
    applyUiOptionsToSchema(cloneEditorSchema(schema), toolInput, uiOptions);

  switch (canonicalToolName) {
    case 'update_background':
      return withUiOptions(backgroundSchema);
    case 'update_lighting':
      return withUiOptions(lightingSchema);
    case 'update_photographic':
      return withUiOptions(photographicSchema);
    case 'update_aesthetics':
      return withUiOptions(aestheticsSchema);
    case 'select_object':
      return withUiOptions(selectObjectSchema);
    case 'adjust_object_property':
      return makeAdjustObjectPropertySchema(toolInput, uiOptions);
    case 'adjust_object_image_edit':
      return withUiOptions(adjustObjectImageEditSchema);
    case 'set_global_brightness':
      return withUiOptions(makeGlobalAdjustmentSchema('Brightness', -100, 100, 0));
    case 'set_global_contrast':
      return withUiOptions(makeGlobalAdjustmentSchema('Contrast', -100, 100, 0));
    case 'set_global_saturation':
      return withUiOptions(makeGlobalAdjustmentSchema('Saturation', -100, 100, 0));
    case 'set_global_exposure':
      return withUiOptions(makeGlobalAdjustmentSchema('Exposure', -100, 100, 0));
    case 'set_global_vibrance':
      return withUiOptions(makeGlobalAdjustmentSchema('Vibrance', -100, 100, 0));
    case 'set_global_hue':
      return withUiOptions(makeGlobalAdjustmentSchema('Hue', -180, 180, 0));
    case 'set_global_blur':
      return withUiOptions(makeGlobalAdjustmentSchema('Blur', 0, 100, 0));
    case 'set_global_sharpen':
      return withUiOptions(makeGlobalAdjustmentSchema('Sharpen', 0, 100, 0));
    case 'set_global_rotation':
      return withUiOptions(setGlobalRotationSchema);
    case 'toggle_global_flip':
      return withUiOptions(toggleGlobalFlipSchema);
    default:
      return applyUiOptionsToSchema(inferSchemaFromToolInput(toolInput), toolInput, uiOptions);
  }
};
