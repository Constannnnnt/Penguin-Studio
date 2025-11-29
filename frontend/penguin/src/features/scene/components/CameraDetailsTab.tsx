import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';

export const CameraDetailsTab: React.FC = () => {
  const results = useSegmentationStore((state) => state.results);
  const metadata = results?.metadata;

  if (!metadata?.photographic_characteristics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No camera information available</p>
      </div>
    );
  }

  const camera = metadata.photographic_characteristics;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Angle</h3>
        <p className="text-sm text-muted-foreground">{camera.camera_angle}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Focal Length</h3>
        <p className="text-sm text-muted-foreground">{camera.lens_focal_length}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Depth of Field</h3>
        <p className="text-sm text-muted-foreground">{camera.depth_of_field}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Focus</h3>
        <p className="text-sm text-muted-foreground">{camera.focus}</p>
      </div>
    </div>
  );
};
