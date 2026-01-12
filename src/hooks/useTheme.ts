/**
 * useTheme Hook - Theme Management
 *
 * Manages application theme (light/dark/auto) with system preference detection
 * and localStorage persistence.
 */

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load from localStorage or default to auto
    const stored = localStorage.getItem('flux-theme') as Theme;
    return stored || 'auto';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;

    // Function to apply theme
    const applyTheme = (newTheme: 'light' | 'dark') => {
      setResolvedTheme(newTheme);

      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Handle theme changes
    if (theme === 'auto') {
      // Use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      // Initial setup
      handleChange(mediaQuery);

      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Use explicit theme
      applyTheme(theme);
    }
  }, [theme]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('flux-theme', theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    resolvedTheme,
    toggleTheme: () => {
      setTheme(current => {
        if (current === 'light') return 'dark';
        if (current === 'dark') return 'auto';
        return 'light';
      });
    }
  };
}
