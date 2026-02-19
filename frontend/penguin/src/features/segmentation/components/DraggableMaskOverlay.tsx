import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { MaskMetadata, BoundingBox } from '@/features/segmentation/store/segmentationStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { combineImageEditFilters, constrainBoundingBox } from '@/shared/lib/maskUtils';
import { MaskTooltip } from './MaskTooltip';

interface DraggableMaskOverlayProps {
  mask: MaskMetadata;
  isSelected: boolean;
  isHovered: boolean;
  isHitTarget?: boolean;
  imageSize: { width: number; height: number };
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  imageContainerRef?: React.RefObject<HTMLElement | null>;
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
  /**
   * Disable internal hover tooltip handling (use external hit testing instead)
   */
  disableTooltip?: boolean;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export const DraggableMaskOverlay: React.FC<DraggableMaskOverlayProps> = React.memo(({
  mask,
  isSelected,
  isHovered,
  isHitTarget = false,
  imageSize,
  onClick,
  onMouseEnter,
  onMouseLeave,
  imageContainerRef,
  displayScale = 1,
  maskColor,
  containerSize,
  disableTooltip = false,
}) => {
  // Use targeted selectors to prevent unnecessary re-renders when other store parts change
  const manipState = useSegmentationStore((state) => state.maskManipulation.get(mask.mask_id));

  const {
    startDragMask,
    updateMaskPosition,
    endDragMask,
    startResizeMask,
    updateMaskSize,
    endResizeMask,
    toggleRotationMode,
    startRotateMask,
    updateMaskRotation,
    endRotateMask,
    flipMaskHorizontal,
    flipMaskVertical,
  } = useSegmentationStore(
    useShallow((state) => ({
      startDragMask: state.startDragMask,
      updateMaskPosition: state.updateMaskPosition,
      endDragMask: state.endDragMask,
      startResizeMask: state.startResizeMask,
      updateMaskSize: state.updateMaskSize,
      endResizeMask: state.endResizeMask,
      toggleRotationMode: state.toggleRotationMode,
      startRotateMask: state.startRotateMask,
      updateMaskRotation: state.updateMaskRotation,
      endRotateMask: state.endRotateMask,
      flipMaskHorizontal: state.flipMaskHorizontal,
      flipMaskVertical: state.flipMaskVertical,
    }))
  );

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

  // Rotation state
  const rotateSessionRef = React.useRef<{
    startAngle: number;
    startRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const rotatingRef = React.useRef(false);

  // RAF for smooth visual updates
  const rafRef = React.useRef<number | null>(null);

  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = React.useRef<number | null>(null);

  const isRotationMode = manipState?.isRotationMode ?? false;
  const currentRotation = transform?.rotation ?? 0;
  
  // Use ref to always have latest rotation value for event handlers
  const currentRotationRef = React.useRef(currentRotation);
  currentRotationRef.current = currentRotation;

  const handleDoubleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (isSelected) {
      toggleRotationMode(mask.mask_id);
    }
  };

  // Keyboard handler for flip shortcuts (H = horizontal, V = vertical)
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent): void => {
    if (!isSelected) return;
    
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      flipMaskHorizontal(mask.mask_id);
    } else if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      flipMaskVertical(mask.mask_id);
    } else if (e.key === 'Escape' && isRotationMode) {
      e.preventDefault();
      toggleRotationMode(mask.mask_id);
    }
  }, [isSelected, isRotationMode, mask.mask_id, flipMaskHorizontal, flipMaskVertical, toggleRotationMode]);

  const canInteract = isSelected || isHitTarget;

  const handlePointerDown = (e: React.PointerEvent): void => {
    e.stopPropagation();
    if (!canInteract) return;
    if (!isSelected && isHitTarget) {
      onClick(e);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    
    // In rotation mode, start rotation instead of drag
    if (isRotationMode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        const startRot = currentRotationRef.current;
        
        rotatingRef.current = true;
        rotateSessionRef.current = {
          startAngle,
          startRotation: startRot,
          centerX,
          centerY,
        };
        startRotateMask(mask.mask_id);
      }
    } else {
      draggingRef.current = true;
      dragSessionRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startBBox: { ...bbox },
        currentOffset: { x: 0, y: 0 },
      };
      startDragMask(mask.mask_id);
    }
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

  // Global pointer listeners for drag/resize/rotate
  React.useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      // Rotation
      if (rotatingRef.current && rotateSessionRef.current) {
        const session = rotateSessionRef.current;
        const currentAngle = Math.atan2(e.clientY - session.centerY, e.clientX - session.centerX) * (180 / Math.PI);
        const deltaAngle = currentAngle - session.startAngle;
        const newRotation = session.startRotation + deltaAngle;
        updateMaskRotation(mask.mask_id, newRotation);
      }

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
        // Preserve rotation when dragging
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (containerRef.current && dragSessionRef.current) {
              const { x, y } = dragSessionRef.current.currentOffset;
              // Get current rotation from transform state
              const rot = transform?.rotation ?? 0;
              const rotStr = rot !== 0 ? ` rotate(${rot}deg)` : '';
              containerRef.current.style.transform = `translate(${x}px, ${y}px)${rotStr}`;
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
      if (rotatingRef.current && rotateSessionRef.current) {
        rotatingRef.current = false;
        rotateSessionRef.current = null;
        endRotateMask(mask.mask_id, imageSize);
      }

      if (draggingRef.current && dragSessionRef.current) {
        const session = dragSessionRef.current;
        
        // Calculate final position from the visual offset
        const finalDx = session.currentOffset.x / scale;
        const finalDy = session.currentOffset.y / scale;
        
        // Set the transform to just rotation (removing the drag translate)
        // This avoids the jumpy effect of removing and re-applying
        if (containerRef.current) {
          const rot = currentRotationRef.current;
          containerRef.current.style.transform = rot !== 0 ? `rotate(${rot}deg)` : '';
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
  }, [endDragMask, endResizeMask, endRotateMask, imageSize, mask.mask_id, scale, updateMaskPosition, updateMaskSize, updateMaskRotation, transform]);

  // Tooltip cleanup
  React.useEffect(() => () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  }, []);

  const isCurrentlyManipulating = draggingRef.current || resizingRef.current || rotatingRef.current || manipState?.isDragging || manipState?.isResizing || manipState?.isRotating || false;
  // Use refs for manipulation state checks to avoid re-renders
  const isGloballyManipulatingRef = React.useRef(false);
  isGloballyManipulatingRef.current = isCurrentlyManipulating;

  const handleMouseEnterWithTooltip = React.useCallback((e: React.PointerEvent): void => {
    if (disableTooltip) return;
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
    if (disableTooltip) return;
    // Skip if manipulating or tooltip not visible
    if (draggingRef.current || resizingRef.current || isGloballyManipulatingRef.current) return;
    
    // Throttle updates to max 60fps
    const now = Date.now();
    if (now - lastTooltipUpdateRef.current < 16) return;
    lastTooltipUpdateRef.current = now;
    
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeaveWithTooltip = React.useCallback((): void => {
    if (disableTooltip) return;
    // Don't trigger leave effects if any mask is being manipulated
    if (draggingRef.current || resizingRef.current || isGloballyManipulatingRef.current) return;
    onMouseLeave();
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      tooltipTimeoutRef.current = null;
    }, 150);
  }, [onMouseLeave]);

  const shouldDisablePointerEvents = !canInteract;

  // Determine cursor based on mode
  const getCursor = (): string => {
    if (!isSelected) return 'pointer';
    if (isCurrentlyManipulating) {
      if (rotatingRef.current || manipState?.isRotating) return 'grabbing';
      return 'grabbing';
    }
    if (isRotationMode) return 'crosshair';
    return 'grab';
  };

  // Transform values for the mask (from manipulation state)
  const translateX = (transform?.position.x ?? 0) * scale;
  const translateY = (transform?.position.y ?? 0) * scale;
  const scaleX = transform?.scale.width ?? 1;
  const scaleY = transform?.scale.height ?? 1;
  const flipH = transform?.flipHorizontal ?? false;
  const flipV = transform?.flipVertical ?? false;

  // Build rotation transform for the container (rotation only)
  const containerTransform = currentRotation !== 0 
    ? `rotate(${currentRotation}deg)`
    : undefined;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${displayBBox.x1}px`,
    top: `${displayBBox.y1}px`,
    width: `${displayBBox.x2 - displayBBox.x1}px`,
    height: `${displayBBox.y2 - displayBBox.y1}px`,
    opacity: isSelected ? 0.4 : isHovered ? 0.35 : 0.15,
    backgroundColor: 'transparent',
    transition: isCurrentlyManipulating ? 'none' : 'opacity 120ms ease',
    cursor: getCursor(),
    filter: transform ? combineImageEditFilters(transform.imageEdits) : undefined,
    willChange: isCurrentlyManipulating ? 'transform' : 'auto',
    pointerEvents: shouldDisablePointerEvents ? 'none' : 'auto',
    // Apply rotation around center of bounding box
    transform: containerTransform,
    transformOrigin: 'center center',
    zIndex: isSelected ? 3 : isHitTarget ? 2 : 1,
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

  // The mask visual layer is positioned at (-displayBBox.x1, -displayBBox.y1) and covers the full container
  // The actual mask content is at the original bbox position within this layer
  // For flip to work around the mask's center, we use transformOrigin
  
  // The mask visual style will use this center as transform origin
  const maskTransformStr = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
  
  // Flip transform string - applied separately with center origin
  const flipScaleX = flipH ? -1 : 1;
  const flipScaleY = flipV ? -1 : 1;

  // Flip wrapper style - flips around the center of the bounding box
  const flipWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: (flipH || flipV) ? `scale(${flipScaleX}, ${flipScaleY})` : undefined,
    transformOrigin: 'center center', // Flip around bbox center (which is the container center)
    pointerEvents: 'none',
  };

  const maskVisualStyle: React.CSSProperties | undefined = maskColor && containerSize && mask.mask_url ? {
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
    transform: maskTransformStr,
    transformOrigin: 'top left',
    pointerEvents: 'none',
  } : undefined;



  return (
    <>
      <div
        ref={containerRef}
        style={style}
        data-mask-interactive="true"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={handleMouseEnterWithTooltip}
        onPointerLeave={handleMouseLeaveWithTooltip}
        onPointerMove={handleMouseMoveTooltip}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label={`Mask for ${mask.label}, ${isSelected ? (isRotationMode ? 'rotation mode, drag to rotate, H to flip horizontal, V to flip vertical' : 'selected, draggable, double-click for rotation') : 'click to select'}`}
        tabIndex={isSelected ? 0 : -1}
      >
        {/* Visual mask layer with flip wrapper */}
        {maskVisualStyle && (
          <div style={flipWrapperStyle} aria-hidden="true">
            <div style={maskVisualStyle} />
          </div>
        )}
        
        {/* Rotation mode indicator */}
        {isSelected && isRotationMode && (
          <div className="absolute inset-0 border-2 border-dashed border-orange-400 rounded pointer-events-none" />
        )}
        
        {/* Center point indicator in rotation mode */}
        {isSelected && isRotationMode && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full pointer-events-none shadow-md" />
        )}
        
        {/* Resize handles - hidden in rotation mode */}
        {isSelected && !isRotationMode && handlePositions.map(({ handle, style: hStyle, cursor }) => (
          <div
            key={handle}
            className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full hover:scale-125 transition-transform"
            style={{ ...hStyle, cursor }}
            onPointerDown={(e) => handleResizeStart(e, handle)}
            data-mask-interactive="true"
            role="button"
            aria-label={`Resize handle ${handle}`}
            tabIndex={-1}
          />
        ))}
        
        {/* Rotation mode controls */}
        {isSelected && isRotationMode && (
          <>
            {/* Rotation handle indicator at top */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-0.5 h-4 bg-orange-400" />
              <div className="w-5 h-5 bg-orange-500 border-2 border-white rounded-full cursor-grab shadow-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 12a8 8 0 0 1 8-8m0 0v4m0-4l-3 3m3-3l3 3" />
                </svg>
              </div>
            </div>
            
            {/* Flip buttons - larger and more visible */}
            <div 
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1 bg-black/80 backdrop-blur-sm rounded-lg p-1 shadow-xl border border-white/20"
              style={{ pointerEvents: 'auto' }}
              onPointerDown={(e) => e.stopPropagation()}
              data-mask-interactive="true"
            >
              <button
                type="button"
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  flipH 
                    ? 'bg-orange-500 text-white ring-2 ring-orange-300' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                onPointerDown={(e) => { 
                  e.stopPropagation(); 
                  e.preventDefault();
                  flipMaskHorizontal(mask.mask_id); 
                }}
                data-mask-interactive="true"
                title="Flip Horizontal (H key)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 3v18" strokeDasharray="2 2" />
                  <path d="M5 12l-3-3v6l3-3" />
                  <path d="M19 12l3-3v6l-3-3" />
                </svg>
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  flipV 
                    ? 'bg-orange-500 text-white ring-2 ring-orange-300' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                onPointerDown={(e) => { 
                  e.stopPropagation(); 
                  e.preventDefault();
                  flipMaskVertical(mask.mask_id); 
                }}
                data-mask-interactive="true"
                title="Flip Vertical (V key)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12h18" strokeDasharray="2 2" />
                  <path d="M12 5l-3-3h6l-3 3" />
                  <path d="M12 19l-3 3h6l-3-3" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {!disableTooltip && (
        <MaskTooltip
          mask={mask}
          visible={tooltipVisible}
          position={tooltipPosition}
          imageContainerRef={imageContainerRef}
          boundingBox={displayBBox}
        />
      )}
    </>
  );
});

DraggableMaskOverlay.displayName = 'DraggableMaskOverlay';
