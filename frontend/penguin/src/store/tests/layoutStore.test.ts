import { describe, it, expect } from "vitest";
import { useLayoutStore } from "../layoutStore";

describe("LayoutStore Persistence", () => {
  it("should persist layout state changes to localStorage", () => {
    const store = useLayoutStore.getState();
    
    store.setLibraryPanelWidth(300);
    store.setAdvancedControlsPanelWidth(350);
    store.setActiveControlsTab("image");

    const stored = localStorage.getItem("penguin-layout-storage");
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.libraryPanelWidth).toBe(300);
    expect(parsed.state.advancedControlsPanelWidth).toBe(350);
    expect(parsed.state.activeControlsTab).toBe("image");
    expect(parsed.version).toBe(2);
  });

  it("should persist panel collapsed state changes", () => {
    const store = useLayoutStore.getState();
    const initialCollapsed = store.libraryPanelCollapsed;
    
    store.toggleLibraryPanel();

    const stored = localStorage.getItem("penguin-layout-storage");
    const parsed = JSON.parse(stored!);
    expect(parsed.state.libraryPanelCollapsed).toBe(!initialCollapsed);
  });

  it("should include version field in persisted state", () => {
    const store = useLayoutStore.getState();
    store.setLibraryPanelWidth(280);

    const stored = localStorage.getItem("penguin-layout-storage");
    const parsed = JSON.parse(stored!);
    
    expect(parsed.version).toBeDefined();
    expect(typeof parsed.version).toBe("number");
  });
});
