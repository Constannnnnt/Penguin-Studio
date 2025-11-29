import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { type MaskMetadata, useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { cn } from '@/shared/lib/utils';

interface BoundingBoxSectionProps {
  mask: MaskMetadata;
  defaultCollapsed?: boolean;
}

export const BoundingBoxSection: React.FC<BoundingBoxSectionProps> = ({ 
  mask, 
  defaultCollapsed = true 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const { maskManipulation } = useSegmentationStore();
  const manipState = maskManipulation.get(mask.mask_id);
  const bbox = manipState?.currentBoundingBox || mask.bounding_box;

  const toggleLabel = isCollapsed ? 'Expand spatial information' : 'Collapse spatial information';

  return (
    <div className="space-y-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsCollapsed(!isCollapsed);
        }}
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          "text-muted-foreground/70 hover:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
        )}
        aria-label={toggleLabel}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        )}
        <span>Spatial Information</span>
      </button>

      {!isCollapsed && (
        <div className="space-y-2 pl-4 animate-in fade-in duration-100">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground/80">
            <div>
              <span className="font-medium">X1:</span> {Math.round(bbox.x1)}
            </div>
            <div>
              <span className="font-medium">Y1:</span> {Math.round(bbox.y1)}
            </div>
            <div>
              <span className="font-medium">X2:</span> {Math.round(bbox.x2)}
            </div>
            <div>
              <span className="font-medium">Y2:</span> {Math.round(bbox.y2)}
            </div>
          </div>

          <div className="text-xs text-muted-foreground/80">
            <span className="font-medium">Centroid:</span> ({Math.round(mask.centroid[0])}, {Math.round(mask.centroid[1])})
          </div>

          <div className="text-xs text-muted-foreground/80">
            <span className="font-medium">Area:</span> {mask.area_pixels.toLocaleString()} px ({mask.area_percentage.toFixed(2)}%)
          </div>
        </div>
      )}
    </div>
  );
};
