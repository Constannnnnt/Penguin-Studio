import React, { useRef } from 'react';
import { useCanvasManipulation, BoundingBox } from './hooks/useCanvasManipulation';

interface SpatialLayerProps {
  value: BoundingBox;
  rotation: number;
  onChange: (bbox: BoundingBox, rotation: number) => void;
  renderContent?: (props: any) => React.ReactNode;
}

/**
 * SRP: SpatialLayer handles the React interaction and event binding,
 * delegating math to the hook and engine.
 */
export const SpatialLayer: React.FC<SpatialLayerProps> = ({
  value,
  rotation,
  onChange,
  renderContent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { startDrag, startResize, manipulationState } = useCanvasManipulation({
    value,
    rotation,
    onChange,
  });

  const width = value.x2 - value.x1;
  const height = value.y2 - value.y1;

  return (
    <div
      ref={containerRef}
      className={`absolute border-2 transition-colors ${manipulationState.isDragging ? 'border-primary' : 'border-primary/50'} bg-primary/10`}
      style={{
        left: value.x1,
        top: value.y1,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        cursor: manipulationState.isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        startDrag(e.clientX, e.clientY);
      }}
    >
      {renderContent?.({ manipulationState })}

      {/* Corner Handles */}
      <div
        className="absolute w-2 h-2 bg-primary -top-1 -left-1 cursor-nw-resize"
        onPointerDown={(e) => {
          e.stopPropagation();
          startResize(e.clientX, e.clientY, 'nw');
        }}
      />
      {/* ... other handles ... */}
    </div>
  );
};
