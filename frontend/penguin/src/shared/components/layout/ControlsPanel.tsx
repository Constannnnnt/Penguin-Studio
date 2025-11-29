import { useState, useMemo, useCallback } from 'react';
import { Sparkles, Download } from 'lucide-react';
import { useLayoutStore } from '@/core/store/layoutStore';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { useFileSystemStore } from '@/core/store/fileSystemStore';
import { PanelHeader } from './PanelHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { ImageControlsTab } from '@/features/imageEdit/components/ImageControlsTab';
import { ObjectsTab } from '@/features/objects/components/ObjectsTab';
import { SceneTab } from '@/features/scene/components/SceneTab';
import { cn } from '@/shared/lib/utils';
import { env } from '@/shared/lib/env';
import { useToast } from '@/shared/hooks/useToast';
import { semanticGenerationService } from '@/core/services/semanticGeneration';
import { generateSemanticJSONFilename } from '@/core/services/semanticGeneration/fileSaver';
import { notifySaveSuccess, notifySaveError, notifyGenerationStarted } from '@/core/services/semanticGeneration/notifier';

export const ControlsPanel: React.FC = () => {
  const { activeControlsTab, setActiveControlsTab, workspaceHandlers } = useLayoutStore();
  const config = useConfigStore((state) => state.config);
  const segmentationResults = useSegmentationStore((state) => state.results);
  const refreshFileTree = useFileSystemStore((state) => state.refreshFileTree);
  const { toast } = useToast();
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const metadataPayload = useMemo(() => {
    const baseMetadata = segmentationResults?.metadata;
    const objectsFromMasks =
      segmentationResults?.masks.map((mask) => ({
        description: mask.objectMetadata?.description || mask.label || '',
        location: mask.objectMetadata?.location || '',
        relationship: mask.objectMetadata?.relationship || '',
        relative_size: mask.objectMetadata?.relative_size || '',
        shape_and_color: mask.objectMetadata?.shape_and_color || '',
        texture: mask.objectMetadata?.texture || '',
        appearance_details: mask.objectMetadata?.appearance_details || '',
        orientation: mask.objectMetadata?.orientation || '',
      })) || [];

    const lightingDirection =
      typeof config.lighting.direction === 'object'
        ? JSON.stringify(config.lighting.direction)
        : baseMetadata?.lighting?.direction || '';

    const toText = (value: unknown, fallback: string = ''): string => {
      if (value === undefined || value === null) return fallback;
      if (typeof value === 'number') return value.toString();
      return String(value);
    };

    return {
      short_description: config.short_description || baseMetadata?.short_description || '',
      objects: objectsFromMasks.length > 0 ? objectsFromMasks : baseMetadata?.objects || [],
      background_setting: config.background_setting || baseMetadata?.background_setting || '',
      lighting: {
        conditions: config.lighting.conditions || baseMetadata?.lighting?.conditions || '',
        direction: lightingDirection || '',
        shadows: toText(config.lighting.shadows, baseMetadata?.lighting?.shadows || ''),
      },
      aesthetics: {
        composition: config.aesthetics.composition || baseMetadata?.aesthetics?.composition || '',
        color_scheme: config.aesthetics.color_scheme || baseMetadata?.aesthetics?.color_scheme || '',
        mood_atmosphere: config.aesthetics.mood_atmosphere || baseMetadata?.aesthetics?.mood_atmosphere || '',
        style_medium: config.aesthetics.style_medium || baseMetadata?.style_medium || '',
        aesthetic_style: config.aesthetics.aesthetic_style || '',
      },
      photographic_characteristics: {
        depth_of_field: toText(
          config.photographic_characteristics.depth_of_field,
          baseMetadata?.photographic_characteristics?.depth_of_field || ''
        ),
        focus: toText(
          config.photographic_characteristics.focus,
          baseMetadata?.photographic_characteristics?.focus || ''
        ),
        camera_angle: config.photographic_characteristics.camera_angle ||
          baseMetadata?.photographic_characteristics?.camera_angle || '',
        lens_focal_length: config.photographic_characteristics.lens_focal_length ||
          baseMetadata?.photographic_characteristics?.lens_focal_length || '',
      },
      style_medium: config.style_medium || baseMetadata?.style_medium || '',
      artistic_style: config.artistic_style || '',
      context: config.context || baseMetadata?.context || '',
    };
  }, [config, segmentationResults]);

  const handleSaveMetadata = useCallback(async (): Promise<boolean> => {
    const resultId = segmentationResults?.result_id;
    if (!resultId) {
      return false;
    }

    // Skip metadata save for generation folders (they use save-prompt endpoint)
    if (resultId.startsWith('gen-')) {
      return true;
    }

    try {
      const response = await fetch(
        `${env.apiBaseUrl}/api/v1/results/${resultId}/metadata`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadataPayload),
        }
      );

      if (!response.ok) {
        return false;
      }

      await refreshFileTree();
      return true;
    } catch {
      return false;
    }
  }, [metadataPayload, refreshFileTree, segmentationResults?.result_id]);

  const handleRefineAndSave = useCallback(async () => {
    setIsSavingMetadata(true);
    toast({ title: 'Refining...', description: 'Generating new image' });
    
    try {
      await handleSaveMetadata();
      workspaceHandlers?.handleRefine?.();
    } finally {
      setIsSavingMetadata(false);
    }
  }, [handleSaveMetadata, toast, workspaceHandlers]);

  const handleExportScene = useCallback(async () => {
    setIsExporting(true);
    notifyGenerationStarted();

    try {
      // Generate semantic JSON from current state
      const semanticJSON = semanticGenerationService.generateSemanticJSON();

      // Validate the generated JSON
      const validationResult = semanticGenerationService.validate(semanticJSON);
      if (!validationResult.valid) {
        notifySaveError(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
        return;
      }

      // Generate filename based on timestamp
      const filename = generateSemanticJSONFilename('scene');

      // Save to file (triggers browser download)
      const saveResult = await semanticGenerationService.saveToFile(semanticJSON, filename);

      if (saveResult.success) {
        notifySaveSuccess(saveResult);
      } else {
        notifySaveError(saveResult);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export scene';
      notifySaveError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const SceneTabContent = SceneTab;
  
  return (
    <aside className="flex h-full flex-col" aria-label="Controls panel">
      <PanelHeader
        title="Edit"
        position="right"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportScene}
              disabled={isExporting || !segmentationResults}
              title="Export scene as semantic JSON"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefineAndSave}
              disabled={isSavingMetadata || !segmentationResults || !workspaceHandlers?.handleRefine || activeControlsTab === 'image'}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSavingMetadata ? 'Saving...' : 'Refine'}
            </Button>
          </div>
        }
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
