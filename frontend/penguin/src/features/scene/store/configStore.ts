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
  CompositionType,
  ColorScheme,
  MoodType,
  StyleMedium,
  ArtisticStyle,
} from '@/core/types';
import { editTracker } from '@/shared/lib/editTracker';

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
  aspect_ratio: '1:1',
  lighting: {
    conditions: 'natural' as LightingCondition,
    direction: {
      x: 50,
      y: 30,
      rotation: 0,
      tilt: 0,
    },
    shadows: 2,
  },
  aesthetics: {
    style_medium: 'photograph',
    aesthetic_style: 'realistic',
    composition: 'centered' as CompositionType,
    color_scheme: 'vibrant' as ColorScheme,
    mood_atmosphere: 'neutral' as MoodType,
  },
  photographic_characteristics: {
    camera_angle: 'eye-level',
    lens_focal_length: 'standard',
    depth_of_field: 50,
    focus: 75,
  },
  style_medium: 'photograph',
  artistic_style: 'realistic',
};

const DEFAULT_SCENE_CONFIG: SceneConfiguration = {
  background_setting: '',
  aspect_ratio: '1:1',
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

/**
 * Gets a nested property value from an object using a dot-notation path
 */
const getNestedProperty = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

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
         * Also tracks image-level edits (style_medium, artistic_style)
         */
        updateConfig: (path: string, value: unknown) =>
          set((state) => {
            // Track image-level edits
            const oldValue = getNestedProperty(
              state.config as unknown as Record<string, unknown>,
              path
            );
            
            // Track edits for image-level properties
            if (path === 'style_medium' || path === 'artistic_style') {
              editTracker.trackEdit(path, oldValue, value);
            }

            return {
              config: setNestedProperty(
                state.config as unknown as Record<string, unknown>,
                path,
                value
              ) as unknown as PenguinConfig,
            };
          }),

        /**
         * Updates scene configuration using dot-notation path
         * Also tracks the edit for modification prompt generation
         */
        updateSceneConfig: (path: string, value: unknown) =>
          set((state) => {
            // Track the edit
            const oldValue = getNestedProperty(
              state.sceneConfig as unknown as Record<string, unknown>,
              path
            );
            editTracker.trackEdit(path, oldValue, value);

            return {
              sceneConfig: setNestedProperty(
                state.sceneConfig as unknown as Record<string, unknown>,
                path,
                value
              ) as unknown as SceneConfiguration,
            };
          }),

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
         * Also tracks object edits for modification prompt generation
         */
        updateObject: (index: number, field: string, value: unknown) =>
          set((state) => {
            // Track object edit
            const oldValue = state.config.objects[index]?.[field as keyof SceneObject];
            const objectLabel = state.config.objects[index]?.description || undefined;
            editTracker.trackEdit(`objects[${index}].${field}`, oldValue, value, index, objectLabel);

            return {
              config: {
                ...state.config,
                objects: state.config.objects.map((obj, i) =>
                  i === index ? { ...obj, [field]: value } : obj
                ),
              },
            };
          }),

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
            sceneConfig: DEFAULT_SCENE_CONFIG,
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
              aspect_ratio: state.sceneConfig.aspect_ratio,
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

        /**
         * Updates both config and sceneConfig from Bria's structured prompt response
         * Also sets the baseline for edit tracking
         */
        updateConfigFromStructuredPrompt: (structuredPrompt: Record<string, unknown>) =>
          set((state) => {
            const sp = structuredPrompt;
            const lighting = (sp.lighting as Record<string, unknown>) || {};
            const aesthetics = (sp.aesthetics as Record<string, unknown>) || {};
            const photo = (sp.photographic_characteristics as Record<string, unknown>) || {};
            const rawObjects = sp.objects as Array<Record<string, unknown>> | undefined;

            // Log the incoming short_description
            console.log('[ConfigStore] updateConfigFromStructuredPrompt - short_description:', sp.short_description);

            // Clear previous edits and set new baseline for edit tracking
            editTracker.clearEdits();
            editTracker.setBaseline(sp);

            const newBackgroundSetting = (sp.background_setting as string) || state.config.background_setting;
            const newLightingConditions = (lighting.conditions as string) || state.config.lighting.conditions;
            const newCameraAngle = (photo.camera_angle as string) || state.config.photographic_characteristics.camera_angle;
            const newLensFocalLength = (photo.lens_focal_length as string) || state.config.photographic_characteristics.lens_focal_length;
            const newStyleMedium = ((sp.style_medium as string) || state.config.style_medium) as StyleMedium;
            const newAestheticStyle = ((sp.artistic_style as string) || state.config.artistic_style) as ArtisticStyle;
            const newComposition = ((aesthetics.composition as string) || state.config.aesthetics.composition) as CompositionType;
            const newColorScheme = ((aesthetics.color_scheme as string) || state.config.aesthetics.color_scheme) as ColorScheme;
            const newMoodAtmosphere = ((aesthetics.mood_atmosphere as string) || state.config.aesthetics.mood_atmosphere) as MoodType;

            // Only update objects if there are new ones, otherwise keep existing
            const newObjects = rawObjects && rawObjects.length > 0
              ? rawObjects.map((obj) => ({
                  description: (obj.description as string) || '',
                  location: (obj.location as string) || 'center',
                  relative_size: (obj.relative_size as string) || 'medium',
                  shape_and_color: (obj.shape_and_color as string) || '',
                  texture: (obj.texture as string) || undefined,
                  appearance_details: (obj.appearance_details as string) || undefined,
                  orientation: (obj.orientation as string) || 'front-facing',
                  pose: (obj.pose as string) || undefined,
                  expression: (obj.expression as string) || undefined,
                  action: (obj.action as string) || undefined,
                })) as SceneObject[]
              : state.config.objects;

            return {
              config: {
                ...state.config,
                short_description: (sp.short_description as string) || state.config.short_description,
                background_setting: newBackgroundSetting,
                style_medium: newStyleMedium,
                artistic_style: newAestheticStyle,
                context: (sp.context as string) || state.config.context,
                objects: newObjects,
                lighting: {
                  ...state.config.lighting,
                  conditions: newLightingConditions,
                },
                aesthetics: {
                  ...state.config.aesthetics,
                  composition: newComposition,
                  color_scheme: newColorScheme,
                  mood_atmosphere: newMoodAtmosphere,
                },
                photographic_characteristics: {
                  ...state.config.photographic_characteristics,
                  camera_angle: newCameraAngle,
                  lens_focal_length: newLensFocalLength,
                },
              },
              // Also update sceneConfig for the scene panel
              sceneConfig: {
                ...state.sceneConfig,
                background_setting: newBackgroundSetting,
                lighting: {
                  ...state.sceneConfig.lighting,
                  conditions: newLightingConditions,
                },
                aesthetics: {
                  ...state.sceneConfig.aesthetics,
                  style_medium: newStyleMedium,
                  aesthetic_style: newAestheticStyle,
                  composition: newComposition,
                  color_scheme: newColorScheme,
                  mood_atmosphere: newMoodAtmosphere,
                },
                photographic_characteristics: {
                  ...state.sceneConfig.photographic_characteristics,
                  camera_angle: newCameraAngle,
                  lens_focal_length: newLensFocalLength,
                },
              },
            };
          }),
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
