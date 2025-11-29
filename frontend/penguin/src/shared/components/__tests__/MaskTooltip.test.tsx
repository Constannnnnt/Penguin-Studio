import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaskTooltip } from '@/features/segmentation/components/maskTooltip';
import type { MaskMetadata } from '@/features/segmentation/store/segmentationStore';

describe('MaskTooltip', () => {
  const createMockMask = (
    promptText?: string,
    label: string = 'Test Object'
  ): MaskMetadata => ({
    mask_id: 'test-mask-1',
    label,
    confidence: 0.95,
    bounding_box: { x1: 10, y1: 20, x2: 100, y2: 200 },
    area_pixels: 16200,
    area_percentage: 5.5,
    centroid: [55, 110],
    mask_url: 'http://example.com/mask.png',
    promptText,
  });

  it('does not render when visible is false', () => {
    const mask = createMockMask('red ball');
    const { container } = render(
      <MaskTooltip
        mask={mask}
        visible={false}
        position={{ x: 100, y: 100 }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with promptText when available', () => {
    const mask = createMockMask('red ball');
    render(
      <MaskTooltip
        mask={mask}
        visible={true}
        position={{ x: 100, y: 100 }}
      />
    );
    
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('red ball')).toBeInTheDocument();
  });

  it('falls back to label when promptText is not available', () => {
    const mask = createMockMask(undefined, 'Fallback Label');
    render(
      <MaskTooltip
        mask={mask}
        visible={true}
        position={{ x: 100, y: 100 }}
      />
    );
    
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Fallback Label')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    const mask = createMockMask('test object');
    render(
      <MaskTooltip
        mask={mask}
        visible={true}
        position={{ x: 100, y: 100 }}
      />
    );
    
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('aria-live', 'polite');
  });

  it('positions tooltip at specified coordinates', () => {
    const mask = createMockMask('test object');
    render(
      <MaskTooltip
        mask={mask}
        visible={true}
        position={{ x: 150, y: 250 }}
      />
    );
    
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveStyle({ left: '150px', top: '250px' });
  });

  it('applies fade transition classes', () => {
    const mask = createMockMask('test object');
    render(
      <MaskTooltip
        mask={mask}
        visible={true}
        position={{ x: 100, y: 100 }}
      />
    );
    
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toContain('transition-opacity');
    expect(tooltip.className).toContain('duration-200');
  });
});
