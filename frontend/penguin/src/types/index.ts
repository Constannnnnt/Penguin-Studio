// ============================================================================
// Enum Types
// ============================================================================

export type LocationOption =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center-left'
  | 'center-right';

export type SizeOption = 'small' | 'medium' | 'large' | 'very large';

export type OrientationOption =
  | 'front-facing'
  | 'left'
  | 'right'
  | 'back'
  | 'angled';

// ============================================================================
// Scene Tab Constants
// ============================================================================

// Camera angle options for  scene tab
export const CAMERA_ANGLE_OPTIONS = [
  'eye-level', 'overhead', 'low-angle', 'high-angle', 'custom'
] as const;

// Lens focal length options for scene tab
export const LENS_FOCAL_LENGTH_OPTIONS = [
  'wide-angle', 'standard', 'portrait', 'macro', 'custom'
] as const;

// Lighting condition options for scene tab
export const LIGHTING_CONDITIONS_OPTIONS = [
  'natural', 'studio', 'soft diffused', 'dramatic', 'golden hour', 'custom'
] as const;

// Style medium options for scene tab
export const STYLE_MEDIUM_OPTIONS = [
  'photograph', 'painting', 'digital art', 'sketch', '3D render', 'custom'
] as const;

// Aesthetic style options for scene tab
export const AESTHETIC_STYLE_OPTIONS = [
  'realistic', 'artistic', 'vintage', 'modern', 'dramatic', 'custom'
] as const;

// Shadow intensity labels for discrete slider
export const INTENSITY_LABELS = [
  'none', 'subtle', 'soft', 'moderate', 'strong', 'dramatic'
] as const;

// Depth of field labels for discrete slider
export const DEPTH_OF_FIELD_LABELS = [
  'Very Shallow', 'Shallow', 'Medium', 'Deep', 'Very Deep'
] as const;

// Focus labels for discrete slider
export const FOCUS_LABELS = [
  'Soft Focus', 'Slight Soft', 'Sharp', 'Very Sharp', 'Hyper Sharp'
] as const;

// ============================================================================
// Scene Tab Types (with custom input support)
// ============================================================================

// Extended camera angle type with custom support
export type CameraAngle = 
  | 'eye-level' 
  | 'overhead' 
  | 'low-angle' 
  | 'high-angle'
  | string; // custom values

// Extended lens type with custom support  
export type LensType = 
  | 'wide-angle' 
  | 'standard' 
  | 'portrait' 
  | 'macro'
  | string; // custom values

// Numeric depth of field (0-100 scale)
export type DepthOfFieldValue = number;

// Numeric focus value (0-100 scale)
export type FocusValue = number;

// Extended lighting condition with custom support
export type LightingCondition = 
  | 'natural' 
  | 'studio' 
  | 'soft diffused' 
  | 'dramatic' 
  | 'golden hour'
  | string; // custom values

// 6DOF lighting direction
export interface LightingDirectionValue {
  x: number; // 0-100 (left to right)
  y: number; // 0-100 (top to bottom) 
  rotation: number; // 0-360 degrees
  tilt: number; // -90 to 90 degrees
}

// Discrete shadow intensity (0-5 scale)
export type ShadowIntensity = 0 | 1 | 2 | 3 | 4 | 5;

// Extended style types with custom support
export type StyleMedium = 
  | 'photograph' 
  | 'painting' 
  | 'digital art' 
  | 'sketch' 
  | '3D render'
  | string; // custom values

export type AestheticStyle = 
  | 'realistic' 
  | 'artistic' 
  | 'vintage' 
  | 'modern' 
  | 'dramatic'
  | string; // custom values

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export type DepthOfField = 'shallow' | 'medium' | 'deep';

export type FocusType = 'sharp' | 'soft' | 'selective';

export type LightingDirection =
  | 'front-lit'
  | 'back-lit'
  | 'side-lit'
  | 'top-lit'
  | 'bottom-lit'
  | 'diffused';

export type ShadowType = 'soft' | 'hard' | 'subtle' | 'dramatic' | 'none';

export type CompositionType =
  | 'centered'
  | 'rule of thirds'
  | 'symmetrical'
  | 'diagonal'
  | 'leading lines'
  | 'frame within frame';

export type ColorScheme =
  | 'vibrant'
  | 'muted'
  | 'monochrome'
  | 'warm'
  | 'cool'
  | 'pastel'
  | 'cinematic';

export type MoodType =
  | 'neutral'
  | 'joyful'
  | 'dramatic'
  | 'calm'
  | 'mysterious'
  | 'energetic'
  | 'melancholic';

export type ArtisticStyle =
  | 'realistic'
  | 'surreal'
  | 'cinematic'
  | 'minimalism'
  | 'impressionist'
  | 'abstract';

// ============================================================================
// Scene Object Interface
// ============================================================================

export interface SceneObject {
  description: string;
  location: LocationOption;
  relative_size: SizeOption;
  shape_and_color: string;
  texture?: string;
  appearance_details?: string;
  orientation: OrientationOption;
  pose?: string;
  expression?: string;
  action?: string;
}

// ============================================================================
// Scene Configuration Interfaces
// ============================================================================

export interface PhotographicConfig {
  camera_angle: CameraAngle | string; // string for custom
  lens_focal_length: LensType | string; // string for custom
  depth_of_field: DepthOfFieldValue; // 0-100 scale
  focus: FocusValue; // 0-100 scale
}

export interface LightingConfig {
  conditions: LightingCondition | string; // string for custom
  direction: LightingDirectionValue; // 6DOF lighting direction
  shadows: ShadowIntensity; // discrete 0-5 scale
}

export interface AestheticsConfig {
  style_medium: StyleMedium | string; // string for custom
  aesthetic_style: AestheticStyle | string; // string for custom
  composition: CompositionType;
  color_scheme: ColorScheme;
  mood_atmosphere: MoodType;
}

// ============================================================================
// Semantic Parsing Response Types
// ============================================================================

export interface ParsedValue<T> {
  value: T;
  confidence: number;
  isCustom: boolean;
}

export interface SemanticParsingResponse {
  background_setting: string;
  photographic_characteristics: {
    camera_angle: ParsedValue<CameraAngle>;
    lens_focal_length: ParsedValue<LensType>;
    depth_of_field: ParsedValue<number>; // 0-100 scale
    focus: ParsedValue<number>; // 0-100 scale
  };
  lighting: {
    conditions: ParsedValue<LightingCondition>;
    direction: ParsedValue<LightingDirectionValue>;
    shadows: ParsedValue<ShadowIntensity>;
  };
  aesthetics: {
    style_medium: ParsedValue<StyleMedium>;
    aesthetic_style: ParsedValue<AestheticStyle>;
  };
}

// ============================================================================
// Scene Configuration
// ============================================================================

export interface SceneConfiguration {
  background_setting: string;
  photographic_characteristics: PhotographicConfig;
  lighting: LightingConfig;
  aesthetics: AestheticsConfig;
}

// ============================================================================
// Main Penguin Configuration Interface
// ============================================================================

export interface PenguinConfig {
  short_description: string;
  objects: SceneObject[];
  background_setting: string;
  lighting: LightingConfig;
  aesthetics: AestheticsConfig;
  photographic_characteristics: PhotographicConfig;
  style_medium: StyleMedium;
  artistic_style: ArtisticStyle;
  context?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  error?: string;
  created_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors?: ValidationError[];
}

export interface Presets {
  [key: string]: PenguinConfig;
}

// ============================================================================
// Scene Configuration
// ============================================================================

export interface sceneConfiguration {
  background_setting: string;
  photographic_characteristics: PhotographicConfig;
  lighting: LightingConfig;
  aesthetics: AestheticsConfig;
}

// ============================================================================
// Semantic Parsing Response Types
// ============================================================================

export interface ParsedValue<T> {
  value: T;
  confidence: number;
  isCustom: boolean;
}

export interface SemanticParsingResponse {
  background_setting: string;
  photographic_characteristics: {
    camera_angle: ParsedValue<CameraAngle>;
    lens_focal_length: ParsedValue<LensType>;
    depth_of_field: ParsedValue<number>;
    focus: ParsedValue<number>;
  };
  lighting: {
    conditions: ParsedValue<LightingCondition>;
    direction: ParsedValue<LightingDirectionValue>;
    shadows: ParsedValue<ShadowIntensity>;
  };
  aesthetics: {
    style_medium: ParsedValue<StyleMedium>;
    aesthetic_style: ParsedValue<AestheticStyle>;
  };
}

// ============================================================================
// Store State Interface
// ============================================================================

export type PanelType = 'scene' | 'camera' | 'lighting' | 'aesthetics' | 'medium';

export interface ConfigState {
  // State
  config: PenguinConfig;
  sceneConfig: SceneConfiguration;
  selectedObject: number | null;
  activePanel: PanelType;
  isEnhancedMode: boolean;

  // Actions
  updateConfig: (path: string, value: unknown) => void;
  setConfig: (config: PenguinConfig) => void;
  setSceneConfig: (config: SceneConfiguration) => void;
  setActivePanel: (panel: PanelType) => void;
  // setMode: (enabled: boolean) => void;
  addObject: () => void;
  removeObject: (index: number) => void;
  updateObject: (index: number, field: string, value: unknown) => void;
  setSelectedObject: (index: number | null) => void;
  resetConfig: () => void;
  applySemanticParsing: (parsedData: SemanticParsingResponse) => void;
}
