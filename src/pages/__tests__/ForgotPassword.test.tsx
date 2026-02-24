/**
 * ForgotPassword Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { ForgotPassword } from '../ForgotPassword';

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  test('displays email input field', () => {
    renderPage();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  test('displays send reset link button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  test('displays back to login link', () => {
    renderPage();
    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });

  test('updates email field on input', () => {
    renderPage();
    const emailInput = screen.getByPlaceholderText('you@example.com') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  test('shows error when submitting empty form', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument();
    });
  });

  test('shows success state on successful submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Password reset link sent to your email.' }),
    }) as any;

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  test('shows error state on failed submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'User not found' }),
    }) as any;

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  test('displays contact support link', () => {
    renderPage();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });
});
