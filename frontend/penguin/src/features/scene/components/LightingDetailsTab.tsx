import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';

export const LightingDetailsTab: React.FC = () => {
  const results = useSegmentationStore((state) => state.results);
  const metadata = results?.metadata;

  if (!metadata?.lighting) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No lighting information available</p>
      </div>
    );
  }

  const { lighting } = metadata;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Conditions</h3>
        <p className="text-sm text-muted-foreground">{lighting.conditions}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Direction</h3>
        <p className="text-sm text-muted-foreground">{lighting.direction}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1 text-foreground">Shadows</h3>
        <p className="text-sm text-muted-foreground">{lighting.shadows}</p>
      </div>
    </div>
  );
};
