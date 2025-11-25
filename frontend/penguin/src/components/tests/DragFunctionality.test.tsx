import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DraggableMaskOverlay } from '../DraggableMaskOverlay';
import { useSegmentationStore, type MaskMetadata } from '@/store/segmentationStore';

describe('Drag Functionality', () => {
  const createMockMask = (): MaskMetadata => ({
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
    area_pixels: 10000,
    area_percentage: 2.08,
    centroid: [150, 150],
    mask_url: 'http://example.com/mask.png',
  });

  const mockProps = {
    mask: createMockMask(),
    isSelected: true,
    isHovered: false,
    imageSize: { width: 800, height: 600 },
    onClick: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
  };

  beforeEach(() => {
    const mask = createMockMask();
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { ...mask.bounding_box },
            currentBoundingBox: { ...mask.bounding_box },
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
          },
        ],
      ]),
    });
    vi.clearAllMocks();
  });

  it('sets isDragging flag when drag starts', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;

    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });

    const state = useSegmentationStore.getState();
    const manipState = state.maskManipulation.get('test-mask-1');
    expect(manipState?.isDragging).toBe(true);
  });

  it('updates mask position during drag', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;

    // Start drag
    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });

    // Move mouse
    fireEvent.mouseMove(window, { clientX: 200, clientY: 180 });

    await waitFor(() => {
      const state = useSegmentationStore.getState();
      const manipState = state.maskManipulation.get('test-mask-1');
      
      // Should have moved by delta (50, 30)
      expect(manipState?.currentBoundingBox.x1).toBe(150);
      expect(manipState?.currentBoundingBox.y1).toBe(130);
      expect(manipState?.currentBoundingBox.x2).toBe(250);
      expect(manipState?.currentBoundingBox.y2).toBe(230);
    });
  });

  it('resets isDragging flag when drag ends', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;

    // Start drag
    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });
    
    let state = useSegmentationStore.getState();
    let manipState = state.maskManipulation.get('test-mask-1');
    expect(manipState?.isDragging).toBe(true);

    // End drag
    fireEvent.mouseUp(window);

    await waitFor(() => {
      state = useSegmentationStore.getState();
      manipState = state.maskManipulation.get('test-mask-1');
      expect(manipState?.isDragging).toBe(false);
    });
  });

  it('constrains position to image boundaries', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;

    // Start drag
    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });

    // Try to move beyond right boundary (800px)
    fireEvent.mouseMove(window, { clientX: 900, clientY: 150 });

    await waitFor(() => {
      const state = useSegmentationStore.getState();
      const manipState = state.maskManipulation.get('test-mask-1');
      
      // Should be constrained to image boundary
      // Original width is 100px, so x2 should not exceed 800
      expect(manipState?.currentBoundingBox.x2).toBeLessThanOrEqual(800);
    });
  });

  it('maintains mask dimensions during drag', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;

    const originalWidth = 100; // x2 - x1
    const originalHeight = 100; // y2 - y1

    // Start drag
    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });

    // Move mouse
    fireEvent.mouseMove(window, { clientX: 200, clientY: 180 });

    await waitFor(() => {
      const state = useSegmentationStore.getState();
      const manipState = state.maskManipulation.get('test-mask-1');
      
      const newWidth = manipState!.currentBoundingBox.x2 - manipState!.currentBoundingBox.x1;
      const newHeight = manipState!.currentBoundingBox.y2 - manipState!.currentBoundingBox.y1;
      
      expect(newWidth).toBe(originalWidth);
      expect(newHeight).toBe(originalHeight);
    });
  });

  it('handles multiple drag movements correctly', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;

    // Start drag at (150, 150) - mask is at (100, 100)
    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });

    // First move to (200, 180) - delta from start (+50, +30)
    fireEvent.mouseMove(window, { clientX: 200, clientY: 180 });

    await waitFor(() => {
      const state = useSegmentationStore.getState();
      const manipState = state.maskManipulation.get('test-mask-1');
      // Original (100, 100) + delta (+50, +30) = (150, 130)
      expect(manipState?.currentBoundingBox.x1).toBe(150);
      expect(manipState?.currentBoundingBox.y1).toBe(130);
    });

    // Second move to (250, 200) - delta from start (+100, +50)
    fireEvent.mouseMove(window, { clientX: 250, clientY: 200 });

    await waitFor(() => {
      const state = useSegmentationStore.getState();
      const manipState = state.maskManipulation.get('test-mask-1');
      // Original (100, 100) + total delta from start (+100, +50) = (200, 150)
      expect(manipState?.currentBoundingBox.x1).toBe(200);
      expect(manipState?.currentBoundingBox.y1).toBe(150);
    });
  });

  it('does not start drag when mask is not selected', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} isSelected={false} />);
    const overlay = container.firstChild as HTMLElement;

    fireEvent.mouseDown(overlay, { clientX: 150, clientY: 150 });

    const state = useSegmentationStore.getState();
    const manipState = state.maskManipulation.get('test-mask-1');
    expect(manipState?.isDragging).toBe(false);
    expect(mockProps.onClick).toHaveBeenCalled();
  });
});
