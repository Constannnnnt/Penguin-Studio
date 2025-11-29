import { useEffect, useRef, useMemo } from 'react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { ObjectListItem } from './ObjectListItem';

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
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">No objects detected. Upload an image for segmentation.</p>
      </div>
    );
  }

  // Use virtualization for large lists
  const useVirtualization = sortedMasks.length > VIRTUALIZATION_THRESHOLD;

  if (useVirtualization) {
    // For large lists, we could implement virtualization here
    // For now, we'll use the standard approach with optimized rendering
    console.log(`[ObjectsTab] Large list detected (${sortedMasks.length} items), consider implementing virtualization`);
  }

  return (
    <div 
      ref={listRef} 
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollBehavior: 'smooth' }}
      role="list"
      aria-label="Detected objects"
    >
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
  );
};
