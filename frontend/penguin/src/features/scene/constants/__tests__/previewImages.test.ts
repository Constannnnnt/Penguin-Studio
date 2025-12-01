import { describe, it, expect } from 'vitest';
import {
  STYLE_MEDIUM_PREVIEWS,
  AESTHETIC_STYLE_PREVIEWS,
  COMPOSITION_PREVIEWS,
  MOOD_ATMOSPHERE_PREVIEWS,
} from '../previewImages';

describe('Preview Image Constants', () => {
  describe('STYLE_MEDIUM_PREVIEWS', () => {
    it('should define all required style medium options', () => {
      const expectedKeys = ['photograph', 'painting', 'digital-art', 'sketch', '3d-render'];
      const actualKeys = Object.keys(STYLE_MEDIUM_PREVIEWS);
      
      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys.length).toBe(expectedKeys.length);
    });

    it('should have valid path format for all entries', () => {
      Object.values(STYLE_MEDIUM_PREVIEWS).forEach(path => {
        expect(path).toMatch(/^\/previews\/style-medium\/.+\.(jpg|jpeg|webp|svg)$/);
      });
    });
  });

  describe('AESTHETIC_STYLE_PREVIEWS', () => {
    it('should define all required aesthetic style options', () => {
      const expectedKeys = ['realistic', 'artistic', 'stylized', 'abstract', 'minimalist'];
      const actualKeys = Object.keys(AESTHETIC_STYLE_PREVIEWS);
      
      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys.length).toBe(expectedKeys.length);
    });

    it('should have valid path format for all entries', () => {
      Object.values(AESTHETIC_STYLE_PREVIEWS).forEach(path => {
        expect(path).toMatch(/^\/previews\/aesthetic-style\/.+\.(jpg|jpeg|webp|svg)$/);
      });
    });
  });

  describe('COMPOSITION_PREVIEWS', () => {
    it('should define all required composition options', () => {
      const expectedKeys = ['centered', 'rule-of-thirds', 'diagonal', 'symmetrical', 'asymmetrical'];
      const actualKeys = Object.keys(COMPOSITION_PREVIEWS);
      
      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys.length).toBe(expectedKeys.length);
    });

    it('should have valid path format for all entries', () => {
      Object.values(COMPOSITION_PREVIEWS).forEach(path => {
        expect(path).toMatch(/^\/previews\/composition\/.+\.(jpg|jpeg|webp|svg)$/);
      });
    });
  });

  describe('MOOD_ATMOSPHERE_PREVIEWS', () => {
    it('should define all required mood options', () => {
      const expectedKeys = ['neutral', 'cheerful', 'dramatic', 'serene', 'mysterious'];
      const actualKeys = Object.keys(MOOD_ATMOSPHERE_PREVIEWS);
      
      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys.length).toBe(expectedKeys.length);
    });

    it('should have valid path format for all entries', () => {
      Object.values(MOOD_ATMOSPHERE_PREVIEWS).forEach(path => {
        expect(path).toMatch(/^\/previews\/mood\/.+\.(jpg|jpeg|webp|svg)$/);
      });
    });
  });

  describe('Path consistency', () => {
    it('should use consistent directory structure', () => {
      const allPaths = [
        ...Object.values(STYLE_MEDIUM_PREVIEWS),
        ...Object.values(AESTHETIC_STYLE_PREVIEWS),
        ...Object.values(COMPOSITION_PREVIEWS),
        ...Object.values(MOOD_ATMOSPHERE_PREVIEWS),
      ];

      allPaths.forEach(path => {
        expect(path).toMatch(/^\/previews\//);
      });
    });
  });
});
