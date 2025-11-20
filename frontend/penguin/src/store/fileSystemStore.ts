import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
}

export interface FileSystemState {
  rootDirectory: FileNode;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  
  loadFileTree: () => Promise<void>;
  selectFile: (path: string) => void;
  toggleFolder: (path: string) => void;
  refreshFileTree: () => Promise<void>;
}

const DEFAULT_ROOT_DIRECTORY: FileNode = {
  name: 'root',
  path: '/',
  type: 'directory',
  children: [],
};

const MOCK_FILE_TREE: FileNode = {
  name: 'root',
  path: '/',
  type: 'directory',
  children: [
    {
      name: 'images',
      path: '/images',
      type: 'directory',
      children: [
        {
          name: 'generated',
          path: '/images/generated',
          type: 'directory',
          children: [
            {
              name: 'image1.png',
              path: '/images/generated/image1.png',
              type: 'file',
              extension: 'png',
            },
            {
              name: 'image2.png',
              path: '/images/generated/image2.png',
              type: 'file',
              extension: 'png',
            },
          ],
        },
        {
          name: 'uploads',
          path: '/images/uploads',
          type: 'directory',
          children: [
            {
              name: 'photo.jpg',
              path: '/images/uploads/photo.jpg',
              type: 'file',
              extension: 'jpg',
            },
          ],
        },
      ],
    },
    {
      name: 'projects',
      path: '/projects',
      type: 'directory',
      children: [
        {
          name: 'project1',
          path: '/projects/project1',
          type: 'directory',
          children: [
            {
              name: 'config.json',
              path: '/projects/project1/config.json',
              type: 'file',
              extension: 'json',
            },
          ],
        },
      ],
    },
  ],
};

export const useFileSystemStore = create<FileSystemState>()(
  devtools(
    (set, get) => ({
      rootDirectory: DEFAULT_ROOT_DIRECTORY,
      selectedFile: null,
      expandedFolders: new Set<string>(),

      loadFileTree: async () => {
        try {
          set({ rootDirectory: MOCK_FILE_TREE });
        } catch (error) {
          console.error('Failed to load file tree:', error);
        }
      },

      selectFile: (path: string) =>
        set({ selectedFile: path }),

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
    }),
    {
      name: 'Penguin File System Store',
    }
  )
);
