import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraggableMaskOverlay } from '@/features/segmentation/components/DraggableMaskOverlay';
import { useSegmentationStore, type MaskMetadata } from '@/features/segmentation/store/segmentationStore';

describe('DraggableMaskOverlay', () => {
  const createMockMask = (): MaskMetadata => ({
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 10, y1: 20, x2: 100, y2: 200 },
    area_pixels: 16200,
    area_percentage: 5.5,
    centroid: [55, 110],
    mask_url: 'http://example.com/mask.png',
  });

  const mockProps = {
    mask: createMockMask(),
    isSelected: false,
    isHovered: false,
    imageSize: { width: 800, height: 600 },
    onClick: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
  };

  beforeEach(() => {
    useSegmentationStore.setState({
      maskManipulation: new Map(),
    });
    vi.clearAllMocks();
  });

  it('renders mask overlay with correct aria-label', () => {
    render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = screen.getByLabelText('Mask for Test Object, click to select');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('role', 'button');
  });

  it('applies correct opacity when not selected or hovered', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: '0.4' });
  });

  it('applies correct opacity when hovered', () => {
    const { container } = render(
      <DraggableMaskOverlay {...mockProps} isHovered={true} />
    );
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: '0.6' });
  });

  it('applies correct opacity when selected', () => {
    const { container } = render(
      <DraggableMaskOverlay {...mockProps} isSelected={true} />
    );
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: '0.7' });
  });

  it('applies correct cursor when not selected', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ cursor: 'pointer' });
  });

  it('applies correct cursor when selected', () => {
    const { container } = render(
      <DraggableMaskOverlay {...mockProps} isSelected={true} />
    );
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ cursor: 'grab' });
  });

  it('calls onClick when clicked and not selected', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    fireEvent.mouseDown(overlay);
    expect(mockProps.onClick).toHaveBeenCalled();
  });

  it('calls onMouseEnter when mouse enters', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(overlay);
    expect(mockProps.onMouseEnter).toHaveBeenCalled();
  });

  it('calls onMouseLeave when mouse leaves', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    fireEvent.mouseLeave(overlay);
    expect(mockProps.onMouseLeave).toHaveBeenCalled();
  });

  it('positions overlay based on bounding box', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({
      left: '10px',
      top: '20px',
      width: '90px',
      height: '180px',
    });
  });

  it('uses current bounding box from manipulation state when available', () => {
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 50, y1: 60, x2: 140, y2: 240 },
            transform: {
              position: { x: 40, y: 40 },
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

    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({
      left: '50px',
      top: '60px',
      width: '90px',
      height: '180px',
    });
  });

  it('applies reduced opacity when dragging', () => {
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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
          },
        ],
      ]),
    });

    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: '0.5' });
  });

  it('applies grabbing cursor when dragging', () => {
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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
          },
        ],
      ]),
    });

    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ cursor: 'grabbing' });
  });

  it('applies higher opacity when selected', () => {
    const { container } = render(
      <DraggableMaskOverlay {...mockProps} isSelected={true} />
    );
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: '0.7' });
  });

  it('applies default opacity when not selected', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: '0.4' });
  });

  it('does not show original position indicator when mask has not moved', () => {
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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

    render(<DraggableMaskOverlay {...mockProps} />);
    const indicator = screen.queryByTestId('original-position-indicator');
    expect(indicator).not.toBeInTheDocument();
  });

  it('shows mask at moved position when manipulation state exists', () => {
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 50, y1: 60, x2: 140, y2: 240 },
            transform: {
              position: { x: 40, y: 40 },
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

    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({
      left: '50px',
      top: '60px',
      width: '90px',
      height: '180px',
    });
  });





  describe('Resize visual feedback', () => {
    it('applies resize cursor when resizing', () => {
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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
              isResizing: true,
              resizeHandle: 'se',
              isHidden: false,
            },
          ],
        ]),
      });

      const { container } = render(<DraggableMaskOverlay {...mockProps} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ cursor: 'se-resize' });
    });

    it('applies correct resize cursor for each handle', () => {
      const handles: Array<'nw' | 'ne' | 'sw' | 'se'> = ['nw', 'ne', 'sw', 'se'];
      
      handles.forEach(handle => {
        useSegmentationStore.setState({
          maskManipulation: new Map([
            [
              'test-mask-1',
              {
                maskId: 'test-mask-1',
                originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
                currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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
                isResizing: true,
                resizeHandle: handle,
                isHidden: false,
              },
            ],
          ]),
        });

        const { container } = render(<DraggableMaskOverlay {...mockProps} />);
        const overlay = container.firstChild as HTMLElement;
        expect(overlay).toHaveStyle({ cursor: `${handle}-resize` });
      });
    });

    it('shows resize cursor when resizing', () => {
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 120, y2: 220 },
              transform: {
                position: { x: 0, y: 0 },
                scale: { width: 1.2, height: 1.1 },
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
              isResizing: true,
              resizeHandle: 'se',
              isHidden: false,
            },
          ],
        ]),
      });

      const { container } = render(<DraggableMaskOverlay {...mockProps} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ cursor: 'se-resize' });
    });

    it('does not show dashed outline when not resizing', () => {
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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

      const { container } = render(<DraggableMaskOverlay {...mockProps} />);
      const preview = container.querySelector('[style*="dashed"]');
      expect(preview).not.toBeInTheDocument();
    });

    it('restores cursor after resize completes', () => {
      const { container, rerender } = render(<DraggableMaskOverlay {...mockProps} isSelected={true} />);
      
      // Start resizing
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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
              isResizing: true,
              resizeHandle: 'se',
              isHidden: false,
            },
          ],
        ]),
      });
      
      rerender(<DraggableMaskOverlay {...mockProps} isSelected={true} />);
      let overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ cursor: 'se-resize' });
      
      // End resizing
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 120, y2: 220 },
              transform: {
                position: { x: 0, y: 0 },
                scale: { width: 1.2, height: 1.1 },
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
      
      rerender(<DraggableMaskOverlay {...mockProps} isSelected={true} />);
      overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ cursor: 'grab' });
    });
  });

  describe('Per-mask image edits', () => {
    it('applies CSS filters when mask has image edits', () => {
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              transform: {
                position: { x: 0, y: 0 },
                scale: { width: 1, height: 1 },
                imageEdits: {
                  brightness: 20,
                  contrast: 10,
                  saturation: 15,
                  hue: 30,
                  blur: 2,
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

      const { container } = render(<DraggableMaskOverlay {...mockProps} />);
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.getAttribute('style');
      
      expect(style).toContain('brightness(120%)');
      expect(style).toContain('contrast(110%)');
      expect(style).toContain('saturate(115%)');
      expect(style).toContain('hue-rotate(30deg)');
      expect(style).toContain('blur(2px)');
    });

    it('does not apply filters when mask has no image edits', () => {
      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
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

      const { container } = render(<DraggableMaskOverlay {...mockProps} />);
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.getAttribute('style');
      
      expect(style).not.toContain('brightness');
      expect(style).not.toContain('contrast');
      expect(style).not.toContain('saturate');
      expect(style).not.toContain('hue-rotate');
      expect(style).not.toContain('blur');
    });

    it('preserves image edits when mask is deselected', () => {
      const manipState = {
        maskId: 'test-mask-1',
        originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
        currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
        transform: {
          position: { x: 0, y: 0 },
          scale: { width: 1, height: 1 },
          imageEdits: {
            brightness: 25,
            contrast: 15,
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
      };

      useSegmentationStore.setState({
        maskManipulation: new Map([['test-mask-1', manipState]]),
      });

      const { container, rerender } = render(
        <DraggableMaskOverlay {...mockProps} isSelected={true} />
      );
      
      let overlay = container.firstChild as HTMLElement;
      let style = overlay.getAttribute('style');
      expect(style).toContain('brightness(125%)');
      expect(style).toContain('contrast(115%)');

      rerender(<DraggableMaskOverlay {...mockProps} isSelected={false} />);
      
      overlay = container.firstChild as HTMLElement;
      style = overlay.getAttribute('style');
      expect(style).toContain('brightness(125%)');
      expect(style).toContain('contrast(115%)');
    });

    it('applies different filters to different masks', () => {
      const mask1 = createMockMask();
      const mask2 = { ...createMockMask(), mask_id: 'test-mask-2', label: 'Test Object 2' };

      useSegmentationStore.setState({
        maskManipulation: new Map([
          [
            'test-mask-1',
            {
              maskId: 'test-mask-1',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              transform: {
                position: { x: 0, y: 0 },
                scale: { width: 1, height: 1 },
                imageEdits: {
                  brightness: 20,
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
          [
            'test-mask-2',
            {
              maskId: 'test-mask-2',
              originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              currentBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
              transform: {
                position: { x: 0, y: 0 },
                scale: { width: 1, height: 1 },
                imageEdits: {
                  brightness: 0,
                  contrast: 30,
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

      const { container: container1 } = render(
        <DraggableMaskOverlay {...mockProps} mask={mask1} />
      );
      const overlay1 = container1.firstChild as HTMLElement;
      const style1 = overlay1.getAttribute('style');
      expect(style1).toContain('brightness(120%)');
      expect(style1).not.toContain('contrast');

      const { container: container2 } = render(
        <DraggableMaskOverlay {...mockProps} mask={mask2} />
      );
      const overlay2 = container2.firstChild as HTMLElement;
      const style2 = overlay2.getAttribute('style');
      expect(style2).not.toContain('brightness');
      expect(style2).toContain('contrast(130%)');
    });
  });
});
