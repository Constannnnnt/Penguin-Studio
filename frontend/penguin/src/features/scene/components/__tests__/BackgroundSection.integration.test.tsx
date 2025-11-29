import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackgroundSection } from '../BackgroundSection';
import { useConfigStore } from '@/features/scene/store/configStore';
import type { ShadowIntensity } from '@/core/types';

describe('BackgroundSection Integration', () => {
  beforeEach(() => {
    // Reset store to default state
    useConfigStore.getState().resetConfig();
  });

  it('integrates with real enhanced config store', async () => {
    render(<BackgroundSection />);
    
    // Should start with empty background setting
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveValue('');
    
    // Type new background setting
    fireEvent.change(textarea, { 
      target: { value: 'A serene mountain landscape with snow-capped peaks' } 
    });
    
    // Should update local state immediately
    expect(textarea).toHaveValue('A serene mountain landscape with snow-capped peaks');
    
    // Should update store after debounce delay
    await waitFor(() => {
      const storeValue = useConfigStore.getState().sceneConfig.background_setting;
      expect(storeValue).toBe('A serene mountain landscape with snow-capped peaks');
    }, { timeout: 500 });
  });

  it('verifies store integration works correctly', () => {
    // Test that the store methods exist and work
    const store = useConfigStore.getState();
    
    // Verify initial state
    expect(store.sceneConfig.background_setting).toBe('');
    
    // Update background setting
    store.updateConfig('background_setting', 'Test background');
    
    // Verify store was updated
    expect(useConfigStore.getState().sceneConfig.background_setting).toBe('Test background');
  });

  it('verifies semantic parsing integration works', () => {
    const store = useConfigStore.getState();
    
    // Simulate semantic parsing response
    const mockParsedData = {
      background_setting: 'A clean, seamless white studio backdrop',
      photographic_characteristics: {
        camera_angle: { value: 'eye-level', confidence: 0.9, isCustom: false },
        lens_focal_length: { value: 'standard', confidence: 0.8, isCustom: false },
        depth_of_field: { value: 50, confidence: 0.7, isCustom: false },
        focus: { value: 75, confidence: 0.8, isCustom: false },
      },
      lighting: {
        conditions: { value: 'natural', confidence: 0.9, isCustom: false },
        direction: { value: { x: 50, y: 30, rotation: 0, tilt: 0 }, confidence: 0.6, isCustom: false },
        shadows: { value: 2 as ShadowIntensity, confidence: 0.7, isCustom: false },
      },
      aesthetics: {
        style_medium: { value: 'photograph', confidence: 0.95, isCustom: false },
        aesthetic_style: { value: 'realistic', confidence: 0.9, isCustom: false },
      },
    };
    
    // Apply semantic parsing
    store.applySemanticParsing(mockParsedData);
    
    // Verify background setting was updated
    expect(useConfigStore.getState().sceneConfig.background_setting)
      .toBe('A clean, seamless white studio backdrop');
  });
});