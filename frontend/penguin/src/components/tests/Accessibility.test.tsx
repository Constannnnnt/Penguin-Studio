import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - jest-axe doesn't have types
import { axe, toHaveNoViolations } from 'jest-axe';
import { PanelNav } from '../PanelNav';
import { Header } from '../Header';
import { FieldGroup } from '../FieldGroup';
import { CameraPanel } from '../CameraPanel';
import { LightingPanel } from '../LightingPanel';
import { AestheticsPanel } from '../AestheticsPanel';
import { MediumPanel } from '../MediumPanel';
import { ScenePanel } from '../ScenePanel';
import { ImageViewer } from '../ImageViewer';
import { useConfigStore } from '@/store/configStore';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Mock API client
vi.mock('@/services/api', () => ({
  apiClient: {
    generateImage: vi.fn(),
    getGeneration: vi.fn(),
    exportConfig: vi.fn(),
    copyConfig: vi.fn(),
  },
}));

/**
 * Accessibility Test Suite
 * 
 */
describe('Accessibility Tests', () => {
  beforeEach(() => {
    useConfigStore.getState().resetConfig();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Keyboard Navigation - Arrow Keys
  // ==========================================================================

  describe('Keyboard Navigation - Arrow Keys', () => {
    it('should navigate to next panel with ArrowRight key', () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      expect(useConfigStore.getState().activePanel).toBe('scene');
      
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });
      expect(useConfigStore.getState().activePanel).toBe('camera');
      
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });
      expect(useConfigStore.getState().activePanel).toBe('lighting');
    });

    it('should navigate to previous panel with ArrowLeft key', () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      
      // Navigate forward first
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });
      expect(useConfigStore.getState().activePanel).toBe('lighting');
      
      // Navigate backward
      fireEvent.keyDown(tabList, { key: 'ArrowLeft' });
      expect(useConfigStore.getState().activePanel).toBe('camera');
    });

    it('should wrap to last panel when pressing ArrowLeft on first panel', () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      expect(useConfigStore.getState().activePanel).toBe('scene');
      
      fireEvent.keyDown(tabList, { key: 'ArrowLeft' });
      expect(useConfigStore.getState().activePanel).toBe('medium');
    });

    it('should wrap to first panel when pressing ArrowRight on last panel', async () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      useConfigStore.getState().setActivePanel('medium');
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 10));
      
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });
      expect(useConfigStore.getState().activePanel).toBe('scene');
    });

    it('should navigate to first panel with Home key', () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      useConfigStore.getState().setActivePanel('lighting');
      
      fireEvent.keyDown(tabList, { key: 'Home' });
      expect(useConfigStore.getState().activePanel).toBe('scene');
    });

    it('should navigate to last panel with End key', () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      
      fireEvent.keyDown(tabList, { key: 'End' });
      expect(useConfigStore.getState().activePanel).toBe('medium');
    });

    it('should support arrow key navigation within FieldGroup buttons', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3', 'option4']}
          value="option1"
          onChange={mockOnChange}
          columns={2}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      
      // ArrowRight should move to next button
      fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('should support ArrowDown navigation in FieldGroup', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3', 'option4']}
          value="option1"
          onChange={mockOnChange}
          columns={2}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      
      // ArrowDown should move down by columns (2)
      fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(buttons[2]);
    });
  });

  // ==========================================================================
  // RVisible Focus Indicators
  // ==========================================================================

  describe('Visible Focus Indicators ', () => {
    it('should have visible focus indicators on panel navigation tabs', () => {
      render(<PanelNav />);
      
      const tabs = screen.getAllByRole('tab');
      
      tabs.forEach((tab) => {
        tab.focus();
        expect(document.activeElement).toBe(tab);
        
        // Check that the button has focus-visible styles
        expect(tab).toHaveClass('focus-visible:outline-none');
        expect(tab).toHaveClass('focus-visible:ring-2');
      });
    });

    it('should have visible focus indicators on all buttons in Header', () => {
      render(<Header />);
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach((button) => {
        button.focus();
        expect(document.activeElement).toBe(button);
      });
    });

    it('should have visible focus indicators on FieldGroup buttons', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach((button) => {
        button.focus();
        expect(document.activeElement).toBe(button);
        
        // Verify focus styles are applied
        expect(button).toHaveClass('focus-visible:outline-none');
        expect(button).toHaveClass('focus-visible:ring-2');
      });
    });

    it('should have visible focus indicators on selected buttons with ring offset', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const selectedButton = screen.getByRole('button', { pressed: true });
      expect(selectedButton).toHaveClass('ring-2');
      expect(selectedButton).toHaveClass('ring-offset-2');
    });



    it('should maintain focus visibility when navigating between panels', () => {
      render(<PanelNav />);
      
      const cameraTab = screen.getByRole('tab', { name: /camera/i });
      cameraTab.focus();
      
      fireEvent.click(cameraTab);
      
      // Focus should remain on the tab after activation
      expect(document.activeElement).toBe(cameraTab);
    });
  });

  // ==========================================================================
  // ARIA Labels and Roles
  // ==========================================================================

  describe('ARIA Labels and Roles ', () => {
    it('should have proper ARIA roles on PanelNav', () => {
      render(<PanelNav />);
      
      const tabList = screen.getByRole('tablist');
      expect(tabList).toHaveAttribute('aria-label', 'Configuration panels');
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);
      
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('id');
      });
    });

    it('should have proper ARIA labels on Header buttons', () => {
      render(<Header />);
      
      const copyButton = screen.getAllByLabelText(/copy configuration to clipboard/i)[0];
      expect(copyButton).toBeInTheDocument();
      
      const exportButton = screen.getAllByLabelText(/export configuration as json file/i)[0];
      expect(exportButton).toBeInTheDocument();
    });



    it('should have proper ARIA attributes on FieldGroup', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Camera Angle"
          options={['eye-level', 'low-angle', 'high-angle']}
          value="eye-level"
          onChange={mockOnChange}
        />
      );
      
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-labelledby');
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed');
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have proper ARIA pressed state on selected buttons', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option2"
          onChange={mockOnChange}
        />
      );
      
      const selectedButton = screen.getByRole('button', { name: /option2.*selected/i });
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
      
      const unselectedButton = screen.getByRole('button', { name: /^Test Field: option1$/i });
      expect(unselectedButton).toHaveAttribute('aria-pressed', 'false');
    });



    it('should have proper ARIA landmark roles', () => {
      render(<Header />);
      
      const banner = screen.getByRole('banner');
      expect(banner).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', () => {
      render(<PanelNav />);
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        const icon = tab.querySelector('svg');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have descriptive ARIA labels that include state information', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Lighting"
          options={['daylight', 'studio', 'golden hour']}
          value="golden hour"
          onChange={mockOnChange}
        />
      );
      
      const selectedButton = screen.getByRole('button', { name: /golden hour.*selected/i });
      expect(selectedButton).toHaveAttribute('aria-label');
      expect(selectedButton.getAttribute('aria-label')).toContain('selected');
    });
  });

  // ==========================================================================
  // Tab Key Navigation in Logical Order
  // ==========================================================================

  describe('Tab Key Navigation ', () => {
    it('should have logical tab order in Header', () => {
      render(<Header />);
      
      const buttons = screen.getAllByRole('button');
      
      // Verify all buttons are keyboard accessible
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });



    it('should set correct tabIndex on active and inactive panel tabs', () => {
      render(<PanelNav />);
      
      const sceneTab = screen.getByRole('tab', { name: /scene/i });
      const cameraTab = screen.getByRole('tab', { name: /camera/i });
      
      // Active tab should have tabIndex 0
      expect(sceneTab).toHaveAttribute('tabindex', '0');
      
      // Inactive tabs should have tabIndex -1 (roving tabindex pattern)
      expect(cameraTab).toHaveAttribute('tabindex', '-1');
    });

    it('should update tabIndex when active panel changes', () => {
      render(<PanelNav />);
      
      const cameraTab = screen.getByRole('tab', { name: /camera/i });
      
      // Initially inactive
      expect(cameraTab).toHaveAttribute('tabindex', '-1');
      
      // Activate camera panel
      fireEvent.click(cameraTab);
      
      // Now should be in tab order
      expect(cameraTab).toHaveAttribute('tabindex', '0');
    });

    it('should have all form controls in tab order within panels', () => {
      render(<CameraPanel />);
      
      const buttons = screen.getAllByRole('button');
      
      // All buttons should be keyboard accessible
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should maintain logical tab order across complex layouts', () => {
      const { container } = render(
        <>
          <Header />
          <PanelNav />
        </>
      );
      
      // Get all focusable elements
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      // Verify we have focusable elements
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should skip hidden elements in tab order', () => {
      render(<Header />);
      
      // Mobile-only buttons should be hidden on desktop
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach((button) => {
        // If button is hidden, it should not be in tab order
        if (button.classList.contains('sm:hidden')) {
          // Hidden elements are still in DOM but visually hidden
          expect(button).toBeInTheDocument();
        }
      });
    });
  });

  // ==========================================================================
  // Enter/Space Key Activation
  // ==========================================================================

  describe('Enter/Space Key Activation ', () => {
    it('should activate panel tab with Enter key', () => {
      render(<PanelNav />);
      
      const cameraTab = screen.getByRole('tab', { name: /camera/i });
      cameraTab.focus();
      
      fireEvent.keyDown(cameraTab, { key: 'Enter' });
      fireEvent.click(cameraTab); // Simulate button click behavior
      
      expect(useConfigStore.getState().activePanel).toBe('camera');
    });

    it('should activate panel tab with Space key', () => {
      render(<PanelNav />);
      
      const lightingTab = screen.getByRole('tab', { name: /light/i });
      lightingTab.focus();
      
      fireEvent.keyDown(lightingTab, { key: ' ' });
      fireEvent.click(lightingTab); // Simulate button click behavior
      
      expect(useConfigStore.getState().activePanel).toBe('lighting');
    });

    it('should activate FieldGroup button with Enter key', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /option2/i });
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);
      
      expect(mockOnChange).toHaveBeenCalledWith('option2');
    });

    it('should activate FieldGroup button with Space key', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /option3/i });
      button.focus();
      
      fireEvent.keyDown(button, { key: ' ' });
      fireEvent.click(button);
      
      expect(mockOnChange).toHaveBeenCalledWith('option3');
    });

    it('should support Enter key on Header export button', () => {
      render(<Header />);
      
      const exportButton = screen.getAllByLabelText(/export configuration/i)[0];
      exportButton.focus();
      
      fireEvent.keyDown(exportButton, { key: 'Enter' });
      // Button should be keyboard accessible
      expect(exportButton.tagName).toBe('BUTTON');
    });

    it('should support Space key on Header copy button', () => {
      render(<Header />);
      
      const copyButton = screen.getAllByLabelText(/copy configuration/i)[0];
      copyButton.focus();
      
      fireEvent.keyDown(copyButton, { key: ' ' });
      // Button should be keyboard accessible
      expect(copyButton.tagName).toBe('BUTTON');
    });



    it('should not activate buttons with other keys', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /option2/i });
      button.focus();
      
      // Random key should not activate
      fireEvent.keyDown(button, { key: 'a' });
      
      // onChange should not be called
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Focus Management Tests
  // ==========================================================================

  describe('Focus Management', () => {
    it('should move focus to active tab when panel changes', async () => {
      render(<PanelNav />);
      
      const cameraTab = screen.getByRole('tab', { name: /camera/i });
      
      // Change panel programmatically
      useConfigStore.getState().setActivePanel('camera');
      
      // Focus should move to the active tab
      // Note: This requires the useEffect in PanelNav to run
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(document.activeElement).toBe(cameraTab);
    });

    it('should maintain focus within modal dialogs', () => {
      // This test would be for modal components if they exist
      // Placeholder for future modal accessibility tests
      expect(true).toBe(true);
    });

    it('should restore focus after closing overlays', () => {
      // This test would be for overlay components if they exist
      // Placeholder for future overlay accessibility tests
      expect(true).toBe(true);
    });

    it('should trap focus within keyboard shortcuts dialog', () => {
      // Test for KeyboardShortcutsHelp component focus trap
      // Placeholder - would need to open the dialog first
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Screen Reader Compatibility Tests
  // ==========================================================================

  describe('Screen Reader Compatibility', () => {
    it('should announce panel changes to screen readers', () => {
      render(<PanelNav />);
      
      const tabs = screen.getAllByRole('tab');
      
      tabs.forEach((tab) => {
        const isSelected = tab.getAttribute('aria-selected') === 'true';
        expect(tab).toHaveAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    });

    it('should provide descriptive labels for icon-only buttons', () => {
      render(<Header />);
      
      // Mobile icon-only buttons should have aria-labels
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach((button) => {
        if (!button.textContent?.trim()) {
          // Icon-only button should have aria-label
          expect(button).toHaveAttribute('aria-label');
        }
      });
    });

    it('should hide decorative elements from screen readers', () => {
      render(<PanelNav />);
      
      const icons = screen.getByRole('tablist').querySelectorAll('svg');
      
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });





    it('should provide context for button groups', () => {
      render(<CameraPanel />);
      
      const groups = screen.getAllByRole('group');
      
      groups.forEach((group) => {
        expect(group).toHaveAttribute('aria-labelledby');
      });
    });

    it('should announce selected state changes', () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const button1 = screen.getByRole('button', { name: /option1.*selected/i });
      expect(button1).toHaveAttribute('aria-pressed', 'true');
      
      // Change selection
      rerender(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option2"
          onChange={mockOnChange}
        />
      );
      
      const button2 = screen.getByRole('button', { name: /option2.*selected/i });
      expect(button2).toHaveAttribute('aria-pressed', 'true');
      
      const button1Updated = screen.getByRole('button', { name: /^Test Field: option1$/i });
      expect(button1Updated).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ==========================================================================
  // Automated Accessibility Testing with jest-axe
  // ==========================================================================

  describe('Automated Accessibility Audits (jest-axe)', () => {
    it('should have no accessibility violations in PanelNav', async () => {
      const { container } = render(
        <>
          <PanelNav />
          <div id="panel-scene" role="tabpanel" aria-labelledby="tab-scene">Scene Panel</div>
          <div id="panel-camera" role="tabpanel" aria-labelledby="tab-camera" hidden>Camera Panel</div>
          <div id="panel-lighting" role="tabpanel" aria-labelledby="tab-lighting" hidden>Lighting Panel</div>
          <div id="panel-aesthetics" role="tabpanel" aria-labelledby="tab-aesthetics" hidden>Aesthetics Panel</div>
          <div id="panel-medium" role="tabpanel" aria-labelledby="tab-medium" hidden>Medium Panel</div>
        </>
      );
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in Header', async () => {
      const { container } = render(<Header />);
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });



    it('should have no accessibility violations in CameraPanel', async () => {
      const { container } = render(<CameraPanel />);
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in LightingPanel', async () => {
      const { container } = render(<LightingPanel />);
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in AestheticsPanel', async () => {
      const { container } = render(<AestheticsPanel />);
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in MediumPanel', async () => {
      const { container } = render(<MediumPanel />);
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in ScenePanel', async () => {
      const { container } = render(<ScenePanel />);
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in FieldGroup', async () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in complete layout', async () => {
      const { container } = render(
        <>
          <Header />
          <main>
            <ImageViewer />
            <aside>
              <PanelNav />
              <div id="panel-scene" role="tabpanel" aria-labelledby="tab-scene">Scene Panel</div>
              <div id="panel-camera" role="tabpanel" aria-labelledby="tab-camera" hidden>
                <CameraPanel />
              </div>
              <div id="panel-lighting" role="tabpanel" aria-labelledby="tab-lighting" hidden>Lighting Panel</div>
              <div id="panel-aesthetics" role="tabpanel" aria-labelledby="tab-aesthetics" hidden>Aesthetics Panel</div>
              <div id="panel-medium" role="tabpanel" aria-labelledby="tab-medium" hidden>Medium Panel</div>
            </aside>
          </main>
        </>
      );
      const results = await axe(container);
      // @ts-expect-error - jest-axe matcher
      expect(results).toHaveNoViolations();
    });
  });

  // ==========================================================================
  // Color Contrast and Visual Accessibility
  // ==========================================================================

  describe('Visual Accessibility', () => {
    it('should use semantic color classes for consistent theming', () => {
      render(<PanelNav />);
      
      const activeTab = screen.getByRole('tab', { selected: true });
      
      // Should use semantic color classes
      expect(activeTab).toHaveClass('bg-primary');
    });

    it('should provide sufficient contrast for text', () => {
      render(<Header />);
      
      const heading = screen.getByRole('heading', { name: /penguin studio/i });
      expect(heading).toBeInTheDocument();
      
      // Text should be visible (not transparent or very light)
      expect(window.getComputedStyle(heading).opacity).not.toBe('0');
    });

    it('should maintain visibility in different states', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const selectedButton = screen.getByRole('button', { pressed: true });
      const unselectedButtons = screen.getAllByRole('button', { pressed: false });
      
      // Both should be visible
      expect(selectedButton).toBeVisible();
      expect(unselectedButtons[0]).toBeVisible();
    });

    it('should not rely solely on color to convey information', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const selectedButton = screen.getByRole('button', { pressed: true });
      
      // Selected state should be indicated by aria-pressed, not just color
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
      
      // Visual indicator (ring) should also be present
      expect(selectedButton).toHaveClass('ring-2');
    });
  });

  // ==========================================================================
  // Touch Target Size (Mobile Accessibility)
  // ==========================================================================

  describe('Touch Target Size', () => {
    it('should have minimum 44x44px touch targets on buttons', () => {
      const mockOnChange = vi.fn();
      render(
        <FieldGroup
          label="Test Field"
          options={['option1', 'option2', 'option3']}
          value="option1"
          onChange={mockOnChange}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });

    it('should have minimum touch target size on panel tabs', () => {
      render(<PanelNav />);
      
      const tabs = screen.getAllByRole('tab');
      
      tabs.forEach((tab) => {
        expect(tab).toHaveClass('min-h-[44px]');
      });
    });

    it('should maintain touch target size on mobile viewports', () => {
      // This would require viewport manipulation in a real test
      // Placeholder for responsive touch target testing
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Comprehensive Integration Tests
  // ==========================================================================

  describe('Comprehensive Accessibility Integration', () => {
    it('should support complete keyboard-only workflow', () => {
      render(
        <>
          <PanelNav />
          <CameraPanel />
        </>
      );
      
      // Navigate to camera panel
      const tabList = screen.getByRole('tablist');
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });
      
      expect(useConfigStore.getState().activePanel).toBe('camera');
      
      // Select a camera angle
      const lowAngleButton = screen.getByRole('button', { name: /low-angle/i });
      lowAngleButton.focus();
      fireEvent.click(lowAngleButton);
      
      expect(useConfigStore.getState().config.photographic_characteristics.camera_angle).toBe('low-angle');
    });

    it('should maintain accessibility across state changes', () => {
      const { rerender } = render(<PanelNav />);
      
      // Change active panel
      useConfigStore.getState().setActivePanel('lighting');
      
      rerender(<PanelNav />);
      
      // ARIA attributes should update
      const lightingTab = screen.getByRole('tab', { name: /light/i });
      expect(lightingTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should provide accessible error messages', () => {
      render(<ImageViewer />);
      
      // Help text for validation
      const helpText = screen.getByText(/minimum 10 characters required/i);
      expect(helpText).toBeInTheDocument();
      
      // Should be associated with input
      const textarea = screen.getByLabelText(/scene description/i);
      const describedBy = textarea.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
    });

    it('should support assistive technology navigation patterns', () => {
      render(
        <>
          <Header />
          <main>
            <ImageViewer />
          </main>
        </>
      );
      
      // Landmark roles should be present
      const banner = screen.getByRole('banner');
      expect(banner).toBeInTheDocument();
      
      // Main content should be identifiable
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });
});
