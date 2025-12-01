import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PreviewGrid } from '../PreviewGrid';
import { AestheticOption } from '../CollapsibleAestheticOption';

describe('PreviewGrid', () => {
  const mockOptions: AestheticOption[] = [
    { value: 'option1', label: 'Option 1', previewSrc: '/preview1.jpg' },
    { value: 'option2', label: 'Option 2', previewSrc: '/preview2.jpg' },
    { value: 'option3', label: 'Option 3', previewSrc: '/preview3.jpg' },
  ];

  const defaultProps = {
    options: mockOptions,
    onSelect: vi.fn(),
    currentValue: 'option1',
  };

  it('renders all preview options', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    expect(screen.getByLabelText('Option 1, selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 3')).toBeInTheDocument();
  });

  it('renders images with correct src attributes', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/preview1.jpg');
    expect(images[1]).toHaveAttribute('src', '/preview2.jpg');
    expect(images[2]).toHaveAttribute('src', '/preview3.jpg');
  });

  it('renders images with alt text', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    expect(screen.getByAltText('Preview of Option 1 style')).toBeInTheDocument();
    expect(screen.getByAltText('Preview of Option 2 style')).toBeInTheDocument();
    expect(screen.getByAltText('Preview of Option 3 style')).toBeInTheDocument();
  });

  it('applies lazy loading to images', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('calls onSelect when an option is clicked', () => {
    const onSelect = vi.fn();
    render(<PreviewGrid {...defaultProps} onSelect={onSelect} />);
    
    const option2Button = screen.getByLabelText('Option 2');
    fireEvent.click(option2Button);
    
    expect(onSelect).toHaveBeenCalledWith('option2');
  });

  it('highlights the currently selected option', () => {
    render(<PreviewGrid {...defaultProps} currentValue="option2" />);
    
    const option2Button = screen.getByLabelText('Option 2, selected');
    expect(option2Button).toHaveClass('ring-2', 'ring-primary');
  });

  it('sets aria-checked correctly for selected option', () => {
    render(<PreviewGrid {...defaultProps} currentValue="option2" />);
    
    const option1Button = screen.getByLabelText('Option 1');
    const option2Button = screen.getByLabelText('Option 2, selected');
    
    expect(option1Button).toHaveAttribute('aria-checked', 'false');
    expect(option2Button).toHaveAttribute('aria-checked', 'true');
  });

  it('displays fallback placeholder when image fails to load', async () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const image = screen.getByAltText('Preview of Option 1 style');
    fireEvent.error(image);
    
    await waitFor(() => {
      expect(screen.getAllByText('Option 1').length).toBeGreaterThan(1);
    });
  });

  it('displays fallback for options without previewSrc', () => {
    const optionsWithoutSrc: AestheticOption[] = [
      { value: 'option1', label: 'Option 1' },
    ];
    
    render(<PreviewGrid {...defaultProps} options={optionsWithoutSrc} />);
    
    expect(screen.getAllByText('Option 1').length).toBeGreaterThan(0);
    const images = screen.queryAllByRole('img');
    expect(images).toHaveLength(0);
  });

  it('has proper ARIA radiogroup role', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const radiogroup = screen.getByRole('radiogroup', { name: 'Preview options' });
    expect(radiogroup).toBeInTheDocument();
  });

  it('applies consistent aspect ratio to all preview containers', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const buttons = screen.getAllByRole('radio');
    buttons.forEach(button => {
      const container = button.querySelector('.aspect-\\[4\\/3\\]');
      expect(container).toBeInTheDocument();
    });
  });

  it('applies responsive grid classes', () => {
    const { container } = render(<PreviewGrid {...defaultProps} />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'xs:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
  });

  it('applies hover effects with motion-reduce support', () => {
    const { container } = render(<PreviewGrid {...defaultProps} />);
    
    const imageContainers = container.querySelectorAll('.group-hover\\:scale-105');
    expect(imageContainers.length).toBeGreaterThan(0);
    
    imageContainers.forEach(container => {
      expect(container).toHaveClass('motion-reduce:group-hover:scale-100');
    });
  });

  it('displays label overlay on hover and selection', () => {
    const { container } = render(<PreviewGrid {...defaultProps} />);
    
    const overlays = container.querySelectorAll('.group-hover\\:opacity-100');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('handles image load event correctly', async () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const image = screen.getByAltText('Preview of Option 1 style');
    
    fireEvent.error(image);
    await waitFor(() => {
      const images = screen.queryAllByRole('img');
      expect(images.length).toBeLessThan(mockOptions.length);
    });
    
    fireEvent.load(image);
    await waitFor(() => {
      const images = screen.queryAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('maintains consistent sizing for all preview items', () => {
    const { container } = render(<PreviewGrid {...defaultProps} />);
    
    const aspectContainers = container.querySelectorAll('.aspect-\\[4\\/3\\]');
    expect(aspectContainers).toHaveLength(mockOptions.length);
    
    aspectContainers.forEach(container => {
      expect(container).toHaveClass('w-full');
    });
  });

  it('applies object-cover to maintain aspect ratio', () => {
    render(<PreviewGrid {...defaultProps} />);
    
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveClass('object-cover');
    });
  });
});
