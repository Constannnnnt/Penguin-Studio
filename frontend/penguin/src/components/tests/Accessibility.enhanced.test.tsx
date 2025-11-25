import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectsTab } from '../ObjectsTab';
import { ObjectListItem } from '../ObjectListItem';
import { DraggableMaskOverlay } from '../DraggableMaskOverlay';
import { useSegmentationStore } from '@/store/segmentationStore';
import type { MaskMetadata, SegmentationResponse } from '@/store/segmentationStore';

const mockMask: MaskMetadata = {
  mask_id: 'test-mask-1',
  label: 'Test Object',
  confidence: 0.95,
  bounding_box: { x1: 10, y1: 10, x2: 100, y2: 100 },
  area_pixels: 8100,
  area_percentage: 5.0,
  centroid: [55, 55],
  mask_url: 'http://example.com/mask.png',
  promptTier: 'CORE',
  promptText: 'test object',
};

const mockResults: SegmentationResponse = {
  result_id: 'test-result',
  original_image_url: 'http://example.com/image.png',
  masks: [mockMask],
  processing_time_ms: 1000,
  timestamp: new Date().toISOString(),
};

describe('Accessibility Features', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      maskManipulation: new Map(),
    });
  });

  describe('ObjectsTab Accessibility', () => {
    it('should have role="list" and aria-label', () => {
      useSegmentationStore.setState({ results: mockResults });
      const { container } = render(<ObjectsTab />);
      
      const list = container.querySelector('[role="list"]');
      expect(list).toBeTruthy();
      expect(list?.getAttribute('aria-label')).toBe('Detected objects');
    });

    it('should display empty state message when no objects', () => {
      render(<ObjectsTab />);
      
      expect(screen.getByText(/No objects detected/i)).toBeTruthy();
    });
  });

  describe('ObjectListItem Accessibility', () => {
    it('should have role="listitem" with proper aria attributes', () => {
      const { container } = render(
        <ObjectListItem
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={vi.fn()}
          index={0}
        />
      );
      
      const listItem = container.querySelector('[role="listitem"]');
      expect(listItem).toBeTruthy();
      expect(listItem?.getAttribute('aria-label')).toContain('Object 1');
      expect(listItem?.getAttribute('aria-label')).toContain('Test Object');
      expect(listItem?.getAttribute('aria-label')).toContain('95.0%');
      expect(listItem?.getAttribute('tabindex')).toBe('0');
    });

    it('should have aria-selected when selected', () => {
      const { container } = render(
        <ObjectListItem
          mask={mockMask}
          isSelected={true}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={vi.fn()}
          index={0}
        />
      );
      
      const listItem = container.querySelector('[role="listitem"]');
      expect(listItem?.getAttribute('aria-selected')).toBe('true');
    });

    it('should have aria-expanded when expanded', () => {
      const { container } = render(
        <ObjectListItem
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={vi.fn()}
          index={0}
        />
      );
      
      const listItem = container.querySelector('[role="listitem"]');
      expect(listItem?.getAttribute('aria-expanded')).toBe('false');
      
      const expandButton = screen.getByRole('button', { name: /show more/i });
      fireEvent.click(expandButton);
      
      expect(listItem?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should support keyboard navigation with Enter and Space', () => {
      const onClick = vi.fn();
      const { container } = render(
        <ObjectListItem
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={onClick}
          index={0}
        />
      );
      
      const listItem = container.querySelector('[role="listitem"]') as HTMLElement;
      
      fireEvent.keyDown(listItem, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(listItem, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper alt text for mask thumbnail', () => {
      render(
        <ObjectListItem
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={vi.fn()}
          index={0}
        />
      );
      
      const img = screen.getByAltText('Mask thumbnail for Test Object');
      expect(img).toBeTruthy();
    });

    it('should have aria-label on expand/collapse button', () => {
      render(
        <ObjectListItem
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={vi.fn()}
          index={0}
        />
      );
      
      const expandButton = screen.getByRole('button', { name: /show more details/i });
      expect(expandButton).toBeTruthy();
      
      fireEvent.click(expandButton);
      
      const collapseButton = screen.getByRole('button', { name: /show less details/i });
      expect(collapseButton).toBeTruthy();
    });

    it('should have focus ring styles', () => {
      const { container } = render(
        <ObjectListItem
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          onHover={vi.fn()}
          onHoverEnd={vi.fn()}
          onClick={vi.fn()}
          index={0}
        />
      );
      
      const listItem = container.querySelector('[role="listitem"]') as HTMLElement;
      expect(listItem.className).toContain('focus:outline-none');
      expect(listItem.className).toContain('focus:ring-2');
    });
  });

  describe('DraggableMaskOverlay Accessibility', () => {
    it('should have role="button" with proper aria attributes', () => {
      const { container } = render(
        <DraggableMaskOverlay
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          imageSize={{ width: 800, height: 600 }}
          onClick={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
        />
      );
      
      const overlay = container.querySelector('[role="button"]');
      expect(overlay).toBeTruthy();
      expect(overlay?.getAttribute('aria-label')).toContain('Mask for Test Object');
      expect(overlay?.getAttribute('aria-label')).toContain('click to select');
    });

    it('should update aria-label when selected', () => {
      const { container } = render(
        <DraggableMaskOverlay
          mask={mockMask}
          isSelected={true}
          isHovered={false}
          imageSize={{ width: 800, height: 600 }}
          onClick={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
        />
      );
      
      const overlay = container.querySelector('[role="button"]');
      expect(overlay?.getAttribute('aria-label')).toContain('selected, draggable');
    });

    it('should have aria-grabbed when dragging', () => {
      useSegmentationStore.setState({
        results: mockResults,
        selectedMaskId: mockMask.mask_id,
        maskManipulation: new Map([
          [mockMask.mask_id, {
            maskId: mockMask.mask_id,
            originalBoundingBox: mockMask.bounding_box,
            currentBoundingBox: mockMask.bounding_box,
            transform: {
              position: { x: 0, y: 0 },
              scale: { width: 1, height: 1 },
              imageEdits: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                hue: 0,
                blur: 0,
                exposure: 0,
                vibrance: 0,
              },
            },
            isDragging: true,
            isResizing: false,
            resizeHandle: null,
            isHidden: false,
          }],
        ]),
      });

      const { container } = render(
        <DraggableMaskOverlay
          mask={mockMask}
          isSelected={true}
          isHovered={false}
          imageSize={{ width: 800, height: 600 }}
          onClick={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
        />
      );
      
      const overlay = container.querySelector('[role="button"]');
      expect(overlay?.getAttribute('aria-grabbed')).toBe('true');
    });

    it('should have proper alt text for mask image', () => {
      render(
        <DraggableMaskOverlay
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          imageSize={{ width: 800, height: 600 }}
          onClick={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
        />
      );
      
      const img = screen.getByAltText('Segmentation mask for Test Object');
      expect(img).toBeTruthy();
    });

    it('should have tabindex 0 when selected, -1 when not', () => {
      const { container, rerender } = render(
        <DraggableMaskOverlay
          mask={mockMask}
          isSelected={false}
          isHovered={false}
          imageSize={{ width: 800, height: 600 }}
          onClick={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
        />
      );
      
      let overlay = container.querySelector('[role="button"]');
      expect(overlay?.getAttribute('tabindex')).toBe('-1');
      
      rerender(
        <DraggableMaskOverlay
          mask={mockMask}
          isSelected={true}
          isHovered={false}
          imageSize={{ width: 800, height: 600 }}
          onClick={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
        />
      );
      
      overlay = container.querySelector('[role="button"]');
      expect(overlay?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce when mask is selected', () => {
      useSegmentationStore.setState({ results: mockResults });
      
      const selectMask = useSegmentationStore.getState().selectMask;
      selectMask(mockMask.mask_id);
      
      // Check that announcement element was created
      const announcements = document.querySelectorAll('[role="status"]');
      expect(announcements.length).toBeGreaterThan(0);
    });

    it('should announce when mask is moved', () => {
      useSegmentationStore.setState({
        results: mockResults,
        selectedMaskId: mockMask.mask_id,
        maskManipulation: new Map([
          [mockMask.mask_id, {
            maskId: mockMask.mask_id,
            originalBoundingBox: mockMask.bounding_box,
            currentBoundingBox: mockMask.bounding_box,
            transform: {
              position: { x: 0, y: 0 },
              scale: { width: 1, height: 1 },
              imageEdits: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                hue: 0,
                blur: 0,
                exposure: 0,
                vibrance: 0,
              },
            },
            isDragging: false,
            isResizing: false,
            resizeHandle: null,
            isHidden: false,
          }],
        ]),
      });
      
      const endDragMask = useSegmentationStore.getState().endDragMask;
      endDragMask(mockMask.mask_id, { width: 800, height: 600 });
      
      // Check that announcement element was created
      const announcements = document.querySelectorAll('[role="status"]');
      expect(announcements.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation between list items', () => {
      const mask2: MaskMetadata = {
        ...mockMask,
        mask_id: 'test-mask-2',
        label: 'Test Object 2',
      };
      
      useSegmentationStore.setState({
        results: {
          ...mockResults,
          masks: [mockMask, mask2],
        },
      });
      
      const { container } = render(<ObjectsTab />);
      
      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems.length).toBe(2);
      
      const firstItem = listItems[0] as HTMLElement;
      firstItem.focus();
      
      fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
      
      // Second item should receive focus
      expect(document.activeElement).toBe(listItems[1]);
    });
  });
});
