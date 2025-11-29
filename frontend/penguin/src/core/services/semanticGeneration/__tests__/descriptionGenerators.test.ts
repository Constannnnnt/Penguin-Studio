import { describe, it, expect } from 'vitest';
import {
  updateLocationMetadata,
  updateRelativeSizeMetadata,
  updateAppearanceDetailsFromEdits,
  updateShapeAndColorFromEdits,
  updateTextureFromEdits,
  updateOrientationMetadata,
  generateRelationshipDescription,
  generateObjectDescription,
  generateShortDescription,
  generateBackgroundDescription,
  generateLightingDescription,
  generateAestheticsDescription,
  generatePhotographicDescription,
} from '../descriptionGenerators';
import type { BoundingBox, MaskMetadata, MaskManipulationState } from '@/features/segmentation/store/segmentationStore';
import type { CombinedState } from '../types';

describe('descriptionGenerators', () => {
  describe('updateLocationMetadata', () => {
    it('should return center for centered objects', () => {
      const bbox: BoundingBox = { x1: 400, y1: 300, x2: 600, y2: 500 };
      const imageSize = { width: 1000, height: 800 };
      
      const result = updateLocationMetadata(bbox, imageSize);
      expect(result).toBe('center');
    });

    it('should return top-left for objects in top-left corner', () => {
      const bbox: BoundingBox = { x1: 50, y1: 50, x2: 150, y2: 150 };
      const imageSize = { width: 1000, height: 800 };
      
      const result = updateLocationMetadata(bbox, imageSize);
      expect(result).toBe('top-left');
    });

    it('should return bottom-right for objects in bottom-right corner', () => {
      const bbox: BoundingBox = { x1: 850, y1: 650, x2: 950, y2: 750 };
      const imageSize = { width: 1000, height: 800 };
      
      const result = updateLocationMetadata(bbox, imageSize);
      expect(result).toBe('bottom-right');
    });
  });

  describe('updateRelativeSizeMetadata', () => {
    it('should return small for objects < 5% of image', () => {
      const bbox: BoundingBox = { x1: 0, y1: 0, x2: 100, y2: 100 };
      const imageSize = { width: 1000, height: 1000 };
      
      const result = updateRelativeSizeMetadata(bbox, imageSize);
      expect(result).toBe('small');
    });

    it('should return medium for objects 5-15% of image', () => {
      const bbox: BoundingBox = { x1: 0, y1: 0, x2: 300, y2: 300 };
      const imageSize = { width: 1000, height: 1000 };
      
      const result = updateRelativeSizeMetadata(bbox, imageSize);
      expect(result).toBe('medium');
    });

    it('should return large for objects 15-30% of image', () => {
      const bbox: BoundingBox = { x1: 0, y1: 0, x2: 500, y2: 500 };
      const imageSize = { width: 1000, height: 1000 };
      
      const result = updateRelativeSizeMetadata(bbox, imageSize);
      expect(result).toBe('large');
    });

    it('should return very large for objects > 30% of image', () => {
      const bbox: BoundingBox = { x1: 0, y1: 0, x2: 700, y2: 700 };
      const imageSize = { width: 1000, height: 1000 };
      
      const result = updateRelativeSizeMetadata(bbox, imageSize);
      expect(result).toBe('very large');
    });
  });

  describe('updateAppearanceDetailsFromEdits', () => {
    it('should add brightened descriptor for positive brightness', () => {
      const result = updateAppearanceDetailsFromEdits('smooth', {
        brightness: 20,
        contrast: 0,
        exposure: 0,
        blur: 0,
      });
      
      expect(result).toContain('brightened');
    });

    it('should add darkened descriptor for negative brightness', () => {
      const result = updateAppearanceDetailsFromEdits('smooth', {
        brightness: -20,
        contrast: 0,
        exposure: 0,
        blur: 0,
      });
      
      expect(result).toContain('darkened');
    });

    it('should add blur descriptor', () => {
      const result = updateAppearanceDetailsFromEdits('smooth', {
        brightness: 0,
        contrast: 0,
        exposure: 0,
        blur: 5,
      });
      
      expect(result).toContain('blurred 5px');
    });
  });

  describe('updateShapeAndColorFromEdits', () => {
    it('should add vibrant colors for high saturation', () => {
      const result = updateShapeAndColorFromEdits('red circle', {
        saturation: 20,
        hue: 0,
        vibrance: 0,
      });
      
      expect(result).toContain('vibrant colors');
    });

    it('should add desaturated for low saturation', () => {
      const result = updateShapeAndColorFromEdits('red circle', {
        saturation: -20,
        hue: 0,
        vibrance: 0,
      });
      
      expect(result).toContain('desaturated');
    });
  });

  describe('updateTextureFromEdits', () => {
    it('should add blur notation to texture', () => {
      const result = updateTextureFromEdits('smooth', 5);
      expect(result).toBe('smooth (blurred 5px)');
    });

    it('should remove blur notation when blur is 0', () => {
      const result = updateTextureFromEdits('smooth (blurred 5px)', 0);
      expect(result).toBe('smooth');
    });
  });

  describe('updateOrientationMetadata', () => {
    it('should return centered for no movement', () => {
      const original: BoundingBox = { x1: 100, y1: 100, x2: 200, y2: 200 };
      const current: BoundingBox = { x1: 100, y1: 100, x2: 200, y2: 200 };
      
      const result = updateOrientationMetadata(original, current);
      expect(result).toBe('centered');
    });

    it('should return shifted right for rightward movement', () => {
      const original: BoundingBox = { x1: 100, y1: 100, x2: 200, y2: 200 };
      const current: BoundingBox = { x1: 150, y1: 100, x2: 250, y2: 200 };
      
      const result = updateOrientationMetadata(original, current);
      expect(result).toBe('shifted right');
    });
  });

  describe('generateBackgroundDescription', () => {
    it('should return neutral background for empty string', () => {
      const result = generateBackgroundDescription('');
      expect(result).toBe('neutral background');
    });

    it('should return the background as-is for non-empty string', () => {
      const result = generateBackgroundDescription('a sunny beach');
      expect(result).toBe('a sunny beach');
    });
  });

  describe('generateLightingDescription', () => {
    it('should generate lighting description', () => {
      const lighting = {
        conditions: 'natural' as const,
        direction: { x: 50, y: 20, rotation: 0, tilt: 0 },
        shadows: 3 as const,
      };
      
      const result = generateLightingDescription(lighting);
      
      expect(result.conditions).toBe('natural lighting');
      expect(result.shadows).toBe('moderate shadows');
      expect(result.direction).toContain('from above');
    });
  });

  describe('generateAestheticsDescription', () => {
    it('should generate aesthetics description', () => {
      const aesthetics = {
        style_medium: 'photograph' as const,
        aesthetic_style: 'realistic' as const,
        composition: 'centered' as const,
        color_scheme: 'vibrant' as const,
        mood_atmosphere: 'joyful' as const,
      };
      
      const result = generateAestheticsDescription(aesthetics);
      
      expect(result.composition).toBe('centered');
      expect(result.color_scheme).toBe('vibrant');
      expect(result.mood_atmosphere).toBe('joyful');
      expect(result.preference_score).toBe('8');
      expect(result.aesthetic_score).toBe('8');
    });
  });

  describe('generatePhotographicDescription', () => {
    it('should generate photographic description', () => {
      const photo = {
        camera_angle: 'eye-level' as const,
        lens_focal_length: 'portrait' as const,
        depth_of_field: 50,
        focus: 70,
      };
      
      const result = generatePhotographicDescription(photo);
      
      expect(result.camera_angle).toBe('eye-level');
      expect(result.lens_focal_length).toBe('portrait lens (e.g., 85mm-100mm)');
      expect(result.depth_of_field).toBe('medium depth of field');
      expect(result.focus).toBe('very sharp focus');
    });
  });
});
