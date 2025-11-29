// Export all types
export type {
  SemanticJSON,
  ObjectDescription,
  LightingDescription,
  AestheticsDescription,
  PhotographicDescription,
  TextRender,
  CombinedState,
  ValidationResult,
  SaveResult,
  JSONComponents,
} from './types';

// Export error classes
export {
  SemanticGenerationError,
  ValidationError,
  MissingFieldError,
  ConversionError,
} from './types';

// Export interfaces
export type {
  ValueConverters,
  DescriptionGenerators,
  JSONBuilder,
} from './interfaces';

// Export value converter functions
export {
  convertCameraAngle,
  convertLensFocalLength,
  convertDepthOfField,
  convertFocus,
  convertLightingConditions,
  convertShadowIntensity,
  convertLightingDirection,
  convertStyleMedium,
  convertAestheticStyle,
} from './valueConverters';

// Export description generator functions
export {
  updateLocationMetadata,
  updateRelativeSizeMetadata,
  updateAppearanceDetailsFromEdits,
  updateShapeAndColorFromEdits,
  updateTextureFromEdits,
  updateOrientationMetadata,
  generateRelationshipDescription,
  generateObjectDescription,
  generateShortDescription,
  generateBackgroundDescription,
  generateLightingDescription,
  generateAestheticsDescription,
  generatePhotographicDescription,
} from './descriptionGenerators';

// Export JSON builder functions
export {
  buildObjects,
  buildLighting,
  buildAesthetics,
  buildPhotographicCharacteristics,
  build,
} from './jsonBuilder';

// Export validation functions
export {
  validateSemanticJSON,
  validatePartialSemanticJSON,
  validateShortDescription,
  validateObjects,
  validateBackgroundSetting,
  validateLighting,
  validateAesthetics,
  validatePhotographicCharacteristics,
  validateStyleMedium,
  validateContext,
  validateArtisticStyle,
  validateTextRender,
  validateRequiredFields,
  validateFieldTypes,
  validateValueRanges,
} from './validator';

// Export schema definitions
export type {
  FieldSchema,
  SchemaDefinition,
} from './schema';

export {
  semanticJSONSchema,
  objectDescriptionSchema,
  lightingDescriptionSchema,
  aestheticsDescriptionSchema,
  photographicDescriptionSchema,
  textRenderSchema,
} from './schema';

// Export error message generators
export {
  generateValidationErrorMessage,
  generateMissingFieldErrorMessage,
  generateConversionErrorMessage,
  generateErrorMessage,
  generateErrorSummary,
  generateSpecificErrorMessage,
  generateMissingFieldsMessage,
  generateInvalidTypesMessage,
  generateOutOfRangeMessage,
  formatValidationErrors,
} from './errorMessages';

// Export default value providers
export {
  DEFAULT_OBJECT_DESCRIPTION,
  DEFAULT_LIGHTING_DESCRIPTION,
  DEFAULT_AESTHETICS_DESCRIPTION,
  DEFAULT_PHOTOGRAPHIC_DESCRIPTION,
  DEFAULT_SEMANTIC_JSON,
  getDefaultObjectDescriptionField,
  getDefaultLightingField,
  getDefaultAestheticsField,
  getDefaultPhotographicField,
  getDefaultFieldValue,
  fillObjectDescriptionDefaults,
  fillLightingDefaults,
  fillAestheticsDefaults,
  fillPhotographicDefaults,
  fillSemanticJSONDefaults,
  canProvideDefault,
  getDefaultForFieldType,
} from './defaults';

// Export main service class
export { SemanticGenerationService, semanticGenerationService } from './SemanticGenerationService';

// Export state reader functions
export {
  readCurrentState,
  validateStateCompleteness,
  getSafeStateCopy,
} from './stateReader';

// Export file saver functions
export {
  saveSemanticJSONToFile,
  generateSemanticJSONFilename,
  isValidFilename,
  sanitizeFilename,
} from './fileSaver';

// Export notification functions
export {
  notifySaveSuccess,
  notifySaveError,
  notifyValidationErrors,
  notifyGenerationStarted,
  notifyMissingState,
  notifyStateWarnings,
  notify,
} from './notifier';
