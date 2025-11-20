import { describe, it, expect } from 'vitest';
import { validateConfig, sanitizeInput, validateUrl } from '../validation';
import type { PenguinConfig } from '@/types';

// ============================================================================
// Test Helpers
// ============================================================================

const createValidConfig = (): PenguinConfig => ({
  short_description: 'A beautiful sunset scene with mountains',
  objects: [
    {
      description: 'A majestic mountain',
      location: 'center',
      relative_size: 'large',
      shape_and_color: 'triangular, snow-capped',
      orientation: 'front-facing',
    },
  ],
  background_setting: 'Clear blue sky',
  lighting: {
    conditions: 'golden hour',
    direction: 'front-lit',
    shadows: 'soft',
  },
  aesthetics: {
    composition: 'rule of thirds',
    color_scheme: 'warm',
    mood_atmosphere: 'calm',
    preference_score: '0.8',
    aesthetic_score: '0.9',
  },
  photographic_characteristics: {
    depth_of_field: 'deep',
    focus: 'sharp',
    camera_angle: 'eye-level',
    lens_focal_length: 'standard',
  },
  style_medium: 'photograph',
  artistic_style: 'realistic',
});

// ============================================================================
// validateConfig Tests
// ============================================================================

describe('validateConfig', () => {
  describe('with valid config', () => {
    it('should return valid result for complete config', () => {
      const config = createValidConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept config with multiple objects', () => {
      const config = createValidConfig();
      config.objects.push({
        description: 'A small tree',
        location: 'bottom-left',
        relative_size: 'small',
        shape_and_color: 'green, leafy',
        orientation: 'front-facing',
      });

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept config with optional object fields', () => {
      const config = createValidConfig();
      config.objects[0].texture = 'rough';
      config.objects[0].appearance_details = 'weathered';
      config.objects[0].pose = 'standing';
      config.objects[0].expression = 'neutral';
      config.objects[0].action = 'observing';

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept config with exactly 10 character description', () => {
      const config = createValidConfig();
      config.short_description = '1234567890';

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('with invalid config', () => {
    it('should reject config with short description less than 10 characters', () => {
      const config = createValidConfig();
      config.short_description = 'Short';

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scene description must be at least 10 characters');
    });

    it('should reject config with empty short description', () => {
      const config = createValidConfig();
      config.short_description = '';

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scene description must be at least 10 characters');
    });

    it('should reject config with whitespace-only short description', () => {
      const config = createValidConfig();
      config.short_description = '   ';

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scene description must be at least 10 characters');
    });

    it('should reject object without description', () => {
      const config = createValidConfig();
      config.objects[0].description = '';

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object 1: Description is required');
    });

    it('should reject object without shape_and_color', () => {
      const config = createValidConfig();
      config.objects[0].shape_and_color = '';

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object 1: Shape and color is required');
    });

    it('should reject object without location', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.objects[0].location = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object 1: Location is required');
    });

    it('should reject object without relative_size', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.objects[0].relative_size = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object 1: Size is required');
    });

    it('should reject object without orientation', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.objects[0].orientation = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object 1: Orientation is required');
    });

    it('should validate multiple objects and report all errors', () => {
      const config = createValidConfig();
      config.objects.push({
        description: '',
        location: 'center',
        relative_size: 'medium',
        shape_and_color: '',
        orientation: 'front-facing',
      });

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object 2: Description is required');
      expect(result.errors).toContain('Object 2: Shape and color is required');
    });

    it('should reject config without lighting conditions', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.lighting.conditions = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lighting conditions are required');
    });

    it('should reject config without lighting direction', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.lighting.direction = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lighting direction is required');
    });

    it('should reject config without shadow quality', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.lighting.shadows = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Shadow quality is required');
    });

    it('should reject config without composition', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.aesthetics.composition = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Composition is required');
    });

    it('should reject config without color_scheme', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.aesthetics.color_scheme = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Color scheme is required');
    });

    it('should reject config without mood_atmosphere', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.aesthetics.mood_atmosphere = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mood/atmosphere is required');
    });

    it('should reject config without camera_angle', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.photographic_characteristics.camera_angle = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Camera angle is required');
    });

    it('should reject config without lens_focal_length', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.photographic_characteristics.lens_focal_length = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lens focal length is required');
    });

    it('should reject config without depth_of_field', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.photographic_characteristics.depth_of_field = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Depth of field is required');
    });

    it('should reject config without focus', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.photographic_characteristics.focus = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Focus type is required');
    });

    it('should reject config without style_medium', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.style_medium = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Style medium is required');
    });

    it('should reject config without artistic_style', () => {
      const config = createValidConfig();
      // @ts-expect-error Testing invalid state
      config.artistic_style = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Artistic style is required');
    });

    it('should accumulate multiple validation errors', () => {
      const config = createValidConfig();
      config.short_description = 'Short';
      config.objects[0].description = '';
      // @ts-expect-error Testing invalid state
      config.lighting.conditions = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
      expect(result.errors).toContain('Scene description must be at least 10 characters');
      expect(result.errors).toContain('Object 1: Description is required');
      expect(result.errors).toContain('Lighting conditions are required');
    });
  });
});

// ============================================================================
// sanitizeInput Tests
// ============================================================================

describe('sanitizeInput', () => {
  it('should return input unchanged when no dangerous characters', () => {
    const input = 'This is a safe string';
    const result = sanitizeInput(input);

    expect(result).toBe('This is a safe string');
  });

  it('should remove < characters', () => {
    const input = 'Text with < character';
    const result = sanitizeInput(input);

    expect(result).toBe('Text with  character');
    expect(result).not.toContain('<');
  });

  it('should remove > characters', () => {
    const input = 'Text with > character';
    const result = sanitizeInput(input);

    expect(result).toBe('Text with  character');
    expect(result).not.toContain('>');
  });

  it('should remove both < and > characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);

    expect(result).toBe('scriptalert("xss")/script');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('should trim whitespace from start and end', () => {
    const input = '   text with spaces   ';
    const result = sanitizeInput(input);

    expect(result).toBe('text with spaces');
  });

  it('should preserve internal whitespace', () => {
    const input = 'text   with   multiple   spaces';
    const result = sanitizeInput(input);

    expect(result).toBe('text   with   multiple   spaces');
  });

  it('should truncate input longer than 1000 characters', () => {
    const input = 'a'.repeat(1500);
    const result = sanitizeInput(input);

    expect(result.length).toBe(1000);
    expect(result).toBe('a'.repeat(1000));
  });

  it('should handle input exactly 1000 characters', () => {
    const input = 'b'.repeat(1000);
    const result = sanitizeInput(input);

    expect(result.length).toBe(1000);
    expect(result).toBe(input);
  });

  it('should handle empty string', () => {
    const input = '';
    const result = sanitizeInput(input);

    expect(result).toBe('');
  });

  it('should handle whitespace-only string', () => {
    const input = '     ';
    const result = sanitizeInput(input);

    expect(result).toBe('');
  });

  it('should handle special characters except < and >', () => {
    const input = 'Text with !@#$%^&*()_+-=[]{}|;:\'",./? characters';
    const result = sanitizeInput(input);

    expect(result).toBe('Text with !@#$%^&*()_+-=[]{}|;:\'",./? characters');
  });

  it('should handle unicode characters', () => {
    const input = 'Text with émojis 🎨 and ñ characters';
    const result = sanitizeInput(input);

    expect(result).toBe('Text with émojis 🎨 and ñ characters');
  });

  it('should combine all sanitization rules', () => {
    const input = '  <div>Text with dangerous chars</div>  ';
    const result = sanitizeInput(input);

    expect(result).toBe('divText with dangerous chars/div');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

// ============================================================================
// validateUrl Tests
// ============================================================================

describe('validateUrl', () => {
  describe('with valid URLs', () => {
    it('should accept http URL', () => {
      const url = 'http://example.com';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept https URL', () => {
      const url = 'https://example.com';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept URL with path', () => {
      const url = 'https://example.com/path/to/resource';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept URL with query parameters', () => {
      const url = 'https://example.com/path?param1=value1&param2=value2';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept URL with fragment', () => {
      const url = 'https://example.com/path#section';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept URL with port', () => {
      const url = 'http://localhost:8000';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept URL with subdomain', () => {
      const url = 'https://api.example.com';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept URL with authentication', () => {
      const url = 'https://user:pass@example.com';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });

    it('should accept complex URL', () => {
      const url = 'https://user:pass@api.example.com:8080/path/to/resource?param=value#section';
      const result = validateUrl(url);

      expect(result).toBe(true);
    });
  });

  describe('with invalid URLs', () => {
    it('should reject empty string', () => {
      const url = '';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject malformed URL', () => {
      const url = 'not a url';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject URL without protocol', () => {
      const url = 'example.com';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject ftp protocol', () => {
      const url = 'ftp://example.com';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject file protocol', () => {
      const url = 'file:///path/to/file';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject javascript protocol', () => {
      const url = 'javascript:alert("xss")';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject data protocol', () => {
      const url = 'data:text/html,<script>alert("xss")</script>';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject URL with only protocol', () => {
      const url = 'https://';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject URL with spaces', () => {
      const url = 'https://example .com';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });

    it('should reject relative URL', () => {
      const url = '/path/to/resource';
      const result = validateUrl(url);

      expect(result).toBe(false);
    });
  });
});
