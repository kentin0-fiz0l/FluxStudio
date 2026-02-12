import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { authLogger } from '../lib/logger';

export type UserType = 'client' | 'designer' | 'admin';

// Dev mode: Enable mock auth when backend is unavailable
// Set VITE_DEV_MOCK_AUTH=true in .env.local to enable
// SECURITY: Only allow in development mode, never in production
const DEV_MOCK_AUTH =
  import.meta.env.VITE_DEV_MOCK_AUTH === 'true' &&
  import.meta.env.MODE === 'development';

// Production safety check - fail fast if misconfigured
if (import.meta.env.MODE === 'production' && import.meta.env.VITE_DEV_MOCK_AUTH === 'true') {
  authLogger.error('CRITICAL: Mock auth cannot be enabled in production!');
  throw new Error('Security violation: Mock authentication in production build');
}

// Mock user for development when backend is unavailable
const MOCK_USER = {
  id: 'dev-user-1',
  email: 'dev@fluxstudio.local',
  name: 'Dev User',
  userType: 'designer' as UserType,
  createdAt: new Date().toISOString(),
  avatar: undefined,
};

interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  createdAt: string;
  avatar?: string;
}

interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Refresh token 2 minutes before expiry (access tokens last 15 min)
const TOKEN_REFRESH_INTERVAL = 13 * 60 * 1000; // 13 minutes

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string, userType: UserType) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  loginWithApple: () => Promise<User>;
  logout: () => Promise<void>;
  setAuthToken: (token: string, refreshToken?: string) => Promise<void>;
  isAuthenticated: boolean;
  getUserDashboardPath: (userType: UserType) => string;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const getUserDashboardPath = (userType: UserType): string => {
    switch (userType) {
      case 'client':
        return '/dashboard/client';
      case 'designer':
        return '/dashboard/designer';
      case 'admin':
        return '/dashboard/admin';
      default:
        return '/dashboard';
    }
  };

  // Clear all auth tokens
  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  // Store tokens from auth response
  const storeTokens = useCallback((response: AuthResponse) => {
    const accessToken = response.accessToken || response.token;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }
  }, []);

  // Refresh the access token using refresh token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    // If a refresh is already in progress, wait for it instead of failing
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      authLogger.debug('Refresh already in progress, waiting...');
      return refreshPromiseRef.current;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!refreshToken && !accessToken) {
      return false;
    }

    isRefreshingRef.current = true;

    // Create and store the refresh promise so concurrent callers can wait
    const doRefresh = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          authLogger.warn('Token refresh failed', { status: response.status });
          return false;
        }

        const data = await response.json();

        if (data.success && data.data) {
          const { token, accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;
          const finalAccessToken = newAccessToken || token;

          if (finalAccessToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, finalAccessToken);
          }
          if (newRefreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          }

          authLogger.info('Token refreshed successfully');
          return true;
        }

        return false;
      } catch (error) {
        authLogger.error('Token refresh error', error);
        return false;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = doRefresh();
    return refreshPromiseRef.current;
  }, []);

  // Start automatic token refresh
  const startTokenRefresh = useCallback(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up periodic refresh (every 13 minutes for 15-minute tokens)
    refreshIntervalRef.current = setInterval(async () => {
      const success = await refreshAccessToken();
      if (!success) {
        authLogger.warn('Auto-refresh failed, user may need to re-login');
      }
    }, TOKEN_REFRESH_INTERVAL);

    authLogger.debug('Started token refresh interval');
  }, [refreshAccessToken]);

  // Stop automatic token refresh
  const stopTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Handle 401 unauthorized - try to refresh before giving up
  const handleUnauthorized = useCallback(async () => {
    authLogger.info('Received unauthorized event, attempting token refresh...');

    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      authLogger.info('Could not refresh token, logging out');
      clearTokens();
      setUser(null);
      setIsLoading(false);
      stopTokenRefresh();
      // Redirect to login page if refresh failed and not already on a public auth page
      const publicAuthPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
      const isPublicAuthPage = publicAuthPaths.some(path => window.location.pathname.includes(path));
      if (!isPublicAuthPage) {
        window.location.href = '/login?reason=session_expired';
      }
    }
  }, [refreshAccessToken, clearTokens, stopTokenRefresh]);

  useEffect(() => {
    // Check for existing session
    checkAuth();

    // Listen for 401 unauthorized events from API service
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      stopTokenRefresh();
    };
  }, [handleUnauthorized, stopTokenRefresh]);

  const checkAuth = async () => {
    // Dev mode: Use mock user when backend is unavailable
    if (DEV_MOCK_AUTH) {
      authLogger.info('DEV_MOCK_AUTH enabled - using mock user');
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        const response = await apiService.getMe();
        if (response.success && response.data) {
          setUser(response.data as User);
          // Start token refresh for authenticated users
          startTokenRefresh();
        } else {
          // Try to refresh the token before giving up
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry getting user info
            const retryResponse = await apiService.getMe();
            if (retryResponse.success && retryResponse.data) {
              setUser(retryResponse.data as User);
              startTokenRefresh();
              return;
            }
          }
          // Clear invalid tokens
          clearTokens();
          setUser(null);
        }
      } else {
        // No token, ensure user is null
        setUser(null);
      }
    } catch (error) {
      authLogger.error('Auth check failed', error);
      // Try to refresh before giving up
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          const retryResponse = await apiService.getMe();
          if (retryResponse.success && retryResponse.data) {
            setUser(retryResponse.data as User);
            startTokenRefresh();
            setIsLoading(false);
            return;
          }
        } catch {
          // Fall through to clear tokens
        }
      }
      // Clear any potentially corrupted tokens
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiService.login(email, password);

    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }

    const authData = response.data as AuthResponse;
    storeTokens(authData);
    setUser(authData.user);
    startTokenRefresh();

    // Navigation will be handled by the component
    return authData.user;
  };

  const signup = async (email: string, password: string, name: string, userType: UserType) => {
    const response = await apiService.signup(email, password, name, userType);

    if (!response.success) {
      throw new Error(response.error || 'Signup failed');
    }

    const authData = response.data as AuthResponse;
    storeTokens(authData);
    setUser(authData.user);
    startTokenRefresh();

    // Navigation will be handled by the component
    return authData.user;
  };

  const loginWithGoogle = async (credential: string): Promise<User> => {
    const response = await apiService.loginWithGoogle(credential);

    if (!response.success) {
      throw new Error(response.error || 'Google login failed');
    }

    const authData = response.data as AuthResponse;
    storeTokens(authData);
    setUser(authData.user);
    startTokenRefresh();

    return authData.user;
  };

  const loginWithApple = async (): Promise<User> => {
    const response = await fetch('/api/auth/apple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Apple login failed');
    }

    const data = await response.json();
    const authData = data as AuthResponse;
    storeTokens(authData);
    setUser(authData.user);
    startTokenRefresh();

    return authData.user;
  };

  const logout = async () => {
    stopTokenRefresh();
    try {
      await apiService.logout();
    } catch (error) {
      authLogger.error('Logout error', error);
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  // Set auth token directly (for OAuth redirect flows)
  const setAuthToken = async (token: string, refreshToken?: string): Promise<void> => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    // Fetch user info with the new token
    try {
      const response = await apiService.getMe();
      if (response.success && response.data) {
        setUser(response.data as User);
        startTokenRefresh();
      }
    } catch (error) {
      authLogger.error('Failed to fetch user after setting token', error);
      // Keep the token but user will be fetched on next page load
    }
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    loginWithGoogle,
    loginWithApple,
    logout,
    setAuthToken,
    isAuthenticated: !!user,
    getUserDashboardPath,
    token: localStorage.getItem(ACCESS_TOKEN_KEY),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}