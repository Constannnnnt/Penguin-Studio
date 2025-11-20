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
  
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setRotation: (value: number) => void;
  toggleFlipHorizontal: () => void;
  toggleFlipVertical: () => void;
  setCropArea: (area: CropArea | null) => void;
  resetImageEdits: () => void;
}

const DEFAULT_BRIGHTNESS = 0;
const DEFAULT_CONTRAST = 0;
const DEFAULT_SATURATION = 0;
const DEFAULT_ROTATION = 0;
const DEFAULT_FLIP_HORIZONTAL = false;
const DEFAULT_FLIP_VERTICAL = false;

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

      resetImageEdits: () =>
        set({
          brightness: DEFAULT_BRIGHTNESS,
          contrast: DEFAULT_CONTRAST,
          saturation: DEFAULT_SATURATION,
          rotation: DEFAULT_ROTATION,
          flipHorizontal: DEFAULT_FLIP_HORIZONTAL,
          flipVertical: DEFAULT_FLIP_VERTICAL,
          cropArea: null,
        }),
    }),
    {
      name: 'Penguin Image Edit Store',
    }
  )
);
