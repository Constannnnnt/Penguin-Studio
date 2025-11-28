import * as fc from 'fast-check';
import type {
  CameraAngle,
  LensType,
  LightingCondition,
  StyleMedium,
  AestheticStyle,
  LightingDirectionValue,
  ShadowIntensity,
} from '@/types';

/**
 * Fast-check configuration for property-based tests
 * All property tests should run a minimum of 100 iterations
 */
export const PBT_CONFIG = {
  numRuns: 100,
  verbose: false,
};

/**
 * Arbitrary generators for semantic generation testing
 */

// Camera angle arbitrary (predefined + custom)
export const arbCameraAngle = (): fc.Arbitrary<CameraAngle | string> =>
  fc.oneof(
    fc.constantFrom('eye-level', 'overhead', 'low-angle', 'high-angle'),
    fc.string({ minLength: 1, maxLength: 50 })
  );

// Lens type arbitrary (predefined + custom)
export const arbLensType = (): fc.Arbitrary<LensType | string> =>
  fc.oneof(
    fc.constantFrom('wide-angle', 'standard', 'portrait', 'macro'),
    fc.string({ minLength: 1, maxLength: 50 })
  );

// Depth of field arbitrary (0-100)
export const arbDepthOfField = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 100 });

// Focus value arbitrary (0-100)
export const arbFocusValue = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 100 });

// Lighting condition arbitrary (predefined + custom)
export const arbLightingCondition = (): fc.Arbitrary<LightingCondition | string> =>
  fc.oneof(
    fc.constantFrom('natural', 'studio', 'soft diffused', 'dramatic', 'golden hour'),
    fc.string({ minLength: 1, maxLength: 50 })
  );

// Lighting direction arbitrary (6DOF)
export const arbLightingDirection = (): fc.Arbitrary<LightingDirectionValue> =>
  fc.record({
    x: fc.integer({ min: 0, max: 100 }),
    y: fc.integer({ min: 0, max: 100 }),
    rotation: fc.integer({ min: 0, max: 360 }),
    tilt: fc.integer({ min: -90, max: 90 }),
  });

// Shadow intensity arbitrary (0-5)
export const arbShadowIntensity = (): fc.Arbitrary<ShadowIntensity> =>
  fc.constantFrom(0, 1, 2, 3, 4, 5) as fc.Arbitrary<ShadowIntensity>;

// Style medium arbitrary (predefined + custom)
export const arbStyleMedium = (): fc.Arbitrary<StyleMedium | string> =>
  fc.oneof(
    fc.constantFrom('photograph', 'painting', 'digital art', 'sketch', '3D render'),
    fc.string({ minLength: 1, maxLength: 50 })
  );

// Aesthetic style arbitrary (predefined + custom)
export const arbAestheticStyle = (): fc.Arbitrary<AestheticStyle | string> =>
  fc.oneof(
    fc.constantFrom('realistic', 'artistic', 'vintage', 'modern', 'dramatic'),
    fc.string({ minLength: 1, maxLength: 50 })
  );
