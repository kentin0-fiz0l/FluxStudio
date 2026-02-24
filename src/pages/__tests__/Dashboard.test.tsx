/**
 * Dashboard (AdaptiveDashboard) Page Tests
 *
 * AdaptiveDashboard uses lazy() with relative imports for sub-components.
 * We mock those modules at the correct resolved path and wrap renders in act()
 * to allow Suspense fallbacks to resolve.
 */

import { render, screen, act } from '@testing-library/react';
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

vi.mock('@/store', () => ({
  useWorkspace: vi.fn(() => ({
    state: {
      currentContext: 'dashboard',
      activeProject: null,
      activeConversation: null,
      activeOrganization: null,
      activeTeam: null,
      currentWorkflow: null,
      recentActivity: [],
      notifications: [],
    },
    actions: {
      setContext: vi.fn(),
      getContextualActions: vi.fn(() => []),
    },
  })),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [],
    loading: false,
  })),
}));

vi.mock('@/hooks/useMessaging', () => ({
  useMessaging: vi.fn(() => ({
    conversations: [],
  })),
}));

vi.mock('@/hooks/useFiles', () => ({
  useFiles: vi.fn(() => ({
    files: [],
  })),
}));

vi.mock('@/hooks/useFirstTimeExperience', () => ({
  useFirstTimeExperience: vi.fn(() => ({
    isFirstTime: false,
    steps: [],
    completedCount: 0,
    totalSteps: 0,
    dismiss: vi.fn(),
    markStepComplete: vi.fn(),
    updateData: vi.fn(),
  })),
}));

// Mock lazy-loaded components at their resolved paths (relative from AdaptiveDashboard.tsx)
vi.mock('@/components/DashboardShell', () => ({
  DashboardShell: ({ children }: any) => <div data-testid="dashboard-shell">{children}</div>,
}));

vi.mock('@/components/IntegratedActivityFeed', () => ({
  IntegratedActivityFeed: () => <div data-testid="activity-feed" />,
}));

vi.mock('@/components/widgets/DraggableWidgetGrid', () => ({
  DraggableWidgetGrid: () => <div data-testid="widget-grid" />,
}));

vi.mock('@/components/workflows/AIWorkflowAssistant', () => ({
  AIWorkflowAssistant: () => <div data-testid="ai-workflow" />,
}));

vi.mock('@/components/common/GettingStartedCard', () => ({
  GettingStartedCard: () => <div data-testid="getting-started" />,
}));

import { AdaptiveDashboard } from '@/components/AdaptiveDashboard';

describe('AdaptiveDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <MemoryRouter>
          <AdaptiveDashboard />
        </MemoryRouter>
      );
    });
    return result!;
  };

  test('renders without crashing', async () => {
    const { container } = await renderDashboard();
    expect(container.firstChild).toBeTruthy();
  });

  test('displays welcome message', async () => {
    await renderDashboard();
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
  });

  test('displays connect your tools card', async () => {
    await renderDashboard();
    expect(screen.getByText('Connect Your Tools')).toBeInTheDocument();
  });
});
