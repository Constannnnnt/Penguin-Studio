import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AestheticsSection } from '../AestheticsSection';
import { useConfigStore } from '@/store';

// Mock the enhanced config store
const mockUpdateConfig = vi.fn();

vi.mock('@/store', () => ({
  useConfigStore: vi.fn(),
}));

describe('AestheticsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock store state
    (useConfigStore as any).mockImplementation((selector: any) => {
      const mockState = {
        sceneConfig: {
          aesthetics: {
            style_medium: 'photograph',
            aesthetic_style: 'realistic',
            composition: 'centered',
            color_scheme: 'vibrant',
            mood_atmosphere: 'neutral',
          },
        },
        updateConfig: mockUpdateConfig,
      };
      
      return selector(mockState);
    });
  });

  it('renders all aesthetic control sections', () => {
    render(<AestheticsSection />);
    
    expect(screen.getByText('Aesthetic & Style Configuration')).toBeInTheDocument();
    expect(screen.getByText('Style Medium')).toBeInTheDocument();
    expect(screen.getByText('Aesthetic Style')).toBeInTheDocument();
    expect(screen.getByText('Composition')).toBeInTheDocument();
    expect(screen.getByText('Color Scheme')).toBeInTheDocument();
    expect(screen.getByText('Mood & Atmosphere')).toBeInTheDocument();
  });

  it('displays current values correctly', () => {
    render(<AestheticsSection />);
    
    // Check that default values are displayed
    expect(screen.getByRole('button', { name: /photograph/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /realistic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /centered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vibrant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /neutral/i })).toBeInTheDocument();
  });

  it('includes custom input buttons for style medium and aesthetic style', () => {
    render(<AestheticsSection />);
    
    const customButtons = screen.getAllByText('Custom');
    expect(customButtons).toHaveLength(2); // One for style medium, one for aesthetic style
  });

  it('calls updateEnhancedConfig when style medium is changed', () => {
    render(<AestheticsSection />);
    
    const paintingButton = screen.getByRole('button', { name: /painting/i });
    fireEvent.click(paintingButton);
    
    expect(mockUpdateConfig).toHaveBeenCalledWith('aesthetics.style_medium', 'painting');
  });

  it('calls updateEnhancedConfig when aesthetic style is changed', () => {
    render(<AestheticsSection />);
    
    const artisticButton = screen.getByRole('button', { name: /artistic/i });
    fireEvent.click(artisticButton);
    
    expect(mockUpdateConfig).toHaveBeenCalledWith('aesthetics.aesthetic_style', 'artistic');
  });

  it('calls updateEnhancedConfig when composition is changed', () => {
    render(<AestheticsSection />);
    
    const ruleOfThirdsButton = screen.getByRole('button', { name: /rule of thirds/i });
    fireEvent.click(ruleOfThirdsButton);
    
    expect(mockUpdateConfig).toHaveBeenCalledWith('aesthetics.composition', 'rule of thirds');
  });

  it('handles custom style medium input', () => {
    render(<AestheticsSection />);
    
    // Find and click the first Custom button (style medium)
    const customButtons = screen.getAllByText('Custom');
    fireEvent.click(customButtons[0]);
    
    // Should show input field
    const input = screen.getByPlaceholderText('Enter custom style medium...');
    expect(input).toBeInTheDocument();
    
    // Type custom value and submit
    fireEvent.change(input, { target: { value: 'oil painting' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockUpdateConfig).toHaveBeenCalledWith('aesthetics.style_medium', 'oil painting');
  });

  it('handles custom aesthetic style input', () => {
    render(<AestheticsSection />);
    
    // Find and click the second Custom button (aesthetic style)
    const customButtons = screen.getAllByText('Custom');
    fireEvent.click(customButtons[1]);
    
    // Should show input field
    const input = screen.getByPlaceholderText('Enter custom aesthetic style...');
    expect(input).toBeInTheDocument();
    
    // Type custom value and submit
    fireEvent.change(input, { target: { value: 'surreal' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockUpdateConfig).toHaveBeenCalledWith('aesthetics.aesthetic_style', 'surreal');
  });
});