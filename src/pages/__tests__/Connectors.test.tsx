/**
 * Connectors Page Tests
 *
 * Tests the integration dashboard with OAuth connections, file browsing, and imports.
 */

import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  Badge: ({ children, variant, size: _size, className }: any) => <span data-variant={variant} className={className}>{children}</span>,
  Button: ({ children, onClick, disabled, icon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {icon}
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/UniversalEmptyState', () => ({
  UniversalEmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

const mockConnectorsState = {
  connectors: [
    {
      id: 'github' as const,
      name: 'GitHub',
      description: 'Connect your GitHub repositories',
      status: 'connected' as const,
      category: 'Development',
      username: 'testuser',
    },
    {
      id: 'google_drive' as const,
      name: 'Google Drive',
      description: 'Access your Google Drive files',
      status: 'disconnected' as const,
      category: 'Storage',
      username: null,
    },
    {
      id: 'figma' as const,
      name: 'Figma',
      description: 'Import Figma designs',
      status: 'disconnected' as const,
      category: 'Design',
      username: null,
    },
  ],
  loading: false,
  error: null as string | null,
  currentProvider: null,
  files: [],
  filesLoading: false,
  currentPath: [],
  importedFiles: [],
};

const mockConnectorsActions = {
  setCurrentProvider: vi.fn(),
  setError: vi.fn(),
  fetchConnectors: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  fetchFiles: vi.fn(),
  importFile: vi.fn(),
  fetchImportedFiles: vi.fn(),
  linkFileToProject: vi.fn(),
  navigateToFolder: vi.fn(),
  navigateBack: vi.fn(),
};

vi.mock('@/store', () => ({
  useConnectors: vi.fn(() => ({
    state: mockConnectorsState,
    ...mockConnectorsActions,
  })),
}));

vi.mock('@/store/slices/notificationSlice', () => ({
  useNotifications: vi.fn(() => ({
    addToast: vi.fn(),
  })),
  useNotification: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

import Connectors from '../Connectors';

describe('Connectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state
    mockConnectorsState.loading = false;
    mockConnectorsState.error = null;
    mockConnectorsState.currentProvider = null;
    mockConnectorsState.files = [];
    mockConnectorsState.importedFiles = [];
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <Connectors />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    const { container } = renderPage();
    expect(container.firstChild).toBeTruthy();
  });

  test('displays page heading', () => {
    renderPage();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  test('displays description text', () => {
    renderPage();
    expect(screen.getByText(/Connect your favorite tools/)).toBeInTheDocument();
  });

  test('shows connected count badge', () => {
    renderPage();
    expect(screen.getByText('1 connected')).toBeInTheDocument();
  });

  test('displays all connector cards', () => {
    renderPage();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Figma')).toBeInTheDocument();
  });

  test('shows connector descriptions', () => {
    renderPage();
    expect(screen.getByText('Connect your GitHub repositories')).toBeInTheDocument();
    expect(screen.getByText('Access your Google Drive files')).toBeInTheDocument();
  });

  test('shows Connected badge for connected providers', () => {
    renderPage();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  test('shows Browse Files button for connected providers', () => {
    renderPage();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  test('shows Connect button for disconnected providers', () => {
    renderPage();
    const connectButtons = screen.getAllByText('Connect');
    expect(connectButtons.length).toBe(2); // google_drive and figma
  });

  test('shows Disconnect button for connected providers', () => {
    renderPage();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  test('clicking Connect calls connect action', () => {
    renderPage();
    const connectButtons = screen.getAllByText('Connect');
    fireEvent.click(connectButtons[0]);
    expect(mockConnectorsActions.connect).toHaveBeenCalled();
  });

  test('clicking Disconnect calls disconnect action', () => {
    renderPage();
    fireEvent.click(screen.getByText('Disconnect'));
    expect(mockConnectorsActions.disconnect).toHaveBeenCalledWith('github');
  });

  test('clicking Browse Files triggers file fetch', () => {
    renderPage();
    fireEvent.click(screen.getByText('Browse Files'));
    expect(mockConnectorsActions.fetchFiles).toHaveBeenCalledWith('github');
  });

  test('displays refresh button', () => {
    renderPage();
    expect(screen.getByLabelText('Refresh connectors')).toBeInTheDocument();
  });

  test('clicking refresh triggers fetchConnectors', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Refresh connectors'));
    expect(mockConnectorsActions.fetchConnectors).toHaveBeenCalled();
  });

  test('displays error message when error is set', () => {
    mockConnectorsState.error = 'Failed to connect to GitHub';
    renderPage();
    expect(screen.getByText('Failed to connect to GitHub')).toBeInTheDocument();
  });

  test('dismiss button clears error', () => {
    mockConnectorsState.error = 'Some error';
    renderPage();
    fireEvent.click(screen.getByText('Dismiss'));
    expect(mockConnectorsActions.setError).toHaveBeenCalledWith(null);
  });

  test('displays request integration CTA', () => {
    renderPage();
    expect(screen.getByText('Need a new integration?')).toBeInTheDocument();
    expect(screen.getByText('Request Integration')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    mockConnectorsState.loading = true;
    // Clear connectors to trigger loading spinner
    const originalConnectors = mockConnectorsState.connectors;
    mockConnectorsState.connectors = [];
    renderPage();
    expect(screen.getByText('Loading connectors...')).toBeInTheDocument();
    mockConnectorsState.connectors = originalConnectors;
  });

  test('shows username for connected providers', () => {
    renderPage();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  test('fetches imported files on mount', () => {
    renderPage();
    expect(mockConnectorsActions.fetchImportedFiles).toHaveBeenCalled();
  });

  test('groups connectors by category', () => {
    renderPage();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });
});
