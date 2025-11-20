import type { ImageEditState } from '../store/imageEditStore';

export interface DownloadImageOptions {
  imageSrc: string;
  imageEditState: Pick<
    ImageEditState,
    'brightness' | 'contrast' | 'saturation' | 'rotation' | 'flipHorizontal' | 'flipVertical'
  >;
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

    const rotationRad = (imageEditState.rotation * Math.PI) / 180;
    const isRotated90or270 =
      imageEditState.rotation === 90 || imageEditState.rotation === 270;

    canvas.width = isRotated90or270 ? img.height : img.width;
    canvas.height = isRotated90or270 ? img.width : img.height;

    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (imageEditState.rotation !== 0) {
      ctx.rotate(rotationRad);
    }

    if (imageEditState.flipHorizontal || imageEditState.flipVertical) {
      ctx.scale(
        imageEditState.flipHorizontal ? -1 : 1,
        imageEditState.flipVertical ? -1 : 1
      );
    }

    const brightness = 100 + imageEditState.brightness;
    const contrast = 100 + imageEditState.contrast;
    const saturation = 100 + imageEditState.saturation;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

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
