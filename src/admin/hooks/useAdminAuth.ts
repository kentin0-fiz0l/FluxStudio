/**
 * Admin Authentication Hook
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * Manages admin authentication state, login, logout, and token refresh
 */

import { useState, useEffect, useCallback } from 'react';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'moderator' | 'analyst';
  roleLevel: number;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface UseAdminAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://fluxstudio.art';
const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export function useAdminAuth(): UseAdminAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Initialize auth from localStorage
   */
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser) as AdminUser;
          setState({
            user,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // Verify user has admin role
      if (!['admin', 'moderator', 'analyst'].includes(data.user?.role)) {
        throw new Error('Admin access required');
      }

      const user: AdminUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        roleLevel: getRoleLevel(data.user.role),
      };

      // Store in localStorage
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setState({
        user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  /**
   * Logout and clear stored credentials
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) {
      logout();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Update stored token
      localStorage.setItem(TOKEN_KEY, data.token);

      setState(prev => ({
        ...prev,
        token: data.token,
      }));
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  }, [logout]);

  /**
   * Auto-refresh token every 30 minutes
   */
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(() => {
      refreshToken();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshToken]);

  return {
    ...state,
    login,
    logout,
    refreshToken,
  };
}

/**
 * Get role level from role name
 */
function getRoleLevel(role: string): number {
  const levels = {
    admin: 3,
    moderator: 2,
    analyst: 1,
  };
  return levels[role as keyof typeof levels] || 0;
}

/**
 * Hook to make authenticated API requests
 */
export function useAdminApi() {
  const { token, isAuthenticated, logout } = useAdminAuth();

  const apiRequest = useCallback(async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    if (!isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle authentication errors
      if (response.status === 401) {
        logout();
        throw new Error('Authentication expired');
      }

      // Handle other errors
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }, [token, isAuthenticated, logout]);

  return { apiRequest, isAuthenticated };
}
