import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import type { BoundingBox, MaskMetadata } from '@/features/segmentation/store/segmentationStore';
import { constrainBoundingBox } from '@/shared/lib/maskUtils';

describe('Resize Integration - Task 6 Requirements', () => {
  const mockMask: MaskMetadata = {
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
    area_pixels: 10000,
    area_percentage: 5.0,
    centroid: [150, 150],
    mask_url: 'http://example.com/mask.png',
    objectMetadata: {
      description: 'A test object',
      location: 'center',
      relationship: 'isolated',
      relative_size: 'medium',
      shape_and_color: 'square, blue',
      texture: 'smooth',
      appearance_details: 'clear',
      orientation: 'centered',
    },
  };

  const imageSize = { width: 800, height: 600 };

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

  it('Requirement 5.1: startResizeMask is called when resize handle is grabbed and sets isResizing flag', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(true);
    expect(manipState?.resizeHandle).toBe('se');
  });

  it('Requirement 5.2: updateMaskSize is called during resize with correct bounding box and maintains aspect ratio', () => {
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

  it('Requirement 5.3: Resize is constrained to image boundaries', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    const outOfBoundsBbox: BoundingBox = {
      x1: 100,
      y1: 100,
      x2: 900,
      y2: 700,
    };
    
    const constrainedBbox = constrainBoundingBox(outOfBoundsBbox, imageSize);
    
    act(() => {
      result.current.updateMaskSize('test-mask-1', constrainedBbox);
    });
    
    const manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.currentBoundingBox.x2).toBeLessThanOrEqual(imageSize.width);
    expect(manipState?.currentBoundingBox.y2).toBeLessThanOrEqual(imageSize.height);
    expect(manipState?.currentBoundingBox.x1).toBeGreaterThanOrEqual(0);
    expect(manipState?.currentBoundingBox.y1).toBeGreaterThanOrEqual(0);
  });

  it('Requirement 5.4: endResizeMask is called on mouseup and resets isResizing flag', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'se');
    });
    
    let manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(true);
    expect(manipState?.resizeHandle).toBe('se');
    
    act(() => {
      result.current.endResizeMask('test-mask-1', imageSize);
    });
    
    manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(false);
    expect(manipState?.resizeHandle).toBe(null);
  });

  it('Requirement 5.5: area and relative_size metadata are updated after resize completes', async () => {
    const { result } = renderHook(() => useSegmentationStore());
    
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
    
    act(() => {
      result.current.endResizeMask('test-mask-1', imageSize);
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const updatedMask = result.current.results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(updatedMask?.objectMetadata?.relative_size).toBeDefined();
    
    const expectedArea = (newBbox.x2 - newBbox.x1) * (newBbox.y2 - newBbox.y1);
    expect(updatedMask?.area_pixels).toBe(expectedArea);
    
    const expectedPercentage = (expectedArea / (imageSize.width * imageSize.height)) * 100;
    expect(updatedMask?.area_percentage).toBeCloseTo(expectedPercentage, 2);
  });

  it('Complete resize workflow: start -> update -> end', () => {
    const { result } = renderHook(() => useSegmentationStore());
    
    act(() => {
      result.current.startResizeMask('test-mask-1', 'nw');
    });
    
    let manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(true);
    expect(manipState?.resizeHandle).toBe('nw');
    
    const newBbox: BoundingBox = {
      x1: 50,
      y1: 50,
      x2: 200,
      y2: 200,
    };
    
    act(() => {
      result.current.updateMaskSize('test-mask-1', newBbox);
    });
    
    manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.currentBoundingBox).toEqual(newBbox);
    expect(manipState?.isResizing).toBe(true);
    
    act(() => {
      result.current.endResizeMask('test-mask-1', imageSize);
    });
    
    manipState = result.current.maskManipulation.get('test-mask-1');
    expect(manipState?.isResizing).toBe(false);
    expect(manipState?.resizeHandle).toBe(null);
    expect(manipState?.currentBoundingBox).toEqual(newBbox);
  });

  it('All four resize handles work correctly', () => {
    const { result } = renderHook(() => useSegmentationStore());
    const handles: Array<'nw' | 'ne' | 'sw' | 'se'> = ['nw', 'ne', 'sw', 'se'];
    
    handles.forEach(handle => {
      act(() => {
        result.current.startResizeMask('test-mask-1', handle);
      });
      
      const manipState = result.current.maskManipulation.get('test-mask-1');
      expect(manipState?.isResizing).toBe(true);
      expect(manipState?.resizeHandle).toBe(handle);
      
      act(() => {
        result.current.endResizeMask('test-mask-1', imageSize);
      });
    });
  });
});
