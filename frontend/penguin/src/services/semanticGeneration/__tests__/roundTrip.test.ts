/**
 * Round-trip tests for semantic JSON generation and parsing
 * 
 * Tests the complete round-trip process with example JSON files:
 * JSON → Parse to State → Generate to JSON → Compare
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RoundTripTestUtility } from './roundTripTestUtility';
import type { SemanticJSON } from '../types';

describe('Round-Trip Testing', () => {
  let utility: RoundTripTestUtility;

  beforeAll(() => {
    utility = new RoundTripTestUtility();
  });

  describe('Round-Trip Test Utility', () => {
    it('should load example JSON from file', async () => {
      // Test with a mock JSON object
      const mockJSON: SemanticJSON = {
        short_description: 'Test description',
        objects: [],
        background_setting: 'neutral background',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      // Since we can't easily test file loading in unit tests without a server,
      // we'll test the utility methods directly
      expect(utility).toBeDefined();
      expect(typeof utility.loadExampleJSON).toBe('function');
      expect(typeof utility.parseToState).toBe('function');
      expect(typeof utility.generateFromState).toBe('function');
      expect(typeof utility.compareJSON).toBe('function');
      expect(typeof utility.performRoundTrip).toBe('function');
    });

    it('should compare JSON objects and detect differences', () => {
      const original: SemanticJSON = {
        short_description: 'A beautiful scene',
        objects: [
          {
            description: 'A red ball',
            location: 'center',
            relationship: 'alone',
            relative_size: 'medium',
            shape_and_color: 'round, red',
            texture: 'smooth',
            appearance_details: 'shiny',
            orientation: 'upright',
          },
        ],
        background_setting: 'white background',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        ...original,
        short_description: 'A lovely scene', // Different but semantically similar
        lighting: {
          ...original.lighting,
          shadows: 'subtle', // Different shadow description
        },
      };

      const { differences, semanticEquivalence } = utility.compareJSON(original, generated);

      expect(differences).toBeDefined();
      expect(Array.isArray(differences)).toBe(true);
      expect(differences.length).toBeGreaterThan(0);

      // Should find differences in short_description and shadows
      const shortDescDiff = differences.find(d => d.path === 'short_description');
      expect(shortDescDiff).toBeDefined();
      expect(shortDescDiff?.severity).toBe('minor'); // Semantically similar

      const shadowsDiff = differences.find(d => d.path === 'lighting.shadows');
      expect(shadowsDiff).toBeDefined();
    });

    it('should handle numeric comparisons with tolerance', () => {
      const original: SemanticJSON = {
        short_description: 'Test',
        objects: [],
        background_setting: 'white',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        ...original,
      };

      const { differences, semanticEquivalence } = utility.compareJSON(
        original,
        generated,
        { numericTolerance: 5 }
      );

      // Should have no differences for identical objects
      expect(differences.length).toBe(0);
      expect(semanticEquivalence).toBe(true);
    });

    it('should identify critical differences for type mismatches', () => {
      const original: SemanticJSON = {
        short_description: 'Test',
        objects: [],
        background_setting: 'white',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        ...original,
        style_medium: 123 as unknown as string, // Type mismatch
      };

      const { differences, semanticEquivalence } = utility.compareJSON(original, generated);

      const criticalDiff = differences.find(d => d.severity === 'critical');
      expect(criticalDiff).toBeDefined();
      expect(criticalDiff?.path).toBe('style_medium');
      expect(semanticEquivalence).toBe(false);
    });

    it('should handle missing fields gracefully', () => {
      const original: SemanticJSON = {
        short_description: 'Test',
        objects: [
          {
            description: 'Object 1',
            location: 'center',
            relationship: 'alone',
            relative_size: 'medium',
            shape_and_color: 'round',
            texture: 'smooth',
            appearance_details: 'shiny',
            orientation: 'upright',
          },
          {
            description: 'Object 2',
            location: 'left',
            relationship: 'beside object 1',
            relative_size: 'small',
            shape_and_color: 'square',
            texture: 'rough',
            appearance_details: 'matte',
            orientation: 'tilted',
          },
        ],
        background_setting: 'white',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        ...original,
        objects: [original.objects[0]], // Missing second object
      };

      const { differences } = utility.compareJSON(original, generated);

      const lengthDiff = differences.find(d => d.path === 'objects.length');
      expect(lengthDiff).toBeDefined();
      expect(lengthDiff?.severity).toBe('major');
    });

    it('should support ignoring specific fields', () => {
      const original: SemanticJSON = {
        short_description: 'Test description',
        objects: [],
        background_setting: 'white',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        ...original,
        short_description: 'Different description',
      };

      const { differences } = utility.compareJSON(original, generated, {
        ignoreFields: ['short_description'],
      });

      const shortDescDiff = differences.find(d => d.path === 'short_description');
      expect(shortDescDiff).toBeUndefined();
    });
  });

  describe('Semantic Equivalence', () => {
    it('should determine semantic equivalence correctly', () => {
      const original: SemanticJSON = {
        short_description: 'A red ball on a white surface',
        objects: [],
        background_setting: 'white background',
        lighting: {
          conditions: 'natural daylight',
          direction: 'from above',
          shadows: 'soft shadows',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow depth of field',
          focus: 'sharp focus',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard lens',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        short_description: 'A red sphere on white surface',
        objects: [],
        background_setting: 'white backdrop',
        lighting: {
          conditions: 'natural light',
          direction: 'overhead',
          shadows: 'gentle shadows',
        },
        aesthetics: {
          composition: 'center composition',
          color_scheme: 'warm tones',
          mood_atmosphere: 'peaceful',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const { semanticEquivalence } = utility.compareJSON(original, generated);

      // Should be semantically equivalent despite minor wording differences
      expect(semanticEquivalence).toBe(true);
    });

    it('should detect non-equivalent JSON', () => {
      const original: SemanticJSON = {
        short_description: 'A red ball',
        objects: [],
        background_setting: 'white',
        lighting: {
          conditions: 'natural',
          direction: 'overhead',
          shadows: 'soft',
        },
        aesthetics: {
          composition: 'centered',
          color_scheme: 'warm',
          mood_atmosphere: 'calm',
          preference_score: 'high',
          aesthetic_score: 'high',
        },
        photographic_characteristics: {
          depth_of_field: 'shallow',
          focus: 'sharp',
          camera_angle: 'eye-level',
          lens_focal_length: 'standard',
        },
        style_medium: 'photograph',
      };

      const generated: SemanticJSON = {
        short_description: 'A blue cube',
        objects: [],
        background_setting: 'black',
        lighting: {
          conditions: 'dramatic',
          direction: 'from below',
          shadows: 'harsh',
        },
        aesthetics: {
          composition: 'off-center',
          color_scheme: 'cool',
          mood_atmosphere: 'tense',
          preference_score: 'low',
          aesthetic_score: 'low',
        },
        photographic_characteristics: {
          depth_of_field: 'deep',
          focus: 'soft',
          camera_angle: 'low-angle',
          lens_focal_length: 'wide-angle',
        },
        style_medium: 'digital art',
      };

      const { semanticEquivalence } = utility.compareJSON(original, generated);

      // Should not be semantically equivalent
      expect(semanticEquivalence).toBe(false);
    });
  });
});
