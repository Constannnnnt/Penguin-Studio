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
  addSegmentedImage: (resultId: string, imageUrl: string, timestamp: string) => void;
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
      expandedFolders: new Set<string>(),

      loadFileTree: async () => {
        try {
          set((state) => ({
            rootDirectory: state.rootDirectory.children?.length
              ? state.rootDirectory
              : DEFAULT_ROOT_DIRECTORY,
          }));
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

      addSegmentedImage: (resultId: string, _imageUrl: string, _timestamp: string) => {
        set((state) => {
          const newRoot = { ...state.rootDirectory };
          if (!newRoot.children) newRoot.children = [];
          
          let imagesFolder = newRoot.children.find(
            (child) => child.name === 'images' && child.type === 'directory'
          );

          if (!imagesFolder) {
            imagesFolder = {
              name: 'images',
              path: '/images',
              type: 'directory',
              children: [],
            };
            newRoot.children.push(imagesFolder);
          }

          if (!imagesFolder.children) {
            imagesFolder.children = [];
          }

          let segmentedFolder = imagesFolder.children.find(
            (child) => child.name === 'segmented' && child.type === 'directory'
          );

          if (!segmentedFolder) {
            segmentedFolder = {
              name: 'segmented',
              path: '/images/segmented',
              type: 'directory',
              children: [],
            };
            imagesFolder.children.push(segmentedFolder);
          }

          if (!segmentedFolder.children) {
            segmentedFolder.children = [];
          }

          const fileName = `${resultId}.png`;
          const existingFile = segmentedFolder.children.find(
            (child) => child.name === fileName
          );

          if (!existingFile) {
            segmentedFolder.children.unshift({
              name: fileName,
              path: `/images/segmented/${fileName}`,
              type: 'file',
              extension: 'png',
            });
          }

          const newExpandedFolders = new Set(state.expandedFolders);
          newExpandedFolders.add('/images');
          newExpandedFolders.add('/images/segmented');

          return {
            rootDirectory: newRoot,
            expandedFolders: newExpandedFolders,
          };
        });
      },
    }),
    {
      name: 'Penguin File System Store',
    }
  )
);
