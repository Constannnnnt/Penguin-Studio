import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticGenerationService } from '../SemanticGenerationService';
import type { CombinedState, SemanticJSON } from '../types';

// Mock the stores
vi.mock('@/store/configStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => ({
      sceneConfig: {
        background_setting: 'A serene outdoor setting',
        photographic_characteristics: {
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
          depth_of_field: 50,
          focus: 75,
        },
        lighting: {
          conditions: 'natural',
          direction: {
            x: 50,
            y: 30,
            rotation: 0,
            tilt: 0,
          },
          shadows: 2,
        },
        aesthetics: {
          style_medium: 'photograph',
          aesthetic_style: 'realistic',
          composition: 'centered',
          color_scheme: 'vibrant',
          mood_atmosphere: 'neutral',
        },
      },
    })),
  },
}));

vi.mock('@/store/segmentationStore', () => ({
  useSegmentationStore: {
    getState: vi.fn(() => ({
      results: null,
      maskManipulation: new Map(),
    })),
  },
}));

describe('SemanticGenerationService', () => {
  let service: SemanticGenerationService;
  let mockLogger: Console;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Console;

    service = new SemanticGenerationService(mockLogger);
  });

  describe('generateSemanticJSON', () => {
    it('should generate semantic JSON from valid state', () => {
      const mockState: CombinedState = {
        sceneConfig: {
          background_setting: 'A serene outdoor setting',
          photographic_characteristics: {
            camera_angle: 'eye-level',
            lens_focal_length: 'standard',
            depth_of_field: 50,
            focus: 75,
          },
          lighting: {
            conditions: 'natural',
            direction: {
              x: 50,
              y: 30,
              rotation: 0,
              tilt: 0,
            },
            shadows: 2,
          },
          aesthetics: {
            style_medium: 'photograph',
            aesthetic_style: 'realistic',
            composition: 'centered',
            color_scheme: 'vibrant',
            mood_atmosphere: 'neutral',
          },
        },
        results: null,
        maskManipulation: new Map(),
      };

      const result = service.generateSemanticJSON(mockState);

      expect(result).toBeDefined();
      expect(result.short_description).toBeDefined();
      expect(result.objects).toEqual([]);
      expect(result.background_setting).toBe('A serene outdoor setting');
      expect(result.lighting).toBeDefined();
      expect(result.aesthetics).toBeDefined();
      expect(result.photographic_characteristics).toBeDefined();
      expect(result.style_medium).toBe('photograph');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error when scene config is missing', () => {
      const invalidState: CombinedState = {
        sceneConfig: null as any,
        results: null,
        maskManipulation: new Map(),
      };

      expect(() => service.generateSemanticJSON(invalidState)).toThrow(
        'Scene configuration is missing from state'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log generation steps', () => {
      const mockState: CombinedState = {
        sceneConfig: {
          background_setting: 'Test background',
          photographic_characteristics: {
            camera_angle: 'eye-level',
            lens_focal_length: 'standard',
            depth_of_field: 50,
            focus: 75,
          },
          lighting: {
            conditions: 'natural',
            direction: { x: 50, y: 30, rotation: 0, tilt: 0 },
            shadows: 2,
          },
          aesthetics: {
            style_medium: 'photograph',
            aesthetic_style: 'realistic',
            composition: 'centered',
            color_scheme: 'vibrant',
            mood_atmosphere: 'neutral',
          },
        },
        results: null,
        maskManipulation: new Map(),
      };

      service.generateSemanticJSON(mockState);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[SemanticGeneration] Starting semantic JSON generation'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SemanticGeneration] Building semantic JSON components'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[SemanticGeneration] Semantic JSON generation complete'
      );
    });
  });

  describe('validate', () => {
    it('should validate valid semantic JSON', () => {
      const validJSON: SemanticJSON = {
        short_description: 'A test scene',
        objects: [],
        background_setting: 'Test background',
        lighting: {
          conditions: 'natural',
          direction: 'from above',
          shadows: 'soft shadows',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'vibrant',
          mood_atmosphere: 'neutral',
          preference_score: '8',
          aesthetic_score: '7',
        },
        photographic_characteristics: {
          depth_of_field: 'medium',
          focus: 'sharp focus',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const result = service.validate(validJSON);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[SemanticGeneration] Validation passed'
      );
    });

    it('should log validation errors', () => {
      const invalidJSON = {} as SemanticJSON;

      const result = service.validate(invalidJSON);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('saveToFile', () => {
    it('should return error for invalid JSON', async () => {
      const invalidJSON = {} as SemanticJSON;

      const result = await service.saveToFile(invalidJSON, 'test.json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Validation failed');
    });

    it('should log save operations', async () => {
      const validJSON: SemanticJSON = {
        short_description: 'A test scene',
        objects: [],
        background_setting: 'Test background',
        lighting: {
          conditions: 'natural',
          direction: 'from above',
          shadows: 'soft shadows',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'vibrant',
          mood_atmosphere: 'neutral',
          preference_score: '8',
          aesthetic_score: '7',
        },
        photographic_characteristics: {
          depth_of_field: 'medium',
          focus: 'sharp focus',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      await service.saveToFile(validJSON, 'test.json');

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[SemanticGeneration] Saving semantic JSON to file:',
        'test.json'
      );
    });
  });
});
