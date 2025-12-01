/**
 * Color scheme mappings and visual representations for the Aesthetics Section.
 * These constants define RGB/HDR adjustment values and CSS gradients for each color scheme.
 */

export interface ColorAdjustments {
  saturation: number;
  temperature: number;
  tint: number;
  vibrance: number;
}

/**
 * Mapping of color scheme names to their corresponding RGB/HDR adjustment values.
 * Values are applied to the Image Controls Tab when a color scheme is selected.
 */
export const COLOR_SCHEME_MAPPINGS: Record<string, ColorAdjustments> = {
  vibrant: {
    saturation: 40,
    temperature: 0,
    tint: 0,
    vibrance: 50,
  },
  muted: {
    saturation: -30,
    temperature: 0,
    tint: 0,
    vibrance: -20,
  },
  monochrome: {
    saturation: -100,
    temperature: 0,
    tint: 0,
    vibrance: -100,
  },
  warm: {
    saturation: 10,
    temperature: 35,
    tint: 15,
    vibrance: 20,
  },
  cool: {
    saturation: 10,
    temperature: -35,
    tint: -15,
    vibrance: 20,
  },
};

/**
 * CSS gradient representations for each color scheme.
 * Used to render visual swatches in the Color Scheme section.
 */
export const COLOR_SCHEME_SWATCHES: Record<string, string> = {
  vibrant: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #FFE66D 100%)',
  muted: 'linear-gradient(135deg, #A8A8A8 0%, #C4C4C4 50%, #D8D8D8 100%)',
  monochrome: 'linear-gradient(135deg, #000000 0%, #808080 50%, #FFFFFF 100%)',
  warm: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FDC830 100%)',
  cool: 'linear-gradient(135deg, #4A90E2 0%, #50C9C3 50%, #A8E6CF 100%)',
};
