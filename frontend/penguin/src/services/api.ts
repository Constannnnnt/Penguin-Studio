import type {
  PenguinConfig,
  GenerationResponse,
  ValidationResponse,
  Presets,
} from '@/types';
import { validateConfig, sanitizeInput } from '@/lib/validation';
import {
  ApiError,
  NetworkError,
  ValidationError,
  showSuccess,
  showError,
} from '@/lib/errorHandling';
import { env } from '@/lib/env';

// ============================================================================
// API Client Configuration
// ============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// API Client Class
// ============================================================================

class PenguinApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.apiBaseUrl;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timed out after ${timeout}ms`);
      }

      throw new NetworkError('Network request failed');
    }
  }

  /**
   * Sanitize configuration before sending to API
   */
  private sanitizeConfig(config: PenguinConfig): PenguinConfig {
    return {
      ...config,
      short_description: sanitizeInput(config.short_description),
      background_setting: sanitizeInput(config.background_setting),
      objects: config.objects.map((obj) => ({
        ...obj,
        description: sanitizeInput(obj.description),
        shape_and_color: sanitizeInput(obj.shape_and_color),
        texture: obj.texture ? sanitizeInput(obj.texture) : undefined,
        appearance_details: obj.appearance_details
          ? sanitizeInput(obj.appearance_details)
          : undefined,
        pose: obj.pose ? sanitizeInput(obj.pose) : undefined,
        expression: obj.expression ? sanitizeInput(obj.expression) : undefined,
        action: obj.action ? sanitizeInput(obj.action) : undefined,
      })),
      context: config.context ? sanitizeInput(config.context) : undefined,
    };
  }

  /**
   * Generate image from configuration
   */
  async generateImage(config: PenguinConfig): Promise<GenerationResponse> {
    // Validate config before sending
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new ValidationError(
        'Invalid configuration',
        validation.errors
      );
    }

    // Sanitize inputs
    const sanitizedConfig = this.sanitizeConfig(config);

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sanitizedConfig),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new NetworkError('Failed to generate image');
    }
  }

  /**
   * Refine existing image with new prompt
   */
  async refineImage(config: PenguinConfig, imageUrl: string): Promise<GenerationResponse> {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new ValidationError(
        'Invalid configuration',
        validation.errors
      );
    }

    const sanitizedConfig = this.sanitizeConfig(config);

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/refine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: sanitizedConfig,
            image_url: imageUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new NetworkError('Failed to refine image');
    }
  }

  /**
   * Get generation status by ID
   * Used for polling generation progress
   */
  async getGeneration(id: string): Promise<GenerationResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/generate/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError('Failed to fetch generation status');
    }
  }

  /**
   * Validate configuration without generating
   */
  async validateConfig(config: PenguinConfig): Promise<ValidationResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError('Failed to validate configuration');
    }
  }

  /**
   * Get available presets
   */
  async getPresets(): Promise<Presets> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/presets`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError('Failed to load presets');
    }
  }

  /**
   * Export configuration as JSON file
   */
  exportConfig(config: PenguinConfig, filename: string = 'penguin-config.json'): void {
    try {
      // Validate before export
      const validation = validateConfig(config);
      if (!validation.valid) {
        showError('Export Failed', 'Configuration is invalid. Please fix errors before exporting.');
        return;
      }

      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      // Show success notification
      showSuccess('Config Exported', `Saved as ${filename}`);
    } catch (error) {
      showError('Export Failed', 'Could not export configuration');
      console.error('Export error:', error);
    }
  }

  /**
   * Copy configuration to clipboard
   */
  async copyConfig(config: PenguinConfig): Promise<void> {
    try {
      // Validate before copy
      const validation = validateConfig(config);
      if (!validation.valid) {
        showError('Copy Failed', 'Configuration is invalid. Please fix errors before copying.');
        return;
      }

      const json = JSON.stringify(config, null, 2);
      await navigator.clipboard.writeText(json);

      // Show success notification
      showSuccess('Copied to Clipboard', 'Configuration copied successfully');
    } catch (error) {
      showError('Copy Failed', 'Could not copy to clipboard');
      console.error('Copy error:', error);
    }
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const apiClient = new PenguinApiClient();
