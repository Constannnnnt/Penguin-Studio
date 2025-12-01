import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyColorScheme,
  revertColorScheme,
  getPreviousColorAdjustments,
  clearPreviousColorAdjustments,
  resetColorSchemeAndAdjustments,
  COLOR_SCHEME_MAPPINGS,
} from '../colorSchemeIntegration';
import { useImageEditStore } from '@/features/imageEdit/store/imageEditStore';
import { useConfigStore } from '@/features/scene/store/configStore';

describe('colorSchemeIntegration', () => {
  beforeEach(() => {
    const imageEditStore = useImageEditStore.getState();
    imageEditStore.resetImageEdits();
    
    const configStore = useConfigStore.getState();
    configStore.resetConfig();
    
    clearPreviousColorAdjustments();
  });

  describe('applyColorScheme', () => {
    it('should store previous color adjustments before applying new scheme', () => {
      const imageEditStore = useImageEditStore.getState();
      
      imageEditStore.setSaturation(20);
      imageEditStore.setTemperature(10);
      imageEditStore.setTint(5);
      imageEditStore.setVibrance(15);
      
      applyColorScheme('vibrant');
      
      const previous = getPreviousColorAdjustments();
      expect(previous).toEqual({
        saturation: 20,
        temperature: 10,
        tint: 5,
        vibrance: 15,
      });
    });

    it('should apply color scheme adjustments to image edit store', () => {
      applyColorScheme('vibrant');
      
      const state = useImageEditStore.getState();
      expect(state.saturation).toBe(COLOR_SCHEME_MAPPINGS.vibrant.saturation);
      expect(state.temperature).toBe(COLOR_SCHEME_MAPPINGS.vibrant.temperature);
      expect(state.tint).toBe(COLOR_SCHEME_MAPPINGS.vibrant.tint);
      expect(state.vibrance).toBe(COLOR_SCHEME_MAPPINGS.vibrant.vibrance);
    });

    it('should handle unknown color scheme gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      applyColorScheme('unknown-scheme');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown color scheme: unknown-scheme');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('revertColorScheme', () => {
    it('should restore previous color adjustments', () => {
      const imageEditStore = useImageEditStore.getState();
      
      imageEditStore.setSaturation(20);
      imageEditStore.setTemperature(10);
      imageEditStore.setTint(5);
      imageEditStore.setVibrance(15);
      
      applyColorScheme('vibrant');
      
      revertColorScheme();
      
      const state = useImageEditStore.getState();
      expect(state.saturation).toBe(20);
      expect(state.temperature).toBe(10);
      expect(state.tint).toBe(5);
      expect(state.vibrance).toBe(15);
    });

    it('should clear previous adjustments after reverting', () => {
      const imageEditStore = useImageEditStore.getState();
      
      imageEditStore.setSaturation(20);
      applyColorScheme('vibrant');
      
      revertColorScheme();
      
      expect(getPreviousColorAdjustments()).toBeNull();
    });

    it('should warn when no previous adjustments exist', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      revertColorScheme();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No previous color adjustments to revert to');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('manual adjustments preservation', () => {
    it('should preserve manual adjustments made after color scheme application', () => {
      const imageEditStore = useImageEditStore.getState();
      
      imageEditStore.setSaturation(10);
      imageEditStore.setTemperature(5);
      
      applyColorScheme('vibrant');
      
      imageEditStore.setSaturation(50);
      imageEditStore.setTemperature(20);
      
      const state = useImageEditStore.getState();
      expect(state.saturation).toBe(50);
      expect(state.temperature).toBe(20);
    });
  });

  describe('resetColorSchemeAndAdjustments', () => {
    it('should reset all image edits', () => {
      const imageEditStore = useImageEditStore.getState();
      
      imageEditStore.setSaturation(50);
      imageEditStore.setTemperature(30);
      imageEditStore.setBrightness(20);
      
      resetColorSchemeAndAdjustments();
      
      const state = useImageEditStore.getState();
      expect(state.saturation).toBe(0);
      expect(state.temperature).toBe(0);
      expect(state.brightness).toBe(0);
    });

    it('should reset color scheme to vibrant', () => {
      const configStore = useConfigStore.getState();
      
      configStore.updateSceneConfig('aesthetics.color_scheme', 'monochrome');
      
      resetColorSchemeAndAdjustments();
      
      const state = useConfigStore.getState();
      expect(state.sceneConfig.aesthetics.color_scheme).toBe('vibrant');
    });

    it('should clear previous color adjustments', () => {
      const imageEditStore = useImageEditStore.getState();
      
      imageEditStore.setSaturation(20);
      applyColorScheme('vibrant');
      
      resetColorSchemeAndAdjustments();
      
      expect(getPreviousColorAdjustments()).toBeNull();
    });
  });
});
