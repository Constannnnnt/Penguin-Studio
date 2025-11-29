import { describe, it, expect, beforeEach } from 'vitest';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import type { SegmentationResponse, MaskMetadata } from '@/features/segmentation/store/segmentationStore';
import { combineImageEditFilters } from '@/shared/lib/maskUtils';

describe('Image Edit Application to Masks', () => {
  const mockMask: MaskMetadata = {
    mask_id: 'test-mask-1',
    label: 'Test Object',
    confidence: 0.95,
    bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
    area_pixels: 10000,
    area_percentage: 5.0,
    centroid: [150, 150],
    mask_url: 'http://localhost:8000/masks/test-mask-1.png',
    promptText: 'test object',
    objectMetadata: {
      description: 'A test object',
      location: 'center',
      relationship: 'isolated',
      relative_size: 'medium',
      shape_and_color: 'blue rectangular',
      texture: 'smooth',
      appearance_details: 'well-lit',
      orientation: 'centered',
    },
  };

  const mockResults: SegmentationResponse = {
    result_id: 'test-result-1',
    original_image_url: 'http://localhost:8000/images/test.png',
    masks: [mockMask],
    processing_time_ms: 1000,
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    const store = useSegmentationStore.getState();
    store.clearResults();
    store.setResults(mockResults);
  });

  it('should apply brightness edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { brightness: 50 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.brightness).toBe(50);
  });

  it('should apply contrast edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { contrast: -30 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.contrast).toBe(-30);
  });

  it('should apply saturation edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { saturation: 40 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.saturation).toBe(40);
  });

  it('should apply hue edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { hue: 90 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.hue).toBe(90);
  });

  it('should apply blur edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { blur: 10 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.blur).toBe(10);
  });

  it('should apply exposure edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { exposure: 25 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.exposure).toBe(25);
  });

  it('should apply vibrance edit to mask and update manipulation state', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { vibrance: 35 });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.vibrance).toBe(35);
  });

  it('should apply multiple edits simultaneously', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', {
      brightness: 20,
      contrast: 15,
      saturation: 30,
      hue: 45,
      blur: 5,
    });
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState).toBeDefined();
    expect(manipState?.transform.imageEdits.brightness).toBe(20);
    expect(manipState?.transform.imageEdits.contrast).toBe(15);
    expect(manipState?.transform.imageEdits.saturation).toBe(30);
    expect(manipState?.transform.imageEdits.hue).toBe(45);
    expect(manipState?.transform.imageEdits.blur).toBe(5);
  });

  it('should update appearance_details metadata when brightness is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { brightness: 50 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.appearance_details).toBeDefined();
    expect(mask?.objectMetadata?.appearance_details).toContain('brightness +50%');
  });

  it('should update appearance_details metadata when contrast is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { contrast: -20 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.appearance_details).toBeDefined();
    expect(mask?.objectMetadata?.appearance_details).toContain('contrast -20%');
  });

  it('should update appearance_details metadata when exposure is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { exposure: 30 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.appearance_details).toBeDefined();
    expect(mask?.objectMetadata?.appearance_details).toContain('exposure +30%');
  });

  it('should update appearance_details metadata when blur is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { blur: 8 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.appearance_details).toBeDefined();
    expect(mask?.objectMetadata?.appearance_details).toContain('blur 8px');
  });

  it('should update shape_and_color metadata when saturation is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { saturation: 40 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.shape_and_color).toBeDefined();
    expect(mask?.objectMetadata?.shape_and_color).toContain('saturation +40%');
  });

  it('should update shape_and_color metadata when hue is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { hue: 90 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.shape_and_color).toBeDefined();
    expect(mask?.objectMetadata?.shape_and_color).toContain('hue shift 90°');
  });

  it('should update shape_and_color metadata when vibrance is adjusted', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { vibrance: 35 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.shape_and_color).toBeDefined();
    expect(mask?.objectMetadata?.shape_and_color).toContain('vibrance +35%');
  });

  it('should update texture metadata when blur is applied', () => {
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { blur: 10 });
    
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.texture).toBeDefined();
    expect(mask?.objectMetadata?.texture).toContain('blurred 10px');
  });

  it('should generate correct CSS filter string from edits', () => {
    const edits = {
      brightness: 20,
      contrast: 15,
      saturation: 30,
      hue: 45,
      blur: 5,
      exposure: 10,
      vibrance: 20,
    };
    
    const filterString = combineImageEditFilters(edits);
    
    expect(filterString).toContain('brightness(120%)');
    expect(filterString).toContain('contrast(115%)');
    expect(filterString).toContain('brightness(110%)'); // exposure
    expect(filterString).toContain('saturate(130%)');
    expect(filterString).toContain('saturate(110%)'); // vibrance at 50%
    expect(filterString).toContain('hue-rotate(45deg)');
    expect(filterString).toContain('blur(5px)');
  });

  it('should reset all image edits when resetMaskTransform is called', () => {
    // Apply some edits
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', {
      brightness: 50,
      contrast: 30,
      saturation: 40,
      hue: 90,
      blur: 10,
    });
    
    // Verify edits are applied
    let manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState?.transform.imageEdits.brightness).toBe(50);
    
    // Reset
    useSegmentationStore.getState().resetMaskTransform('test-mask-1');
    
    // Verify all edits are reset to 0
    manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState?.transform.imageEdits.brightness).toBe(0);
    expect(manipState?.transform.imageEdits.contrast).toBe(0);
    expect(manipState?.transform.imageEdits.saturation).toBe(0);
    expect(manipState?.transform.imageEdits.hue).toBe(0);
    expect(manipState?.transform.imageEdits.blur).toBe(0);
    expect(manipState?.transform.imageEdits.exposure).toBe(0);
    expect(manipState?.transform.imageEdits.vibrance).toBe(0);
  });

  it('should preserve original metadata when reset is called', () => {
    // Apply edits
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { brightness: 50, saturation: 40 });
    
    // Reset
    useSegmentationStore.getState().resetMaskTransform('test-mask-1');
    
    // Metadata should be restored (orientation should be 'centered')
    const mask = useSegmentationStore.getState().results?.masks.find(m => m.mask_id === 'test-mask-1');
    expect(mask?.objectMetadata?.orientation).toBe('centered');
  });

  it('should handle incremental edits correctly', () => {
    // Apply first edit
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { brightness: 20 });
    let manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState?.transform.imageEdits.brightness).toBe(20);
    
    // Apply second edit (should update, not replace)
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { contrast: 15 });
    manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState?.transform.imageEdits.brightness).toBe(20);
    expect(manipState?.transform.imageEdits.contrast).toBe(15);
    
    // Apply third edit that modifies existing value
    useSegmentationStore.getState().applyImageEditToMask('test-mask-1', { brightness: 30 });
    manipState = useSegmentationStore.getState().maskManipulation.get('test-mask-1');
    expect(manipState?.transform.imageEdits.brightness).toBe(30);
    expect(manipState?.transform.imageEdits.contrast).toBe(15);
  });
});
