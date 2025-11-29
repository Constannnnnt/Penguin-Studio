/**
 * Utility for making screen reader announcements
 */

export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export const announceManipulation = (action: string, maskLabel: string): void => {
  announceToScreenReader(`${maskLabel} ${action}`, 'polite');
};

export const announceSelection = (maskLabel: string, isSelected: boolean): void => {
  if (isSelected) {
    announceToScreenReader(`${maskLabel} selected`, 'polite');
  } else {
    announceToScreenReader(`${maskLabel} deselected`, 'polite');
  }
};

export const announceHover = (maskLabel: string): void => {
  announceToScreenReader(`Hovering over ${maskLabel}`, 'polite');
};
