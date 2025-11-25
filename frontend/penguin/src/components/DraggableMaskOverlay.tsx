import * as React from 'react';
import type { MaskMetadata, BoundingBox } from '@/store/segmentationStore';
import { useSegmentationStore } from '@/store/segmentationStore';
import { combineImageEditFilters, constrainBoundingBox } from '@/lib/maskUtils';
import { ResizeHandles } from './ResizeHandles';
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

const DraggableMaskOverlayComponent: React.FC<DraggableMaskOverlayProps> = ({
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
    updateMaskSize,
    endResizeMask,
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
  
  const [dragStart, setDragStart] = React.useState<{ 
    x: number; 
    y: number; 
    bboxX: number; 
    bboxY: number;
  } | null>(null);
  const lastAppliedPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = React.useState<{ 
    x: number; 
    y: number; 
    bbox: BoundingBox;
    aspectRatio: number;
  } | null>(null);
  
  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = React.useRef<number | null>(null);
  
  const handleMouseDown = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!isSelected) {
      onClick(e);
      return;
    }

    setDragStart({ 
      x: e.clientX, 
      y: e.clientY,
      bboxX: bbox.x1,
      bboxY: bbox.y1,
    });
    lastAppliedPositionRef.current = { x: bbox.x1, y: bbox.y1 };
    startDragMask(mask.mask_id);
  };
  
  // Handle mouse enter for tooltip
  const handleMouseEnterWithTooltip = (e: React.MouseEvent): void => {
    onMouseEnter();
    
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Show tooltip immediately
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
  };
  
  // Handle mouse move to update tooltip position
  const handleMouseMoveTooltip = (e: React.MouseEvent): void => {
    if (tooltipVisible) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Handle mouse leave for tooltip
  const handleMouseLeaveWithTooltip = (): void => {
    onMouseLeave();
    
    // Hide tooltip after 200ms delay
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipVisible(false);
      tooltipTimeoutRef.current = null;
    }, 200);
  };
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle drag operations
  React.useEffect(() => {
    if (!dragStart || !lastAppliedPositionRef.current) return;
    
    const handleMouseMove = (e: MouseEvent): void => {
      if (!lastAppliedPositionRef.current) return;
      
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      // Calculate new position based on drag start position
      const width = bbox.x2 - bbox.x1;
      const height = bbox.y2 - bbox.y1;
      
      const newBbox = {
        x1: dragStart.bboxX + dx,
        y1: dragStart.bboxY + dy,
        x2: dragStart.bboxX + dx + width,
        y2: dragStart.bboxY + dy + height,
      };
      
      // Constrain to image boundaries
      const constrained = constrainBoundingBox(newBbox, imageSize);
      
      // Calculate incremental delta from last applied position
      const incrementalDeltaX = constrained.x1 - lastAppliedPositionRef.current.x;
      const incrementalDeltaY = constrained.y1 - lastAppliedPositionRef.current.y;
      
      if (incrementalDeltaX !== 0 || incrementalDeltaY !== 0) {
        updateMaskPosition(mask.mask_id, incrementalDeltaX, incrementalDeltaY);
        lastAppliedPositionRef.current = { x: constrained.x1, y: constrained.y1 };
      }
    };
    
    const handleMouseUp = (): void => {
      setDragStart(null);
      lastAppliedPositionRef.current = null;
      endDragMask(mask.mask_id, imageSize);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, bbox, imageSize, mask.mask_id, updateMaskPosition, endDragMask, scale]);

  // Handle resize operations
  React.useEffect(() => {
    if (!resizeStart || !manipState?.isResizing || !manipState.resizeHandle) return;
    
    const handle = manipState.resizeHandle;
    // Minimum size in pixels on screen, converted to logical space
    const minSize = 20 / scale;
    
    // Set body cursor during resize
    const cursorMap = {
      'nw': 'nw-resize',
      'ne': 'ne-resize',
      'sw': 'sw-resize',
      'se': 'se-resize',
    };
    const originalBodyCursor = document.body.style.cursor;
    document.body.style.cursor = cursorMap[handle];
    
    const handleMouseMove = (e: MouseEvent): void => {
      const dx = (e.clientX - resizeStart.x) / scale;
      const dy = (e.clientY - resizeStart.y) / scale;
      
      let newBbox = { ...resizeStart.bbox };
      
      // Calculate new dimensions based on which handle is being dragged
      // Maintain aspect ratio by using the larger dimension change
      const aspectRatio = resizeStart.aspectRatio;
      
      switch (handle) {
        case 'nw': {
          // Northwest: adjust x1 and y1
          const proposedX1 = resizeStart.bbox.x1 + dx;
          const proposedY1 = resizeStart.bbox.y1 + dy;
          
          // Calculate new dimensions
          let newWidth = resizeStart.bbox.x2 - proposedX1;
          let newHeight = resizeStart.bbox.y2 - proposedY1;
          
          // Maintain aspect ratio - use the dimension that changed more
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / aspectRatio;
            newBbox.y1 = resizeStart.bbox.y2 - newHeight;
            newBbox.x1 = proposedX1;
          } else {
            newWidth = newHeight * aspectRatio;
            newBbox.x1 = resizeStart.bbox.x2 - newWidth;
            newBbox.y1 = proposedY1;
          }
          
          // Enforce minimum size
          if (newWidth < minSize) {
            newBbox.x1 = resizeStart.bbox.x2 - minSize;
            newBbox.y1 = resizeStart.bbox.y2 - (minSize / aspectRatio);
          }
          if (newHeight < minSize) {
            newBbox.y1 = resizeStart.bbox.y2 - minSize;
            newBbox.x1 = resizeStart.bbox.x2 - (minSize * aspectRatio);
          }
          break;
        }
        case 'ne': {
          // Northeast: adjust x2 and y1
          const proposedX2 = resizeStart.bbox.x2 + dx;
          const proposedY1 = resizeStart.bbox.y1 + dy;
          
          let newWidth = proposedX2 - resizeStart.bbox.x1;
          let newHeight = resizeStart.bbox.y2 - proposedY1;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / aspectRatio;
            newBbox.y1 = resizeStart.bbox.y2 - newHeight;
            newBbox.x2 = proposedX2;
          } else {
            newWidth = newHeight * aspectRatio;
            newBbox.x2 = resizeStart.bbox.x1 + newWidth;
            newBbox.y1 = proposedY1;
          }
          
          if (newWidth < minSize) {
            newBbox.x2 = resizeStart.bbox.x1 + minSize;
            newBbox.y1 = resizeStart.bbox.y2 - (minSize / aspectRatio);
          }
          if (newHeight < minSize) {
            newBbox.y1 = resizeStart.bbox.y2 - minSize;
            newBbox.x2 = resizeStart.bbox.x1 + (minSize * aspectRatio);
          }
          break;
        }
        case 'sw': {
          // Southwest: adjust x1 and y2
          const proposedX1 = resizeStart.bbox.x1 + dx;
          const proposedY2 = resizeStart.bbox.y2 + dy;
          
          let newWidth = resizeStart.bbox.x2 - proposedX1;
          let newHeight = proposedY2 - resizeStart.bbox.y1;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / aspectRatio;
            newBbox.y2 = resizeStart.bbox.y1 + newHeight;
            newBbox.x1 = proposedX1;
          } else {
            newWidth = newHeight * aspectRatio;
            newBbox.x1 = resizeStart.bbox.x2 - newWidth;
            newBbox.y2 = proposedY2;
          }
          
          if (newWidth < minSize) {
            newBbox.x1 = resizeStart.bbox.x2 - minSize;
            newBbox.y2 = resizeStart.bbox.y1 + (minSize / aspectRatio);
          }
          if (newHeight < minSize) {
            newBbox.y2 = resizeStart.bbox.y1 + minSize;
            newBbox.x1 = resizeStart.bbox.x2 - (minSize * aspectRatio);
          }
          break;
        }
        case 'se': {
          // Southeast: adjust x2 and y2
          const proposedX2 = resizeStart.bbox.x2 + dx;
          const proposedY2 = resizeStart.bbox.y2 + dy;
          
          let newWidth = proposedX2 - resizeStart.bbox.x1;
          let newHeight = proposedY2 - resizeStart.bbox.y1;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / aspectRatio;
            newBbox.y2 = resizeStart.bbox.y1 + newHeight;
            newBbox.x2 = proposedX2;
          } else {
            newWidth = newHeight * aspectRatio;
            newBbox.x2 = resizeStart.bbox.x1 + newWidth;
            newBbox.y2 = proposedY2;
          }
          
          if (newWidth < minSize) {
            newBbox.x2 = resizeStart.bbox.x1 + minSize;
            newBbox.y2 = resizeStart.bbox.y1 + (minSize / aspectRatio);
          }
          if (newHeight < minSize) {
            newBbox.y2 = resizeStart.bbox.y1 + minSize;
            newBbox.x2 = resizeStart.bbox.x1 + (minSize * aspectRatio);
          }
          break;
        }
      }
      
      // Constrain to image boundaries
      const constrained = constrainBoundingBox(newBbox, imageSize);
      
      // Update the mask size
      updateMaskSize(mask.mask_id, constrained);
    };
    
    const handleMouseUp = (): void => {
      setResizeStart(null);
      endResizeMask(mask.mask_id, imageSize);
      // Restore body cursor
      document.body.style.cursor = originalBodyCursor;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Restore body cursor on cleanup
      document.body.style.cursor = originalBodyCursor;
    };
  }, [resizeStart, manipState?.isResizing, manipState?.resizeHandle, imageSize, mask.mask_id, updateMaskSize, endResizeMask, scale]);

  // Start resize when the store indicates resizing has begun
  React.useEffect(() => {
    if (manipState?.isResizing && !resizeStart) {
      const width = bbox.x2 - bbox.x1;
      const height = bbox.y2 - bbox.y1;
      const aspectRatio = width / height;
      
      setResizeStart({
        x: 0, // Will be updated on first mouse move
        y: 0,
        bbox: { ...bbox },
        aspectRatio,
      });
      
      // Capture the current mouse position
      const captureMousePosition = (e: MouseEvent): void => {
        setResizeStart(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
        window.removeEventListener('mousemove', captureMousePosition);
      };
      
      window.addEventListener('mousemove', captureMousePosition);
      
      return () => {
        window.removeEventListener('mousemove', captureMousePosition);
      };
    }
  }, [manipState?.isResizing, resizeStart, bbox]);
  
  const opacity = manipState?.isDragging ? 0.5 : isSelected ? 0.7 : isHovered ? 0.6 : 0.4;
  
  // Determine cursor based on state
  let cursor = 'pointer';
  if (manipState?.isDragging) {
    cursor = 'grabbing';
  } else if (manipState?.isResizing && manipState.resizeHandle) {
    // Show appropriate resize cursor during resize
    const cursorMap = {
      'nw': 'nw-resize',
      'ne': 'ne-resize',
      'sw': 'sw-resize',
      'se': 'se-resize',
    };
    cursor = cursorMap[manipState.resizeHandle];
  } else if (isSelected) {
    cursor = 'grab';
  }
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${displayBBox.x1}px`,
    top: `${displayBBox.y1}px`,
    width: `${displayBBox.x2 - displayBBox.x1}px`,
    height: `${displayBBox.y2 - displayBBox.y1}px`,
    opacity,
    backgroundColor: 'transparent',
    transition: manipState?.isDragging || manipState?.isResizing 
      ? 'none' 
      : 'opacity 150ms ease, left 300ms ease, top 300ms ease, width 300ms ease, height 300ms ease',
    cursor,
    filter: transform ? combineImageEditFilters(transform.imageEdits) : undefined,
  };
  
  return (
    <>
      <div
        style={style}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnterWithTooltip}
        onMouseLeave={handleMouseLeaveWithTooltip}
        onMouseMove={handleMouseMoveTooltip}
        role="button"
        aria-label={`Mask for ${mask.label}, ${isSelected ? 'selected, draggable' : 'click to select'}`}
        aria-grabbed={manipState?.isDragging}
        tabIndex={isSelected ? 0 : -1}
      >
        {isSelected && <ResizeHandles maskId={mask.mask_id} boundingBox={bbox} />}
      </div>
      
      {/* Bounding-box visuals are intentionally omitted for a cleaner mask-only view */}
      
      <MaskTooltip
        mask={mask}
        visible={tooltipVisible}
        position={tooltipPosition}
        imageContainerRef={imageContainerRef}
        boundingBox={displayBBox}
      />
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const DraggableMaskOverlay = React.memo(DraggableMaskOverlayComponent, (prev, next) => {
  // Only re-render if these specific props change
  return (
    prev.mask.mask_id === next.mask.mask_id &&
    prev.isSelected === next.isSelected &&
    prev.isHovered === next.isHovered &&
    prev.imageSize.width === next.imageSize.width &&
    prev.imageSize.height === next.imageSize.height &&
    prev.mask.bounding_box.x1 === next.mask.bounding_box.x1 &&
    prev.mask.bounding_box.y1 === next.mask.bounding_box.y1 &&
    prev.mask.bounding_box.x2 === next.mask.bounding_box.x2 &&
    prev.mask.bounding_box.y2 === next.mask.bounding_box.y2 &&
    prev.imageContainerRef === next.imageContainerRef &&
    prev.displayScale === next.displayScale
  );
});
