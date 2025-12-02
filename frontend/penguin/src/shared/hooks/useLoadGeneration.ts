import { useState, useCallback } from 'react';
import { apiClient } from '@/core/services/api';
import type { LoadGenerationResponse } from '@/core/types';
import { showError, showSuccess } from '@/shared/lib/errorHandling';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useSegmentationStore, type StructedPrompt } from '@/features/segmentation/store/segmentationStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Hook for loading past generations and restoring their state
 * 
 * Loads:
 * - Image URL
 * - Structured prompt -> scene config
 * - Masks (without re-segmenting)
 * - Prompt version history
 */
export const useLoadGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [promptVersions, setPromptVersions] = useState<string[]>([]);

  /**
   * Load a generation and restore its state
   */
  const loadGeneration = useCallback(async (generationId: string): Promise<LoadGenerationResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.loadGeneration(generationId);

      // 1. Parse structured prompt and update scene config
      if (response.structured_prompt) {
        try {
          const parsedConfig = await apiClient.parseSceneMetadata(response.structured_prompt);
          const configStore = useConfigStore.getState();
          configStore.applySemanticParsing(parsedConfig);
          configStore.updateConfigFromStructuredPrompt(response.structured_prompt);
        } catch (parseErr) {
          console.warn('[LoadGeneration] Failed to parse structured prompt:', parseErr);
          const configStore = useConfigStore.getState();
          configStore.updateConfigFromStructuredPrompt(response.structured_prompt);
        }
      }

      // 2. Load masks into segmentation store (without calling segmentation service)
      if (response.masks && response.masks.length > 0) {
        const segmentationStore = useSegmentationStore.getState();
        
        // Build SegmentationResponse from loaded data, preserving all metadata
        const segmentationResults = {
          result_id: generationId,
          original_image_url: response.image_url.startsWith('http') 
            ? response.image_url 
            : `${API_BASE_URL}${response.image_url}`,
          masks: response.masks.map((mask, index) => {
            // Construct proper mask URL
            const maskUrl = mask.mask_url.startsWith('http') 
              ? mask.mask_url 
              : `${API_BASE_URL}${mask.mask_url}`;
            
            // console.log(`[LoadGeneration] Mask ${index} URL:`, maskUrl);
            
            return {
              mask_id: mask.mask_id,
              label: mask.label || `Object ${index + 1}`,
              confidence: mask.confidence ?? 1.0,
              bounding_box: mask.bounding_box ?? { x1: 0, y1: 0, x2: 100, y2: 100 },
              area_pixels: mask.area_pixels ?? 0,
              area_percentage: mask.area_percentage ?? 0,
              centroid: mask.centroid ?? [50, 50] as [number, number],
              mask_url: maskUrl,
              promptTier: mask.prompt_tier,
              promptText: mask.prompt_text,
              promptObject: mask.prompt_object,
              objectMetadata: mask.object_metadata ? {
                description: mask.object_metadata.description ?? '',
                location: mask.object_metadata.location ?? '',
                relationship: mask.object_metadata.relationship ?? '',
                relative_size: mask.object_metadata.relative_size ?? '',
                shape_and_color: mask.object_metadata.shape_and_color ?? '',
                texture: mask.object_metadata.texture ?? '',
                appearance_details: mask.object_metadata.appearance_details ?? '',
                orientation: mask.object_metadata.orientation ?? '',
              } : undefined,
            };
          }),
          processing_time_ms: 0,
          timestamp: new Date().toISOString(),
          metadata: response.structured_prompt as unknown as StructedPrompt,
        };

        segmentationStore.setResults(segmentationResults);
      }

      // 3. Update local state
      setCurrentGenerationId(generationId);
      setPromptVersions(response.prompt_versions);

      showSuccess('Generation Loaded', `Loaded generation ${generationId}`);
      return response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load generation';
      setError(errorMessage);
      showError('Load Failed', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save current config as a new prompt version
   */
  const savePromptVersion = useCallback(async (): Promise<boolean> => {
    if (!currentGenerationId) {
      showError('Save Failed', 'No generation loaded');
      return false;
    }

    try {
      const configStore = useConfigStore.getState();
      const structuredPrompt = configStore.config;

      const result = await apiClient.savePromptVersion(currentGenerationId, structuredPrompt as unknown as Record<string, unknown>);
      
      setPromptVersions(prev => [...prev, result.filename]);
      showSuccess('Prompt Saved', `Saved as ${result.filename}`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save prompt';
      showError('Save Failed', errorMessage);
      return false;
    }
  }, [currentGenerationId]);

  /**
   * Clear loaded generation state
   */
  const clearGeneration = useCallback(() => {
    setCurrentGenerationId(null);
    setPromptVersions([]);
    setError(null);
  }, []);

  return {
    loadGeneration,
    savePromptVersion,
    clearGeneration,
    isLoading,
    error,
    currentGenerationId,
    promptVersions,
  };
};
