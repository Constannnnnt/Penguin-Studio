// API services
export { apiClient } from './api';
export { exampleLoader, loadExample } from './exampleLoader';
export type { LoadedExample } from './exampleLoader';

// Semantic generation service
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
  SemanticGenerationService,
  ValueConverters,
  DescriptionGenerators,
  JSONBuilder,
} from './semanticGeneration';

export {
  SemanticGenerationError,
  ValidationError,
  MissingFieldError,
  ConversionError,
} from './semanticGeneration';
