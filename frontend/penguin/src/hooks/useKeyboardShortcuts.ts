import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export interface KeyboardShortcutsConfig {
  [shortcutId: string]: KeyboardShortcut;
}

const isMac = (): boolean => {
  return typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  
  const ctrlMatches = shortcut.ctrl
    ? isMac()
      ? event.metaKey
      : event.ctrlKey
    : true;
  
  const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatches = shortcut.alt ? event.altKey : !event.altKey;
  
  const metaMatches = shortcut.meta
    ? event.metaKey
    : true;

  return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
};

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcutsConfig): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      for (const shortcut of Object.values(shortcuts)) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

export const getShortcutDisplay = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  const platform = isMac();

  if (shortcut.ctrl) {
    parts.push(platform ? '⌘' : 'Ctrl');
  }

  if (shortcut.shift) {
    parts.push('Shift');
  }

  if (shortcut.alt) {
    parts.push(platform ? '⌥' : 'Alt');
  }

  if (shortcut.meta && !platform) {
    parts.push('Meta');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
};
