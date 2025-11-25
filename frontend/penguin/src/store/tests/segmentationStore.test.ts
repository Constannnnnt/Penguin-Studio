import { describe, it, expect, beforeEach } from 'vitest';
import { useSegmentationStore } from '../segmentationStore';
import type { SegmentationResponse, MaskMetadata, BoundingBox } from '../segmentationStore';

describe('Segmentation Store - Metadata Updates', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null,
      maskManipulation: new Map(),
    });
  });

  it('should update mask metadata when provided', () => {
    const mockMask: any = {
      mask_id: 'test-mask-1',
      label: 'Test Object',
      confidence: 0.95,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'blue square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'test-result-1',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    const newMetadata = {
      location: 'top left',
      relationship: 'near object2',
      orientation: 'above-right',
    };

    useSegmentationStore.getState().updateMaskMetadata('test-mask-1', newMetadata);

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    expect(updatedResults!.masks[0].objectMetadata).toBeDefined();
    expect(updatedResults!.masks[0].objectMetadata!.location).toBe('top left');
    expect(updatedResults!.masks[0].objectMetadata!.relationship).toBe('near object2');
    expect(updatedResults!.masks[0].objectMetadata!.orientation).toBe('above-right');
    expect(updatedResults!.masks[0].objectMetadata!.description).toBe('A test object');
  });

  it('should create objectMetadata if it does not exist', () => {
    const mockMask: any = {
      mask_id: 'test-mask-2',
      label: 'Test Object 2',
      confidence: 0.85,
      bounding_box: { x1: 50, y1: 50, x2: 150, y2: 150 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [100, 100],
      mask_url: 'http://example.com/mask2.png',
    };

    const mockResults: any = {
      result_id: 'test-result-2',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    const newMetadata = {
      location: 'bottom right',
      relationship: 'isolated',
    };

    useSegmentationStore.getState().updateMaskMetadata('test-mask-2', newMetadata);

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    expect(updatedResults!.masks[0].objectMetadata).toBeDefined();
    expect(updatedResults!.masks[0].objectMetadata!.location).toBe('bottom right');
    expect(updatedResults!.masks[0].objectMetadata!.relationship).toBe('isolated');
  });

  it('should not update if mask does not exist', () => {
    const mockMask: any = {
      mask_id: 'test-mask-3',
      label: 'Test Object 3',
      confidence: 0.90,
      bounding_box: { x1: 10, y1: 10, x2: 110, y2: 110 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [60, 60],
      mask_url: 'http://example.com/mask3.png',
      object_metadata: {
        description: 'Original description',
        location: 'center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'red circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'test-result-3',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    const newMetadata = {
      location: 'top left',
    };

    useSegmentationStore.getState().updateMaskMetadata('non-existent-mask', newMetadata);

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    expect(updatedResults!.masks[0].objectMetadata!.location).toBe('center');
  });
});

describe('Segmentation Store - Resize Operations with Metadata Updates', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null,
      maskManipulation: new Map(),
    });
  });

  it('should update metadata after resize operation completes', async () => {
    const mockMask: any = {
      mask_id: 'resize-test-mask',
      label: 'Resizable Object',
      confidence: 0.92,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A resizable object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'blue square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'resize-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    const imageSize = { width: 1000, height: 1000 };

    useSegmentationStore.getState().startResizeMask('resize-test-mask', 'se');
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('resize-test-mask');
    expect(manipState?.isResizing).toBe(true);
    expect(manipState?.resizeHandle).toBe('se');

    const newBoundingBox: BoundingBox = { x1: 100, y1: 100, x2: 300, y2: 300 };
    useSegmentationStore.getState().updateMaskSize('resize-test-mask', newBoundingBox);
    
    const updatedManipState = useSegmentationStore.getState().maskManipulation.get('resize-test-mask');
    expect(updatedManipState?.currentBoundingBox.x2).toBe(300);
    expect(updatedManipState?.currentBoundingBox.y2).toBe(300);

    useSegmentationStore.getState().endResizeMask('resize-test-mask', imageSize);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalManipState = useSegmentationStore.getState().maskManipulation.get('resize-test-mask');
    expect(finalManipState?.isResizing).toBe(false);
    expect(finalManipState?.resizeHandle).toBe(null);
    
    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'resize-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.bounding_box.x2).toBe(300);
    expect(updatedMask!.bounding_box.y2).toBe(300);
    expect(updatedMask!.area_pixels).toBe(40000);
    expect(updatedMask!.area_percentage).toBe(4.0);
  });

  it('should update relative_size metadata based on new dimensions', async () => {
    const mockMask: any = {
      mask_id: 'size-test-mask',
      label: 'Size Test Object',
      confidence: 0.90,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 1.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'very small',
        shape_and_color: 'blue square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'size-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    const imageSize = { width: 1000, height: 1000 };

    useSegmentationStore.getState().startResizeMask('size-test-mask', 'se');
    
    const newBoundingBox: BoundingBox = { x1: 100, y1: 100, x2: 600, y2: 600 };
    useSegmentationStore.getState().updateMaskSize('size-test-mask', newBoundingBox);
    useSegmentationStore.getState().endResizeMask('size-test-mask', imageSize);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'size-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.area_percentage).toBe(25.0);
    expect(updatedMask!.objectMetadata?.relative_size).toBe('medium');
  });

  it('should maintain aspect ratio during resize', () => {
    const mockMask: any = {
      mask_id: 'aspect-test-mask',
      label: 'Aspect Test Object',
      confidence: 0.88,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
    };

    const mockResults: any = {
      result_id: 'aspect-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().startResizeMask('aspect-test-mask', 'se');
    
    const newBoundingBox: BoundingBox = { x1: 100, y1: 100, x2: 300, y2: 300 };
    useSegmentationStore.getState().updateMaskSize('aspect-test-mask', newBoundingBox);
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('aspect-test-mask');
    expect(manipState?.transform.scale.width).toBe(2.0);
    expect(manipState?.transform.scale.height).toBe(2.0);
  });
});

describe('Segmentation Store - Drag Operations with Metadata Updates', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null,
      maskManipulation: new Map(),
    });
  });

  it('should update metadata after drag operation completes', async () => {
    const mockMask: any = {
      mask_id: 'drag-test-mask',
      label: 'Draggable Object',
      confidence: 0.92,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A draggable object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'blue square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'drag-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    const imageSize = { width: 1000, height: 1000 };

    useSegmentationStore.getState().startDragMask('drag-test-mask');
    
    const manipState = useSegmentationStore.getState().maskManipulation.get('drag-test-mask');
    expect(manipState?.isDragging).toBe(true);

    useSegmentationStore.getState().updateMaskPosition('drag-test-mask', 50, 50);
    
    const updatedManipState = useSegmentationStore.getState().maskManipulation.get('drag-test-mask');
    expect(updatedManipState?.currentBoundingBox.x1).toBe(150);
    expect(updatedManipState?.currentBoundingBox.y1).toBe(150);

    useSegmentationStore.getState().endDragMask('drag-test-mask', imageSize);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalManipState = useSegmentationStore.getState().maskManipulation.get('drag-test-mask');
    expect(finalManipState?.isDragging).toBe(false);
  });

  it('should handle drag operations with multiple masks', () => {
    const mockMask1: any = {
      mask_id: 'mask-1',
      label: 'Object 1',
      confidence: 0.95,
      bounding_box: { x1: 50, y1: 50, x2: 150, y2: 150 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [100, 100],
      mask_url: 'http://example.com/mask1.png',
      object_metadata: {
        description: 'First object',
        location: 'top left',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'red square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask2: any = {
      mask_id: 'mask-2',
      label: 'Object 2',
      confidence: 0.88,
      bounding_box: { x1: 300, y1: 300, x2: 400, y2: 400 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [350, 350],
      mask_url: 'http://example.com/mask2.png',
      object_metadata: {
        description: 'Second object',
        location: 'bottom right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'blue circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'multi-mask-test',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().startDragMask('mask-1');
    useSegmentationStore.getState().updateMaskPosition('mask-1', 100, 100);
    
    const mask1State = useSegmentationStore.getState().maskManipulation.get('mask-1');
    expect(mask1State?.currentBoundingBox.x1).toBe(150);
    
    const mask2State = useSegmentationStore.getState().maskManipulation.get('mask-2');
    expect(mask2State?.currentBoundingBox.x1).toBe(300);
  });
});

describe('Segmentation Store - Image Edit Metadata Updates', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null,
      maskManipulation: new Map(),
    });
  });

  it('should update appearance_details when brightness is adjusted', () => {
    const mockMask: any = {
      mask_id: 'brightness-test-mask',
      label: 'Brightness Test Object',
      confidence: 0.92,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'blue square',
        texture: 'smooth',
        appearance_details: 'clean surface',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'brightness-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'brightness-test-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('brightness-test-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('brightness-test-mask', { brightness: 20 });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'brightness-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata?.appearance_details).toContain('brightness +20%');
  });

  it('should update appearance_details when contrast is adjusted', () => {
    const mockMask: any = {
      mask_id: 'contrast-test-mask',
      label: 'Contrast Test Object',
      confidence: 0.90,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'red circle',
        texture: 'smooth',
        appearance_details: 'matte finish',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'contrast-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'contrast-test-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('contrast-test-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('contrast-test-mask', { contrast: -15 });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'contrast-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata?.appearance_details).toContain('contrast -15%');
  });

  it('should update shape_and_color when saturation is adjusted', () => {
    const mockMask: any = {
      mask_id: 'saturation-test-mask',
      label: 'Saturation Test Object',
      confidence: 0.88,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'green triangle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'saturation-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'saturation-test-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('saturation-test-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('saturation-test-mask', { saturation: 30 });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'saturation-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata?.shape_and_color).toContain('saturation +30%');
  });

  it('should update shape_and_color when hue is adjusted', () => {
    const mockMask: any = {
      mask_id: 'hue-test-mask',
      label: 'Hue Test Object',
      confidence: 0.85,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'yellow rectangle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'hue-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'hue-test-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('hue-test-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('hue-test-mask', { hue: 45 });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'hue-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata?.shape_and_color).toContain('hue shift 45°');
  });

  it('should update texture when blur is applied', () => {
    const mockMask: any = {
      mask_id: 'blur-test-mask',
      label: 'Blur Test Object',
      confidence: 0.93,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'purple hexagon',
        texture: 'rough surface',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'blur-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'blur-test-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('blur-test-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('blur-test-mask', { blur: 5 });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'blur-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata?.texture).toContain('blurred 5px');
    expect(updatedMask!.objectMetadata?.appearance_details).toContain('blur 5px');
  });

  it('should update multiple metadata fields when multiple edits are applied', () => {
    const mockMask: any = {
      mask_id: 'multi-edit-test-mask',
      label: 'Multi Edit Test Object',
      confidence: 0.91,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
      object_metadata: {
        description: 'A test object',
        location: 'center center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'orange oval',
        texture: 'smooth',
        appearance_details: 'glossy',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'multi-edit-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'multi-edit-test-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('multi-edit-test-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('multi-edit-test-mask', { 
      brightness: 10, 
      contrast: 15,
      saturation: 20,
      hue: -30
    });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'multi-edit-test-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata?.appearance_details).toContain('brightness +10%');
    expect(updatedMask!.objectMetadata?.appearance_details).toContain('contrast +15%');
    expect(updatedMask!.objectMetadata?.shape_and_color).toContain('saturation +20%');
    expect(updatedMask!.objectMetadata?.shape_and_color).toContain('hue shift -30°');
  });

  it('should not update metadata if mask has no objectMetadata', () => {
    const mockMask: any = {
      mask_id: 'no-metadata-mask',
      label: 'No Metadata Object',
      confidence: 0.87,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask.png',
    };

    const mockResults: any = {
      result_id: 'no-metadata-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);
    
    const manipState = {
      maskId: 'no-metadata-mask',
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
    };
    
    const newManipulation = new Map();
    newManipulation.set('no-metadata-mask', manipState);
    useSegmentationStore.setState({ maskManipulation: newManipulation });

    useSegmentationStore.getState().applyImageEditToMask('no-metadata-mask', { brightness: 20 });

    const updatedResults = useSegmentationStore.getState().results;
    expect(updatedResults).toBeDefined();
    const updatedMask = updatedResults!.masks.find(m => m.mask_id === 'no-metadata-mask');
    expect(updatedMask).toBeDefined();
    expect(updatedMask!.objectMetadata).toBeUndefined();
  });
});

describe('Segmentation Store - State Isolation Between Masks', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      results: null,
      selectedMaskId: null,
      hoveredMaskId: null,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      errorCode: null,
      masksVisible: true,
      lastOperation: null,
      maskManipulation: new Map(),
    });
  });

  it('should maintain independent drag state for multiple masks', () => {
    const mockMask1: any = {
      mask_id: 'isolation-mask-1',
      label: 'Object 1',
      confidence: 0.95,
      bounding_box: { x1: 50, y1: 50, x2: 150, y2: 150 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [100, 100],
      mask_url: 'http://example.com/mask1.png',
      object_metadata: {
        description: 'First object',
        location: 'top left',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'red square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask2: any = {
      mask_id: 'isolation-mask-2',
      label: 'Object 2',
      confidence: 0.88,
      bounding_box: { x1: 300, y1: 300, x2: 400, y2: 400 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [350, 350],
      mask_url: 'http://example.com/mask2.png',
      object_metadata: {
        description: 'Second object',
        location: 'bottom right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'blue circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask3: any = {
      mask_id: 'isolation-mask-3',
      label: 'Object 3',
      confidence: 0.82,
      bounding_box: { x1: 500, y1: 100, x2: 600, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [550, 150],
      mask_url: 'http://example.com/mask3.png',
      object_metadata: {
        description: 'Third object',
        location: 'top right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'green triangle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'isolation-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2, mockMask3],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().startDragMask('isolation-mask-1');
    
    const mask1State = useSegmentationStore.getState().maskManipulation.get('isolation-mask-1');
    const mask2State = useSegmentationStore.getState().maskManipulation.get('isolation-mask-2');
    const mask3State = useSegmentationStore.getState().maskManipulation.get('isolation-mask-3');
    
    expect(mask1State?.isDragging).toBe(true);
    expect(mask2State?.isDragging).toBe(false);
    expect(mask3State?.isDragging).toBe(false);

    useSegmentationStore.getState().updateMaskPosition('isolation-mask-1', 100, 50);
    
    const updatedMask1State = useSegmentationStore.getState().maskManipulation.get('isolation-mask-1');
    const updatedMask2State = useSegmentationStore.getState().maskManipulation.get('isolation-mask-2');
    const updatedMask3State = useSegmentationStore.getState().maskManipulation.get('isolation-mask-3');
    
    expect(updatedMask1State?.currentBoundingBox.x1).toBe(150);
    expect(updatedMask1State?.currentBoundingBox.y1).toBe(100);
    expect(updatedMask2State?.currentBoundingBox.x1).toBe(300);
    expect(updatedMask2State?.currentBoundingBox.y1).toBe(300);
    expect(updatedMask3State?.currentBoundingBox.x1).toBe(500);
    expect(updatedMask3State?.currentBoundingBox.y1).toBe(100);
  });

  it('should maintain independent resize state for multiple masks', () => {
    const mockMask1: any = {
      mask_id: 'resize-isolation-mask-1',
      label: 'Resizable Object 1',
      confidence: 0.92,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask1.png',
      object_metadata: {
        description: 'First resizable object',
        location: 'center left',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'yellow square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask2: any = {
      mask_id: 'resize-isolation-mask-2',
      label: 'Resizable Object 2',
      confidence: 0.89,
      bounding_box: { x1: 400, y1: 400, x2: 500, y2: 500 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [450, 450],
      mask_url: 'http://example.com/mask2.png',
      object_metadata: {
        description: 'Second resizable object',
        location: 'bottom right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'purple circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'resize-isolation-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().startResizeMask('resize-isolation-mask-1', 'se');
    
    const mask1State = useSegmentationStore.getState().maskManipulation.get('resize-isolation-mask-1');
    const mask2State = useSegmentationStore.getState().maskManipulation.get('resize-isolation-mask-2');
    
    expect(mask1State?.isResizing).toBe(true);
    expect(mask1State?.resizeHandle).toBe('se');
    expect(mask2State?.isResizing).toBe(false);
    expect(mask2State?.resizeHandle).toBe(null);

    const newBoundingBox: BoundingBox = { x1: 100, y1: 100, x2: 300, y2: 300 };
    useSegmentationStore.getState().updateMaskSize('resize-isolation-mask-1', newBoundingBox);
    
    const updatedMask1State = useSegmentationStore.getState().maskManipulation.get('resize-isolation-mask-1');
    const updatedMask2State = useSegmentationStore.getState().maskManipulation.get('resize-isolation-mask-2');
    
    expect(updatedMask1State?.currentBoundingBox.x2).toBe(300);
    expect(updatedMask1State?.currentBoundingBox.y2).toBe(300);
    expect(updatedMask2State?.currentBoundingBox.x2).toBe(500);
    expect(updatedMask2State?.currentBoundingBox.y2).toBe(500);
  });

  it('should maintain independent image edit state for multiple masks', () => {
    const mockMask1: any = {
      mask_id: 'edit-isolation-mask-1',
      label: 'Editable Object 1',
      confidence: 0.94,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask1.png',
      object_metadata: {
        description: 'First editable object',
        location: 'center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'cyan square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask2: any = {
      mask_id: 'edit-isolation-mask-2',
      label: 'Editable Object 2',
      confidence: 0.87,
      bounding_box: { x1: 300, y1: 300, x2: 400, y2: 400 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [350, 350],
      mask_url: 'http://example.com/mask2.png',
      object_metadata: {
        description: 'Second editable object',
        location: 'bottom right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'magenta circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'edit-isolation-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().applyImageEditToMask('edit-isolation-mask-1', { 
      brightness: 20, 
      contrast: 15 
    });
    
    const mask1State = useSegmentationStore.getState().maskManipulation.get('edit-isolation-mask-1');
    const mask2State = useSegmentationStore.getState().maskManipulation.get('edit-isolation-mask-2');
    
    expect(mask1State?.transform.imageEdits.brightness).toBe(20);
    expect(mask1State?.transform.imageEdits.contrast).toBe(15);
    expect(mask2State?.transform.imageEdits.brightness).toBe(0);
    expect(mask2State?.transform.imageEdits.contrast).toBe(0);

    useSegmentationStore.getState().applyImageEditToMask('edit-isolation-mask-2', { 
      saturation: 30, 
      hue: -45 
    });
    
    const updatedMask1State = useSegmentationStore.getState().maskManipulation.get('edit-isolation-mask-1');
    const updatedMask2State = useSegmentationStore.getState().maskManipulation.get('edit-isolation-mask-2');
    
    expect(updatedMask1State?.transform.imageEdits.brightness).toBe(20);
    expect(updatedMask1State?.transform.imageEdits.contrast).toBe(15);
    expect(updatedMask1State?.transform.imageEdits.saturation).toBe(0);
    expect(updatedMask1State?.transform.imageEdits.hue).toBe(0);
    
    expect(updatedMask2State?.transform.imageEdits.brightness).toBe(0);
    expect(updatedMask2State?.transform.imageEdits.contrast).toBe(0);
    expect(updatedMask2State?.transform.imageEdits.saturation).toBe(30);
    expect(updatedMask2State?.transform.imageEdits.hue).toBe(-45);
  });

  it('should maintain independent metadata for multiple masks during simultaneous operations', () => {
    const mockMask1: any = {
      mask_id: 'multi-op-mask-1',
      label: 'Multi-Op Object 1',
      confidence: 0.93,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask1.png',
      object_metadata: {
        description: 'First multi-op object',
        location: 'center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'orange square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask2: any = {
      mask_id: 'multi-op-mask-2',
      label: 'Multi-Op Object 2',
      confidence: 0.86,
      bounding_box: { x1: 300, y1: 300, x2: 400, y2: 400 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [350, 350],
      mask_url: 'http://example.com/mask2.png',
      object_metadata: {
        description: 'Second multi-op object',
        location: 'bottom right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'pink circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'multi-op-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().startDragMask('multi-op-mask-1');
    useSegmentationStore.getState().updateMaskPosition('multi-op-mask-1', 50, 50);
    useSegmentationStore.getState().applyImageEditToMask('multi-op-mask-1', { brightness: 25 });

    useSegmentationStore.getState().startResizeMask('multi-op-mask-2', 'nw');
    const newBoundingBox: BoundingBox = { x1: 250, y1: 250, x2: 400, y2: 400 };
    useSegmentationStore.getState().updateMaskSize('multi-op-mask-2', newBoundingBox);
    useSegmentationStore.getState().applyImageEditToMask('multi-op-mask-2', { saturation: 40 });
    
    const mask1State = useSegmentationStore.getState().maskManipulation.get('multi-op-mask-1');
    const mask2State = useSegmentationStore.getState().maskManipulation.get('multi-op-mask-2');
    
    expect(mask1State?.isDragging).toBe(true);
    expect(mask1State?.isResizing).toBe(false);
    expect(mask1State?.currentBoundingBox.x1).toBe(150);
    expect(mask1State?.currentBoundingBox.y1).toBe(150);
    expect(mask1State?.transform.imageEdits.brightness).toBe(25);
    expect(mask1State?.transform.imageEdits.saturation).toBe(0);
    
    expect(mask2State?.isDragging).toBe(false);
    expect(mask2State?.isResizing).toBe(true);
    expect(mask2State?.resizeHandle).toBe('nw');
    expect(mask2State?.currentBoundingBox.x1).toBe(250);
    expect(mask2State?.currentBoundingBox.y1).toBe(250);
    expect(mask2State?.transform.imageEdits.brightness).toBe(0);
    expect(mask2State?.transform.imageEdits.saturation).toBe(40);
  });

  it('should maintain independent hidden state for multiple masks', () => {
    const mockMask1: any = {
      mask_id: 'hidden-mask-1',
      label: 'Hideable Object 1',
      confidence: 0.91,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask1.png',
    };

    const mockMask2: any = {
      mask_id: 'hidden-mask-2',
      label: 'Hideable Object 2',
      confidence: 0.84,
      bounding_box: { x1: 300, y1: 300, x2: 400, y2: 400 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [350, 350],
      mask_url: 'http://example.com/mask2.png',
    };

    const mockResults: any = {
      result_id: 'hidden-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().hideMask('hidden-mask-1');
    
    const mask1State = useSegmentationStore.getState().maskManipulation.get('hidden-mask-1');
    const mask2State = useSegmentationStore.getState().maskManipulation.get('hidden-mask-2');
    
    expect(mask1State?.isHidden).toBe(true);
    expect(mask2State?.isHidden).toBe(false);

    useSegmentationStore.getState().showMask('hidden-mask-1');
    useSegmentationStore.getState().hideMask('hidden-mask-2');
    
    const updatedMask1State = useSegmentationStore.getState().maskManipulation.get('hidden-mask-1');
    const updatedMask2State = useSegmentationStore.getState().maskManipulation.get('hidden-mask-2');
    
    expect(updatedMask1State?.isHidden).toBe(false);
    expect(updatedMask2State?.isHidden).toBe(true);
  });

  it('should maintain independent transform reset for multiple masks', () => {
    const mockMask1: any = {
      mask_id: 'reset-mask-1',
      label: 'Resettable Object 1',
      confidence: 0.90,
      bounding_box: { x1: 100, y1: 100, x2: 200, y2: 200 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [150, 150],
      mask_url: 'http://example.com/mask1.png',
      object_metadata: {
        description: 'First resettable object',
        location: 'center',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'brown square',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockMask2: any = {
      mask_id: 'reset-mask-2',
      label: 'Resettable Object 2',
      confidence: 0.83,
      bounding_box: { x1: 300, y1: 300, x2: 400, y2: 400 },
      area_pixels: 10000,
      area_percentage: 5.0,
      centroid: [350, 350],
      mask_url: 'http://example.com/mask2.png',
      object_metadata: {
        description: 'Second resettable object',
        location: 'bottom right',
        relationship: 'isolated',
        relative_size: 'medium',
        shape_and_color: 'gray circle',
        texture: 'smooth',
        appearance_details: 'clean',
        orientation: 'centered',
      },
    };

    const mockResults: any = {
      result_id: 'reset-test-result',
      original_image_url: 'http://example.com/image.png',
      masks: [mockMask1, mockMask2],
      processing_time_ms: 1000,
      timestamp: new Date().toISOString(),
    };

    useSegmentationStore.getState().setResults(mockResults);

    useSegmentationStore.getState().updateMaskPosition('reset-mask-1', 50, 50);
    useSegmentationStore.getState().applyImageEditToMask('reset-mask-1', { brightness: 30 });
    
    useSegmentationStore.getState().updateMaskPosition('reset-mask-2', 100, 100);
    useSegmentationStore.getState().applyImageEditToMask('reset-mask-2', { contrast: 20 });
    
    const mask1BeforeReset = useSegmentationStore.getState().maskManipulation.get('reset-mask-1');
    const mask2BeforeReset = useSegmentationStore.getState().maskManipulation.get('reset-mask-2');
    
    expect(mask1BeforeReset?.currentBoundingBox.x1).toBe(150);
    expect(mask1BeforeReset?.transform.imageEdits.brightness).toBe(30);
    expect(mask2BeforeReset?.currentBoundingBox.x1).toBe(400);
    expect(mask2BeforeReset?.transform.imageEdits.contrast).toBe(20);

    useSegmentationStore.getState().resetMaskTransform('reset-mask-1');
    
    const mask1AfterReset = useSegmentationStore.getState().maskManipulation.get('reset-mask-1');
    const mask2AfterReset = useSegmentationStore.getState().maskManipulation.get('reset-mask-2');
    
    expect(mask1AfterReset?.currentBoundingBox.x1).toBe(100);
    expect(mask1AfterReset?.transform.imageEdits.brightness).toBe(0);
    expect(mask2AfterReset?.currentBoundingBox.x1).toBe(400);
    expect(mask2AfterReset?.transform.imageEdits.contrast).toBe(20);
  });
});
