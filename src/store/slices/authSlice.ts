/**
 * Auth Slice - User authentication and session state
 *
 * Consolidates AuthContext + SessionContext into Zustand.
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export type UserType = 'client' | 'designer' | 'admin';

export interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  userType?: UserType;
  organizationId?: string;
  createdAt?: string;
}

export interface SessionState {
  lastFocusedProjectId: string | null;
  lastFocusedProjectName: string | null;
  lastProjectTab: string | null;
  lastRoute: string | null;
  lastSeenTimestamp: string | null;
  lastActivityTimestamp: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  session: SessionState;
  isReturningSession: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string, userType: UserType) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  loginWithApple: () => Promise<User>;
  logout: () => Promise<void>;
  setAuthToken: (token: string, refreshToken?: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getUserDashboardPath: (userType: UserType) => string;
  // Session actions
  updateSession: (updates: Partial<SessionState>) => void;
  markAsSeen: () => void;
  getTimeSinceLastSeen: () => number | null;
  recordActivity: () => void;
  clearSession: () => void;
  // Init
  checkAuth: () => Promise<void>;
}

export interface AuthSlice {
  auth: AuthState & AuthActions;
}

interface AuthResponseData {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_STORAGE_KEY = 'fluxstudio.session';
const TOKEN_REFRESH_INTERVAL = 13 * 60 * 1000;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const DEV_MOCK_AUTH =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_DEV_MOCK_AUTH === 'true' &&
  import.meta.env?.MODE === 'development';

const MOCK_USER: User = {
  id: 'dev-user-1',
  email: 'dev@fluxstudio.local',
  name: 'Dev User',
  userType: 'designer',
  createdAt: new Date().toISOString(),
};

const defaultSession: SessionState = {
  lastFocusedProjectId: null,
  lastFocusedProjectName: null,
  lastProjectTab: null,
  lastRoute: null,
  lastSeenTimestamp: null,
  lastActivityTimestamp: null,
};

// ============================================================================
// Helpers
// ============================================================================

function loadSessionFromStorage(): SessionState {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return { ...defaultSession, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return defaultSession;
}

function persistSession(session: SessionState) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

// Token refresh state (module-level to avoid stale closures)
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!refreshToken && !accessToken) return false;

  isRefreshing = true;

  const doRefresh = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''}/api/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.data) {
        const finalToken = data.data.accessToken || data.data.token;
        if (finalToken) localStorage.setItem(ACCESS_TOKEN_KEY, finalToken);
        if (data.data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  };

  refreshPromise = doRefresh();
  return refreshPromise;
}

function startTokenRefresh() {
  stopTokenRefresh();
  refreshInterval = setInterval(async () => {
    await refreshAccessToken();
  }, TOKEN_REFRESH_INTERVAL);
}

function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function storeTokens(response: { token?: string; accessToken?: string; refreshToken?: string }) {
  const accessToken = response.accessToken || response.token;
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (response.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  token: null,
  session: loadSessionFromStorage(),
  isReturningSession: false,
};

// Compute returning session from loaded session
if (initialState.session.lastActivityTimestamp) {
  const timeSince = Date.now() - new Date(initialState.session.lastActivityTimestamp).getTime();
  initialState.isReturningSession = timeSince > SESSION_TIMEOUT_MS;
}

// ============================================================================
// Slice Creator
// ============================================================================

export const createAuthSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  AuthSlice
> = (set, get) => ({
  auth: {
    ...initialState,

    getUserDashboardPath: (userType: UserType): string => {
      switch (userType) {
        case 'client': return '/dashboard/client';
        case 'designer': return '/dashboard/designer';
        case 'admin': return '/dashboard/admin';
        default: return '/dashboard';
      }
    },

    checkAuth: async () => {
      if (DEV_MOCK_AUTH) {
        set((state) => {
          state.auth.user = MOCK_USER;
          state.auth.isAuthenticated = true;
          state.auth.isLoading = false;
          state.auth.token = 'mock-token';
        });
        return;
      }

      try {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
          const { apiService } = await import('../../services/apiService');
          const response = await apiService.getMe();
          if (response.success && response.data) {
            set((state) => {
              state.auth.user = response.data as User;
              state.auth.isAuthenticated = true;
              state.auth.token = token;
            });
            startTokenRefresh();
          } else {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              const retryResponse = await apiService.getMe();
              if (retryResponse.success && retryResponse.data) {
                set((state) => {
                  state.auth.user = retryResponse.data as User;
                  state.auth.isAuthenticated = true;
                  state.auth.token = localStorage.getItem(ACCESS_TOKEN_KEY);
                });
                startTokenRefresh();
                return;
              }
            }
            clearTokens();
            set((state) => { state.auth.user = null; state.auth.isAuthenticated = false; state.auth.token = null; });
          }
        } else {
          set((state) => { state.auth.user = null; state.auth.isAuthenticated = false; });
        }
      } catch {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            const { apiService } = await import('../../services/apiService');
            const retryResponse = await apiService.getMe();
            if (retryResponse.success && retryResponse.data) {
              set((state) => {
                state.auth.user = retryResponse.data as User;
                state.auth.isAuthenticated = true;
                state.auth.token = localStorage.getItem(ACCESS_TOKEN_KEY);
              });
              startTokenRefresh();
              return;
            }
          } catch { /* fall through */ }
        }
        clearTokens();
        set((state) => { state.auth.user = null; state.auth.isAuthenticated = false; state.auth.token = null; });
      } finally {
        set((state) => { state.auth.isLoading = false; });
      }
    },

    login: async (email: string, password: string): Promise<User> => {
      set((state) => { state.auth.isLoading = true; state.auth.error = null; });

      try {
        const { apiService } = await import('../../services/apiService');
        const response = await apiService.login(email, password);
        if (!response.success) throw new Error(response.error || 'Login failed');

        const authData = response.data as AuthResponseData;
        storeTokens(authData);
        set((state) => {
          state.auth.user = authData.user;
          state.auth.isAuthenticated = true;
          state.auth.isLoading = false;
          state.auth.token = localStorage.getItem(ACCESS_TOKEN_KEY);
        });
        startTokenRefresh();
        return authData.user;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Login failed';
        set((state) => { state.auth.error = msg; state.auth.isLoading = false; });
        throw error;
      }
    },

    signup: async (email: string, password: string, name: string, userType: UserType): Promise<User> => {
      set((state) => { state.auth.isLoading = true; state.auth.error = null; });

      try {
        const { apiService } = await import('../../services/apiService');
        const response = await apiService.signup(email, password, name, userType);
        if (!response.success) throw new Error(response.error || 'Signup failed');

        const authData = response.data as AuthResponseData;
        storeTokens(authData);
        set((state) => {
          state.auth.user = authData.user;
          state.auth.isAuthenticated = true;
          state.auth.isLoading = false;
          state.auth.token = localStorage.getItem(ACCESS_TOKEN_KEY);
        });
        startTokenRefresh();
        return authData.user;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Signup failed';
        set((state) => { state.auth.error = msg; state.auth.isLoading = false; });
        throw error;
      }
    },

    loginWithGoogle: async (credential: string): Promise<User> => {
      const { apiService } = await import('../../services/apiService');
      const response = await apiService.loginWithGoogle(credential);
      if (!response.success) throw new Error(response.error || 'Google login failed');

      const authData = response.data as AuthResponseData;
      storeTokens(authData);
      set((state) => {
        state.auth.user = authData.user;
        state.auth.isAuthenticated = true;
        state.auth.token = localStorage.getItem(ACCESS_TOKEN_KEY);
      });
      startTokenRefresh();
      return authData.user;
    },

    loginWithApple: async (): Promise<User> => {
      const response = await fetch('/api/auth/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Apple login failed');
      }
      const authData = await response.json();
      storeTokens(authData);
      set((state) => {
        state.auth.user = authData.user;
        state.auth.isAuthenticated = true;
        state.auth.token = localStorage.getItem(ACCESS_TOKEN_KEY);
      });
      startTokenRefresh();
      return authData.user;
    },

    logout: async () => {
      stopTokenRefresh();
      try {
        const { apiService } = await import('../../services/apiService');
        await apiService.logout();
      } catch { /* ignore */ }
      clearTokens();
      set((state) => {
        state.auth.user = null;
        state.auth.isAuthenticated = false;
        state.auth.error = null;
        state.auth.token = null;
      });
    },

    setAuthToken: async (token: string, refreshToken?: string): Promise<void> => {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      try {
        const { apiService } = await import('../../services/apiService');
        const response = await apiService.getMe();
        if (response.success && response.data) {
          set((state) => {
            state.auth.user = response.data as User;
            state.auth.isAuthenticated = true;
            state.auth.token = token;
          });
          startTokenRefresh();
        }
      } catch { /* ignore */ }
    },

    setUser: (user: User | null) => {
      set((state) => {
        state.auth.user = user;
        state.auth.isAuthenticated = user !== null;
      });
    },

    setLoading: (loading: boolean) => {
      set((state) => { state.auth.isLoading = loading; });
    },

    setError: (error: string | null) => {
      set((state) => { state.auth.error = error; });
    },

    // Session actions
    updateSession: (updates: Partial<SessionState>) => {
      set((state) => {
        Object.assign(state.auth.session, updates);
      });
      persistSession({ ...get().auth.session, ...updates });
    },

    markAsSeen: () => {
      const now = new Date().toISOString();
      set((state) => { state.auth.session.lastSeenTimestamp = now; });
      persistSession({ ...get().auth.session, lastSeenTimestamp: now });
    },

    getTimeSinceLastSeen: (): number | null => {
      const ts = get().auth.session.lastSeenTimestamp;
      if (!ts) return null;
      return Date.now() - new Date(ts).getTime();
    },

    recordActivity: () => {
      const now = new Date().toISOString();
      set((state) => {
        state.auth.session.lastActivityTimestamp = now;
        state.auth.isReturningSession = false;
      });
      persistSession({ ...get().auth.session, lastActivityTimestamp: now });
    },

    clearSession: () => {
      set((state) => {
        state.auth.session = { ...defaultSession };
        state.auth.isReturningSession = false;
      });
      try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useAuth = () => {
  return useStore((state) => state.auth);
};

export const useSession = () => {
  const session = useStore((state) => state.auth.session);
  const updateSession = useStore((state) => state.auth.updateSession);
  const markAsSeen = useStore((state) => state.auth.markAsSeen);
  const getTimeSinceLastSeen = useStore((state) => state.auth.getTimeSinceLastSeen);
  const recordActivity = useStore((state) => state.auth.recordActivity);
  const isReturningSession = useStore((state) => state.auth.isReturningSession);
  const clearSession = useStore((state) => state.auth.clearSession);
  return { session, updateSession, markAsSeen, getTimeSinceLastSeen, recordActivity, isReturningSession, clearSession };
};
