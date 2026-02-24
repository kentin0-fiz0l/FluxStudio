import { lazy } from 'react';
import { WidgetConfig, WidgetRegistry } from './types';
import type { UserType } from '@/store/slices/authSlice';
import { QuickActionsWidget } from './QuickActionsWidget';
import { ProjectOverviewWidget } from './ProjectOverviewWidget';
import { AccountOverviewWidget } from './AccountOverviewWidget';
import { PersonalizationWidget } from './PersonalizationWidget';
import { ActivityWidget } from './ActivityWidget';
import { StatsWidget } from './StatsWidget';
import { SearchWidget } from './SearchWidget';
import { MessagesWidget } from './MessagesWidget';

// Heavy widgets lazy-loaded for bundle splitting
const NotificationCenter = lazy(() => import('./NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const ProjectCommunicationWidget = lazy(() => import('./ProjectCommunicationWidget').then(m => ({ default: m.ProjectCommunicationWidget })));
const DesignReviewWidget = lazy(() => import('./DesignReviewWidget').then(m => ({ default: m.DesignReviewWidget })));
const ConsultationWidget = lazy(() => import('./ConsultationWidget').then(m => ({ default: m.ConsultationWidget })));

// Widget Registry - Define all available widgets
export const WIDGET_REGISTRY: WidgetRegistry = {
  'quick-actions': {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Fast access to your most-used features',
    component: QuickActionsWidget,
    category: 'overview',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: false,
    isDraggable: true,
  },
  'project-overview': {
    id: 'project-overview',
    title: 'Project Overview',
    description: 'Track progress across your active projects',
    component: ProjectOverviewWidget,
    category: 'projects',
    size: 'large',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 30, // 30 seconds
  },
  'account-overview': {
    id: 'account-overview',
    title: 'Account Overview',
    description: 'Your profile and activity summary',
    component: AccountOverviewWidget,
    category: 'overview',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: false,
    isDraggable: true,
  },
  'messages': {
    id: 'messages',
    title: 'Messages',
    description: 'Real-time messaging and communication',
    component: MessagesWidget,
    category: 'collaboration',
    size: 'wide',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 15,
  },
  'recent-activity': {
    id: 'recent-activity',
    title: 'Recent Activity',
    description: 'Your latest actions and updates',
    component: ActivityWidget,
    category: 'overview',
    size: 'wide',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 15,
  },
  'portfolio-stats': {
    id: 'portfolio-stats',
    title: 'Portfolio Stats',
    description: 'Your design portfolio performance',
    component: QuickActionsWidget, // Placeholder - would be PortfolioStatsWidget
    category: 'analytics',
    size: 'small',
    permissions: ['designer'],
    isResizable: false,
    isDraggable: true,
    refreshInterval: 300, // 5 minutes
  },
  'active-projects': {
    id: 'active-projects',
    title: 'Active Projects',
    description: 'Projects currently in progress',
    component: ProjectOverviewWidget,
    category: 'projects',
    size: 'large',
    permissions: ['designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 30,
  },
  'design-tools': {
    id: 'design-tools',
    title: 'Design Tools',
    description: 'Quick access to your creative tools',
    component: QuickActionsWidget, // Placeholder - would be DesignToolsWidget
    category: 'tools',
    size: 'small',
    permissions: ['designer'],
    isResizable: false,
    isDraggable: true,
  },
  'system-overview': {
    id: 'system-overview',
    title: 'System Overview',
    description: 'Platform health and metrics',
    component: StatsWidget,
    category: 'analytics',
    size: 'medium',
    permissions: ['admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 60,
  },
  'overview-stats': {
    id: 'overview-stats',
    title: 'Overview Stats',
    description: 'Key metrics and performance indicators',
    component: StatsWidget,
    category: 'analytics',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 60,
  },
  'user-analytics': {
    id: 'user-analytics',
    title: 'User Analytics',
    description: 'User engagement and activity metrics',
    component: QuickActionsWidget, // Placeholder - would be UserAnalyticsWidget
    category: 'analytics',
    size: 'large',
    permissions: ['admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 120,
  },
  'project-analytics': {
    id: 'project-analytics',
    title: 'Project Analytics',
    description: 'Project completion and performance stats',
    component: QuickActionsWidget, // Placeholder - would be ProjectAnalyticsWidget
    category: 'analytics',
    size: 'medium',
    permissions: ['admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 300,
  },
  'organization-stats': {
    id: 'organization-stats',
    title: 'Organization Stats',
    description: 'Organization-wide metrics and insights',
    component: QuickActionsWidget, // Placeholder - would be OrgStatsWidget
    category: 'organizations',
    size: 'medium',
    permissions: ['admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 300,
  },
  'personalization': {
    id: 'personalization',
    title: 'Personalization',
    description: 'Customize your dashboard theme and layout',
    component: PersonalizationWidget,
    category: 'settings',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: false,
    isDraggable: true,
  },
  'quick-search': {
    id: 'quick-search',
    title: 'Quick Search',
    description: 'Find projects, files, and actions quickly',
    component: SearchWidget,
    category: 'tools',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
  },
  'notifications': {
    id: 'notifications',
    title: 'Notification Center',
    description: 'Manage notifications with smart filtering and priority routing',
    component: NotificationCenter,
    category: 'collaboration',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 30,
  },
  'project-communication': {
    id: 'project-communication',
    title: 'Project Communication',
    description: 'Project-specific messaging, milestones, and file collaboration',
    component: ProjectCommunicationWidget,
    category: 'collaboration',
    size: 'large',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 15,
  },
  'design-review': {
    id: 'design-review',
    title: 'Design Review',
    description: 'Interactive design review with visual annotations and approval workflow',
    component: DesignReviewWidget,
    category: 'collaboration',
    size: 'large',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 60,
  },
  'consultations': {
    id: 'consultations',
    title: 'Consultations',
    description: 'Schedule and manage design consultation sessions',
    component: ConsultationWidget,
    category: 'collaboration',
    size: 'medium',
    permissions: ['client', 'designer', 'admin'],
    isResizable: true,
    isDraggable: true,
    refreshInterval: 120,
  },
};

// Helper functions for working with the widget registry
export function getWidgetById(id: string): WidgetConfig | undefined {
  return WIDGET_REGISTRY[id];
}

export function getWidgetsByCategory(category: string): WidgetConfig[] {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.category === category);
}

export function getWidgetsByPermission(userType: UserType): WidgetConfig[] {
  return Object.values(WIDGET_REGISTRY).filter(widget =>
    widget.permissions.includes(userType)
  );
}

export function getAvailableCategories(): string[] {
  const categories = new Set(Object.values(WIDGET_REGISTRY).map(widget => widget.category));
  return Array.from(categories).sort();
}

// Default widget configurations for different user types
export function getDefaultWidgets(userType: string): string[] {
  switch (userType) {
    case 'client':
      return [
        'project-overview',
        'messages',
        'notifications',
        'project-communication',
        'consultations',
        'quick-search',
        'overview-stats',
        'recent-activity',
        'quick-actions',
        'personalization'
      ];
    case 'designer':
      return [
        'active-projects',
        'messages',
        'design-review',
        'project-communication',
        'consultations',
        'notifications',
        'quick-search',
        'overview-stats',
        'recent-activity',
        'design-tools',
        'quick-actions'
      ];
    case 'admin':
      return [
        'system-overview',
        'messages',
        'notifications',
        'user-analytics',
        'project-communication',
        'quick-search',
        'recent-activity',
        'project-analytics',
        'quick-actions'
      ];
    default:
      return [
        'messages',
        'notifications',
        'quick-search',
        'overview-stats',
        'recent-activity',
        'quick-actions',
        'personalization'
      ];
  }
}