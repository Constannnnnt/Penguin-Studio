import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AestheticsSection } from '../AestheticsSection';
import { useConfigStore } from '@/features/scene/store/configStore';

const mockUpdateSceneConfig = vi.fn();

vi.mock('@/features/scene/store/configStore', () => ({
  useConfigStore: vi.fn(),
}));

vi.mock('@/features/scene/lib/colorSchemeIntegration', () => ({
  applyColorScheme: vi.fn(),
  resetColorSchemeAndAdjustments: vi.fn(),
  getPreviousColorAdjustments: vi.fn(() => null),
}));

describe('AestheticsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useConfigStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
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
        updateSceneConfig: mockUpdateSceneConfig,
      };
      
      return selector(mockState);
    });
  });

  it('renders all aesthetic section headers', () => {
    render(<AestheticsSection />);
    
    expect(screen.getByText('Style Medium')).toBeInTheDocument();
    expect(screen.getByText('Aesthetic Style')).toBeInTheDocument();
    expect(screen.getByText('Composition')).toBeInTheDocument();
    expect(screen.getByText('Color Scheme')).toBeInTheDocument();
    expect(screen.getByText('Mood & Atmosphere')).toBeInTheDocument();
  });

  it('displays current values in section headers', () => {
    render(<AestheticsSection />);
    
    expect(screen.getByRole('button', { name: /Style Medium section, currently Photograph/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aesthetic Style section, currently Realistic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Composition section, currently Centered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Color Scheme section, currently Vibrant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mood & Atmosphere section, currently Neutral/i })).toBeInTheDocument();
  });

  it('sections are collapsed by default', () => {
    render(<AestheticsSection />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('expands section when header is clicked', () => {
    render(<AestheticsSection />);
    
    const styleMediumButton = screen.getByRole('button', { name: /Style Medium section/i });
    fireEvent.click(styleMediumButton);
    
    expect(styleMediumButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('implements accordion behavior - only one section expanded at a time', () => {
    render(<AestheticsSection />);
    
    const styleMediumButton = screen.getByRole('button', { name: /Style Medium section/i });
    const aestheticStyleButton = screen.getByRole('button', { name: /Aesthetic Style section/i });
    
    fireEvent.click(styleMediumButton);
    expect(styleMediumButton).toHaveAttribute('aria-expanded', 'true');
    
    fireEvent.click(aestheticStyleButton);
    expect(aestheticStyleButton).toHaveAttribute('aria-expanded', 'true');
    expect(styleMediumButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapses section when clicking the same header again', () => {
    render(<AestheticsSection />);
    
    const styleMediumButton = screen.getByRole('button', { name: /Style Medium section/i });
    
    fireEvent.click(styleMediumButton);
    expect(styleMediumButton).toHaveAttribute('aria-expanded', 'true');
    
    fireEvent.click(styleMediumButton);
    expect(styleMediumButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('maintains section order: Style Medium, Aesthetic Style, Composition, Mood & Atmosphere, Color Scheme', () => {
    render(<AestheticsSection />);
    
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((button) => button.textContent);
    
    expect(labels[0]).toContain('Style Medium');
    expect(labels[1]).toContain('Aesthetic Style');
    expect(labels[2]).toContain('Composition');
    expect(labels[3]).toContain('Mood & Atmosphere');
    expect(labels[4]).toContain('Color Scheme');
  });

  it('Color Scheme section is positioned last', () => {
    render(<AestheticsSection />);
    
    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];
    
    expect(lastButton.textContent).toContain('Color Scheme');
  });
});