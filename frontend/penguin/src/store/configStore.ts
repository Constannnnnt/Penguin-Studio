import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  PenguinConfig,
  ConfigState,
  SceneConfiguration,
  SemanticParsingResponse,
  PanelType,
  SceneObject,
  LightingCondition,
  LightingDirection,
  ShadowType,
  CompositionType,
  ColorScheme,
  MoodType,
} from '@/types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SCENE_OBJECT: SceneObject = {
  description: '',
  location: 'center',
  relative_size: 'medium',
  shape_and_color: '',
  orientation: 'front-facing',
};

const DEFAULT_CONFIG: PenguinConfig = {
  short_description: '',
  objects: [],
  background_setting: '',
  lighting: {
    conditions: 'natural' as LightingCondition,
    direction: 'front-lit' as LightingDirection,
    shadows: 'soft' as ShadowType,
  },
  aesthetics: {
    composition: 'centered' as CompositionType,
    color_scheme: 'vibrant' as ColorScheme,
    mood_atmosphere: 'neutral' as MoodType,
    preference_score: '0.5',
    aesthetic_score: '0.5',
  },
  photographic_characteristics: {
    depth_of_field: 'medium',
    focus: 'sharp',
    camera_angle: 'eye-level',
    lens_focal_length: 'standard',
  },
  style_medium: 'photograph',
  artistic_style: 'realistic',
};

// ============================================================================
// Enhanced Default Configuration
// ============================================================================

const DEFAULT_SCENE_CONFIG: SceneConfiguration = {
  background_setting: '',
  photographic_characteristics: {
    camera_angle: 'eye-level',
    lens_focal_length: 'standard',
    depth_of_field: 50, // 0-100 scale, 50 = medium
    focus: 75, // 0-100 scale, 75 = sharp
  },
  lighting: {
    conditions: 'natural',
    direction: {
      x: 50, // center horizontally
      y: 30, // slightly from top
      rotation: 0, // no rotation
      tilt: 0, // no tilt
    },
    shadows: 2, // 0-5 scale, 2 = soft
  },
  aesthetics: {
    style_medium: 'photograph',
    aesthetic_style: 'realistic',
    composition: 'centered',
    color_scheme: 'vibrant',
    mood_atmosphere: 'neutral',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Updates a nested property in an object using a dot-notation path
 * @param obj - The object to update
 * @param path - Dot-notation path (e.g., "lighting.conditions")
 * @param value - The value to set
 * @returns A new object with the updated value
 */
const setNestedProperty = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> => {
  const keys = path.split('.');
  const newObj = { ...obj };
  let current: Record<string, unknown> = newObj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return newObj;
};

// ============================================================================
// Zustand Store
// ============================================================================

// ============================================================================
// Config Store
// ============================================================================

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set) => ({
        // ====================================================================
        // State
        // ====================================================================
        config: DEFAULT_CONFIG,
        sceneConfig: DEFAULT_SCENE_CONFIG,
        selectedObject: null,
        activePanel: 'scene',
        isEnhancedMode: false,

        // ====================================================================
        // Actions
        // ====================================================================

        /**
         * Updates a configuration value using dot-notation path
         * Supports nested paths like "lighting.conditions"
         */
        updateConfig: (path: string, value: unknown) =>
          set((state) => ({
            config: setNestedProperty(
              state.config as unknown as Record<string, unknown>,
              path,
              value
            ) as unknown as PenguinConfig,
          })),

        /**
         * Updates scene configuration using dot-notation path
         */
        updateSceneConfig: (path: string, value: unknown) =>
          set((state) => ({
            sceneConfig: setNestedProperty(
              state.sceneConfig as unknown as Record<string, unknown>,
              path,
              value
            ) as unknown as SceneConfiguration,
          })),

        /**
         * Replaces the entire configuration
         */
        setConfig: (config: PenguinConfig) => set({ config }),

        /**
         * Replaces the entire enhanced scene configuration
         */
        setSceneConfig: (config: SceneConfiguration) => 
          set({ sceneConfig: config }),

        /**
         * Sets the active control panel
         */
        setActivePanel: (panel: PanelType) => set({ activePanel: panel }),

        /**
         * Adds a new object to the scene with default values
         * Automatically selects the newly added object
         */
        addObject: () =>
          set((state) => {
            const newObjects = [...state.config.objects, { ...DEFAULT_SCENE_OBJECT }];
            return {
              config: {
                ...state.config,
                objects: newObjects,
              },
              selectedObject: newObjects.length - 1,
            };
          }),

        /**
         * Removes an object from the scene by index
         * Clears selection if the removed object was selected
         */
        removeObject: (index: number) =>
          set((state) => ({
            config: {
              ...state.config,
              objects: state.config.objects.filter((_, i) => i !== index),
            },
            selectedObject:
              state.selectedObject === index
                ? null
                : state.selectedObject !== null && state.selectedObject > index
                  ? state.selectedObject - 1
                  : state.selectedObject,
          })),

        /**
         * Updates a specific field of an object by index
         */
        updateObject: (index: number, field: string, value: unknown) =>
          set((state) => ({
            config: {
              ...state.config,
              objects: state.config.objects.map((obj, i) =>
                i === index ? { ...obj, [field]: value } : obj
              ),
            },
          })),

        /**
         * Sets the currently selected object index
         */
        setSelectedObject: (index: number | null) =>
          set({ selectedObject: index }),

        /**
         * Resets the configuration to default values
         */
        resetConfig: () =>
          set({
            config: DEFAULT_CONFIG,
            selectedObject: null,
            activePanel: 'scene',
          }),

        /**
         * Applies semantic parsing results to enhanced configuration
         */
        applySemanticParsing: (parsedData: SemanticParsingResponse) =>
          set((state) => ({
            sceneConfig: {
              background_setting: parsedData.background_setting,
              photographic_characteristics: {
                camera_angle: parsedData.photographic_characteristics.camera_angle.value,
                lens_focal_length: parsedData.photographic_characteristics.lens_focal_length.value,
                depth_of_field: parsedData.photographic_characteristics.depth_of_field.value,
                focus: parsedData.photographic_characteristics.focus.value,
              },
              lighting: {
                conditions: parsedData.lighting.conditions.value,
                direction: parsedData.lighting.direction.value,
                shadows: parsedData.lighting.shadows.value,
              },
              aesthetics: {
                style_medium: parsedData.aesthetics.style_medium.value,
                aesthetic_style: parsedData.aesthetics.aesthetic_style.value,
                composition: state.sceneConfig.aesthetics.composition,
                color_scheme: state.sceneConfig.aesthetics.color_scheme,
                mood_atmosphere: state.sceneConfig.aesthetics.mood_atmosphere,
              },
            },
          })),
      }),
      {
        name: 'penguin-config-storage',
      }
    ),
    {
      name: 'Penguin Config Store',
    }
  )
);
