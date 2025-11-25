import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useObjectManipulationKeyboard } from './useObjectManipulationKeyboard';
import { useSegmentationStore } from '@/store/segmentationStore';

vi.mock('@/store/segmentationStore', () => ({
  useSegmentationStore: vi.fn(),
}));

describe('useObjectManipulationKeyboard', () => {
  const mockUpdateMaskPosition = vi.fn();
  const mockResetMaskTransform = vi.fn();
  const mockHideMask = vi.fn();
  const mockSelectMask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useSegmentationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
      const state = {
        selectedMaskId: 'test-mask-1',
        updateMaskPosition: mockUpdateMaskPosition,
        resetMaskTransform: mockResetMaskTransform,
        hideMask: mockHideMask,
        selectMask: mockSelectMask,
      };
      return selector ? selector(state) : state;
    });
  });

  it('should handle arrow up key press', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', 0, -1);
  });

  it('should handle arrow down key press', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', 0, 1);
  });

  it('should handle arrow left key press', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', -1, 0);
  });

  it('should handle arrow right key press', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', 1, 0);
  });

  it('should handle shift+arrow up for 10 pixel movement', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', 0, -10);
  });

  it('should handle shift+arrow down for 10 pixel movement', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', 0, 10);
  });

  it('should handle shift+arrow left for 10 pixel movement', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', -10, 0);
  });

  it('should handle shift+arrow right for 10 pixel movement', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).toHaveBeenCalledWith('test-mask-1', 10, 0);
  });

  it('should handle R key press for reset', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'R' });
    window.dispatchEvent(event);

    expect(mockResetMaskTransform).toHaveBeenCalledWith('test-mask-1');
  });

  it('should handle lowercase r key press for reset', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'r' });
    window.dispatchEvent(event);

    expect(mockResetMaskTransform).toHaveBeenCalledWith('test-mask-1');
  });

  it('should handle Delete key press for hide', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    window.dispatchEvent(event);

    expect(mockHideMask).toHaveBeenCalledWith('test-mask-1');
  });

  it('should handle Backspace key press for hide', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    window.dispatchEvent(event);

    expect(mockHideMask).toHaveBeenCalledWith('test-mask-1');
  });

  it('should handle Escape key press for deselect', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(mockSelectMask).toHaveBeenCalledWith(null);
  });

  it('should not handle keys when no mask is selected', () => {
    (useSegmentationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
      const state = {
        selectedMaskId: null,
        updateMaskPosition: mockUpdateMaskPosition,
        resetMaskTransform: mockResetMaskTransform,
        hideMask: mockHideMask,
        selectMask: mockSelectMask,
      };
      return selector ? selector(state) : state;
    });

    renderHook(() => useObjectManipulationKeyboard());

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).not.toHaveBeenCalled();
  });

  it('should not handle keys when disabled', () => {
    renderHook(() => useObjectManipulationKeyboard({ enabled: false }));

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).not.toHaveBeenCalled();
  });

  it('should not handle keys when focus is in input field', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should not handle keys when focus is in textarea', () => {
    renderHook(() => useObjectManipulationKeyboard());

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
    window.dispatchEvent(event);

    expect(mockUpdateMaskPosition).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });
});
