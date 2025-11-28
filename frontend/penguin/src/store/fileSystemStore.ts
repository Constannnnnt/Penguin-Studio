import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { env } from '@/lib/env';
import { useSegmentationStore } from './segmentationStore';

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
  
  loadFileTree: () => Promise<void>;
  selectFile: (node: FileNode) => void;
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

        const segmentationStore = useSegmentationStore.getState();
        segmentationStore.clearResults();

        set({
          selectedFile: node.path,
          selectedFileUrl: absoluteUrl,
        });
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
