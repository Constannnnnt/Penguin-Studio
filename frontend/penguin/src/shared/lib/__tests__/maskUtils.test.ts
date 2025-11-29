import { describe, it, expect } from 'vitest';
import {
  areBoundingBoxesEqual,
  getMaskColor,
  combineImageEditFilters,
  constrainBoundingBox,
} from '../maskUtils';
import type { BoundingBox } from '@/features/segmentation/store/segmentationStore';

describe('maskUtils', () => {
  describe('areBoundingBoxesEqual', () => {
    it('returns true for identical bounding boxes', () => {
      const bbox1: BoundingBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
      const bbox2: BoundingBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
      expect(areBoundingBoxesEqual(bbox1, bbox2)).toBe(true);
    });

    it('returns true for bounding boxes within threshold', () => {
      const bbox1: BoundingBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
      const bbox2: BoundingBox = { x1: 12, y1: 22, x2: 102, y2: 202 };
      expect(areBoundingBoxesEqual(bbox1, bbox2, 5)).toBe(true);
    });

    it('returns false for bounding boxes outside threshold', () => {
      const bbox1: BoundingBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
      const bbox2: BoundingBox = { x1: 20, y1: 30, x2: 110, y2: 210 };
      expect(areBoundingBoxesEqual(bbox1, bbox2, 5)).toBe(false);
    });

    it('uses default threshold of 5', () => {
      const bbox1: BoundingBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
      const bbox2: BoundingBox = { x1: 14, y1: 24, x2: 104, y2: 204 };
      expect(areBoundingBoxesEqual(bbox1, bbox2)).toBe(true);
    });
  });

  describe('getMaskColor', () => {
    it('returns consistent color for same mask ID', () => {
      const color1 = getMaskColor('mask-123');
      const color2 = getMaskColor('mask-123');
      expect(color1).toBe(color2);
    });

    it('returns different colors for different mask IDs', () => {
      const color1 = getMaskColor('mask-123');
      const color2 = getMaskColor('mask-456');
      expect(color1).not.toBe(color2);
    });

    it('returns valid hex color', () => {
      const color = getMaskColor('test-mask');
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('combineImageEditFilters', () => {
    it('returns empty string for default edits', () => {
      const edits = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('');
    });

    it('includes brightness filter when non-zero', () => {
      const edits = {
        brightness: 20,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('brightness(120%)');
    });

    it('includes contrast filter when non-zero', () => {
      const edits = {
        brightness: 0,
        contrast: -10,
        saturation: 0,
        hue: 0,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('contrast(90%)');
    });

    it('includes saturation filter when non-zero', () => {
      const edits = {
        brightness: 0,
        contrast: 0,
        saturation: 30,
        hue: 0,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('saturate(130%)');
    });

    it('includes hue filter when non-zero', () => {
      const edits = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 45,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('hue-rotate(45deg)');
    });

    it('includes blur filter when non-zero', () => {
      const edits = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 5,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('blur(5px)');
    });

    it('combines multiple filters', () => {
      const edits = {
        brightness: 10,
        contrast: 20,
        saturation: 0,
        hue: 0,
        blur: 0,
        exposure: 0,
        vibrance: 0,
      };
      expect(combineImageEditFilters(edits)).toBe('brightness(110%) contrast(120%)');
    });
  });

  describe('constrainBoundingBox', () => {
    const imageSize = { width: 800, height: 600 };

    it('returns same bbox when within boundaries', () => {
      const bbox: BoundingBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
      const constrained = constrainBoundingBox(bbox, imageSize);
      expect(constrained).toEqual(bbox);
    });

    it('constrains bbox that exceeds right boundary', () => {
      const bbox: BoundingBox = { x1: 750, y1: 20, x2: 850, y2: 200 };
      const constrained = constrainBoundingBox(bbox, imageSize);
      expect(constrained.x2).toBe(800);
      expect(constrained.x1).toBe(700);
    });

    it('constrains bbox that exceeds bottom boundary', () => {
      const bbox: BoundingBox = { x1: 10, y1: 550, x2: 100, y2: 650 };
      const constrained = constrainBoundingBox(bbox, imageSize);
      expect(constrained.y2).toBe(600);
      expect(constrained.y1).toBe(500);
    });

    it('constrains bbox that exceeds left boundary', () => {
      const bbox: BoundingBox = { x1: -50, y1: 20, x2: 50, y2: 200 };
      const constrained = constrainBoundingBox(bbox, imageSize);
      expect(constrained.x1).toBe(0);
      expect(constrained.x2).toBe(100);
    });

    it('constrains bbox that exceeds top boundary', () => {
      const bbox: BoundingBox = { x1: 10, y1: -50, x2: 100, y2: 50 };
      const constrained = constrainBoundingBox(bbox, imageSize);
      expect(constrained.y1).toBe(0);
      expect(constrained.y2).toBe(100);
    });

    it('maintains bbox dimensions when constraining', () => {
      const bbox: BoundingBox = { x1: -20, y1: 20, x2: 80, y2: 200 };
      const originalWidth = bbox.x2 - bbox.x1;
      const originalHeight = bbox.y2 - bbox.y1;
      
      const constrained = constrainBoundingBox(bbox, imageSize);
      const constrainedWidth = constrained.x2 - constrained.x1;
      const constrainedHeight = constrained.y2 - constrained.y1;
      
      expect(constrainedWidth).toBe(originalWidth);
      expect(constrainedHeight).toBe(originalHeight);
    });
  });
});
