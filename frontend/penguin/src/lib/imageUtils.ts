import type { ImageEditState } from '../store/imageEditStore';

export interface DownloadImageOptions {
  imageSrc: string;
  imageEditState: Partial<ImageEditState>;
  filename?: string;
}

export const downloadImage = async ({
  imageSrc,
  imageEditState,
  filename = 'penguin-generated-image.png',
}: DownloadImageOptions): Promise<void> => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const rotation = imageEditState.rotation || 0;
    const rotationRad = (rotation * Math.PI) / 180;
    const isRotated90or270 = rotation === 90 || rotation === 270;

    canvas.width = isRotated90or270 ? img.height : img.width;
    canvas.height = isRotated90or270 ? img.width : img.height;

    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (imageEditState.rotation && imageEditState.rotation !== 0) {
      ctx.rotate(rotationRad);
    }

    if (imageEditState.flipHorizontal || imageEditState.flipVertical) {
      ctx.scale(
        imageEditState.flipHorizontal ? -1 : 1,
        imageEditState.flipVertical ? -1 : 1
      );
    }

    const filters: string[] = [];
    
    if (imageEditState.brightness) {
      const brightness = 100 + imageEditState.brightness;
      filters.push(`brightness(${brightness}%)`);
    }
    
    if (imageEditState.contrast) {
      const contrast = 100 + imageEditState.contrast;
      filters.push(`contrast(${contrast}%)`);
    }
    
    if (imageEditState.exposure) {
      const exposure = 100 + imageEditState.exposure;
      filters.push(`brightness(${exposure}%)`);
    }
    
    if (imageEditState.saturation) {
      const saturation = 100 + imageEditState.saturation;
      filters.push(`saturate(${saturation}%)`);
    }
    
    if (imageEditState.vibrance) {
      const vibrance = 100 + imageEditState.vibrance * 0.5;
      filters.push(`saturate(${vibrance}%)`);
    }
    
    if (imageEditState.hue) {
      filters.push(`hue-rotate(${imageEditState.hue}deg)`);
    }
    
    if (imageEditState.blur) {
      filters.push(`blur(${imageEditState.blur / 10}px)`);
    }

    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

    ctx.restore();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to download image: ${errorMessage}`);
  }
};
