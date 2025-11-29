import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageEditState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  cropArea: CropArea | null;
  hue: number;
  blur: number;
  sharpen: number;
  exposure: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  vibrance: number;
  vignette: number;
  grain: number;
  
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setRotation: (value: number) => void;
  toggleFlipHorizontal: () => void;
  toggleFlipVertical: () => void;
  setCropArea: (area: CropArea | null) => void;
  setHue: (value: number) => void;
  setBlur: (value: number) => void;
  setSharpen: (value: number) => void;
  setExposure: (value: number) => void;
  setHighlights: (value: number) => void;
  setShadows: (value: number) => void;
  setTemperature: (value: number) => void;
  setTint: (value: number) => void;
  setVibrance: (value: number) => void;
  setVignette: (value: number) => void;
  setGrain: (value: number) => void;
  resetImageEdits: () => void;
}

const DEFAULT_BRIGHTNESS = 0;
const DEFAULT_CONTRAST = 0;
const DEFAULT_SATURATION = 0;
const DEFAULT_ROTATION = 0;
const DEFAULT_FLIP_HORIZONTAL = false;
const DEFAULT_FLIP_VERTICAL = false;
const DEFAULT_HUE = 0;
const DEFAULT_BLUR = 0;
const DEFAULT_SHARPEN = 0;
const DEFAULT_EXPOSURE = 0;
const DEFAULT_HIGHLIGHTS = 0;
const DEFAULT_SHADOWS = 0;
const DEFAULT_TEMPERATURE = 0;
const DEFAULT_TINT = 0;
const DEFAULT_VIBRANCE = 0;
const DEFAULT_VIGNETTE = 0;
const DEFAULT_GRAIN = 0;

export const useImageEditStore = create<ImageEditState>()(
  devtools(
    (set) => ({
      brightness: DEFAULT_BRIGHTNESS,
      contrast: DEFAULT_CONTRAST,
      saturation: DEFAULT_SATURATION,
      rotation: DEFAULT_ROTATION,
      flipHorizontal: DEFAULT_FLIP_HORIZONTAL,
      flipVertical: DEFAULT_FLIP_VERTICAL,
      cropArea: null,
      hue: DEFAULT_HUE,
      blur: DEFAULT_BLUR,
      sharpen: DEFAULT_SHARPEN,
      exposure: DEFAULT_EXPOSURE,
      highlights: DEFAULT_HIGHLIGHTS,
      shadows: DEFAULT_SHADOWS,
      temperature: DEFAULT_TEMPERATURE,
      tint: DEFAULT_TINT,
      vibrance: DEFAULT_VIBRANCE,
      vignette: DEFAULT_VIGNETTE,
      grain: DEFAULT_GRAIN,

      setBrightness: (value: number) =>
        set({ brightness: value }),

      setContrast: (value: number) =>
        set({ contrast: value }),

      setSaturation: (value: number) =>
        set({ saturation: value }),

      setRotation: (value: number) =>
        set({ rotation: value }),

      toggleFlipHorizontal: () =>
        set((state) => ({
          flipHorizontal: !state.flipHorizontal,
        })),

      toggleFlipVertical: () =>
        set((state) => ({
          flipVertical: !state.flipVertical,
        })),

      setCropArea: (area: CropArea | null) =>
        set({ cropArea: area }),

      setHue: (value: number) =>
        set({ hue: value }),

      setBlur: (value: number) =>
        set({ blur: value }),

      setSharpen: (value: number) =>
        set({ sharpen: value }),

      setExposure: (value: number) =>
        set({ exposure: value }),

      setHighlights: (value: number) =>
        set({ highlights: value }),

      setShadows: (value: number) =>
        set({ shadows: value }),

      setTemperature: (value: number) =>
        set({ temperature: value }),

      setTint: (value: number) =>
        set({ tint: value }),

      setVibrance: (value: number) =>
        set({ vibrance: value }),

      setVignette: (value: number) =>
        set({ vignette: value }),

      setGrain: (value: number) =>
        set({ grain: value }),

      resetImageEdits: () =>
        set({
          brightness: DEFAULT_BRIGHTNESS,
          contrast: DEFAULT_CONTRAST,
          saturation: DEFAULT_SATURATION,
          rotation: DEFAULT_ROTATION,
          flipHorizontal: DEFAULT_FLIP_HORIZONTAL,
          flipVertical: DEFAULT_FLIP_VERTICAL,
          cropArea: null,
          hue: DEFAULT_HUE,
          blur: DEFAULT_BLUR,
          sharpen: DEFAULT_SHARPEN,
          exposure: DEFAULT_EXPOSURE,
          highlights: DEFAULT_HIGHLIGHTS,
          shadows: DEFAULT_SHADOWS,
          temperature: DEFAULT_TEMPERATURE,
          tint: DEFAULT_TINT,
          vibrance: DEFAULT_VIBRANCE,
          vignette: DEFAULT_VIGNETTE,
          grain: DEFAULT_GRAIN,
        }),
    }),
    {
      name: 'Penguin Image Edit Store',
    }
  )
);
