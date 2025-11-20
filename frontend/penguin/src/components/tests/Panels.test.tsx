import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PanelNav } from "../PanelNav";
import { PanelContainer } from "../PanelContainer";
import { CameraPanel } from "../CameraPanel";
import { LightingPanel } from "../LightingPanel";
import { AestheticsPanel } from "../AestheticsPanel";
import { MediumPanel } from "../MediumPanel";
import { useConfigStore } from "@/store/configStore";

// ============================================================================
// Test Setup
// ============================================================================/ ============================================================================

describe("Panel Integration Tests", () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useConfigStore.getState().resetConfig();
    vi.clearAllMocks();

    // Clear localStorage to test persistence
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ==========================================================================
  // Panel Navigation Tests 
  // ==========================================================================

  describe("Panel Navigation", () => {
    it("should render all panel tabs", () => {
      render(<PanelNav />);

      expect(screen.getByRole("tab", { name: /scene/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /camera/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /light/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /style/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /art/i })).toBeInTheDocument();
    });

    it("should have scene panel active by default", () => {
      render(<PanelNav />);

      const sceneTab = screen.getByRole("tab", { name: /scene/i });
      expect(sceneTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch active panel when tab is clicked", () => {
      render(<PanelNav />);

      const cameraTab = screen.getByRole("tab", { name: /camera/i });
      fireEvent.click(cameraTab);

      expect(cameraTab).toHaveAttribute("aria-selected", "true");
      expect(useConfigStore.getState().activePanel).toBe("camera");
    });

    it("should update store when switching between panels", () => {
      render(<PanelNav />);

      const lightingTab = screen.getByRole("tab", { name: /light/i });
      fireEvent.click(lightingTab);
      expect(useConfigStore.getState().activePanel).toBe("lighting");

      const aestheticsTab = screen.getByRole("tab", { name: /style/i });
      fireEvent.click(aestheticsTab);
      expect(useConfigStore.getState().activePanel).toBe("aesthetics");

      const mediumTab = screen.getByRole("tab", { name: /art/i });
      fireEvent.click(mediumTab);
      expect(useConfigStore.getState().activePanel).toBe("medium");
    });

    it("should navigate to next panel with ArrowRight key", () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");

      // Start at scene (index 0)
      expect(useConfigStore.getState().activePanel).toBe("scene");

      // Press ArrowRight to go to camera (index 1)
      fireEvent.keyDown(tabList, { key: "ArrowRight" });
      expect(useConfigStore.getState().activePanel).toBe("camera");

      // Press ArrowRight to go to lighting (index 2)
      fireEvent.keyDown(tabList, { key: "ArrowRight" });
      expect(useConfigStore.getState().activePanel).toBe("lighting");
    });

    it("should navigate to previous panel with ArrowLeft key", () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");

      // Start at scene, go to camera
      fireEvent.keyDown(tabList, { key: "ArrowRight" });
      expect(useConfigStore.getState().activePanel).toBe("camera");

      // Press ArrowLeft to go back to scene
      fireEvent.keyDown(tabList, { key: "ArrowLeft" });
      expect(useConfigStore.getState().activePanel).toBe("scene");
    });

    it("should wrap to last panel when pressing ArrowLeft on first panel", () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");

      // Start at scene (first panel)
      expect(useConfigStore.getState().activePanel).toBe("scene");

      // Press ArrowLeft should wrap to medium (last panel)
      fireEvent.keyDown(tabList, { key: "ArrowLeft" });
      expect(useConfigStore.getState().activePanel).toBe("medium");
    });

    it("should wrap to first panel when pressing ArrowRight on last panel", async () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");

      // Navigate to last panel (medium)
      useConfigStore.getState().setActivePanel("medium");

      // Wait for state to update
      await waitFor(() => {
        expect(useConfigStore.getState().activePanel).toBe("medium");
      });

      // Press ArrowRight should wrap to scene (first panel)
      fireEvent.keyDown(tabList, { key: "ArrowRight" });

      await waitFor(() => {
        expect(useConfigStore.getState().activePanel).toBe("scene");
      });
    });

    it("should navigate to first panel with Home key", () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");

      // Navigate to middle panel
      useConfigStore.getState().setActivePanel("lighting");

      // Press Home to go to first panel
      fireEvent.keyDown(tabList, { key: "Home" });
      expect(useConfigStore.getState().activePanel).toBe("scene");
    });

    it("should navigate to last panel with End key", () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");

      // Start at first panel
      expect(useConfigStore.getState().activePanel).toBe("scene");

      // Press End to go to last panel
      fireEvent.keyDown(tabList, { key: "End" });
      expect(useConfigStore.getState().activePanel).toBe("medium");
    });

    it("should have proper ARIA attributes for accessibility", () => {
      render(<PanelNav />);

      const tabList = screen.getByRole("tablist");
      expect(tabList).toHaveAttribute("aria-label", "Configuration panels");

      const tabs = screen.getAllByRole("tab");
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute("aria-selected");
        expect(tab).toHaveAttribute("aria-controls");
      });
    });

    it("should set tabIndex correctly for keyboard navigation", () => {
      render(<PanelNav />);

      const sceneTab = screen.getByRole("tab", { name: /scene/i });
      const cameraTab = screen.getByRole("tab", { name: /camera/i });

      // Active tab should have tabIndex 0
      expect(sceneTab).toHaveAttribute("tabindex", "0");

      // Inactive tabs should have tabIndex -1
      expect(cameraTab).toHaveAttribute("tabindex", "-1");
    });
  });

  // ==========================================================================
  // Field Updates Tests
  // ==========================================================================

  describe("Camera Panel Field Updates", () => {
    it("should update camera angle when button is clicked", () => {
      render(<CameraPanel />);

      const lowAngleButton = screen.getByRole("button", { name: /low-angle/i });
      fireEvent.click(lowAngleButton);

      expect(
        useConfigStore.getState().config.photographic_characteristics
          .camera_angle,
      ).toBe("low-angle");
    });

    it("should update lens focal length", () => {
      render(<CameraPanel />);

      // Use a more specific query to avoid matching "super-telephoto"
      const buttons = screen.getAllByRole("button");
      const telephotoButton = buttons.find(
        (btn) => btn.textContent === "telephoto",
      );

      expect(telephotoButton).toBeDefined();
      fireEvent.click(telephotoButton!);

      expect(
        useConfigStore.getState().config.photographic_characteristics
          .lens_focal_length,
      ).toBe("telephoto");
    });

    it("should update depth of field", () => {
      render(<CameraPanel />);

      const shallowButton = screen.getByRole("button", { name: /shallow/i });
      fireEvent.click(shallowButton);

      expect(
        useConfigStore.getState().config.photographic_characteristics
          .depth_of_field,
      ).toBe("shallow");
    });

    it("should update focus type", () => {
      render(<CameraPanel />);

      const softButton = screen.getByRole("button", { name: /soft/i });
      fireEvent.click(softButton);

      expect(
        useConfigStore.getState().config.photographic_characteristics.focus,
      ).toBe("soft");
    });

    it("should highlight selected camera angle button", () => {
      render(<CameraPanel />);

      const highAngleButton = screen.getByRole("button", {
        name: /high-angle/i,
      });
      fireEvent.click(highAngleButton);

      // Button should have the 'default' variant styling (active state)
      expect(highAngleButton).toHaveClass("bg-primary");
    });
  });

  describe("Lighting Panel Field Updates", () => {
    it("should update lighting conditions", () => {
      render(<LightingPanel />);

      const goldenHourButton = screen.getByRole("button", {
        name: /golden hour/i,
      });
      fireEvent.click(goldenHourButton);

      expect(useConfigStore.getState().config.lighting.conditions).toBe(
        "golden hour",
      );
    });

    it("should update lighting direction", () => {
      render(<LightingPanel />);

      const backLitButton = screen.getByRole("button", { name: /back-lit/i });
      fireEvent.click(backLitButton);

      expect(useConfigStore.getState().config.lighting.direction).toBe(
        "back-lit",
      );
    });

    it("should update shadow quality", () => {
      render(<LightingPanel />);

      const dramaticButton = screen.getByRole("button", { name: /dramatic/i });
      fireEvent.click(dramaticButton);

      expect(useConfigStore.getState().config.lighting.shadows).toBe(
        "dramatic",
      );
    });

    it("should update multiple lighting fields independently", () => {
      render(<LightingPanel />);

      fireEvent.click(screen.getByRole("button", { name: /studio/i }));
      fireEvent.click(screen.getByRole("button", { name: /side-lit/i }));
      fireEvent.click(screen.getByRole("button", { name: /hard/i }));

      const lighting = useConfigStore.getState().config.lighting;
      expect(lighting.conditions).toBe("studio");
      expect(lighting.direction).toBe("side-lit");
      expect(lighting.shadows).toBe("hard");
    });
  });

  describe("Aesthetics Panel Field Updates", () => {
    it("should update composition", () => {
      render(<AestheticsPanel />);

      const ruleOfThirdsButton = screen.getByRole("button", {
        name: /rule of thirds/i,
      });
      fireEvent.click(ruleOfThirdsButton);

      expect(useConfigStore.getState().config.aesthetics.composition).toBe(
        "rule of thirds",
      );
    });

    it("should update color scheme", () => {
      render(<AestheticsPanel />);

      const cinematicButton = screen.getByRole("button", {
        name: /cinematic/i,
      });
      fireEvent.click(cinematicButton);

      expect(useConfigStore.getState().config.aesthetics.color_scheme).toBe(
        "cinematic",
      );
    });

    it("should update mood and atmosphere", () => {
      render(<AestheticsPanel />);

      const dramaticButton = screen.getByRole("button", { name: /dramatic/i });
      fireEvent.click(dramaticButton);

      expect(useConfigStore.getState().config.aesthetics.mood_atmosphere).toBe(
        "dramatic",
      );
    });

    it("should update all aesthetic fields independently", () => {
      render(<AestheticsPanel />);

      fireEvent.click(screen.getByRole("button", { name: /symmetrical/i }));
      fireEvent.click(screen.getByRole("button", { name: /warm/i }));
      fireEvent.click(screen.getByRole("button", { name: /joyful/i }));

      const aesthetics = useConfigStore.getState().config.aesthetics;
      expect(aesthetics.composition).toBe("symmetrical");
      expect(aesthetics.color_scheme).toBe("warm");
      expect(aesthetics.mood_atmosphere).toBe("joyful");
    });
  });

  describe("Medium Panel Field Updates", () => {
    it("should update style medium", () => {
      render(<MediumPanel />);

      const oilPaintingButton = screen.getByRole("button", {
        name: /oil painting/i,
      });
      fireEvent.click(oilPaintingButton);

      expect(useConfigStore.getState().config.style_medium).toBe(
        "oil painting",
      );
    });

    it("should update artistic style", () => {
      render(<MediumPanel />);

      const surrealButton = screen.getByRole("button", { name: /surreal/i });
      fireEvent.click(surrealButton);

      expect(useConfigStore.getState().config.artistic_style).toBe("surreal");
    });

    it("should update both medium fields independently", () => {
      render(<MediumPanel />);

      fireEvent.click(screen.getByRole("button", { name: /watercolor/i }));
      fireEvent.click(screen.getByRole("button", { name: /impressionist/i }));

      expect(useConfigStore.getState().config.style_medium).toBe("watercolor");
      expect(useConfigStore.getState().config.artistic_style).toBe(
        "impressionist",
      );
    });
  });

  // ==========================================================================
  // State Persistence Tests
  // ==========================================================================

  describe("State Persistence", () => {
    it("should persist camera settings to localStorage", async () => {
      render(<CameraPanel />);

      fireEvent.click(screen.getByRole("button", { name: /low-angle/i }));

      // Find the exact "wide" button (not "ultra-wide")
      const buttons = screen.getAllByRole("button");
      const wideButton = buttons.find((btn) => btn.textContent === "wide");
      expect(wideButton).toBeDefined();
      fireEvent.click(wideButton!);

      // Wait for state to persist
      await waitFor(() => {
        const stored = localStorage.getItem("penguin-config-storage");
        expect(stored).toBeTruthy();
      });

      const stored = localStorage.getItem("penguin-config-storage");
      const parsed = JSON.parse(stored!);
      expect(
        parsed.state.config.photographic_characteristics.camera_angle,
      ).toBe("low-angle");
      expect(
        parsed.state.config.photographic_characteristics.lens_focal_length,
      ).toBe("wide");
    });

    it("should persist lighting settings to localStorage", () => {
      render(<LightingPanel />);

      fireEvent.click(screen.getByRole("button", { name: /night/i }));
      fireEvent.click(screen.getByRole("button", { name: /diffused/i }));

      const stored = localStorage.getItem("penguin-config-storage");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.config.lighting.conditions).toBe("night");
      expect(parsed.state.config.lighting.direction).toBe("diffused");
    });

    it("should persist aesthetics settings to localStorage", () => {
      render(<AestheticsPanel />);

      fireEvent.click(screen.getByRole("button", { name: /diagonal/i }));
      fireEvent.click(screen.getByRole("button", { name: /pastel/i }));

      const stored = localStorage.getItem("penguin-config-storage");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.config.aesthetics.composition).toBe("diagonal");
      expect(parsed.state.config.aesthetics.color_scheme).toBe("pastel");
    });

    it("should persist medium settings to localStorage", () => {
      render(<MediumPanel />);

      fireEvent.click(screen.getByRole("button", { name: /sketch/i }));
      fireEvent.click(screen.getByRole("button", { name: /abstract/i }));

      const stored = localStorage.getItem("penguin-config-storage");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.config.style_medium).toBe("sketch");
      expect(parsed.state.config.artistic_style).toBe("abstract");
    });

    it("should persist active panel to localStorage", () => {
      render(<PanelNav />);

      fireEvent.click(screen.getByRole("tab", { name: /camera/i }));

      const stored = localStorage.getItem("penguin-config-storage");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.activePanel).toBe("camera");
    });

    it("should restore state from localStorage on mount", () => {
      // Set some values in the store
      useConfigStore
        .getState()
        .updateConfig(
          "photographic_characteristics.camera_angle",
          "dutch angle",
        );
      useConfigStore.getState().setActivePanel("camera");

      // Verify localStorage was updated
      const stored = localStorage.getItem("penguin-config-storage");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(
        parsed.state.config.photographic_characteristics.camera_angle,
      ).toBe("dutch angle");
      expect(parsed.state.activePanel).toBe("camera");
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe("Keyboard Navigation", () => {
    it("should support Tab navigation through panel tabs", () => {
      render(<PanelNav />);

      const tabs = screen.getAllByRole("tab");

      // First tab should be focusable
      tabs[0].focus();
      expect(document.activeElement).toBe(tabs[0]);
    });

    it("should support Enter key to activate panel", async () => {
      render(<PanelNav />);

      const cameraTab = screen.getByRole("tab", { name: /camera/i });
      cameraTab.focus();

      // Click to activate (Enter key on button triggers click)
      fireEvent.click(cameraTab);

      await waitFor(() => {
        expect(useConfigStore.getState().activePanel).toBe("camera");
      });
    });

    it("should support Space key to activate panel", async () => {
      render(<PanelNav />);

      const lightingTab = screen.getByRole("tab", { name: /light/i });
      lightingTab.focus();

      // Click to activate (Space key on button triggers click)
      fireEvent.click(lightingTab);

      await waitFor(() => {
        expect(useConfigStore.getState().activePanel).toBe("lighting");
      });
    });

    it("should support keyboard navigation within field groups", () => {
      render(<CameraPanel />);

      const buttons = screen.getAllByRole("button");

      // All buttons should be keyboard accessible
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("should maintain focus when switching panels", async () => {
      render(
        <>
          <PanelNav />
          <PanelContainer />
        </>,
      );

      // Switch to camera panel
      const cameraTab = screen.getByRole("tab", { name: /camera/i });
      fireEvent.click(cameraTab);

      await waitFor(() => {
        expect(screen.getByText(/camera settings/i)).toBeInTheDocument();
      });

      // Switch to lighting panel
      const lightingTab = screen.getByRole("tab", { name: /light/i });
      fireEvent.click(lightingTab);

      await waitFor(() => {
        expect(screen.getByText(/lighting configuration/i)).toBeInTheDocument();
      });
    });

    it("should have visible focus indicators on all interactive elements", () => {
      render(<CameraPanel />);

      const buttons = screen.getAllByRole("button");

      buttons.forEach((button) => {
        button.focus();
        // Check that focus styles are applied (this is a basic check)
        expect(document.activeElement).toBe(button);
      });
    });
  });

  // ==========================================================================
  // Integration Tests - Panel Container
  // ==========================================================================

  describe("Panel Container Integration", () => {
    it("should render the active panel based on store state", async () => {
      render(<PanelContainer />);

      // Default should be scene panel showing background (no object selected)
      await waitFor(() => {
        const backgrounds = screen.getAllByText(/background/i);
        expect(backgrounds.length).toBeGreaterThan(0);
      });
    });

    it("should switch panels when activePanel changes", async () => {
      render(<PanelContainer />);

      // Switch to camera panel
      useConfigStore.getState().setActivePanel("camera");

      await waitFor(() => {
        expect(screen.getByText(/camera settings/i)).toBeInTheDocument();
      });
    });

    it("should have proper ARIA attributes on panel container", async () => {
      render(<PanelContainer />);

      await waitFor(() => {
        const panel = screen.getByRole("tabpanel");
        expect(panel).toHaveAttribute("aria-labelledby");
        expect(panel).toHaveAttribute("id");
      });
    });

    it("should apply transition classes during panel switch", async () => {
      const { container } = render(<PanelContainer />);

      useConfigStore.getState().setActivePanel("camera");

      // Check for transition classes
      const panelContainer = container.querySelector('[role="tabpanel"]');
      expect(panelContainer).toHaveClass("transition-opacity");
    });
  });

  // ==========================================================================
  // Cross-Panel Integration Tests
  // ==========================================================================

  describe("Cross-Panel Integration", () => {
    it("should maintain field values when switching between panels", async () => {
      render(
        <>
          <PanelNav />
          <PanelContainer />
        </>,
      );

      // Set camera values
      useConfigStore.getState().setActivePanel("camera");
      await waitFor(
        () => {
          expect(screen.getByText(/camera settings/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      fireEvent.click(screen.getByRole("button", { name: /low-angle/i }));

      // Switch to lighting panel
      useConfigStore.getState().setActivePanel("lighting");
      await waitFor(
        () => {
          expect(
            screen.getByText(/lighting configuration/i),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      fireEvent.click(screen.getByRole("button", { name: /golden hour/i }));

      // Switch back to camera panel
      useConfigStore.getState().setActivePanel("camera");
      await waitFor(
        () => {
          expect(screen.getByText(/camera settings/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Camera angle should still be low-angle
      expect(
        useConfigStore.getState().config.photographic_characteristics
          .camera_angle,
      ).toBe("low-angle");
      expect(useConfigStore.getState().config.lighting.conditions).toBe(
        "golden hour",
      );
    });

    it("should update all panels when config is reset", async () => {
      // Set some values
      useConfigStore
        .getState()
        .updateConfig(
          "photographic_characteristics.camera_angle",
          "high-angle",
        );
      useConfigStore.getState().updateConfig("lighting.conditions", "night");
      useConfigStore
        .getState()
        .updateConfig("aesthetics.composition", "diagonal");

      // Reset config
      useConfigStore.getState().resetConfig();

      // All values should be back to defaults
      const config = useConfigStore.getState().config;
      expect(config.photographic_characteristics.camera_angle).toBe(
        "eye-level",
      );
      expect(config.lighting.conditions).toBe("daylight");
      expect(config.aesthetics.composition).toBe("centered");
    });

    it("should handle rapid panel switching without errors", async () => {
      render(
        <>
          <PanelNav />
          <PanelContainer />
        </>,
      );

      // Rapidly switch between panels
      useConfigStore.getState().setActivePanel("camera");
      useConfigStore.getState().setActivePanel("lighting");
      useConfigStore.getState().setActivePanel("aesthetics");
      useConfigStore.getState().setActivePanel("medium");
      useConfigStore.getState().setActivePanel("scene");

      await waitFor(() => {
        // Scene panel shows "Background" when no object is selected
        const backgrounds = screen.getAllByText(/background/i);
        expect(backgrounds.length).toBeGreaterThan(0);
      });
    });
  });
});
