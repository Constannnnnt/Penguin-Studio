import * as React from 'react';
import type { MaskMetadata } from '@/store/segmentationStore';
import { useSegmentationStore } from '@/store/segmentationStore';
import { useOptimizedImage } from '@/hooks/useOptimizedImage';

interface MaskViewerProps {
  originalImageUrl: string;
  masks: MaskMetadata[];
  selectedMaskId?: string | null;
  onMaskHover?: (maskId: string | null) => void;
  onMaskClick?: (maskId: string) => void;
}

interface MaskOverlayProps {
  mask: MaskMetadata;
  isHovered: boolean;
  isSelected: boolean;
  color: string;
  layout: {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  };
}

const MaskOverlay = React.memo<MaskOverlayProps>(({
  mask,
  isHovered,
  isSelected,
  color,
  layout,
}) => {
  const isActive = isHovered || isSelected;
  const baseOpacity = isActive ? 0.6 : 0.35;

  return (
    <div
      className="absolute transition-opacity duration-200 pointer-events-none"
      style={{
        left: `${layout.offsetX}px`,
        top: `${layout.offsetY}px`,
        width: `${layout.width}px`,
        height: `${layout.height}px`,
        willChange: 'opacity, transform',
        opacity: baseOpacity,
      }}
    >
      {isActive && (
        <div
          className="absolute -top-12 left-1/2 bg-background/95 border border-border rounded-md px-3 py-2 shadow-lg z-10 whitespace-nowrap animate-in fade-in duration-200"
          style={{
            transform: 'translate3d(-50%, 0, 0)',
            willChange: 'opacity',
          }}
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

      <div
        className="w-full h-full transition-transform duration-150"
        style={{
          backgroundColor: color,
          WebkitMaskImage: `url(${mask.mask_url})`,
          maskImage: `url(${mask.mask_url})`,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: '0 0',
          maskPosition: '0 0',
          WebkitMaskMode: 'alpha',
          maskMode: 'alpha',
          mixBlendMode: 'multiply',
          transform: isActive ? 'scale(1.01)' : 'scale(1)',
          boxShadow: isSelected ? `0 0 0 2px ${color}` : undefined,
          borderRadius: 2,
        }}
      />

      {isActive && (
        <div
          className="absolute inset-0 border-2 border-primary rounded-sm pointer-events-none animate-in fade-in duration-200"
          style={{ willChange: 'opacity' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

MaskOverlay.displayName = 'MaskOverlay';

export const MaskViewer: React.FC<MaskViewerProps> = React.memo(({
  originalImageUrl,
  masks,
  selectedMaskId,
  onMaskHover,
  onMaskClick,
}) => {
  const colorForId = React.useCallback((id: string) => {
    const COLORS = ['#5B8DEF', '#F25F5C', '#3CBF79', '#F2C14E', '#9B59B6', '#16A085'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }, []);

  const [hoveredMask, setHoveredMask] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const masksVisible = useSegmentationStore((state) => state.masksVisible);
  const [layout, setLayout] = React.useState<{ scale: number; offsetX: number; offsetY: number; width: number; height: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
  });
  const [maskBitmaps, setMaskBitmaps] = React.useState<
    { id: string; width: number; height: number; data: Uint8ClampedArray }[]
  >([]);

  const { src: optimizedImageSrc, isLoading: imageLoading } = useOptimizedImage(originalImageUrl, {
    preload: true,
    lazy: false,
  });

  const handleMaskEnter = React.useCallback((maskId: string): void => {
    setHoveredMask(maskId);
    onMaskHover?.(maskId);
  }, [onMaskHover]);

  const handleMaskLeave = React.useCallback((): void => {
    setHoveredMask(null);
    onMaskHover?.(null);
  }, [onMaskHover]);

  const handleMaskClick = React.useCallback((maskId: string): void => {
    onMaskClick?.(maskId);
  }, [onMaskClick]);

  const updateLayout = React.useCallback(() => {
    const imgEl = imageRef.current;
    const containerEl = containerRef.current;
    if (!imgEl || !containerEl) return;

    const naturalWidth = imgEl.naturalWidth || 1;
    const naturalHeight = imgEl.naturalHeight || 1;

    const containerWidth = containerEl.clientWidth || naturalWidth;
    const containerHeight = containerEl.clientHeight || naturalHeight;

    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;

    setLayout({
      scale,
      offsetX: (containerWidth - renderedWidth) / 2,
      offsetY: (containerHeight - renderedHeight) / 2,
      width: renderedWidth,
      height: renderedHeight,
    });
  }, []);

  const handleOriginalLoad = React.useCallback((): void => {
    updateLayout();
  }, [updateLayout]);

  React.useEffect(() => {
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [updateLayout]);

  React.useEffect(() => {
    let cancelled = false;
    const loadMasks = async () => {
      const loaded = await Promise.all(
        masks.map(async (mask) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = mask.mask_url;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load mask ${mask.mask_id}`));
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          return {
            id: mask.mask_id,
            width: canvas.width,
            height: canvas.height,
            data: data.data, // includes RGBA; alpha is every 4th byte
          };
        })
      );
      if (!cancelled) setMaskBitmaps(loaded);
    };
    if (masks.length) {
      loadMasks().catch(() => {});
    } else {
      setMaskBitmaps([]);
    }
    return () => {
      cancelled = true;
    };
  }, [masks]);

  const pickMaskAtPoint = React.useCallback(
    (clientX: number, clientY: number): string | null => {
      const containerEl = containerRef.current;
      if (!containerEl) return null;
      const rect = containerEl.getBoundingClientRect();
      const localX = clientX - rect.left - layout.offsetX;
      const localY = clientY - rect.top - layout.offsetY;
      if (localX < 0 || localY < 0 || localX > layout.width || localY > layout.height) {
        return null;
      }
      const naturalX = localX / layout.scale;
      const naturalY = localY / layout.scale;

      for (let i = maskBitmaps.length - 1; i >= 0; i--) {
        const bmp = maskBitmaps[i];
        const mx = Math.floor(naturalX);
        const my = Math.floor(naturalY);
        if (mx < 0 || my < 0 || mx >= bmp.width || my >= bmp.height) continue;
        const idx = (my * bmp.width + mx) * 4 + 3; // alpha channel
        const alpha = bmp.data[idx];
        if (alpha > 0) {
          return bmp.id;
        }
      }
      return null;
    },
    [layout, maskBitmaps]
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const id = pickMaskAtPoint(e.clientX, e.clientY);
      setHoveredMask(id);
      onMaskHover?.(id);
    },
    [onMaskHover, pickMaskAtPoint]
  );

  const handleMouseLeave = React.useCallback(() => {
    setHoveredMask(null);
    onMaskHover?.(null);
  }, [onMaskHover]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const id = pickMaskAtPoint(e.clientX, e.clientY);
      if (id) {
        onMaskClick?.(id);
      }
    },
    [onMaskClick, pickMaskAtPoint]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      role="img"
      aria-label="Segmented image with interactive masks"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {optimizedImageSrc && (
        <img
          ref={imageRef}
          src={optimizedImageSrc}
          alt="Original"
          className="w-full h-full object-contain"
          onLoad={handleOriginalLoad}
        />
      )}

      {!imageLoading && optimizedImageSrc && masksVisible && layout.width > 0 && layout.height > 0 && masks.map((mask) => {
        const isHovered = hoveredMask === mask.mask_id;
        const isSelected = selectedMaskId === mask.mask_id;

        return (
          <MaskOverlay
            key={mask.mask_id}
            mask={mask}
            isHovered={isHovered}
            isSelected={isSelected}
            color={colorForId(mask.mask_id)}
            layout={layout}
          />
        );
      })}
    </div>
  );
});

MaskViewer.displayName = 'MaskViewer';
