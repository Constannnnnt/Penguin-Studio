import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Canvas } from '../Canvas';
import { useConfigStore } from '@/store/configStore';
import { apiClient } from '@/services/api';
import type { GenerationResponse } from '@/types';

// Mock the API client
vi.mock('@/services/api', () => ({
  apiClient: {
    generateImage: vi.fn(),
    getGeneration: vi.fn(),
  },
}));

// Mock the toast notifications
vi.mock('@/lib/errorHandling', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

describe('Canvas Component Integration Tests', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useConfigStore.getState().resetConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Scene Description Input and Update', () => {
    it('should render scene description textarea', () => {
      render(<Canvas />);
      
      const textarea = screen.getByLabelText(/scene description/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should display placeholder text in textarea', () => {
      render(<Canvas />);
      
      const textarea = screen.getByPlaceholderText(/describe your scene/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should update local state when typing in textarea', () => {
      render(<Canvas />);
      
      const textarea = screen.getByLabelText(/scene description/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } });
      
      expect(textarea.value).toBe('A beautiful sunset');
    });

    it('should debounce updates to store', async () => {
      vi.useFakeTimers();
      render(<Canvas />);
      
      const textarea = screen.getByLabelText(/scene description/i);
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset over mountains' } });
      
      // Store should not be updated immediately
      expect(useConfigStore.getState().config.short_description).toBe('');
      
      // Fast-forward time by 300ms (debounce delay)
      vi.advanceTimersByTime(300);
      
      // Now store should be updated
      await waitFor(() => {
        expect(useConfigStore.getState().config.short_description).toBe('A beautiful sunset over mountains');
      });
      
      vi.useRealTimers();
    });

    it('should sync local state when config changes externally', () => {
      render(<Canvas />);
      
      // Update config directly in store
      useConfigStore.getState().updateConfig('short_description', 'External update');
      
      const textarea = screen.getByLabelText(/scene description/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('External update');
    });

    it('should display minimum character requirement help text', () => {
      render(<Canvas />);
      
      const helpText = screen.getByText(/minimum 10 characters required/i);
      expect(helpText).toBeInTheDocument();
    });
  });

  describe('Add Object Button', () => {
    it('should render add object button', () => {
      render(<Canvas />);
      
      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should add object to store when clicked', () => {
      render(<Canvas />);
      
      const addButton = screen.getByRole('button', { name: /add/i });
      const initialObjectCount = useConfigStore.getState().config.objects.length;
      
      fireEvent.click(addButton);
      
      const newObjectCount = useConfigStore.getState().config.objects.length;
      expect(newObjectCount).toBe(initialObjectCount + 1);
    });

    it('should add multiple objects when clicked multiple times', () => {
      render(<Canvas />);
      
      const addButton = screen.getByRole('button', { name: /add/i });
      
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      expect(useConfigStore.getState().config.objects.length).toBe(3);
    });

    it('should automatically select newly added object', () => {
      render(<Canvas />);
      
      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);
      
      const selectedObject = useConfigStore.getState().selectedObject;
      expect(selectedObject).toBe(0);
    });
  });

  describe('Generate Button with API Mock', () => {
    it('should render generate button', () => {
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should be disabled when description is too short', () => {
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      expect(generateButton).toBeDisabled();
    });

    it('should be enabled when description meets minimum length', async () => {
      render(<Canvas />);
      
      const textarea = screen.getByLabelText(/scene description/i);
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset scene' } });
      
      // Update store directly to bypass debounce
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      await waitFor(() => {
        const generateButton = screen.getByRole('button', { name: /generate image/i });
        expect(generateButton).not.toBeDisabled();
      });
    });

    it('should call API when generate button is clicked', async () => {
      const mockResponse: GenerationResponse = {
        id: 'test-123',
        status: 'completed',
        image_url: 'https://example.com/image.jpg',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(mockResponse);
      
      // Set up valid config
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(apiClient.generateImage).toHaveBeenCalledWith(
          expect.objectContaining({
            short_description: 'A beautiful sunset scene',
          })
        );
      });
    });

    it('should handle immediate completion response', async () => {
      const mockResponse: GenerationResponse = {
        id: 'test-123',
        status: 'completed',
        image_url: 'https://example.com/image.jpg',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(mockResponse);
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const image = screen.getByRole('img', { name: /generated scene/i });
        expect(image).toBeInTheDocument();
      });
    });

    it('should poll for completion when status is pending', async () => {
      vi.useFakeTimers();
      
      const pendingResponse: GenerationResponse = {
        id: 'test-123',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      const completedResponse: GenerationResponse = {
        id: 'test-123',
        status: 'completed',
        image_url: 'https://example.com/image.jpg',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(pendingResponse);
      vi.mocked(apiClient.getGeneration).mockResolvedValue(completedResponse);
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      // Wait for initial API call
      await waitFor(() => {
        expect(apiClient.generateImage).toHaveBeenCalled();
      });
      
      // Fast-forward time to trigger polling
      vi.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(apiClient.getGeneration).toHaveBeenCalledWith('test-123');
      });
      
      vi.useRealTimers();
    });
  });

  describe('Loading State Display', () => {
    it('should display loading spinner when generating', async () => {
      const pendingResponse: GenerationResponse = {
        id: 'test-123',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(pendingResponse);
      vi.mocked(apiClient.getGeneration).mockImplementation(() => 
        new Promise(() => {}) // Never resolves to keep loading state
      );
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should change button text to "Generating..." when loading', async () => {
      const pendingResponse: GenerationResponse = {
        id: 'test-123',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(pendingResponse);
      vi.mocked(apiClient.getGeneration).mockImplementation(() => 
        new Promise(() => {})
      );
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generating\.\.\./i)).toBeInTheDocument();
      });
    });

    it('should disable generate button while loading', async () => {
      const pendingResponse: GenerationResponse = {
        id: 'test-123',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(pendingResponse);
      vi.mocked(apiClient.getGeneration).mockImplementation(() => 
        new Promise(() => {})
      );
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(generateButton).toBeDisabled();
      });
    });

    it('should hide loading spinner after generation completes', async () => {
      const completedResponse: GenerationResponse = {
        id: 'test-123',
        status: 'completed',
        image_url: 'https://example.com/image.jpg',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(completedResponse);
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when generation fails', async () => {
      const failedResponse: GenerationResponse = {
        id: 'test-123',
        status: 'failed',
        error: 'Generation failed due to invalid parameters',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValue(failedResponse);
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid parameters/i)).toBeInTheDocument();
      });
    });

    it('should display error when API throws exception', async () => {
      vi.mocked(apiClient.generateImage).mockRejectedValue(
        new Error('Network error')
      );
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });
    });

    it('should clear error state when starting new generation', async () => {
      // First generation fails
      const failedResponse: GenerationResponse = {
        id: 'test-123',
        status: 'failed',
        error: 'Generation failed',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValueOnce(failedResponse);
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });
      
      // Second generation succeeds
      const successResponse: GenerationResponse = {
        id: 'test-456',
        status: 'completed',
        image_url: 'https://example.com/image.jpg',
        created_at: new Date().toISOString(),
      };
      
      vi.mocked(apiClient.generateImage).mockResolvedValueOnce(successResponse);
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/generation failed/i)).not.toBeInTheDocument();
      });
    });

    it('should display empty state when no image is generated', () => {
      render(<Canvas />);
      
      expect(screen.getByText(/no image generated/i)).toBeInTheDocument();
      expect(screen.getByText(/configure your scene and click generate/i)).toBeInTheDocument();
    });

    it('should handle polling timeout gracefully', async () => {
      vi.useFakeTimers();
      
      const pendingResponse: GenerationResponse = {
        id: 'test-123',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      // Always return pending status
      vi.mocked(apiClient.generateImage).mockResolvedValue(pendingResponse);
      vi.mocked(apiClient.getGeneration).mockResolvedValue(pendingResponse);
      
      useConfigStore.getState().updateConfig('short_description', 'A beautiful sunset scene');
      
      render(<Canvas />);
      
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      fireEvent.click(generateButton);
      
      // Fast-forward through all polling attempts (30 attempts * 2000ms = 60000ms)
      for (let i = 0; i < 30; i++) {
        vi.advanceTimersByTime(2000);
        await Promise.resolve(); // Allow promises to resolve
      }
      
      await waitFor(() => {
        expect(screen.getByText(/timed out/i)).toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on textarea', () => {
      render(<Canvas />);
      
      const textarea = screen.getByLabelText(/scene description/i);
      expect(textarea).toHaveAttribute('aria-describedby', 'scene-description-help');
      expect(textarea).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper ARIA labels on buttons', () => {
      render(<Canvas />);
      
      const addButton = screen.getByRole('button', { name: /add new object to scene/i });
      const generateButton = screen.getByRole('button', { name: /generate image from configuration/i });
      
      expect(addButton).toBeInTheDocument();
      expect(generateButton).toBeInTheDocument();
    });

    it('should have proper role on preview area', () => {
      render(<Canvas />);
      
      const previewArea = screen.getByRole('img', { name: /image preview area/i });
      expect(previewArea).toBeInTheDocument();
    });
  });
});
