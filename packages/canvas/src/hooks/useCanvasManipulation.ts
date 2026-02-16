import { useRef, useState, useCallback, useEffect } from 'react';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ManipulationState {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
}

export interface UseCanvasManipulationProps {
  value: BoundingBox;
  rotation?: number;
  onChange: (newValue: BoundingBox, newRotation: number) => void;
  scale?: number;
  imageSize?: { width: number; height: number };
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export function useCanvasManipulation({
  value,
  rotation = 0,
  onChange,
  scale = 1,
  imageSize,
}: UseCanvasManipulationProps) {
  const [manipulationState, setManipulationState] = useState<ManipulationState>({
    isDragging: false,
    isResizing: false,
    isRotating: false,
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startBBox: BoundingBox;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startBBox: BoundingBox;
    handle: ResizeHandle;
  } | null>(null);

  const rotateRef = useRef<{
    startAngle: number;
    startRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setManipulationState(prev => ({ ...prev, isDragging: true }));
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startBBox: { ...value },
    };
  }, [value]);

  const startResize = useCallback((clientX: number, clientY: number, handle: ResizeHandle) => {
    setManipulationState(prev => ({ ...prev, isResizing: true }));
    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      startBBox: { ...value },
      handle,
    };
  }, [value]);

  const startRotate = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);

    setManipulationState(prev => ({ ...prev, isRotating: true }));
    rotateRef.current = {
      startAngle,
      startRotation: rotation,
      centerX,
      centerY,
    };
  }, [rotation]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (dragRef.current) {
      const { startX, startY, startBBox } = dragRef.current;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      const newBBox = {
        x1: startBBox.x1 + dx,
        y1: startBBox.y1 + dy,
        x2: startBBox.x2 + dx,
        y2: startBBox.y2 + dy,
      };

      onChange(newBBox, rotation);
    } else if (resizeRef.current) {
      // Basic resize logic (simplified for brevity, can be expanded to match full DraggableMaskOverlay logic)
      const { startX, startY, startBBox, handle } = resizeRef.current;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      
      const newBBox = { ...startBBox };
      // Apply deltas based on handle...
      // This is a simplified placeholder for the complex aspect-ratio constrained logic
       switch (handle) {
          case 'nw': newBBox.x1 += dx; newBBox.y1 += dy; break;
          case 'ne': newBBox.x2 += dx; newBBox.y1 += dy; break;
          case 'sw': newBBox.x1 += dx; newBBox.y2 += dy; break;
          case 'se': newBBox.x2 += dx; newBBox.y2 += dy; break;
        }
      
      onChange(newBBox, rotation);
    } else if (rotateRef.current) {
      const { startAngle, startRotation, centerX, centerY } = rotateRef.current;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const deltaAngle = currentAngle - startAngle;
      onChange(value, startRotation + deltaAngle);
    }
  }, [onChange, rotation, scale, value]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    rotateRef.current = null;
    setManipulationState({
      isDragging: false,
      isResizing: false,
      isRotating: false,
    });
  }, []);

  useEffect(() => {
    if (manipulationState.isDragging || manipulationState.isResizing || manipulationState.isRotating) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [manipulationState, onPointerMove, onPointerUp]);

  return {
    startDrag,
    startResize,
    startRotate,
    manipulationState,
  };
}
