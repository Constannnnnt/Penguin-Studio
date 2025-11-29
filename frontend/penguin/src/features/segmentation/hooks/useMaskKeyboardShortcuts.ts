import { useEffect } from 'react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';

export interface MaskKeyboardShortcutsOptions {
  enabled?: boolean;
}

export const useMaskKeyboardShortcuts = (
  options: MaskKeyboardShortcutsOptions = {}
): void => {
  const { enabled = true } = options;
  
  const results = useSegmentationStore((state) => state.results);
  const selectedMaskId = useSegmentationStore((state) => state.selectedMaskId);
  const selectMask = useSegmentationStore((state) => state.selectMask);
  const toggleMasksVisibility = useSegmentationStore((state) => state.toggleMasksVisibility);

  useEffect(() => {
    if (!enabled || !results?.masks || results.masks.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

      if (isInputField) {
        return;
      }

      const masks = results.masks;
      const currentIndex = selectedMaskId 
        ? masks.findIndex(m => m.mask_id === selectedMaskId)
        : -1;

      switch (event.key) {
        case 'Tab': {
          event.preventDefault();
          
          if (event.shiftKey) {
            const prevIndex = currentIndex <= 0 ? masks.length - 1 : currentIndex - 1;
            selectMask(masks[prevIndex].mask_id);
          } else {
            const nextIndex = currentIndex >= masks.length - 1 ? 0 : currentIndex + 1;
            selectMask(masks[nextIndex].mask_id);
          }
          break;
        }

        case 'Escape': {
          event.preventDefault();
          selectMask(null);
          break;
        }

        case 'm':
        case 'M': {
          event.preventDefault();
          toggleMasksVisibility();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, results, selectedMaskId, selectMask, toggleMasksVisibility]);
};

export const MASK_KEYBOARD_SHORTCUTS = {
  cycleForward: {
    key: 'Tab',
    description: 'Cycle through masks forward',
  },
  cycleBackward: {
    key: 'Shift+Tab',
    description: 'Cycle through masks backward',
  },
  deselect: {
    key: 'Escape',
    description: 'Deselect current mask',
  },
  toggleVisibility: {
    key: 'M',
    description: 'Toggle mask visibility',
  },
} as const;
