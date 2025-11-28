import type {
  CameraAngle,
  LensType,
  DepthOfFieldValue,
  FocusValue,
  LightingCondition,
  LightingDirectionValue,
  ShadowIntensity,
  StyleMedium,
  AestheticStyle,
} from '@/types';

const PREDEFINED_CAMERA_ANGLES = ['eye-level', 'overhead', 'low-angle', 'high-angle'];
const PREDEFINED_LENS_TYPES = ['wide-angle', 'standard', 'portrait', 'macro'];
const PREDEFINED_LIGHTING_CONDITIONS = ['natural', 'studio', 'soft diffused', 'dramatic', 'golden hour'];
const PREDEFINED_STYLE_MEDIUMS = ['photograph', 'painting', 'digital art', 'sketch', '3D render'];
const PREDEFINED_AESTHETIC_STYLES = ['realistic', 'artistic', 'vintage', 'modern', 'dramatic'];

const CAMERA_ANGLE_DESCRIPTIONS: Record<string, string> = {
  'eye-level': 'eye-level',
  'overhead': 'overhead view',
  'low-angle': 'low-angle shot',
  'high-angle': 'high-angle view',
};

const LENS_TYPE_DESCRIPTIONS: Record<string, string> = {
  'wide-angle': 'wide-angle lens',
  'standard': 'standard lens (e.g., 50mm)',
  'portrait': 'portrait lens (e.g., 85mm-100mm)',
  'macro': 'macro lens',
};

const LIGHTING_CONDITION_DESCRIPTIONS: Record<string, string> = {
  'natural': 'natural lighting',
  'studio': 'studio lighting',
  'soft diffused': 'soft diffused studio lighting',
  'dramatic': 'dramatic lighting',
  'golden hour': 'golden hour lighting',
};

const STYLE_MEDIUM_DESCRIPTIONS: Record<string, string> = {
  'photograph': 'photograph',
  'painting': 'painting',
  'digital art': 'digital art',
  'sketch': 'sketch',
  '3D render': '3D render',
};

const AESTHETIC_STYLE_DESCRIPTIONS: Record<string, string> = {
  'realistic': 'realistic',
  'artistic': 'artistic',
  'vintage': 'vintage',
  'modern': 'modern',
  'dramatic': 'dramatic',
};

export function convertCameraAngle(angle: CameraAngle | string): string {
  if (PREDEFINED_CAMERA_ANGLES.includes(angle)) {
    return CAMERA_ANGLE_DESCRIPTIONS[angle] || angle;
  }
  return angle;
}

export function convertLensFocalLength(lens: LensType | string): string {
  if (PREDEFINED_LENS_TYPES.includes(lens)) {
    return LENS_TYPE_DESCRIPTIONS[lens] || lens;
  }
  return lens;
}

export function convertDepthOfField(value: DepthOfFieldValue): string {
  if (value >= 0 && value <= 20) {
    return 'very shallow depth of field';
  } else if (value >= 21 && value <= 40) {
    return 'shallow depth of field';
  } else if (value >= 41 && value <= 60) {
    return 'medium depth of field';
  } else if (value >= 61 && value <= 80) {
    return 'deep depth of field';
  } else if (value >= 81 && value <= 100) {
    return 'very deep depth of field';
  }
  return 'medium depth of field';
}

export function convertFocus(value: FocusValue): string {
  if (value >= 0 && value <= 20) {
    return 'soft focus';
  } else if (value >= 21 && value <= 40) {
    return 'slight soft focus';
  } else if (value >= 41 && value <= 60) {
    return 'sharp focus';
  } else if (value >= 61 && value <= 80) {
    return 'very sharp focus';
  } else if (value >= 81 && value <= 100) {
    return 'hyper sharp focus';
  }
  return 'sharp focus';
}

export function convertLightingConditions(conditions: LightingCondition | string): string {
  if (PREDEFINED_LIGHTING_CONDITIONS.includes(conditions)) {
    return LIGHTING_CONDITION_DESCRIPTIONS[conditions] || conditions;
  }
  return conditions;
}

export function convertShadowIntensity(intensity: ShadowIntensity): string {
  const shadowMap: Record<ShadowIntensity, string> = {
    0: 'no shadows',
    1: 'subtle shadows',
    2: 'soft shadows',
    3: 'moderate shadows',
    4: 'strong shadows',
    5: 'dramatic shadows',
  };
  return shadowMap[intensity] || 'moderate shadows';
}

export function convertLightingDirection(direction: LightingDirectionValue): string {
  const { x, y, rotation, tilt } = direction;
  
  let horizontal = '';
  if (x < 30) {
    horizontal = 'from the left';
  } else if (x > 70) {
    horizontal = 'from the right';
  } else {
    horizontal = 'centered';
  }
  
  let vertical = '';
  if (y < 30) {
    vertical = 'from above';
  } else if (y > 70) {
    vertical = 'from below';
  } else {
    vertical = 'at eye-level';
  }
  
  let tiltDesc = '';
  if (Math.abs(tilt) > 30) {
    tiltDesc = tilt < 0 ? ', angled downward' : ', angled upward';
  }
  
  let rotationDesc = '';
  if (rotation > 45 && rotation < 135) {
    rotationDesc = ', from the side';
  } else if (rotation >= 135 && rotation < 225) {
    rotationDesc = ', from behind';
  } else if (rotation >= 225 && rotation < 315) {
    rotationDesc = ', from the opposite side';
  }
  
  return `${vertical} and ${horizontal}${tiltDesc}${rotationDesc}`.trim();
}

export function convertStyleMedium(medium: StyleMedium | string): string {
  if (PREDEFINED_STYLE_MEDIUMS.includes(medium)) {
    return STYLE_MEDIUM_DESCRIPTIONS[medium] || medium;
  }
  return medium;
}

export function convertAestheticStyle(style: AestheticStyle | string): string {
  if (PREDEFINED_AESTHETIC_STYLES.includes(style)) {
    return AESTHETIC_STYLE_DESCRIPTIONS[style] || style;
  }
  return style;
}
