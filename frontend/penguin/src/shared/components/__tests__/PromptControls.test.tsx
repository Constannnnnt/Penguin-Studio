import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromptControls } from '../PromptControls';

// Mock ResizeObserver for Tooltip
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PromptControls', () => {
  const defaultProps = {
    prompt: '',
    onPromptChange: vi.fn(),
    onGenerate: vi.fn(),
    isLoading: false,
  };

  it('renders textarea with correct aria-label', () => {
    render(<PromptControls {...defaultProps} />);
    // The placeholder text is used as aria-label
    const textarea = screen.getByPlaceholderText(/describe your scene/i);
    expect(textarea).toHaveAttribute('aria-label', expect.stringMatching(/describe your scene/i));
  });

  it('shows generate button with icon when not loading', () => {
    render(<PromptControls {...defaultProps} prompt="valid prompt with enough length" />);
    const button = screen.getByRole('button', { name: /generate/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    // Check that spinner is NOT present
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<PromptControls {...defaultProps} isLoading={true} prompt="valid prompt with enough length" />);
    const button = screen.getByRole('button', { name: /generate/i });
    expect(button).toBeDisabled();
    // Check for spinner
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('updates aria-label when mode changes', () => {
    render(<PromptControls {...defaultProps} mode="edit" />);
    const textarea = screen.getByPlaceholderText(/describe your modifications/i);
    expect(textarea).toHaveAttribute('aria-label', expect.stringMatching(/describe your modifications/i));
  });

  it('shows character counter when typing', () => {
    render(<PromptControls {...defaultProps} prompt="hello" />);
    const counter = screen.getByText('5 / 10');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveClass('text-red-500/80'); // Should be red because < 10
  });

  it('shows green/normal character counter when enough length', () => {
    render(<PromptControls {...defaultProps} prompt="hello world" />);
    const counter = screen.getByText('11 / 10');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveClass('text-muted-foreground/40'); // Should be normal color
  });
});
