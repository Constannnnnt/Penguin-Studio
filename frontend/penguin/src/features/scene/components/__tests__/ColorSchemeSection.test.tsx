import { describe, it, expect } from 'vitest';
import { COLOR_SCHEME_MAPPINGS, COLOR_SCHEME_SWATCHES } from '@/features/scene/constants';

describe('Color Scheme Section Implementation', () => {
  it('should have all required color scheme mappings', () => {
    const requiredSchemes = ['vibrant', 'muted', 'monochrome', 'warm', 'cool'];
    
    requiredSchemes.forEach(scheme => {
      expect(COLOR_SCHEME_MAPPINGS[scheme]).toBeDefined();
      expect(COLOR_SCHEME_MAPPINGS[scheme]).toHaveProperty('saturation');
      expect(COLOR_SCHEME_MAPPINGS[scheme]).toHaveProperty('temperature');
      expect(COLOR_SCHEME_MAPPINGS[scheme]).toHaveProperty('tint');
      expect(COLOR_SCHEME_MAPPINGS[scheme]).toHaveProperty('vibrance');
    });
  });

  it('should have all required color scheme swatches', () => {
    const requiredSchemes = ['vibrant', 'muted', 'monochrome', 'warm', 'cool'];
    
    requiredSchemes.forEach(scheme => {
      expect(COLOR_SCHEME_SWATCHES[scheme]).toBeDefined();
      expect(COLOR_SCHEME_SWATCHES[scheme]).toContain('linear-gradient');
    });
  });

  it('should have matching keys between mappings and swatches', () => {
    const mappingKeys = Object.keys(COLOR_SCHEME_MAPPINGS).sort();
    const swatchKeys = Object.keys(COLOR_SCHEME_SWATCHES).sort();
    
    expect(mappingKeys).toEqual(swatchKeys);
  });
});
