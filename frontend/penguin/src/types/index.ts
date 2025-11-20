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

export type CameraAngle =
  | 'eye-level'
  | 'low-angle'
  | 'high-angle'
  | "bird's eye"
  | "worm's eye"
  | 'dutch angle';

export type LensType =
  | 'ultra-wide'
  | 'wide'
  | 'standard'
  | 'telephoto'
  | 'super-telephoto';

export type DepthOfField = 'shallow' | 'medium' | 'deep';

export type FocusType = 'sharp' | 'soft' | 'selective';

export type LightingCondition =
  | 'daylight'
  | 'studio'
  | 'golden hour'
  | 'blue hour'
  | 'overcast'
  | 'night';

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

export type StyleMedium =
  | 'photograph'
  | 'oil painting'
  | '3D render'
  | 'watercolor'
  | 'digital art'
  | 'sketch';

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
// Configuration Interfaces
// ============================================================================

export interface LightingConfig {
  conditions: LightingCondition;
  direction: LightingDirection;
  shadows: ShadowType;
}

export interface AestheticsConfig {
  composition: CompositionType;
  color_scheme: ColorScheme;
  mood_atmosphere: MoodType;
  preference_score: string;
  aesthetic_score: string;
}

export interface PhotographicConfig {
  depth_of_field: DepthOfField;
  focus: FocusType;
  camera_angle: CameraAngle;
  lens_focal_length: LensType;
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
// Store State Interface
// ============================================================================

export type PanelType = 'scene' | 'camera' | 'lighting' | 'aesthetics' | 'medium';

export interface ConfigState {
  // State
  config: PenguinConfig;
  selectedObject: number | null;
  activePanel: PanelType;

  // Actions
  updateConfig: (path: string, value: unknown) => void;
  setConfig: (config: PenguinConfig) => void;
  setActivePanel: (panel: PanelType) => void;
  addObject: () => void;
  removeObject: (index: number) => void;
  updateObject: (index: number, field: string, value: unknown) => void;
  setSelectedObject: (index: number | null) => void;
  resetConfig: () => void;
}
