import { useState } from 'react';
import { apiClient } from '@/core/services/api';
import type { PenguinConfig, GenerationResponse } from '@/core/types';
import { showError } from '@/shared/lib/errorHandling';

/**
 * Custom hook for managing image generation
 * Handles API calls, polling, loading states, and error handling
 * 
 */
export const useGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Poll for generation completion
   * Display loading state while processing
   */
  const pollGeneration = async (id: string): Promise<void> => {
    const maxAttempts = 30; // 30 attempts
    const interval = 2000; // 2 seconds between attempts = 60 seconds total

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const response = await apiClient.getGeneration(id);

        if (response.status === 'completed' && response.image_url) {
          // Display generated image
          setGeneratedImage(response.image_url);
          setError(null);
          return;
        } else if (response.status === 'failed') {
          // Display error message
          const errorMessage = response.error || 'Generation failed';
          setError(errorMessage);
          showError('Generation Failed', errorMessage);
          return;
        }
        // Continue polling if status is 'pending' or 'processing'
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check generation status';
        setError(errorMessage);
        showError('Generation Error', errorMessage);
        return;
      }
    }

    // Timeout after max attempts
    const timeoutMessage = 'Generation timed out. Please try again.';
    setError(timeoutMessage);
    showError('Generation Timeout', timeoutMessage);
  };

  /**
   * Generate image from configuration
   * Send configuration to API
   * Provide immediate feedback
   */
  const generateImage = async (config: PenguinConfig): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // POST to /api/generate
      const response: GenerationResponse = await apiClient.generateImage(config);

      // Poll for completion if status is pending/processing
      if (response.status === 'pending' || response.status === 'processing') {
        await pollGeneration(response.id);
      } else if (response.status === 'completed' && response.image_url) {
        // Immediate completion
        setGeneratedImage(response.image_url);
      } else if (response.status === 'failed') {
        const errorMessage = response.error || 'Generation failed';
        setError(errorMessage);
        showError('Generation Failed', errorMessage);
      }
    } catch (err) {
      // Display error with toast notification
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showError('Generation Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refine existing image with new configuration
   */
  const refineImage = async (config: PenguinConfig, imageUrl: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response: GenerationResponse = await apiClient.refineImage(config, imageUrl);

      if (response.status === 'pending' || response.status === 'processing') {
        await pollGeneration(response.id);
      } else if (response.status === 'completed' && response.image_url) {
        setGeneratedImage(response.image_url);
      } else if (response.status === 'failed') {
        const errorMessage = response.error || 'Refinement failed';
        setError(errorMessage);
        showError('Refinement Failed', errorMessage);
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
    setError(null);
  };

  return {
    generateImage,
    refineImage,
    clearGeneration,
    isLoading,
    generatedImage,
    error,
  };
};
