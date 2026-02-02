/**
 * useWorkMomentumCapture - Passive context capture for Work Momentum
 *
 * Automatically captures user's working context as they navigate:
 * - Subscribes to route changes
 * - Extracts entity IDs from URL params
 * - Updates WorkingContext with debouncing
 *
 * Usage: Call once at app level or in layout component.
 * The hook is passive - it observes and records without affecting behavior.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkingContextOptional, LastEntity } from '../contexts/WorkingContext';
import { useActiveProjectOptional } from '../contexts/ActiveProjectContext';

// Routes that are considered "project-scoped" for context capture
const PROJECT_SCOPED_ROUTES = [
  '/messages',
  '/projects/',
  '/boards/',
  '/file',
  '/assets',
  '/tools',
];

// Debounce delay for context updates (ms)
const CAPTURE_DEBOUNCE_MS = 500;

/**
 * Extract entity IDs from URL path and search params.
 * Supports common URL patterns in FluxStudio.
 */
function extractEntityFromUrl(pathname: string, search: string): LastEntity {
  const entity: LastEntity = {};
  const searchParams = new URLSearchParams(search);

  // Extract from URL patterns
  // /projects/:id
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  if (projectMatch) {
    // Project ID is handled separately by ActiveProjectContext
  }

  // /boards/:boardId
  const boardMatch = pathname.match(/\/boards\/([^/]+)/);
  if (boardMatch) {
    entity.boardId = boardMatch[1];
  }

  // Query params: ?conversationId=xxx, ?fileId=xxx, etc.
  if (searchParams.has('conversationId')) {
    entity.conversationId = searchParams.get('conversationId') ?? undefined;
  }
  if (searchParams.has('messageId')) {
    entity.messageId = searchParams.get('messageId') ?? undefined;
  }
  if (searchParams.has('fileId')) {
    entity.fileId = searchParams.get('fileId') ?? undefined;
  }
  if (searchParams.has('assetId')) {
    entity.assetId = searchParams.get('assetId') ?? undefined;
  }

  return entity;
}

/**
 * Check if a route is relevant for project context capture.
 */
function isProjectScopedRoute(pathname: string): boolean {
  return PROJECT_SCOPED_ROUTES.some((route) => pathname.startsWith(route));
}

export interface UseWorkMomentumCaptureOptions {
  /** Additional entity IDs to capture (from component state) */
  entityOverrides?: Partial<LastEntity>;
  /** Disable automatic capture */
  disabled?: boolean;
}

/**
 * Hook to passively capture working context.
 * Should be used at the app level or in a layout component.
 */
export function useWorkMomentumCapture(options: UseWorkMomentumCaptureOptions = {}) {
  const { entityOverrides, disabled = false } = options;
  const location = useLocation();
  const workingContext = useWorkingContextOptional();
  const activeProjectContext = useActiveProjectOptional();
  const hasFocus = activeProjectContext?.hasFocus ?? false;
  const activeProject = activeProjectContext?.activeProject ?? null;

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Track last captured values to avoid redundant updates
  const lastCapturedRef = useRef<{ route: string; entityKey: string } | null>(null);

  const captureContext = useCallback(() => {
    if (disabled || !workingContext || !hasFocus || !activeProject) {
      return;
    }

    const { pathname, search } = location;

    // Only capture for project-scoped routes
    if (!isProjectScopedRoute(pathname)) {
      return;
    }

    // Extract entity from URL
    const urlEntity = extractEntityFromUrl(pathname, search);

    // Merge with overrides (component-provided entity IDs take precedence)
    const mergedEntity: LastEntity = {
      ...urlEntity,
      ...entityOverrides,
    };

    // Create a key for deduplication
    const fullRoute = pathname + search;
    const entityKey = JSON.stringify(mergedEntity);

    // Skip if nothing changed
    if (
      lastCapturedRef.current?.route === fullRoute &&
      lastCapturedRef.current?.entityKey === entityKey
    ) {
      return;
    }

    // Update tracking
    lastCapturedRef.current = { route: fullRoute, entityKey };

    // Update working context
    workingContext.updateWorkingContext({
      lastRoute: fullRoute,
      lastEntity: mergedEntity,
    });
  }, [disabled, workingContext, hasFocus, activeProject, location, entityOverrides]);

  // Capture on route changes with debouncing
  useEffect(() => {
    if (disabled) return;

    // Clear any pending capture
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Schedule new capture
    debounceRef.current = setTimeout(() => {
      captureContext();
      debounceRef.current = null;
    }, CAPTURE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [location.pathname, location.search, captureContext, disabled]);

  // Return a manual capture function for components that need it
  return {
    captureNow: captureContext,
  };
}

/**
 * Hook for components to report entity focus.
 * Use this when opening a specific conversation, file, etc.
 */
export function useReportEntityFocus() {
  const workingContext = useWorkingContextOptional();
  const activeProjectContext = useActiveProjectOptional();
  const hasFocus = activeProjectContext?.hasFocus ?? false;

  const reportConversation = useCallback(
    (conversationId: string, messageId?: string) => {
      if (!workingContext || !hasFocus) return;
      workingContext.updateWorkingContext({
        lastEntity: {
          ...workingContext.workingContext?.lastEntity,
          conversationId,
          messageId,
        },
      });
    },
    [workingContext, hasFocus]
  );

  const reportFile = useCallback(
    (fileId: string) => {
      if (!workingContext || !hasFocus) return;
      workingContext.updateWorkingContext({
        lastEntity: {
          ...workingContext.workingContext?.lastEntity,
          fileId,
        },
      });
    },
    [workingContext, hasFocus]
  );

  const reportAsset = useCallback(
    (assetId: string) => {
      if (!workingContext || !hasFocus) return;
      workingContext.updateWorkingContext({
        lastEntity: {
          ...workingContext.workingContext?.lastEntity,
          assetId,
        },
      });
    },
    [workingContext, hasFocus]
  );

  const reportBoard = useCallback(
    (boardId: string) => {
      if (!workingContext || !hasFocus) return;
      workingContext.updateWorkingContext({
        lastEntity: {
          ...workingContext.workingContext?.lastEntity,
          boardId,
        },
      });
    },
    [workingContext, hasFocus]
  );

  return {
    reportConversation,
    reportFile,
    reportAsset,
    reportBoard,
  };
}

export default useWorkMomentumCapture;
