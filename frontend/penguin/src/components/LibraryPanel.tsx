import { useEffect, useState } from 'react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { PanelHeader } from './PanelHeader';
import { FileTree } from './FileTree';
import { FileTreeSkeleton } from './FileTreeSkeleton';
import { UploadForSegmentationButton } from './UploadForSegmentationButton';

export const LibraryPanel: React.FC = () => {
  const { rootDirectory, selectedFile, expandedFolders, selectFile, toggleFolder, loadFileTree } = useFileSystemStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async (): Promise<void> => {
      setIsLoading(true);
      await loadFileTree();
      setIsLoading(false);
    };
    loadFiles();
  }, [loadFileTree]);

  return (
    <aside className="flex h-full flex-col" aria-label="Library panel">
      <PanelHeader
        title="Library"
        position="left"
      />
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <FileTreeSkeleton />
        ) : rootDirectory.children && rootDirectory.children.length > 0 ? (
          <div className="p-2">
            <FileTree
              node={rootDirectory}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onSelectFile={selectFile}
              onToggleFolder={toggleFolder}
            />
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No files available</p>
          </div>
        )}
      </div>
        <div className="pt-3 ml-2 mr-2 mb-4 border-t border-border">
        <UploadForSegmentationButton />
      </div>
    </aside>
  );
};
