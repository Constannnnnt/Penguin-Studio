import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * GeneratedImage component with lazy loading, fade-in transition and industrial aesthetic
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
          'w-full h-full flex items-center justify-center bg-destructive/5 text-destructive border border-destructive/20 relative overflow-hidden group',
          className
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.2)_100%)] opacity-50" />
        <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-destructive opacity-50" />
        <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-destructive opacity-50" />
        <div className="z-10 text-center px-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] font-heading opacity-80">
            Data Stream Interrupted
          </div>
          <p className="text-[10px] font-mono text-destructive/80">err_img_decode_fail</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full group overflow-hidden industrial-panel border-0 bg-transparent", className)}>
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-muted/20 animate-pulse flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-primary/20" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-primary/20" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full max-w-full max-h-full object-contain transition-opacity duration-500 ease-out',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          willChange: isLoaded ? 'auto' : 'opacity',
        }}
      />

      {/* Technical Overlays */}
      {isLoaded && (
        <>
          <div className="absolute inset-0 border border-primary/10 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-background/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 left-3 text-[9px] font-mono text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity select-none">
            IMG_RENDER_01
          </div>
          {/* Corner Accents */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-primary/40 transition-all group-hover:w-3 group-hover:h-3" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-primary/40 transition-all group-hover:w-3 group-hover:h-3" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-primary/40 transition-all group-hover:w-3 group-hover:h-3" />
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-primary/40 transition-all group-hover:w-3 group-hover:h-3" />
        </>
      )}
    </div>
  );
};
