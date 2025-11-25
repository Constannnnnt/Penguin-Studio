import { useLayoutStore } from '@/store/layoutStore';
import { PanelHeader } from './PanelHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImageControlsTab } from './ImageControlsTab';
import { GenerationControlsTab } from './GenerationControlsTab';
import { ObjectMetadataPanel } from './ObjectMetadataPanel';

export const ControlsPanel: React.FC = () => {
  const { activeControlsTab, setActiveControlsTab } = useLayoutStore();

  return (
    <aside className="flex h-full flex-col" aria-label=" controls panel">
      <PanelHeader
        title=" Edit"
        position="right"
      />

      <Tabs
        value={activeControlsTab}
        onValueChange={(value) => setActiveControlsTab(value as 'image' | 'scene' | 'objects')}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full rounded-none border-b border-border bg-muted/50">
          <TabsTrigger value="image" className="flex-1 text-sm transition-all duration-150">
            Image
          </TabsTrigger>
          <TabsTrigger value="scene" className="flex-1 text-sm transition-all duration-150">
            Scene
          </TabsTrigger>
          <TabsTrigger value="objects" className="flex-1 text-sm transition-all duration-150">
            Objects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="flex-1 overflow-y-auto p-4 mt-0 space-y-4 animate-in fade-in duration-200">
          <ImageControlsTab />
        </TabsContent>

        <TabsContent value="scene" className="flex-1 overflow-y-auto p-4 mt-0 animate-in fade-in duration-200">
          <GenerationControlsTab />
        </TabsContent>

        <TabsContent value="objects" className="flex-1 overflow-y-auto mt-0 animate-in fade-in duration-200">
          <ObjectMetadataPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
};
