import { describe, it, expect } from 'vitest';
import {
  convertCameraAngle,
  convertLensFocalLength,
  convertDepthOfField,
  convertFocus,
  convertLightingConditions,
  convertShadowIntensity,
  convertLightingDirection,
  convertStyleMedium,
  convertAestheticStyle,
} from '../valueConverters';

describe('Value Converters', () => {
  describe('convertCameraAngle', () => {
    it('should convert predefined camera angles', () => {
      expect(convertCameraAngle('eye-level')).toBe('eye-level');
      expect(convertCameraAngle('overhead')).toBe('overhead view');
      expect(convertCameraAngle('low-angle')).toBe('low-angle shot');
      expect(convertCameraAngle('high-angle')).toBe('high-angle view');
    });

    it('should pass through custom camera angles', () => {
      expect(convertCameraAngle('bird\'s eye view')).toBe('bird\'s eye view');
      expect(convertCameraAngle('dutch angle')).toBe('dutch angle');
    });
  });

  describe('convertLensFocalLength', () => {
    it('should convert predefined lens types', () => {
      expect(convertLensFocalLength('wide-angle')).toBe('wide-angle lens');
      expect(convertLensFocalLength('standard')).toBe('standard lens (e.g., 50mm)');
      expect(convertLensFocalLength('portrait')).toBe('portrait lens (e.g., 85mm-100mm)');
      expect(convertLensFocalLength('macro')).toBe('macro lens');
    });

    it('should pass through custom lens types', () => {
      expect(convertLensFocalLength('telephoto 200mm')).toBe('telephoto 200mm');
      expect(convertLensFocalLength('fisheye')).toBe('fisheye');
    });
  });

  describe('convertDepthOfField', () => {
    it('should map 0-20 to very shallow', () => {
      expect(convertDepthOfField(0)).toBe('very shallow depth of field');
      expect(convertDepthOfField(10)).toBe('very shallow depth of field');
      expect(convertDepthOfField(20)).toBe('very shallow depth of field');
    });

    it('should map 21-40 to shallow', () => {
      expect(convertDepthOfField(21)).toBe('shallow depth of field');
      expect(convertDepthOfField(30)).toBe('shallow depth of field');
      expect(convertDepthOfField(40)).toBe('shallow depth of field');
    });

    it('should map 41-60 to medium', () => {
      expect(convertDepthOfField(41)).toBe('medium depth of field');
      expect(convertDepthOfField(50)).toBe('medium depth of field');
      expect(convertDepthOfField(60)).toBe('medium depth of field');
    });

    it('should map 61-80 to deep', () => {
      expect(convertDepthOfField(61)).toBe('deep depth of field');
      expect(convertDepthOfField(70)).toBe('deep depth of field');
      expect(convertDepthOfField(80)).toBe('deep depth of field');
    });

    it('should map 81-100 to very deep', () => {
      expect(convertDepthOfField(81)).toBe('very deep depth of field');
      expect(convertDepthOfField(90)).toBe('very deep depth of field');
      expect(convertDepthOfField(100)).toBe('very deep depth of field');
    });
  });

  describe('convertFocus', () => {
    it('should map 0-20 to soft focus', () => {
      expect(convertFocus(0)).toBe('soft focus');
      expect(convertFocus(10)).toBe('soft focus');
      expect(convertFocus(20)).toBe('soft focus');
    });

    it('should map 21-40 to slight soft focus', () => {
      expect(convertFocus(21)).toBe('slight soft focus');
      expect(convertFocus(30)).toBe('slight soft focus');
      expect(convertFocus(40)).toBe('slight soft focus');
    });

    it('should map 41-60 to sharp focus', () => {
      expect(convertFocus(41)).toBe('sharp focus');
      expect(convertFocus(50)).toBe('sharp focus');
      expect(convertFocus(60)).toBe('sharp focus');
    });

    it('should map 61-80 to very sharp focus', () => {
      expect(convertFocus(61)).toBe('very sharp focus');
      expect(convertFocus(70)).toBe('very sharp focus');
      expect(convertFocus(80)).toBe('very sharp focus');
    });

    it('should map 81-100 to hyper sharp focus', () => {
      expect(convertFocus(81)).toBe('hyper sharp focus');
      expect(convertFocus(90)).toBe('hyper sharp focus');
      expect(convertFocus(100)).toBe('hyper sharp focus');
    });
  });

  describe('convertLightingConditions', () => {
    it('should convert predefined lighting conditions', () => {
      expect(convertLightingConditions('natural')).toBe('natural lighting');
      expect(convertLightingConditions('studio')).toBe('studio lighting');
      expect(convertLightingConditions('soft diffused')).toBe('soft diffused studio lighting');
      expect(convertLightingConditions('dramatic')).toBe('dramatic lighting');
      expect(convertLightingConditions('golden hour')).toBe('golden hour lighting');
    });

    it('should pass through custom lighting conditions', () => {
      expect(convertLightingConditions('neon lighting')).toBe('neon lighting');
      expect(convertLightingConditions('candlelight')).toBe('candlelight');
    });
  });

  describe('convertShadowIntensity', () => {
    it('should convert shadow intensity values', () => {
      expect(convertShadowIntensity(0)).toBe('no shadows');
      expect(convertShadowIntensity(1)).toBe('subtle shadows');
      expect(convertShadowIntensity(2)).toBe('soft shadows');
      expect(convertShadowIntensity(3)).toBe('moderate shadows');
      expect(convertShadowIntensity(4)).toBe('strong shadows');
      expect(convertShadowIntensity(5)).toBe('dramatic shadows');
    });
  });

  describe('convertLightingDirection', () => {
    it('should describe left horizontal position', () => {
      const result = convertLightingDirection({ x: 10, y: 50, rotation: 0, tilt: 0 });
      expect(result).toContain('from the left');
    });

    it('should describe right horizontal position', () => {
      const result = convertLightingDirection({ x: 80, y: 50, rotation: 0, tilt: 0 });
      expect(result).toContain('from the right');
    });

    it('should describe centered horizontal position', () => {
      const result = convertLightingDirection({ x: 50, y: 50, rotation: 0, tilt: 0 });
      expect(result).toContain('centered');
    });

    it('should describe above vertical position', () => {
      const result = convertLightingDirection({ x: 50, y: 10, rotation: 0, tilt: 0 });
      expect(result).toContain('from above');
    });

    it('should describe below vertical position', () => {
      const result = convertLightingDirection({ x: 50, y: 80, rotation: 0, tilt: 0 });
      expect(result).toContain('from below');
    });

    it('should describe eye-level vertical position', () => {
      const result = convertLightingDirection({ x: 50, y: 50, rotation: 0, tilt: 0 });
      expect(result).toContain('at eye-level');
    });

    it('should include tilt when significant', () => {
      const resultDown = convertLightingDirection({ x: 50, y: 50, rotation: 0, tilt: -45 });
      expect(resultDown).toContain('angled downward');

      const resultUp = convertLightingDirection({ x: 50, y: 50, rotation: 0, tilt: 45 });
      expect(resultUp).toContain('angled upward');
    });

    it('should include rotation when significant', () => {
      const result = convertLightingDirection({ x: 50, y: 50, rotation: 90, tilt: 0 });
      expect(result).toContain('from the side');
    });

    it('should combine all components', () => {
      const result = convertLightingDirection({ x: 20, y: 20, rotation: 90, tilt: 40 });
      expect(result).toContain('from above');
      expect(result).toContain('from the left');
      expect(result).toContain('angled upward');
      expect(result).toContain('from the side');
    });
  });

  describe('convertStyleMedium', () => {
    it('should convert predefined style mediums', () => {
      expect(convertStyleMedium('photograph')).toBe('photograph');
      expect(convertStyleMedium('painting')).toBe('painting');
      expect(convertStyleMedium('digital art')).toBe('digital art');
      expect(convertStyleMedium('sketch')).toBe('sketch');
      expect(convertStyleMedium('3D render')).toBe('3D render');
    });

    it('should pass through custom style mediums', () => {
      expect(convertStyleMedium('watercolor')).toBe('watercolor');
      expect(convertStyleMedium('oil painting')).toBe('oil painting');
    });
  });

  describe('convertAestheticStyle', () => {
    it('should convert predefined aesthetic styles', () => {
      expect(convertAestheticStyle('realistic')).toBe('realistic');
      expect(convertAestheticStyle('artistic')).toBe('artistic');
      expect(convertAestheticStyle('vintage')).toBe('vintage');
      expect(convertAestheticStyle('modern')).toBe('modern');
      expect(convertAestheticStyle('dramatic')).toBe('dramatic');
    });

    it('should pass through custom aesthetic styles', () => {
      expect(convertAestheticStyle('cyberpunk')).toBe('cyberpunk');
      expect(convertAestheticStyle('steampunk')).toBe('steampunk');
    });
  });
});
