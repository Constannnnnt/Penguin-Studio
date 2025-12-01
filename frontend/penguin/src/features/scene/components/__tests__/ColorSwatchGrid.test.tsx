import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColorSwatchGrid } from '../ColorSwatchGrid';
import { AestheticOption } from '../CollapsibleAestheticOption';

describe('ColorSwatchGrid', () => {
  const mockOptions: AestheticOption[] = [
    {
      value: 'vibrant',
      label: 'Vibrant',
      previewSrc: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #FFE66D 100%)',
      colorValues: { saturation: 40, temperature: 0, tint: 0, vibrance: 50 },
    },
    {
      value: 'muted',
      label: 'Muted',
      previewSrc: 'linear-gradient(135deg, #A8A8A8 0%, #C4C4C4 50%, #D8D8D8 100%)',
      colorValues: { saturation: -30, temperature: 0, tint: 0, vibrance: -20 },
    },
    {
      value: 'monochrome',
      label: 'Monochrome',
      previewSrc: 'linear-gradient(135deg, #000000 0%, #808080 50%, #FFFFFF 100%)',
      colorValues: { saturation: -100, temperature: 0, tint: 0, vibrance: -100 },
    },
  ];

  const defaultProps = {
    options: mockOptions,
    onSelect: vi.fn(),
    currentValue: 'vibrant',
  };

  it('renders all color swatch options', () => {
    render(<ColorSwatchGrid {...defaultProps} />);
    
    expect(screen.getByLabelText('Vibrant color scheme, selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Muted color scheme')).toBeInTheDocument();
    expect(screen.getByLabelText('Monochrome color scheme')).toBeInTheDocument();
  });

  it('displays color scheme names below swatches', () => {
    render(<ColorSwatchGrid {...defaultProps} />);
    
    expect(screen.getByText('Vibrant')).toBeInTheDocument();
    expect(screen.getByText('Muted')).toBeInTheDocument();
    expect(screen.getByText('Monochrome')).toBeInTheDocument();
  });

  it('renders CSS gradients for each color scheme', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const swatches = container.querySelectorAll('[style*="background"]');
    expect(swatches.length).toBeGreaterThan(0);
    
    const vibrantSwatch = swatches[0] as HTMLElement;
    expect(vibrantSwatch.style.background).toContain('linear-gradient');
  });

  it('calls onSelect when a color swatch is clicked', () => {
    const onSelect = vi.fn();
    render(<ColorSwatchGrid {...defaultProps} onSelect={onSelect} />);
    
    const mutedButton = screen.getByLabelText('Muted color scheme');
    fireEvent.click(mutedButton);
    
    expect(onSelect).toHaveBeenCalledWith('muted');
  });

  it('highlights the currently selected color scheme', () => {
    render(<ColorSwatchGrid {...defaultProps} currentValue="muted" />);
    
    const mutedButton = screen.getByLabelText('Muted color scheme, selected');
    expect(mutedButton).toHaveClass('ring-2', 'ring-primary');
  });

  it('sets aria-checked correctly for selected option', () => {
    render(<ColorSwatchGrid {...defaultProps} currentValue="muted" />);
    
    const vibrantButton = screen.getByLabelText('Vibrant color scheme');
    const mutedButton = screen.getByLabelText('Muted color scheme, selected');
    
    expect(vibrantButton).toHaveAttribute('aria-checked', 'false');
    expect(mutedButton).toHaveAttribute('aria-checked', 'true');
  });

  it('has proper ARIA radiogroup role', () => {
    render(<ColorSwatchGrid {...defaultProps} />);
    
    const radiogroup = screen.getByRole('radiogroup', { name: 'Color scheme options' });
    expect(radiogroup).toBeInTheDocument();
  });

  it('applies responsive grid classes', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-5');
  });

  it('applies hover effects with motion-reduce support', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const swatchContainers = container.querySelectorAll('.group-hover\\:scale-105');
    expect(swatchContainers.length).toBeGreaterThan(0);
    
    swatchContainers.forEach(container => {
      expect(container).toHaveClass('motion-reduce:group-hover:scale-100');
    });
  });

  it('applies square aspect ratio to all swatches', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const aspectContainers = container.querySelectorAll('.aspect-square');
    expect(aspectContainers).toHaveLength(mockOptions.length);
  });

  it('applies hover overlay effects', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const overlays = container.querySelectorAll('.group-hover\\:bg-primary\\/10');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('highlights selected swatch with overlay', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} currentValue="vibrant" />);
    
    const overlays = container.querySelectorAll('.bg-primary\\/20');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('applies focus-visible styles for keyboard navigation', () => {
    render(<ColorSwatchGrid {...defaultProps} />);
    
    const buttons = screen.getAllByRole('radio');
    buttons.forEach(button => {
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });
  });

  it('renders fallback gradient when previewSrc is missing', () => {
    const optionsWithoutGradient: AestheticOption[] = [
      { value: 'custom', label: 'Custom' },
    ];
    
    const { container } = render(
      <ColorSwatchGrid {...defaultProps} options={optionsWithoutGradient} />
    );
    
    const swatches = container.querySelectorAll('[style*="background"]');
    expect(swatches.length).toBeGreaterThan(0);
    
    const customSwatch = swatches[0] as HTMLElement;
    expect(customSwatch.style.background).toContain('linear-gradient');
  });

  it('applies consistent sizing for all color swatches', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const aspectContainers = container.querySelectorAll('.aspect-square');
    expect(aspectContainers).toHaveLength(mockOptions.length);
    
    aspectContainers.forEach(container => {
      expect(container).toHaveClass('w-full');
    });
  });

  it('displays label with proper styling for selected item', () => {
    render(<ColorSwatchGrid {...defaultProps} currentValue="vibrant" />);
    
    const vibrantLabel = screen.getByText('Vibrant');
    expect(vibrantLabel).toHaveClass('text-primary');
  });

  it('displays label with default styling for non-selected items', () => {
    render(<ColorSwatchGrid {...defaultProps} currentValue="vibrant" />);
    
    const mutedLabel = screen.getByText('Muted');
    expect(mutedLabel).toHaveClass('text-foreground');
  });

  it('applies transition effects to all interactive elements', () => {
    const { container } = render(<ColorSwatchGrid {...defaultProps} />);
    
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('transition-all', 'duration-300');
    });
  });
});
