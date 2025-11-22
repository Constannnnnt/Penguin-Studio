import { useState, useEffect, useRef } from 'react';

interface UseOptimizedImageOptions {
  preload?: boolean;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedImageResult {
  src: string | null;
  isLoading: boolean;
  error: Error | null;
  isInView: boolean;
}

export const useOptimizedImage = (
  imageUrl: string | null,
  options: UseOptimizedImageOptions = {}
): UseOptimizedImageResult => {
  const { preload = true, lazy = false, onLoad, onError } = options;
  
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInView, setIsInView] = useState(!lazy);
  
  const imgRef = useRef<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setSrc(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (lazy && !isInView) {
      return;
    }

    const loadImage = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (preload) {
          const img = new Image();
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              imgRef.current = img;
              resolve();
            };
            img.onerror = () => {
              reject(new Error(`Failed to load image: ${imageUrl}`));
            };
            img.src = imageUrl;
          });
        }

        setSrc(imageUrl);
        setIsLoading(false);
        onLoad?.();
      } catch (err) {
        const loadError = err instanceof Error ? err : new Error('Unknown error loading image');
        setError(loadError);
        setIsLoading(false);
        onError?.(loadError);
      }
    };

    loadImage();
  }, [imageUrl, preload, lazy, isInView, onLoad, onError]);

  useEffect(() => {
    if (!lazy || !imageUrl) {
      return;
    }

    const element = document.createElement('div');
    element.setAttribute('data-image-observer', imageUrl);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, imageUrl]);

  return {
    src,
    isLoading,
    error,
    isInView,
  };
};

export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map((url) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
      img.src = url;
    });
  });

  await Promise.allSettled(promises);
};
