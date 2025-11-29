import * as React from 'react';

interface LazyMaskImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
}

export const LazyMaskImage = React.memo<LazyMaskImageProps>(({
  src,
  alt,
  className,
  style,
  onLoad,
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  const handleLoad = React.useCallback((): void => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${isLoaded ? '' : 'opacity-0'} transition-opacity duration-200`}
      style={style}
      onLoad={handleLoad}
      loading="lazy"
    />
  );
});

LazyMaskImage.displayName = 'LazyMaskImage';
