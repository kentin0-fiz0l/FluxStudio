import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeVariant = 'default' | 'cosmic' | 'minimal' | 'vibrant';
type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

interface ThemeSettings {
  variant: ThemeVariant;
  layoutDensity: LayoutDensity;
  sidebarCollapsed: boolean;
  showAnimations: boolean;
  customAccentColor?: string;
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => void;
  resetToDefaults: () => void;
}

const defaultSettings: ThemeSettings = {
  variant: 'default',
  layoutDensity: 'comfortable',
  sidebarCollapsed: false,
  showAnimations: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'flux-studio-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load theme settings:', error);
    }
  }, []);

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('theme-default', 'theme-cosmic', 'theme-minimal', 'theme-vibrant');
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.remove('sidebar-collapsed');
    root.classList.remove('no-animations');

    // Apply current theme classes
    root.classList.add(`theme-${settings.variant}`);
    root.classList.add(`density-${settings.layoutDensity}`);

    if (settings.sidebarCollapsed) {
      root.classList.add('sidebar-collapsed');
    }

    if (!settings.showAnimations) {
      root.classList.add('no-animations');
    }

    // Apply custom accent color if set
    if (settings.customAccentColor) {
      root.style.setProperty('--accent-color', settings.customAccentColor);
    } else {
      root.style.removeProperty('--accent-color');
    }
  }, [settings]);

  const updateSettings = (updates: Partial<ThemeSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save theme settings:', error);
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, resetToDefaults }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme variant configurations
export const THEME_VARIANTS = {
  default: {
    name: 'Default',
    description: 'Classic dark theme with blue accents',
    colors: {
      primary: '#3b82f6',
      background: '#0f172a',
      surface: '#1e293b',
    }
  },
  cosmic: {
    name: 'Cosmic',
    description: 'Deep space theme with purple gradients',
    colors: {
      primary: '#8b5cf6',
      background: '#0c0a1a',
      surface: '#1a1625',
    }
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean and focused with neutral tones',
    colors: {
      primary: '#6b7280',
      background: '#111827',
      surface: '#1f2937',
    }
  },
  vibrant: {
    name: 'Vibrant',
    description: 'Energetic theme with bright accents',
    colors: {
      primary: '#f59e0b',
      background: '#1a1a1a',
      surface: '#2d2d2d',
    }
  }
} as const;

export const LAYOUT_DENSITIES = {
  compact: {
    name: 'Compact',
    description: 'Maximum information density',
    spacing: '0.5rem',
  },
  comfortable: {
    name: 'Comfortable',
    description: 'Balanced spacing and readability',
    spacing: '1rem',
  },
  spacious: {
    name: 'Spacious',
    description: 'Generous spacing for relaxed experience',
    spacing: '1.5rem',
  }
} as const;