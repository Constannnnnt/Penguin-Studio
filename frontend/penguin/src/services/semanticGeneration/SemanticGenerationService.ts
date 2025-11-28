import type {
  CombinedState,
  SemanticJSON,
  ValidationResult,
  SaveResult,
} from './types';
import { validateSemanticJSON } from './validator';
import { build, buildObjects, buildLighting, buildAesthetics, buildPhotographicCharacteristics } from './jsonBuilder';
import { generateShortDescription } from './descriptionGenerators';
import { readCurrentState } from './stateReader';

/**
 * Main service class for semantic JSON generation
 * Orchestrates the conversion of frontend state to semantic JSON format
 */
export class SemanticGenerationService {
  private logger: Console;

  constructor(logger: Console = console) {
    this.logger = logger;
  }

  /**
   * Generate semantic JSON from current frontend state
   * @param state - Combined state from stores (optional, will read from stores if not provided)
   * @returns Semantic JSON object
   * @throws ValidationException if state is invalid
   */
  generateSemanticJSON(state?: CombinedState): SemanticJSON {
    this.logger.info('[SemanticGeneration] Starting semantic JSON generation');

    try {
      // Read state from stores if not provided
      const currentState = state || readCurrentState();

      // Validate input state
      if (!currentState.sceneConfig) {
        throw new Error('Scene configuration is missing from state');
      }

      this.logger.debug('[SemanticGeneration] Building semantic JSON components');

      // Build objects array from segmentation results
      const objects = currentState.results && currentState.results.masks.length > 0
        ? buildObjects(currentState.results.masks, currentState.maskManipulation)
        : [];

      // Build lighting description
      const lighting = buildLighting(currentState.sceneConfig.lighting);

      // Build aesthetics description
      const aesthetics = buildAesthetics(currentState.sceneConfig.aesthetics);

      // Build photographic characteristics
      const photographicCharacteristics = buildPhotographicCharacteristics(
        currentState.sceneConfig.photographic_characteristics
      );

      // Generate short description
      const shortDescription = generateShortDescription(currentState);

      // Build the complete semantic JSON using the JSON builder
      const semanticJSON = build({
        shortDescription,
        objects,
        backgroundSetting: currentState.sceneConfig.background_setting,
        lighting,
        aesthetics,
        photographicCharacteristics,
        styleMedium: currentState.sceneConfig.aesthetics.style_medium,
        artisticStyle: currentState.sceneConfig.aesthetics.aesthetic_style,
      });

      this.logger.info('[SemanticGeneration] Semantic JSON generation complete');

      return semanticJSON;
    } catch (error) {
      this.logger.error('[SemanticGeneration] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate semantic JSON against schema
   * @param json - JSON to validate
   * @returns Validation result with errors if any
   */
  validate(json: SemanticJSON): ValidationResult {
    this.logger.debug('[SemanticGeneration] Validating semantic JSON');

    try {
      const result = validateSemanticJSON(json);

      if (result.valid) {
        this.logger.info('[SemanticGeneration] Validation passed');
      } else {
        this.logger.warn('[SemanticGeneration] Validation failed:', result.errors);
      }

      return result;
    } catch (error) {
      this.logger.error('[SemanticGeneration] Validation error:', error);
      throw error;
    }
  }

  /**
   * Save semantic JSON to file
   * @param json - Semantic JSON object
   * @param filename - Output filename
   * @returns Promise resolving to save result
   */
  async saveToFile(json: SemanticJSON, filename: string): Promise<SaveResult> {
    this.logger.info('[SemanticGeneration] Saving semantic JSON to file:', filename);

    try {
      // Validate before saving
      const validationResult = this.validate(json);
      if (!validationResult.valid) {
        const errorMessage = `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`;
        this.logger.error('[SemanticGeneration] Cannot save invalid JSON:', errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Convert to JSON string with formatting
      const jsonString = JSON.stringify(json, null, 2);

      // Create a blob and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.logger.info('[SemanticGeneration] File saved successfully:', filename);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('[SemanticGeneration] Save failed:', error);

      return {
        success: false,
        error: `Failed to save file: ${errorMessage}`,
      };
    }
  }
}

// Export singleton instance
export const semanticGenerationService = new SemanticGenerationService();
