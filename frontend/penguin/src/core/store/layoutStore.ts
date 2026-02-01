import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type ControlsTab = 'image' | 'scene' | 'objects';
export type LayoutMode = 'edit' | 'chat';

export interface LayoutState {
  libraryPanelCollapsed: boolean;
  ControlsPanelCollapsed: boolean;
  libraryPanelWidth: number;
  ControlsPanelWidth: number;
  activeControlsTab: ControlsTab;
  activeMode: LayoutMode;
  workspaceHandlers?: {
    handleGenerate?: (promptOverride?: string) => void;
    handleRefine?: (promptOverride?: string) => void;
    handleRefineWithConfig?: (configOverride: unknown, promptOverride?: string, structuredOverride?: unknown) => void;
  };

  toggleLibraryPanel: () => void;
  toggleControlsPanel: () => void;
  setLibraryPanelWidth: (width: number) => void;
  setControlsPanelWidth: (width: number) => void;
  setActiveControlsTab: (tab: ControlsTab) => void;
  setActiveMode: (mode: LayoutMode) => void;
  setWorkspaceHandlers: (handlers?: {
    handleGenerate?: (promptOverride?: string) => void;
    handleRefine?: (promptOverride?: string) => void;
    handleRefineWithConfig?: (configOverride: unknown, promptOverride?: string, structuredOverride?: unknown) => void;
  }) => void;
}

interface PersistedLayoutState {
  libraryPanelCollapsed: boolean;
  ControlsPanelCollapsed: boolean;
  libraryPanelWidth: number;
  ControlsPanelWidth: number;
  activeControlsTab: ControlsTab;
  activeMode: LayoutMode;
}

const DEFAULT_LIBRARY_PANEL_WIDTH = 280;
const DEFAULT__CONTROLS_PANEL_WIDTH = 320;
const CURRENT_VERSION = 2;

const sanitizePersistedState = (state?: Partial<PersistedLayoutState>): PersistedLayoutState => {
  const activeTab = state?.activeControlsTab;
  const validTabs: ControlsTab[] = ['image', 'scene', 'objects'];
  
  return {
    libraryPanelCollapsed: state?.libraryPanelCollapsed ?? false,
    ControlsPanelCollapsed: state?.ControlsPanelCollapsed ?? false,
    libraryPanelWidth: state?.libraryPanelWidth ?? DEFAULT_LIBRARY_PANEL_WIDTH,
    ControlsPanelWidth: state?.ControlsPanelWidth ?? DEFAULT__CONTROLS_PANEL_WIDTH,
    activeControlsTab: activeTab && validTabs.includes(activeTab) ? activeTab : 'scene',
    activeMode: state?.activeMode ?? 'edit',
  };
};

const migrateLayoutState = (persistedState: any, version: number): PersistedLayoutState => {
  if (!persistedState) {
    return sanitizePersistedState();
  }

  if (version >= CURRENT_VERSION) {
    return sanitizePersistedState(persistedState as Partial<PersistedLayoutState>);
  }

  // Migrate from legacy visibility flags to collapsed state
  const legacyState = persistedState as {
    libraryPanelVisible?: boolean;
    ControlsPanelVisible?: boolean;
    libraryPanelWidth?: number;
    ControlsPanelWidth?: number;
    activeControlsTab?: ControlsTab;
    libraryPanelCollapsed?: boolean;
    ControlsPanelCollapsed?: boolean;
  };

  return sanitizePersistedState({
    libraryPanelCollapsed:
      legacyState.libraryPanelCollapsed ??
      (typeof legacyState.libraryPanelVisible === 'boolean' ? !legacyState.libraryPanelVisible : false),
    ControlsPanelCollapsed:
      legacyState.ControlsPanelCollapsed ??
      (typeof legacyState.ControlsPanelVisible === 'boolean' ? !legacyState.ControlsPanelVisible : false),
    libraryPanelWidth: legacyState.libraryPanelWidth,
    ControlsPanelWidth: legacyState.ControlsPanelWidth,
    activeControlsTab: legacyState.activeControlsTab,
  });
};

export const useLayoutStore = create<LayoutState>()(
  devtools(
    persist(
      (set) => ({
        libraryPanelCollapsed: false,
        ControlsPanelCollapsed: false,
        libraryPanelWidth: DEFAULT_LIBRARY_PANEL_WIDTH,
        ControlsPanelWidth: DEFAULT__CONTROLS_PANEL_WIDTH,
        activeControlsTab: 'scene',
        activeMode: 'edit',
        workspaceHandlers: undefined,

        toggleLibraryPanel: () =>
          set((state) => ({
            libraryPanelCollapsed: !state.libraryPanelCollapsed,
          })),

        toggleControlsPanel: () =>
          set((state) => ({
            ControlsPanelCollapsed: !state.ControlsPanelCollapsed,
          })),

        setLibraryPanelWidth: (width: number) =>
          set({ libraryPanelWidth: width }),

        setControlsPanelWidth: (width: number) =>
          set({ ControlsPanelWidth: width }),

        setActiveControlsTab: (tab: ControlsTab) =>
          set({ activeControlsTab: tab }),

        setActiveMode: (mode: LayoutMode) =>
          set({ activeMode: mode }),

        setWorkspaceHandlers: (handlers) =>
          set({ workspaceHandlers: handlers }),
      }),
      {
        name: 'penguin-layout-storage',
        version: CURRENT_VERSION,
        migrate: (persistedState: any, version: number) => {
          return migrateLayoutState(persistedState, version);
        },
        partialize: (state) => ({
          libraryPanelCollapsed: state.libraryPanelCollapsed,
          ControlsPanelCollapsed: state.ControlsPanelCollapsed,
          libraryPanelWidth: state.libraryPanelWidth,
          ControlsPanelWidth: state.ControlsPanelWidth,
          activeControlsTab: state.activeControlsTab,
          activeMode: state.activeMode,
        }),
      }
    ),
    {
      name: 'Penguin Layout Store',
    }
  )
);
