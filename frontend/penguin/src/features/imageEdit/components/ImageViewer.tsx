import * as React from 'react';
import { Download } from 'lucide-react';
import { GeneratedImage } from './GeneratedImage';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';
import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { combineTransforms } from '@/shared/lib/imageTransform';
import { downloadImage } from '@/shared/lib/imageUtils';
import { useToast } from '@/shared/hooks/useToast';

interface ImageViewerProps {
  image?: string | null;
  isLoading?: boolean;
  error?: string | null;
  style?: React.CSSProperties;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image = null,
  isLoading = false,
  error = null,
  style,
}) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = React.useState(false);

  const brightness = useImageEditStore((state) => state.brightness);
  const contrast = useImageEditStore((state) => state.contrast);
  const saturation = useImageEditStore((state) => state.saturation);
  const rotation = useImageEditStore((state) => state.rotation);
  const flipHorizontal = useImageEditStore((state) => state.flipHorizontal);
  const flipVertical = useImageEditStore((state) => state.flipVertical);
  const hue = useImageEditStore((state) => state.hue);
  const blur = useImageEditStore((state) => state.blur);
  const exposure = useImageEditStore((state) => state.exposure);
  const vibrance = useImageEditStore((state) => state.vibrance);

  const imageEditState = React.useMemo(
    () => ({
      brightness,
      contrast,
      saturation,
      rotation,
      flipHorizontal,
      flipVertical,
      hue,
      blur,
      exposure,
      vibrance,
    }),
    [brightness, contrast, saturation, rotation, flipHorizontal, flipVertical, hue, blur, exposure, vibrance]
  );

  const transformStyle = React.useMemo(
    () => combineTransforms(imageEditState),
    [imageEditState]
  );

  const handleDownload = async (): Promise<void> => {
    if (!image) return;

    setIsDownloading(true);
    try {
      await downloadImage({
        imageSrc: image,
        imageEditState,
        filename: `penguin-${Date.now()}.png`,
      });
      toast({
        title: 'Success',
        description: 'Image downloaded successfully',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to download image';
      toast({
        title: 'Download Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };
  const containerStyle = style ?? {
    width: '100%',
    maxHeight: 'calc(100vh - 200px)',
    minHeight: '280px',
    height: 'auto',
  };

  return (
    <div
      role="img"
      aria-label={image ? 'Generated image preview' : 'Image preview area'}
      aria-busy={isLoading}
      className="relative w-full h-full bg-muted/50 rounded-lg overflow-hidden border border-border flex items-center justify-center"
      style={containerStyle}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="status"
          aria-live="polite"
        >
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground mt-4 animate-pulse">Generating image...</p>
        </div>
      )}

      {image && !isLoading && (
        <div className="animate-in fade-in duration-300">
          <div
            style={{
              filter: transformStyle.filter,
              transform: transformStyle.transform,
              transition: 'filter 0.2s ease, transform 0.2s ease',
              width: '100%',
              height: '100%',
            }}
          >
            <GeneratedImage src={image} alt="Generated scene" />
          </div>
          <div className="absolute top-2 right-2 md:top-3 md:right-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              disabled={isDownloading}
              aria-label="Download image"
              aria-busy={isDownloading}
              className="h-8 md:h-9 shadow-md text-xs md:text-sm transition-all duration-150"
            >
              <Download className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download'}</span>
              <span className="sm:hidden">{isDownloading ? '...' : 'DL'}</span>
            </Button>
          </div>
        </div>
      )}

      {!image && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="text-center text-muted-foreground">
            <div className="mb-2 md:mb-3">
              <svg
                className="mx-auto h-12 w-12 md:h-16 md:w-16 opacity-20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm md:text-base font-semibold text-foreground/70">No image generated</p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">Configure your scene and click Generate</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4 md:p-6 animate-in fade-in duration-200"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center text-destructive">
            <p className="text-sm md:text-base font-semibold">Generation Failed</p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
