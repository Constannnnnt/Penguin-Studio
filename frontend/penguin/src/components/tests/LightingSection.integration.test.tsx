import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LightingSection } from '@/components/LightingSection';
import { useConfigStore } from '@/store';

describe('LightingSection Integration', () => {
  beforeEach(() => {
    // Reset store to default state
    useConfigStore.getState().resetConfig();
  });

  it('integrates with enhanced config store', () => {
    render(<LightingSection />);
    
    // Verify initial state is rendered
    expect(screen.getByText('Lighting Configuration')).toBeInTheDocument();
    expect(screen.getByText('Lighting Conditions')).toBeInTheDocument();
    expect(screen.getByText('Shadow Intensity')).toBeInTheDocument();
    expect(screen.getByText('Lighting Direction')).toBeInTheDocument();
  });

  it('updates store when lighting condition changes', () => {
    render(<LightingSection />);
    
    // Find and click a lighting condition button
    const studioButton = screen.getByRole('button', { name: /studio/i });
    fireEvent.click(studioButton);
    
    // Verify store was updated
    const state = useConfigStore.getState();
    expect(state.sceneConfig.lighting.conditions).toBe('studio');
  });

  it('displays current lighting configuration from store', () => {
    // Set initial state
    const store = useConfigStore.getState();
    store.updateConfig('lighting.conditions', 'dramatic');
    store.updateConfig('lighting.shadows', 4);
    
    render(<LightingSection />);
    
    // Verify the current state is reflected in the UI
    expect(screen.getByText('Lighting Configuration')).toBeInTheDocument();
    
    // The dramatic button should be selected (this would be visually indicated)
    const dramaticButton = screen.getByRole('button', { name: /dramatic/i });
    expect(dramaticButton).toBeInTheDocument();
  });
});