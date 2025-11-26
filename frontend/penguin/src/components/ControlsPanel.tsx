import { useLayoutStore } from '@/store/layoutStore';
import { useConfigStore } from '@/store/configStore';
import { PanelHeader } from './PanelHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImageControlsTab } from './ImageControlsTab';
// import { GenerationControlsTab } from './GenerationControlsTab';
import { ObjectsTab } from './ObjectsTab';
import { SceneTab } from './SceneTab';
import { cn } from '@/lib/utils';

export const ControlsPanel: React.FC = () => {
  const { activeControlsTab, setActiveControlsTab } = useLayoutStore();
  const activePanel = useConfigStore((state) => state.activePanel);


  // Determine the scene tab content based on mode
  const SceneTabContent = SceneTab;
  
  return (
    <aside className="flex h-full flex-col" aria-label="Controls panel">
      <PanelHeader
        title="Edit"
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

        <TabsContent value="scene" className={cn(
          "flex-1 mt-0 animate-in fade-in duration-200 overflow-hidden",
          // isEnhancedMode ? "overflow-hidden" : "overflow-y-auto p-4"
        )}>
          <SceneTabContent />
        </TabsContent>

        <TabsContent value="objects" className="flex-1 overflow-y-auto mt-0 animate-in fade-in duration-200">
          <ObjectsTab />
        </TabsContent>
      </Tabs>
    </aside>
  );
};
