/**
 * SessionContext - Session Memory for FluxStudio
 *
 * Persists user session state across page refreshes and browser sessions:
 * - Last focused project (auto-restored on return)
 * - Last viewed tab/route within project
 * - Last seen timestamp (for "what's new" calculations)
 * - Scroll positions (future enhancement)
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';

// Session state stored in localStorage
export interface SessionState {
  /** Last focused project ID (synced with ActiveProjectContext) */
  lastFocusedProjectId: string | null;
  /** Last focused project name */
  lastFocusedProjectName: string | null;
  /** Last active tab within project detail */
  lastProjectTab: string | null;
  /** Last route path visited */
  lastRoute: string | null;
  /** Timestamp when user last viewed updates (for "X new since..." badge) */
  lastSeenTimestamp: string | null;
  /** Timestamp of last activity in the app */
  lastActivityTimestamp: string | null;
}

interface SessionContextValue {
  /** Current session state */
  session: SessionState;
  /** Update session state (partial updates supported) */
  updateSession: (updates: Partial<SessionState>) => void;
  /** Record that user has "seen" updates up to now */
  markAsSeen: () => void;
  /** Get time since last seen (for badge calculations) */
  getTimeSinceLastSeen: () => number | null;
  /** Record user activity (updates lastActivityTimestamp) */
  recordActivity: () => void;
  /** Check if this is a returning session (vs fresh) */
  isReturningSession: boolean;
  /** Clear all session data */
  clearSession: () => void;
}

const STORAGE_KEY = 'fluxstudio.session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes = "returning" threshold

const defaultSession: SessionState = {
  lastFocusedProjectId: null,
  lastFocusedProjectName: null,
  lastProjectTab: null,
  lastRoute: null,
  lastSeenTimestamp: null,
  lastActivityTimestamp: null,
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<SessionState>(defaultSession);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSession((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (error) {
      console.warn('Failed to restore session from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever session changes (after hydration)
  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to persist session to localStorage:', error);
    }
  }, [session, isHydrated]);

  const updateSession = React.useCallback((updates: Partial<SessionState>) => {
    setSession((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const markAsSeen = React.useCallback(() => {
    setSession((prev) => ({
      ...prev,
      lastSeenTimestamp: new Date().toISOString(),
    }));
  }, []);

  const getTimeSinceLastSeen = React.useCallback((): number | null => {
    if (!session.lastSeenTimestamp) return null;
    const lastSeen = new Date(session.lastSeenTimestamp).getTime();
    return Date.now() - lastSeen;
  }, [session.lastSeenTimestamp]);

  const recordActivity = React.useCallback(() => {
    setSession((prev) => ({
      ...prev,
      lastActivityTimestamp: new Date().toISOString(),
    }));
  }, []);

  // Determine if this is a "returning" session (was away for a while)
  const isReturningSession = React.useMemo(() => {
    if (!session.lastActivityTimestamp) return false;
    const lastActivity = new Date(session.lastActivityTimestamp).getTime();
    const timeSinceActivity = Date.now() - lastActivity;
    return timeSinceActivity > SESSION_TIMEOUT_MS;
  }, [session.lastActivityTimestamp]);

  const clearSession = React.useCallback(() => {
    setSession(defaultSession);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      session,
      updateSession,
      markAsSeen,
      getTimeSinceLastSeen,
      recordActivity,
      isReturningSession,
      clearSession,
    }),
    [
      session,
      updateSession,
      markAsSeen,
      getTimeSinceLastSeen,
      recordActivity,
      isReturningSession,
      clearSession,
    ]
  );

  // Don't render until hydrated to prevent flash
  if (!isHydrated) {
    return null;
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function useSessionOptional(): SessionContextValue | null {
  return React.useContext(SessionContext);
}

export default SessionContext;
