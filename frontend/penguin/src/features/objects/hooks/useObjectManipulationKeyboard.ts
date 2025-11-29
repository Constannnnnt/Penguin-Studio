import { useEffect } from 'react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';

export interface ObjectManipulationKeyboardOptions {
  enabled?: boolean;
}

export const useObjectManipulationKeyboard = (
  options: ObjectManipulationKeyboardOptions = {}
): void => {
  const { enabled = true } = options;
  
  const selectedMaskId = useSegmentationStore((state) => state.selectedMaskId);
  const updateMaskPosition = useSegmentationStore((state) => state.updateMaskPosition);
  const resetMaskTransform = useSegmentationStore((state) => state.resetMaskTransform);
  const hideMask = useSegmentationStore((state) => state.hideMask);
  const selectMask = useSegmentationStore((state) => state.selectMask);

  useEffect(() => {
    if (!enabled || !selectedMaskId) {
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

      const moveAmount = event.shiftKey ? 10 : 1;

      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault();
          updateMaskPosition(selectedMaskId, 0, -moveAmount);
          break;
        }

        case 'ArrowDown': {
          event.preventDefault();
          updateMaskPosition(selectedMaskId, 0, moveAmount);
          break;
        }

        case 'ArrowLeft': {
          event.preventDefault();
          updateMaskPosition(selectedMaskId, -moveAmount, 0);
          break;
        }

        case 'ArrowRight': {
          event.preventDefault();
          updateMaskPosition(selectedMaskId, moveAmount, 0);
          break;
        }

        case 'r':
        case 'R': {
          event.preventDefault();
          resetMaskTransform(selectedMaskId);
          break;
        }

        case 'Delete':
        case 'Backspace': {
          event.preventDefault();
          hideMask(selectedMaskId);
          break;
        }

        case 'Escape': {
          event.preventDefault();
          selectMask(null);
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
  }, [enabled, selectedMaskId, updateMaskPosition, resetMaskTransform, hideMask, selectMask]);
};

export const OBJECT_MANIPULATION_KEYBOARD_SHORTCUTS = {
  moveUp: {
    key: 'ArrowUp',
    description: 'Move mask up by 1 pixel',
  },
  moveDown: {
    key: 'ArrowDown',
    description: 'Move mask down by 1 pixel',
  },
  moveLeft: {
    key: 'ArrowLeft',
    description: 'Move mask left by 1 pixel',
  },
  moveRight: {
    key: 'ArrowRight',
    description: 'Move mask right by 1 pixel',
  },
  moveUpFast: {
    key: 'Shift+ArrowUp',
    description: 'Move mask up by 10 pixels',
  },
  moveDownFast: {
    key: 'Shift+ArrowDown',
    description: 'Move mask down by 10 pixels',
  },
  moveLeftFast: {
    key: 'Shift+ArrowLeft',
    description: 'Move mask left by 10 pixels',
  },
  moveRightFast: {
    key: 'Shift+ArrowRight',
    description: 'Move mask right by 10 pixels',
  },
  reset: {
    key: 'R',
    description: 'Reset mask to original position and size',
  },
  hide: {
    key: 'Delete',
    description: 'Hide mask from view',
  },
  hideAlt: {
    key: 'Backspace',
    description: 'Hide mask from view (alternative)',
  },
  deselect: {
    key: 'Escape',
    description: 'Deselect current mask',
  },
} as const;
