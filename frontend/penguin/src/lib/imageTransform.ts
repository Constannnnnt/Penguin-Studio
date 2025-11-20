import type { ImageEditState } from '../store/imageEditStore';

export interface ImageTransformStyle {
  filter: string;
  transform: string;
}

export const applyBrightness = (value: number): string => {
  const brightness = 100 + value;
  return `brightness(${brightness}%)`;
};

export const applyContrast = (value: number): string => {
  const contrast = 100 + value;
  return `contrast(${contrast}%)`;
};

export const applySaturation = (value: number): string => {
  const saturation = 100 + value;
  return `saturate(${saturation}%)`;
};

export const applyRotation = (degrees: number): string => {
  return `rotate(${degrees}deg)`;
};

export const applyFlip = (
  flipHorizontal: boolean,
  flipVertical: boolean
): string => {
  const scaleX = flipHorizontal ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  return `scale(${scaleX}, ${scaleY})`;
};

export const combineTransforms = (
  imageEditState: Pick<
    ImageEditState,
    'brightness' | 'contrast' | 'saturation' | 'rotation' | 'flipHorizontal' | 'flipVertical'
  >
): ImageTransformStyle => {
  const filters: string[] = [];
  const transforms: string[] = [];

  if (imageEditState.brightness !== 0) {
    filters.push(applyBrightness(imageEditState.brightness));
  }

  if (imageEditState.contrast !== 0) {
    filters.push(applyContrast(imageEditState.contrast));
  }

  if (imageEditState.saturation !== 0) {
    filters.push(applySaturation(imageEditState.saturation));
  }

  if (imageEditState.rotation !== 0) {
    transforms.push(applyRotation(imageEditState.rotation));
  }

  if (imageEditState.flipHorizontal || imageEditState.flipVertical) {
    transforms.push(
      applyFlip(imageEditState.flipHorizontal, imageEditState.flipVertical)
    );
  }

  return {
    filter: filters.length > 0 ? filters.join(' ') : 'none',
    transform: transforms.length > 0 ? transforms.join(' ') : 'none',
  };
};
