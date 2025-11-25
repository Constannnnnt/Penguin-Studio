import type { BoundingBox, MaskTransform } from '@/store/segmentationStore';

/**
 * Check if two bounding boxes are equal within a threshold
 */
export function areBoundingBoxesEqual(
  bbox1: BoundingBox,
  bbox2: BoundingBox,
  threshold: number = 5
): boolean {
  return (
    Math.abs(bbox1.x1 - bbox2.x1) < threshold &&
    Math.abs(bbox1.y1 - bbox2.y1) < threshold &&
    Math.abs(bbox1.x2 - bbox2.x2) < threshold &&
    Math.abs(bbox1.y2 - bbox2.y2) < threshold
  );
}

/**
 * Generate consistent color for a mask ID
 */
export function getMaskColor(maskId: string): string {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];
  
  const hash = maskId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Combine image edit filters into CSS filter string
 */
export function combineImageEditFilters(edits: MaskTransform['imageEdits']): string {
  const filters: string[] = [];
  
  if (edits.brightness !== 0) {
    filters.push(`brightness(${100 + edits.brightness}%)`);
  }
  if (edits.contrast !== 0) {
    filters.push(`contrast(${100 + edits.contrast}%)`);
  }
  if (edits.exposure !== 0) {
    // Exposure is similar to brightness but affects the overall luminance
    filters.push(`brightness(${100 + edits.exposure}%)`);
  }
  if (edits.saturation !== 0) {
    filters.push(`saturate(${100 + edits.saturation}%)`);
  }
  if (edits.vibrance !== 0) {
    // Vibrance is similar to saturation but more subtle
    filters.push(`saturate(${100 + edits.vibrance * 0.5}%)`);
  }
  if (edits.hue !== 0) {
    filters.push(`hue-rotate(${edits.hue}deg)`);
  }
  if (edits.blur !== 0) {
    filters.push(`blur(${edits.blur}px)`);
  }
  
  return filters.join(' ');
}

/**
 * Constrain bounding box to image boundaries
 */
export function constrainBoundingBox(
  bbox: BoundingBox,
  imageSize: { width: number; height: number }
): BoundingBox {
  const width = bbox.x2 - bbox.x1;
  const height = bbox.y2 - bbox.y1;
  
  let x1 = Math.max(0, bbox.x1);
  let y1 = Math.max(0, bbox.y1);
  let x2 = Math.min(imageSize.width, bbox.x2);
  let y2 = Math.min(imageSize.height, bbox.y2);
  
  // Ensure minimum size
  if (x2 - x1 < width) {
    if (x1 === 0) {
      x2 = Math.min(imageSize.width, x1 + width);
    } else {
      x1 = Math.max(0, x2 - width);
    }
  }
  
  if (y2 - y1 < height) {
    if (y1 === 0) {
      y2 = Math.min(imageSize.height, y1 + height);
    } else {
      y1 = Math.max(0, y2 - height);
    }
  }
  
  return { x1, y1, x2, y2 };
}
