/**
 * EmailVerification Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

import { apiService } from '@/services/apiService';
import { EmailVerification } from '../EmailVerification';

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.post).mockReset();
  });

  const renderPage = (params = '') => {
    return render(
      <MemoryRouter initialEntries={[`/verify-email${params}`]}>
        <EmailVerification />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('FluxStudio')).toBeInTheDocument();
  });

  test('displays verifying state when token is present', () => {
    vi.mocked(apiService.post).mockReturnValue(new Promise(() => {}));
    renderPage('?token=abc123');
    expect(screen.getByText('Verifying Your Email')).toBeInTheDocument();
  });

  test('displays error when no token is provided', () => {
    renderPage();
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('No verification token provided')).toBeInTheDocument();
  });

  test('displays success state on successful verification', async () => {
    vi.mocked(apiService.post).mockResolvedValueOnce({
      success: true,
      data: { message: 'Email verified successfully!' },
    });

    renderPage('?token=valid-token');

    await waitFor(() => {
      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    });
  });

  test('displays error state on failed verification', async () => {
    vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Token expired'));

    renderPage('?token=expired-token');

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });

  test('displays resend button on error', async () => {
    vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Token expired'));

    renderPage('?token=expired-token');

    await waitFor(() => {
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
  });

  test('displays back to login link', () => {
    renderPage();
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  test('displays contact support link', () => {
    renderPage();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  describe('Resend button cooldown timer', () => {
    test('starts cooldown after successful resend', async () => {
      // Initial verification fails
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Token expired'));
      renderPage('?token=expired-token&email=test@example.com');

      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
      });

      // Resend succeeds, which triggers cooldown
      vi.mocked(apiService.post).mockResolvedValueOnce({
        success: true,
        data: { message: 'Email sent' },
      });

      await userEvent.click(screen.getByText('Resend Verification Email'));

      await waitFor(() => {
        expect(screen.getByText('Email Sent')).toBeInTheDocument();
      });
    });

    test('shows cooldown text when rate limited', async () => {
      // Initial verification fails
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Token expired'));
      renderPage('?token=expired-token&email=test@example.com');

      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
      });

      // Resend hits rate limit
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'RATE_LIMIT_EXCEEDED' });

      await userEvent.click(screen.getByText('Resend Verification Email'));

      await waitFor(() => {
        expect(screen.getByText('Please wait before requesting another verification email.')).toBeInTheDocument();
      });

      // After rate limit error, cooldown starts - button should show countdown
      expect(screen.getByText(/Resend available in \d+s/)).toBeInTheDocument();
    });

    test('resend button is disabled during cooldown', async () => {
      // Initial verification fails
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Token expired'));
      renderPage('?token=expired-token&email=test@example.com');

      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
      });

      // Resend hits rate limit to trigger cooldown
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'RATE_LIMIT_EXCEEDED' });

      await userEvent.click(screen.getByText('Resend Verification Email'));

      await waitFor(() => {
        expect(screen.getByText(/Resend available in \d+s/)).toBeInTheDocument();
      });

      // The button should be disabled during cooldown
      const button = screen.getByText(/Resend available in \d+s/).closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Error code handling', () => {
    test('displays expired token message for TOKEN_EXPIRED code', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'TOKEN_EXPIRED' });
      renderPage('?token=expired-token');

      await waitFor(() => {
        expect(screen.getByText('Your verification link has expired. Please request a new one.')).toBeInTheDocument();
      });
    });

    test('displays expired token message for AUTH_VERIFICATION_EXPIRED code', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'AUTH_VERIFICATION_EXPIRED' });
      renderPage('?token=expired-token');

      await waitFor(() => {
        expect(screen.getByText('Your verification link has expired. Please request a new one.')).toBeInTheDocument();
      });
    });

    test('displays invalid token message for TOKEN_INVALID code', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'TOKEN_INVALID' });
      renderPage('?token=bad-token');

      await waitFor(() => {
        expect(screen.getByText(/This verification link is invalid/)).toBeInTheDocument();
      });
    });

    test('displays invalid token message for AUTH_INVALID_VERIFICATION_TOKEN code', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'AUTH_INVALID_VERIFICATION_TOKEN' });
      renderPage('?token=bad-token');

      await waitFor(() => {
        expect(screen.getByText(/This verification link is invalid/)).toBeInTheDocument();
      });
    });

    test('displays already used message for TOKEN_ALREADY_USED code', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce({ code: 'TOKEN_ALREADY_USED' });
      renderPage('?token=used-token');

      await waitFor(() => {
        expect(screen.getByText(/This verification link has already been used/)).toBeInTheDocument();
      });
    });

    test('shows missing email error when resending without email param', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Token expired'));
      renderPage('?token=expired-token');

      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Resend Verification Email'));

      await waitFor(() => {
        expect(screen.getByText('Email address not found. Please sign up again.')).toBeInTheDocument();
      });
    });
  });
});
