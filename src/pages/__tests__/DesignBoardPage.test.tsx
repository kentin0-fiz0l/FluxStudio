/**
 * DesignBoardPage Tests
 *
 * Tests the collaborative 2D canvas page with Socket.IO real-time features.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock dependencies
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
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotification: vi.fn(() => ({
    showNotification: vi.fn(),
    addNotification: vi.fn(),
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock socket service using inline vi.fn() — no hoisting issues
vi.mock('@/services/designBoardsSocketService', () => ({
  designBoardsSocketService: {
    connect: vi.fn(),
    on: vi.fn(() => vi.fn()),
    joinBoard: vi.fn(),
    leaveBoard: vi.fn(),
    moveCursor: vi.fn(),
    selectNode: vi.fn(),
    deselectNode: vi.fn(),
    createNode: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
  },
  BoardNode: {},
  Board: {},
  BoardUser: {},
}));

// Mock fetch for REST fallback
global.fetch = vi.fn();

import DesignBoardPage from '../DesignBoardPage';
import { designBoardsSocketService } from '@/services/designBoardsSocketService';

describe('DesignBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the 'on' mock to return unsubscribe fns
    vi.mocked(designBoardsSocketService.on).mockImplementation(() => vi.fn());
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/boards/board-1']}>
        <Routes>
          <Route path="/boards/:boardId" element={<DesignBoardPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    const { container } = renderPage();
    expect(container.firstChild).toBeTruthy();
  });

  test('renders inside dashboard layout', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays toolbar with node creation buttons', () => {
    renderPage();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Shape')).toBeInTheDocument();
    expect(screen.getByText('Asset')).toBeInTheDocument();
  });

  test('displays back button', () => {
    renderPage();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  test('displays zoom controls with 100%', () => {
    renderPage();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('connects to socket on mount', () => {
    renderPage();
    expect(designBoardsSocketService.connect).toHaveBeenCalled();
  });

  test('subscribes to socket events on mount', () => {
    renderPage();
    const onMock = vi.mocked(designBoardsSocketService.on);
    const events = onMock.mock.calls.map(c => c[0]);
    expect(events).toContain('connect');
    expect(events).toContain('disconnect');
    expect(events).toContain('board:joined');
    expect(events).toContain('node:created');
    expect(events).toContain('node:updated');
    expect(events).toContain('node:deleted');
  });

  test('clicking back navigates away', () => {
    renderPage();
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalled();
  });

  test('shows offline indicator when not connected', () => {
    renderPage();
    // Initially isConnected is false
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  test('redirects to login when user is null', async () => {
    const { useAuth } = await import('@/store/slices/authSlice');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    } as any);

    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
