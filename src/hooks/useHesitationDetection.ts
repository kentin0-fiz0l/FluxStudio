/**
 * useHesitationDetection - Passive hesitation detection for user testing
 *
 * Detects UI hesitation patterns without DOM inspection or screen capture:
 * - Route hesitation: User stays on same route > 45s without activity
 * - Panel hesitation: User opens Pulse panel but doesn't interact within 15s
 *
 * Privacy-focused: Only tracks timing and route info, never content.
 */

import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { userTestLogger } from '@/services/userTestLogger';

interface UseHesitationDetectionOptions {
  /** Whether hesitation detection is enabled */
  enabled: boolean;
  /** Threshold for route hesitation in milliseconds (default: 45000) */
  routeHesitationMs?: number;
  /** Threshold for panel hesitation in milliseconds (default: 15000) */
  panelHesitationMs?: number;
  /** Current focused project ID (for context) */
  focusedProjectId?: string | null;
}

interface PanelInteractionTracker {
  /** Notify that a panel was opened */
  onPanelOpen: (panelName: string) => void;
  /** Notify that the user interacted with the panel */
  onPanelInteraction: (panelName: string) => void;
  /** Notify that a panel was closed */
  onPanelClose: (panelName: string) => void;
}

const DEFAULT_ROUTE_HESITATION_MS = 45000; // 45 seconds
const DEFAULT_PANEL_HESITATION_MS = 15000; // 15 seconds

export function useHesitationDetection(options: UseHesitationDetectionOptions): PanelInteractionTracker {
  const {
    enabled,
    routeHesitationMs = DEFAULT_ROUTE_HESITATION_MS,
    panelHesitationMs = DEFAULT_PANEL_HESITATION_MS,
    focusedProjectId,
  } = options;

  const location = useLocation();
  const lastActivityRef = React.useRef<number>(Date.now());
  const routeEntryTimeRef = React.useRef<number>(Date.now());
  const routeHesitationLoggedRef = React.useRef<boolean>(false);
  const panelTimersRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());
  const panelOpenTimesRef = React.useRef<Map<string, number>>(new Map());

  // Track user activity (clicks and keystrokes)
  React.useEffect(() => {
    if (!enabled) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen for user activity signals
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('mousemove', updateActivity, { passive: true });

    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
    };
  }, [enabled]);

  // Reset on route change
  React.useEffect(() => {
    routeEntryTimeRef.current = Date.now();
    lastActivityRef.current = Date.now();
    routeHesitationLoggedRef.current = false;
  }, [location.pathname]);

  // Check for route hesitation periodically
  React.useEffect(() => {
    if (!enabled) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const timeOnRoute = now - routeEntryTimeRef.current;

      // Only log once per route visit
      if (
        !routeHesitationLoggedRef.current &&
        timeSinceActivity >= routeHesitationMs &&
        timeOnRoute >= routeHesitationMs
      ) {
        routeHesitationLoggedRef.current = true;
        userTestLogger.logHesitation({
          route: location.pathname,
          component: 'page',
          durationMs: timeSinceActivity,
        });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkInterval);
  }, [enabled, location.pathname, routeHesitationMs]);

  // Panel interaction tracking
  const onPanelOpen = React.useCallback((panelName: string) => {
    if (!enabled) return;

    const now = Date.now();
    panelOpenTimesRef.current.set(panelName, now);

    // Clear any existing timer
    const existingTimer = panelTimersRef.current.get(panelName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a timer to detect hesitation
    const timer = setTimeout(() => {
      // Check if panel is still open (hasn't been interacted with or closed)
      if (panelOpenTimesRef.current.has(panelName)) {
        const openTime = panelOpenTimesRef.current.get(panelName)!;
        userTestLogger.logHesitation({
          route: location.pathname,
          component: panelName,
          durationMs: Date.now() - openTime,
        });
      }
      panelTimersRef.current.delete(panelName);
    }, panelHesitationMs);

    panelTimersRef.current.set(panelName, timer);
  }, [enabled, location.pathname, panelHesitationMs]);

  const onPanelInteraction = React.useCallback((panelName: string) => {
    // Clear the hesitation timer - user interacted
    const timer = panelTimersRef.current.get(panelName);
    if (timer) {
      clearTimeout(timer);
      panelTimersRef.current.delete(panelName);
    }
    panelOpenTimesRef.current.delete(panelName);
  }, []);

  const onPanelClose = React.useCallback((panelName: string) => {
    // Clear the hesitation timer
    const timer = panelTimersRef.current.get(panelName);
    if (timer) {
      clearTimeout(timer);
      panelTimersRef.current.delete(panelName);
    }
    panelOpenTimesRef.current.delete(panelName);
  }, []);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      panelTimersRef.current.forEach((timer) => clearTimeout(timer));
      panelTimersRef.current.clear();
    };
  }, []);

  return {
    onPanelOpen,
    onPanelInteraction,
    onPanelClose,
  };
}

export default useHesitationDetection;
