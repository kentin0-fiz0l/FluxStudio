/**
 * SignupWizard Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSignup = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    signup: mockSignup,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    signup: mockSignup,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })),
}));

vi.mock('../hooks/useGoogleOAuth', () => ({
  useGoogleOAuth: vi.fn(() => ({
    isReady: false,
    isLoading: false,
    error: null,
    createButton: vi.fn(),
    removeButton: vi.fn(),
  })),
}));

vi.mock('../services/analytics/eventTracking', () => ({
  eventTracker: {
    trackEvent: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { SignupWizard } from '../SignupWizard';

describe('SignupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (initialEntries: string[] = ['/signup-wizard']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <SignupWizard />
      </MemoryRouter>
    );
  };

  describe('Step 1: Basic Information', () => {
    test('renders without crashing', () => {
      renderPage();
      expect(screen.getByText("Welcome! Let's get started")).toBeInTheDocument();
    });

    test('displays name and email fields', () => {
      renderPage();
      expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });

    test('displays step indicator showing step 1 of 3', () => {
      renderPage();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    test('displays continue button', () => {
      renderPage();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    test('displays sign in link', () => {
      renderPage();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    test('shows error if fields are empty on continue', async () => {
      renderPage();
      fireEvent.click(screen.getByText('Continue'));
      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    test('advances to step 2 when basic info is filled', async () => {
      renderPage();

      fireEvent.change(screen.getByPlaceholderText('Your full name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Secure Your Account')).toBeInTheDocument();
      });
    });

    test('back button is disabled on step 1', () => {
      renderPage();
      const backButton = screen.getByText('Back').closest('button');
      expect(backButton).toBeDisabled();
    });

    test('shows terms and privacy links', () => {
      renderPage();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });
  });

  describe('Step 2: Security', () => {
    const goToStep2 = () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Your full name'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByText('Continue'));
    };

    test('shows password fields on step 2', async () => {
      goToStep2();
      await waitFor(() => {
        expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Re-enter your password')).toBeInTheDocument();
      });
    });

    test('shows password mismatch error', async () => {
      goToStep2();
      await waitFor(() => {
        expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
        target: { value: 'StrongPass1!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), {
        target: { value: 'Different1!' },
      });

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });
});
