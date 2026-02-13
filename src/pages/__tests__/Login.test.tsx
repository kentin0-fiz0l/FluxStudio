/**
 * Login Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })),
}));

// Mock Google OAuth
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: any) => <div>{children}</div>,
  GoogleLogin: ({ onSuccess }: any) => (
    <button data-testid="google-login" onClick={() => onSuccess({ credential: 'mock-token' })}>
      Sign in with Google
    </button>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { Login } from '../Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogin = (initialEntries: string[] = ['/login']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Login />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    test('renders without crashing', () => {
      renderLogin();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    test('displays email and password inputs', () => {
      renderLogin();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    test('displays sign in button', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });

    test('displays sign up link', () => {
      renderLogin();
      expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    });

    test('displays forgot password link', () => {
      renderLogin();
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    });

    test('displays Google login button', () => {
      renderLogin();
      expect(screen.getByTestId('google-login')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    test('updates email field on input', () => {
      renderLogin();
      const emailInput = screen.getByPlaceholderText('you@example.com') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    test('updates password field on input', () => {
      renderLogin();
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'secret123' } });
      expect(passwordInput.value).toBe('secret123');
    });

    test('toggles password visibility', () => {
      renderLogin();
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      const hideButton = screen.getByRole('button', { name: /hide password/i });
      fireEvent.click(hideButton);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Form Submission', () => {
    test('calls login with email and password on submit', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    test('navigates to dashboard on successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('navigates to callbackUrl on successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin(['/login?callbackUrl=/projects']);

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects');
      });
    });

    test('displays error message on login failure', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid email or password'));
      renderLogin();

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'bad@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong' } });
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      let resolveLogin: () => void;
      mockLogin.mockImplementation(() => new Promise<void>((resolve) => { resolveLogin = resolve; }));
      renderLogin();

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

      expect(screen.getByText('Signing in...')).toBeInTheDocument();

      resolveLogin!();
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Google OAuth', () => {
    test('calls loginWithGoogle on Google sign-in success', async () => {
      mockLoginWithGoogle.mockResolvedValue(undefined);
      renderLogin();

      fireEvent.click(screen.getByTestId('google-login'));

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalledWith('mock-token');
      });
    });
  });
});
