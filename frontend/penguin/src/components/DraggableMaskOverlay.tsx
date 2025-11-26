import * as React from 'react';
import type { MaskMetadata, BoundingBox } from '@/store/segmentationStore';
import { useSegmentationStore } from '@/store/segmentationStore';
import { combineImageEditFilters, constrainBoundingBox } from '@/lib/maskUtils';
import { MaskTooltip } from './MaskTooltip';

interface DraggableMaskOverlayProps {
  mask: MaskMetadata;
  isSelected: boolean;
  isHovered: boolean;
  imageSize: { width: number; height: number };
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  imageContainerRef?: React.RefObject<HTMLElement>;
  /**
   * Display scale between the logical image coordinates and the rendered pixels.
   * Defaults to 1 (no scaling).
   */
  displayScale?: number;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export const DraggableMaskOverlay: React.FC<DraggableMaskOverlayProps> = React.memo(({
  mask,
  isSelected,
  isHovered,
  imageSize,
  onClick,
  onMouseEnter,
  onMouseLeave,
  imageContainerRef,
  displayScale = 1,
}) => {
  const {
    maskManipulation,
    startDragMask,
    updateMaskPosition,
    endDragMask,
    startResizeMask,
    updateMaskSize,
    endResizeMask,
    isAnyMaskDragging,
  } = useSegmentationStore();

  const manipState = maskManipulation.get(mask.mask_id);
  const scale = displayScale > 0 ? displayScale : 1;
  const bbox = manipState?.currentBoundingBox || mask.bounding_box;
  const displayBBox = React.useMemo(() => ({
    x1: bbox.x1 * scale,
    y1: bbox.y1 * scale,
    x2: bbox.x2 * scale,
    y2: bbox.y2 * scale,
  }), [bbox.x1, bbox.y1, bbox.x2, bbox.y2, scale]);
  const transform = manipState?.transform;

  // Drag state (refs to avoid render loops)
  const dragSessionRef = React.useRef<{
    startX: number;
    startY: number;
    startBBox: BoundingBox;
    lastApplied: { x: number; y: number };
  } | null>(null);
  const draggingRef = React.useRef(false);

  // Resize state
  const resizeSessionRef = React.useRef<{
    startX: number;
    startY: number;
    startBBox: BoundingBox;
    handle: ResizeHandle;
  } | null>(null);
  const resizingRef = React.useRef(false);

  // RAF batching for drag
  const pendingDeltaRef = React.useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const rafRef = React.useRef<number | null>(null);

  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = React.useRef<number | null>(null);

  // Helpers
  const setTooltipSafe = (visible: boolean, pos?: { x: number; y: number }) => {
    if (visible && !draggingRef.current && !resizingRef.current) {
      if (pos) setTooltipPosition(pos);
      setTooltipVisible(true);
    } else if (!visible) {
      setTooltipVisible(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent): void => {
    e.stopPropagation();
    if (!isSelected) {
      onClick(e);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    dragSessionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startBBox: { ...bbox },
      lastApplied: { x: bbox.x1, y: bbox.y1 },
    };
    pendingDeltaRef.current = { dx: 0, dy: 0 };
    startDragMask(mask.mask_id);
    setTooltipVisible(false);
  };

  const handleResizeStart = (e: React.PointerEvent, handle: ResizeHandle): void => {
    e.stopPropagation();
    e.preventDefault();
    if (!isSelected) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizingRef.current = true;
    resizeSessionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startBBox: { ...bbox },
      handle,
    };
    startResizeMask(mask.mask_id, handle);
    setTooltipVisible(false);
  };

  // Global pointer listeners for drag/resize
  React.useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      // Drag
      if (draggingRef.current && dragSessionRef.current) {
        const session = dragSessionRef.current;
        const dx = (e.clientX - session.startX) / scale;
        const dy = (e.clientY - session.startY) / scale;
        const width = session.startBBox.x2 - session.startBBox.x1;
        const height = session.startBBox.y2 - session.startBBox.y1;

        const newBbox = {
          x1: session.startBBox.x1 + dx,
          y1: session.startBBox.y1 + dy,
          x2: session.startBBox.x1 + dx + width,
          y2: session.startBBox.y1 + dy + height,
        };

        const constrained = constrainBoundingBox(newBbox, imageSize);
        const incX = constrained.x1 - session.lastApplied.x;
        const incY = constrained.y1 - session.lastApplied.y;

        if (incX !== 0 || incY !== 0) {
          pendingDeltaRef.current = {
            dx: pendingDeltaRef.current.dx + incX,
            dy: pendingDeltaRef.current.dy + incY,
          };

          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(() => {
              rafRef.current = null;
              const { dx: pdx, dy: pdy } = pendingDeltaRef.current;
              pendingDeltaRef.current = { dx: 0, dy: 0 };
              if (pdx !== 0 || pdy !== 0) {
                updateMaskPosition(mask.mask_id, pdx, pdy);
                session.lastApplied = {
                  x: session.lastApplied.x + pdx,
                  y: session.lastApplied.y + pdy,
                };
              }
            });
          }
        }
      }

      // Resize
      if (resizingRef.current && resizeSessionRef.current) {
        const session = resizeSessionRef.current;
        const minSize = 8 / scale;
        const startWidth = session.startBBox.x2 - session.startBBox.x1;
        const startHeight = session.startBBox.y2 - session.startBBox.y1;
        const aspect = startWidth / Math.max(1, startHeight);

        // Deltas
        const dx = (e.clientX - session.startX) / scale;
        const dy = (e.clientY - session.startY) / scale;

        // Scale from handle by anchoring the opposite corner and then recenter to keep mask aligned
        let newBbox = { ...session.startBBox };
        switch (session.handle) {
          case 'nw':
            newBbox.x1 = session.startBBox.x1 + dx;
            newBbox.y1 = session.startBBox.y1 + dy;
            break;
          case 'ne':
            newBbox.x2 = session.startBBox.x2 + dx;
            newBbox.y1 = session.startBBox.y1 + dy;
            break;
          case 'sw':
            newBbox.x1 = session.startBBox.x1 + dx;
            newBbox.y2 = session.startBBox.y2 + dy;
            break;
          case 'se':
            newBbox.x2 = session.startBBox.x2 + dx;
            newBbox.y2 = session.startBBox.y2 + dy;
            break;
        }

        // Enforce aspect ratio and min size
        const width = newBbox.x2 - newBbox.x1;
        const height = newBbox.y2 - newBbox.y1;
        const targetHeight = width / aspect;
        const targetWidth = height * aspect;

        if (Math.abs(targetHeight - height) > Math.abs(targetWidth - width)) {
          const deltaH = targetHeight - height;
          if (session.handle === 'nw' || session.handle === 'ne') newBbox.y1 -= deltaH;
          else newBbox.y2 += deltaH;
        } else {
          const deltaW = targetWidth - width;
          if (session.handle === 'nw' || session.handle === 'sw') newBbox.x1 -= deltaW;
          else newBbox.x2 += deltaW;
        }

        if (newBbox.x2 - newBbox.x1 < minSize) {
          if (session.handle === 'nw' || session.handle === 'sw') newBbox.x1 = newBbox.x2 - minSize;
          else newBbox.x2 = newBbox.x1 + minSize;
        }
        if (newBbox.y2 - newBbox.y1 < minSize) {
          if (session.handle === 'nw' || session.handle === 'ne') newBbox.y1 = newBbox.y2 - minSize;
          else newBbox.y2 = newBbox.y1 + minSize;
        }

        // Recenter to preserve the middle of the box (pivot at center)
        const cx = (session.startBBox.x1 + session.startBBox.x2) / 2;
        const cy = (session.startBBox.y1 + session.startBBox.y2) / 2;
        const halfW = (newBbox.x2 - newBbox.x1) / 2;
        const halfH = (newBbox.y2 - newBbox.y1) / 2;
        newBbox = {
          x1: cx - halfW,
          x2: cx + halfW,
          y1: cy - halfH,
          y2: cy + halfH,
        };

        const constrained = constrainBoundingBox(newBbox, imageSize);
        updateMaskSize(mask.mask_id, constrained);
        resizeSessionRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startBBox: constrained,
          handle: session.handle,
        };
      }
    };

    const onPointerUp = () => {
      if (draggingRef.current && dragSessionRef.current) {
        draggingRef.current = false;
        dragSessionRef.current = null;
        pendingDeltaRef.current = { dx: 0, dy: 0 };
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        endDragMask(mask.mask_id, imageSize);
      }

      if (resizingRef.current && resizeSessionRef.current) {
        resizingRef.current = false;
        resizeSessionRef.current = null;
        endResizeMask(mask.mask_id, imageSize);
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [endDragMask, endResizeMask, imageSize, mask.mask_id, scale, updateMaskPosition, updateMaskSize]);

  // Tooltip cleanup
  React.useEffect(() => () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  }, []);

  const isManipulating = draggingRef.current || resizingRef.current || manipState?.isDragging || manipState?.isResizing || isAnyMaskDragging;

  const handleMouseEnterWithTooltip = (e: React.PointerEvent): void => {
    if (draggingRef.current || resizingRef.current || isManipulating) return;
    onMouseEnter();
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltipSafe(true, { x: e.clientX, y: e.clientY });
  };

  const handleMouseMoveTooltip = (e: React.PointerEvent): void => {
    if (!draggingRef.current && !resizingRef.current && !isManipulating && tooltipVisible) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeaveWithTooltip = (): void => {
    if (draggingRef.current || resizingRef.current || isManipulating) return;
    onMouseLeave();
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      tooltipTimeoutRef.current = null;
    }, 150);
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${displayBBox.x1}px`,
    top: `${displayBBox.y1}px`,
    width: `${displayBBox.x2 - displayBBox.x1}px`,
    height: `${displayBBox.y2 - displayBBox.y1}px`,
    opacity: isSelected ? 0.4 : isHovered ? 0.35 : 0.15,
    backgroundColor: 'transparent',
    transition: (manipState?.isDragging || manipState?.isResizing)
      ? 'none'
      : 'opacity 120ms ease, left 160ms ease, top 160ms ease, width 160ms ease, height 160ms ease',
    cursor: isSelected ? (draggingRef.current ? 'grabbing' : 'grab') : 'pointer',
    filter: transform ? combineImageEditFilters(transform.imageEdits) : undefined,
  };

  const handlePositions: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
    { handle: 'nw', style: { top: -6, left: -6 }, cursor: 'nw-resize' },
    { handle: 'ne', style: { top: -6, right: -6 }, cursor: 'ne-resize' },
    { handle: 'sw', style: { bottom: -6, left: -6 }, cursor: 'sw-resize' },
    { handle: 'se', style: { bottom: -6, right: -6 }, cursor: 'se-resize' },
  ];

  return (
    <>
      <div
        style={style}
        onPointerDown={handlePointerDown}
        onPointerEnter={handleMouseEnterWithTooltip}
        onPointerLeave={handleMouseLeaveWithTooltip}
        onPointerMove={handleMouseMoveTooltip}
        role="button"
        aria-label={`Mask for ${mask.label}, ${isSelected ? 'selected, draggable' : 'click to select'}`}
        aria-grabbed={manipState?.isDragging}
        tabIndex={isSelected ? 0 : -1}
      >
        {isSelected && handlePositions.map(({ handle, style: hStyle, cursor }) => (
          <div
            key={handle}
            className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full hover:scale-125 transition-transform"
            style={{ ...hStyle, cursor }}
            onPointerDown={(e) => handleResizeStart(e, handle)}
            role="button"
            aria-label={`Resize handle ${handle}`}
            tabIndex={-1}
          />
        ))}
      </div>

      <MaskTooltip
        mask={mask}
        visible={tooltipVisible}
        position={tooltipPosition}
        imageContainerRef={imageContainerRef}
        boundingBox={displayBBox}
      />
    </>
  );
});

DraggableMaskOverlay.displayName = 'DraggableMaskOverlay';
