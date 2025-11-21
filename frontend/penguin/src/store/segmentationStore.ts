import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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

export interface SegmentationResponse {
  result_id: string;
  original_image_url: string;
  masks: MaskMetadata[];
  processing_time_ms: number;
  timestamp: string;
}

export interface SegmentationState {
  results: SegmentationResponse | null;
  selectedMaskId: string | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;

  uploadImage: (file: File, metadata?: File) => Promise<void>;
  selectMask: (maskId: string | null) => void;
  clearResults: () => void;
  setProgress: (progress: number) => void;
  setResults: (results: SegmentationResponse) => void;
  setError: (error: string | null) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useSegmentationStore = create<SegmentationState>()(
  devtools(
    (set) => ({
      results: null,
      selectedMaskId: null,
      isProcessing: false,
      progress: 0,
      error: null,

      uploadImage: async (file: File, metadata?: File) => {
        set({ isProcessing: true, progress: 0, error: null });

        const formData = new FormData();
        formData.append('image', file);
        if (metadata) {
          formData.append('metadata', metadata);
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/segment`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Segmentation failed');
          }

          const results: SegmentationResponse = await response.json();
          set({ results, isProcessing: false, progress: 100, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
          set({ error: errorMessage, isProcessing: false, progress: 0 });
        }
      },

      selectMask: (maskId: string | null) => set({ selectedMaskId: maskId }),

      clearResults: () => set({
        results: null,
        selectedMaskId: null,
        progress: 0,
        error: null,
      }),

      setProgress: (progress: number) => set({ progress }),

      setResults: (results: SegmentationResponse) => set({
        results,
        isProcessing: false,
        progress: 100,
        error: null,
      }),

      setError: (error: string | null) => set({
        error,
        isProcessing: false,
        progress: 0,
      }),
    }),
    {
      name: 'Segmentation Store',
    }
  )
);
