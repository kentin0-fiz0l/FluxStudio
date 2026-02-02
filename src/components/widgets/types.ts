import { UserType } from '../../contexts/AuthContext';

export interface WidgetConfig {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<WidgetProps>;
  category: WidgetCategory;
  size: WidgetSize;
  permissions: UserType[];
  isResizable?: boolean;
  isDraggable?: boolean;
  refreshInterval?: number; // in seconds
  settings?: Record<string, any>;
}

export interface WidgetProps {
  config: WidgetConfig;
  onRefresh?: () => void;
  onConfigChange?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
}

export type WidgetCategory =
  | 'overview'
  | 'projects'
  | 'collaboration'
  | 'analytics'
  | 'tools'
  | 'notifications'
  | 'organizations'
  | 'files'
  | 'messages'
  | 'settings';

export type WidgetSize =
  | 'small'      // 1x1
  | 'medium'     // 2x1
  | 'large'      // 2x2
  | 'wide'       // 3x1
  | 'tall'       // 1x3
  | 'extra-large'; // 3x2

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export interface DashboardLayout {
  userId: string;
  layouts: WidgetLayout[];
  breakpoints: {
    lg: WidgetLayout[];
    md: WidgetLayout[];
    sm: WidgetLayout[];
    xs: WidgetLayout[];
  };
}

export interface WidgetRegistry {
  [key: string]: WidgetConfig;
}

// Widget size configurations for grid layout
export const WIDGET_DIMENSIONS = {
  small: { w: 1, h: 1 },
  medium: { w: 2, h: 1 },
  large: { w: 2, h: 2 },
  wide: { w: 3, h: 1 },
  tall: { w: 1, h: 3 },
  'extra-large': { w: 3, h: 2 },
};

// Default layouts for different user roles
export const DEFAULT_LAYOUTS: Record<UserType, WidgetLayout[]> = {
  client: [
    { id: 'project-overview', x: 0, y: 0, w: 2, h: 2 },
    { id: 'quick-actions', x: 2, y: 0, w: 1, h: 2 },
    { id: 'messages', x: 0, y: 2, w: 2, h: 1 },
    { id: 'recent-activity', x: 2, y: 2, w: 1, h: 1 },
  ],
  designer: [
    { id: 'portfolio-stats', x: 0, y: 0, w: 1, h: 1 },
    { id: 'active-projects', x: 1, y: 0, w: 2, h: 2 },
    { id: 'design-tools', x: 0, y: 1, w: 1, h: 1 },
    { id: 'recent-activity', x: 0, y: 2, w: 3, h: 1 },
  ],
  admin: [
    { id: 'system-overview', x: 0, y: 0, w: 2, h: 1 },
    { id: 'user-analytics', x: 2, y: 0, w: 1, h: 2 },
    { id: 'project-analytics', x: 0, y: 1, w: 1, h: 1 },
    { id: 'organization-stats', x: 1, y: 1, w: 1, h: 1 },
  ],
};