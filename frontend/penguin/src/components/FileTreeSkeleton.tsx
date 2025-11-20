import * as React from 'react';

export const FileTreeSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 p-2 animate-pulse" role="status" aria-label="Loading file tree">
      {[...Array(8)].map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-2 py-1.5"
          style={{ paddingLeft: `${(index % 3) * 16 + 8}px` }}
        >
          <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
          <div
            className="h-3 bg-muted-foreground/20 rounded"
            style={{ width: `${60 + (index % 4) * 20}%` }}
          />
        </div>
      ))}
      <span className="sr-only">Loading files...</span>
    </div>
  );
};
