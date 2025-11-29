import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoundingBoxSection } from '../BoundingBoxSection';
import { useSegmentationStore, type MaskMetadata } from '@/features/segmentation/store/segmentationStore';

describe('BoundingBoxSection', () => {
  const createMockMask = (): MaskMetadata => ({
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 10.7, y1: 20.3, x2: 100.9, y2: 200.1 },
    area_pixels: 16200,
    area_percentage: 5.5,
    centroid: [55.4, 110.8],
    mask_url: 'http://example.com/mask.png',
  });

  beforeEach(() => {
    useSegmentationStore.setState({
      maskManipulation: new Map(),
    });
  });

  it('displays bounding box coordinates formatted as integers when expanded', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText('Spatial Information')).toBeInTheDocument();
    expect(screen.getByText('X1:')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('Y1:')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('X2:')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('Y2:')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('displays centroid coordinates formatted as integers when expanded', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText(/Centroid:/)).toBeInTheDocument();
    expect(screen.getByText(/\(55, 111\)/)).toBeInTheDocument();
  });

  it('displays area in pixels and percentage when expanded', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText(/Area:/)).toBeInTheDocument();
    expect(screen.getByText(/16,200 px \(5\.50%\)/)).toBeInTheDocument();
  });

  it('uses current bounding box from manipulation state when available', () => {
    const mask = createMockMask();
    
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 50.2, y1: 60.8, x2: 140.3, y2: 240.9 },
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

    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('61')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('241')).toBeInTheDocument();
  });

  it('displays area from mask metadata regardless of current bounding box', () => {
    const mask = createMockMask();
    
    useSegmentationStore.setState({
      maskManipulation: new Map([
        [
          'test-mask-1',
          {
            maskId: 'test-mask-1',
            originalBoundingBox: { x1: 10, y1: 20, x2: 100, y2: 200 },
            currentBoundingBox: { x1: 50, y1: 60, x2: 150, y2: 160 },
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

    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText(/16,200 px/)).toBeInTheDocument();
  });

  it('displays all spatial information fields when expanded', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText('Spatial Information')).toBeInTheDocument();
    expect(screen.getByText('X1:')).toBeInTheDocument();
    expect(screen.getByText('Y1:')).toBeInTheDocument();
    expect(screen.getByText('X2:')).toBeInTheDocument();
    expect(screen.getByText('Y2:')).toBeInTheDocument();
    expect(screen.getByText(/Centroid:/)).toBeInTheDocument();
    expect(screen.getByText(/Area:/)).toBeInTheDocument();
  });

  it('is collapsed by default', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} />);

    expect(screen.getByText('Spatial Information')).toBeInTheDocument();
    expect(screen.queryByText('X1:')).not.toBeInTheDocument();
    expect(screen.queryByText('Y1:')).not.toBeInTheDocument();
  });

  it('can be expanded by clicking the toggle button', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} />);

    const toggleButton = screen.getByRole('button', { name: /expand spatial information/i });
    expect(toggleButton).toBeInTheDocument();

    expect(screen.queryByText('X1:')).not.toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(screen.getByText('X1:')).toBeInTheDocument();
    expect(screen.getByText('Y1:')).toBeInTheDocument();
    expect(screen.getByText('X2:')).toBeInTheDocument();
    expect(screen.getByText('Y2:')).toBeInTheDocument();
  });

  it('can be collapsed by clicking the toggle button when expanded', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} defaultCollapsed={false} />);

    expect(screen.getByText('X1:')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: /collapse spatial information/i });
    fireEvent.click(toggleButton);

    expect(screen.queryByText('X1:')).not.toBeInTheDocument();
    expect(screen.queryByText('Y1:')).not.toBeInTheDocument();
  });

  it('has accessible expand/collapse controls', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} />);

    const toggleButton = screen.getByRole('button', { name: /expand spatial information/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates aria-expanded when toggled', () => {
    const mask = createMockMask();
    render(<BoundingBoxSection mask={mask} />);

    const toggleButton = screen.getByRole('button', { name: /expand spatial information/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });
});
