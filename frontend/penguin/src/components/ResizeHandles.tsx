import * as React from 'react';
import { useSegmentationStore } from '@/store/segmentationStore';

interface ResizeHandlesProps {
  maskId: string;
  boundingBox: { x1: number; y1: number; x2: number; y2: number };
}

type ResizeHandlePosition = 'nw' | 'ne' | 'sw' | 'se';

interface HandleConfig {
  position: ResizeHandlePosition;
  style: React.CSSProperties;
  cursor: string;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ maskId, boundingBox }) => {
  const { startResizeMask } = useSegmentationStore();
  
  const width = boundingBox.x2 - boundingBox.x1;
  const height = boundingBox.y2 - boundingBox.y1;
  
  const handles: HandleConfig[] = [
    { 
      position: 'nw', 
      style: { top: -6, left: -6 }, 
      cursor: 'nw-resize' 
    },
    { 
      position: 'ne', 
      style: { top: -6, right: -6 }, 
      cursor: 'ne-resize' 
    },
    { 
      position: 'sw', 
      style: { bottom: -6, left: -6 }, 
      cursor: 'sw-resize' 
    },
    { 
      position: 'se', 
      style: { bottom: -6, right: -6 }, 
      cursor: 'se-resize' 
    },
  ];
  
  const handleMouseDown = (e: React.MouseEvent, position: ResizeHandlePosition): void => {
    e.stopPropagation();
    e.preventDefault();
    startResizeMask(maskId, position);
  };
  
  return (
    <>
      {handles.map(({ position, style, cursor }) => (
        <div
          key={position}
          className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full hover:scale-125 transition-transform"
          style={{ ...style, cursor }}
          onMouseDown={(e) => handleMouseDown(e, position)}
          role="button"
          aria-label={`Resize handle ${position}`}
          tabIndex={-1}
        />
      ))}
    </>
  );
};
