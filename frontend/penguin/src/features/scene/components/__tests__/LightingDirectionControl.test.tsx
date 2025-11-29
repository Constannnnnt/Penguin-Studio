import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightingDirectionControl } from '../LightingDirectionControl';
import type { LightingDirectionValue } from '@/core/types';

describe('LightingDirectionControl', () => {
  const mockValue: LightingDirectionValue = {
    x: 50,
    y: 30,
    rotation: 0,
    tilt: 0,
  };
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with label and position display', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Horizontal: 50%/)).toBeInTheDocument();
    expect(screen.getByText(/Vertical: 30%/)).toBeInTheDocument();
  });

  it('displays current values correctly', () => {
    const testValue: LightingDirectionValue = {
      x: 75,
      y: 25,
      rotation: 45,
      tilt: -30,
    };

    render(
      <LightingDirectionControl
        value={testValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Horizontal: 75%/)).toBeInTheDocument();
    expect(screen.getByText(/Vertical: 25%/)).toBeInTheDocument();
    expect(screen.getByText(/Angle: 45°/)).toBeInTheDocument();
    expect(screen.getByText(/Depth: -30/)).toBeInTheDocument();
  });

  it('clamps values to valid ranges', () => {
    const outOfRangeValue: LightingDirectionValue = {
      x: 150, // Should clamp to 100
      y: -50, // Should clamp to 0
      rotation: 450, // Should normalize to 90
      tilt: 120, // Should clamp to 90
    };

    render(
      <LightingDirectionControl
        value={outOfRangeValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Horizontal: 100%/)).toBeInTheDocument();
    expect(screen.getByText(/Vertical: 0%/)).toBeInTheDocument();
    expect(screen.getByText(/Angle: 90°/)).toBeInTheDocument();
    expect(screen.getByText(/Depth: 90/)).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    vi.useFakeTimers();
    
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    // Right arrow should increase x
    fireEvent.keyDown(flashlight, { key: 'ArrowRight' });
    vi.runAllTimers();
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      x: 51,
    });

    // Left arrow should decrease x
    mockOnChange.mockClear();
    fireEvent.keyDown(flashlight, { key: 'ArrowLeft' });
    vi.runAllTimers();
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      x: 49,
    });

    // Up arrow should decrease y
    mockOnChange.mockClear();
    fireEvent.keyDown(flashlight, { key: 'ArrowUp' });
    vi.runAllTimers();
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      y: 29,
    });

    // Down arrow should increase y
    mockOnChange.mockClear();
    fireEvent.keyDown(flashlight, { key: 'ArrowDown' });
    vi.runAllTimers();
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      y: 31,
    });
    
    vi.useRealTimers();
  });

  it('handles rotation and tilt keyboard controls', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    // R key should increase rotation
    fireEvent.keyDown(flashlight, { key: 'r' });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      rotation: 15,
    });

    // T key should increase tilt
    mockOnChange.mockClear();
    fireEvent.keyDown(flashlight, { key: 't' });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      tilt: 15,
    });
  });

  it('handles Home key to center position', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    fireEvent.keyDown(flashlight, { key: 'Home' });
    expect(mockOnChange).toHaveBeenCalledWith({
      x: 50,
      y: 50,
      rotation: 0,
      tilt: 0,
    });
  });

  it('handles Shift key for larger steps', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    // Shift + Right arrow should increase x by 10
    fireEvent.keyDown(flashlight, { key: 'ArrowRight', shiftKey: true });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockValue,
      x: 60,
    });
  });

  it('respects boundary constraints for keyboard navigation', () => {
    const boundaryValue: LightingDirectionValue = {
      x: 0,
      y: 0,
      rotation: 0,
      tilt: -90,
    };

    render(
      <LightingDirectionControl
        value={boundaryValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    // Left arrow at x=0 should not go below 0
    fireEvent.keyDown(flashlight, { key: 'ArrowLeft' });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...boundaryValue,
      x: 0, // Should stay at 0
    });

    // Up arrow at y=0 should not go below 0
    mockOnChange.mockClear();
    fireEvent.keyDown(flashlight, { key: 'ArrowUp' });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...boundaryValue,
      y: 0, // Should stay at 0
    });
  });

  it('has proper ARIA attributes', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const container = screen.getByRole('application');
    const flashlight = screen.getByRole('button');
    
    expect(container).toHaveAttribute('aria-labelledby');
    expect(flashlight).toHaveAttribute('aria-label');
    expect(flashlight.getAttribute('aria-label')).toContain('Position: 50%, 30%');
    expect(flashlight.getAttribute('aria-label')).toContain('Rotation: 0°');
    expect(flashlight.getAttribute('aria-label')).toContain('Tilt: 0°');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const flashlight = screen.getByRole('button');
    
    expect(flashlight).toHaveAttribute('tabIndex', '-1');
    
    // Should not respond to keyboard events when disabled
    fireEvent.keyDown(flashlight, { key: 'ArrowRight' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('renders with custom label', () => {
    render(
      <LightingDirectionControl
        label="Custom Light Direction"
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Custom Light Direction')).toBeInTheDocument();
  });

  it('shows instructions text', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Drag to move/)).toBeInTheDocument();
    expect(screen.getByText(/Arrow keys to adjust/)).toBeInTheDocument();
  });

  it('ignores non-navigation keys', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    // Random key should not trigger onChange
    fireEvent.keyDown(flashlight, { key: 'a' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('handles mouse down on flashlight', () => {
    render(
      <LightingDirectionControl
        value={mockValue}
        onChange={mockOnChange}
      />
    );

    const flashlight = screen.getByRole('button');
    
    // Mouse down should not immediately change value but should prepare for drag
    fireEvent.mouseDown(flashlight, { clientX: 100, clientY: 100 });
    
    // The component should focus the flashlight
    expect(flashlight).toHaveFocus();
  });

  it('normalizes rotation values correctly', () => {
    const negativeRotationValue: LightingDirectionValue = {
      x: 50,
      y: 50,
      rotation: -45, // Should normalize to 315
      tilt: 0,
    };

    render(
      <LightingDirectionControl
        value={negativeRotationValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Rotation: 315°')).toBeInTheDocument();
  });
});