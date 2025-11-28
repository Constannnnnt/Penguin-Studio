import { ChevronRight, Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/store/fileSystemStore';

interface FileTreeProps {
  node: FileNode;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onSelectFile: (node: FileNode) => void;
  onToggleFolder: (path: string) => void;
  depth?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({
  node,
  selectedFile,
  expandedFolders,
  onSelectFile,
  onToggleFolder,
  depth = 0,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;

  const handleClick = (): void => {
    if (node.type === 'directory') {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'ArrowRight' && node.type === 'directory' && !isExpanded) {
      e.preventDefault();
      onToggleFolder(node.path);
    } else if (e.key === 'ArrowLeft' && node.type === 'directory' && isExpanded) {
      e.preventDefault();
      onToggleFolder(node.path);
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent/80 rounded-md transition-colors duration-150",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={node.type === 'directory' ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={`${node.type === 'directory' ? 'Folder' : 'File'}: ${node.name}`}
      >
        {node.type === 'directory' && (
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-150",
              isExpanded && "rotate-90"
            )}
          />
        )}
        {node.type === 'directory' ? (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <File className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTree
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
