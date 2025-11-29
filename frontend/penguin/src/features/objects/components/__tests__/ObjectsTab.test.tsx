import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectsTab } from '../ObjectsTab';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import type { SegmentationResponse } from '@/features/segmentation/store/segmentationStore';

Element.prototype.scrollIntoView = vi.fn();

describe('ObjectsTab', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
    });
  });

  it('displays empty state when no results', () => {
    render(<ObjectsTab />);
    expect(screen.getByText(/No objects detected/i)).toBeInTheDocument();
  });

  it('displays empty state when results has no masks', () => {
    const emptyResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: emptyResults });
    render(<ObjectsTab />);
    expect(screen.getByText(/No objects detected/i)).toBeInTheDocument();
  });

  it('renders list of masks sorted by confidence', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.5,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
        {
          mask_id: 'mask-2',
          label: 'Object B',
          confidence: 0.9,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask2.png',
        },
        {
          mask_id: 'mask-3',
          label: 'Object C',
          confidence: 0.7,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask3.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults });
    render(<ObjectsTab />);

    const items = screen.getAllByRole('generic').filter(el => el.hasAttribute('data-mask-id'));
    expect(items).toHaveLength(3);

    expect(screen.getByText('Object B')).toBeInTheDocument();
    expect(screen.getByText('Object C')).toBeInTheDocument();
    expect(screen.getByText('Object A')).toBeInTheDocument();

    const maskIds = items.map(item => item.getAttribute('data-mask-id'));
    expect(maskIds).toEqual(['mask-2', 'mask-3', 'mask-1']);
  });

  it('displays confidence scores as percentages', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.856,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults });
    render(<ObjectsTab />);

    expect(screen.getByText('85.6%')).toBeInTheDocument();
  });

  it('updates store when hovering over list item', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.9,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults, hoveredMaskId: null });
    const { container } = render(<ObjectsTab />);

    const listItem = container.querySelector('[data-mask-id="mask-1"]');
    expect(listItem).toBeInTheDocument();

    if (listItem) {
      fireEvent.mouseEnter(listItem);
      expect(useSegmentationStore.getState().hoveredMaskId).toBe('mask-1');

      fireEvent.mouseLeave(listItem);
      expect(useSegmentationStore.getState().hoveredMaskId).toBe(null);
    }
  });

  it('highlights list item when hoveredMaskId is set in store', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.9,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults, hoveredMaskId: 'mask-1' });
    const { container } = render(<ObjectsTab />);

    const listItem = container.querySelector('[data-mask-id="mask-1"]');
    expect(listItem).toHaveClass('bg-accent');
  });

  it('selects mask when clicking on list item', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.9,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults, selectedMaskId: null });
    const { container } = render(<ObjectsTab />);

    const listItem = container.querySelector('[data-mask-id="mask-1"]');
    expect(listItem).toBeInTheDocument();

    if (listItem) {
      fireEvent.click(listItem);
      expect(useSegmentationStore.getState().selectedMaskId).toBe('mask-1');
    }
  });

  it('shows visual indicator when mask is selected', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.9,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults, selectedMaskId: 'mask-1' });
    const { container } = render(<ObjectsTab />);

    const listItem = container.querySelector('[data-mask-id="mask-1"]');
    expect(listItem).toHaveClass('bg-accent/50');
    
    const checkIcon = container.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('deselects previous mask when selecting a new one', () => {
    const mockResults: SegmentationResponse = {
      result_id: 'test-1',
      original_image_url: 'http://example.com/image.png',
      masks: [
        {
          mask_id: 'mask-1',
          label: 'Object A',
          confidence: 0.9,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask1.png',
        },
        {
          mask_id: 'mask-2',
          label: 'Object B',
          confidence: 0.8,
          bounding_box: { x1: 0, y1: 0, x2: 100, y2: 100 },
          area_pixels: 10000,
          area_percentage: 10,
          centroid: [50, 50],
          mask_url: 'http://example.com/mask2.png',
        },
      ],
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.setState({ results: mockResults, selectedMaskId: 'mask-1' });
    const { container } = render(<ObjectsTab />);

    const listItem2 = container.querySelector('[data-mask-id="mask-2"]');
    expect(listItem2).toBeInTheDocument();

    if (listItem2) {
      fireEvent.click(listItem2);
      expect(useSegmentationStore.getState().selectedMaskId).toBe('mask-2');
    }
  });
});
