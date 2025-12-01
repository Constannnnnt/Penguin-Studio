import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollapsibleAestheticOption } from '../CollapsibleAestheticOption';

describe('CollapsibleAestheticOption', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const defaultProps = {
    label: 'Test Section',
    currentValue: 'option1',
    options: mockOptions,
    isExpanded: false,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    renderPreview: 'image' as const,
  };

  it('renders header with label and current value', () => {
    render(<CollapsibleAestheticOption {...defaultProps} />);
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Option1')).toBeInTheDocument();
  });

  it('displays chevron icon', () => {
    render(<CollapsibleAestheticOption {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /test section/i });
    const chevron = button.querySelector('svg');
    expect(chevron).toBeInTheDocument();
  });

  it('calls onToggle when header is clicked', () => {
    const onToggle = vi.fn();
    render(<CollapsibleAestheticOption {...defaultProps} onToggle={onToggle} />);
    
    const button = screen.getByRole('button', { name: /test section/i });
    fireEvent.click(button);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('sets aria-expanded to false when collapsed', () => {
    render(<CollapsibleAestheticOption {...defaultProps} isExpanded={false} />);
    
    const button = screen.getByRole('button', { name: /test section/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('sets aria-expanded to true when expanded', () => {
    render(<CollapsibleAestheticOption {...defaultProps} isExpanded={true} />);
    
    const button = screen.getByRole('button', { name: /test section/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('rotates chevron icon when expanded', () => {
    const { rerender } = render(<CollapsibleAestheticOption {...defaultProps} isExpanded={false} />);
    
    const button = screen.getByRole('button', { name: /test section/i });
    const chevron = button.querySelector('svg');
    expect(chevron).not.toHaveClass('rotate-180');
    
    rerender(<CollapsibleAestheticOption {...defaultProps} isExpanded={true} />);
    expect(chevron).toHaveClass('rotate-180');
  });

  it('renders children when provided', () => {
    render(
      <CollapsibleAestheticOption {...defaultProps} isExpanded={true}>
        <div data-testid="child-content">Child Content</div>
      </CollapsibleAestheticOption>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('formats multi-word current values correctly', () => {
    render(
      <CollapsibleAestheticOption 
        {...defaultProps} 
        currentValue="rule-of-thirds"
      />
    );
    
    expect(screen.getByText('Rule Of Thirds')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<CollapsibleAestheticOption {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /test section/i });
    expect(button).toHaveAttribute('aria-controls', 'test-section-content');
    expect(button).toHaveAttribute('aria-label');
  });

  it('applies motion-reduce class for accessibility', () => {
    render(<CollapsibleAestheticOption {...defaultProps} isExpanded={true} />);
    
    const content = document.getElementById('test-section-content');
    expect(content).toHaveClass('motion-reduce:transition-none');
  });
});
