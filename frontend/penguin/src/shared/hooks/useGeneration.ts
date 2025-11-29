import { useState, useRef, useCallback } from 'react';
import { apiClient } from '@/core/services/api';
import type { PenguinConfig, GenerationResponse } from '@/core/types';
import { showError } from '@/shared/lib/errorHandling';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useFileSystemStore } from '@/core/store/fileSystemStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';

/**
 * Custom hook for managing image generation
 * 
 * Design:
 * - generateImage: Simple text-to-image using just the prompt
 *   After generation: triggers segmentation, updates config, refreshes library
 * - refineImage: Uses structured prompt (full config) + seed for precise refinement
 */
export const useGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [structuredPrompt, setStructuredPrompt] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSeedRef = useRef<number | null>(null);
  const lastGenerationIdRef = useRef<string | null>(null);

  /**
   * Run post-generation pipeline: segmentation, config update, library refresh
   */
  const runPostGenerationPipeline = useCallback(async (
    generationId: string,
    structuredPromptData: Record<string, unknown> | undefined
  ): Promise<void> => {
    try {
      // 1. Parse structured prompt and update scene config (like upload process)
      if (structuredPromptData) {
        try {
          // Use semantic parsing to convert Bria's structured prompt to scene config
          const parsedConfig = await apiClient.parseSceneMetadata(structuredPromptData);
          const configStore = useConfigStore.getState();
          
          // Apply parsed config to scene config (for scene panel)
          configStore.applySemanticParsing(parsedConfig);
          
          // Also update the main config with raw structured prompt data
          configStore.updateConfigFromStructuredPrompt(structuredPromptData);
          
          console.log('[Generation] Config updated from structured prompt');
        } catch (parseErr) {
          console.warn('[Generation] Failed to parse structured prompt:', parseErr);
          // Fallback: just update raw config
          const configStore = useConfigStore.getState();
          configStore.updateConfigFromStructuredPrompt(structuredPromptData);
        }
      }

      // 2. Trigger segmentation on the generated image
      const segmentationStore = useSegmentationStore.getState();
      await segmentationStore.segmentGeneration(generationId);

      // 3. Refresh the library to show the new generation
      const fileSystemStore = useFileSystemStore.getState();
      await fileSystemStore.refreshFileTree();

    } catch (err) {
      console.error('[Generation] Post-generation pipeline error:', err);
      // Don't fail the whole generation if pipeline fails
    }
  }, []);

  /**
   * Handle generation response and update state
   */
  const handleResponse = useCallback(async (response: GenerationResponse): Promise<void> => {
    if (response.status === 'completed' && response.image_url) {
      setGeneratedImage(response.image_url);
      setError(null);
      lastGenerationIdRef.current = response.id;
      
      if (response.seed !== undefined) {
        lastSeedRef.current = response.seed;
      }
      if (response.structured_prompt) {
        setStructuredPrompt(response.structured_prompt);
      }

      // Run post-generation pipeline
      await runPostGenerationPipeline(response.id, response.structured_prompt);
      
    } else if (response.status === 'failed') {
      const errorMessage = response.error || 'Generation failed';
      setError(errorMessage);
      showError('Generation Failed', errorMessage);
    }
  }, [runPostGenerationPipeline]);

  /**
   * Poll for generation completion
   */
  const pollGeneration = async (id: string): Promise<void> => {
    const maxAttempts = 30;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const response = await apiClient.getGeneration(id);

        if (response.status === 'completed' || response.status === 'failed') {
          await handleResponse(response);
          return;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check generation status';
        setError(errorMessage);
        showError('Generation Error', errorMessage);
        return;
      }
    }

    const timeoutMessage = 'Generation timed out. Please try again.';
    setError(timeoutMessage);
    showError('Generation Timeout', timeoutMessage);
  };

  /**
   * Generate image from text prompt only (simple text-to-image)
   */
  const generateImage = async (prompt: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    lastSeedRef.current = null;
    lastGenerationIdRef.current = null;

    try {
      const response: GenerationResponse = await apiClient.generateImage(prompt);

      if (response.status === 'pending' || response.status === 'processing') {
        await pollGeneration(response.id);
      } else {
        await handleResponse(response);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showError('Generation Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refine existing image using structured prompt (full config) and seed
   */
  const refineImage = async (config: PenguinConfig): Promise<void> => {
    if (lastSeedRef.current === null) {
      showError('Refinement Error', 'No generated image to refine. Generate an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response: GenerationResponse = await apiClient.refineImage(config, lastSeedRef.current);

      if (response.status === 'pending' || response.status === 'processing') {
        await pollGeneration(response.id);
      } else {
        await handleResponse(response);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showError('Refinement Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear the generated image and error state
   */
  const clearGeneration = (): void => {
    setGeneratedImage(null);
    setStructuredPrompt(null);
    setError(null);
    lastSeedRef.current = null;
  };

  return {
    generateImage,
    refineImage,
    clearGeneration,
    isLoading,
    generatedImage,
    structuredPrompt,
    error,
    hasSeed: lastSeedRef.current !== null,
  };
};
