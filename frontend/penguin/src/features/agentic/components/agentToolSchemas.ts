import type { EditorSchema } from '@fibo-ui/core';

export const backgroundSchema: EditorSchema = {
  // We use a specific key for the picker, or maps to the same field
  // In the original, 'background_setting' is both the text and the pill selection.
  // Here we can separate them or use a smart widget.
  background_selector: {
      type: 'string',
      label: 'Environment Set',
      widget: 'background-picker',
      // We map this to the same data key effectively by handling it in the parent or using a transformer,
      // but for simplicity let's assume the toolInput has a field we want to drive.
      // The original code updates 'background_setting' with the string.
  },
  background_setting: {
    type: 'string',
    label: 'Detailed Prompt',
    widget: 'textarea',
    description: 'Describe the environment in detail.'
  },
  setting: {
    type: 'string', // Legacy field support
    hidden: true
  }
};

export const lightingSchema: EditorSchema = {
  conditions: {
    type: 'string',
    label: 'Conditions',
    widget: 'select',
    enum: ['Studio', 'Natural', 'Cinematic', 'Neon', 'Golden Hour']
  },
  shadows: {
    type: 'number',
    label: 'Shadows',
    min: 0,
    max: 5,
    step: 1,
    widget: 'slider'
  },
  direction: {
    type: 'object',
    label: 'Direction',
    widget: 'lighting-direction',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      rotation: { type: 'number' },
      tilt: { type: 'number' }
    }
  }
};

export const photographicSchema: EditorSchema = {
  depth_of_field: {
    type: 'number',
    label: 'Depth of Field',
    min: 0,
    max: 100,
    step: 1,
    widget: 'slider'
  },
  focus: {
    type: 'number',
    label: 'Focus Shift',
    min: 0,
    max: 100,
    step: 1,
    widget: 'slider'
  },
  camera_angle: {
    type: 'string',
    label: 'Camera Angle',
    widget: 'select',
    enum: ['Eye Level', 'Low Angle', 'High Angle', 'Bird\'s Eye', 'Worm\'s Eye']
  }
};

export const aestheticsSchema: EditorSchema = {
  composition: {
    type: 'string',
    label: 'Composition',
    widget: 'select',
    enum: ['Centered', 'Rule of Thirds', 'Symmetrical', 'Dynamic']
  },
  color_scheme: {
    type: 'string',
    label: 'Color Palette',
    widget: 'select',
    enum: ['Vibrant', 'Muted', 'Monochrome', 'Warm', 'Cool']
  },
  mood_atmosphere: {
    type: 'string',
    label: 'Mood',
    widget: 'select',
    enum: ['Cheerful', 'Dramatic', 'Serene', 'Mysterious']
  }
};

export const getToolSchema = (toolName: string): EditorSchema => {
  switch (toolName) {
    case 'update_background': return backgroundSchema;
    case 'update_lighting': return lightingSchema;
    case 'update_photographic': return photographicSchema;
    case 'update_aesthetics': return aestheticsSchema;
    default: return {};
  }
};
