import { useState, useEffect, memo, useMemo } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useSegmentationStore, type MaskMetadata } from '@/features/segmentation/store/segmentationStore';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { PromptSection } from '@/shared/components/PromptSection';
import { MetadataSection } from './MetadataSection';

interface ObjectListItemProps {
  mask: MaskMetadata;
  isSelected: boolean;
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  index: number;
}

const getMaskColor = (maskId: string): string => {
  const colors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];

  const hash = maskId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getSimplifiedLabel = (label: string, index: number): string => {
  // Convert object_0, object_1, etc. to simple numbers with visual indicator
  if (label.match(/^object_\d+$/i)) {
    return `${index + 1}`;
  }
  return label;
};

const areBoundingBoxesEqual = (
  bbox1: { x1: number; y1: number; x2: number; y2: number },
  bbox2: { x1: number; y1: number; x2: number; y2: number },
  threshold: number = 5
): boolean => {
  return (
    Math.abs(bbox1.x1 - bbox2.x1) < threshold &&
    Math.abs(bbox1.y1 - bbox2.y1) < threshold &&
    Math.abs(bbox1.x2 - bbox2.x2) < threshold &&
    Math.abs(bbox1.y2 - bbox2.y2) < threshold
  );
};

const hasActiveImageEdits = (imageEdits: {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  exposure: number;
  vibrance: number;
}): boolean => {
  return (
    imageEdits.brightness !== 0 ||
    imageEdits.contrast !== 0 ||
    imageEdits.saturation !== 0 ||
    imageEdits.hue !== 0 ||
    imageEdits.blur !== 0 ||
    imageEdits.exposure !== 0 ||
    imageEdits.vibrance !== 0
  );
};

const ObjectListItemComponent: React.FC<ObjectListItemProps> = ({
  mask,
  isSelected,
  isHovered,
  onHover,
  onHoverEnd,
  onClick,
  index,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { maskManipulation, resetMaskTransform } = useSegmentationStore();

  const manipState = maskManipulation.get(mask.mask_id);
  const hasMoved = manipState && !areBoundingBoxesEqual(
    manipState.originalBoundingBox,
    manipState.currentBoundingBox
  );
  const hasEdits = manipState && hasActiveImageEdits(manipState.transform.imageEdits);

  useEffect(() => {
    if (isHovered || isSelected) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [isHovered, isSelected]);

  // Memoize expensive calculations
  const borderColor = useMemo(() => getMaskColor(mask.mask_id), [mask.mask_id]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (isInputElement) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextItem = e.currentTarget.nextElementSibling as HTMLElement;
      nextItem?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevItem = e.currentTarget.previousElementSibling as HTMLElement;
      prevItem?.focus();
    }
  };

  return (
    <div
      data-mask-id={mask.mask_id}
      className={cn(
        "relative mb-2 transition-all duration-300 ease-out group",
        "industrial-panel border-l-2",
        "cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1",
        isSelected
          ? "bg-primary/5 border-primary/40 border-l-primary shadow-[0_0_15px_-5px_var(--primary)]"
          : "bg-background/20 border-border/40 hover:bg-background/40 hover:border-primary/30 border-l-transparent",
        isHovered && !isSelected && "bg-background/40 border-primary/20"
      )}
      style={{ borderLeftColor: isSelected ? undefined : borderColor }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={0}
      aria-label={`Object ${index + 1}: ${getSimplifiedLabel(mask.label, index)}`}
      aria-selected={isSelected}
      aria-expanded={isExpanded}
    >
      {/* Selection indicator line */}
      <div className={cn(
        "absolute top-0 right-0 h-px bg-primary/40 transition-all duration-500",
        isSelected ? "w-16 opacity-100" : "w-0 opacity-0"
      )} />

      <div className="flex items-start justify-between p-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none mb-1">
                OBJ_{index + 1}
              </span>
              <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground font-heading">
                {getSimplifiedLabel(mask.label, index)}
              </h4>
            </div>

            {isSelected && (
              <div className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 border border-primary/20">
                <CheckCircle className="h-2.5 w-2.5 text-primary" />
              </div>
            )}

            {hasEdits && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center h-4 w-4 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
                      <Sparkles
                        className="h-2.5 w-2.5 text-amber-500"
                        aria-label="Image edits applied"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="industrial-panel text-[10px] uppercase tracking-wider">
                    <p>Modifications Active</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div
          className="w-12 h-12 rounded border bg-white overflow-hidden"
          style={{ borderColor }}
        >
          <img
            src={mask.mask_url}
            alt={`Mask thumbnail for ${mask.label}`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 border-t border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors group/btn"
        aria-label={isExpanded ? 'Show less details' : 'Show more details'}
        aria-expanded={isExpanded}
      >
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground group-hover/btn:text-foreground transition-colors">
          {isExpanded ? 'Collapse Data' : 'View Metadata'}
        </span>
        <div className={cn(
          "transition-transform duration-300",
          isExpanded ? "rotate-180" : ""
        )}>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground group-hover/btn:text-primary transition-colors" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover/btn:text-primary transition-colors" />
          )}
        </div>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="mt-3 space-y-3 text-sm">
          <PromptSection mask={mask} />
          <MetadataSection mask={mask} />

          {hasMoved && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                resetMaskTransform(mask.mask_id);
              }}
              className="w-full h-8 text-[10px] uppercase tracking-wider font-bold border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
              aria-label={`Reset ${mask.label} to original position`}
            >
              Reset Position
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ObjectListItem = memo(ObjectListItemComponent, (prev, next) => {
  // Only re-render if these specific props change
  return (
    prev.mask.mask_id === next.mask.mask_id &&
    prev.isSelected === next.isSelected &&
    prev.isHovered === next.isHovered &&
    prev.mask.confidence === next.mask.confidence &&
    prev.mask.bounding_box.x1 === next.mask.bounding_box.x1 &&
    prev.mask.bounding_box.y1 === next.mask.bounding_box.y1 &&
    prev.mask.bounding_box.x2 === next.mask.bounding_box.x2 &&
    prev.mask.bounding_box.y2 === next.mask.bounding_box.y2 &&
    prev.mask.objectMetadata === next.mask.objectMetadata
  );
});
