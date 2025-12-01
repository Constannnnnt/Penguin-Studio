import type { MaskMetadata } from '@/features/segmentation/store/segmentationStore';
import { MetadataSection } from './MetadataSection';

interface ObjectDetailsTabProps {
  mask: MaskMetadata;
}

export const ObjectDetailsTab: React.FC<ObjectDetailsTabProps> = ({ mask }) => {
  return (
    <div className="space-y-4">
      {/* Object Metadata Section - shows description, visual properties, spatial context */}
      <MetadataSection mask={mask} />

      <hr className="border-border" />

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Label</h3>
        <p className="text-sm text-muted-foreground">{mask.label}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-foreground">Confidence</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${mask.confidence * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground min-w-[3rem] text-right">
            {(mask.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-foreground">Bounding Box</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 p-2 rounded">
            <span className="text-muted-foreground">X1:</span>{' '}
            <span className="font-medium text-foreground">{mask.bounding_box.x1.toFixed(0)}</span>
          </div>
          <div className="bg-muted/50 p-2 rounded">
            <span className="text-muted-foreground">Y1:</span>{' '}
            <span className="font-medium text-foreground">{mask.bounding_box.y1.toFixed(0)}</span>
          </div>
          <div className="bg-muted/50 p-2 rounded">
            <span className="text-muted-foreground">X2:</span>{' '}
            <span className="font-medium text-foreground">{mask.bounding_box.x2.toFixed(0)}</span>
          </div>
          <div className="bg-muted/50 p-2 rounded">
            <span className="text-muted-foreground">Y2:</span>{' '}
            <span className="font-medium text-foreground">{mask.bounding_box.y2.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Area</h3>
        <p className="text-sm text-muted-foreground">
          {mask.area_pixels.toLocaleString()} pixels ({mask.area_percentage.toFixed(2)}%)
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Centroid</h3>
        <p className="text-sm text-muted-foreground">
          ({mask.centroid[0].toFixed(1)}, {mask.centroid[1].toFixed(1)})
        </p>
      </div>
    </div>
  );
};
