import * as React from 'react';
import type { MaskMetadata, MaskManipulationState } from '@/features/segmentation/store/segmentationStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { useOptimizedImage } from '@/shared/hooks/useOptimizedImage';
import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { combineTransforms } from '@/shared/lib/imageTransform';
import { DraggableMaskOverlay } from './DraggableMaskOverlay';
import { MaskTooltip } from './MaskTooltip';
import { getMaskColor } from '@/shared/lib/maskUtils';

type MaskHitCache = {
  url: string;
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c2.25 0 4.14-.5 5.64-1.25" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
);


interface MaskViewerProps {
  originalImageUrl: string;
  masks: MaskMetadata[];
  selectedMaskId?: string | null;
  onMaskHover?: (maskId: string | null) => void;
  onMaskClick?: (maskId: string) => void;
  onBackgroundDeselect?: () => void;
}

export const MaskViewer: React.FC<MaskViewerProps> = React.memo(({
  originalImageUrl,
  masks,
  selectedMaskId,
  onMaskHover,
  onMaskClick,
  onBackgroundDeselect,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const layoutAppliedRef = React.useRef(false);
  const [showPreview, setShowPreview] = React.useState(true);

  // Chunked rendering state to avoid blocking main thread with too many masks
  const [visibleMaskCount, setVisibleMaskCount] = React.useState(10);

  React.useEffect(() => {
    // Reset when masks transform/change significantly, but here we just check length for simplicity
    // If masks array reference changes (new segmentation), we should reset or just let it catch up
    // Ideally we reset to 10 on new masks
    setVisibleMaskCount(10);
  }, [masks]);

  React.useEffect(() => {
    if (visibleMaskCount < masks.length) {
      // Use efficient batching - render more masks if we are far behind
      const batchSize = Math.max(10, Math.ceil((masks.length - visibleMaskCount) / 5));

      const timeoutId = setTimeout(() => {
        setVisibleMaskCount(prev => Math.min(prev + batchSize, masks.length));
      }, 0); // Yield to main thread

      return () => clearTimeout(timeoutId);
    }
  }, [visibleMaskCount, masks.length]);

  const masksVisible = useSegmentationStore((state) => state.masksVisible);
  const hoveredMaskId = useSegmentationStore((state) => state.hoveredMaskId);
  const maskManipulation = useSegmentationStore((state) => state.maskManipulation);
  const selectedMaskIdState = useSegmentationStore((state) => state.selectedMaskId);
  const activeMaskId = selectedMaskId ?? selectedMaskIdState ?? null;
  const selectedMask = React.useMemo(
    () => (activeMaskId ? masks.find(m => m.mask_id === activeMaskId) || null : null),
    [masks, activeMaskId]
  );
  const hoveredMask = React.useMemo(
    () => (hoveredMaskId ? masks.find(m => m.mask_id === hoveredMaskId) || null : null),
    [masks, hoveredMaskId]
  );
  const masksBySpecificity = React.useMemo(
    () => [...masks].sort((a, b) => {
      const areaDiff = a.area_pixels - b.area_pixels;
      if (areaDiff !== 0) return areaDiff;
      const confA = typeof a.confidence === 'number' ? a.confidence : 0;
      const confB = typeof b.confidence === 'number' ? b.confidence : 0;
      return confB - confA;
    }),
    [masks]
  );
  const masksLookup = React.useMemo(() => {
    const map = new Map<string, MaskMetadata>();
    masks.forEach(m => map.set(m.mask_id, m));
    return map;
  }, [masks]);
  const isManipulating = React.useMemo(
    () => Array.from(maskManipulation.values()).some((state) => state.isDragging || state.isResizing || state.isRotating),
    [maskManipulation]
  );

  // Select global edits with stable snapshots to avoid sync-store warnings
  const brightness = useImageEditStore((state) => state.brightness);
  const contrast = useImageEditStore((state) => state.contrast);
  const saturation = useImageEditStore((state) => state.saturation);
  const rotation = useImageEditStore((state) => state.rotation);
  const flipHorizontal = useImageEditStore((state) => state.flipHorizontal);
  const flipVertical = useImageEditStore((state) => state.flipVertical);
  const hue = useImageEditStore((state) => state.hue);
  const blur = useImageEditStore((state) => state.blur);
  const exposure = useImageEditStore((state) => state.exposure);
  const vibrance = useImageEditStore((state) => state.vibrance);
  const sharpen = useImageEditStore((state) => state.sharpen);
  const highlights = useImageEditStore((state) => state.highlights);
  const shadows = useImageEditStore((state) => state.shadows);
  const temperature = useImageEditStore((state) => state.temperature);
  const tint = useImageEditStore((state) => state.tint);
  const vignette = useImageEditStore((state) => state.vignette);
  const grain = useImageEditStore((state) => state.grain);

  const globalEdits = React.useMemo(() => ({
    brightness,
    contrast,
    saturation,
    rotation,
    flipHorizontal,
    flipVertical,
    hue,
    blur,
    exposure,
    vibrance,
    sharpen,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    grain,
  }), [
    brightness,
    contrast,
    saturation,
    rotation,
    flipHorizontal,
    flipVertical,
    hue,
    blur,
    exposure,
    vibrance,
    sharpen,
    highlights,
    shadows,
    temperature,
    tint,
    vignette,
    grain,
  ]);

  const globalFilter = React.useMemo(() => combineTransforms(globalEdits).filter, [globalEdits]);

  const { src: optimizedImageSrc } = useOptimizedImage(originalImageUrl, {
    preload: true,
    lazy: false,
  });

  const [imageSize, setImageSize] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [layout, setLayout] = React.useState<{ scale: number; offsetX: number; offsetY: number; width: number; height: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
  });

  const applyLayout = React.useCallback(() => {
    const imgEl = imageRef.current;
    const containerEl = containerRef.current;
    if (!imgEl || !containerEl) return;

    const naturalWidth = imgEl.naturalWidth || 1;
    const naturalHeight = imgEl.naturalHeight || 1;

    const containerWidth = containerEl.clientWidth || naturalWidth;
    const containerHeight = containerEl.clientHeight || naturalHeight;

    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight) || 1;
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    setImageSize((prev) => {
      if (prev.width === naturalWidth && prev.height === naturalHeight) return prev;
      return { width: naturalWidth, height: naturalHeight };
    });

    setLayout((prev) => {
      const next = {
        scale,
        offsetX: (containerWidth - width) / 2,
        offsetY: (containerHeight - height) / 2,
        width,
        height,
      };
      if (
        prev.scale === next.scale &&
        prev.offsetX === next.offsetX &&
        prev.offsetY === next.offsetY &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleImageLoad = React.useCallback((): void => {
    if (layoutAppliedRef.current) return;
    layoutAppliedRef.current = true;
    applyLayout();
  }, [applyLayout]);

  React.useEffect(() => {
    if (!layoutAppliedRef.current && imageRef.current?.complete) {
      layoutAppliedRef.current = true;
      applyLayout();
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHover = React.useCallback((maskId: string | null) => {
    onMaskHover?.(maskId);
  }, [onMaskHover]);

  const handleClick = React.useCallback((maskId: string) => {
    onMaskClick?.(maskId);
  }, [onMaskClick]);

  const suppressBackgroundClickRef = React.useRef(false);

  const handleBackgroundClick = React.useCallback((e: React.MouseEvent) => {
    if (!onBackgroundDeselect) return;
    if (suppressBackgroundClickRef.current) {
      suppressBackgroundClickRef.current = false;
      return;
    }
    if (e.target === containerRef.current || e.target === overlayRef.current) {
      onBackgroundDeselect();
    }
  }, [onBackgroundDeselect]);

  const hasLayout = layout.width > 0 && layout.height > 0 && imageSize.width > 0 && imageSize.height > 0;

  const maskHitCacheRef = React.useRef<Map<string, MaskHitCache>>(new Map());
  const hoverRafRef = React.useRef<number | null>(null);
  const lastHoverMaskRef = React.useRef<string | null>(null);
  const [hoverPosition, setHoverPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  React.useEffect(() => {
    let cancelled = false;
    const cache = maskHitCacheRef.current;
    const activeIds = new Set(masks.map((mask) => mask.mask_id));

    for (const key of cache.keys()) {
      if (!activeIds.has(key)) {
        cache.delete(key);
      }
    }

    const loadMask = (mask: MaskMetadata): Promise<void> =>
      new Promise((resolve) => {
        const existing = cache.get(mask.mask_id);
        if (existing && existing.url === mask.mask_url) {
          resolve();
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cancelled) {
            resolve();
            return;
          }
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 1;
            canvas.height = img.height || 1;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve();
              return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            cache.set(mask.mask_id, {
              url: mask.mask_url,
              width: canvas.width,
              height: canvas.height,
              data: imageData.data,
            });
          } catch {
            // If CORS blocks pixel reads, fall back to bbox-only hit testing.
          }
          resolve();
        };
        img.onerror = () => {
          resolve();
        };
        img.src = mask.mask_url;
      });

    Promise.all(masks.map((mask) => loadMask(mask))).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [masks]);

  const getMaskHit = React.useCallback(
    (xDisplay: number, yDisplay: number): string | null => {
      if (!hasLayout || !Number.isFinite(xDisplay) || !Number.isFinite(yDisplay)) {
        return null;
      }

      const cache = maskHitCacheRef.current;
      const scale = layout.scale || 1;
      const threshold = 8;

      for (const mask of masksBySpecificity) {
        const manipState = maskManipulation.get(mask.mask_id);
        if (manipState?.isHidden) continue;

        const bbox = manipState?.currentBoundingBox || mask.bounding_box;
        const displayBBox = {
          x1: bbox.x1 * scale,
          y1: bbox.y1 * scale,
          x2: bbox.x2 * scale,
          y2: bbox.y2 * scale,
        };

        const rotation = manipState?.transform.rotation ?? 0;
        const inBBox =
          xDisplay >= displayBBox.x1 &&
          xDisplay <= displayBBox.x2 &&
          yDisplay >= displayBBox.y1 &&
          yDisplay <= displayBBox.y2;

        if (rotation === 0 && !inBBox) {
          continue;
        }

        let px = xDisplay;
        let py = yDisplay;

        const cx = (displayBBox.x1 + displayBBox.x2) / 2;
        const cy = (displayBBox.y1 + displayBBox.y2) / 2;

        if (rotation !== 0) {
          const radians = (-rotation * Math.PI) / 180;
          const cos = Math.cos(radians);
          const sin = Math.sin(radians);
          const dx = px - cx;
          const dy = py - cy;
          px = cx + dx * cos - dy * sin;
          py = cy + dx * sin + dy * cos;
        }

        const flipH = manipState?.transform.flipHorizontal ?? false;
        const flipV = manipState?.transform.flipVertical ?? false;
        if (flipH || flipV) {
          px = cx + (px - cx) * (flipH ? -1 : 1);
          py = cy + (py - cy) * (flipV ? -1 : 1);
        }

        const translateX = (manipState?.transform.position.x ?? 0) * scale;
        const translateY = (manipState?.transform.position.y ?? 0) * scale;
        const scaleX = manipState?.transform.scale.width ?? 1;
        const scaleY = manipState?.transform.scale.height ?? 1;

        if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX === 0 || scaleY === 0) {
          continue;
        }

        px = (px - translateX) / scaleX;
        py = (py - translateY) / scaleY;

        const xOrig = px / scale;
        const yOrig = py / scale;

        const entry = cache.get(mask.mask_id);
        if (!entry) {
          if (!inBBox) {
            continue;
          }
          return mask.mask_id;
        }

        const sampleX = Math.floor((xOrig / Math.max(1, imageSize.width)) * entry.width);
        const sampleY = Math.floor((yOrig / Math.max(1, imageSize.height)) * entry.height);
        if (
          sampleX < 0 ||
          sampleY < 0 ||
          sampleX >= entry.width ||
          sampleY >= entry.height
        ) {
          continue;
        }

        const alphaIndex = (sampleY * entry.width + sampleX) * 4 + 3;
        const alpha = entry.data[alphaIndex];
        if (alpha > threshold) {
          return mask.mask_id;
        }
      }

      return null;
    },
    [hasLayout, imageSize.width, imageSize.height, layout.scale, maskManipulation, masksBySpecificity]
  );

  const handleOverlayPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!hasLayout || isManipulating) return;
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const xDisplay = clientX - rect.left;
      const yDisplay = clientY - rect.top;

      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current);
      }

      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        const hit = getMaskHit(xDisplay, yDisplay);
        if (hit !== lastHoverMaskRef.current) {
          lastHoverMaskRef.current = hit;
          handleHover(hit);
        }
        if (hit) {
          setHoverPosition({ x: clientX, y: clientY });
        }
      });
    },
    [getMaskHit, handleHover, hasLayout, isManipulating]
  );

  const handleOverlayPointerLeave = React.useCallback(() => {
    if (hoverRafRef.current !== null) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    lastHoverMaskRef.current = null;
    handleHover(null);
  }, [handleHover]);

  const handleOverlayPointerDownCapture = React.useCallback(
    (e: React.PointerEvent) => {
      if (!hasLayout || isManipulating) return;
      if (!overlayRef.current) return;
      const target = e.target as Element | null;
      if (target?.closest('[data-mask-interactive="true"]')) {
        return;
      }

      const rect = overlayRef.current.getBoundingClientRect();
      const xDisplay = e.clientX - rect.left;
      const yDisplay = e.clientY - rect.top;
      const hit = getMaskHit(xDisplay, yDisplay);

      if (hit) {
        suppressBackgroundClickRef.current = true;
        window.setTimeout(() => {
          suppressBackgroundClickRef.current = false;
        }, 200);
        if (hit !== activeMaskId) {
          e.preventDefault();
          e.stopPropagation();
          handleClick(hit);
          handleHover(hit);
          setHoverPosition({ x: e.clientX, y: e.clientY });
        }
        return;
      }

      if (onBackgroundDeselect) {
        onBackgroundDeselect();
      }
      handleHover(null);
    },
    [activeMaskId, getMaskHit, handleClick, handleHover, hasLayout, isManipulating, onBackgroundDeselect]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      role="img"
      aria-label="Segmented image with interactive masks"
      onClick={handleBackgroundClick}
      onMouseLeave={() => handleHover(null)}
    >
      {optimizedImageSrc && (
        <img
          ref={imageRef}
          src={optimizedImageSrc}
          alt="Original"
          className="w-full h-full object-contain"
          onLoad={handleImageLoad}
        />
      )}

      {masksVisible && hasLayout && (
        <div
          ref={overlayRef}
          className="absolute"
          style={{
            left: `${layout.offsetX}px`,
            top: `${layout.offsetY}px`,
            width: `${layout.width}px`,
            height: `${layout.height}px`,
          }}
          onPointerMoveCapture={handleOverlayPointerMove}
          onPointerLeave={handleOverlayPointerLeave}
          onPointerDownCapture={handleOverlayPointerDownCapture}
        >
          {/* Render masks with integrated visual overlay inside DraggableMaskOverlay */}
          {/* Render masks with integrated visual overlay inside DraggableMaskOverlay */}
          {masks.slice(0, visibleMaskCount).map((mask) => {
            const manipState = maskManipulation.get(mask.mask_id);
            if (manipState?.isHidden) {
              return null;
            }

            const isSelected = activeMaskId === mask.mask_id;
            const isHovered = hoveredMaskId === mask.mask_id;
            const color = getMaskColor(mask.mask_id);

            return (
              <DraggableMaskOverlay
                key={mask.mask_id}
                mask={mask}
                isSelected={!!isSelected}
                isHovered={!!isHovered}
                isHitTarget={hoveredMaskId === mask.mask_id}
                imageSize={imageSize}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(mask.mask_id);
                }}
                onMouseEnter={() => undefined}
                onMouseLeave={() => undefined}
                imageContainerRef={overlayRef}
                displayScale={layout.scale}
                maskColor={color}
                containerSize={{ width: layout.width, height: layout.height }}
                disableTooltip
              />
            );
          })}
        </div>
      )}

      {hoveredMask && (
        <MaskTooltip
          mask={hoveredMask}
          visible={!!hoveredMaskId}
          position={hoverPosition}
          imageContainerRef={overlayRef}
          boundingBox={
            (() => {
              const manipState = maskManipulation.get(hoveredMask.mask_id);
              const bbox = manipState?.currentBoundingBox || hoveredMask.bounding_box;
              return {
                x1: bbox.x1 * layout.scale,
                y1: bbox.y1 * layout.scale,
                x2: bbox.x2 * layout.scale,
                y2: bbox.y2 * layout.scale,
              };
            })()
          }
        />
      )}

      {hasLayout && optimizedImageSrc && showPreview && (
        <MaskPreviewPanel
          selectedMask={selectedMask}
          maskManipulation={maskManipulation}
          globalEdits={globalEdits}
          globalFilter={globalFilter}
          imageSize={imageSize}
          originalImageUrl={originalImageUrl}
          masksLookup={masksLookup}
        />
      )}

      <button
        type="button"
        className="absolute bottom-4 right-4 h-9 w-9 rounded-full bg-background/90 border border-border shadow-md text-sm hover:bg-muted transition-colors flex items-center justify-center"
        onClick={() => setShowPreview((v) => !v)}
        aria-label={showPreview ? 'Hide preview' : 'Show preview'}
      >
        {showPreview ?
          <EyeIcon />
          :
          <EyeOffIcon />

        }
      </button>
    </div>
  );
});

MaskViewer.displayName = 'MaskViewer';

interface MaskPreviewPanelProps {
  selectedMask: MaskMetadata | null;
  maskManipulation: Map<string, MaskManipulationState>;
  globalEdits: {
    brightness: number;
    contrast: number;
    saturation: number;
    rotation: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
    hue: number;
    blur: number;
    exposure: number;
    vibrance: number;
    sharpen: number;
    highlights: number;
    shadows: number;
    temperature: number;
    tint: number;
    vignette: number;
    grain: number;
  };
  globalFilter: string;
  imageSize: { width: number; height: number };
  originalImageUrl: string;
  masksLookup: Map<string, MaskMetadata>;
}

const MaskPreviewPanel: React.FC<MaskPreviewPanelProps> = React.memo(({
  selectedMask,
  maskManipulation,
  globalEdits,
  globalFilter,
  imageSize,
  originalImageUrl,
  masksLookup,
}) => {
  const visibleManipulations = React.useMemo(
    () => Array.from(maskManipulation.values()).filter(
      (manip) => !manip.isHidden && masksLookup.has(manip.maskId)
    ),
    [maskManipulation, masksLookup]
  );

  const renderCompositePreview = React.useCallback(({
    previewWidth,
    previewHeight,
    scale,
    offsetX = 0,
    offsetY = 0,
  }: {
    previewWidth: number;
    previewHeight: number;
    scale: number;
    offsetX?: number;
    offsetY?: number;
  }) => {
    if (!imageSize.width || !imageSize.height) return null;
    if (!Number.isFinite(previewWidth) || previewWidth <= 0 || previewHeight <= 0) return null;

    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    if (!Number.isFinite(scaledWidth) || !Number.isFinite(scaledHeight) || scaledWidth <= 0 || scaledHeight <= 0) {
      return null;
    }

    return (
      <div
        className="relative rounded-md overflow-hidden border border-border/60 bg-muted/40"
        style={{ width: previewWidth, height: previewHeight }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${originalImageUrl})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${scaledWidth}px ${scaledHeight}px`,
            backgroundPosition: `${-offsetX * scale}px ${-offsetY * scale}px`,
            filter: globalFilter,
          }}
        />
        {visibleManipulations.map((manip) => {
          const bbox = manip.currentBoundingBox;
          const maskWidth = bbox.x2 - bbox.x1;
          const maskHeight = bbox.y2 - bbox.y1;
          if (maskWidth <= 0 || maskHeight <= 0) return null;
          const maskMeta = masksLookup.get(manip.maskId);
          if (!maskMeta) return null;

          const maskScaleX = manip.transform.scale.width || 1;
          const maskScaleY = manip.transform.scale.height || 1;
          const positionX = (manip.transform.position.x - offsetX) * scale;
          const positionY = (manip.transform.position.y - offsetY) * scale;
          const sizeX = scaledWidth * maskScaleX;
          const sizeY = scaledHeight * maskScaleY;
          if (!Number.isFinite(sizeX) || !Number.isFinite(sizeY) || sizeX <= 0 || sizeY <= 0) {
            return null;
          }

          const filter = combineTransforms({
            brightness: globalEdits.brightness + (manip.transform.imageEdits.brightness || 0),
            contrast: globalEdits.contrast + (manip.transform.imageEdits.contrast || 0),
            saturation: globalEdits.saturation + (manip.transform.imageEdits.saturation || 0),
            rotation: globalEdits.rotation,
            flipHorizontal: globalEdits.flipHorizontal,
            flipVertical: globalEdits.flipVertical,
            hue: globalEdits.hue + (manip.transform.imageEdits.hue || 0),
            blur: globalEdits.blur + (manip.transform.imageEdits.blur || 0),
            exposure: globalEdits.exposure + (manip.transform.imageEdits.exposure || 0),
            vibrance: globalEdits.vibrance + (manip.transform.imageEdits.vibrance || 0),
          }).filter;

          return (
            <div
              key={`combined-${manip.maskId}`}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${originalImageUrl})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${sizeX}px ${sizeY}px`,
                backgroundPosition: `${positionX}px ${positionY}px`,
                maskImage: `url(${maskMeta.mask_url})`,
                WebkitMaskImage: `url(${maskMeta.mask_url})`,
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskSize: `${sizeX}px ${sizeY}px`,
                WebkitMaskSize: `${sizeX}px ${sizeY}px`,
                maskPosition: `${positionX}px ${positionY}px`,
                WebkitMaskPosition: `${positionX}px ${positionY}px`,
                filter,
                mixBlendMode: 'normal',
                opacity: 0.9,
              }}
            />
          );
        })}
      </div>
    );
  }, [globalEdits, globalFilter, imageSize.height, imageSize.width, masksLookup, originalImageUrl, visibleManipulations]);

  const content = React.useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return null;
    }

    if (!selectedMask) {
      const previewWidth = 260;
      const scale = previewWidth / imageSize.width;
      const previewHeight = imageSize.height * scale || previewWidth * 0.5625;
      return renderCompositePreview({
        previewWidth,
        previewHeight,
        scale,
      });
    }

    const manipState = maskManipulation.get(selectedMask.mask_id);
    if (!manipState) return null;

    const bbox = manipState.currentBoundingBox;
    const maskWidth = bbox.x2 - bbox.x1;
    const maskHeight = bbox.y2 - bbox.y1;
    if (maskWidth <= 0 || maskHeight <= 0) return null;
    const maxPreviewWidth = 260;
    const scale = Math.min(maxPreviewWidth / maskWidth, 1);
    const previewWidth = maskWidth * scale;
    const previewHeight = maskHeight * scale;
    if (!Number.isFinite(previewWidth) || previewWidth <= 0 || previewHeight <= 0) {
      return null;
    }

    return renderCompositePreview({
      previewWidth,
      previewHeight,
      scale,
      offsetX: bbox.x1,
      offsetY: bbox.y1,
    });
  }, [imageSize, selectedMask, maskManipulation, renderCompositePreview]);

  return (
    <div className="absolute bottom-4 right-4 bg-background/95 border border-border rounded-lg shadow-lg p-3 w-[280px] space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {selectedMask ? (selectedMask.promptText || selectedMask.label) : 'Combined Preview'}
        </p>
        <span className="text-[11px] text-muted-foreground">{selectedMask ? 'Object' : 'Combined'}</span>
      </div>
      {content}
    </div>
  );
});

MaskPreviewPanel.displayName = 'MaskPreviewPanel';
