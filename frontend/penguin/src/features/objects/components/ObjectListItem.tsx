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
        "border-l-4 p-3 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isHovered && "bg-accent",
        isSelected && "bg-accent/50"
      )}
      style={{ borderLeftColor: borderColor }}
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
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{getSimplifiedLabel(mask.label, index)}</h4>
            {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
            {hasEdits && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Sparkles 
                      className="h-4 w-4 text-amber-500" 
                      aria-label="Image edits applied"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Image edits applied to this mask</p>
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
        className="flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors"
        aria-label={isExpanded ? 'Show less details' : 'Show more details'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
            Show more
          </>
        )}
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
              className="w-full"
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
