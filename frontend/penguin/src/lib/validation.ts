import type { PenguinConfig } from '@/types';

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
