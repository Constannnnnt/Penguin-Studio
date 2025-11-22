import { useState } from 'react';
import { useSegmentationStore } from '@/store/segmentationStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ObjectDetailsTab } from './ObjectDetailsTab';
import { LightingDetailsTab } from './LightingDetailsTab';
import { CameraDetailsTab } from './CameraDetailsTab';

export const ObjectMetadataPanel: React.FC = () => {
  const { results, selectedMaskId, hoveredMaskId } = useSegmentationStore();
  const [activeTab, setActiveTab] = useState<'object' | 'lighting' | 'camera'>('object');

  const activeMaskId = selectedMaskId || hoveredMaskId;
  const activeMask = results?.masks.find((m) => m.mask_id === activeMaskId);

  if (!activeMask) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Hover over or select an object to see details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'object' | 'lighting' | 'camera')}>
        <TabsList className="w-full rounded-none border-b border-border bg-muted/50">
          <TabsTrigger value="object" className="flex-1 text-sm">
            Object
          </TabsTrigger>
          <TabsTrigger value="lighting" className="flex-1 text-sm">
            Lighting
          </TabsTrigger>
          <TabsTrigger value="camera" className="flex-1 text-sm">
            Camera
          </TabsTrigger>
        </TabsList>

        <TabsContent value="object" className="flex-1 overflow-y-auto p-4 mt-0">
          <ObjectDetailsTab mask={activeMask} />
        </TabsContent>

        <TabsContent value="lighting" className="flex-1 overflow-y-auto p-4 mt-0">
          <LightingDetailsTab />
        </TabsContent>

        <TabsContent value="camera" className="flex-1 overflow-y-auto p-4 mt-0">
          <CameraDetailsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
