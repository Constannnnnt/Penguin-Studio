import type {
  LightingConfig,
  AestheticsConfig,
  PhotographicConfig,
} from '@/core/types';
import type {
  MaskMetadata,
  MaskManipulationState,
  BoundingBox,
} from '@/features/segmentation/store/segmentationStore';
import type {
  CombinedState,
  ObjectDescription,
  LightingDescription,
  AestheticsDescription,
  PhotographicDescription,
} from './types';
import {
  convertLightingConditions,
  convertLightingDirection,
  convertShadowIntensity,
  convertCameraAngle,
  convertLensFocalLength,
  convertDepthOfField,
  convertFocus,
  convertAestheticStyle,
} from './valueConverters';

/**
 * Update location field based on currentBoundingBox
 * Maps position to location descriptors (center, top-left, top-right, etc.)
 */
export function updateLocationMetadata(
  currentBoundingBox: BoundingBox,
  imageSize: { width: number; height: number }
): string {
  const centerX = (currentBoundingBox.x1 + currentBoundingBox.x2) / 2;
  const centerY = (currentBoundingBox.y1 + currentBoundingBox.y2) / 2;
  
  const relativeX = centerX / imageSize.width;
  const relativeY = centerY / imageSize.height;
  
  let vertical = '';
  if (relativeY < 0.33) {
    vertical = 'top';
  } else if (relativeY > 0.67) {
    vertical = 'bottom';
  } else {
    vertical = 'center';
  }
  
  let horizontal = '';
  if (relativeX < 0.33) {
    horizontal = 'left';
  } else if (relativeX > 0.67) {
    horizontal = 'right';
  } else {
    horizontal = 'center';
  }
  
  if (vertical === 'center' && horizontal === 'center') {
    return 'center';
  } else if (vertical === 'center') {
    return `center-${horizontal}`;
  } else if (horizontal === 'center') {
    return `${vertical}-center`;
  } else {
    return `${vertical}-${horizontal}`;
  }
}

/**
 * Update relative_size based on scale transform
 * Maps size to descriptors (small, medium, large, very large)
 */
export function updateRelativeSizeMetadata(
  currentBoundingBox: BoundingBox,
  imageSize: { width: number; height: number }
): string {
  const width = currentBoundingBox.x2 - currentBoundingBox.x1;
  const height = currentBoundingBox.y2 - currentBoundingBox.y1;
  const area = width * height;
  const imageArea = imageSize.width * imageSize.height;
  const areaPercentage = (area / imageArea) * 100;
  
  if (areaPercentage < 5) {
    return 'small';
  } else if (areaPercentage < 15) {
    return 'medium';
  } else if (areaPercentage < 30) {
    return 'large';
  } else {
    return 'very large';
  }
}

/**
 * Update appearance_details based on brightness, contrast, exposure, blur
 */
export function updateAppearanceDetailsFromEdits(
  baseAppearance: string,
  imageEdits: {
    brightness: number;
    contrast: number;
    exposure: number;
    blur: number;
  }
): string {
  const descriptors: string[] = [];
  
  if (baseAppearance) {
    descriptors.push(baseAppearance);
  }
  
  if (imageEdits.brightness > 10) {
    descriptors.push('brightened');
  } else if (imageEdits.brightness < -10) {
    descriptors.push('darkened');
  }
  
  if (imageEdits.contrast > 10) {
    descriptors.push('high contrast');
  } else if (imageEdits.contrast < -10) {
    descriptors.push('low contrast');
  }
  
  if (imageEdits.exposure > 10) {
    descriptors.push('overexposed');
  } else if (imageEdits.exposure < -10) {
    descriptors.push('underexposed');
  }
  
  if (imageEdits.blur > 0) {
    descriptors.push(`blurred ${imageEdits.blur}px`);
  }
  
  return descriptors.join(', ');
}

/**
 * Update shape_and_color based on saturation, hue, vibrance
 */
export function updateShapeAndColorFromEdits(
  baseShapeAndColor: string,
  imageEdits: {
    saturation: number;
    hue: number;
    vibrance: number;
  }
): string {
  const descriptors: string[] = [];
  
  if (baseShapeAndColor) {
    descriptors.push(baseShapeAndColor);
  }
  
  if (imageEdits.saturation > 10) {
    descriptors.push('vibrant colors');
  } else if (imageEdits.saturation < -10) {
    descriptors.push('desaturated');
  }
  
  if (Math.abs(imageEdits.hue) > 10) {
    descriptors.push('color-shifted');
  }
  
  if (imageEdits.vibrance > 10) {
    descriptors.push('enhanced vibrance');
  } else if (imageEdits.vibrance < -10) {
    descriptors.push('muted vibrance');
  }
  
  return descriptors.join(', ');
}

/**
 * Update texture based on blur
 */
export function updateTextureFromEdits(
  baseTexture: string,
  blur: number
): string {
  const cleanTexture = baseTexture.replace(/\s*\(blurred \d+px\)/, '').trim();
  
  if (blur > 0) {
    return cleanTexture 
      ? `${cleanTexture} (blurred ${blur}px)`
      : `blurred ${blur}px`;
  }
  
  return cleanTexture;
}

/**
 * Update orientation based on position/rotation changes
 */
export function updateOrientationMetadata(
  originalBoundingBox: BoundingBox,
  currentBoundingBox: BoundingBox
): string {
  const originalCenterX = (originalBoundingBox.x1 + originalBoundingBox.x2) / 2;
  const originalCenterY = (originalBoundingBox.y1 + originalBoundingBox.y2) / 2;
  const currentCenterX = (currentBoundingBox.x1 + currentBoundingBox.x2) / 2;
  const currentCenterY = (currentBoundingBox.y1 + currentBoundingBox.y2) / 2;
  
  const deltaX = currentCenterX - originalCenterX;
  const deltaY = currentCenterY - originalCenterY;
  
  const threshold = 10;
  
  if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
    return 'centered';
  }
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? 'shifted right' : 'shifted left';
  } else {
    return deltaY > 0 ? 'shifted down' : 'shifted up';
  }
}

/**
 * Generate relationship descriptions between objects
 */
export function generateRelationshipDescription(
  maskId: string,
  allMasks: MaskMetadata[],
  manipulationStates: Map<string, MaskManipulationState>
): string {
  const currentMask = allMasks.find(m => m.mask_id === maskId);
  if (!currentMask) return '';
  
  const currentManipState = manipulationStates.get(maskId);
  if (!currentManipState) return '';
  
  const currentBbox = currentManipState.currentBoundingBox;
  const currentCenterY = (currentBbox.y1 + currentBbox.y2) / 2;
  const currentCenterX = (currentBbox.x1 + currentBbox.x2) / 2;
  
  const relationships: string[] = [];
  
  for (const otherMask of allMasks) {
    if (otherMask.mask_id === maskId) continue;
    
    const otherManipState = manipulationStates.get(otherMask.mask_id);
    if (!otherManipState || otherManipState.isHidden) continue;
    
    const otherBbox = otherManipState.currentBoundingBox;
    const otherCenterY = (otherBbox.y1 + otherBbox.y2) / 2;
    const otherCenterX = (otherBbox.x1 + otherBbox.x2) / 2;
    
    const verticalDiff = currentCenterY - otherCenterY;
    const horizontalDiff = currentCenterX - otherCenterX;
    
    const isOverlapping = !(
      currentBbox.x2 < otherBbox.x1 ||
      currentBbox.x1 > otherBbox.x2 ||
      currentBbox.y2 < otherBbox.y1 ||
      currentBbox.y1 > otherBbox.y2
    );
    
    if (isOverlapping) {
      relationships.push(`overlapping with ${otherMask.label}`);
    } else if (Math.abs(verticalDiff) > Math.abs(horizontalDiff)) {
      if (verticalDiff > 0) {
        relationships.push(`below ${otherMask.label}`);
      } else {
        relationships.push(`above ${otherMask.label}`);
      }
    } else {
      if (horizontalDiff > 0) {
        relationships.push(`to the right of ${otherMask.label}`);
      } else {
        relationships.push(`to the left of ${otherMask.label}`);
      }
    }
    
    if (relationships.length >= 2) break;
  }
  
  return relationships.join(', ');
}

/**
 * Generate object description from metadata and manipulation state
 */
export function generateObjectDescription(
  metadata: MaskMetadata,
  manipulation: MaskManipulationState,
  imageSize?: { width: number; height: number }
): ObjectDescription {
  const baseMetadata = metadata.objectMetadata || {
    description: metadata.label,
    location: '',
    relationship: '',
    relative_size: '',
    shape_and_color: '',
    texture: '',
    appearance_details: '',
    orientation: '',
  };
  
  let location = baseMetadata.location;
  let relative_size = baseMetadata.relative_size;
  let orientation = baseMetadata.orientation;
  let appearance_details = baseMetadata.appearance_details;
  let shape_and_color = baseMetadata.shape_and_color;
  let texture = baseMetadata.texture;
  
  if (imageSize) {
    location = updateLocationMetadata(manipulation.currentBoundingBox, imageSize);
    relative_size = updateRelativeSizeMetadata(manipulation.currentBoundingBox, imageSize);
  }
  
  orientation = updateOrientationMetadata(
    manipulation.originalBoundingBox,
    manipulation.currentBoundingBox
  );
  
  const hasImageEdits = Object.values(manipulation.transform.imageEdits).some(v => v !== 0);
  if (hasImageEdits) {
    appearance_details = updateAppearanceDetailsFromEdits(
      baseMetadata.appearance_details,
      manipulation.transform.imageEdits
    );
    
    shape_and_color = updateShapeAndColorFromEdits(
      baseMetadata.shape_and_color,
      manipulation.transform.imageEdits
    );
    
    texture = updateTextureFromEdits(
      baseMetadata.texture,
      manipulation.transform.imageEdits.blur
    );
  }
  
  return {
    description: baseMetadata.description,
    location,
    relationship: baseMetadata.relationship,
    relative_size,
    shape_and_color,
    texture,
    appearance_details,
    orientation,
  };
}

/**
 * Generate short description for entire scene
 */
export function generateShortDescription(state: CombinedState): string {
  const sentences: string[] = [];
  
  if (state.results?.masks && state.results.masks.length > 0) {
    const visibleMasks = state.results.masks.filter(mask => {
      const manipState = state.maskManipulation.get(mask.mask_id);
      return !manipState?.isHidden;
    });
    
    if (visibleMasks.length > 0) {
      const objectLabels = visibleMasks
        .slice(0, 3)
        .map(m => m.label)
        .join(', ');
      
      if (visibleMasks.length === 1) {
        sentences.push(`A scene featuring ${objectLabels}.`);
      } else if (visibleMasks.length === 2) {
        sentences.push(`A scene featuring ${objectLabels}.`);
      } else {
        const remaining = visibleMasks.length - 3;
        if (remaining > 0) {
          sentences.push(`A scene featuring ${objectLabels}, and ${remaining} other object${remaining > 1 ? 's' : ''}.`);
        } else {
          sentences.push(`A scene featuring ${objectLabels}.`);
        }
      }
    }
  }
  
  const bg = state.sceneConfig.background_setting;
  const lightingConditions = convertLightingConditions(state.sceneConfig.lighting.conditions);
  
  if (bg && bg.trim()) {
    sentences.push(`Set against ${bg}, with ${lightingConditions}.`);
  } else {
    sentences.push(`The scene has ${lightingConditions}.`);
  }
  
  const mood = state.sceneConfig.aesthetics.mood_atmosphere;
  const aestheticStyle = convertAestheticStyle(state.sceneConfig.aesthetics.aesthetic_style);
  
  if (mood && aestheticStyle) {
    sentences.push(`The overall mood is ${mood}, with a ${aestheticStyle} aesthetic.`);
  }
  
  return sentences.join(' ');
}

/**
 * Generate background setting description
 */
export function generateBackgroundDescription(background: string): string {
  if (!background || !background.trim()) {
    return 'neutral background';
  }
  return background;
}

/**
 * Generate lighting description
 */
export function generateLightingDescription(lighting: LightingConfig): LightingDescription {
  return {
    conditions: convertLightingConditions(lighting.conditions),
    direction: convertLightingDirection(lighting.direction),
    shadows: convertShadowIntensity(lighting.shadows),
  };
}

/**
 * Generate aesthetics description
 */
export function generateAestheticsDescription(aesthetics: AestheticsConfig): AestheticsDescription {
  return {
    composition: aesthetics.composition,
    color_scheme: aesthetics.color_scheme,
    mood_atmosphere: aesthetics.mood_atmosphere,
    preference_score: '8',
    aesthetic_score: '8',
  };
}

/**
 * Generate photographic characteristics description
 */
export function generatePhotographicDescription(
  photo: PhotographicConfig
): PhotographicDescription {
  return {
    depth_of_field: convertDepthOfField(photo.depth_of_field),
    focus: convertFocus(photo.focus),
    camera_angle: convertCameraAngle(photo.camera_angle),
    lens_focal_length: convertLensFocalLength(photo.lens_focal_length),
  };
}
