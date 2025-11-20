import { useRef } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { LibraryPanel } from './LibraryPanel';
import { WorkspacePanel, type WorkspacePanelRef } from './WorkspacePanel';
import { ControlsPanel } from './ControlsPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Header } from './Header';
import { CollapsiblePanel } from './CollapsiblePanel';

export const IDELayout: React.FC = () => {
  const {
    libraryPanelWidth,
    ControlsPanelWidth,
    toggleLibraryPanel,
    toggleControlsPanel,
    setLibraryPanelWidth,
    setControlsPanelWidth,
    libraryPanelCollapsed,
    ControlsPanelCollapsed,
  } = useLayoutStore();

  const workspacePanelRef = useRef<WorkspacePanelRef>(null);

  useKeyboardShortcuts({
    generate: {
      key: 'g',
      ctrl: true,
      handler: () => {
        workspacePanelRef.current?.handleGenerate();
      },
      description: 'Generate image',
    },
    refine: {
      key: 'r',
      ctrl: true,
      handler: () => {
        workspacePanelRef.current?.handleRefine();
      },
      description: 'Refine image',
    },
  });

  const handleLibraryResize = (delta: number): void => {
    if (libraryPanelCollapsed) return;
    const minWidth = window.innerWidth < 1536 ? 200 : 240;
    const maxWidth = window.innerWidth < 1536 ? 320 : 400;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, libraryPanelWidth + delta));
    setLibraryPanelWidth(newWidth);
  };

  const handleControlsResize = (delta: number): void => {
    if (ControlsPanelCollapsed) return;
    const minWidth = window.innerWidth < 1536 ? 280 : 300;
    const maxWidth = window.innerWidth < 1536 ? 400 : 500;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, ControlsPanelWidth - delta));
    setControlsPanelWidth(newWidth);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border bg-background/80 px-4 py-3 shadow-sm backdrop-blur">
        <Header
          // onToggleLibrary={toggleLibraryPanel}
          // onToggleControls={toggleControlsPanel}
          // libraryCollapsed={libraryPanelCollapsed}
          // controlsCollapsed={ControlsPanelCollapsed}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <CollapsiblePanel
          side="left"
          title="Library"
          width={libraryPanelWidth}
          collapsed={libraryPanelCollapsed}
          onToggle={toggleLibraryPanel}
          onResize={handleLibraryResize}
        >
          <LibraryPanel />
        </CollapsiblePanel>

        <WorkspacePanel ref={workspacePanelRef} />

        <CollapsiblePanel
          side="right"
          title="Controls"
          width={ControlsPanelWidth}
          collapsed={ControlsPanelCollapsed}
          onToggle={toggleControlsPanel}
          onResize={handleControlsResize}
        >
          <ControlsPanel />
        </CollapsiblePanel>
      </div>
    </div>
  );
};
