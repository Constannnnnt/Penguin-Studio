import * as React from 'react';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';
import { validateSliderValue } from '@/shared/lib/validation';
import { throttle } from '@/shared/lib/performance';

export interface DiscreteSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: readonly string[];
  className?: string;
  disabled?: boolean;
}

/**
 * DiscreteSlider Component
 * 
 * A slider control with discrete value steps and visual indicators.
 * 
 * Features:
 * - Discrete steps corresponding to option labels
 * - Visual indicators at each step
 * - Current value display as text below slider
 * - Keyboard navigation support (arrow keys, home, end)
 * - Touch-friendly interactions for mobile devices
 * - Full accessibility support with ARIA labels and screen reader compatibility
 * 
 * Accessibility Features:
 * - ARIA slider role with proper attributes
 * - Keyboard navigation (Left/Right arrows, Home/End)
 * - Screen reader announcements for value changes
 * - Focus management and visual indicators
 * - Proper labeling and descriptions
 */
export const DiscreteSlider = React.memo<DiscreteSliderProps>(({
  label,
  value,
  onChange,
  options,
  className,
  disabled = false,
}) => {
  const sliderId = React.useId();
  const labelId = `${sliderId}-label`;
  const valueDisplayId = `${sliderId}-value`;
  
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // Validate and clamp value with enhanced error handling
  const clampedValue = React.useMemo(() => {
    const validation = validateSliderValue(value, {
      min: 0,
      max: options.length - 1,
      fieldName: label,
    });
    
    if (!validation.valid && import.meta.env.DEV) {
      console.warn(`DiscreteSlider validation error for ${label}:`, validation.error);
    }
    
    return Math.max(0, Math.min(options.length - 1, Math.round(value)));
  }, [value, options.length, label]);
  
  const currentLabel = options[clampedValue] || options[0];

  /**
   * Calculate position percentage for the thumb
   */
  const getThumbPosition = React.useCallback((val: number): number => {
    if (options.length <= 1) return 0;
    return (val / (options.length - 1)) * 100;
  }, [options.length]);

  /**
   * Calculate value from mouse/touch position
   */
  const getValueFromPosition = React.useCallback((clientX: number): number => {
    if (!trackRef.current) return clampedValue;
    
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = Math.round(percentage * (options.length - 1));
    
    return Math.max(0, Math.min(options.length - 1, newValue));
  }, [options.length, clampedValue]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent): void => {
    if (disabled) return;

    let newValue = clampedValue;
    let handled = true;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(options.length - 1, clampedValue + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(0, clampedValue - 1);
        break;
      case 'Home':
        newValue = 0;
        break;
      case 'End':
        newValue = options.length - 1;
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();
      if (newValue !== clampedValue) {
        onChange(newValue);
      }
    }
  }, [clampedValue, options.length, onChange, disabled]);

  /**
   * Handle mouse down on track or thumb
   */
  const handleMouseDown = React.useCallback((event: React.MouseEvent): void => {
    if (disabled) return;
    
    event.preventDefault();
    setIsDragging(true);
    
    const newValue = getValueFromPosition(event.clientX);
    if (newValue !== clampedValue) {
      onChange(newValue);
    }

    // Focus the slider for keyboard navigation
    sliderRef.current?.focus();
  }, [disabled, getValueFromPosition, clampedValue, onChange]);

  /**
   * Handle mouse move during drag (throttled for performance)
   */
  const handleMouseMove = React.useCallback(
    throttle((event: MouseEvent): void => {
      if (!isDragging || disabled) return;
      
      const newValue = getValueFromPosition(event.clientX);
      if (newValue !== clampedValue) {
        onChange(newValue);
      }
    }, 16), // Throttle to ~60fps
    [isDragging, disabled, getValueFromPosition, clampedValue, onChange]
  );

  /**
   * Handle mouse up to end drag
   */
  const handleMouseUp = React.useCallback((): void => {
    setIsDragging(false);
  }, []);

  /**
   * Handle touch events for mobile support
   */
  const handleTouchStart = React.useCallback((event: React.TouchEvent): void => {
    if (disabled) return;
    
    event.preventDefault();
    setIsDragging(true);
    
    const touch = event.touches[0];
    const newValue = getValueFromPosition(touch.clientX);
    if (newValue !== clampedValue) {
      onChange(newValue);
    }

    // Focus the slider for accessibility
    sliderRef.current?.focus();
  }, [disabled, getValueFromPosition, clampedValue, onChange]);

  const handleTouchMove = React.useCallback(
    throttle((event: TouchEvent): void => {
      if (!isDragging || disabled) return;
      
      event.preventDefault();
      const touch = event.touches[0];
      const newValue = getValueFromPosition(touch.clientX);
      if (newValue !== clampedValue) {
        onChange(newValue);
      }
    }, 16), // Throttle to ~60fps
    [isDragging, disabled, getValueFromPosition, clampedValue, onChange]
  );

  const handleTouchEnd = React.useCallback((): void => {
    setIsDragging(false);
  }, []);

  /**
   * Set up global mouse/touch event listeners during drag
   */
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const thumbPosition = getThumbPosition(clampedValue);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label */}
      <Label 
        id={labelId} 
        htmlFor={sliderId}
        className="block text-sm sm:text-base font-medium"
      >
        {label}
      </Label>

      {/* Slider Container */}
      <div className="relative">
        {/* Slider Track */}
        <div
          ref={sliderRef}
          id={sliderId}
          className={cn(
            'relative w-full h-6 cursor-pointer focus:outline-none',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          role="slider"
          aria-labelledby={labelId}
          aria-describedby={valueDisplayId}
          aria-valuemin={0}
          aria-valuemax={options.length - 1}
          aria-valuenow={clampedValue}
          aria-valuetext={currentLabel}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {/* Track Background */}
          <div
            ref={trackRef}
            className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-secondary rounded-full"
          >
            {/* Active Track */}
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${thumbPosition}%` }}
            />
          </div>

          {/* Step Indicators */}
          {options.map((_, index) => {
            const position = getThumbPosition(index);
            const isActive = index <= clampedValue;
            
            return (
              <div
                key={index}
                className={cn(
                  'absolute top-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 transition-all duration-150',
                  isActive 
                    ? 'bg-primary border-primary' 
                    : 'bg-background border-muted-foreground/30'
                )}
                style={{ left: `${position}%` }}
                aria-hidden="true"
              />
            );
          })}

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-1/2 w-5 h-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-primary bg-background transition-all duration-150 shadow-sm',
              'hover:scale-110 active:scale-95',
              isFocused && 'ring-2 ring-ring ring-offset-2',
              isDragging && 'scale-110 shadow-md',
              disabled && 'cursor-not-allowed'
            )}
            style={{ left: `${thumbPosition}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Current Value Display */}
      <div 
        id={valueDisplayId}
        className="text-center text-sm text-muted-foreground"
        aria-live="polite"
      >
        {currentLabel}
      </div>
    </div>
  );
});

DiscreteSlider.displayName = 'DiscreteSlider';