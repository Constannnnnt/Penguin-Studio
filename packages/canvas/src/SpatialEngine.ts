export interface Point { x: number; y: number; }
export interface Box { x1: number; y1: number; x2: number; y2: number; }

/**
 * SRP: SpatialEngine is responsible ONLY for the math of coordinate systems and constraints.
 */
export class SpatialEngine {
  /**
   * Constrain a box within a container while maintaining aspect ratio or clamping.
   */
  public static clampBox(box: Box, container: Box): Box {
    return {
      x1: Math.max(container.x1, Math.min(container.x2, box.x1)),
      y1: Math.max(container.y1, Math.min(container.y2, box.y1)),
      x2: Math.max(container.x1, Math.min(container.x2, box.x2)),
      y2: Math.max(container.y1, Math.min(container.y2, box.y2)),
    };
  }

  /**
   * Translate a screen coordinate to a normalized (0-1) coordinate.
   */
  public static normalize(p: Point, container: Box): Point {
    const width = container.x2 - container.x1;
    const height = container.y2 - container.y1;
    return {
      x: (p.x - container.x1) / width,
      y: (p.y - container.y1) / height,
    };
  }

  /**
   * Denormalize back to pixel coordinates.
   */
  public static denormalize(p: Point, container: Box): Point {
    const width = container.x2 - container.x1;
    const height = container.y2 - container.y1;
    return {
      x: container.x1 + p.x * width,
      y: container.y1 + p.y * height,
    };
  }
}
