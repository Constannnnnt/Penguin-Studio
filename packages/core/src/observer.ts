import isEqual from 'lodash/isEqual';
import transform from 'lodash/transform';
import isObject from 'lodash/isObject';

export interface Delta {
  path: string;
  before: any;
  after: any;
}

/**
 * SRP: StateObserver is responsible ONLY for identifying what changed between two states.
 */
export class StateObserver {
  /**
   * Compare two objects and return a flat list of deltas.
   */
  public static diff(before: any, after: any, prefix = ''): Delta[] {
    const deltas: Delta[] = [];
    
    // Simple deep equals check for performance optimization on unchanged objects
    if (isEqual(before, after)) return deltas;

    // Handle primitive changes
    if (!isObject(before) || !isObject(after)) {
      deltas.push({ path: prefix, before, after });
      return deltas;
    }

    // Recurse through keys
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    
    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const bValue = (before as any)[key];
      const aValue = (after as any)[key];

      if (!isEqual(bValue, aValue)) {
        if (isObject(bValue) && isObject(aValue)) {
          deltas.push(...this.diff(bValue, aValue, path));
        } else {
          deltas.push({ path, before: bValue, after: aValue });
        }
      }
    }

    return deltas;
  }
}
