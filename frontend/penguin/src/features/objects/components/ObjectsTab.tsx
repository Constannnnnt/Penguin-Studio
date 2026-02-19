import { useEffect, useRef, useMemo } from 'react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { ObjectListItem } from './ObjectListItem';
import { UploadForSegmentationButton } from '@/features/segmentation/components/UploadForSegmentationButton';

// Threshold for enabling virtualization (number of objects)
const VIRTUALIZATION_THRESHOLD = 20;

export const ObjectsTab: React.FC = () => {
  const { results, selectedMaskId, hoveredMaskId, hoverMask, selectMask } = useSegmentationStore();
  const listRef = useRef<HTMLDivElement>(null);

  // Memoize sorted masks to prevent unnecessary re-sorting
  const sortedMasks = useMemo(() => {
    if (!results) return [];
    return [...results.masks].sort((a, b) => b.confidence - a.confidence);
  }, [results]);

  useEffect(() => {
    if (hoveredMaskId && listRef.current) {
      const itemElement = listRef.current.querySelector(`[data-mask-id="${hoveredMaskId}"]`);
      if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [hoveredMaskId]);

  if (!results || results.masks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="industrial-panel p-8 text-center max-w-xs w-full">
          <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-xl">🔍</span>
          </div>
          <h3 className="text-lg font-heading font-black uppercase tracking-wider text-primary mb-2">No Objects</h3>
          <p className="text-xs font-mono text-muted-foreground mb-6">
            Upload an image to detect and segment objects automatically.
          </p>
          <UploadForSegmentationButton />
        </div>
      </div>
    );
  }

  // Use virtualization for large lists
  const useVirtualization = sortedMasks.length > VIRTUALIZATION_THRESHOLD;

  // TODO

  // if (useVirtualization) {
  //   // For large lists, we could implement virtualization here
  //   // For now, we'll use the standard approach with optimized rendering
  //   console.log(`[ObjectsTab] Large list detected (${sortedMasks.length} items), consider implementing virtualization`);
  // }

  return (
    <div
      ref={listRef}
      className="flex flex-col h-full overflow-y-auto px-1 studio-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
      role="list"
      aria-label="Detected objects"
    >
      <div className="space-y-1 py-1">
        {sortedMasks.map((mask, index) => (
          <ObjectListItem
            key={mask.mask_id}
            mask={mask}
            isSelected={selectedMaskId === mask.mask_id}
            isHovered={hoveredMaskId === mask.mask_id}
            onHover={() => hoverMask(mask.mask_id)}
            onHoverEnd={() => hoverMask(null)}
            onClick={() => selectMask(mask.mask_id)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};
