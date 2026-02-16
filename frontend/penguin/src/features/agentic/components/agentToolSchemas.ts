import type { EditorSchema, FieldSchema } from '@fibo-ui/core';

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
    widget: 'select',
    enum: ['vibrant', 'muted', 'monochrome', 'warm', 'cool', 'pastel', 'cinematic'],
    default: 'vibrant',
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

const adjustObjectPropertySchema: EditorSchema = {
  mask_id: {
    type: 'string',
    label: 'Mask ID',
    widget: 'text',
  },
  property: {
    type: 'string',
    label: 'Property',
    widget: 'select',
    enum: [
      'location',
      'relative_size',
      'orientation',
      'description',
      'shape_and_color',
      'texture',
      'appearance_details',
      'pose',
      'expression',
      'action',
    ],
  },
  value: {
    type: 'string',
    label: 'Value',
    widget: 'text',
  },
  object_index: {
    type: 'number',
    hidden: true,
  },
  index: {
    type: 'number',
    hidden: true,
  },
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

export const getToolSchema = (
  toolName: string,
  toolInput?: Record<string, unknown>
): EditorSchema => {
  const normalizedToolName = (toolName || '').trim().toLowerCase();
  const canonicalToolName = CANONICAL_TOOL_ALIASES[normalizedToolName] || normalizedToolName;

  switch (canonicalToolName) {
    case 'update_background':
      return backgroundSchema;
    case 'update_lighting':
      return lightingSchema;
    case 'update_photographic':
      return photographicSchema;
    case 'update_aesthetics':
      return aestheticsSchema;
    case 'select_object':
      return selectObjectSchema;
    case 'adjust_object_property':
      return adjustObjectPropertySchema;
    case 'adjust_object_image_edit':
      return adjustObjectImageEditSchema;
    case 'set_global_brightness':
      return makeGlobalAdjustmentSchema('Brightness', -100, 100, 0);
    case 'set_global_contrast':
      return makeGlobalAdjustmentSchema('Contrast', -100, 100, 0);
    case 'set_global_saturation':
      return makeGlobalAdjustmentSchema('Saturation', -100, 100, 0);
    case 'set_global_exposure':
      return makeGlobalAdjustmentSchema('Exposure', -100, 100, 0);
    case 'set_global_vibrance':
      return makeGlobalAdjustmentSchema('Vibrance', -100, 100, 0);
    case 'set_global_hue':
      return makeGlobalAdjustmentSchema('Hue', -180, 180, 0);
    case 'set_global_blur':
      return makeGlobalAdjustmentSchema('Blur', 0, 100, 0);
    case 'set_global_sharpen':
      return makeGlobalAdjustmentSchema('Sharpen', 0, 100, 0);
    case 'set_global_rotation':
      return setGlobalRotationSchema;
    case 'toggle_global_flip':
      return toggleGlobalFlipSchema;
    default:
      return inferSchemaFromToolInput(toolInput);
  }
};
