import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PromptControls } from '../PromptControls';
import * as React from 'react';

// Mock ResizeObserver for Tooltip
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PromptControls Tooltip', () => {
  const defaultProps = {
    prompt: '',
    onPromptChange: vi.fn(),
    onGenerate: vi.fn(),
    isLoading: false,
  };

  it('shows "Enter at least 10 characters" tooltip when prompt is too short', async () => {
    render(<PromptControls {...defaultProps} prompt="short" />);

    const button = screen.getByRole('button', { name: /generate/i });
    const wrapper = button.parentElement!;

    fireEvent.focus(wrapper);
    fireEvent.mouseEnter(wrapper);

    await waitFor(() => {
      // Radix Tooltip might duplicate content for a11y or something else might be causing duplicates.
      // We use getAllByText to avoid "Found multiple elements" error.
      expect(screen.getAllByText(/enter at least 10 characters/i)[0]).toBeInTheDocument();
    });
  });

  it('shows "Generating..." tooltip when loading', async () => {
    render(<PromptControls {...defaultProps} prompt="long enough prompt" isLoading={true} />);

    const button = screen.getByRole('button', { name: /generate/i });
    const wrapper = button.parentElement!;

    fireEvent.focus(wrapper);
    fireEvent.mouseEnter(wrapper);

    await waitFor(() => {
      expect(screen.getAllByText(/generating.../i)[0]).toBeInTheDocument();
    });
  });

  it('shows "Generate" tooltip when enabled', async () => {
    render(<PromptControls {...defaultProps} prompt="long enough prompt" />);

    const button = screen.getByRole('button', { name: /generate/i });

    fireEvent.focus(button);
    fireEvent.mouseEnter(button);

    await waitFor(() => {
      expect(screen.getAllByText(/Generate/)[0]).toBeInTheDocument();
      // The shortcut might be in a separate span, so getByText might find it individually or as part of parent.
      // Given duplicates, we use getAll.
      expect(screen.getAllByText(/\(Ctrl\+G\)/)[0]).toBeInTheDocument();
    });
  });
});
