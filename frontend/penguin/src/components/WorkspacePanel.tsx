import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ImageViewer } from './ImageViewer';
import { PromptControls } from './PromptControls';
import { useConfigStore } from '@/store/configStore';
import { useGeneration } from '@/hooks/useGeneration';
import { useDebounce } from '@/hooks/useDebounce';

export interface WorkspacePanelRef {
  handleGenerate: () => void;
  handleRefine: () => void;
}

export const WorkspacePanel = forwardRef<WorkspacePanelRef>((_props, ref) => {
  const shortDescription = useConfigStore((state) => state.config.short_description);
  const config = useConfigStore((state) => state.config);
  const updateConfig = useConfigStore((state) => state.updateConfig);

  const [localPrompt, setLocalPrompt] = useState(shortDescription);
  const debouncedPrompt = useDebounce(localPrompt, 300);

  const { generateImage, refineImage, isLoading, generatedImage, error } = useGeneration();

  useEffect(() => {
    if (debouncedPrompt !== shortDescription) {
      updateConfig('short_description', debouncedPrompt);
    }
  }, [debouncedPrompt, shortDescription, updateConfig]);

  useEffect(() => {
    setLocalPrompt(shortDescription);
  }, [shortDescription]);

  const handleGenerate = (): void => {
    generateImage(config);
  };

  const handleRefine = (): void => {
    if (generatedImage) {
      refineImage(config, generatedImage);
    }
  };

  useImperativeHandle(ref, () => ({
    handleGenerate,
    handleRefine,
  }));

  return (
    <main
      className="flex-1 flex flex-col min-w-[400px] overflow-hidden bg-background"
      role="main"
      aria-label="Workspace panel"
    >
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <ImageViewer
          image={generatedImage}
          isLoading={isLoading}
          error={error}
        />
      </div>

      <div className="border-t border-border p-3 md:p-4 bg-muted/20">
        <PromptControls
          prompt={localPrompt}
          onPromptChange={setLocalPrompt}
          onGenerate={handleGenerate}
          onRefine={handleRefine}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
});

WorkspacePanel.displayName = 'WorkspacePanel';
