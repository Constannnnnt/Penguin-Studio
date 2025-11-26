import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { ImageViewer } from './ImageViewer';
import { MaskViewer } from './MaskViewer';
import { PromptControls } from './PromptControls';
import { ErrorOverlay } from './ErrorOverlay';
import { useConfigStore } from '@/store/configStore';
import { useSegmentationStore } from '@/store/segmentationStore';
import { useGeneration } from '@/hooks/useGeneration';
import { useDebounce } from '@/hooks/useDebounce';
import { useMaskKeyboardShortcuts, MASK_KEYBOARD_SHORTCUTS } from '@/hooks/useMaskKeyboardShortcuts';
import { Button } from './ui/button';
import { Keyboard } from 'lucide-react';

export interface WorkspacePanelRef {
  handleGenerate: () => void;
  handleRefine: () => void;
}

type ViewMode = 'original' | 'segmented';

export const WorkspacePanel = forwardRef<WorkspacePanelRef>((_props, ref) => {
  const shortDescription = useConfigStore((state) => state.config.short_description);
  const config = useConfigStore((state) => state.config);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  
  // Enhanced config store for enhanced scene tab
  const activePanel = useConfigStore((state) => state.activePanel);
  // const getGenerationConfig = useConfigStore((state) => state.getGenerationConfig);
  
  // Determine if we're using enhanced scene configuration
  // const isUsingEnhancedScene = activePanel === 'enhanced-scene' || enhancedActivePanel === 'enhanced-scene';

  const [localPrompt, setLocalPrompt] = useState(shortDescription);
  const debouncedPrompt = useDebounce(localPrompt, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadataInputRef = useRef<HTMLInputElement>(null);

  const { generateImage, refineImage, isLoading, generatedImage, error } = useGeneration();
  
  const segmentationResults = useSegmentationStore((state) => state.results);
  const selectedMaskId = useSegmentationStore((state) => state.selectedMaskId);
  const isSegmenting = useSegmentationStore((state) => state.isProcessing);
  const segmentationError = useSegmentationStore((state) => state.error);
  const segmentationErrorCode = useSegmentationStore((state) => state.errorCode);
  const uploadImage = useSegmentationStore((state) => state.uploadImage);
  const selectMask = useSegmentationStore((state) => state.selectMask);
  const hoverMask = useSegmentationStore((state) => state.hoverMask);
  const retryLastOperation = useSegmentationStore((state) => state.retryLastOperation);

  useMaskKeyboardShortcuts({ enabled: viewMode === 'segmented' && !!segmentationResults });

  useEffect(() => {
    if (debouncedPrompt !== shortDescription) {
      updateConfig('short_description', debouncedPrompt);
    }
  }, [debouncedPrompt, shortDescription, updateConfig]);

  useEffect(() => {
    setLocalPrompt(shortDescription);
  }, [shortDescription]);

  const handleGenerate = (): void => {
    // Use enhanced configuration if enhanced scene tab is active
    const configToUse = config;
    generateImage(configToUse);
  };

  const handleRefine = (): void => {
    if (generatedImage) {
      // Use enhanced configuration if enhanced scene tab is active
      const configToUse = config;
      refineImage(configToUse, generatedImage);
    }
  };

  const handleFileUpload = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    const metadataFile = metadataInputRef.current?.files?.[0];
    await uploadImage(file, metadataFile, localPrompt || shortDescription);
    setViewMode('segmented');
  };

  const handleMaskHover = (maskId: string | null): void => {
    hoverMask(maskId);
  };

  const handleMaskClick = (maskId: string): void => {
    selectMask(selectedMaskId === maskId ? null : maskId);
  };

  const handleBackgroundDeselect = (): void => {
    selectMask(null);
  };

  useImperativeHandle(ref, () => ({
    handleGenerate,
    handleRefine,
  }));

  const showSegmentedView = viewMode === 'segmented' && segmentationResults;
  const showSegmentationOriginal = viewMode === 'original' && segmentationResults;
  const originalImageToShow = showSegmentationOriginal
    ? segmentationResults?.original_image_url || null
    : generatedImage;

  return (
    <main
      className="flex-1 flex flex-col min-w-[400px] overflow-hidden bg-background"
      role="main"
      aria-label="Workspace panel"
    >
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="mb-4 flex gap-2 items-center">
          {/* <Button
            size="sm"
            variant="outline"
            onClick={handleFileUpload}
            disabled={isSegmenting}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload for Segmentation
          </Button> */}
          
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
                onClick={() => {
                  setViewMode('original');
                  selectMask(null);
                }}
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                title="Keyboard shortcuts"
              >
                <Keyboard className="h-4 w-4" />
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
              onBackgroundDeselect={handleBackgroundDeselect}
            />
            
            {showShortcutsHelp && (
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 max-w-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowShortcutsHelp(false)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{MASK_KEYBOARD_SHORTCUTS.cycleForward.description}</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Tab</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{MASK_KEYBOARD_SHORTCUTS.cycleBackward.description}</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Shift+Tab</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{MASK_KEYBOARD_SHORTCUTS.deselect.description}</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Esc</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{MASK_KEYBOARD_SHORTCUTS.toggleVisibility.description}</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">M</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : segmentationError ? (
          <div className="relative w-full aspect-video bg-muted/50 rounded-lg overflow-hidden border border-border">
            <ErrorOverlay
              error={segmentationError}
              errorCode={segmentationErrorCode || undefined}
              onRetry={retryLastOperation}
              isRetrying={isSegmenting}
            />
          </div>
        ) : (
          <ImageViewer
            image={originalImageToShow}
            isLoading={isLoading || isSegmenting}
            error={error}
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
