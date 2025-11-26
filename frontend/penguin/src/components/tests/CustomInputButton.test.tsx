import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomInputButton } from '../CustomInputButton';

describe('CustomInputButton', () => {
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    label: 'Custom',
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Initial State', () => {
    it('renders as button with label when not expanded', () => {
      render(<CustomInputButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /custom.*click to enter custom value/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Custom');
    });

    it('displays value instead of label when value is provided', () => {
      render(<CustomInputButton {...defaultProps} value="existing value" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('existing value');
    });

    it('applies custom className', () => {
      render(<CustomInputButton {...defaultProps} className="test-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('test-class');
    });

    it('is disabled when disabled prop is true', () => {
      render(<CustomInputButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Expansion Behavior', () => {
    it('expands to show input field when button is clicked', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /submit custom value/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel custom input/i })).toBeInTheDocument();
    });

    it('does not expand when disabled', () => {
      render(<CustomInputButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('initializes input with existing value when expanded', async () => {
      render(<CustomInputButton {...defaultProps} value="existing" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('existing');
      });
    });
  });

  describe('Input Validation', () => {
    it('validates empty input', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit custom value/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('validates input length against maxLength', async () => {
      render(<CustomInputButton {...defaultProps} maxLength={5} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'toolong' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/custom must be 5 characters or less/i)).toBeInTheDocument();
        const submitButton = screen.getByRole('button', { name: /submit custom value/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('enables submit button for valid input', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'valid input' } });
      });
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit custom value/i });
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe('Submit and Cancel Actions', () => {
    it('calls onSubmit with trimmed value when submit button is clicked', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: '  test value  ' } });
      });
      
      const submitButton = screen.getByRole('button', { name: /submit custom value/i });
      fireEvent.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledWith('test value');
    });

    it('collapses after successful submit', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test' } });
      });
      
      const submitButton = screen.getByRole('button', { name: /submit custom value/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });

    it('cancels and collapses when cancel button is clicked', async () => {
      render(<CustomInputButton {...defaultProps} value="original" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'modified' } });
      });
      
      const cancelButton = screen.getByRole('button', { name: /cancel custom input/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
      
      // Should show original value
      expect(screen.getByRole('button')).toHaveTextContent('original');
    });
  });

  describe('Keyboard Navigation', () => {
    it('submits on Enter key', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test value' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });
      
      expect(mockOnSubmit).toHaveBeenCalledWith('test value');
    });

    it('cancels on Escape key', async () => {
      render(<CustomInputButton {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.keyDown(input, { key: 'Escape' });
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for input', async () => {
      render(<CustomInputButton {...defaultProps} label="Camera Angle" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('aria-label', 'Enter custom camera angle');
        expect(input).toHaveAttribute('aria-invalid', 'false');
      });
    });

    it('has proper group role and label', async () => {
      render(<CustomInputButton {...defaultProps} label="Test Label" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const group = screen.getByRole('group');
        expect(group).toHaveAttribute('aria-label', 'Custom input for Test Label');
      });
    });
  });

  describe('Props Handling', () => {
    it('uses custom placeholder', async () => {
      render(<CustomInputButton {...defaultProps} placeholder="Custom placeholder" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('placeholder', 'Custom placeholder');
      });
    });

    it('respects maxLength prop', async () => {
      render(<CustomInputButton {...defaultProps} maxLength={10} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('maxLength', '10');
      });
    });

    it('updates when value prop changes', () => {
      const { rerender } = render(<CustomInputButton {...defaultProps} value="initial" />);
      
      expect(screen.getByRole('button')).toHaveTextContent('initial');
      
      rerender(<CustomInputButton {...defaultProps} value="updated" />);
      
      expect(screen.getByRole('button')).toHaveTextContent('updated');
    });
  });
});