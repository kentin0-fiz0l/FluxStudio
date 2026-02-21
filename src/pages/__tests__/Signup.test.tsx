/**
 * Signup Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();
const mockSignup = vi.fn();
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
    signup: mockSignup,
    loginWithGoogle: mockLoginWithGoogle,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useGoogleOAuth', () => ({
  useGoogleOAuth: vi.fn(() => ({
    isReady: false,
    isLoading: false,
    error: null,
    createButton: vi.fn(),
    removeButton: vi.fn(),
  })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { Signup } from '../Signup';

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSignup = (initialEntries: string[] = ['/signup']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Signup />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    test('renders without crashing', () => {
      renderSignup();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });

    test('displays all form fields', () => {
      renderSignup();
      expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    });

    test('displays create account button', () => {
      renderSignup();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('displays sign in link', () => {
      renderSignup();
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    test('displays terms and privacy links', () => {
      renderSignup();
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    test('updates name field on input', () => {
      renderSignup();
      const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      expect(nameInput.value).toBe('Test User');
    });

    test('updates email field on input', () => {
      renderSignup();
      const emailInput = screen.getByPlaceholderText('you@example.com') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    test('toggles password visibility', () => {
      renderSignup();
      const passwordInput = screen.getByPlaceholderText('Create a password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      fireEvent.click(toggleButtons[0]);
      expect(passwordInput.type).toBe('text');
    });

    test('shows password strength indicator', () => {
      renderSignup();
      const passwordInput = screen.getByPlaceholderText('Create a password');

      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      expect(screen.getByText('Weak')).toBeInTheDocument();

      fireEvent.change(passwordInput, { target: { value: 'StrongPass1!' } });
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    test('shows password match indicator', () => {
      renderSignup();
      const passwordInput = screen.getByPlaceholderText('Create a password');
      const confirmInput = screen.getByPlaceholderText('Confirm your password');

      fireEvent.change(passwordInput, { target: { value: 'Password1!' } });
      fireEvent.change(confirmInput, { target: { value: 'Different' } });
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

      fireEvent.change(confirmInput, { target: { value: 'Password1!' } });
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('shows error when password is too short', async () => {
      renderSignup();

      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'short' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'short' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    test('shows error when passwords do not match', async () => {
      renderSignup();

      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'StrongPass1!' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'Different1!' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        // The inline validation text or the form-level error
        const errorTexts = screen.getAllByText(/passwords do not match/i);
        expect(errorTexts.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Form Submission', () => {
    test('calls signup on valid form submission', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'StrongPass1!' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'StrongPass1!' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('test@example.com', 'StrongPass1!', 'Test User', 'designer');
      });
    });

    test('navigates to dashboard on successful signup', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'StrongPass1!' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'StrongPass1!' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects');
      });
    });

    test('displays error message on signup failure', async () => {
      mockSignup.mockRejectedValue(new Error('Email already exists'));
      renderSignup();

      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'StrongPass1!' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'StrongPass1!' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      let resolveSignup: () => void;
      mockSignup.mockImplementation(() => new Promise<void>((resolve) => { resolveSignup = resolve; }));
      renderSignup();

      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'StrongPass1!' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'StrongPass1!' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Creating account...')).toBeInTheDocument();

      resolveSignup!();
      await waitFor(() => {
        expect(screen.queryByText('Creating account...')).not.toBeInTheDocument();
      });
    });
  });
});
