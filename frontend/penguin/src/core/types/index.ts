// ============================================================================
// Enum Types
// ============================================================================

export type LocationOption =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center-left"
  | "center-right";

export type SizeOption = "small" | "medium" | "large" | "very large";

export type OrientationOption =
  | "front-facing"
  | "left"
  | "right"
  | "back"
  | "angled";

// ============================================================================
// Scene Tab Constants
// ============================================================================

// Camera angle options for  scene tab
export const CAMERA_ANGLE_OPTIONS = [
  "eye-level",
  "overhead",
  "low-angle",
  "high-angle",
  "custom",
] as const;

// Lens focal length options for scene tab
export const LENS_FOCAL_LENGTH_OPTIONS = [
  "wide-angle",
  "standard",
  "portrait",
  "macro",
  "custom",
] as const;

// Lighting condition options for scene tab
export const LIGHTING_CONDITIONS_OPTIONS = [
  "natural",
  "studio",
  "soft diffused",
  "dramatic",
  "golden hour",
  "custom",
] as const;

// Style medium options for scene tab
export const STYLE_MEDIUM_OPTIONS = [
  "photograph",
  "painting",
  "digital art",
  "sketch",
  "3D render",
  "custom",
] as const;

// Aesthetic style options for scene tab
export const AESTHETIC_STYLE_OPTIONS = [
  "realistic",
  "artistic",
  "vintage",
  "modern",
  "dramatic",
  "custom",
] as const;

// Shadow intensity labels for discrete slider
export const INTENSITY_LABELS = [
  "none",
  "subtle",
  "soft",
  "moderate",
  "strong",
  "dramatic",
] as const;

// Depth of field labels for discrete slider
export const DEPTH_OF_FIELD_LABELS = [
  "Very Shallow",
  "Shallow",
  "Medium",
  "Deep",
  "Very Deep",
] as const;

// Focus labels for discrete slider
export const FOCUS_LABELS = [
  "Soft Focus",
  "Slight Soft",
  "Sharp",
  "Very Sharp",
  "Hyper Sharp",
] as const;

// ============================================================================
// Scene Tab Types (with custom input support)
// ============================================================================

// Extended camera angle type with custom support
export type CameraAngle =
  | "eye-level"
  | "overhead"
  | "low-angle"
  | "high-angle"
  | string; // custom values

// Extended lens type with custom support
export type LensType =
  | "wide-angle"
  | "standard"
  | "portrait"
  | "macro"
  | string; // custom values

// Numeric depth of field (0-100 scale)
export type DepthOfFieldValue = number;

// Numeric focus value (0-100 scale)
export type FocusValue = number;

// Extended lighting condition with custom support
export type LightingCondition =
  | "natural"
  | "studio"
  | "soft diffused"
  | "dramatic"
  | "golden hour"
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
  | "photograph"
  | "painting"
  | "digital art"
  | "sketch"
  | "3D render"
  | string; // custom values

export type AestheticStyle =
  | "realistic"
  | "artistic"
  | "vintage"
  | "modern"
  | "dramatic"
  | string; // custom values

// ============================================================================
// Composition and Style Types
// ============================================================================

export type CompositionType =
  | "centered"
  | "rule-of-thirds"
  | "diagonal"
  | "symmetrical"
  | "asymmetrical";

export type ColorScheme =
  | "vibrant"
  | "muted"
  | "monochrome"
  | "warm"
  | "cool"
  | "pastel"
  | "cinematic";

export type MoodType =
  | "neutral"
  | "cheerful"
  | "dramatic"
  | "serene"
  | "mysterious";

export type ArtisticStyle =
  | "realistic"
  | "surreal"
  | "cinematic"
  | "minimalism"
  | "impressionist"
  | "abstract";

// Aspect ratio options for image generation
export const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1", width: 1, height: 1 },
  // { value: "2:3", label: "2:3", width: 2, height: 3 },
  { value: "3:4", label: "3:4", width: 3, height: 4 },
  { value: "4:3", label: "4:3", width: 4, height: 3 },
  { value: "9:16", label: "9:16", width: 9, height: 16 },
  { value: "16:9", label: "16:9", width: 16, height: 9 },
  { value: "custom", label: "Custom", width: 1, height: 1 },
] as const;

export type AspectRatio =
  | "1:1"
  | "4:3"
  | "3:4"
  | "16:9"
  | "9:16"
  // | "2:3"
  | string;

// ============================================================================
// Scene Object Interface
// ============================================================================

export interface SceneObject {
  description: string;
  location: LocationOption;
  relationship?: string;
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
  aspect_ratio: AspectRatio;
  photographic_characteristics: PhotographicConfig;
  lighting: LightingConfig;
  aesthetics: AestheticsConfig;
  seed?: number;
}

export interface PlanStep {
  tool_name: string;
  tool_input: Record<string, unknown>;
  step_description: string;
}

export interface GenerationDraft {
  main_subject: string;
  background_setting: string;
  style_or_medium: string;
  lighting: string;
  composition?: string;
  extra_details?: string;
  polished_prompt?: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  plan?: PlanStep[];
  generation_draft?: GenerationDraft;
  initial_generation_draft?: GenerationDraft;
  source_query?: string;
  timestamp: Date;
  status?: 'thinking' | 'suggested' | 'executing' | 'completed' | 'failed' | 'awaiting_input';
}

// ============================================================================
// Main Penguin Configuration Interface
// ============================================================================

export interface PenguinConfig {
  short_description: string;
  objects: SceneObject[];
  background_setting: string;
  aspect_ratio: AspectRatio;
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
  status: "pending" | "processing" | "completed" | "failed";
  image_url?: string;
  structured_prompt?: Record<string, unknown>;
  seed?: number;
  generation_time_ms?: number;
  ip_warning?: string;
  from_cache?: boolean;
  error?: string;
}

export interface LoadGenerationMask {
  mask_id: string;
  mask_url: string;
  label: string;
  confidence?: number;
  bounding_box?: { x1: number; y1: number; x2: number; y2: number };
  area_pixels?: number;
  area_percentage?: number;
  centroid?: [number, number];
  prompt_tier?: "CORE" | "CORE_VISUAL" | "CORE_VISUAL_SPATIAL";
  prompt_text?: string;
  prompt_object?: string;
  object_metadata?: {
    description?: string;
    location?: string;
    relationship?: string;
    relative_size?: string;
    shape_and_color?: string;
    texture?: string;
    appearance_details?: string;
    orientation?: string;
  };
}

export interface LoadGenerationResponse {
  generation_id: string;
  image_url: string;
  structured_prompt: Record<string, unknown>;
  prompt_versions: string[];
  masks: LoadGenerationMask[];
  metadata?: Record<string, unknown>;
  seed?: number;
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

export type PanelType =
  | "scene"
  | "camera"
  | "lighting"
  | "aesthetics"
  | "medium";

export interface ConfigState {
  // State
  config: PenguinConfig;
  sceneConfig: SceneConfiguration;
  rawStructuredPrompt: Record<string, unknown> | null;
  selectedObject: number | null;
  activePanel: PanelType;
  isEnhancedMode: boolean;

  // Actions
  updateConfig: (path: string, value: unknown) => void;
  updateSceneConfig: (path: string, value: unknown) => void;
  setConfig: (config: PenguinConfig) => void;
  setSceneConfig: (config: SceneConfiguration) => void;
  setActivePanel: (panel: PanelType) => void;
  addObject: () => void;
  removeObject: (index: number) => void;
  updateObject: (index: number, field: string, value: unknown) => void;
  setSelectedObject: (index: number | null) => void;
  resetConfig: () => void;
  applySemanticParsing: (parsedData: SemanticParsingResponse) => void;
  updateConfigFromStructuredPrompt: (
    structuredPrompt: Record<string, unknown>
  ) => void;
}
