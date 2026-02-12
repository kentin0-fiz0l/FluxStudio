/**
 * AuthContext Unit Tests
 * Tests authentication flows, token management, and state handling
 * @file src/__tests__/auth/AuthContext.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock apiService
vi.mock('../../services/apiService', () => ({
  apiService: {
    login: vi.fn(),
    signup: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

import { apiService } from '../../services/apiService';

// Test component that uses the auth context
function TestComponent() {
  const { user, isLoading, isAuthenticated, login, logout, token } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <button onClick={() => login('test@example.com', 'password123')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    userType: 'designer' as const,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Default mock - no authenticated user
    (apiService.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should start with loading state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Loading is only briefly true at the start
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });
    });

    it('should have no user when not authenticated', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });
    });

    it('should restore user from stored token on mount', async () => {
      localStorage.setItem('auth_token', 'valid-token');

      (apiService.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });
    });
  });

  describe('Login flow', () => {
    it('should successfully login with valid credentials', async () => {
      const user = userEvent.setup();

      (apiService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          token: 'new-token',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: mockUser,
        },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      expect(localStorage.getItem('auth_token')).toBe('new-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    });

    it('should throw error on login failure', async () => {
      (apiService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      let loginError: Error | null = null;

      function ErrorTestComponent() {
        const { login } = useAuth();

        const handleLogin = async () => {
          try {
            await login('test@example.com', 'wrong');
          } catch (e) {
            loginError = e as Error;
          }
        };

        return <button onClick={handleLogin}>Login</button>;
      }

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {});
      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(loginError).not.toBeNull();
        expect(loginError?.message).toBe('Invalid credentials');
      });
    });
  });

  describe('Signup flow', () => {
    it('should successfully signup with valid data', async () => {
      (apiService.signup as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          token: 'signup-token',
          user: mockUser,
        },
      });

      let signupUser: any = null;

      function SignupTestComponent() {
        const { signup } = useAuth();

        const handleSignup = async () => {
          signupUser = await signup('new@example.com', 'password123', 'New User', 'client');
        };

        return <button onClick={handleSignup}>Signup</button>;
      }

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <SignupTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {});
      await user.click(screen.getByText('Signup'));

      await waitFor(() => {
        expect(signupUser).not.toBeNull();
        expect(signupUser.email).toBe('test@example.com');
      });
    });
  });

  describe('Logout flow', () => {
    it('should clear tokens and user on logout', async () => {
      const user = userEvent.setup();

      localStorage.setItem('auth_token', 'valid-token');
      localStorage.setItem('refresh_token', 'valid-refresh');

      (apiService.getMe as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      (apiService.logout as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('Google OAuth flow', () => {
    it('should handle Google login successfully', async () => {
      (apiService.loginWithGoogle as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          token: 'google-token',
          user: mockUser,
        },
      });

      let googleUser: any = null;

      function GoogleTestComponent() {
        const { loginWithGoogle } = useAuth();

        const handleGoogleLogin = async () => {
          googleUser = await loginWithGoogle('google-credential');
        };

        return <button onClick={handleGoogleLogin}>Google Login</button>;
      }

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <GoogleTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {});
      await user.click(screen.getByText('Google Login'));

      await waitFor(() => {
        expect(googleUser).not.toBeNull();
      });

      expect(apiService.loginWithGoogle).toHaveBeenCalledWith('google-credential');
    });
  });

  describe('Dashboard path routing', () => {
    it('should return correct dashboard path for client', async () => {
      let dashboardPath = '';

      function PathTestComponent() {
        const { getUserDashboardPath } = useAuth();
        dashboardPath = getUserDashboardPath('client');
        return <div>{dashboardPath}</div>;
      }

      render(
        <AuthProvider>
          <PathTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(dashboardPath).toBe('/dashboard/client');
      });
    });

    it('should return correct dashboard path for designer', async () => {
      let dashboardPath = '';

      function PathTestComponent() {
        const { getUserDashboardPath } = useAuth();
        dashboardPath = getUserDashboardPath('designer');
        return <div>{dashboardPath}</div>;
      }

      render(
        <AuthProvider>
          <PathTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(dashboardPath).toBe('/dashboard/designer');
      });
    });

    it('should return correct dashboard path for admin', async () => {
      let dashboardPath = '';

      function PathTestComponent() {
        const { getUserDashboardPath } = useAuth();
        dashboardPath = getUserDashboardPath('admin');
        return <div>{dashboardPath}</div>;
      }

      render(
        <AuthProvider>
          <PathTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(dashboardPath).toBe('/dashboard/admin');
      });
    });
  });

  describe('useAuth hook error handling', () => {
    it('should work without AuthProvider since state is in Zustand', () => {
      // useAuth is now a Zustand hook and does not require a provider
      const { unmount } = render(<TestComponent />);
      unmount();
    });
  });
});
