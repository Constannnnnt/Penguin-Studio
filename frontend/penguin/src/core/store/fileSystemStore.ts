import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { env } from '@/shared/lib/env';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { apiClient } from '@/core/services/api';
import { useConfigStore } from '@/features/scene/store/configStore';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  url?: string;
  modified_at?: string;
  size?: number;
}

export interface FileSystemState {
  rootDirectory: FileNode;
  selectedFile: string | null;
  selectedFileUrl: string | null;
  expandedFolders: Set<string>;
  currentGenerationId: string | null;
  currentSeed: number | null;
  promptVersions: string[];
  isLoadingGeneration: boolean;

  loadFileTree: () => Promise<void>;
  selectFile: (node: FileNode) => void;
  loadGeneration: (generationId: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  refreshFileTree: () => Promise<void>;
  addSegmentedImage: (resultId: string, imageUrl: string, timestamp: string) => Promise<void>;
}

const DEFAULT_ROOT_DIRECTORY: FileNode = {
  name: 'Home',
  path: '/',
  type: 'directory',
  children: [],
};

export const useFileSystemStore = create<FileSystemState>()(
  devtools(
    (set, get) => ({
      rootDirectory: DEFAULT_ROOT_DIRECTORY,
      selectedFile: null,
      selectedFileUrl: null,
      expandedFolders: new Set<string>(['/']),
      currentGenerationId: null,
      currentSeed: null,
      promptVersions: [],
      isLoadingGeneration: false,

      loadFileTree: async () => {
        try {
          const response = await fetch(`${env.apiBaseUrl}/api/v1/library`);
          if (!response.ok) {
            throw new Error(`Failed to fetch library: ${response.statusText}`);
          }

          const data: FileNode = await response.json();

          const expanded = new Set<string>(get().expandedFolders.size ? Array.from(get().expandedFolders) : ['/']);
          expanded.add('/');
          data.children?.forEach((child) => {
            if (child.type === 'directory' && (child.name === 'examples' || child.name === 'results')) {
              expanded.add(child.path);
            }
          });

          set({
            rootDirectory: data.children ? data : DEFAULT_ROOT_DIRECTORY,
            expandedFolders: expanded,
          });
        } catch (error) {
          console.error('Failed to load file tree:', error);
          set({ rootDirectory: DEFAULT_ROOT_DIRECTORY });
        }
      },

      selectFile: (node: FileNode) => {
        if (node.type !== 'file') return;

        const absoluteUrl = node.url
          ? (node.url.startsWith('http') ? node.url : `${env.apiBaseUrl}${node.url}`)
          : null;

        // Check if this is a generated.png in a generation folder (outputs/*)
        const pathParts = node.path.split('/');
        const isGeneratedImage = node.name === 'generated.png' && pathParts.length >= 2;
        
        if (isGeneratedImage) {
          // Extract generation ID from path (e.g., /outputs/gen_123/generated.png -> gen_123)
          const generationId = pathParts[pathParts.length - 2];
          if (generationId) {
            get().loadGeneration(generationId);
            return;
          }
        }

        const segmentationStore = useSegmentationStore.getState();
        segmentationStore.clearResults();

        set({
          selectedFile: node.path,
          selectedFileUrl: absoluteUrl,
          currentGenerationId: null,
          currentSeed: null,
          promptVersions: [],
        });
      },

      loadGeneration: async (generationId: string) => {
        set({ isLoadingGeneration: true });

        try {
          const response = await apiClient.loadGeneration(generationId);
          const configStore = useConfigStore.getState();

          // 1. Update config from structured prompt (objects, scene data)
          if (response.structured_prompt && Object.keys(response.structured_prompt).length > 0) {
            const sp = response.structured_prompt;
            console.log('[LoadGeneration] Structured prompt:', sp);
            console.log('[LoadGeneration] Objects:', sp.objects);
            console.log('[LoadGeneration] Background:', sp.background_setting);
            
            // First update raw config (includes objects)
            configStore.updateConfigFromStructuredPrompt(sp);
            
            // Then try semantic parsing for scene config
            try {
              const parsedConfig = await apiClient.parseSceneMetadata(sp);
              configStore.applySemanticParsing(parsedConfig);
            } catch (parseErr) {
              console.warn('[LoadGeneration] Semantic parsing failed, using raw config:', parseErr);
            }
          } else {
            console.warn('[LoadGeneration] No structured prompt found');
          }

          // 2. Load masks into segmentation store (without calling segmentation service)
          const segmentationStore = useSegmentationStore.getState();
          
          if (response.masks && response.masks.length > 0) {
            const segmentationResults = {
              result_id: generationId,
              original_image_url: response.image_url.startsWith('http') 
                ? response.image_url 
                : `${env.apiBaseUrl}${response.image_url}`,
              masks: response.masks.map((mask, index) => ({
                mask_id: mask.mask_id,
                label: mask.label || `Object ${index + 1}`,
                confidence: 1.0,
                bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
                area_pixels: 0,
                area_percentage: 0,
                centroid: [50, 50] as [number, number],
                mask_url: mask.mask_url.startsWith('http') 
                  ? mask.mask_url 
                  : `${env.apiBaseUrl}${mask.mask_url}`,
              })),
              processing_time_ms: 0,
              timestamp: new Date().toISOString(),
              metadata: response.structured_prompt,
            };

            segmentationStore.setResults(segmentationResults);
          } else {
            segmentationStore.clearResults();
          }

          // 3. Update file system state
          const absoluteUrl = response.image_url.startsWith('http')
            ? response.image_url
            : `${env.apiBaseUrl}${response.image_url}`;

          // Extract seed from metadata if available
          const seed = response.metadata?.seed as number | undefined;

          set({
            selectedFile: `/outputs/${generationId}/generated.png`,
            selectedFileUrl: absoluteUrl,
            currentGenerationId: generationId,
            currentSeed: seed ?? null,
            promptVersions: response.prompt_versions,
            isLoadingGeneration: false,
          });

          console.log(`[FileSystem] Loaded generation ${generationId}: ${response.masks.length} masks, seed=${seed}`);

        } catch (error) {
          console.error('[FileSystem] Failed to load generation:', error);
          set({ isLoadingGeneration: false });
        }
      },

      toggleFolder: (path: string) =>
        set((state) => {
          const newExpandedFolders = new Set(state.expandedFolders);
          if (newExpandedFolders.has(path)) {
            newExpandedFolders.delete(path);
          } else {
            newExpandedFolders.add(path);
          }
          return { expandedFolders: newExpandedFolders };
        }),

      refreshFileTree: async () => {
        const { loadFileTree } = get();
        await loadFileTree();
      },

      addSegmentedImage: async (resultId: string, _imageUrl: string, _timestamp: string) => {
        await get().loadFileTree();
        set((state) => {
          const newExpandedFolders = new Set(state.expandedFolders);
          newExpandedFolders.add('/results');
          newExpandedFolders.add(`/results/${resultId}`);
          return { expandedFolders: newExpandedFolders };
        });
      },
    }),
    {
      name: 'Penguin File System Store',
    }
  )
);
