import type { BoundingBox, MaskMetadata, MaskTransform, MaskManipulationState } from '@/features/segmentation/store/segmentationStore';

// Cache for direction calculations to avoid repeated trigonometric operations
const directionCache = new Map<string, string>();

export class MetadataUpdater {
  updateLocationMetadata(
    newBoundingBox: BoundingBox,
    imageSize: { width: number; height: number }
  ): string {
    const centerX = (newBoundingBox.x1 + newBoundingBox.x2) / 2;
    const centerY = (newBoundingBox.y1 + newBoundingBox.y2) / 2;
    
    const relativeX = centerX / imageSize.width;
    const relativeY = centerY / imageSize.height;
    
    const horizontal = relativeX < 0.33 ? 'left' : relativeX > 0.67 ? 'right' : 'center';
    const vertical = relativeY < 0.33 ? 'top' : relativeY > 0.67 ? 'bottom' : 'middle';
    
    return `${vertical} ${horizontal}`;
  }
  
  updateRelationshipMetadata(
    maskId: string,
    allMasks: MaskMetadata[],
    manipulationStates: Map<string, MaskManipulationState>
  ): string {
    const targetMask = allMasks.find(m => m.mask_id === maskId);
    if (!targetMask) return '';
    
    const targetState = manipulationStates.get(maskId);
    const targetBbox = targetState?.currentBoundingBox || targetMask.bounding_box;
    const targetCenter = {
      x: (targetBbox.x1 + targetBbox.x2) / 2,
      y: (targetBbox.y1 + targetBbox.y2) / 2,
    };
    
    const relationships: string[] = [];
    
    for (const otherMask of allMasks) {
      if (otherMask.mask_id === maskId) continue;
      
      const otherState = manipulationStates.get(otherMask.mask_id);
      const otherBbox = otherState?.currentBoundingBox || otherMask.bounding_box;
      const otherCenter = {
        x: (otherBbox.x1 + otherBbox.x2) / 2,
        y: (otherBbox.y1 + otherBbox.y2) / 2,
      };
      
      const dx = targetCenter.x - otherCenter.x;
      const dy = targetCenter.y - otherCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const direction = this.getDirection(dx, dy);
        relationships.push(`${direction} of ${otherMask.label}`);
      }
    }
    
    return relationships.join(', ') || 'isolated';
  }
  
  private getDirection(dx: number, dy: number): string {
    // Round to reduce cache size while maintaining accuracy
    const roundedDx = Math.round(dx * 10) / 10;
    const roundedDy = Math.round(dy * 10) / 10;
    const cacheKey = `${roundedDx},${roundedDy}`;
    
    // Check cache first
    const cached = directionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Calculate direction
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    let direction: string;
    if (angle >= -22.5 && angle < 22.5) direction = 'right';
    else if (angle >= 22.5 && angle < 67.5) direction = 'below-right';
    else if (angle >= 67.5 && angle < 112.5) direction = 'below';
    else if (angle >= 112.5 && angle < 157.5) direction = 'below-left';
    else if (angle >= 157.5 || angle < -157.5) direction = 'left';
    else if (angle >= -157.5 && angle < -112.5) direction = 'above-left';
    else if (angle >= -112.5 && angle < -67.5) direction = 'above';
    else direction = 'above-right';
    
    // Cache the result (limit cache size to prevent memory issues)
    if (directionCache.size < 1000) {
      directionCache.set(cacheKey, direction);
    }
    
    return direction;
  }
  
  /**
   * Update orientation metadata based on rotation angle.
   * Note: Moving an object does NOT change its orientation - only rotation does.
   * @param rotationDegrees - The rotation angle in degrees (0-360)
   * @param originalOrientation - The original orientation string (preserved if no rotation)
   */
  updateOrientationMetadata(
    rotationDegrees: number,
    originalOrientation?: string
  ): string {
    // If no rotation applied, preserve original orientation
    if (rotationDegrees === 0 && originalOrientation) {
      return originalOrientation;
    }
    
    // Normalize rotation to 0-360 range
    const normalized = ((rotationDegrees % 360) + 360) % 360;
    
    // Convert rotation angle to orientation description
    if (normalized < 22.5 || normalized >= 337.5) return 'facing forward';
    if (normalized < 67.5) return 'facing right';
    if (normalized < 112.5) return 'facing away';
    if (normalized < 157.5) return 'facing back-right';
    if (normalized < 202.5) return 'facing backward';
    if (normalized < 247.5) return 'facing back-left';
    if (normalized < 292.5) return 'facing away';
    return 'facing left';
  }
  
  updateRelativeSizeMetadata(
    newBoundingBox: BoundingBox,
    imageSize: { width: number; height: number }
  ): string {
    const width = newBoundingBox.x2 - newBoundingBox.x1;
    const height = newBoundingBox.y2 - newBoundingBox.y1;
    const area = width * height;
    const imageArea = imageSize.width * imageSize.height;
    const percentage = (area / imageArea) * 100;
    
    if (percentage < 5) return 'very small';
    if (percentage < 15) return 'small';
    if (percentage < 30) return 'medium';
    if (percentage < 50) return 'large';
    return 'very large';
  }
  
  updateAppearanceDetailsFromEdits(
    currentDetails: string,
    edits: MaskTransform['imageEdits']
  ): string {
    // Remove any existing adjustment information
    const baseDetails = currentDetails.replace(/\s*\(adjusted:.*?\)$/, '').trim();
    
    const adjustments: string[] = [];
    
    if (edits.brightness !== 0) {
      adjustments.push(`brightness ${edits.brightness > 0 ? '+' : ''}${edits.brightness}%`);
    }
    if (edits.contrast !== 0) {
      adjustments.push(`contrast ${edits.contrast > 0 ? '+' : ''}${edits.contrast}%`);
    }
    if (edits.exposure !== 0) {
      adjustments.push(`exposure ${edits.exposure > 0 ? '+' : ''}${edits.exposure}%`);
    }
    if (edits.blur !== 0) {
      adjustments.push(`blur ${edits.blur}px`);
    }
    
    if (adjustments.length === 0) {
      return baseDetails;
    }
    
    return baseDetails ? `${baseDetails} (adjusted: ${adjustments.join(', ')})` : `adjusted: ${adjustments.join(', ')}`;
  }
  
  updateShapeAndColorFromEdits(
    currentShapeColor: string,
    edits: MaskTransform['imageEdits']
  ): string {
    // Remove any existing adjustment information
    const baseShapeColor = currentShapeColor.replace(/\s*\(adjusted:.*?\)$/, '').trim();
    
    const adjustments: string[] = [];
    
    if (edits.saturation !== 0) {
      adjustments.push(`saturation ${edits.saturation > 0 ? '+' : ''}${edits.saturation}%`);
    }
    if (edits.hue !== 0) {
      adjustments.push(`hue shift ${edits.hue}°`);
    }
    if (edits.vibrance !== 0) {
      adjustments.push(`vibrance ${edits.vibrance > 0 ? '+' : ''}${edits.vibrance}%`);
    }
    
    if (adjustments.length === 0) {
      return baseShapeColor;
    }
    
    return baseShapeColor ? `${baseShapeColor} (adjusted: ${adjustments.join(', ')})` : `adjusted: ${adjustments.join(', ')}`;
  }
}
