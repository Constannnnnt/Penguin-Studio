import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { announceToScreenReader } from '@/shared/lib/screenReaderAnnouncements';

export interface AestheticOption {
  value: string;
  label: string;
  previewSrc?: string;
  colorValues?: ColorAdjustments;
}

export interface ColorAdjustments {
  saturation: number;
  temperature: number;
  tint: number;
  vibrance: number;
}

export interface CollapsibleAestheticOptionProps {
  label: string;
  currentValue: string;
  options: AestheticOption[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  renderPreview: 'image' | 'color-swatch';
  children?: React.ReactNode;
}

export const CollapsibleAestheticOption: React.FC<CollapsibleAestheticOptionProps> = ({
  label,
  currentValue,
  isExpanded,
  onToggle,
  children,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousExpandedRef = useRef<boolean>(isExpanded);
  const sectionId = label.toLowerCase().replace(/\s+/g, '-');

  const currentLabel = currentValue
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  useEffect(() => {
    if (previousExpandedRef.current !== isExpanded) {
      const message = isExpanded 
        ? `${label} section expanded` 
        : `${label} section collapsed`;
      announceToScreenReader(message, 'polite');
      previousExpandedRef.current = isExpanded;
    }
  }, [isExpanded, label]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="space-y-2">
      <button
        ref={buttonRef}
        id={`${sectionId}-button`}
        type="button"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center justify-between rounded-md',
          'p-2 xs:p-3 min-h-[44px]',
          'bg-background hover:bg-accent/50 active:bg-accent/70',
          'transition-all duration-300 ease-out motion-reduce:transition-none',
          'hover:shadow-sm motion-reduce:hover:shadow-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'touch-manipulation',
          'group'
        )}
        aria-expanded={isExpanded}
        aria-controls={`${sectionId}-content`}
        aria-label={`${label} section, currently ${currentLabel}. Press Enter or Space to ${isExpanded ? 'collapse' : 'expand'}.`}
      >
        <div className="flex items-center gap-2 xs:gap-3 flex-1 text-left min-w-0">
          <span className="text-xs xs:text-sm font-medium truncate">{label}</span>
          <span className="text-xs xs:text-sm text-muted-foreground transition-colors duration-200 motion-reduce:transition-none truncate">
            {currentLabel}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground',
            'transition-transform duration-300 ease-out motion-reduce:transition-none',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      <div
        ref={contentRef}
        id={`${sectionId}-content`}
        role="region"
        aria-labelledby={`${sectionId}-button`}
        className={cn(
          'overflow-hidden',
          'transition-all duration-300 ease-out motion-reduce:transition-none',
          isExpanded ? 'max-h-[600px] xs:max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
        style={{
          transitionProperty: 'max-height, opacity',
        }}
      >
        <div className={cn(
          'pt-1 xs:pt-2',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          isExpanded ? 'translate-y-0' : '-translate-y-2 motion-reduce:translate-y-0'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
};
