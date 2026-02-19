import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { env } from '@/shared/lib/env';
import { useSegmentationStore, type SegmentationResponse } from '@/features/segmentation/store/segmentationStore';
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
  originalStructuredPrompt: Record<string, unknown> | null;

  loadFileTree: () => Promise<void>;
  selectFile: (node: FileNode) => void;
  loadGeneration: (
    generationId: string,
    options?: { selectedNode?: FileNode }
  ) => Promise<void>;
  toggleFolder: (path: string) => void;
  refreshFileTree: () => Promise<void>;
  addSegmentedImage: (resultId: string, imageUrl: string, timestamp: string) => Promise<void>;
  setOriginalStructuredPrompt: (prompt: Record<string, unknown> | null) => void;
  setCurrentGenerationContext: (generationId: string | null, seed: number | null) => void;
}

const DEFAULT_ROOT_DIRECTORY: FileNode = {
  name: 'Home',
  path: '/',
  type: 'directory',
  children: [],
};

const extractGenerationContextFromNode = (
  node: FileNode
): { generationId: string; selectedMaskId?: string } | null => {
  const normalizedPath = (node.path || '').replace(/\\/g, '/');
  const pathMatch = normalizedPath.match(/^\/results\/([^/]+)\/(.+)$/i);
  if (!pathMatch) return null;

  const generationId = pathMatch[1]?.trim();
  const filename = pathMatch[2]?.trim();
  if (!generationId) return null;

  let selectedMaskId: string | undefined;
  if (filename) {
    const maskMatch = filename.match(/^mask_(\d+)\.(png|jpg|jpeg|webp)$/i);
    if (maskMatch) {
      selectedMaskId = `mask_${maskMatch[1]}`;
    }
  }

  return { generationId, selectedMaskId };
};

export const useFileSystemStore = create<FileSystemState>()(
  devtools(
    (set, get) => ({
      rootDirectory: DEFAULT_ROOT_DIRECTORY,
      selectedFile: null,
      selectedFileUrl: null,
      expandedFolders: new Set<string>(['/']),
      originalStructuredPrompt: null,
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

        const generationContext = extractGenerationContextFromNode(node);
        if (generationContext?.generationId) {
          get().loadGeneration(generationContext.generationId, { selectedNode: node });
          return;
        }

        const absoluteUrl = node.url
          ? (node.url.startsWith('http') ? node.url : `${env.apiBaseUrl}${node.url}`)
          : null;

        const segmentationStore = useSegmentationStore.getState();
        segmentationStore.clearResults();

        // Clear stale seed from prior generation to prevent it leaking
        const configStore = useConfigStore.getState();
        configStore.clearSeed();

        set({
          selectedFile: node.path,
          selectedFileUrl: absoluteUrl,
          currentGenerationId: null,
          currentSeed: null,
          promptVersions: [],
        });
      },

      loadGeneration: async (
        generationId: string,
        options?: { selectedNode?: FileNode }
      ) => {
        set({ isLoadingGeneration: true });

        try {
          const response = await apiClient.loadGeneration(generationId);
          const configStore = useConfigStore.getState();

          // 1. Update config from structured prompt (objects, scene data)
          if (response.structured_prompt && Object.keys(response.structured_prompt).length > 0) {
            const sp = response.structured_prompt;
            // console.log('[LoadGeneration] Structured prompt:', sp);
            // console.log('[LoadGeneration] Objects:', sp.objects);
            // console.log('[LoadGeneration] Background:', sp.background_setting);
            
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
            // Use full mask data from segmentation_meta.json if available
            const segmentationResults = {
              result_id: generationId,
              original_image_url: response.image_url.startsWith('http') 
                ? response.image_url 
                : `${env.apiBaseUrl}${response.image_url}`,
              masks: response.masks.map((mask, index) => {
                const maskUrl = mask.mask_url?.startsWith('http') 
                  ? mask.mask_url 
                  : `${env.apiBaseUrl}${mask.mask_url}`;
                
                // Check if we have rich metadata from segmentation_meta.json
                const hasRichData = mask.bounding_box && 
                  typeof mask.bounding_box.x1 === 'number';
                
                return {
                  mask_id: mask.mask_id,
                  label: mask.label || `Object ${index + 1}`,
                  confidence: mask.confidence ?? 1.0,
                  bounding_box: hasRichData 
                    ? mask.bounding_box! 
                    : { x1: 0, y1: 0, x2: 100, y2: 100 },
                  area_pixels: mask.area_pixels ?? 0,
                  area_percentage: mask.area_percentage ?? 0,
                  centroid: mask.centroid ?? [50, 50] as [number, number],
                  mask_url: maskUrl,
                  promptTier: mask.prompt_tier,
                  promptText: mask.prompt_text,
                  promptObject: mask.prompt_object,
                  objectMetadata: mask.object_metadata,
                };
              }),
              processing_time_ms: 0,
              timestamp: new Date().toISOString(),
            } as SegmentationResponse;

            segmentationStore.setResults(segmentationResults);

            const selectedNode = options?.selectedNode;
            if (selectedNode) {
              const selectedNodeUrl = selectedNode.url
                ? (selectedNode.url.startsWith('http')
                    ? selectedNode.url
                    : `${env.apiBaseUrl}${selectedNode.url}`)
                : '';
              const normalizedSelectedUrl = selectedNodeUrl.replace(/\\/g, '/');
              const matchedMask = segmentationResults.masks.find((mask) => {
                const normalizedMaskUrl = mask.mask_url.replace(/\\/g, '/');
                return (
                  normalizedMaskUrl.endsWith(`/${selectedNode.name}`) ||
                  normalizedMaskUrl === normalizedSelectedUrl
                );
              });
              segmentationStore.selectMask(matchedMask?.mask_id || null);
            } else {
              segmentationStore.selectMask(null);
            }
          } else {
            segmentationStore.clearResults();
          }

          // 3. Update file system state
          const absoluteUrl = response.image_url.startsWith('http')
            ? response.image_url
            : `${env.apiBaseUrl}${response.image_url}`;

          const coerceSeed = (value: unknown): number | null => {
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value === 'string') {
              const parsed = Number(value);
              return Number.isFinite(parsed) ? parsed : null;
            }
            return null;
          };

          const metadata = response.metadata as Record<string, unknown> | undefined;
          const metadataParams = (metadata?.parameters as Record<string, unknown> | undefined) || undefined;
          const seedCandidates = [
            response.seed,
            metadata?.seed,
            metadataParams?.seed,
            (response.structured_prompt as Record<string, unknown> | undefined)?.seed,
          ];

          let seed: number | null = null;
          for (const candidate of seedCandidates) {
            const parsed = coerceSeed(candidate);
            if (parsed !== null) {
              seed = parsed;
              break;
            }
          }

          if (seed !== null) {
            const { sceneConfig, setSceneConfig } = useConfigStore.getState();
            if (sceneConfig.seed !== seed) {
              setSceneConfig({ ...sceneConfig, seed });
            }
          }

          const imageFilename = response.image_url.split('/').pop() || 'generated.png';

          set({
            selectedFile: `/results/${generationId}/${imageFilename}`,
            selectedFileUrl: absoluteUrl,
            currentGenerationId: generationId,
            currentSeed: seed,
            promptVersions: response.prompt_versions,
            isLoadingGeneration: false,
            // Store original structured prompt for refinement
            originalStructuredPrompt: response.structured_prompt || null,
          });

          // console.log(`[FileSystem] Loaded generation ${generationId}: ${response.masks.length} masks, seed=${seed}`);

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

      setOriginalStructuredPrompt: (prompt: Record<string, unknown> | null) => {
        set({ originalStructuredPrompt: prompt });
      },

      setCurrentGenerationContext: (generationId: string | null, seed: number | null) => {
        set({
          currentGenerationId: generationId,
          currentSeed: seed,
        });
      },
    }),
    {
      name: 'Penguin File System Store',
    }
  )
);
