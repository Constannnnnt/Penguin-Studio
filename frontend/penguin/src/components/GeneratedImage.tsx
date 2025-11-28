import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * GeneratedImage component with lazy loading and fade-in transition
 */

interface GeneratedImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export const GeneratedImage: React.FC<GeneratedImageProps> = ({
  src,
  alt = 'Generated scene',
  className,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (): void => {
    setIsLoaded(true);
  };

  const handleError = (): void => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-destructive/10',
          className
        )}
      >
        <div className="text-center text-destructive px-4">
          <p className="text-sm font-medium">Failed to load image</p>
          <p className="text-xs mt-1">The image could not be displayed</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            className
          )}
          aria-hidden="true"
        />
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full max-w-full max-h-full object-contain transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          willChange: isLoaded ? 'auto' : 'opacity',
        }}
      />
    </>
  );
};
