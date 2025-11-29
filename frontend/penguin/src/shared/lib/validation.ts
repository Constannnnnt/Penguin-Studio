import type { PenguinConfig } from '@/core/types';

// ============================================================================
// Validation Result Interface
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitizes user input by removing potentially dangerous characters
 * and enforcing maximum length
 */
export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters (< and >)
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 1000); // Max length of 1000 characters
};

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validates that a URL is well-formed and uses http or https protocol
 */
export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validates a PenguinConfig object against all requirements
 * Returns validation result with list of errors if invalid
 */
export const validateConfig = (config: PenguinConfig): ValidationResult => {
  const errors: string[] = [];

  // Validate short_description
  if (!config.short_description || config.short_description.trim().length < 10) {
    errors.push('Scene description must be at least 10 characters');
  }

  // Validate objects
  config.objects.forEach((obj, index) => {
    // Validate required fields
    if (!obj.description || obj.description.trim().length === 0) {
      errors.push(`Object ${index + 1}: Description is required`);
    }

    if (!obj.shape_and_color || obj.shape_and_color.trim().length === 0) {
      errors.push(`Object ${index + 1}: Shape and color is required`);
    }

    if (!obj.location) {
      errors.push(`Object ${index + 1}: Location is required`);
    }

    if (!obj.relative_size) {
      errors.push(`Object ${index + 1}: Size is required`);
    }

    if (!obj.orientation) {
      errors.push(`Object ${index + 1}: Orientation is required`);
    }
  });

  // Validate lighting configuration
  if (!config.lighting?.conditions) {
    errors.push('Lighting conditions are required');
  }

  if (!config.lighting?.direction) {
    errors.push('Lighting direction is required');
  }

  if (!config.lighting?.shadows) {
    errors.push('Shadow quality is required');
  }

  // Validate aesthetics configuration
  if (!config.aesthetics?.composition) {
    errors.push('Composition is required');
  }

  if (!config.aesthetics?.color_scheme) {
    errors.push('Color scheme is required');
  }

  if (!config.aesthetics?.mood_atmosphere) {
    errors.push('Mood/atmosphere is required');
  }

  // Validate photographic characteristics
  if (!config.photographic_characteristics?.camera_angle) {
    errors.push('Camera angle is required');
  }

  if (!config.photographic_characteristics?.lens_focal_length) {
    errors.push('Lens focal length is required');
  }

  if (!config.photographic_characteristics?.depth_of_field) {
    errors.push('Depth of field is required');
  }

  if (!config.photographic_characteristics?.focus) {
    errors.push('Focus type is required');
  }

  // Validate style and medium
  if (!config.style_medium) {
    errors.push('Style medium is required');
  }

  if (!config.artistic_style) {
    errors.push('Artistic style is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validates a specific field value
 */
export const validateField = (
  fieldName: string,
  value: unknown,
  required: boolean = true
): string | null => {
  if (required && (value === null || value === undefined || value === '')) {
    return `${fieldName} is required`;
  }

  if (typeof value === 'string' && value.trim().length === 0 && required) {
    return `${fieldName} cannot be empty`;
  }

  return null;
};

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validates custom input strings for scene tab
 */
export const validateCustomInput = (
  input: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
    pattern?: RegExp;
    fieldName?: string;
  } = {}
): { valid: boolean; error?: string } => {
  const {
    minLength = 1,
    maxLength = 100,
    allowEmpty = false,
    pattern,
    fieldName = 'Input',
  } = options;

  const trimmed = input.trim();

  // Check if empty is allowed
  if (!allowEmpty && trimmed.length === 0) {
    return {
      valid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  // Check minimum length
  if (trimmed.length > 0 && trimmed.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  // Check maximum length
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be ${maxLength} characters or less`,
    };
  }

  // Check pattern if provided
  if (pattern && trimmed.length > 0 && !pattern.test(trimmed)) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }

  return { valid: true };
};

/**
 * Validates slider values for scene tab
 */
export const validateSliderValue = (
  value: number,
  options: {
    min?: number;
    max?: number;
    step?: number;
    fieldName?: string;
  } = {}
): { valid: boolean; error?: string } => {
  const {
    min = 0,
    max = 100,
    step = 1,
    fieldName = 'Value',
  } = options;

  // Check if value is a number
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  // Check range
  if (value < min || value > max) {
    return {
      valid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  // Check step alignment
  if (step > 0 && (value - min) % step !== 0) {
    return {
      valid: false,
      error: `${fieldName} must be in increments of ${step}`,
    };
  }

  return { valid: true };
};

/**
 * Validates lighting direction values
 */
export const validateLightingDirection = (
  direction: { x: number; y: number; rotation: number; tilt: number }
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate x coordinate (0-100)
  const xValidation = validateSliderValue(direction.x, {
    min: 0,
    max: 100,
    fieldName: 'X position',
  });
  if (!xValidation.valid && xValidation.error) {
    errors.push(xValidation.error);
  }

  // Validate y coordinate (0-100)
  const yValidation = validateSliderValue(direction.y, {
    min: 0,
    max: 100,
    fieldName: 'Y position',
  });
  if (!yValidation.valid && yValidation.error) {
    errors.push(yValidation.error);
  }

  // Validate rotation (0-360)
  const rotationValidation = validateSliderValue(direction.rotation, {
    min: 0,
    max: 360,
    fieldName: 'Rotation',
  });
  if (!rotationValidation.valid && rotationValidation.error) {
    errors.push(rotationValidation.error);
  }

  // Validate tilt (-90 to 90)
  const tiltValidation = validateSliderValue(direction.tilt, {
    min: -90,
    max: 90,
    fieldName: 'Tilt',
  });
  if (!tiltValidation.valid && tiltValidation.error) {
    errors.push(tiltValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validates JSON metadata for malformed structure
 */
export const validateJSONMetadata = (
  metadata: unknown
): { valid: boolean; error?: string; sanitized?: Record<string, unknown> } => {
  try {
    // Check if metadata is null or undefined
    if (metadata === null || metadata === undefined) {
      return {
        valid: false,
        error: 'Metadata is null or undefined',
      };
    }

    // Check if metadata is an object
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {
        valid: false,
        error: 'Metadata must be an object',
      };
    }

    // Sanitize the metadata object
    const sanitized: Record<string, unknown> = {};
    const metadataObj = metadata as Record<string, unknown>;

    for (const [key, value] of Object.entries(metadataObj)) {
      // Sanitize key
      const sanitizedKey = sanitizeInput(key);
      if (sanitizedKey.length === 0) continue;

      // Sanitize value based on type
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeInput(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (value !== null && typeof value === 'object') {
        // Recursively validate nested objects
        const nestedValidation = validateJSONMetadata(value);
        if (nestedValidation.valid && nestedValidation.sanitized) {
          sanitized[sanitizedKey] = nestedValidation.sanitized;
        }
      }
    }

    return {
      valid: true,
      sanitized,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Validates scene configuration
 */
export const validateSceneConfig = (
  config: unknown
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  const configObj = config as Record<string, unknown>;

  // Validate background_setting
  if (configObj.background_setting !== undefined) {
    const bgValidation = validateCustomInput(
      String(configObj.background_setting || ''),
      {
        maxLength: 500,
        allowEmpty: true,
        fieldName: 'Background setting',
      }
    );
    if (!bgValidation.valid && bgValidation.error) {
      errors.push(bgValidation.error);
    }
  }

  // Validate photographic_characteristics
  if (configObj.photographic_characteristics && typeof configObj.photographic_characteristics === 'object') {
    const photoChar = configObj.photographic_characteristics as Record<string, unknown>;
    
    // Validate depth_of_field
    if (photoChar.depth_of_field !== undefined) {
      const dofValidation = validateSliderValue(
        Number(photoChar.depth_of_field),
        { min: 0, max: 100, fieldName: 'Depth of field' }
      );
      if (!dofValidation.valid && dofValidation.error) {
        errors.push(dofValidation.error);
      }
    }

    // Validate focus
    if (photoChar.focus !== undefined) {
      const focusValidation = validateSliderValue(
        Number(photoChar.focus),
        { min: 0, max: 100, fieldName: 'Focus' }
      );
      if (!focusValidation.valid && focusValidation.error) {
        errors.push(focusValidation.error);
      }
    }
  }

  // Validate lighting
  if (configObj.lighting && typeof configObj.lighting === 'object') {
    const lighting = configObj.lighting as Record<string, unknown>;
    
    // Validate shadows
    if (lighting.shadows !== undefined) {
      const shadowValidation = validateSliderValue(
        Number(lighting.shadows),
        { min: 0, max: 5, fieldName: 'Shadow intensity' }
      );
      if (!shadowValidation.valid && shadowValidation.error) {
        errors.push(shadowValidation.error);
      }
    }

    // Validate direction
    if (lighting.direction && typeof lighting.direction === 'object') {
      const direction = lighting.direction as Record<string, unknown>;
      if (typeof direction.x === 'number' && typeof direction.y === 'number' &&
          typeof direction.rotation === 'number' && typeof direction.tilt === 'number') {
        const directionValidation = validateLightingDirection({
          x: direction.x,
          y: direction.y,
          rotation: direction.rotation,
          tilt: direction.tilt,
        });
        if (!directionValidation.valid) {
          errors.push(...directionValidation.errors);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
