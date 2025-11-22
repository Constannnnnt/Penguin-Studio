import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { handleSegmentationError, type SegmentationErrorCode } from '@/lib/errors';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MaskMetadata {
  mask_id: string;
  label: string;
  confidence: number;
  bounding_box: BoundingBox;
  area_pixels: number;
  area_percentage: number;
  centroid: [number, number];
  mask_url: string;
}

export interface ExampleMetadata {
  short_description: string;
  objects: Array<{
    description: string;
    location: string;
    relationship: string;
    relative_size: string;
    shape_and_color: string;
    texture: string;
    appearance_details: string;
    orientation: string;
  }>;
  background_setting: string;
  lighting: {
    conditions: string;
    direction: string;
    shadows: string;
  };
  aesthetics: {
    composition: string;
    color_scheme: string;
    mood_atmosphere: string;
    preference_score: string;
    aesthetic_score: string;
  };
  photographic_characteristics: {
    depth_of_field: string;
    focus: string;
    camera_angle: string;
    lens_focal_length: string;
  };
  style_medium: string;
  context: string;
}

export interface SegmentationResponse {
  result_id: string;
  original_image_url: string;
  masks: MaskMetadata[];
  processing_time_ms: number;
  timestamp: string;
  metadata?: ExampleMetadata;
}

export interface SegmentationState {
  results: SegmentationResponse | null;
  selectedMaskId: string | null;
  hoveredMaskId: string | null;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  errorCode: SegmentationErrorCode | null;
  masksVisible: boolean;
  lastOperation: (() => Promise<void>) | null;

  uploadImage: (file: File, metadata?: File, promptText?: string) => Promise<void>;
  uploadForSegmentation: (exampleId: string) => Promise<void>;
  selectMask: (maskId: string | null) => void;
  hoverMask: (maskId: string | null) => void;
  toggleMasksVisibility: () => void;
  clearResults: () => void;
  setProgress: (progress: number, message?: string) => void;
  setResults: (results: SegmentationResponse) => void;
  setError: (error: string | null, errorCode?: SegmentationErrorCode | null) => void;
  retryLastOperation: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 30000;

const toAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

const normalizeResults = (results: SegmentationResponse, metadata?: ExampleMetadata): SegmentationResponse => ({
  ...results,
  original_image_url: toAbsoluteUrl(results.original_image_url),
  masks: results.masks.map((mask) => ({
    ...mask,
    mask_url: toAbsoluteUrl(mask.mask_url),
  })),
  ...(metadata ? { metadata } : {}),
});

const deriveExampleId = (file: File): string | null => {
  const name = file.name || '';
  const parts = name.split('.');
  if (parts.length < 2) return null;
  parts.pop(); // remove extension
  const base = parts.join('.');
  return base || null;
};

const tryFetchSidecarMetadata = async (file: File): Promise<{ blob: Blob; data: ExampleMetadata } | null> => {
  const exampleId = deriveExampleId(file);
  if (!exampleId) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/examples/${exampleId}.json`);
    if (!res.ok) return null;
    const data: ExampleMetadata = await res.json();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    return { blob, data };
  } catch {
    return null;
  }
};

export const useSegmentationStore = create<SegmentationState>()(
  devtools(
    (set, get) => ({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null as (() => Promise<void>) | null,

      uploadImage: async (file: File, metadata?: File, promptText?: string) => {
        const operation = async (): Promise<void> => {
          set({ isProcessing: true, progress: 0, progressMessage: 'Uploading...', error: null, errorCode: null });

          if (file.size > 10 * 1024 * 1024) {
            const { message, code } = handleSegmentationError(
              new Error('Image file is too large. Maximum size is 10MB.')
            );
            set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
            console.error('[Segmentation] File too large:', file.size);
            return;
          }

          const formData = new FormData();
          formData.append('image', file);
          let metadataToSend = metadata;
          let metadataParsed: ExampleMetadata | undefined;

          if (!metadataToSend) {
            const sidecar = await tryFetchSidecarMetadata(file);
            if (sidecar) {
              metadataToSend = new File([sidecar.blob], `${deriveExampleId(file)}.json`, { type: 'application/json' });
              metadataParsed = sidecar.data;
            }
          }

          if (metadataToSend) {
            formData.append('metadata', metadataToSend);
          }
          const promptToSend = (promptText && promptText.trim()) || 'object';
          formData.append('prompts', promptToSend);

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(`${API_BASE_URL}/api/v1/segment`, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || errorData.detail || 'Segmentation failed';
              throw new Error(errorMessage);
            }

            const results = normalizeResults(await response.json(), metadataParsed);
            
            const { preloadImages } = await import('@/hooks/useOptimizedImage');
            const maskUrls = results.masks.map(mask => mask.mask_url);
            preloadImages(maskUrls).catch(err => {
              console.warn('[Segmentation] Failed to preload some mask images:', err);
            });
            
            set({ 
              results, 
              isProcessing: false, 
              progress: 100, 
              progressMessage: 'Complete', 
              error: null,
              errorCode: null,
            });

            console.log('[Segmentation] Upload successful:', results.result_id);

            const { useFileSystemStore } = await import('./fileSystemStore');
            useFileSystemStore.getState().addSegmentedImage(
              results.result_id,
              results.original_image_url,
              results.timestamp
            );
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              const { message, code } = handleSegmentationError(
                new Error('Request timed out. Please try with a smaller image.')
              );
              set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
              console.error('[Segmentation] Request timeout');
            } else {
              const { message, code } = handleSegmentationError(error);
              set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
              console.error('[Segmentation] Upload error:', error);
            }
          }
        };

        set({ lastOperation: operation });
        await operation();
      },

      uploadForSegmentation: async (exampleId: string) => {
        const operation = async (): Promise<void> => {
          set({ isProcessing: true, progress: 0, progressMessage: 'Loading example...', error: null, errorCode: null });

          try {
            const { loadExample } = await import('@/services/exampleLoader');
            const { imageBlob, metadataBlob, metadata } = await loadExample(exampleId);

            set({ progress: 20, progressMessage: 'Uploading to backend...' });

            const formData = new FormData();
            formData.append('image', imageBlob, `${exampleId}.png`);
            formData.append('metadata', metadataBlob, `${exampleId}.json`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(`${API_BASE_URL}/api/v1/segment`, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.error || errorData.detail || 'Segmentation failed';
              throw new Error(errorMessage);
            }

            set({ progress: 80, progressMessage: 'Processing segmentation...' });

            const resultsWithMetadata = normalizeResults(await response.json(), metadata);

            const { preloadImages } = await import('@/hooks/useOptimizedImage');
            const maskUrls = resultsWithMetadata.masks.map((mask) => mask.mask_url);
            preloadImages(maskUrls).catch(err => {
              console.warn('[Segmentation] Failed to preload some mask images:', err);
            });
            
            set({
              results: resultsWithMetadata,
              isProcessing: false,
              progress: 100,
              progressMessage: 'Complete',
              error: null,
              errorCode: null,
            });

            console.log('[Segmentation] Example segmentation successful:', resultsWithMetadata.result_id);

            const { useFileSystemStore } = await import('./fileSystemStore');
            useFileSystemStore.getState().addSegmentedImage(
              resultsWithMetadata.result_id,
              resultsWithMetadata.original_image_url,
              resultsWithMetadata.timestamp
            );
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              const { message, code } = handleSegmentationError(
                new Error('Request timed out. Please try again.')
              );
              set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
              console.error('[Segmentation] Request timeout for example:', exampleId);
            } else {
              const { message, code } = handleSegmentationError(error);
              set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
              console.error('[Segmentation] Example loading error:', error);
            }
          }
        };

        set({ lastOperation: operation });
        await operation();
      },

      selectMask: (maskId: string | null) => set({ selectedMaskId: maskId }),

      hoverMask: (maskId: string | null) => set({ hoveredMaskId: maskId }),

      toggleMasksVisibility: () => set((state) => ({ masksVisible: !state.masksVisible })),

      clearResults: () => set({
        results: null,
        selectedMaskId: null,
        hoveredMaskId: null,
        progress: 0,
        progressMessage: '',
        error: null,
        errorCode: null,
      }),

      setProgress: (progress: number, message?: string) => set({
        progress,
        progressMessage: message || '',
      }),

      setResults: (results: SegmentationResponse) => set(() => {
        const normalized = normalizeResults(results);
        return {
          results: normalized,
          isProcessing: false,
          progress: 100,
          progressMessage: 'Complete',
          error: null,
          errorCode: null,
        };
      }),

      setError: (error: string | null, errorCode?: SegmentationErrorCode | null) => set({
        error,
        errorCode: errorCode || null,
        isProcessing: false,
        progress: 0,
        progressMessage: '',
      }),

      retryLastOperation: async () => {
        const { lastOperation } = get();
        if (lastOperation) {
          console.log('[Segmentation] Retrying last operation');
          await lastOperation();
        } else {
          console.warn('[Segmentation] No operation to retry');
        }
      },
    }),
    {
      name: 'Segmentation Store',
    }
  )
);
