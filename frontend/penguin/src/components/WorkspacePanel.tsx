import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { ImageViewer } from './ImageViewer';
import { MaskViewer } from './MaskViewer';
import { PromptControls } from './PromptControls';
import { useConfigStore } from '@/store/configStore';
import { useSegmentationStore } from '@/store/segmentationStore';
import { useGeneration } from '@/hooks/useGeneration';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';

export interface WorkspacePanelRef {
  handleGenerate: () => void;
  handleRefine: () => void;
}

type ViewMode = 'original' | 'segmented';

export const WorkspacePanel = forwardRef<WorkspacePanelRef>((_props, ref) => {
  const shortDescription = useConfigStore((state) => state.config.short_description);
  const config = useConfigStore((state) => state.config);
  const updateConfig = useConfigStore((state) => state.updateConfig);

  const [localPrompt, setLocalPrompt] = useState(shortDescription);
  const debouncedPrompt = useDebounce(localPrompt, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('original');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadataInputRef = useRef<HTMLInputElement>(null);

  const { generateImage, refineImage, isLoading, generatedImage, error } = useGeneration();
  
  const segmentationResults = useSegmentationStore((state) => state.results);
  const selectedMaskId = useSegmentationStore((state) => state.selectedMaskId);
  const isSegmenting = useSegmentationStore((state) => state.isProcessing);
  const segmentationError = useSegmentationStore((state) => state.error);
  const uploadImage = useSegmentationStore((state) => state.uploadImage);
  const selectMask = useSegmentationStore((state) => state.selectMask);

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

  const handleFileUpload = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    const metadataFile = metadataInputRef.current?.files?.[0];
    await uploadImage(file, metadataFile);
    setViewMode('segmented');
  };

  const handleMaskHover = (maskId: string | null): void => {
    if (maskId) {
      selectMask(maskId);
    }
  };

  const handleMaskClick = (maskId: string): void => {
    selectMask(selectedMaskId === maskId ? null : maskId);
  };

  useImperativeHandle(ref, () => ({
    handleGenerate,
    handleRefine,
  }));

  const showSegmentedView = viewMode === 'segmented' && segmentationResults;

  return (
    <main
      className="flex-1 flex flex-col min-w-[400px] overflow-hidden bg-background"
      role="main"
      aria-label="Workspace panel"
    >
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="mb-4 flex gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFileUpload}
            disabled={isSegmenting}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload for Segmentation
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload image file"
          />
          
          <input
            ref={metadataInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            aria-label="Upload metadata file"
          />

          {segmentationResults && (
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant={viewMode === 'original' ? 'default' : 'outline'}
                onClick={() => setViewMode('original')}
              >
                Original
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'segmented' ? 'default' : 'outline'}
                onClick={() => setViewMode('segmented')}
              >
                Segmented
              </Button>
            </div>
          )}
        </div>

        {showSegmentedView ? (
          <div className="relative w-full aspect-video bg-muted/50 rounded-lg overflow-hidden border border-border">
            <MaskViewer
              originalImageUrl={segmentationResults.original_image_url}
              masks={segmentationResults.masks}
              selectedMaskId={selectedMaskId}
              onMaskHover={handleMaskHover}
              onMaskClick={handleMaskClick}
            />
          </div>
        ) : (
          <ImageViewer
            image={generatedImage}
            isLoading={isLoading || isSegmenting}
            error={error || segmentationError}
          />
        )}
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
