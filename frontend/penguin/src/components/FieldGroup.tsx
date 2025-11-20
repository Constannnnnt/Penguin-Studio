import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FieldGroupProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  columns?: 2 | 3;
  className?: string;
}

/**
 * FieldGroup Component
 * 
 * Reusable button grid for selecting options with full accessibility support
 * 
 * Accessibility Features :
 * - Keyboard navigation with arrow keys
 * - Enter/Space activation for all buttons
 * - ARIA labels and roles
 * - Visible focus indicators (2px outline)
 * - Logical tab order
 * 
 * Performance optimizations:
 * - Memoized to prevent unnecessary re-renders
 * - Only re-renders when value or options change
 */
export const FieldGroup = React.memo<FieldGroupProps>(({
  label,
  options,
  value,
  onChange,
  columns = 2,
  className,
}) => {
  const groupId = React.useId();
  const labelId = `${groupId}-label`;

  /**
   * Handle keyboard navigation within button grid
   */
  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number): void => {
    const totalOptions = options.length;
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (currentIndex + 1) % totalOptions;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = (currentIndex - 1 + totalOptions) % totalOptions;
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + columns, totalOptions - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - columns, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = totalOptions - 1;
        break;
      default:
        return;
    }

    // Focus the new button - find parent container and query buttons
    const container = (event.target as HTMLElement).closest('[role="group"]');
    if (container) {
      const buttons = container.querySelectorAll('button');
      (buttons[newIndex] as HTMLButtonElement)?.focus();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label id={labelId} className="block text-sm sm:text-base">{label}</Label>
      <div
        className={cn(
          'grid gap-2',
          // Mobile (< 768px): Always 2 columns for better space usage
          'grid-cols-2',
          // Tablet (768px - 1919px): Use specified columns 
          columns === 2 && 'md:grid-cols-2',
          columns === 3 && 'md:grid-cols-3',
          // Desktop (≥ 1920px): Maintain specified columns with optimal spacing
          columns === 2 && '2xl:grid-cols-2',
          columns === 3 && '2xl:grid-cols-3'
        )}
        role="group"
        aria-labelledby={labelId}
      >
        {options.map((option, index) => {
          const isSelected = value === option;
          
          return (
            <Button
              key={option}
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => onChange(option)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'w-full',
                // Minimum touch target size (44x44px) for mobile 
                'min-h-[44px]',
                // Responsive text sizing
                'text-xs sm:text-sm md:text-sm 2xl:text-base',
                // Responsive padding
                'px-2 sm:px-3 md:px-4',
                // Active state highlighting
                isSelected && 'ring-2 ring-ring ring-offset-2'
              )}
              type="button"
              role="button"
              aria-pressed={isSelected}
              aria-label={`${label}: ${option}${isSelected ? ' (selected)' : ''}`}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimal re-render prevention
  return (
    prevProps.value === nextProps.value &&
    prevProps.label === nextProps.label &&
    prevProps.columns === nextProps.columns &&
    prevProps.options === nextProps.options
  );
});

FieldGroup.displayName = 'FieldGroup';
