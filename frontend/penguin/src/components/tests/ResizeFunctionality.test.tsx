import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSegmentationStore } from '@/store/segmentationStore';
import type { BoundingBox, MaskMetadata } from '@/store/segmentationStore';

describe('Resize Functionality', () => {
  const mockMask: MaskMetadata = {
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
    area_pixels: 10000,
    area_percentage: 5.0,
    centroid: [150, 150],
    mask_url: 'http://example.com/mask.png',
  };

  beforeEach(() => {
    const { result } = renderHook(() => useSegmentationStore());
    act(() => {
      result.current.clearResults();
      result.current.setResults({
        result_id: 'test-result',
        original_image_url: 'http://example.com/image.png',
        masks: [mockMask],
        processing_time_ms: 1000,
        timestamp: new Date().toISOString(),
      });
    });
  });

  it('should start resize operation', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(true);
    expect(manipState?.resizeHandle).toBe('se');
  });

  it('should update mask size and maintain aspect ratio', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    const originalWidth = mockMask.bounding_box.x2 - mockMask.bounding_box.x1;
    const originalHeight = mockMask.bounding_box.y2 - mockMask.bounding_box.y1;
    const originalAspectRatio = originalWidth / originalHeight;
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const newBbox: BoundingBox = {
      x1: 100,
      y1: 100,
      x2: 300,
      y2: 300,
    };
    
    act(() => {
      result.current.updateMaskSize('test-mask-1', newBbox);
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.currentBoundingBox).toEqual(newBbox);
    
    const newWidth = newBbox.x2 - newBbox.x1;
    const newHeight = newBbox.y2 - newBbox.y1;
    const newAspectRatio = newWidth / newHeight;
    
    expect(Math.abs(newAspectRatio - originalAspectRatio)).toBeLessThan(0.01);
  });

  it('should scale mask proportionally', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    const originalWidth = mockMask.bounding_box.x2 - mockMask.bounding_box.x1;
    const originalHeight = mockMask.bounding_box.y2 - mockMask.bounding_box.y1;
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const scaleFactor = 1.5;
    const newBbox: BoundingBox = {
      x1: mockMask.bounding_box.x1,
      y1: mockMask.bounding_box.y1,
      x2: mockMask.bounding_box.x1 + originalWidth * scaleFactor,
      y2: mockMask.bounding_box.y1 + originalHeight * scaleFactor,
    };
    
    act(() => {
      result.current.updateMaskSize('test-mask-1', newBbox);
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.transform.scale.width).toBeCloseTo(scaleFactor, 2);
    expect(manipState?.transform.scale.height).toBeCloseTo(scaleFactor, 2);
  });

  it('should end resize operation', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    let manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(true);
    
    act(() => {
      result.current.endResizeMask('test-mask-1');
    });
    
    manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(false);
    expect(manipState?.resizeHandle).toBe(null);
  });

  it('should constrain resize to minimum size', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const tinyBbox: BoundingBox = {
      x1: 100,
      y1: 100,
      x2: 105,
      y2: 105,
    };
    
    act(() => {
      result.current.updateMaskSize('test-mask-1', tinyBbox);
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    const width = manipState!.currentBoundingBox.x2 - manipState!.currentBoundingBox.x1;
    const height = manipState!.currentBoundingBox.y2 - manipState!.currentBoundingBox.y1;
    
    expect(width).toBeGreaterThanOrEqual(5);
    expect(height).toBeGreaterThanOrEqual(5);
  });

  it('should update scale transform when resizing', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    const originalWidth = mockMask.bounding_box.x2 - mockMask.bounding_box.x1;
    const originalHeight = mockMask.bounding_box.y2 - mockMask.bounding_box.y1;
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const newBbox: BoundingBox = {
      x1: 100,
      y1: 100,
      x2: 250,
      y2: 250,
    };
    
    act(() => {
      result.current.updateMaskSize('test-mask-1', newBbox);
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    const newWidth = newBbox.x2 - newBbox.x1;
    const newHeight = newBbox.y2 - newBbox.y1;
    
    expect(manipState?.transform.scale.width).toBeCloseTo(newWidth / originalWidth, 2);
    expect(manipState?.transform.scale.height).toBeCloseTo(newHeight / originalHeight, 2);
  });
});
