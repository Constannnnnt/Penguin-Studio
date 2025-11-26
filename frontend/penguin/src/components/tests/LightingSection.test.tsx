import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LightingSection } from '@/components/LightingSection';
import { useConfigStore } from '@/store';

// Mock the enhanced config store
const mockStore = {
  sceneConfig: {
    lighting: {
      conditions: 'natural',
      direction: {
        x: 50,
        y: 30,
        rotation: 0,
        tilt: 0,
      },
      shadows: 2,
    },
  },
  updateConfig: () => {},
};

// Mock zustand store
vi.mock('@/store', () => ({
  useConfigStore: vi.fn(),
}));

describe('LightingSection', () => {
  beforeEach(() => {
    vi.mocked(useConfigStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore as any);
      }
      return mockStore;
    });
  });

  it('renders lighting configuration card', () => {
    render(<LightingSection />);
    
    expect(screen.getByText('Lighting Configuration')).toBeInTheDocument();
  });

  it('renders lighting conditions section', () => {
    render(<LightingSection />);
    
    expect(screen.getByText('Lighting Conditions')).toBeInTheDocument();
  });

  it('renders shadow intensity slider', () => {
    render(<LightingSection />);
    
    expect(screen.getByText('Shadow Intensity')).toBeInTheDocument();
  });

  it('renders lighting direction control', () => {
    render(<LightingSection />);
    
    expect(screen.getByText('Lighting Direction')).toBeInTheDocument();
  });

  it('renders custom input button', () => {
    render(<LightingSection />);
    
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});