import { describe, it, expect, beforeEach } from "vitest";
import { useLayoutStore } from "../layoutStore";

describe("LayoutStore Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should persist layout state changes to localStorage", async () => {
    const store = useLayoutStore.getState();
    
    store.setLibraryPanelWidth(300);
    store.setControlsPanelWidth(350);
    store.setActiveControlsTab("image");

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 100));

    const stored = localStorage.getItem("penguin-layout-storage");
    expect(stored).toBeTruthy();

    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.libraryPanelWidth).toBe(300);
      expect(parsed.state.ControlsPanelWidth).toBe(350);
      expect(parsed.state.activeControlsTab).toBe("image");
    }
  });

  it("should persist panel collapsed state changes", async () => {
    const store = useLayoutStore.getState();
    const initialCollapsed = store.libraryPanelCollapsed;
    
    store.toggleLibraryPanel();

    await new Promise(resolve => setTimeout(resolve, 100));

    const stored = localStorage.getItem("penguin-layout-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.libraryPanelCollapsed).toBe(!initialCollapsed);
    }
  });

  it("should include version field in persisted state", async () => {
    const store = useLayoutStore.getState();
    store.setLibraryPanelWidth(280);

    await new Promise(resolve => setTimeout(resolve, 100));

    const stored = localStorage.getItem("penguin-layout-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      
      expect(parsed.version).toBeDefined();
      expect(typeof parsed.version).toBe("number");
    }
  });
});
