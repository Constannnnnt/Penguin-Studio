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
    <div className="space-y-4">
      <div className="industrial-panel p-1">
        <button
          ref={buttonRef}
          id={`${sectionId}-button`}
          type="button"
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full flex items-center justify-between rounded-sm',
            'p-3 min-h-[48px]',
            'bg-background/40 hover:bg-primary/5 active:bg-primary/10',
            'transition-all duration-300 ease-out group',
            'border border-transparent hover:border-primary/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'touch-manipulation'
          )}
          aria-expanded={isExpanded}
          aria-controls={`${sectionId}-content`}
          aria-label={`${label} section, currently ${currentValue}. Press Enter or Space to ${isExpanded ? 'collapse' : 'expand'}.`}
        >
          <div className="flex flex-col items-start gap-1 text-left min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-heading group-hover:text-primary transition-colors">
              {label}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors font-mono">
              {currentLabel}
            </span>
          </div>

          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded border border-primary/10 bg-primary/5 transition-all duration-300",
            isExpanded ? "border-primary/40 bg-primary/10" : "group-hover:border-primary/30"
          )}>
            <ChevronDown
              className={cn(
                'h-3 w-3 text-primary/60',
                'transition-transform duration-300 ease-out',
                isExpanded && 'rotate-180 text-primary'
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        <div
          ref={contentRef}
          id={`${sectionId}-content`}
          role="region"
          aria-labelledby={`${sectionId}-button`}
          className={cn(
            'overflow-hidden',
            'transition-all duration-300 ease-in-out',
            isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className={cn(
            'p-3 border-t border-primary/10',
            'transition-all duration-300 ease-out',
            isExpanded ? 'translate-y-0' : '-translate-y-2'
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
