/**
 * EmailVerification Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
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

import { EmailVerification } from '../EmailVerification';

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    renderPage('?token=abc123');
    expect(screen.getByText('Verifying Your Email')).toBeInTheDocument();
  });

  test('displays error when no token is provided', () => {
    renderPage();
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('No verification token provided')).toBeInTheDocument();
  });

  test('displays success state on successful verification', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Email verified successfully!' }),
    }) as any;

    renderPage('?token=valid-token');

    await waitFor(() => {
      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    });
  });

  test('displays error state on failed verification', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Token expired' }),
    }) as any;

    renderPage('?token=expired-token');

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });

  test('displays resend button on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Token expired' }),
    }) as any;

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
});
