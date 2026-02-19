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
      // Run parse/config sync and segmentation in parallel to reduce perceived latency.
      const parsePromise = (async () => {
        if (!structuredPromptData) return;
        try {
          // Use semantic parsing to convert Bria's structured prompt to scene config
          const parsedConfig = await apiClient.parseSceneMetadata(structuredPromptData);
          const configStore = useConfigStore.getState();

          // Apply parsed config to scene config (for scene panel)
          configStore.applySemanticParsing(parsedConfig);

          // Also update the main config with raw structured prompt data
          configStore.updateConfigFromStructuredPrompt(structuredPromptData);
        } catch (parseErr) {
          console.warn('[Generation] Failed to parse structured prompt:', parseErr);
          // Fallback: just update raw config
          const configStore = useConfigStore.getState();
          configStore.updateConfigFromStructuredPrompt(structuredPromptData);
        }
      })();

      // Trigger segmentation on the generated image
      const segmentationStore = useSegmentationStore.getState();
      const segmentPromise = segmentationStore.segmentGeneration(generationId);

      await Promise.all([parsePromise, segmentPromise]);

      // Refresh the library to show the new generation
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
      const fileSystemStore = useFileSystemStore.getState();
      
      if (response.seed !== undefined) {
        lastSeedRef.current = response.seed;
        const { sceneConfig, setSceneConfig } = useConfigStore.getState();
        if (sceneConfig.seed !== response.seed) {
          setSceneConfig({ ...sceneConfig, seed: response.seed });
        }
        fileSystemStore.setCurrentGenerationContext(response.id, response.seed);
      } else {
        fileSystemStore.setCurrentGenerationContext(response.id, fileSystemStore.currentSeed);
      }
      if (response.structured_prompt) {
        setStructuredPrompt(response.structured_prompt);
        // Store original structured prompt for refinement (critical for immediate refine after generate)
        fileSystemStore.setOriginalStructuredPrompt(response.structured_prompt);
      }

      // Run post-generation pipeline
      await runPostGenerationPipeline(response.id, response.structured_prompt);
      
    } else if (response.status === 'failed') {
      setError(response.error || 'Generation failed');
      showError('Failed', 'Generation error');
    }
  }, [runPostGenerationPipeline]);

  const resolveRefineSeed = useCallback((): number | null => {
    const coerceSeed = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const { sceneConfig } = useConfigStore.getState();
    const fileSystemState = useFileSystemStore.getState();
    const trackedSeed = coerceSeed(lastSeedRef.current);
    const sceneSeed = coerceSeed(sceneConfig.seed);
    const fileSeed = coerceSeed(fileSystemState.currentSeed);

    // If user loaded a different generation, prefer the loaded generation seed.
    if (
      fileSystemState.currentGenerationId &&
      lastGenerationIdRef.current &&
      fileSystemState.currentGenerationId !== lastGenerationIdRef.current
    ) {
      return fileSeed ?? sceneSeed ?? trackedSeed;
    }

    return trackedSeed ?? sceneSeed ?? fileSeed;
  }, []);

  /**
   * Poll for generation completion
   * Timeout: 90 seconds (45 attempts * 2 second interval)
   */
  const pollGeneration = async (id: string): Promise<void> => {
    const maxAttempts = 45;
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
        const errorMessage = err instanceof Error ? err.message : 'Status check failed';
        setError(errorMessage);
        console.error('[Generation] Poll error:', err);
        return;
      }
    }

    setError('Generation timed out');
    showError('Timeout', 'Please try again');
  };

  /**
   * Generate image from text prompt only (simple text-to-image)
   */
  const generateImage = async (prompt: string, aspectRatio?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    lastSeedRef.current = null;
    lastGenerationIdRef.current = null;

    // Clear old segmentation results so original viewer shows loading state
    const segmentationStore = useSegmentationStore.getState();
    segmentationStore.clearResults();

    // Get aspect ratio from config if not provided
    const configStore = useConfigStore.getState();
    const ratio = aspectRatio || configStore.sceneConfig.aspect_ratio || '1:1';

    try {
      const response: GenerationResponse = await apiClient.generateImage(prompt, ratio);

      if (response.status === 'pending' || response.status === 'processing') {
        await pollGeneration(response.id);
      } else {
        await handleResponse(response);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      showError('Failed', 'Generation error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refine existing image using structured prompt (full config) and seed
   * 
   * @param config - Current config with user modifications
   * @param sourceImage - Source image URL/base64 for edit endpoint
   * @param modificationPrompt - Optional text describing the changes (e.g., "add sunlight", "make it warmer")
   * @param mask - Optional mask URL/base64 for localized edits
   * @param structuredPromptBase - Optional full structured prompt baseline to preserve rich fields
   */
  const refineImage = async (
    config: PenguinConfig,
    sourceImage: string,
    modificationPrompt?: string,
    mask?: string,
    structuredPromptBase?: Record<string, unknown>
  ): Promise<void> => {
    const refineSeed = resolveRefineSeed();
    if (refineSeed === null) {
      console.warn('[Generation] No seed available for refinement');
      setError('Generate an image first');
      showError('Refine Failed', 'No seed available. Generate an image first or load a generation with a seed.');
      return;
    }
    if (!sourceImage || !sourceImage.trim()) {
      setError('No source image available for refinement');
      showError('Refine Failed', 'Load or generate an image before refining.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Clear old segmentation results so original viewer shows loading state
    const segmentationStore = useSegmentationStore.getState();
    segmentationStore.clearResults();

    try {
      const response: GenerationResponse = await apiClient.refineImage(
        config,
        refineSeed,
        sourceImage,
        modificationPrompt,
        mask,
        undefined,
        structuredPromptBase
      );
      const normalizedResponse =
        response.seed === undefined ? { ...response, seed: refineSeed } : response;

      if (normalizedResponse.status === 'pending' || normalizedResponse.status === 'processing') {
        await pollGeneration(normalizedResponse.id);
      } else {
        await handleResponse(normalizedResponse);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refinement failed';
      setError(errorMessage);
      showError('Failed', 'Refine error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set seed from loaded generation
   */
  const setSeed = useCallback((seed: number | null): void => {
    lastSeedRef.current = seed;
  }, []);

  /**
   * Clear the generated image and error state
   */
  const clearGeneration = useCallback((): void => {
    setGeneratedImage(null);
    setStructuredPrompt(null);
    setError(null);
    lastSeedRef.current = null;
  }, []);

  /**
   * Clear only the generated image (preserves seed for refinement)
   * Used when switching to library view
   */
  const clearGeneratedImage = useCallback((): void => {
    setGeneratedImage(null);
  }, []);

  return {
    generateImage,
    refineImage,
    setSeed,
    clearGeneration,
    clearGeneratedImage,
    isLoading,
    generatedImage,
    structuredPrompt,
    error,
    hasSeed: lastSeedRef.current !== null,
  };
};
