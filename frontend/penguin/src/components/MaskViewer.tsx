import * as React from 'react';
import type { MaskMetadata } from '@/store/segmentationStore';

interface MaskViewerProps {
  originalImageUrl: string;
  masks: MaskMetadata[];
  selectedMaskId?: string | null;
  onMaskHover?: (maskId: string | null) => void;
  onMaskClick?: (maskId: string) => void;
}

export const MaskViewer: React.FC<MaskViewerProps> = ({
  originalImageUrl,
  masks,
  selectedMaskId,
  onMaskHover,
  onMaskClick,
}) => {
  const [hoveredMask, setHoveredMask] = React.useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMaskEnter = (maskId: string): void => {
    setHoveredMask(maskId);
    onMaskHover?.(maskId);
  };

  const handleMaskLeave = (): void => {
    setHoveredMask(null);
    onMaskHover?.(null);
  };

  const handleMaskClick = (maskId: string): void => {
    onMaskClick?.(maskId);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      role="img"
      aria-label="Segmented image with interactive masks"
    >
      <img
        src={originalImageUrl}
        alt="Original"
        className="w-full h-full object-contain"
        onLoad={() => setImageLoaded(true)}
      />

      {imageLoaded && masks.map((mask) => {
        const isHovered = hoveredMask === mask.mask_id;
        const isSelected = selectedMaskId === mask.mask_id;
        const isActive = isHovered || isSelected;

        return (
          <div
            key={mask.mask_id}
            className="absolute cursor-pointer transition-opacity duration-200"
            style={{
              left: `${mask.bounding_box.x1}px`,
              top: `${mask.bounding_box.y1}px`,
              width: `${mask.bounding_box.x2 - mask.bounding_box.x1}px`,
              height: `${mask.bounding_box.y2 - mask.bounding_box.y1}px`,
            }}
            onMouseEnter={() => handleMaskEnter(mask.mask_id)}
            onMouseLeave={handleMaskLeave}
            onClick={() => handleMaskClick(mask.mask_id)}
            role="button"
            tabIndex={0}
            aria-label={`Mask for ${mask.label} with ${(mask.confidence * 100).toFixed(1)}% confidence`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMaskClick(mask.mask_id);
              }
            }}
          >
            {isActive && (
              <div
                className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-background/95 border border-border rounded-md px-3 py-2 shadow-lg z-10 whitespace-nowrap animate-in fade-in duration-200"
                role="tooltip"
              >
                <p className="text-sm font-medium text-foreground">{mask.label}</p>
                <p className="text-xs text-muted-foreground">
                  Confidence: {(mask.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Area: {mask.area_percentage.toFixed(1)}%
                </p>
              </div>
            )}

            <img
              src={mask.mask_url}
              alt={`Mask for ${mask.label}`}
              className={`w-full h-full object-contain transition-opacity duration-200 ${
                isActive ? 'opacity-80' : 'opacity-40'
              } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              style={{
                mixBlendMode: 'multiply',
              }}
            />

            {isActive && (
              <div
                className="absolute inset-0 border-2 border-primary rounded-sm pointer-events-none animate-in fade-in duration-200"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
