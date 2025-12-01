import React, { useRef, useEffect } from 'react';
import { cn } from '@/shared/lib/utils';
import { announceToScreenReader } from '@/shared/lib/screenReaderAnnouncements';
import type { AestheticOption } from './CollapsibleAestheticOption';

export interface ColorSwatchGridProps {
  options: AestheticOption[];
  onSelect: (value: string) => void;
  currentValue: string;
}

export const ColorSwatchGrid: React.FC<ColorSwatchGridProps> = ({
  options,
  onSelect,
  currentValue,
}) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelect = (value: string, label: string): void => {
    onSelect(value);
    announceToScreenReader(`${label} color scheme selected`, 'polite');
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
        'grid-cols-2 xs:grid-cols-3 sm:grid-cols-3',
        'touch-manipulation'
      )}
      role="radiogroup"
      aria-label="Color scheme options"
    >
      {options.map((option, index) => {
        const isSelected = option.value === currentValue;

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
            aria-label={`${option.label} color scheme${isSelected ? ', selected' : ''}`}
            tabIndex={isSelected ? 0 : -1}
          >
            <div
              className={cn(
                'aspect-square w-full flex items-center justify-center',
                'min-h-[100px] xs:min-h-[120px] sm:min-h-[140px]',
                'transition-transform duration-300 ease-out motion-reduce:transition-none',
                'group-hover:scale-105 motion-reduce:group-hover:scale-100',
                'group-active:scale-100'
              )}
              style={{
                background: option.previewSrc || 'linear-gradient(135deg, #808080 0%, #C0C0C0 100%)',
              }}
            >
              <div
                className={cn(
                  'absolute inset-0 bg-primary/0 group-hover:bg-primary/10',
                  'transition-colors duration-300 ease-out motion-reduce:transition-none',
                  'pointer-events-none',
                  isSelected && 'bg-primary/20'
                )}
                aria-hidden="true"
              />
            </div>

            <div className="p-2 xs:p-3 bg-background/98 backdrop-blur-sm border-t border-border/50">
              <span
                className={cn(
                  'text-xs xs:text-sm sm:text-base font-semibold text-center block leading-tight',
                  'transition-colors duration-200 motion-reduce:transition-none',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {option.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
