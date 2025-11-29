/**
 * Theme Provider Component
 * 
 * Provides dark mode support using next-themes library
 * 
 * Features:
 * - System preference detection
 * - Manual theme switching
 * - Persistent theme selection
 * - No flash of unstyled content (FOUC)
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
