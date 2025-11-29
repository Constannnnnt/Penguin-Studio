import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import type { BoundingBox, MaskMetadata } from '@/features/segmentation/store/segmentationStore';

describe('State Isolation Between Masks', () => {
  const createMockMask = (id: string, x1: number, y1: number): MaskMetadata => ({
    mask_id: id,
    label: `Object ${id}`,
    confidence: 0.95,
    bounding_box: { x1, y1, x2: x1 + 100, y2: y1 + 100 },
    area_pixels: 10000,
    area_percentage: 2.08,
    centroid: [x1 + 50, y1 + 50],
    mask_url: `http://example.com/mask-${id}.png`,
    objectMetadata: {
      description: `Test object ${id}`,
      location: 'center',
      relationship: 'isolated',
      relative_size: 'medium',
      shape_and_color: 'blue square',
      texture: 'smooth',
      appearance_details: 'clear',
      orientation: 'centered',
    },
  });

  beforeEach(() => {
    const { result } = renderHook(() => useSegmentationStore());
    act(() => {
      result.current.clearResults();
      result.current.setResults({
        result_id: 'test-result',
        original_image_url: 'http://example.com/image.png',
        masks: [
          createMockMask('mask-1', 100, 100),
          createMockMask('mask-2', 300, 200),
          createMockMask('mask-3', 500, 300),
        ],
        processing_time_ms: 1000,
        timestamp: new Date().toISOString(),
      });
    });
  });

  describe('Drag State Isolation', () => {
    it('should maintain independent isDragging flags for multiple masks', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startDragMask('mask-1');
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.isDragging).toBe(true);
      expect(mask2State?.isDragging).toBe(false);
      expect(mask3State?.isDragging).toBe(false);
    });

    it('should not affect other masks when dragging one mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      const mask2OriginalBbox = result.current.maskManipulation.get('mask-2')?.currentBoundingBox;
      const mask3OriginalBbox = result.current.maskManipulation.get('mask-3')?.currentBoundingBox;

      act(() => {
        result.current.startDragMask('mask-1');
        result.current.updateMaskPosition('mask-1', 50, 30);
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.currentBoundingBox.x1).toBe(150);
      expect(mask1State?.currentBoundingBox.y1).toBe(130);

      expect(mask2State?.currentBoundingBox).toEqual(mask2OriginalBbox);
      expect(mask3State?.currentBoundingBox).toEqual(mask3OriginalBbox);
    });

    it('should allow dragging multiple masks sequentially without interference', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startDragMask('mask-1');
        result.current.updateMaskPosition('mask-1', 20, 10);
        result.current.endDragMask('mask-1');
      });

      const mask1AfterDrag = result.current.maskManipulation.get('mask-1')?.currentBoundingBox;

      act(() => {
        result.current.startDragMask('mask-2');
        result.current.updateMaskPosition('mask-2', -30, 40);
        result.current.endDragMask('mask-2');
      });

      const mask1AfterMask2Drag = result.current.maskManipulation.get('mask-1')?.currentBoundingBox;
      const mask2AfterDrag = result.current.maskManipulation.get('mask-2')?.currentBoundingBox;

      expect(mask1AfterMask2Drag).toEqual(mask1AfterDrag);
      expect(mask2AfterDrag?.x1).toBe(270);
      expect(mask2AfterDrag?.y1).toBe(240);
    });

    it('should maintain independent transform positions for each mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startDragMask('mask-1');
        result.current.updateMaskPosition('mask-1', 10, 20);
        result.current.endDragMask('mask-1');

        result.current.startDragMask('mask-2');
        result.current.updateMaskPosition('mask-2', 30, 40);
        result.current.endDragMask('mask-2');
      });

      const mask1Transform = result.current.maskManipulation.get('mask-1')?.transform.position;
      const mask2Transform = result.current.maskManipulation.get('mask-2')?.transform.position;
      const mask3Transform = result.current.maskManipulation.get('mask-3')?.transform.position;

      expect(mask1Transform).toEqual({ x: 10, y: 20 });
      expect(mask2Transform).toEqual({ x: 30, y: 40 });
      expect(mask3Transform).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Resize State Isolation', () => {
    it('should maintain independent isResizing flags for multiple masks', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startResizeMask('mask-2', 'se');
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.isResizing).toBe(false);
      expect(mask2State?.isResizing).toBe(true);
      expect(mask2State?.resizeHandle).toBe('se');
      expect(mask3State?.isResizing).toBe(false);
    });

    it('should not affect other masks when resizing one mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      const mask1OriginalBbox = result.current.maskManipulation.get('mask-1')?.currentBoundingBox;
      const mask3OriginalBbox = result.current.maskManipulation.get('mask-3')?.currentBoundingBox;

      const newBbox: BoundingBox = {
        x1: 300,
        y1: 200,
        x2: 500,
        y2: 400,
      };

      act(() => {
        result.current.startResizeMask('mask-2', 'se');
        result.current.updateMaskSize('mask-2', newBbox);
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask2State?.currentBoundingBox).toEqual(newBbox);
      expect(mask1State?.currentBoundingBox).toEqual(mask1OriginalBbox);
      expect(mask3State?.currentBoundingBox).toEqual(mask3OriginalBbox);
    });

    it('should maintain independent scale transforms for each mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startResizeMask('mask-1', 'se');
        result.current.updateMaskSize('mask-1', {
          x1: 100,
          y1: 100,
          x2: 250,
          y2: 250,
        });
        result.current.endResizeMask('mask-1');

        result.current.startResizeMask('mask-3', 'nw');
        result.current.updateMaskSize('mask-3', {
          x1: 450,
          y1: 250,
          x2: 600,
          y2: 400,
        });
        result.current.endResizeMask('mask-3');
      });

      const mask1Scale = result.current.maskManipulation.get('mask-1')?.transform.scale;
      const mask2Scale = result.current.maskManipulation.get('mask-2')?.transform.scale;
      const mask3Scale = result.current.maskManipulation.get('mask-3')?.transform.scale;

      expect(mask1Scale?.width).toBeCloseTo(1.5, 2);
      expect(mask1Scale?.height).toBeCloseTo(1.5, 2);
      expect(mask2Scale).toEqual({ width: 1, height: 1 });
      expect(mask3Scale?.width).toBeCloseTo(1.5, 2);
      expect(mask3Scale?.height).toBeCloseTo(1.5, 2);
    });
  });

  describe('Image Edit State Isolation', () => {
    it('should apply image edits to only the specified mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.applyImageEditToMask('mask-1', {
          brightness: 20,
          contrast: 10,
        });
      });

      const mask1Edits = result.current.maskManipulation.get('mask-1')?.transform.imageEdits;
      const mask2Edits = result.current.maskManipulation.get('mask-2')?.transform.imageEdits;
      const mask3Edits = result.current.maskManipulation.get('mask-3')?.transform.imageEdits;

      expect(mask1Edits?.brightness).toBe(20);
      expect(mask1Edits?.contrast).toBe(10);
      expect(mask2Edits?.brightness).toBe(0);
      expect(mask2Edits?.contrast).toBe(0);
      expect(mask3Edits?.brightness).toBe(0);
      expect(mask3Edits?.contrast).toBe(0);
    });

    it('should maintain independent image edits for multiple masks', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.applyImageEditToMask('mask-1', {
          brightness: 15,
          saturation: 20,
        });
        result.current.applyImageEditToMask('mask-2', {
          hue: 30,
          blur: 5,
        });
        result.current.applyImageEditToMask('mask-3', {
          exposure: 10,
          vibrance: 15,
        });
      });

      const mask1Edits = result.current.maskManipulation.get('mask-1')?.transform.imageEdits;
      const mask2Edits = result.current.maskManipulation.get('mask-2')?.transform.imageEdits;
      const mask3Edits = result.current.maskManipulation.get('mask-3')?.transform.imageEdits;

      expect(mask1Edits).toEqual({
        brightness: 15,
        contrast: 0,
        saturation: 20,
        hue: 0,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      });

      expect(mask2Edits).toEqual({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 30,
        blur: 5,
        exposure: 0,
        vibrance: 0,
      });

      expect(mask3Edits).toEqual({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        exposure: 10,
        vibrance: 15,
      });
    });

    it('should not affect other masks metadata when editing one mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      const mask2OriginalMetadata = result.current.results?.masks.find(m => m.mask_id === 'mask-2')?.objectMetadata;
      const mask3OriginalMetadata = result.current.results?.masks.find(m => m.mask_id === 'mask-3')?.objectMetadata;

      act(() => {
        result.current.applyImageEditToMask('mask-1', {
          brightness: 25,
          contrast: 15,
        });
      });

      const mask2Metadata = result.current.results?.masks.find(m => m.mask_id === 'mask-2')?.objectMetadata;
      const mask3Metadata = result.current.results?.masks.find(m => m.mask_id === 'mask-3')?.objectMetadata;

      // Masks 2 and 3 should remain unchanged
      expect(mask2Metadata).toEqual(mask2OriginalMetadata);
      expect(mask3Metadata).toEqual(mask3OriginalMetadata);
    });
  });

  describe('Reset Transform Isolation', () => {
    it('should reset only the specified mask without affecting others', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startDragMask('mask-1');
        result.current.updateMaskPosition('mask-1', 50, 50);
        result.current.endDragMask('mask-1');

        result.current.startDragMask('mask-2');
        result.current.updateMaskPosition('mask-2', 30, 30);
        result.current.endDragMask('mask-2');

        result.current.applyImageEditToMask('mask-1', { brightness: 20 });
        result.current.applyImageEditToMask('mask-2', { saturation: 15 });
      });

      act(() => {
        result.current.resetMaskTransform('mask-1');
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');

      expect(mask1State?.currentBoundingBox).toEqual(mask1State?.originalBoundingBox);
      expect(mask1State?.transform.position).toEqual({ x: 0, y: 0 });
      expect(mask1State?.transform.imageEdits.brightness).toBe(0);

      expect(mask2State?.currentBoundingBox.x1).toBe(330);
      expect(mask2State?.transform.position).toEqual({ x: 30, y: 30 });
      expect(mask2State?.transform.imageEdits.saturation).toBe(15);
    });
  });

  describe('Hide/Show State Isolation', () => {
    it('should hide only the specified mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.hideMask('mask-2');
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.isHidden).toBe(false);
      expect(mask2State?.isHidden).toBe(true);
      expect(mask3State?.isHidden).toBe(false);
    });

    it('should show only the specified mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.hideMask('mask-1');
        result.current.hideMask('mask-2');
        result.current.hideMask('mask-3');
      });

      act(() => {
        result.current.showMask('mask-2');
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.isHidden).toBe(true);
      expect(mask2State?.isHidden).toBe(false);
      expect(mask3State?.isHidden).toBe(true);
    });
  });

  describe('Complex Multi-Mask Operations', () => {
    it('should handle simultaneous operations on different masks', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startDragMask('mask-1');
        result.current.updateMaskPosition('mask-1', 25, 35);
        
        result.current.startResizeMask('mask-2', 'se');
        result.current.updateMaskSize('mask-2', {
          x1: 300,
          y1: 200,
          x2: 450,
          y2: 350,
        });
        
        result.current.applyImageEditToMask('mask-3', {
          brightness: 30,
          contrast: 20,
        });
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.isDragging).toBe(true);
      expect(mask1State?.currentBoundingBox.x1).toBe(125);
      
      expect(mask2State?.isResizing).toBe(true);
      expect(mask2State?.currentBoundingBox.x2).toBe(450);
      
      expect(mask3State?.transform.imageEdits.brightness).toBe(30);
      expect(mask3State?.isDragging).toBe(false);
      expect(mask3State?.isResizing).toBe(false);
    });

    it('should maintain state isolation through complete manipulation lifecycle', () => {
      const { result } = renderHook(() => useSegmentationStore());

      act(() => {
        result.current.startDragMask('mask-1');
        result.current.updateMaskPosition('mask-1', 40, 40);
        result.current.endDragMask('mask-1');
        
        result.current.startResizeMask('mask-1', 'se');
        result.current.updateMaskSize('mask-1', {
          x1: 140,
          y1: 140,
          x2: 290,
          y2: 290,
        });
        result.current.endResizeMask('mask-1');
        
        result.current.applyImageEditToMask('mask-1', {
          brightness: 10,
          saturation: 15,
        });
      });

      const mask1State = result.current.maskManipulation.get('mask-1');
      const mask2State = result.current.maskManipulation.get('mask-2');
      const mask3State = result.current.maskManipulation.get('mask-3');

      expect(mask1State?.isDragging).toBe(false);
      expect(mask1State?.isResizing).toBe(false);
      expect(mask1State?.currentBoundingBox.x1).toBe(140);
      expect(mask1State?.transform.imageEdits.brightness).toBe(10);

      expect(mask2State?.currentBoundingBox).toEqual({
        x1: 300,
        y1: 200,
        x2: 400,
        y2: 300,
      });
      expect(mask2State?.transform.position).toEqual({ x: 0, y: 0 });
      expect(mask2State?.transform.imageEdits.brightness).toBe(0);

      expect(mask3State?.currentBoundingBox).toEqual({
        x1: 500,
        y1: 300,
        x2: 600,
        y2: 400,
      });
      expect(mask3State?.transform.position).toEqual({ x: 0, y: 0 });
      expect(mask3State?.transform.imageEdits.brightness).toBe(0);
    });
  });

  describe('Metadata Update Isolation', () => {
    it('should update metadata only for the specified mask', () => {
      const { result } = renderHook(() => useSegmentationStore());

      const mask2OriginalMetadata = result.current.results?.masks.find(m => m.mask_id === 'mask-2')?.objectMetadata;

      act(() => {
        result.current.updateMaskMetadata('mask-1', {
          location: 'top-left',
          relationship: 'near edge',
        });
      });

      const mask1Metadata = result.current.results?.masks.find(m => m.mask_id === 'mask-1')?.objectMetadata;
      const mask2Metadata = result.current.results?.masks.find(m => m.mask_id === 'mask-2')?.objectMetadata;

      expect(mask1Metadata?.location).toBe('top-left');
      expect(mask1Metadata?.relationship).toBe('near edge');
      expect(mask2Metadata).toEqual(mask2OriginalMetadata);
    });
  });
});
