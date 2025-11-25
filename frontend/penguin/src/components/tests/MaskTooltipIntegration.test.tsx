import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DraggableMaskOverlay } from '../DraggableMaskOverlay';
import { useSegmentationStore, type MaskMetadata } from '@/store/segmentationStore';

describe('MaskTooltip Integration with DraggableMaskOverlay', () => {
  const createMockMask = (): MaskMetadata => ({
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 10, y1: 20, x2: 100, y2: 200 },
    area_pixels: 16200,
    area_percentage: 5.5,
    centroid: [55, 110],
    mask_url: 'http://example.com/mask.png',
    promptText: 'A test object in the scene',
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

  it('shows tooltip when mouse enters mask overlay', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  it('displays prompt text in tooltip', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('A test object in the scene');
    });
  });

  it('falls back to label when promptText is not available', async () => {
    const maskWithoutPrompt = { ...createMockMask(), promptText: undefined };
    const { container } = render(
      <DraggableMaskOverlay {...mockProps} mask={maskWithoutPrompt} />
    );
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Test Object');
    });
  });

  it('hides tooltip after mouse leaves with delay', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
    
    fireEvent.mouseLeave(overlay);
    
    // Wait for the 200ms delay
    await new Promise(resolve => setTimeout(resolve, 250));
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('updates tooltip position on mouse move', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay, { clientX: 100, clientY: 100 });
    
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    
    fireEvent.mouseMove(overlay, { clientX: 150, clientY: 150 });
    
    const style = tooltip.getAttribute('style');
    expect(style).toContain('left');
    expect(style).toContain('top');
  });

  it('calls onMouseEnter callback when mouse enters', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    expect(mockProps.onMouseEnter).toHaveBeenCalled();
  });

  it('calls onMouseLeave callback when mouse leaves', () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseLeave(overlay);
    
    expect(mockProps.onMouseLeave).toHaveBeenCalled();
  });

  it('tooltip has high z-index to appear above other overlays', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveClass('z-[9999]');
  });

  it('tooltip is not interactive (pointer-events-none)', async () => {
    const { container } = render(<DraggableMaskOverlay {...mockProps} />);
    const overlay = container.firstChild as HTMLElement;
    
    fireEvent.mouseEnter(overlay);
    
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveClass('pointer-events-none');
  });
});
