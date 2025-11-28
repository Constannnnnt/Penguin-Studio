import type {
  CameraAngle,
  LensType,
  DepthOfFieldValue,
  FocusValue,
  LightingCondition,
  LightingDirectionValue,
  ShadowIntensity,
  StyleMedium,
  AestheticStyle,
  PhotographicConfig,
  LightingConfig,
  AestheticsConfig,
} from '@/types';
import type {
  MaskMetadata,
  MaskManipulationState,
} from '@/store/segmentationStore';
import type {
  CombinedState,
  SemanticJSON,
  ValidationResult,
  SaveResult,
  ObjectDescription,
  LightingDescription,
  AestheticsDescription,
  PhotographicDescription,
  JSONComponents,
} from './types';

// ============================================================================
// Main Service Interface
// ============================================================================

export interface SemanticGenerationService {
  /**
   * Generate semantic JSON from current frontend state
   * @param state - Combined state from stores
   * @returns Semantic JSON object
   * @throws ValidationException if state is invalid
   */
  generateSemanticJSON(state: CombinedState): SemanticJSON;

  /**
   * Save semantic JSON to file
   * @param json - Semantic JSON object
   * @param filename - Output filename
   * @returns Promise resolving to save result
   */
  saveToFile(json: SemanticJSON, filename: string): Promise<SaveResult>;

  /**
   * Validate semantic JSON against schema
   * @param json - JSON to validate
   * @returns Validation result with errors if any
   */
  validate(json: SemanticJSON): ValidationResult;
}

// ============================================================================
// Value Converters Interface
// ============================================================================

export interface ValueConverters {
  /**
   * Convert camera angle to descriptive text
   */
  convertCameraAngle(angle: CameraAngle | string): string;

  /**
   * Convert lens focal length to descriptive text
   */
  convertLensFocalLength(lens: LensType | string): string;

  /**
   * Convert depth of field (0-100) to descriptive text
   */
  convertDepthOfField(value: DepthOfFieldValue): string;

  /**
   * Convert focus value (0-100) to descriptive text
   */
  convertFocus(value: FocusValue): string;

  /**
   * Convert lighting conditions to descriptive text
   */
  convertLightingConditions(conditions: LightingCondition | string): string;

  /**
   * Convert 6DOF lighting direction to natural language
   */
  convertLightingDirection(direction: LightingDirectionValue): string;

  /**
   * Convert shadow intensity (0-5) to descriptive text
   */
  convertShadowIntensity(intensity: ShadowIntensity): string;

  /**
   * Convert style medium to descriptive text
   */
  convertStyleMedium(medium: StyleMedium | string): string;

  /**
   * Convert aesthetic style to descriptive text
   */
  convertAestheticStyle(style: AestheticStyle | string): string;
}

// ============================================================================
// Description Generators Interface
// ============================================================================

export interface DescriptionGenerators {
  /**
   * Generate short description for entire scene
   */
  generateShortDescription(state: CombinedState): string;

  /**
   * Generate object description from metadata
   */
  generateObjectDescription(
    metadata: MaskMetadata,
    manipulation: MaskManipulationState
  ): ObjectDescription;

  /**
   * Generate background setting description
   */
  generateBackgroundDescription(background: string): string;

  /**
   * Generate lighting description
   */
  generateLightingDescription(lighting: LightingConfig): LightingDescription;

  /**
   * Generate aesthetics description
   */
  generateAestheticsDescription(aesthetics: AestheticsConfig): AestheticsDescription;

  /**
   * Generate photographic characteristics description
   */
  generatePhotographicDescription(
    photo: PhotographicConfig
  ): PhotographicDescription;
}

// ============================================================================
// JSON Builder Interface
// ============================================================================

export interface JSONBuilder {
  /**
   * Build complete semantic JSON from components
   */
  build(components: JSONComponents): SemanticJSON;

  /**
   * Build objects array from segmentation results
   */
  buildObjects(
    masks: MaskMetadata[],
    manipulations: Map<string, MaskManipulationState>
  ): ObjectDescription[];

  /**
   * Build lighting object
   */
  buildLighting(lighting: LightingConfig): LightingDescription;

  /**
   * Build aesthetics object
   */
  buildAesthetics(aesthetics: AestheticsConfig): AestheticsDescription;

  /**
   * Build photographic characteristics object
   */
  buildPhotographicCharacteristics(
    photo: PhotographicConfig
  ): PhotographicDescription;
}
