/**
 * Users Page Tests
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

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  })),
}));

// Mock components with correct paths (relative to test file in __tests__)
vi.mock('../../components/UserDirectory', () => ({
  UserDirectory: ({ currentUserId, onConnect, onMessage, onViewProfile }: any) => (
    <div data-testid="user-directory" data-user-id={currentUserId}>
      <button data-testid="connect-btn" onClick={() => onConnect('user-2')}>Connect</button>
      <button data-testid="message-btn" onClick={() => onMessage('user-2')}>Message</button>
      <button data-testid="view-profile-btn" onClick={() => onViewProfile('user-2')}>View Profile</button>
    </div>
  ),
}));

vi.mock('../../components/SimpleHeader', () => ({
  SimpleHeader: () => <div data-testid="simple-header">Header</div>,
}));

vi.mock('../../config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001${path}`,
}));

vi.mock('../../lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { Users } from '../Users';

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('user-directory')).toBeInTheDocument();
  });

  test('renders simple header', () => {
    renderPage();
    expect(screen.getByTestId('simple-header')).toBeInTheDocument();
  });

  test('passes current user id to UserDirectory', () => {
    renderPage();
    expect(screen.getByTestId('user-directory')).toHaveAttribute('data-user-id', 'user-1');
  });

  test('navigates to profile on view profile click', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('view-profile-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile/user-2');
  });

  test('handles message action', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ conversation: { id: 'conv-1' } }),
    }) as any;
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');

    renderPage();
    fireEvent.click(screen.getByTestId('message-btn'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/messages?conversation=conv-1');
    });
  });

  test('shows error when trying to message without auth', async () => {
    const { useAuth } = await import('@/store/slices/authSlice');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);

    renderPage();
    fireEvent.click(screen.getByTestId('message-btn'));

    const { toast } = await import('../../lib/toast');
    expect(toast.error).toHaveBeenCalledWith('Please sign in to send messages');
  });
});
