import * as React from 'react';
import type { MaskMetadata, BoundingBox } from '@/features/segmentation/store/segmentationStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { combineImageEditFilters, constrainBoundingBox } from '@/shared/lib/maskUtils';
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
  /**
   * Color for the mask highlight overlay
   */
  maskColor?: string;
  /**
   * Container dimensions for mask rendering (display pixels)
   */
  containerSize?: { width: number; height: number };
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
  maskColor,
  containerSize,
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

  // Ref to the container element for direct DOM manipulation during drag
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Drag state (refs to avoid render loops)
  const dragSessionRef = React.useRef<{
    startX: number;
    startY: number;
    startBBox: BoundingBox;
    currentOffset: { x: number; y: number }; // Current visual offset in pixels
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

  // RAF for smooth visual updates
  const rafRef = React.useRef<number | null>(null);

  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = React.useRef<number | null>(null);

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
      currentOffset: { x: 0, y: 0 },
    };
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
      // Drag - use CSS transform for smooth visual updates
      if (draggingRef.current && dragSessionRef.current && containerRef.current) {
        const session = dragSessionRef.current;
        const width = session.startBBox.x2 - session.startBBox.x1;
        const height = session.startBBox.y2 - session.startBBox.y1;
        
        // Calculate delta in logical coordinates
        const dx = (e.clientX - session.startX) / scale;
        const dy = (e.clientY - session.startY) / scale;

        // Calculate new position and constrain it
        const newBbox = {
          x1: session.startBBox.x1 + dx,
          y1: session.startBBox.y1 + dy,
          x2: session.startBBox.x1 + dx + width,
          y2: session.startBBox.y1 + dy + height,
        };
        const constrained = constrainBoundingBox(newBbox, imageSize);
        
        // Calculate the actual offset after constraint (in display pixels)
        const offsetX = (constrained.x1 - session.startBBox.x1) * scale;
        const offsetY = (constrained.y1 - session.startBBox.y1) * scale;
        
        // Store for use on pointer up
        session.currentOffset = { x: offsetX, y: offsetY };

        // Apply transform directly to DOM - bypasses React for smooth updates
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (containerRef.current && dragSessionRef.current) {
              const { x, y } = dragSessionRef.current.currentOffset;
              containerRef.current.style.transform = `translate(${x}px, ${y}px)`;
            }
          });
        }
      }

      // Resize - still updates store since resize is less frequent and needs accurate sizing
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
        const session = dragSessionRef.current;
        
        // Calculate final position from the visual offset
        const finalDx = session.currentOffset.x / scale;
        const finalDy = session.currentOffset.y / scale;
        
        // Reset the CSS transform before updating state
        if (containerRef.current) {
          containerRef.current.style.transform = '';
        }
        
        // Update store with final delta (only if actually moved)
        if (finalDx !== 0 || finalDy !== 0) {
          updateMaskPosition(mask.mask_id, finalDx, finalDy);
        }
        
        draggingRef.current = false;
        dragSessionRef.current = null;
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

  // Use refs for manipulation state checks to avoid re-renders
  const isGloballyManipulatingRef = React.useRef(false);
  isGloballyManipulatingRef.current = !!(isAnyMaskDragging || manipState?.isDragging || manipState?.isResizing);

  const handleMouseEnterWithTooltip = React.useCallback((e: React.PointerEvent): void => {
    // Don't trigger hover effects if any mask is being manipulated
    if (draggingRef.current || resizingRef.current || isGloballyManipulatingRef.current) return;
    onMouseEnter();
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
  }, [onMouseEnter]);

  // Throttle tooltip position updates using a ref to track last update time
  const lastTooltipUpdateRef = React.useRef(0);
  
  const handleMouseMoveTooltip = React.useCallback((e: React.PointerEvent): void => {
    // Skip if manipulating or tooltip not visible
    if (draggingRef.current || resizingRef.current || isGloballyManipulatingRef.current) return;
    
    // Throttle updates to max 60fps
    const now = Date.now();
    if (now - lastTooltipUpdateRef.current < 16) return;
    lastTooltipUpdateRef.current = now;
    
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeaveWithTooltip = React.useCallback((): void => {
    // Don't trigger leave effects if any mask is being manipulated
    if (draggingRef.current || resizingRef.current || isGloballyManipulatingRef.current) return;
    onMouseLeave();
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      tooltipTimeoutRef.current = null;
    }, 150);
  }, [onMouseLeave]);

  const isCurrentlyManipulating = draggingRef.current || resizingRef.current || manipState?.isDragging || manipState?.isResizing;
  // Disable pointer events on other masks while any mask is being dragged (prevents jumpiness)
  const shouldDisablePointerEvents = isAnyMaskDragging && !isCurrentlyManipulating && !isSelected;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${displayBBox.x1}px`,
    top: `${displayBBox.y1}px`,
    width: `${displayBBox.x2 - displayBBox.x1}px`,
    height: `${displayBBox.y2 - displayBBox.y1}px`,
    opacity: isSelected ? 0.4 : isHovered ? 0.35 : 0.15,
    backgroundColor: 'transparent',
    transition: isCurrentlyManipulating ? 'none' : 'opacity 120ms ease',
    cursor: isSelected ? (isCurrentlyManipulating ? 'grabbing' : 'grab') : 'pointer',
    filter: transform ? combineImageEditFilters(transform.imageEdits) : undefined,
    willChange: isCurrentlyManipulating ? 'transform' : 'auto',
    pointerEvents: shouldDisablePointerEvents ? 'none' : 'auto',
  };

  const handlePositions: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
    { handle: 'nw', style: { top: -6, left: -6 }, cursor: 'nw-resize' },
    { handle: 'ne', style: { top: -6, right: -6 }, cursor: 'ne-resize' },
    { handle: 'sw', style: { bottom: -6, left: -6 }, cursor: 'sw-resize' },
    { handle: 'se', style: { bottom: -6, right: -6 }, cursor: 'se-resize' },
  ];

  // Calculate mask visual layer styling
  const maskOpacity = isSelected ? 0.7 : isHovered ? 0.55 : 0.3;
  const blendMode = (isSelected || isHovered) ? 'screen' : 'multiply';
  
  // Transform values for the mask (from manipulation state)
  const translateX = (transform?.position.x ?? 0) * scale;
  const translateY = (transform?.position.y ?? 0) * scale;
  const scaleX = transform?.scale.width ?? 1;
  const scaleY = transform?.scale.height ?? 1;

  // Mask visual style - positioned relative to container bounds
  const maskVisualStyle: React.CSSProperties | undefined = maskColor && containerSize ? {
    position: 'absolute',
    // Position the mask layer to cover the full container, offset by negative bbox position
    left: -displayBBox.x1,
    top: -displayBBox.y1,
    width: containerSize.width,
    height: containerSize.height,
    backgroundColor: maskColor,
    opacity: maskOpacity,
    mixBlendMode: blendMode,
    filter: 'saturate(1.4) contrast(1.2)',
    maskImage: `url(${mask.mask_url})`,
    WebkitMaskImage: `url(${mask.mask_url})`,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    // Apply the stored transform for position/scale adjustments
    transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
    transformOrigin: 'top left',
    pointerEvents: 'none',
  } : undefined;

  return (
    <>
      <div
        ref={containerRef}
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
        {/* Visual mask layer - moves with the draggable container */}
        {maskVisualStyle && (
          <div style={maskVisualStyle} aria-hidden="true" />
        )}
        
        {/* Resize handles */}
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
