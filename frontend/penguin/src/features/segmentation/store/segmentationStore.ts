import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { handleSegmentationError, type SegmentationErrorCode } from '@/shared/lib/errors';
import { MetadataUpdater } from '@/shared/lib/metadataUpdater';
import { announceManipulation, announceSelection } from '@/shared/lib/screenReaderAnnouncements';
import { debounceWithCancel } from '@/shared/lib/debounce';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MaskMetadata {
  mask_id: string;
  objectId?: string;
  label: string;
  confidence: number;
  bounding_box: BoundingBox;
  area_pixels: number;
  area_percentage: number;
  centroid: [number, number];
  mask_url: string;
  promptTier?: 'CORE' | 'CORE_VISUAL' | 'CORE_VISUAL_SPATIAL';
  promptText?: string;
  promptObject?: string; // Short object name extracted from promptText
  objectMetadata?: {
    description: string;
    location: string;
    relationship: string;
    relative_size: string;
    shape_and_color: string;
    texture: string;
    appearance_details: string;
    orientation: string;
  };
}

export interface MaskTransform {
  position: { x: number; y: number };
  scale: { width: number; height: number };
  rotation: number; // Rotation in degrees (around center)
  flipHorizontal: boolean;
  flipVertical: boolean;
  imageEdits: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    exposure: number;
    vibrance: number;
  };
}

export interface MaskManipulationState {
  maskId: string;
  originalBoundingBox: BoundingBox;
  currentBoundingBox: BoundingBox;
  transform: MaskTransform;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  isRotationMode: boolean; // Toggle via double-click
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | null;
  isHidden: boolean;
}

export interface StructedPrompt {
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
  metadata?: StructedPrompt;
}

export interface SegmentationState {
  results: SegmentationResponse | null;
  selectedMaskId: string | null;
  hoveredMaskId: string | null;
  isAnyMaskDragging: boolean;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  errorCode: SegmentationErrorCode | null;
  masksVisible: boolean;
  lastOperation: (() => Promise<void>) | null;
  maskManipulation: Map<string, MaskManipulationState>;

  uploadImage: (file: File, metadata?: File, promptText?: string) => Promise<void>;
  uploadForSegmentation: (exampleId: string) => Promise<void>;
  segmentGeneration: (generationId: string) => Promise<void>;
  selectMask: (maskId: string | null) => void;
  hoverMask: (maskId: string | null) => void;
  toggleMasksVisibility: () => void;
  clearResults: () => void;
  setProgress: (progress: number, message?: string) => void;
  setResults: (results: SegmentationResponse) => void;
  setError: (error: string | null, errorCode?: SegmentationErrorCode | null) => void;
  retryLastOperation: () => Promise<void>;
  
  startDragMask: (maskId: string) => void;
  updateMaskPosition: (maskId: string, deltaX: number, deltaY: number) => void;
  endDragMask: (maskId: string, imageSize?: { width: number; height: number }) => void;
  
  startResizeMask: (maskId: string, handle: 'nw' | 'ne' | 'sw' | 'se') => void;
  updateMaskSize: (maskId: string, newBoundingBox: BoundingBox) => void;
  endResizeMask: (maskId: string, imageSize?: { width: number; height: number }) => void;
  
  resetMaskTransform: (maskId: string) => void;
  hideMask: (maskId: string) => void;
  showMask: (maskId: string) => void;
  
  applyImageEditToMask: (maskId: string, edit: Partial<MaskTransform['imageEdits']>) => void;
  
  updateMaskMetadata: (maskId: string, metadata: Partial<NonNullable<MaskMetadata['objectMetadata']>>) => void;
  
  // Rotation mode (toggle via double-click)
  toggleRotationMode: (maskId: string) => void;
  startRotateMask: (maskId: string) => void;
  updateMaskRotation: (maskId: string, rotation: number) => void;
  endRotateMask: (maskId: string, imageSize?: { width: number; height: number }) => void;
  
  // Flip operations
  flipMaskHorizontal: (maskId: string) => void;
  flipMaskVertical: (maskId: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 30000;

const toAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

const normalizeResults = (results: SegmentationResponse, metadata?: StructedPrompt): SegmentationResponse => {
  const meta = metadata ?? (results as any).metadata;
  return {
    ...results,
    original_image_url: toAbsoluteUrl(results.original_image_url),
    masks: results.masks.map((mask: any) => {
      // Handle both snake_case (from API) and camelCase (already converted) object metadata
      const rawMetadata = mask.object_metadata || mask.objectMetadata;
      const objectMetadata = rawMetadata ? {
        description: rawMetadata.description,
        location: rawMetadata.location,
        relationship: rawMetadata.relationship,
        relative_size: rawMetadata.relative_size,
        shape_and_color: rawMetadata.shape_and_color,
        texture: rawMetadata.texture,
        appearance_details: rawMetadata.appearance_details,
        orientation: rawMetadata.orientation,
      } : undefined;

      return {
        ...mask,
        objectId: mask.object_id || mask.objectId,
        mask_url: toAbsoluteUrl(mask.mask_url),
        promptTier: mask.prompt_tier || mask.promptTier,
        promptText: mask.prompt_text || mask.promptText,
        promptObject: mask.prompt_object || mask.promptObject,
        objectMetadata,
      };
    }),
    ...(meta ? { metadata: meta } : {}),
  };
};

const createDefaultTransform = (): MaskTransform => ({
  position: { x: 0, y: 0 },
  scale: { width: 1, height: 1 },
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  imageEdits: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    blur: 0,
    exposure: 0,
    vibrance: 0,
  },
});

const initializeMaskManipulation = (mask: MaskMetadata): MaskManipulationState => ({
  maskId: mask.mask_id,
  originalBoundingBox: { ...mask.bounding_box },
  currentBoundingBox: { ...mask.bounding_box },
  transform: createDefaultTransform(),
  isDragging: false,
  isResizing: false,
  isRotating: false,
  isRotationMode: false,
  resizeHandle: null,
  isHidden: false,
});

const deriveExampleId = (file: File): string | null => {
  const name = file.name || '';
  const parts = name.split('.');
  if (parts.length < 2) return null;
  parts.pop(); // remove extension
  const base = parts.join('.');
  return base || null;
};

const tryFetchSidecarMetadata = async (file: File): Promise<{ blob: Blob; data: StructedPrompt } | null> => {
  const exampleId = deriveExampleId(file);
  if (!exampleId) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/examples/${exampleId}.json`);
    if (!res.ok) return null;
    const data: StructedPrompt = await res.json();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    return { blob, data };
  } catch {
    return null;
  }
};

// Create a debounced metadata updater to prevent excessive updates during drag/resize
const createDebouncedMetadataUpdater = () => {
  return debounceWithCancel((
    maskId: string,
    manipState: MaskManipulationState,
    allMasks: MaskMetadata[],
    manipulationStates: Map<string, MaskManipulationState>,
    imageSize: { width: number; height: number },
    updateFn: (maskId: string, metadata: Partial<NonNullable<MaskMetadata['objectMetadata']>>) => void,
    originalOrientation?: string
  ) => {
    const updater = new MetadataUpdater();
    
    // Update location metadata
    const location = updater.updateLocationMetadata(
      manipState.currentBoundingBox,
      imageSize
    );
    
    // Update relationship metadata
    const relationship = updater.updateRelationshipMetadata(
      maskId,
      allMasks,
      manipulationStates
    );
    
    // Only update orientation if rotation has changed (not on move/resize)
    const rotation = manipState.transform.rotation ?? 0;
    const orientation = updater.updateOrientationMetadata(rotation, originalOrientation);
    
    // Update the mask metadata
    updateFn(maskId, {
      location,
      relationship,
      orientation,
    });
  }, 300);
};

const debouncedMetadataUpdater = createDebouncedMetadataUpdater();

export const useSegmentationStore = create<SegmentationState>()(
  devtools(
    (set, get) => ({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isAnyMaskDragging: false,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null as (() => Promise<void>) | null,
      maskManipulation: new Map<string, MaskManipulationState>(),

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
          let metadataParsed: StructedPrompt | undefined;

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
            
            const { preloadImages } = await import('@/shared/hooks/useOptimizedImage');
            const maskUrls = results.masks.map(mask => mask.mask_url);
            preloadImages(maskUrls).catch(err => {
              console.warn('[Segmentation] Failed to preload some mask images:', err);
            });
            
            const maskManipulation = new Map<string, MaskManipulationState>();
            results.masks.forEach(mask => {
              maskManipulation.set(mask.mask_id, initializeMaskManipulation(mask));
            });
            
            set({ 
              results,
              maskManipulation,
              isProcessing: false, 
              progress: 100, 
              progressMessage: 'Complete', 
              error: null,
              errorCode: null,
            });

            // console.log('[Segmentation] Upload successful:', results.result_id);

            const { useFileSystemStore } = await import('@/core/store/fileSystemStore');
            await useFileSystemStore.getState().addSegmentedImage(
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
            const { loadExample } = await import('@/core/services/exampleLoader');
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

            const { preloadImages } = await import('@/shared/hooks/useOptimizedImage');
            const maskUrls = resultsWithMetadata.masks.map((mask) => mask.mask_url);
            preloadImages(maskUrls).catch(err => {
              console.warn('[Segmentation] Failed to preload some mask images:', err);
            });
            
            const maskManipulation = new Map<string, MaskManipulationState>();
            resultsWithMetadata.masks.forEach(mask => {
              maskManipulation.set(mask.mask_id, initializeMaskManipulation(mask));
            });
            
            set({
              results: resultsWithMetadata,
              maskManipulation,
              isProcessing: false,
              progress: 100,
              progressMessage: 'Complete',
              error: null,
              errorCode: null,
            });

            // console.log('[Segmentation] Example segmentation successful:', resultsWithMetadata.result_id);

            const { useFileSystemStore } = await import('@/core/store/fileSystemStore');
            await useFileSystemStore.getState().addSegmentedImage(
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

      segmentGeneration: async (generationId: string) => {
        const operation = async (): Promise<void> => {
          set({ isProcessing: true, progress: 0, progressMessage: 'Segmenting generated image...', error: null, errorCode: null });

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(`${API_BASE_URL}/api/segment-generation/${generationId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.detail || errorData.error || 'Segmentation failed';
              throw new Error(errorMessage);
            }

            set({ progress: 80, progressMessage: 'Processing results...' });

            const data = await response.json();
            
            // Convert response to SegmentationResponse format
            const results: SegmentationResponse = {
              result_id: data.result_id || generationId,
              original_image_url: data.original_image_url,
              masks: data.masks || [],
              processing_time_ms: data.processing_time_ms || 0,
              timestamp: data.timestamp || new Date().toISOString(),
            };

            const normalizedResults = normalizeResults(results);

            const { preloadImages } = await import('@/shared/hooks/useOptimizedImage');
            const maskUrls = normalizedResults.masks.map((mask) => mask.mask_url);
            preloadImages(maskUrls).catch(err => {
              console.warn('[Segmentation] Failed to preload some mask images:', err);
            });
            
            const maskManipulation = new Map<string, MaskManipulationState>();
            normalizedResults.masks.forEach(mask => {
              maskManipulation.set(mask.mask_id, initializeMaskManipulation(mask));
            });
            
            set({
              results: normalizedResults,
              maskManipulation,
              isProcessing: false,
              progress: 100,
              progressMessage: 'Complete',
              error: null,
              errorCode: null,
            });

            // console.log('[Segmentation] Generation segmentation successful:', generationId);

          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              const { message, code } = handleSegmentationError(
                new Error('Request timed out. Please try again.')
              );
              set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
              console.error('[Segmentation] Request timeout for generation:', generationId);
            } else {
              const { message, code } = handleSegmentationError(error);
              set({ error: message, errorCode: code, isProcessing: false, progress: 0, progressMessage: '' });
              console.error('[Segmentation] Generation segmentation error:', error);
            }
          }
        };

        set({ lastOperation: operation });
        await operation();
      },

      selectMask: (maskId: string | null) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        if (mask) {
          announceSelection(mask.label, maskId !== null);
        }
        set({ selectedMaskId: maskId });
      },

      hoverMask: (maskId: string | null) => set({ hoveredMaskId: maskId }),

      toggleMasksVisibility: () => set((state) => ({ masksVisible: !state.masksVisible })),

      clearResults: () => set({
        results: null,
        selectedMaskId: null,
        hoveredMaskId: null,
        maskManipulation: new Map<string, MaskManipulationState>(),
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
        const maskManipulation = new Map<string, MaskManipulationState>();
        normalized.masks.forEach(mask => {
          maskManipulation.set(mask.mask_id, initializeMaskManipulation(mask));
        });
        return {
          results: normalized,
          maskManipulation,
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
          // console.log('[Segmentation] Retrying last operation');
          await lastOperation();
        } else {
          console.warn('[Segmentation] No operation to retry');
        }
      },

      startDragMask: (maskId: string) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          newManipulation.set(maskId, {
            ...manipState,
            isDragging: true,
          });
        }
        return { maskManipulation: newManipulation, isAnyMaskDragging: true };
      }),

      updateMaskPosition: (maskId: string, deltaX: number, deltaY: number) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          const currentBbox = manipState.currentBoundingBox;
          const newBbox: BoundingBox = {
            x1: currentBbox.x1 + deltaX,
            y1: currentBbox.y1 + deltaY,
            x2: currentBbox.x2 + deltaX,
            y2: currentBbox.y2 + deltaY,
          };
          newManipulation.set(maskId, {
            ...manipState,
            currentBoundingBox: newBbox,
            transform: {
              ...manipState.transform,
              position: {
                x: manipState.transform.position.x + deltaX,
                y: manipState.transform.position.y + deltaY,
              },
            },
          });
        }
        return { maskManipulation: newManipulation };
      }),

      endDragMask: (maskId: string, imageSize?: { width: number; height: number }) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            newManipulation.set(maskId, {
              ...manipState,
              isDragging: false,
            });
          }
          return { maskManipulation: newManipulation, isAnyMaskDragging: false };
        });
        
        // Announce to screen reader
        if (mask) {
          announceManipulation('moved to new position', mask.label);
        }
        
        // Update metadata after drag completes (debounced)
        // Pass original orientation to preserve it (move doesn't change orientation)
        const manipState = state.maskManipulation.get(maskId);
        if (state.results && manipState && imageSize && mask) {
          const originalOrientation = mask.objectMetadata?.orientation;
          debouncedMetadataUpdater(
            maskId,
            manipState,
            state.results.masks,
            state.maskManipulation,
            imageSize,
            get().updateMaskMetadata,
            originalOrientation
          );
        }
      },

      startResizeMask: (maskId: string, handle: 'nw' | 'ne' | 'sw' | 'se') => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          newManipulation.set(maskId, {
            ...manipState,
            isResizing: true,
            resizeHandle: handle,
          });
        }
        return { maskManipulation: newManipulation };
      }),

      updateMaskSize: (maskId: string, newBoundingBox: BoundingBox) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          const originalWidth = manipState.originalBoundingBox.x2 - manipState.originalBoundingBox.x1 || 1;
          const originalHeight = manipState.originalBoundingBox.y2 - manipState.originalBoundingBox.y1 || 1;
          const newWidth = Math.max(1, newBoundingBox.x2 - newBoundingBox.x1);
          const newHeight = Math.max(1, newBoundingBox.y2 - newBoundingBox.y1);
          const originalCenterX = (manipState.originalBoundingBox.x1 + manipState.originalBoundingBox.x2) / 2;
          const originalCenterY = (manipState.originalBoundingBox.y1 + manipState.originalBoundingBox.y2) / 2;
          const newCenterX = (newBoundingBox.x1 + newBoundingBox.x2) / 2;
          const newCenterY = (newBoundingBox.y1 + newBoundingBox.y2) / 2;
          const scaleX = newWidth / originalWidth;
          const scaleY = newHeight / originalHeight;
          const posX = newCenterX - scaleX * originalCenterX;
          const posY = newCenterY - scaleY * originalCenterY;
          
          newManipulation.set(maskId, {
            ...manipState,
            currentBoundingBox: newBoundingBox,
            transform: {
              ...manipState.transform,
              scale: {
                width: scaleX,
                height: scaleY,
              },
              position: {
                x: posX,
                y: posY,
              },
            },
          });
        }
        return { maskManipulation: newManipulation };
      }),

      endResizeMask: (maskId: string, imageSize?: { width: number; height: number }) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            newManipulation.set(maskId, {
              ...manipState,
              isResizing: false,
              resizeHandle: null,
            });
          }
          return { maskManipulation: newManipulation };
        });
        
        // Announce to screen reader
        if (mask) {
          announceManipulation('resized', mask.label);
        }
        
        // Update metadata after resize completes
        const manipState = state.maskManipulation.get(maskId);
        if (state.results && manipState && imageSize) {
          if (mask) {
            // Import and use MetadataUpdater
            import('@/shared/lib/metadataUpdater').then(({ MetadataUpdater }) => {
              const updater = new MetadataUpdater();
              
              // Update relative_size metadata
              const relative_size = updater.updateRelativeSizeMetadata(
                manipState.currentBoundingBox,
                imageSize
              );
              
              // Recalculate area_pixels and area_percentage
              const width = manipState.currentBoundingBox.x2 - manipState.currentBoundingBox.x1;
              const height = manipState.currentBoundingBox.y2 - manipState.currentBoundingBox.y1;
              const area_pixels = Math.round(width * height);
              const area_percentage = (area_pixels / (imageSize.width * imageSize.height)) * 100;
              
              // Update the mask metadata with new size information
              get().updateMaskMetadata(maskId, {
                relative_size,
              });
              
              // Update the mask's bounding_box, area_pixels, and area_percentage in results
              const currentState = get();
              if (currentState.results) {
                const maskIndex = currentState.results.masks.findIndex(m => m.mask_id === maskId);
                if (maskIndex !== -1) {
                  const updatedMasks = [...currentState.results.masks];
                  updatedMasks[maskIndex] = {
                    ...updatedMasks[maskIndex],
                    bounding_box: { ...manipState.currentBoundingBox },
                    area_pixels,
                    area_percentage,
                    centroid: [
                      (manipState.currentBoundingBox.x1 + manipState.currentBoundingBox.x2) / 2,
                      (manipState.currentBoundingBox.y1 + manipState.currentBoundingBox.y2) / 2,
                    ],
                  };
                  
                  set({
                    results: {
                      ...currentState.results,
                      masks: updatedMasks,
                    },
                  });
                }
              }
            });
          }
        }
      },

      resetMaskTransform: (maskId: string) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            newManipulation.set(maskId, {
              ...manipState,
              currentBoundingBox: { ...manipState.originalBoundingBox },
              transform: createDefaultTransform(),
              isDragging: false,
              isResizing: false,
              resizeHandle: null,
            });
          }
          return { maskManipulation: newManipulation };
        });
        
        // Announce to screen reader
        if (mask) {
          announceManipulation('reset to original position', mask.label);
        }
        
        // Restore original metadata values
        if (state.results) {
          const manipState = state.maskManipulation.get(maskId);
          
          if (mask && manipState) {
            // Restore original metadata values
            // For reset, we restore to "centered" orientation since it's back at original
            const metadataUpdates: Partial<NonNullable<MaskMetadata['objectMetadata']>> = {
              orientation: 'centered',
            };
            
            // Update the mask metadata
            get().updateMaskMetadata(maskId, metadataUpdates);
            
            // Also restore the bounding_box and centroid in the mask itself
            const maskIndex = state.results.masks.findIndex(m => m.mask_id === maskId);
            if (maskIndex !== -1) {
              const updatedMasks = [...state.results.masks];
              const originalBbox = manipState.originalBoundingBox;
              
              updatedMasks[maskIndex] = {
                ...updatedMasks[maskIndex],
                bounding_box: { ...originalBbox },
                centroid: [
                  (originalBbox.x1 + originalBbox.x2) / 2,
                  (originalBbox.y1 + originalBbox.y2) / 2,
                ],
              };
              
              set({
                results: {
                  ...state.results,
                  masks: updatedMasks,
                },
              });
            }
          }
        }
      },

      hideMask: (maskId: string) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            newManipulation.set(maskId, {
              ...manipState,
              isHidden: true,
            });
          }
          return { maskManipulation: newManipulation };
        });
        
        // Announce to screen reader
        if (mask) {
          announceManipulation('hidden', mask.label);
        }
      },

      showMask: (maskId: string) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          newManipulation.set(maskId, {
            ...manipState,
            isHidden: false,
          });
        }
        return { maskManipulation: newManipulation };
      }),

      applyImageEditToMask: (maskId: string, edit: Partial<MaskTransform['imageEdits']>) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (!manipState) {
          return state;
        }
        
        const updatedImageEdits = {
          ...manipState.transform.imageEdits,
          ...edit,
        };
        
        newManipulation.set(maskId, {
          ...manipState,
          transform: {
            ...manipState.transform,
            imageEdits: updatedImageEdits,
          },
        });
        
        // Update metadata based on image edits
        let updatedResults = state.results;
        if (state.results) {
          const maskIndex = state.results.masks.findIndex(m => m.mask_id === maskId);
          if (maskIndex !== -1) {
            const mask = state.results.masks[maskIndex];
            if (mask.objectMetadata) {
              const updater = new MetadataUpdater();
              const metadataUpdates: Partial<NonNullable<MaskMetadata['objectMetadata']>> = {};
              
              // Update appearance_details for brightness, contrast, exposure, blur
              if (edit.brightness !== undefined || edit.contrast !== undefined || 
                  edit.exposure !== undefined || edit.blur !== undefined) {
                metadataUpdates.appearance_details = updater.updateAppearanceDetailsFromEdits(
                  mask.objectMetadata.appearance_details || '',
                  updatedImageEdits
                );
              }
              
              // Update shape_and_color for saturation, hue, vibrance
              if (edit.saturation !== undefined || edit.hue !== undefined || edit.vibrance !== undefined) {
                metadataUpdates.shape_and_color = updater.updateShapeAndColorFromEdits(
                  mask.objectMetadata.shape_and_color || '',
                  updatedImageEdits
                );
              }
              
              // Update texture field for texture-related adjustments (blur affects texture perception)
              if (edit.blur !== undefined) {
                const currentTexture = mask.objectMetadata.texture || '';
                // Remove any existing blur notation
                const baseTexture = currentTexture.replace(/\s*\(blurred \d+px\)/, '').trim();
                
                if (updatedImageEdits.blur > 0) {
                  metadataUpdates.texture = baseTexture 
                    ? `${baseTexture} (blurred ${updatedImageEdits.blur}px)`
                    : `blurred ${updatedImageEdits.blur}px`;
                } else {
                  metadataUpdates.texture = baseTexture;
                }
              }
              
              // Apply metadata updates if any
              if (Object.keys(metadataUpdates).length > 0) {
                const updatedMasks = [...state.results.masks];
                updatedMasks[maskIndex] = {
                  ...mask,
                  objectMetadata: {
                    ...mask.objectMetadata,
                    ...metadataUpdates,
                  },
                };
                updatedResults = {
                  ...state.results,
                  masks: updatedMasks,
                };
              }
            }
          }
        }
        
        return { 
          maskManipulation: newManipulation,
          results: updatedResults,
        };
      }),

      updateMaskMetadata: (maskId: string, metadata: Partial<NonNullable<MaskMetadata['objectMetadata']>>) => set((state) => {
        if (!state.results) return state;
        
        const maskIndex = state.results.masks.findIndex(m => m.mask_id === maskId);
        if (maskIndex === -1) return state;
        
        const updatedMasks = [...state.results.masks];
        const mask = updatedMasks[maskIndex];
        const oldMetadata = mask.objectMetadata;
        
        updatedMasks[maskIndex] = {
          ...mask,
          objectMetadata: mask.objectMetadata ? {
            ...mask.objectMetadata,
            ...metadata,
          } : {
            description: metadata.description ?? '',
            location: metadata.location ?? '',
            relationship: metadata.relationship ?? '',
            relative_size: metadata.relative_size ?? '',
            shape_and_color: metadata.shape_and_color ?? '',
            texture: metadata.texture ?? '',
            appearance_details: metadata.appearance_details ?? '',
            orientation: metadata.orientation ?? '',
          },
        };
        
        // Track edits for the edit prompt
        // Use promptObject (short noun) as the label - do NOT fall back to long description
        import('@/shared/lib/editTracker').then(({ editTracker }) => {
          // Prefer promptObject (short noun), fall back to generic label
          const promptObj = mask.promptObject?.trim();
          // Use promptObject or generic "object N" - never use long description
          const objectLabel = promptObj || `object ${maskIndex + 1}`;
          
          // Track description changes
          if (metadata.description !== undefined && metadata.description !== oldMetadata?.description) {
            editTracker.trackEdit(
              `objects[${maskIndex}].description`,
              oldMetadata?.description,
              metadata.description,
              maskIndex,
              objectLabel
            );
          }
          
          // Track location changes
          if (metadata.location !== undefined && metadata.location !== oldMetadata?.location) {
            editTracker.trackEdit(
              `objects[${maskIndex}].location`,
              oldMetadata?.location,
              metadata.location,
              maskIndex,
              objectLabel
            );
          }
          
          // Track size changes
          if (metadata.relative_size !== undefined && metadata.relative_size !== oldMetadata?.relative_size) {
            editTracker.trackEdit(
              `objects[${maskIndex}].relative_size`,
              oldMetadata?.relative_size,
              metadata.relative_size,
              maskIndex,
              objectLabel
            );
          }
          
          // Track orientation changes
          if (metadata.orientation !== undefined && metadata.orientation !== oldMetadata?.orientation) {
            editTracker.trackEdit(
              `objects[${maskIndex}].orientation`,
              oldMetadata?.orientation,
              metadata.orientation,
              maskIndex,
              objectLabel
            );
          }
          
          // Track shape_and_color changes
          if (metadata.shape_and_color !== undefined && metadata.shape_and_color !== oldMetadata?.shape_and_color) {
            editTracker.trackEdit(
              `objects[${maskIndex}].shape_and_color`,
              oldMetadata?.shape_and_color,
              metadata.shape_and_color,
              maskIndex,
              objectLabel
            );
          }
          
          // Track texture changes
          if (metadata.texture !== undefined && metadata.texture !== oldMetadata?.texture) {
            editTracker.trackEdit(
              `objects[${maskIndex}].texture`,
              oldMetadata?.texture,
              metadata.texture,
              maskIndex,
              objectLabel
            );
          }
          
          // Track appearance_details changes
          if (metadata.appearance_details !== undefined && metadata.appearance_details !== oldMetadata?.appearance_details) {
            editTracker.trackEdit(
              `objects[${maskIndex}].appearance_details`,
              oldMetadata?.appearance_details,
              metadata.appearance_details,
              maskIndex,
              objectLabel
            );
          }
          
          // Track relationship changes
          if (metadata.relationship !== undefined && metadata.relationship !== oldMetadata?.relationship) {
            editTracker.trackEdit(
              `objects[${maskIndex}].relationship`,
              oldMetadata?.relationship,
              metadata.relationship,
              maskIndex,
              objectLabel
            );
          }
        });
        
        return {
          results: {
            ...state.results,
            masks: updatedMasks,
          },
        };
      }),

      toggleRotationMode: (maskId: string) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          newManipulation.set(maskId, {
            ...manipState,
            isRotationMode: !manipState.isRotationMode,
          });
        }
        return { maskManipulation: newManipulation };
      }),

      startRotateMask: (maskId: string) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          newManipulation.set(maskId, {
            ...manipState,
            isRotating: true,
          });
        }
        return { maskManipulation: newManipulation };
      }),

      updateMaskRotation: (maskId: string, rotation: number) => set((state) => {
        const newManipulation = new Map(state.maskManipulation);
        const manipState = newManipulation.get(maskId);
        if (manipState) {
          newManipulation.set(maskId, {
            ...manipState,
            transform: {
              ...manipState.transform,
              rotation,
            },
          });
        }
        return { maskManipulation: newManipulation };
      }),

      endRotateMask: (maskId: string, imageSize?: { width: number; height: number }) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            newManipulation.set(maskId, {
              ...manipState,
              isRotating: false,
            });
          }
          return { maskManipulation: newManipulation };
        });
        
        // Announce to screen reader
        if (mask) {
          announceManipulation('rotated', mask.label);
        }
        
        // Update orientation metadata after rotation completes
        const manipState = state.maskManipulation.get(maskId);
        if (state.results && manipState && imageSize && mask) {
          const originalOrientation = mask.objectMetadata?.orientation;
          debouncedMetadataUpdater(
            maskId,
            manipState,
            state.results.masks,
            state.maskManipulation,
            imageSize,
            get().updateMaskMetadata,
            originalOrientation
          );
        }
      },

      flipMaskHorizontal: (maskId: string) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        const currentFlipH = state.maskManipulation.get(maskId)?.transform.flipHorizontal ?? false;
        // console.log('[Store] flipMaskHorizontal called for', maskId, 'current:', currentFlipH, 'new:', !currentFlipH);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            const newFlipH = !manipState.transform.flipHorizontal;
            newManipulation.set(maskId, {
              ...manipState,
              transform: {
                ...manipState.transform,
                flipHorizontal: newFlipH,
              },
            });
          }
          return { maskManipulation: newManipulation };
        });
        
        // Track the flip edit
        if (mask) {
          announceManipulation('flipped horizontally', mask.label);
          const maskIndex = state.results?.masks.findIndex(m => m.mask_id === maskId) ?? 0;
          // Use promptObject (short noun) as the label - do NOT fall back to long description
          const promptObj = mask.promptObject?.trim();
          const objectLabel = promptObj || `object ${maskIndex + 1}`;
          import('@/shared/lib/editTracker').then(({ editTracker }) => {
            const manipState = get().maskManipulation.get(maskId);
            const isFlipped = manipState?.transform.flipHorizontal ?? false;
            editTracker.trackEdit(
              `objects[${maskIndex}].flip`,
              null,
              isFlipped ? 'flipped horizontally' : 'normal',
              maskIndex,
              objectLabel
            );
          });
        }
      },

      flipMaskVertical: (maskId: string) => {
        const state = get();
        const mask = state.results?.masks.find(m => m.mask_id === maskId);
        
        set((state) => {
          const newManipulation = new Map(state.maskManipulation);
          const manipState = newManipulation.get(maskId);
          if (manipState) {
            const newFlipV = !manipState.transform.flipVertical;
            newManipulation.set(maskId, {
              ...manipState,
              transform: {
                ...manipState.transform,
                flipVertical: newFlipV,
              },
            });
          }
          return { maskManipulation: newManipulation };
        });
        
        // Track the flip edit
        if (mask) {
          announceManipulation('flipped vertically', mask.label);
          const maskIndex = state.results?.masks.findIndex(m => m.mask_id === maskId) ?? 0;
          // Use promptObject (short noun) as the label - do NOT fall back to long description
          const promptObj = mask.promptObject?.trim();
          const objectLabel = promptObj || `object ${maskIndex + 1}`;
          import('@/shared/lib/editTracker').then(({ editTracker }) => {
            const manipState = get().maskManipulation.get(maskId);
            const isFlipped = manipState?.transform.flipVertical ?? false;
            editTracker.trackEdit(
              `objects[${maskIndex}].flip`,
              null,
              isFlipped ? 'flipped vertically' : 'normal',
              maskIndex,
              objectLabel
            );
          });
        }
      },
    }),
    {
      name: 'Segmentation Store',
    }
  )
);
