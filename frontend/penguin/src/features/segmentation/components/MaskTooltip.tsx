import * as React from 'react';
import type { MaskMetadata } from '@/features/segmentation/store/segmentationStore';
import { cn } from '@/shared/lib/utils';

interface MaskTooltipProps {
  mask: MaskMetadata;
  visible: boolean;
  position: { x: number; y: number };
  imageContainerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Optional pre-calculated bounding box in the same coordinate space as the container ref.
   * When provided, tooltip positioning respects this box instead of the raw mask metadata.
   */
  boundingBox?: { x1: number; y1: number; x2: number; y2: number };
}

export const MaskTooltip: React.FC<MaskTooltipProps> = ({
  mask,
  visible,
  position,
  imageContainerRef,
  boundingBox,
}) => {
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = React.useState(position);
  const lastPositionRef = React.useRef(position);

  const tooltipText = mask.promptText || mask.label;

  React.useEffect(() => {
    if (!visible || !tooltipRef.current || !imageContainerRef?.current) {
      if (lastPositionRef.current.x !== position.x || lastPositionRef.current.y !== position.y) {
        lastPositionRef.current = position;
        setAdjustedPosition(position);
      }
      return;
    }

    const bbox = boundingBox || mask.bounding_box;
    const tooltip = tooltipRef.current;
    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const offset = 12;
    let newX = position.x + offset;
    let newY = position.y + offset;

    if (newX + tooltipRect.width > containerRect.right) {
      newX = position.x - tooltipRect.width - offset;
    }

    if (newX < containerRect.left) {
      newX = containerRect.left + offset;
    }

    if (newY + tooltipRect.height > containerRect.bottom) {
      newY = position.y - tooltipRect.height - offset;
    }

    if (newY < containerRect.top) {
      newY = containerRect.top + offset;
    }

    const maskLeft = containerRect.left + bbox.x1;
    const maskTop = containerRect.top + bbox.y1;
    const maskRight = containerRect.left + bbox.x2;
    const maskBottom = containerRect.top + bbox.y2;

    const tooltipLeft = newX;
    const tooltipTop = newY;
    const tooltipRight = newX + tooltipRect.width;
    const tooltipBottom = newY + tooltipRect.height;

    const overlapsHorizontally = tooltipLeft < maskRight && tooltipRight > maskLeft;
    const overlapsVertically = tooltipTop < maskBottom && tooltipBottom > maskTop;

    if (overlapsHorizontally && overlapsVertically) {
      const spaceAbove = maskTop - containerRect.top;
      const spaceBelow = containerRect.bottom - maskBottom;
      const spaceLeft = maskLeft - containerRect.left;
      const spaceRight = containerRect.right - maskRight;

      const maxSpace = Math.max(spaceAbove, spaceBelow, spaceLeft, spaceRight);

      if (maxSpace === spaceAbove && spaceAbove >= tooltipRect.height) {
        newY = maskTop - tooltipRect.height - offset;
      } else if (maxSpace === spaceBelow && spaceBelow >= tooltipRect.height) {
        newY = maskBottom + offset;
      } else if (maxSpace === spaceLeft && spaceLeft >= tooltipRect.width) {
        newX = maskLeft - tooltipRect.width - offset;
      } else if (maxSpace === spaceRight && spaceRight >= tooltipRect.width) {
        newX = maskRight + offset;
      }
    }

    if (lastPositionRef.current.x !== newX || lastPositionRef.current.y !== newY) {
      lastPositionRef.current = { x: newX, y: newY };
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [visible, position.x, position.y, boundingBox, mask.bounding_box.x1, mask.bounding_box.y1, mask.bounding_box.x2, mask.bounding_box.y2, imageContainerRef]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-live="polite"
      className={cn(
        'fixed z-[9999] pointer-events-none',
        'px-3 py-1.5 rounded-md',
        'bg-popover text-popover-foreground',
        'border shadow-md',
        'text-sm font-medium',
        'transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {tooltipText}
    </div>
  );
};
