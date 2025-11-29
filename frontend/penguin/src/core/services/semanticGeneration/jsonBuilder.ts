import type {
  LightingConfig,
  AestheticsConfig,
  PhotographicConfig,
} from '@/core/types';
import type {
  MaskMetadata,
  MaskManipulationState,
} from '@/features/segmentation/store/segmentationStore';
import type {
  ObjectDescription,
  LightingDescription,
  AestheticsDescription,
  PhotographicDescription,
  SemanticJSON,
  JSONComponents,
} from './types';
import {
  generateObjectDescription,
  generateLightingDescription,
  generateAestheticsDescription,
  generatePhotographicDescription,
  generateRelationshipDescription,
} from './descriptionGenerators';

/**
 * Build objects array from masks and manipulations
 * Filters out hidden objects
 */
export function buildObjects(
  masks: MaskMetadata[],
  manipulations: Map<string, MaskManipulationState>,
  imageSize?: { width: number; height: number }
): ObjectDescription[] {
  const objects: ObjectDescription[] = [];
  
  for (const mask of masks) {
    const manipState = manipulations.get(mask.mask_id);
    
    // Filter out hidden objects
    if (manipState?.isHidden) {
      continue;
    }
    
    // Generate description for each object
    const objectDesc = generateObjectDescription(
      mask,
      manipState || {
        maskId: mask.mask_id,
        originalBoundingBox: mask.bounding_box,
        currentBoundingBox: mask.bounding_box,
        transform: {
          position: { x: 0, y: 0 },
          scale: { width: 1, height: 1 },
          imageEdits: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            exposure: 0,
            vibrance: 0,
          },
        },
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        isHidden: false,
      },
      imageSize
    );
    
    // Update relationship with current state
    const relationship = generateRelationshipDescription(
      mask.mask_id,
      masks,
      manipulations
    );
    
    objects.push({
      ...objectDesc,
      relationship: relationship || objectDesc.relationship,
    });
  }
  
  return objects;
}

/**
 * Build lighting object from LightingConfig
 */
export function buildLighting(lighting: LightingConfig): LightingDescription {
  return generateLightingDescription(lighting);
}

/**
 * Build aesthetics object from AestheticsConfig
 * Includes style_medium and artistic_style
 */
export function buildAesthetics(aesthetics: AestheticsConfig): AestheticsDescription {
  return generateAestheticsDescription(aesthetics);
}

/**
 * Build photographic characteristics object from PhotographicConfig
 */
export function buildPhotographicCharacteristics(
  photo: PhotographicConfig
): PhotographicDescription {
  return generatePhotographicDescription(photo);
}

/**
 * Build complete semantic JSON from components
 * Assembles all components into SemanticJSON structure
 */
export function build(components: JSONComponents): SemanticJSON {
  const json: SemanticJSON = {
    short_description: components.shortDescription,
    objects: components.objects,
    background_setting: components.backgroundSetting,
    lighting: components.lighting,
    aesthetics: components.aesthetics,
    photographic_characteristics: components.photographicCharacteristics,
    style_medium: components.styleMedium,
  };
  
  // Include optional fields if present
  if (components.context) {
    json.context = components.context;
  }
  
  if (components.artisticStyle) {
    json.artistic_style = components.artisticStyle;
  }
  
  if (components.textRender && components.textRender.length > 0) {
    json.text_render = components.textRender;
  }
  
  return json;
}
