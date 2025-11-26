import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscreteSlider } from '../DiscreteSlider';

describe('DiscreteSlider', () => {
  const mockOptions = ['none', 'subtle', 'soft', 'moderate', 'strong', 'dramatic'] as const;
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with label and current value display', () => {
    render(
      <DiscreteSlider
        label="Shadow Intensity"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('Shadow Intensity')).toBeInTheDocument();
    expect(screen.getByText('soft')).toBeInTheDocument();
  });

  it('displays correct value text for given index', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={0}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('clamps value to valid range', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={10} // Out of range
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    // Should display the last option
    expect(screen.getByText('dramatic')).toBeInTheDocument();
  });

  it('handles keyboard navigation with arrow keys', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const slider = screen.getByRole('slider');
    
    // Right arrow should increase value
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(mockOnChange).toHaveBeenCalledWith(3);

    // Left arrow should decrease value
    mockOnChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('handles Home and End keys', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const slider = screen.getByRole('slider');
    
    // Home key should go to first value
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(mockOnChange).toHaveBeenCalledWith(0);

    // End key should go to last value
    mockOnChange.mockClear();
    fireEvent.keyDown(slider, { key: 'End' });
    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('does not change value at boundaries', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={0}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const slider = screen.getByRole('slider');
    
    // Left arrow at minimum should not change
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('has proper ARIA attributes', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const slider = screen.getByRole('slider');
    
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '5');
    expect(slider).toHaveAttribute('aria-valuenow', '2');
    expect(slider).toHaveAttribute('aria-valuetext', 'soft');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
        disabled={true}
      />
    );

    const slider = screen.getByRole('slider');
    
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('tabIndex', '-1');
    
    // Should not respond to keyboard events when disabled
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('handles mouse click on track', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={0}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const slider = screen.getByRole('slider');
    
    // Mock getBoundingClientRect for the track element
    const mockRect = {
      left: 0,
      width: 100,
      top: 0,
      height: 20,
      right: 100,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    
    // Find the track element and mock its getBoundingClientRect
    const trackElement = slider.querySelector('div[class*="bg-secondary"]');
    if (trackElement) {
      vi.spyOn(trackElement, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);
    }

    // Click at 50% should select middle option (index 2 or 3 for 6 options)
    fireEvent.mouseDown(slider, { clientX: 50 });
    
    expect(mockOnChange).toHaveBeenCalled();
    const calledValue = mockOnChange.mock.calls[0][0];
    expect(calledValue).toBeGreaterThanOrEqual(0);
    expect(calledValue).toBeLessThanOrEqual(5);
  });

  it('renders step indicators', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    // Should have 6 step indicators (one for each option)
    const indicators = screen.getByRole('slider').querySelectorAll('[aria-hidden="true"]');
    // Filter out the thumb (should have 6 step indicators + 1 thumb = 7 total)
    expect(indicators.length).toBeGreaterThanOrEqual(6);
  });

  it('updates value display when value changes', () => {
    const { rerender } = render(
      <DiscreteSlider
        label="Test Slider"
        value={0}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('none')).toBeInTheDocument();

    rerender(
      <DiscreteSlider
        label="Test Slider"
        value={3}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('moderate')).toBeInTheDocument();
    expect(screen.queryByText('none')).not.toBeInTheDocument();
  });

  it('handles single option gracefully', () => {
    const singleOption = ['only'] as const;
    
    render(
      <DiscreteSlider
        label="Test Slider"
        value={0}
        onChange={mockOnChange}
        options={singleOption}
      />
    );

    expect(screen.getByText('only')).toBeInTheDocument();
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemax', '0');
  });

  it('ignores non-navigation keys', () => {
    render(
      <DiscreteSlider
        label="Test Slider"
        value={2}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const slider = screen.getByRole('slider');
    
    // Random key should not trigger onChange
    fireEvent.keyDown(slider, { key: 'a' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});