import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/shared/lib/utils';
import { announceToScreenReader } from '@/shared/lib/screenReaderAnnouncements';
import type { AestheticOption } from './CollapsibleAestheticOption';

export interface PreviewGridProps {
  options: AestheticOption[];
  onSelect: (value: string) => void;
  currentValue: string;
}

export const PreviewGrid: React.FC<PreviewGridProps> = ({
  options,
  onSelect,
  currentValue,
}) => {
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set(options.map(o => o.value)));
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleImageError = (value: string): void => {
    setLoadErrors((prev) => new Set(prev).add(value));
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  };

  const handleImageLoad = (value: string): void => {
    setLoadErrors((prev) => {
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  };

  const handleSelect = (value: string, label: string): void => {
    onSelect(value);
    announceToScreenReader(`${label} selected`, 'polite');
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number): void => {
    let newIndex = index;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (index + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (index - 1 + options.length) % options.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSelect(options[index].value, options[index].label);
        return;
      default:
        return;
    }

    buttonRefs.current[newIndex]?.focus();
  };

  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, options.length);
  }, [options.length]);

  return (
    <div
      className={cn(
        'grid gap-3 xs:gap-4',
        'grid-cols-2 sm:grid-cols-2 md:grid-cols-3',
        'touch-manipulation'
      )}
      role="radiogroup"
      aria-label="Preview options"
    >
      {options.map((option, index) => {
        const isSelected = option.value === currentValue;
        const hasError = loadErrors.has(option.value);
        const isLoading = loadingImages.has(option.value);

        return (
          <button
            key={option.value}
            ref={(el) => { buttonRefs.current[index] = el; }}
            type="button"
            onClick={() => handleSelect(option.value, option.label)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'relative group rounded-md overflow-hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'transition-all duration-300 ease-out motion-reduce:transition-none',
              'hover:shadow-lg motion-reduce:hover:shadow-none active:scale-95',
              'min-h-[44px] touch-manipulation',
              isSelected && 'ring-2 ring-primary shadow-md'
            )}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${option.label}${isSelected ? ', selected' : ''}`}
            tabIndex={isSelected ? 0 : -1}
          >
            <div
              className={cn(
                'aspect-[4/3] w-full bg-muted flex items-center justify-center',
                'min-h-[120px] xs:min-h-[140px] sm:min-h-[160px]',
                'transition-transform duration-300 ease-out motion-reduce:transition-none',
                'group-hover:scale-105 motion-reduce:group-hover:scale-100',
                'group-active:scale-100'
              )}
            >
              {!hasError && option.previewSrc ? (
                <>
                  <img
                    src={option.previewSrc}
                    alt={`Preview of ${option.label} style`}
                    className={cn(
                      'w-full h-full object-cover',
                      'transition-opacity duration-300',
                      isLoading ? 'opacity-0' : 'opacity-100'
                    )}
                    loading="lazy"
                    onError={() => handleImageError(option.value)}
                    onLoad={() => handleImageLoad(option.value)}
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div
                        className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin motion-reduce:animate-none"
                        role="status"
                        aria-label={`Loading ${option.label} preview image`}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-2 xs:p-4 text-center">
                  <div className="w-8 h-8 xs:w-12 xs:h-12 mb-1 xs:mb-2 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 xs:w-6 xs:h-6 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs xs:text-sm font-semibold text-muted-foreground leading-tight" aria-hidden="true">
                    {option.label}
                  </span>
                </div>
              )}
            </div>

            <div
              className={cn(
                'absolute inset-0 bg-primary/0 group-hover:bg-primary/10',
                'transition-colors duration-300 ease-out motion-reduce:transition-none',
                'pointer-events-none',
                isSelected && 'bg-primary/20'
              )}
              aria-hidden="true"
            />

            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 p-2 xs:p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent',
                'transition-opacity duration-300 ease-out motion-reduce:transition-none',
                'opacity-0 group-hover:opacity-100 motion-reduce:opacity-100',
                isSelected && 'opacity-100'
              )}
            >
              <span className="text-xs xs:text-sm sm:text-base text-white font-semibold leading-tight drop-shadow-lg">
                {option.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
