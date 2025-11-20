/**
 * Theme Toggle Component
 * 
 * Provides a button to toggle between light, dark, and system themes
 * 
 * Features:
 * - Keyboard accessible
 * - Screen reader friendly
 * - Visual feedback on hover/focus
 * - Smooth transitions
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark');
    // } else if (theme === 'dark') {
    //   setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light mode';
    if (theme === 'dark') return 'Dark mode';
    return 'System theme';
  };

  const getNextThemeLabel = () => {
    if (theme === 'light') return 'Switch to dark mode';
    // if (theme === 'dark') return 'Switch to system theme';
    return 'Switch to light mode';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={getNextThemeLabel()}
      title={`Current: ${getThemeLabel()}. Click to ${getNextThemeLabel().toLowerCase()}`}
      className="h-9 w-9"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{getNextThemeLabel()}</span>
    </Button>
  );
}
