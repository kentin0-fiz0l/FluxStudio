import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';

export type UserType = 'client' | 'designer' | 'admin';

interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string, userType: UserType) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  loginWithApple: () => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  getUserDashboardPath: (userType: UserType) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    // Check for existing session
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await apiService.getMe();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Clear invalid token
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } else {
        // No token, ensure user is null
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear any potentially corrupted token
      localStorage.removeItem('auth_token');
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

    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    setUser(user);

    // Navigation will be handled by the component
    return user;
  };

  const signup = async (email: string, password: string, name: string, userType: UserType) => {
    const response = await apiService.signup(email, password, name, userType);

    if (!response.success) {
      throw new Error(response.error || 'Signup failed');
    }

    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    setUser(user);

    // Navigation will be handled by the component
    return user;
  };

  const loginWithGoogle = async (credential: string): Promise<User> => {
    const response = await apiService.loginWithGoogle(credential);

    if (!response.success) {
      throw new Error(response.error || 'Google login failed');
    }

    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    setUser(user);

    return user;
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

    const { token, user } = await response.json();
    localStorage.setItem('auth_token', token);
    setUser(user);

    return user;
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
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
    isAuthenticated: !!user,
    getUserDashboardPath,
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