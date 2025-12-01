import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { useConfigStore } from '@/features/scene/store/configStore';

export interface ColorAdjustments {
  saturation: number;
  temperature: number;
  tint: number;
  vibrance: number;
}

export const COLOR_SCHEME_MAPPINGS: Record<string, ColorAdjustments> = {
  vibrant: {
    saturation: 40,
    temperature: 0,
    tint: 0,
    vibrance: 50,
  },
  muted: {
    saturation: -30,
    temperature: 0,
    tint: 0,
    vibrance: -20,
  },
  monochrome: {
    saturation: -100,
    temperature: 0,
    tint: 0,
    vibrance: -100,
  },
  warm: {
    saturation: 10,
    temperature: 35,
    tint: 15,
    vibrance: 20,
  },
  cool: {
    saturation: 10,
    temperature: -35,
    tint: -15,
    vibrance: 20,
  },
};

let previousColorAdjustments: ColorAdjustments | null = null;

export const storePreviousColorAdjustments = (): void => {
  const state = useImageEditStore.getState();
  previousColorAdjustments = {
    saturation: state.saturation,
    temperature: state.temperature,
    tint: state.tint,
    vibrance: state.vibrance,
  };
};

export const getPreviousColorAdjustments = (): ColorAdjustments | null => {
  return previousColorAdjustments;
};

export const applyColorScheme = (colorScheme: string): void => {
  const adjustments = COLOR_SCHEME_MAPPINGS[colorScheme];
  
  if (!adjustments) {
    console.warn(`Unknown color scheme: ${colorScheme}`);
    return;
  }

  storePreviousColorAdjustments();

  const { setSaturation, setTemperature, setTint, setVibrance } = useImageEditStore.getState();
  
  setSaturation(adjustments.saturation);
  setTemperature(adjustments.temperature);
  setTint(adjustments.tint);
  setVibrance(adjustments.vibrance);
};

export const revertColorScheme = (): void => {
  if (!previousColorAdjustments) {
    console.warn('No previous color adjustments to revert to');
    return;
  }

  const { setSaturation, setTemperature, setTint, setVibrance } = useImageEditStore.getState();
  
  setSaturation(previousColorAdjustments.saturation);
  setTemperature(previousColorAdjustments.temperature);
  setTint(previousColorAdjustments.tint);
  setVibrance(previousColorAdjustments.vibrance);
  
  previousColorAdjustments = null;
};

export const clearPreviousColorAdjustments = (): void => {
  previousColorAdjustments = null;
};

export const resetColorSchemeAndAdjustments = (): void => {
  const { resetImageEdits } = useImageEditStore.getState();
  const { updateSceneConfig } = useConfigStore.getState();
  
  resetImageEdits();
  updateSceneConfig('aesthetics.color_scheme', 'vibrant');
  previousColorAdjustments = null;
};
