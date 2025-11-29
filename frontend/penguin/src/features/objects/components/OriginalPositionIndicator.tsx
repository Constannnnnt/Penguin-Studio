import * as React from 'react';
import type { BoundingBox } from '@/features/segmentation/store/segmentationStore';

interface OriginalPositionIndicatorProps {
  bbox: BoundingBox;
  imageSize: { width: number; height: number };
  scale?: number;
}

export const OriginalPositionIndicator: React.FC<OriginalPositionIndicatorProps> = ({
  bbox,
  imageSize,
  scale = 1,
}) => {
  // Keep reference to imageSize to satisfy strict unused checks while retaining future compatibility
  void imageSize;

  const scaledBbox = {
    x1: bbox.x1 * scale,
    y1: bbox.y1 * scale,
    x2: bbox.x2 * scale,
    y2: bbox.y2 * scale,
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${scaledBbox.x1}px`,
    top: `${scaledBbox.y1}px`,
    width: `${scaledBbox.x2 - scaledBbox.x1}px`,
    height: `${scaledBbox.y2 - scaledBbox.y1}px`,
    opacity: 0.3,
    border: '2px dashed gray',
    backgroundColor: 'gray',
    pointerEvents: 'none',
    animation: 'fadeIn 200ms ease',
  };
  
  return <div style={style} data-testid="original-position-indicator" />;
};
