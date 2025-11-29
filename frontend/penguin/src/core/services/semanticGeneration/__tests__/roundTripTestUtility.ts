/**
 * Round-trip test utility for semantic JSON generation and parsing
 * 
 * This utility tests the complete round-trip process:
 * 1. Load example JSON
 * 2. Parse to state using semantic parsing service
 * 3. Generate back to JSON using semantic generation service
 * 4. Compare original and generated JSON
 */

import type { SemanticJSON, CombinedState } from '../types';
import type { SemanticParsingResponse } from '@/core/types';
import { SemanticGenerationService } from '../SemanticGenerationService';
import { apiClient } from '@/core/services/api';

// ============================================================================
// Types
// ============================================================================

export interface RoundTripResult {
  success: boolean;
  originalJSON: SemanticJSON;
  generatedJSON: SemanticJSON;
  differences: Difference[];
  semanticEquivalence: boolean;
  errors: string[];
}

export interface Difference {
  path: string;
  original: unknown;
  generated: unknown;
  severity: 'minor' | 'major' | 'critical';
  description: string;
}

export interface ComparisonOptions {
  numericTolerance?: number;
  ignoreFields?: string[];
  strictComparison?: boolean;
}

// ============================================================================
// Round-Trip Test Utility
// ============================================================================

export class RoundTripTestUtility {
  private service: SemanticGenerationService;
  private logger: Console;

  constructor(logger: Console = console) {
    this.service = new SemanticGenerationService(logger);
    this.logger = logger;
  }

  /**
   * Load example JSON from file path or URL
   */
  async loadExampleJSON(pathOrUrl: string): Promise<SemanticJSON> {
    try {
      this.logger.info(`[RoundTrip] Loading example JSON from: ${pathOrUrl}`);

      const response = await fetch(pathOrUrl);
      if (!response.ok) {
        throw new Error(`Failed to load JSON: ${response.statusText}`);
      }

      const json = await response.json();
      this.logger.info('[RoundTrip] Successfully loaded example JSON');

      return json as SemanticJSON;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[RoundTrip] Failed to load example JSON:', error);
      throw new Error(`Failed to load example JSON: ${errorMessage}`);
    }
  }

  /**
   * Parse semantic JSON to state using the backend semantic parsing service
   */
  async parseToState(semanticJSON: SemanticJSON): Promise<CombinedState> {
    try {
      this.logger.info('[RoundTrip] Parsing semantic JSON to state');

      // Call the backend semantic parsing service
      const parsedConfig: SemanticParsingResponse = await apiClient.parseSceneMetadata(
        semanticJSON as unknown as Record<string, unknown>
      );

      this.logger.debug('[RoundTrip] Parsed configuration:', parsedConfig);

      // Convert parsed configuration to CombinedState format
      const state: CombinedState = {
        sceneConfig: {
          background_setting: parsedConfig.background_setting,
          photographic_characteristics: {
            camera_angle: parsedConfig.photographic_characteristics.camera_angle.value,
            lens_focal_length: parsedConfig.photographic_characteristics.lens_focal_length.value,
            depth_of_field: parsedConfig.photographic_characteristics.depth_of_field.value,
            focus: parsedConfig.photographic_characteristics.focus.value,
          },
          lighting: {
            conditions: parsedConfig.lighting.conditions.value,
            direction: parsedConfig.lighting.direction.value,
            shadows: parsedConfig.lighting.shadows.value,
          },
          aesthetics: {
            style_medium: parsedConfig.aesthetics.style_medium.value,
            aesthetic_style: parsedConfig.aesthetics.aesthetic_style.value,
            composition: '',
            color_scheme: '',
            mood_atmosphere: '',
            preference_score: 0,
            aesthetic_score: 0,
          },
        },
        results: {
          masks: semanticJSON.objects.map((obj, index) => ({
            mask_id: `mask_${index}`,
            label: obj.description.split(' ').slice(0, 3).join(' '),
            confidence: 0.95,
            bounding_box: { x: 0, y: 0, width: 100, height: 100 },
            area_pixels: 10000,
            area_percentage: 10,
            centroid: [50, 50] as [number, number],
            mask_url: '',
            objectMetadata: {
              description: obj.description,
              location: obj.location,
              relationship: obj.relationship,
              relative_size: obj.relative_size,
              shape_and_color: obj.shape_and_color,
              texture: obj.texture,
              appearance_details: obj.appearance_details,
              orientation: obj.orientation,
            },
          })),
        },
        maskManipulation: new Map(),
      };

      this.logger.info('[RoundTrip] Successfully parsed to state');
      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[RoundTrip] Failed to parse to state:', error);
      throw new Error(`Failed to parse to state: ${errorMessage}`);
    }
  }

  /**
   * Generate semantic JSON from state using the semantic generation service
   */
  generateFromState(state: CombinedState): SemanticJSON {
    try {
      this.logger.info('[RoundTrip] Generating semantic JSON from state');

      const generatedJSON = this.service.generateSemanticJSON(state);

      this.logger.info('[RoundTrip] Successfully generated semantic JSON');
      return generatedJSON;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[RoundTrip] Failed to generate from state:', error);
      throw new Error(`Failed to generate from state: ${errorMessage}`);
    }
  }

  /**
   * Compare original and generated JSON
   */
  compareJSON(
    original: SemanticJSON,
    generated: SemanticJSON,
    options: ComparisonOptions = {}
  ): { differences: Difference[]; semanticEquivalence: boolean } {
    this.logger.info('[RoundTrip] Comparing original and generated JSON');

    const differences: Difference[] = [];
    const {
      numericTolerance = 10,
      ignoreFields = [],
      strictComparison = false,
    } = options;

    // Helper function to check if a field should be ignored
    const shouldIgnore = (path: string): boolean => {
      return ignoreFields.some(field => path.includes(field));
    };

    // Helper function to compare values with tolerance
    const compareValues = (
      path: string,
      origVal: unknown,
      genVal: unknown
    ): Difference | null => {
      if (shouldIgnore(path)) {
        return null;
      }

      // Handle numeric comparisons with tolerance
      if (typeof origVal === 'number' && typeof genVal === 'number') {
        const diff = Math.abs(origVal - genVal);
        if (diff > numericTolerance) {
          return {
            path,
            original: origVal,
            generated: genVal,
            severity: diff > numericTolerance * 2 ? 'major' : 'minor',
            description: `Numeric value differs by ${diff} (tolerance: ${numericTolerance})`,
          };
        }
        return null;
      }

      // Handle string comparisons
      if (typeof origVal === 'string' && typeof genVal === 'string') {
        const origNorm = origVal.trim().toLowerCase();
        const genNorm = genVal.trim().toLowerCase();

        if (origNorm === genNorm) {
          return null;
        }

        // Check for semantic similarity (contains key words)
        const origWords = new Set(origNorm.split(/\s+/).filter(w => w.length > 2));
        const genWords = new Set(genNorm.split(/\s+/).filter(w => w.length > 2));
        const commonWords = [...origWords].filter(w => genWords.has(w));
        const similarity = commonWords.length / Math.max(origWords.size, genWords.size, 1);

        if (!strictComparison && similarity > 0.5) {
          return {
            path,
            original: origVal,
            generated: genVal,
            severity: 'minor',
            description: `String differs but semantically similar (${(similarity * 100).toFixed(0)}% match)`,
          };
        }

        // If similarity is very low, it's a major difference
        const severity = similarity < 0.2 ? 'major' : 'minor';

        return {
          path,
          original: origVal,
          generated: genVal,
          severity: strictComparison ? 'major' : severity,
          description: `String value differs (${(similarity * 100).toFixed(0)}% similarity)`,
        };
      }

      // Handle type mismatches
      if (typeof origVal !== typeof genVal) {
        return {
          path,
          original: origVal,
          generated: genVal,
          severity: 'critical',
          description: `Type mismatch: ${typeof origVal} vs ${typeof genVal}`,
        };
      }

      // Handle other value differences
      if (origVal !== genVal) {
        return {
          path,
          original: origVal,
          generated: genVal,
          severity: 'minor',
          description: 'Value differs',
        };
      }

      return null;
    };

    // Compare top-level fields
    const diff1 = compareValues('short_description', original.short_description, generated.short_description);
    if (diff1) differences.push(diff1);

    const diff2 = compareValues('background_setting', original.background_setting, generated.background_setting);
    if (diff2) differences.push(diff2);

    const diff3 = compareValues('style_medium', original.style_medium, generated.style_medium);
    if (diff3) differences.push(diff3);

    // Compare lighting
    if (original.lighting && generated.lighting) {
      const diff4 = compareValues('lighting.conditions', original.lighting.conditions, generated.lighting.conditions);
      if (diff4) differences.push(diff4);

      const diff5 = compareValues('lighting.direction', original.lighting.direction, generated.lighting.direction);
      if (diff5) differences.push(diff5);

      const diff6 = compareValues('lighting.shadows', original.lighting.shadows, generated.lighting.shadows);
      if (diff6) differences.push(diff6);
    }

    // Compare photographic characteristics
    if (original.photographic_characteristics && generated.photographic_characteristics) {
      const diff7 = compareValues(
        'photographic_characteristics.camera_angle',
        original.photographic_characteristics.camera_angle,
        generated.photographic_characteristics.camera_angle
      );
      if (diff7) differences.push(diff7);

      const diff8 = compareValues(
        'photographic_characteristics.lens_focal_length',
        original.photographic_characteristics.lens_focal_length,
        generated.photographic_characteristics.lens_focal_length
      );
      if (diff8) differences.push(diff8);

      const diff9 = compareValues(
        'photographic_characteristics.depth_of_field',
        original.photographic_characteristics.depth_of_field,
        generated.photographic_characteristics.depth_of_field
      );
      if (diff9) differences.push(diff9);

      const diff10 = compareValues(
        'photographic_characteristics.focus',
        original.photographic_characteristics.focus,
        generated.photographic_characteristics.focus
      );
      if (diff10) differences.push(diff10);
    }

    // Compare objects
    if (original.objects && generated.objects) {
      const minLength = Math.min(original.objects.length, generated.objects.length);
      for (let i = 0; i < minLength; i++) {
        const origObj = original.objects[i];
        const genObj = generated.objects[i];

        const diff11 = compareValues(`objects[${i}].description`, origObj.description, genObj.description);
        if (diff11) differences.push(diff11);

        const diff12 = compareValues(`objects[${i}].location`, origObj.location, genObj.location);
        if (diff12) differences.push(diff12);

        const diff13 = compareValues(`objects[${i}].relative_size`, origObj.relative_size, genObj.relative_size);
        if (diff13) differences.push(diff13);
      }

      if (original.objects.length !== generated.objects.length) {
        differences.push({
          path: 'objects.length',
          original: original.objects.length,
          generated: generated.objects.length,
          severity: 'major',
          description: 'Number of objects differs',
        });
      }
    }

    // Determine semantic equivalence
    // Semantic equivalence means no critical differences and very few major differences
    const criticalDiffs = differences.filter(d => d.severity === 'critical');
    const majorDiffs = differences.filter(d => d.severity === 'major');
    const minorDiffs = differences.filter(d => d.severity === 'minor');
    
    // Allow no critical diffs, max 2 major diffs, and max 10 minor diffs for equivalence
    const semanticEquivalence = 
      criticalDiffs.length === 0 && 
      majorDiffs.length <= 2 && 
      minorDiffs.length <= 10;

    this.logger.info(`[RoundTrip] Comparison complete: ${differences.length} differences found`);
    this.logger.info(`[RoundTrip] Semantic equivalence: ${semanticEquivalence}`);

    return { differences, semanticEquivalence };
  }

  /**
   * Perform complete round-trip test
   */
  async performRoundTrip(
    pathOrUrl: string,
    options: ComparisonOptions = {}
  ): Promise<RoundTripResult> {
    const errors: string[] = [];

    try {
      this.logger.info('[RoundTrip] Starting round-trip test');

      // Step 1: Load example JSON
      const originalJSON = await this.loadExampleJSON(pathOrUrl);

      // Step 2: Parse to state
      const state = await this.parseToState(originalJSON);

      // Step 3: Generate back to JSON
      const generatedJSON = this.generateFromState(state);

      // Step 4: Compare
      const { differences, semanticEquivalence } = this.compareJSON(
        originalJSON,
        generatedJSON,
        options
      );

      this.logger.info('[RoundTrip] Round-trip test complete');

      return {
        success: true,
        originalJSON,
        generatedJSON,
        differences,
        semanticEquivalence,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      this.logger.error('[RoundTrip] Round-trip test failed:', error);

      return {
        success: false,
        originalJSON: {} as SemanticJSON,
        generatedJSON: {} as SemanticJSON,
        differences: [],
        semanticEquivalence: false,
        errors,
      };
    }
  }
}

// Export singleton instance
export const roundTripTestUtility = new RoundTripTestUtility();
