import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from 'use-debounce';
import { DashboardLayout } from '../components/widgets/types';
// @ts-expect-error - react-grid-layout types are provided by the package
import { Layout } from 'react-grid-layout';

interface WidgetLayoutHook {
  layouts: Record<string, Layout[]>;
  widgets: string[];
  saveLayout: (breakpoint: string, layout: Layout[]) => void;
  addWidget: (widgetId: string, position?: { x: number; y: number }) => void;
  removeWidget: (widgetId: string) => void;
  resetToDefaults: () => void;
  isLoading: boolean;
}

const STORAGE_KEY_PREFIX = 'flux-widget-layout';

const DEFAULT_COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
};

export function useWidgetLayout(): WidgetLayoutHook {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({});
  const [widgets, setWidgets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce layout changes to avoid excessive localStorage writes
  const [debouncedLayouts] = useDebounce(layouts, 1000);

  // Generate storage key for user-specific layouts
  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}-${user?.id || 'guest'}`;
  }, [user?.id]);

  // Generate default layouts for all breakpoints
  const generateDefaultLayouts = useCallback((): Record<string, Layout[]> => {
    if (!user) return {};

    // Get default widget IDs based on user type
    const getDefaultWidgets = (userType: string): string[] => {
      switch (userType) {
        case 'client':
          return ['project-overview', 'quick-actions', 'account-overview', 'personalization'];
        case 'designer':
          return ['portfolio-stats', 'active-projects', 'design-tools', 'personalization'];
        case 'admin':
          return ['system-overview', 'user-analytics', 'project-analytics', 'personalization'];
        default:
          return ['quick-actions', 'account-overview', 'personalization'];
      }
    };

    const defaultWidgets = getDefaultWidgets(user.userType);
    setWidgets(defaultWidgets);

    // Generate layouts for each breakpoint
    const layouts: Record<string, Layout[]> = {};

    Object.keys(DEFAULT_COLS).forEach(breakpoint => {
      const cols = DEFAULT_COLS[breakpoint as keyof typeof DEFAULT_COLS];
      let currentX = 0;
      let currentY = 0;
      let maxY = 0;

      layouts[breakpoint] = defaultWidgets.map((widgetId) => {
        // Default widget dimensions based on size
        const getWidgetSize = (id: string) => {
          if (id.includes('overview') || id.includes('stats')) return { w: 2, h: 2 };
          if (id.includes('personalization')) return { w: 2, h: 3 };
          if (id.includes('analytics')) return { w: 3, h: 2 };
          return { w: 1, h: 1 }; // default small size
        };

        const size = getWidgetSize(widgetId);

        // Adjust size for smaller breakpoints
        const adjustedW = Math.min(size.w, cols);
        const adjustedH = breakpoint === 'xs' ? Math.min(size.h, 2) : size.h;

        // Check if widget fits in current row
        if (currentX + adjustedW > cols) {
          currentX = 0;
          currentY = maxY;
        }

        const layout: Layout = {
          i: widgetId,
          x: currentX,
          y: currentY,
          w: adjustedW,
          h: adjustedH,
          minW: 1,
          minH: 1,
          isDraggable: true,
          isResizable: true,
        };

        currentX += adjustedW;
        maxY = Math.max(maxY, currentY + adjustedH);

        return layout;
      });
    });

    return layouts;
  }, [user]);

  // Load layouts from localStorage or generate defaults
  const loadLayouts = useCallback(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed: DashboardLayout = JSON.parse(stored);
        setLayouts(parsed.breakpoints);
        setWidgets(parsed.layouts.map(l => l.id));
      } else {
        // Generate and set default layouts
        const defaultLayouts = generateDefaultLayouts();
        setLayouts(defaultLayouts);
      }
    } catch (error) {
      console.warn('Failed to load widget layouts:', error);
      // Fallback to defaults
      const defaultLayouts = generateDefaultLayouts();
      setLayouts(defaultLayouts);
    } finally {
      setIsLoading(false);
    }
  }, [user, getStorageKey, generateDefaultLayouts]);

  // Save layouts to localStorage
  const saveLayouts = useCallback((layoutsToSave: Record<string, Layout[]>, widgetsToSave: string[]) => {
    if (!user) return;

    try {
      const dashboardLayout: DashboardLayout = {
        userId: user.id,
        layouts: widgetsToSave.map(widgetId => {
          const lgLayout = layoutsToSave.lg?.find(l => l.i === widgetId);
          return {
            id: widgetId,
            x: lgLayout?.x || 0,
            y: lgLayout?.y || 0,
            w: lgLayout?.w || 1,
            h: lgLayout?.h || 1,
            isDraggable: lgLayout?.isDraggable,
            isResizable: lgLayout?.isResizable,
          };
        }),
        breakpoints: layoutsToSave as DashboardLayout['breakpoints'],
      };

      localStorage.setItem(getStorageKey(), JSON.stringify(dashboardLayout));
    } catch (error) {
      console.warn('Failed to save widget layouts:', error);
    }
  }, [user, getStorageKey]);

  // Save layout for specific breakpoint
  const saveLayout = useCallback((breakpoint: string, layout: Layout[]) => {
    setLayouts(prev => {
      const newLayouts = { ...prev, [breakpoint]: layout };
      return newLayouts;
    });
  }, []);

  // Add a new widget
  const addWidget = useCallback((widgetId: string, position?: { x: number; y: number }) => {
    if (widgets.includes(widgetId)) return; // Widget already exists

    const newWidgets = [...widgets, widgetId];
    setWidgets(newWidgets);

    // Add to all breakpoints
    setLayouts(prev => {
      const newLayouts = { ...prev };

      Object.keys(DEFAULT_COLS).forEach(breakpoint => {
        const cols = DEFAULT_COLS[breakpoint as keyof typeof DEFAULT_COLS];
        const existingLayouts = prev[breakpoint] || [];

        // Find available position
        const x = position?.x || 0;
        const y = position?.y || Math.max(...existingLayouts.map(l => l.y + l.h), 0);

        const newLayout: Layout = {
          i: widgetId,
          x: Math.min(x, cols - 1),
          y,
          w: 1,
          h: 1,
          minW: 1,
          minH: 1,
          isDraggable: true,
          isResizable: true,
        };

        newLayouts[breakpoint] = [...existingLayouts, newLayout];
      });

      return newLayouts;
    });
  }, [widgets]);

  // Remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(id => id !== widgetId));
    setLayouts(prev => {
      const newLayouts = { ...prev };
      Object.keys(newLayouts).forEach(breakpoint => {
        newLayouts[breakpoint] = newLayouts[breakpoint].filter(l => l.i !== widgetId);
      });
      return newLayouts;
    });
  }, []);

  // Reset to default layouts
  const resetToDefaults = useCallback(() => {
    const defaultLayouts = generateDefaultLayouts();
    setLayouts(defaultLayouts);
    // Clear localStorage
    localStorage.removeItem(getStorageKey());
  }, [generateDefaultLayouts, getStorageKey]);

  // Load layouts on mount and user change
  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  // Save layouts when they change (debounced)
  useEffect(() => {
    if (!isLoading && Object.keys(debouncedLayouts).length > 0) {
      saveLayouts(debouncedLayouts, widgets);
    }
  }, [debouncedLayouts, widgets, saveLayouts, isLoading]);

  return {
    layouts,
    widgets,
    saveLayout,
    addWidget,
    removeWidget,
    resetToDefaults,
    isLoading,
  };
}