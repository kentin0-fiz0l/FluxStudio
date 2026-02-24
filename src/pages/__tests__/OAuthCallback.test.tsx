/**
 * OAuthCallback Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSetAuthToken = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    setAuthToken: mockSetAuthToken,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    setAuthToken: mockSetAuthToken,
  })),
}));

vi.mock('../services/apiService', () => ({
  apiService: {
    post: vi.fn(),
  },
}));

import OAuthCallback from '../OAuthCallback';

describe('OAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Default: not a popup
    Object.defineProperty(window, 'opener', { value: null, writable: true });
  });

  const renderPage = (provider: 'google' | 'figma' | 'slack' | 'github' = 'google', params = '') => {
    return render(
      <MemoryRouter initialEntries={[`/oauth/callback/${provider}${params}`]}>
        <OAuthCallback provider={provider} />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage('google', '?token=abc');
    expect(screen.getByText('Google Integration')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    renderPage('google', '?token=abc');
    expect(screen.getByText('Processing authorization...')).toBeInTheDocument();
  });

  test('displays correct provider name for figma', () => {
    renderPage('figma');
    expect(screen.getByText('Figma Integration')).toBeInTheDocument();
  });

  test('displays correct provider name for slack', () => {
    renderPage('slack');
    expect(screen.getByText('Slack Integration')).toBeInTheDocument();
  });

  test('displays correct provider name for github', () => {
    renderPage('github');
    expect(screen.getByText('GitHub Integration')).toBeInTheDocument();
  });

  test('shows success state for Google token flow', async () => {
    mockSetAuthToken.mockResolvedValue(undefined);
    renderPage('google', '?token=valid-token');

    await waitFor(() => {
      expect(screen.getByText('Connection Successful!')).toBeInTheDocument();
    });
  });

  test('shows error state for Google error flow', async () => {
    renderPage('google', '?error=google_auth_failed');

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });
  });

  test('displays help center link in footer', () => {
    renderPage('google', '?token=abc');
    expect(screen.getByText('Help Center')).toBeInTheDocument();
  });

  test('shows error for missing code and state', async () => {
    renderPage('figma');

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });
  });
});
