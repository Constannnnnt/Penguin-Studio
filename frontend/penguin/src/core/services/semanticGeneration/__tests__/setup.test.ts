import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SemanticGenerationError,
  ValidationError,
  MissingFieldError,
  ConversionError,
} from '../types';
import {
  PBT_CONFIG,
  arbCameraAngle,
  arbLensType,
  arbDepthOfField,
  arbFocusValue,
  arbLightingCondition,
  arbLightingDirection,
  arbShadowIntensity,
  arbStyleMedium,
  arbAestheticStyle,
} from '../test-utils';

describe('Semantic Generation Service Setup', () => {
  describe('Error Classes', () => {
    it('should create SemanticGenerationError with code and details', () => {
      const error = new SemanticGenerationError(
        'Test error',
        'TEST_ERROR',
        { field: 'test' }
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('SemanticGenerationError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'test' });
    });

    it('should create ValidationError with field information', () => {
      const error = new ValidationError('testField', 'string', 123);
      
      expect(error).toBeInstanceOf(SemanticGenerationError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('testField');
      expect(error.expectedType).toBe('string');
      expect(error.actualValue).toBe(123);
    });

    it('should create MissingFieldError with default provision info', () => {
      const error = new MissingFieldError('requiredField', true);
      
      expect(error).toBeInstanceOf(SemanticGenerationError);
      expect(error.name).toBe('MissingFieldError');
      expect(error.code).toBe('MISSING_FIELD');
      expect(error.field).toBe('requiredField');
      expect(error.canProvideDefault).toBe(true);
    });

    it('should create ConversionError with conversion details', () => {
      const error = new ConversionError('angle', 'invalid', 'Unknown value');
      
      expect(error).toBeInstanceOf(SemanticGenerationError);
      expect(error.name).toBe('ConversionError');
      expect(error.code).toBe('CONVERSION_ERROR');
      expect(error.field).toBe('angle');
      expect(error.value).toBe('invalid');
      expect(error.reason).toBe('Unknown value');
    });
  });

  describe('Fast-check Configuration', () => {
    it('should have correct PBT configuration', () => {
      expect(PBT_CONFIG.numRuns).toBe(100);
      expect(PBT_CONFIG.verbose).toBe(false);
    });
  });

  describe('Fast-check Arbitraries', () => {
    it('should generate valid camera angles', () => {
      fc.assert(
        fc.property(arbCameraAngle(), (angle) => {
          expect(typeof angle).toBe('string');
          expect(angle.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid lens types', () => {
      fc.assert(
        fc.property(arbLensType(), (lens) => {
          expect(typeof lens).toBe('string');
          expect(lens.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid depth of field values (0-100)', () => {
      fc.assert(
        fc.property(arbDepthOfField(), (value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid focus values (0-100)', () => {
      fc.assert(
        fc.property(arbFocusValue(), (value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid lighting conditions', () => {
      fc.assert(
        fc.property(arbLightingCondition(), (condition) => {
          expect(typeof condition).toBe('string');
          expect(condition.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid lighting direction (6DOF)', () => {
      fc.assert(
        fc.property(arbLightingDirection(), (direction) => {
          expect(direction.x).toBeGreaterThanOrEqual(0);
          expect(direction.x).toBeLessThanOrEqual(100);
          expect(direction.y).toBeGreaterThanOrEqual(0);
          expect(direction.y).toBeLessThanOrEqual(100);
          expect(direction.rotation).toBeGreaterThanOrEqual(0);
          expect(direction.rotation).toBeLessThanOrEqual(360);
          expect(direction.tilt).toBeGreaterThanOrEqual(-90);
          expect(direction.tilt).toBeLessThanOrEqual(90);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid shadow intensity (0-5)', () => {
      fc.assert(
        fc.property(arbShadowIntensity(), (intensity) => {
          expect(intensity).toBeGreaterThanOrEqual(0);
          expect(intensity).toBeLessThanOrEqual(5);
          expect(Number.isInteger(intensity)).toBe(true);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid style medium', () => {
      fc.assert(
        fc.property(arbStyleMedium(), (medium) => {
          expect(typeof medium).toBe('string');
          expect(medium.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid aesthetic style', () => {
      fc.assert(
        fc.property(arbAestheticStyle(), (style) => {
          expect(typeof style).toBe('string');
          expect(style.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 10 }
      );
    });
  });
});
