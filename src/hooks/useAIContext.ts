/**
 * useAIContext - Provides current context to AI for better suggestions
 *
 * Gathers information about the user's current activity to give
 * the AI relevant context for generating suggestions and responses.
 */

import * as React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useStore } from '@/store';

export interface AIContext {
  // Current location
  page: string;
  route: string;
  params: Record<string, string>;

  // Active entities
  activeProject?: {
    id: string;
    name: string;
    type: string;
  };
  activeEntity?: {
    id: string;
    type: string;
    name: string;
  };

  // User activity
  recentActions: string[];
  selectedElement?: {
    type: string;
    id: string;
    properties?: Record<string, unknown>;
  };

  // Environment
  viewportSize: { width: number; height: number };
  colorScheme: 'light' | 'dark';
  isMobile: boolean;

  // Time context
  sessionDuration: number;
  lastActivityAt: string;
}

export interface UseAIContextOptions {
  trackActions?: boolean;
  maxRecentActions?: number;
  updateInterval?: number;
}

export function useAIContext(options: UseAIContextOptions = {}) {
  const {
    trackActions = true,
    maxRecentActions = 10,
    updateInterval = 5000,
  } = options;

  const location = useLocation();
  const params = useParams();
  const store = useStore();

  // Initialize session start time using useState to avoid impure function during render
  const [sessionStart] = React.useState(() => Date.now());

  const [context, setContext] = React.useState<AIContext>({
    page: '',
    route: '',
    params: {},
    recentActions: [],
    viewportSize: { width: 0, height: 0 },
    colorScheme: 'light',
    isMobile: false,
    sessionDuration: 0,
    lastActivityAt: new Date().toISOString(),
  });

  const sessionStartRef = React.useRef(sessionStart);
  const recentActionsRef = React.useRef<string[]>([]);

  // Add action to recent actions - moved before useEffect that uses it
  const addAction = React.useCallback((action: string) => {
    recentActionsRef.current = [
      action,
      ...recentActionsRef.current.slice(0, maxRecentActions - 1),
    ];

    setContext((prev) => ({
      ...prev,
      recentActions: recentActionsRef.current,
      lastActivityAt: new Date().toISOString(),
    }));
  }, [maxRecentActions]);

  // Track page changes
  React.useEffect(() => {
    const pageName = getPageName(location.pathname);

    setContext((prev) => ({
      ...prev,
      page: pageName,
      route: location.pathname,
      params: params as Record<string, string>,
    }));

    if (trackActions) {
      addAction(`Navigated to ${pageName}`);
    }
  }, [location.pathname, params, trackActions, addAction]);

  // Track active project
  React.useEffect(() => {
    const projects = store.projects?.projects || [];
    const activeProjectId = params.projectId || params.id;

    if (activeProjectId) {
      const project = projects.find((p: { id: string }) => p.id === activeProjectId);
      if (project) {
        setContext((prev) => ({
          ...prev,
          activeProject: {
            id: project.id,
            name: project.name || 'Untitled',
            type: (project as { type?: string }).type || 'general',
          },
        }));
      }
    }
  }, [params, store.projects?.projects]);

  // Track viewport and color scheme
  React.useEffect(() => {
    const updateViewport = () => {
      setContext((prev) => ({
        ...prev,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        isMobile: window.innerWidth < 768,
      }));
    };

    const updateColorScheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setContext((prev) => ({
        ...prev,
        colorScheme: e.matches ? 'dark' : 'light',
      }));
    };

    // Initial values
    updateViewport();

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    updateColorScheme(darkModeQuery);

    // Listeners
    window.addEventListener('resize', updateViewport);
    darkModeQuery.addEventListener('change', updateColorScheme);

    return () => {
      window.removeEventListener('resize', updateViewport);
      darkModeQuery.removeEventListener('change', updateColorScheme);
    };
  }, []);

  // Update session duration periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setContext((prev) => ({
        ...prev,
        sessionDuration: Math.floor((Date.now() - sessionStartRef.current) / 1000),
      }));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  // Set selected element
  const setSelectedElement = React.useCallback((element: AIContext['selectedElement']) => {
    setContext((prev) => ({
      ...prev,
      selectedElement: element,
    }));

    if (element && trackActions) {
      addAction(`Selected ${element.type} element`);
    }
  }, [addAction, trackActions]);

  // Set active entity (e.g., opened document, board, etc.)
  const setActiveEntity = React.useCallback((entity: AIContext['activeEntity']) => {
    setContext((prev) => ({
      ...prev,
      activeEntity: entity,
    }));

    if (entity && trackActions) {
      addAction(`Opened ${entity.type}: ${entity.name}`);
    }
  }, [addAction, trackActions]);

  // Generate context summary for AI
  const getContextSummary = React.useCallback((): string => {
    const parts: string[] = [];

    parts.push(`User is on the ${context.page} page.`);

    if (context.activeProject) {
      parts.push(`Working on project "${context.activeProject.name}" (${context.activeProject.type}).`);
    }

    if (context.activeEntity) {
      parts.push(`Has ${context.activeEntity.type} "${context.activeEntity.name}" open.`);
    }

    if (context.selectedElement) {
      parts.push(`Selected a ${context.selectedElement.type} element.`);
    }

    if (context.recentActions.length > 0) {
      parts.push(`Recent actions: ${context.recentActions.slice(0, 3).join(', ')}.`);
    }

    parts.push(`Session duration: ${formatDuration(context.sessionDuration)}.`);
    parts.push(`Device: ${context.isMobile ? 'mobile' : 'desktop'}, ${context.colorScheme} mode.`);

    return parts.join(' ');
  }, [context]);

  return {
    context,
    addAction,
    setSelectedElement,
    setActiveEntity,
    getContextSummary,
  };
}

// Helper functions
function getPageName(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return 'Home';

  const pageMappings: Record<string, string> = {
    projects: 'Projects',
    project: 'Project Detail',
    messages: 'Messages',
    settings: 'Settings',
    profile: 'Profile',
    tools: 'Tools',
    metmap: 'MetMap',
    timeline: 'Timeline',
    canvas: 'Canvas',
    dashboard: 'Dashboard',
  };

  const firstSegment = segments[0].toLowerCase();
  return pageMappings[firstSegment] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default useAIContext;
