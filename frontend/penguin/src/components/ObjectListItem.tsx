import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SceneObject } from '@/types';

interface ObjectListItemProps {
  object: SceneObject;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}

/**
 * Individual object list item component
 * 
 * Accessibility Features
 * - Keyboard activation with Enter/Space
 * - Visible focus indicators (2px ring)
 * - ARIA labels and selected state
 * - Touch-friendly size (44px minimum)
 * - Logical tab order
 * 
 */
export const ObjectListItem = React.memo<ObjectListItemProps>(
  ({ object, index, isSelected, onSelect, onRemove }) => {
    const displayText = object.description || 'Unnamed Object';

    /**
     * Handle keyboard activation
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(index);
      }
    };

    /**
     * Handle remove button keyboard activation
     */
    const handleRemoveKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onRemove(index);
      }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Object ${index + 1}: ${displayText}${isSelected ? ' (selected)' : ''}`}
        aria-selected={isSelected}
        onClick={() => onSelect(index)}
        onKeyDown={handleKeyDown}
        className={cn(
          'group flex items-center justify-between rounded-md cursor-pointer transition-colors',
          // Responsive padding
          'p-2 sm:p-3 md:p-3',
          // Focus indicator
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Touch-friendly size 
          'min-h-[44px]',
          isSelected && 'bg-muted border-2 border-primary'
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm md:text-sm font-medium truncate">
            Object {index + 1}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {displayText}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          onKeyDown={handleRemoveKeyDown}
          aria-label={`Remove object ${index + 1}`}
          className="ml-2 h-8 w-8 sm:h-9 sm:w-9 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  },
  (prev, next) =>
    prev.object === next.object &&
    prev.isSelected === next.isSelected &&
    prev.index === next.index
);

ObjectListItem.displayName = 'ObjectListItem';
