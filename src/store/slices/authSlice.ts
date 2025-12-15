/**
 * Auth Slice - User authentication state
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  organizationId?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface AuthSlice {
  auth: AuthState & AuthActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createAuthSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  AuthSlice
> = (set, _get) => ({
  auth: {
    ...initialState,

    login: async (email: string, password: string) => {
      set((state) => {
        state.auth.isLoading = true;
        state.auth.error = null;
      });

      try {
        // API call would go here
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const data = await response.json();

        set((state) => {
          state.auth.user = data.user;
          state.auth.isAuthenticated = true;
          state.auth.isLoading = false;
        });

        // Store token
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
      } catch (error) {
        set((state) => {
          state.auth.error = error instanceof Error ? error.message : 'Login failed';
          state.auth.isLoading = false;
        });
      }
    },

    logout: () => {
      localStorage.removeItem('auth_token');
      set((state) => {
        state.auth.user = null;
        state.auth.isAuthenticated = false;
        state.auth.error = null;
      });
    },

    setUser: (user: User | null) => {
      set((state) => {
        state.auth.user = user;
        state.auth.isAuthenticated = user !== null;
      });
    },

    setLoading: (loading: boolean) => {
      set((state) => {
        state.auth.isLoading = loading;
      });
    },

    setError: (error: string | null) => {
      set((state) => {
        state.auth.error = error;
      });
    },
  },
});

// ============================================================================
// Convenience Hook
// ============================================================================

import { useStore } from '../store';

export const useAuth = () => {
  const auth = useStore((state) => state.auth);
  return auth;
};
