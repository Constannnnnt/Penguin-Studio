import { describe, it, expect } from 'vitest';
import {
  buildObjects,
  buildLighting,
  buildAesthetics,
  buildPhotographicCharacteristics,
  build,
} from '../jsonBuilder';
import type { MaskMetadata, MaskManipulationState } from '@/store/segmentationStore';
import type { LightingConfig, AestheticsConfig, PhotographicConfig } from '@/types';
import type { JSONComponents } from '../types';

describe('jsonBuilder', () => {
  describe('buildObjects', () => {
    it('should build objects array from masks and manipulations', () => {
      const masks: MaskMetadata[] = [
        {
          mask_id: 'mask1',
          label: 'cat',
          confidence: 0.95,
          bounding_box: { x1: 10, y1: 10, x2: 100, y2: 100 },
          area_pixels: 8100,
          area_percentage: 10,
          centroid: [55, 55],
          mask_url: '/masks/mask1.png',
          objectMetadata: {
            description: 'a fluffy cat',
            location: 'center',
            relationship: '',
            relative_size: 'medium',
            shape_and_color: 'orange and white',
            texture: 'fluffy',
            appearance_details: 'well-lit',
            orientation: 'centered',
          },
        },
      ];

      const manipulations = new Map<string, MaskManipulationState>([
        [
          'mask1',
          {
            maskId: 'mask1',
            originalBoundingBox: { x1: 10, y1: 10, x2: 100, y2: 100 },
            currentBoundingBox: { x1: 10, y1: 10, x2: 100, y2: 100 },
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
        ],
      ]);

      const objects = buildObjects(masks, manipulations);

      expect(objects).toHaveLength(1);
      expect(objects[0].description).toBe('a fluffy cat');
      expect(objects[0].location).toBeDefined();
      expect(objects[0].relative_size).toBeDefined();
    });

    it('should filter out hidden objects', () => {
      const masks: MaskMetadata[] = [
        {
          mask_id: 'mask1',
          label: 'cat',
          confidence: 0.95,
          bounding_box: { x1: 10, y1: 10, x2: 100, y2: 100 },
          area_pixels: 8100,
          area_percentage: 10,
          centroid: [55, 55],
          mask_url: '/masks/mask1.png',
        },
        {
          mask_id: 'mask2',
          label: 'dog',
          confidence: 0.92,
          bounding_box: { x1: 200, y1: 200, x2: 300, y2: 300 },
          area_pixels: 10000,
          area_percentage: 12,
          centroid: [250, 250],
          mask_url: '/masks/mask2.png',
        },
      ];

      const manipulations = new Map<string, MaskManipulationState>([
        [
          'mask1',
          {
            maskId: 'mask1',
            originalBoundingBox: { x1: 10, y1: 10, x2: 100, y2: 100 },
            currentBoundingBox: { x1: 10, y1: 10, x2: 100, y2: 100 },
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
        ],
        [
          'mask2',
          {
            maskId: 'mask2',
            originalBoundingBox: { x1: 200, y1: 200, x2: 300, y2: 300 },
            currentBoundingBox: { x1: 200, y1: 200, x2: 300, y2: 300 },
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
            isHidden: true,
          },
        ],
      ]);

      const objects = buildObjects(masks, manipulations);

      expect(objects).toHaveLength(1);
      expect(objects[0].description).toBe('cat');
    });
  });

  describe('buildLighting', () => {
    it('should build lighting description from config', () => {
      const lighting: LightingConfig = {
        conditions: 'natural',
        direction: { x: 50, y: 30, rotation: 0, tilt: 0 },
        shadows: 3,
      };

      const result = buildLighting(lighting);

      expect(result).toHaveProperty('conditions');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('shadows');
      expect(result.conditions).toBe('natural lighting');
      expect(result.shadows).toBe('moderate shadows');
    });
  });

  describe('buildAesthetics', () => {
    it('should build aesthetics description from config', () => {
      const aesthetics: AestheticsConfig = {
        composition: 'rule of thirds',
        color_scheme: 'warm tones',
        mood_atmosphere: 'peaceful',
        aesthetic_style: 'realistic',
      };

      const result = buildAesthetics(aesthetics);

      expect(result).toHaveProperty('composition');
      expect(result).toHaveProperty('color_scheme');
      expect(result).toHaveProperty('mood_atmosphere');
      expect(result).toHaveProperty('preference_score');
      expect(result).toHaveProperty('aesthetic_score');
      expect(result.composition).toBe('rule of thirds');
      expect(result.mood_atmosphere).toBe('peaceful');
    });
  });

  describe('buildPhotographicCharacteristics', () => {
    it('should build photographic characteristics from config', () => {
      const photo: PhotographicConfig = {
        camera_angle: 'eye-level',
        lens_focal_length: 'portrait',
        depth_of_field: 50,
        focus: 60,
      };

      const result = buildPhotographicCharacteristics(photo);

      expect(result).toHaveProperty('camera_angle');
      expect(result).toHaveProperty('lens_focal_length');
      expect(result).toHaveProperty('depth_of_field');
      expect(result).toHaveProperty('focus');
      expect(result.camera_angle).toBe('eye-level');
      expect(result.depth_of_field).toBe('medium depth of field');
      expect(result.focus).toBe('sharp focus');
    });
  });

  describe('build', () => {
    it('should assemble complete semantic JSON from components', () => {
      const components: JSONComponents = {
        shortDescription: 'A peaceful scene with a cat',
        objects: [
          {
            description: 'a fluffy cat',
            location: 'center',
            relationship: '',
            relative_size: 'medium',
            shape_and_color: 'orange and white',
            texture: 'fluffy',
            appearance_details: 'well-lit',
            orientation: 'centered',
          },
        ],
        backgroundSetting: 'indoor living room',
        lighting: {
          conditions: 'natural lighting',
          direction: 'from above and centered',
          shadows: 'moderate shadows',
        },
        aesthetics: {
          composition: 'rule of thirds',
          color_scheme: 'warm tones',
          mood_atmosphere: 'peaceful',
          preference_score: '8',
          aesthetic_score: '8',
        },
        photographicCharacteristics: {
          camera_angle: 'eye-level',
          lens_focal_length: 'portrait lens (e.g., 85mm-100mm)',
          depth_of_field: 'medium depth of field',
          focus: 'sharp focus',
        },
        styleMedium: 'photograph',
      };

      const result = build(components);

      expect(result).toHaveProperty('short_description');
      expect(result).toHaveProperty('objects');
      expect(result).toHaveProperty('background_setting');
      expect(result).toHaveProperty('lighting');
      expect(result).toHaveProperty('aesthetics');
      expect(result).toHaveProperty('photographic_characteristics');
      expect(result).toHaveProperty('style_medium');
      expect(result.short_description).toBe('A peaceful scene with a cat');
      expect(result.objects).toHaveLength(1);
      expect(result.style_medium).toBe('photograph');
    });

    it('should include optional fields when present', () => {
      const components: JSONComponents = {
        shortDescription: 'A scene',
        objects: [],
        backgroundSetting: 'outdoor',
        lighting: {
          conditions: 'natural lighting',
          direction: 'from above',
          shadows: 'soft shadows',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'neutral',
          mood_atmosphere: 'calm',
          preference_score: '7',
          aesthetic_score: '7',
        },
        photographicCharacteristics: {
          camera_angle: 'eye-level',
          lens_focal_length: 'standard lens (e.g., 50mm)',
          depth_of_field: 'medium depth of field',
          focus: 'sharp focus',
        },
        styleMedium: 'photograph',
        context: 'test context',
        artisticStyle: 'minimalist',
      };

      const result = build(components);

      expect(result.context).toBe('test context');
      expect(result.artistic_style).toBe('minimalist');
    });

    it('should not include optional fields when not present', () => {
      const components: JSONComponents = {
        shortDescription: 'A scene',
        objects: [],
        backgroundSetting: 'outdoor',
        lighting: {
          conditions: 'natural lighting',
          direction: 'from above',
          shadows: 'soft shadows',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'neutral',
          mood_atmosphere: 'calm',
          preference_score: '7',
          aesthetic_score: '7',
        },
        photographicCharacteristics: {
          camera_angle: 'eye-level',
          lens_focal_length: 'standard lens (e.g., 50mm)',
          depth_of_field: 'medium depth of field',
          focus: 'sharp focus',
        },
        styleMedium: 'photograph',
      };

      const result = build(components);

      expect(result.context).toBeUndefined();
      expect(result.artistic_style).toBeUndefined();
      expect(result.text_render).toBeUndefined();
    });
  });
});

