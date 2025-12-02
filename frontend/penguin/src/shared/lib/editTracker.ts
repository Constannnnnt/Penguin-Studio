/**
 * Edit Tracker - Tracks user edits and generates modification prompts
 * 
 * This module tracks changes made to the scene configuration and generates
 * natural language descriptions of those changes for use with Bria's
 * modification API.
 */

export interface EditRecord {
  field: string;
  category: 'lighting' | 'aesthetics' | 'camera' | 'object' | 'background' | 'style';
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
  description: string;
}

export interface EditTrackerState {
  edits: EditRecord[];
  baselineConfig: Record<string, unknown> | null;
  listeners: Set<() => void>;
}

/**
 * Describe light direction in natural language
 */
const describeLightDirection = (direction: { x?: number; y?: number; rotation?: number; tilt?: number }): string => {
  const parts: string[] = [];
  const x = direction.x ?? 50;
  const y = direction.y ?? 50;
  const tilt = direction.tilt ?? 0;
  
  // Horizontal position
  if (x < 30) parts.push('from the left');
  else if (x > 70) parts.push('from the right');
  else parts.push('from center');
  
  // Vertical position
  if (y < 30) parts.push('above');
  else if (y > 70) parts.push('below');
  
  // Tilt/angle
  if (tilt < -20) parts.push('angled forward');
  else if (tilt > 20) parts.push('angled back');
  
  return parts.length > 0 ? `light ${parts.join(', ')}` : 'centered light';
};

const FIELD_DESCRIPTIONS: Record<string, (oldVal: unknown, newVal: unknown) => string> = {
  'lighting.conditions': (_, newVal) => `change lighting to ${newVal}`,
  'lighting.shadows': (_, newVal) => {
    const shadowLabels = ['no shadows', 'subtle shadows', 'soft shadows', 'moderate shadows', 'strong shadows', 'dramatic shadows'];
    return `change shadows to ${shadowLabels[newVal as number] || newVal}`;
  },
  'lighting.direction': (_, newVal) => {
    const dir = newVal as { x?: number; y?: number; rotation?: number; tilt?: number };
    return describeLightDirection(dir);
  },
  'aesthetics.composition': (_, newVal) => `use ${newVal} composition`,
  'aesthetics.color_scheme': (_, newVal) => `change color scheme to ${newVal}`,
  'aesthetics.mood_atmosphere': (_, newVal) => `set mood to ${newVal}`,
  'aesthetics.style_medium': (_, newVal) => `change style to ${newVal}`,
  'aesthetics.aesthetic_style': (_, newVal) => `make it more ${newVal}`,
  'photographic_characteristics.camera_angle': (_, newVal) => `change camera angle to ${newVal}`,
  'photographic_characteristics.lens_focal_length': (_, newVal) => `use ${newVal} lens`,
  'photographic_characteristics.depth_of_field': (oldVal, newVal) => {
    const old = oldVal as number;
    const curr = newVal as number;
    if (curr < old) return 'make depth of field shallower';
    return 'make depth of field deeper';
  },
  'photographic_characteristics.focus': (oldVal, newVal) => {
    const old = oldVal as number;
    const curr = newVal as number;
    if (curr > old) return 'sharpen the focus';
    return 'soften the focus';
  },
  'background_setting': (_, newVal) => `change background to ${(newVal as string).substring(0, 50)}`,
  'style_medium': (_, newVal) => `change overall style to ${newVal}`,
  'artistic_style': (_, newVal) => `make overall aesthetic more ${newVal}`,
  'aspect_ratio': (_, newVal) => `change aspect ratio to ${newVal}`,
};

/**
 * Generate a description for an object edit
 * Uses the object's description (core) as the label for better prompt clarity
 */
const describeObjectEdit = (
  objectIndex: number,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  objectLabel?: string
): string => {
  // Use the object's description as the label, falling back to generic label
  const label = objectLabel && objectLabel.trim() ? objectLabel : `object ${objectIndex + 1}`;
  
  switch (field) {
    case 'description':
      // When description changes, describe what it changed to
      return `change ${label} to ${newValue}`;
    case 'location':
      return `move ${label} to ${newValue}`;
    case 'relative_size':
      return `change ${label} size to ${newValue}`;
    case 'shape_and_color':
      return `change ${label} appearance to ${newValue}`;
    case 'texture':
      return `change ${label} texture to ${newValue}`;
    case 'appearance_details':
      return `change ${label} appearance details to ${newValue}`;
    case 'relationship':
      return `change ${label} relationship to ${newValue}`;
    case 'orientation':
      return `rotate ${label} to face ${newValue}`;
    case 'rotation':
      return `rotate ${label} by ${newValue} degrees`;
    case 'flip':
      return `flip ${label} ${newValue === 'flipped horizontally' ? 'horizontally (mirror)' : newValue === 'flipped vertically' ? 'vertically (upside down)' : ''}`;
    case 'pose':
      return `change ${label} pose to ${newValue}`;
    case 'expression':
      return `change ${label} expression to ${newValue}`;
    case 'action':
      return `make ${label} ${newValue}`;
    default:
      return `modify ${label}`;
  }
};

/**
 * Get nested value from object using dot notation path
 */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

/**
 * Compare two values for equality (handles objects)
 */
const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object' && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
};

/**
 * Create an edit tracker instance
 */
export const createEditTracker = (): {
  setBaseline: (config: Record<string, unknown>) => void;
  trackEdit: (path: string, oldValue: unknown, newValue: unknown, objectIndex?: number, objectLabel?: string) => void;
  getEdits: () => EditRecord[];
  getModificationPrompt: () => string;
  clearEdits: () => void;
  hasEdits: () => boolean;
  subscribe: (listener: () => void) => () => void;
} => {
  const state: EditTrackerState = {
    edits: [],
    baselineConfig: null,
    listeners: new Set(),
  };

  const notifyListeners = (): void => {
    // console.log('[EditTracker] Notifying listeners, count:', state.listeners.size, 'edits:', state.edits.length);
    state.listeners.forEach(listener => listener());
  };

  return {
    setBaseline: (config: Record<string, unknown>) => {
      state.baselineConfig = JSON.parse(JSON.stringify(config));
      state.edits = [];
      notifyListeners();
    },

    trackEdit: (path: string, oldValue: unknown, newValue: unknown, objectIndex?: number, objectLabel?: string) => {
      if (valuesEqual(oldValue, newValue)) return;

      let description: string;
      let category: EditRecord['category'];

      // Determine category and description
      if (path.startsWith('objects[')) {
        category = 'object';
        const field = path.split('.').pop() || '';
        description = describeObjectEdit(objectIndex ?? 0, field, oldValue, newValue, objectLabel);
      } else if (path.startsWith('lighting')) {
        category = 'lighting';
        description = FIELD_DESCRIPTIONS[path]?.(oldValue, newValue) || `change ${path}`;
      } else if (path.startsWith('aesthetics')) {
        category = 'aesthetics';
        description = FIELD_DESCRIPTIONS[path]?.(oldValue, newValue) || `change ${path}`;
      } else if (path.startsWith('photographic')) {
        category = 'camera';
        description = FIELD_DESCRIPTIONS[path]?.(oldValue, newValue) || `change ${path}`;
      } else if (path.includes('background')) {
        category = 'background';
        description = FIELD_DESCRIPTIONS[path]?.(oldValue, newValue) || `change background`;
      } else {
        category = 'style';
        description = FIELD_DESCRIPTIONS[path]?.(oldValue, newValue) || `change ${path}`;
      }

      // Check if we already have an edit for this path, update it
      const existingIndex = state.edits.findIndex(e => e.field === path);
      if (existingIndex >= 0) {
        state.edits[existingIndex] = {
          ...state.edits[existingIndex],
          newValue,
          timestamp: Date.now(),
          description,
        };
      } else {
        state.edits.push({
          field: path,
          category,
          oldValue,
          newValue,
          timestamp: Date.now(),
          description,
        });
      }
      
      notifyListeners();
    },

    getEdits: () => [...state.edits],

    getModificationPrompt: () => {
      if (state.edits.length === 0) return '';
      
      // Group edits by category for better readability
      const descriptions = state.edits.map(e => e.description);
      
      // Join with commas and 'and' for the last item
      if (descriptions.length === 1) {
        return descriptions[0];
      }
      
      const last = descriptions.pop();
      return `${descriptions.join(', ')} and ${last}`;
    },

    clearEdits: () => {
      state.edits = [];
      notifyListeners();
    },

    hasEdits: () => state.edits.length > 0,
    
    subscribe: (listener: () => void) => {
      state.listeners.add(listener);
      return () => {
        state.listeners.delete(listener);
      };
    },
  };
};

// Singleton instance for global edit tracking
export const editTracker = createEditTracker();
