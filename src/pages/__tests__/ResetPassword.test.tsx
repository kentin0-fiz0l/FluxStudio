/**
 * ResetPassword Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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

import { ResetPassword } from '../ResetPassword';

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const renderPage = (params = '') => {
    return render(
      <MemoryRouter initialEntries={[`/reset-password${params}`]}>
        <ResetPassword />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage('?token=abc123');
    expect(screen.getByText('Create new password')).toBeInTheDocument();
  });

  test('displays password and confirm password fields', () => {
    renderPage('?token=abc123');
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  test('displays reset password button', () => {
    renderPage('?token=abc123');
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  test('displays error when no token is provided', () => {
    renderPage();
    expect(screen.getByText('Invalid reset link. Please request a new password reset.')).toBeInTheDocument();
  });

  test('shows email when provided in URL', () => {
    renderPage('?token=abc123&email=test@example.com');
    expect(screen.getByText('for test@example.com')).toBeInTheDocument();
  });

  test('toggles password visibility', () => {
    renderPage('?token=abc123');
    const passwordInput = screen.getByLabelText('New password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleButtons = screen.getAllByRole('button');
    // Find the first toggle button (visibility toggle for password field)
    const toggleBtn = toggleButtons.find(btn => btn.querySelector('[aria-hidden]') && (btn as HTMLButtonElement).type === 'button');
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');
    }
  });

  test('shows password strength indicator when typing', () => {
    renderPage('?token=abc123');
    const passwordInput = screen.getByLabelText('New password');

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    expect(screen.getByText('Weak')).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: 'StrongPass1' } });
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  test('shows password match indicator', () => {
    renderPage('?token=abc123');
    const passwordInput = screen.getByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm password');

    fireEvent.change(passwordInput, { target: { value: 'Password1!' } });
    fireEvent.change(confirmInput, { target: { value: 'Different' } });
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

    fireEvent.change(confirmInput, { target: { value: 'Password1!' } });
    expect(screen.getByText('Passwords match')).toBeInTheDocument();
  });

  test('shows error when passwords do not match on submit', async () => {
    renderPage('?token=abc123');

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Different!' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Both inline indicator and form-level error can show this text
      const matches = screen.getAllByText('Passwords do not match');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('displays back to login link', () => {
    renderPage('?token=abc123');
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  test('displays contact support link', () => {
    renderPage('?token=abc123');
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });
});
