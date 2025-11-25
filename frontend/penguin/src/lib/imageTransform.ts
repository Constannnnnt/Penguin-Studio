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

export const applyHue = (value: number): string => {
  return `hue-rotate(${value}deg)`;
};

export const applyBlur = (value: number): string => {
  return `blur(${value / 10}px)`;
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
  imageEditState: Partial<ImageEditState>
): ImageTransformStyle => {
  const filters: string[] = [];
  const transforms: string[] = [];

  if (imageEditState.brightness && imageEditState.brightness !== 0) {
    filters.push(applyBrightness(imageEditState.brightness));
  }

  if (imageEditState.contrast && imageEditState.contrast !== 0) {
    filters.push(applyContrast(imageEditState.contrast));
  }

  if (imageEditState.exposure && imageEditState.exposure !== 0) {
    const exposureValue = 100 + imageEditState.exposure;
    filters.push(`brightness(${exposureValue}%)`);
  }

  if (imageEditState.saturation && imageEditState.saturation !== 0) {
    filters.push(applySaturation(imageEditState.saturation));
  }

  if (imageEditState.vibrance && imageEditState.vibrance !== 0) {
    const vibranceValue = 100 + imageEditState.vibrance * 0.5;
    filters.push(`saturate(${vibranceValue}%)`);
  }

  if (imageEditState.hue && imageEditState.hue !== 0) {
    filters.push(applyHue(imageEditState.hue));
  }

  if (imageEditState.blur && imageEditState.blur !== 0) {
    filters.push(applyBlur(imageEditState.blur));
  }

  if (imageEditState.rotation && imageEditState.rotation !== 0) {
    transforms.push(applyRotation(imageEditState.rotation));
  }

  if (imageEditState.flipHorizontal || imageEditState.flipVertical) {
    transforms.push(
      applyFlip(!!imageEditState.flipHorizontal, !!imageEditState.flipVertical)
    );
  }

  return {
    filter: filters.length > 0 ? filters.join(' ') : 'none',
    transform: transforms.length > 0 ? transforms.join(' ') : 'none',
  };
};
