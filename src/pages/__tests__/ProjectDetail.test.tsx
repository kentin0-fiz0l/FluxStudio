/**
 * ProjectDetail Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
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

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [
      {
        id: 'proj-1',
        name: 'Test Project',
        status: 'active',
        priority: 'high',
        progress: 50,
        members: ['user-1'],
        files: [],
        teamId: 'team-1',
        organizationId: 'org-1',
      },
    ],
    loading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasksQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateTaskMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateTaskMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteTaskMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  Task: {},
}));

vi.mock('@/hooks/useTaskRealtime', () => ({
  useTaskRealtime: vi.fn(() => ({
    onlineUsers: [],
  })),
}));

vi.mock('@/hooks/useProjectCounts', () => ({
  useProjectCounts: vi.fn(() => ({
    counts: { messages: 0, tasks: 0 },
  })),
}));

vi.mock('@/hooks/useFormations', () => ({
  useFormations: vi.fn(() => ({
    formations: [],
    loading: false,
  })),
}));

vi.mock('@/contexts/AssetsContext', () => ({
  useAssets: vi.fn(() => ({
    state: { assets: [], loading: false },
    refreshAssets: vi.fn(),
    deleteAsset: vi.fn(),
    setSelectedAsset: vi.fn(),
  })),
}));

vi.mock('@/store', () => ({
  useActiveProject: vi.fn(() => ({
    setActiveProject: vi.fn(),
    isProjectFocused: vi.fn(() => false),
  })),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div role="tablist" {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => <button role="tab" data-value={value} {...props}>{children}</button>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/projects/ProjectOverviewTab', () => ({
  ProjectOverviewTab: () => <div data-testid="project-overview-tab">Overview Content</div>,
}));

vi.mock('@/components/projects/ProjectMessagesTab', () => ({
  ProjectMessagesTab: () => <div data-testid="project-messages-tab" />,
}));

vi.mock('@/components/projects/ProjectFilesTab', () => ({
  ProjectFilesTab: () => <div data-testid="project-files-tab" />,
}));

vi.mock('@/components/projects/FormationsTab', () => ({
  FormationsTab: () => <div data-testid="formations-tab" />,
}));

vi.mock('@/components/tasks/TaskDetailModal', () => ({
  TaskDetailModal: () => <div data-testid="task-detail-modal" />,
}));

vi.mock('@/components/assets/AssetDetailDrawer', () => ({
  AssetDetailDrawer: () => <div data-testid="asset-detail-drawer" />,
}));

vi.mock('@/components/documents/DocumentList', () => ({
  DocumentList: () => <div data-testid="document-list" />,
}));

vi.mock('@/components/documents/TiptapCollaborativeEditor', () => ({
  TiptapCollaborativeEditor: () => <div data-testid="tiptap-editor" />,
}));

vi.mock('@/components/analytics/ProjectHealthDashboard', () => ({
  ProjectHealthDashboard: () => <div data-testid="health-dashboard" />,
}));

vi.mock('@/components/analytics/DeadlineRiskPanel', () => ({
  DeadlineRiskPanel: () => <div data-testid="deadline-risk" />,
}));

vi.mock('@/components/analytics/TeamWorkloadPanel', () => ({
  TeamWorkloadPanel: () => <div data-testid="team-workload" />,
}));

vi.mock('@/components/loading/LoadingStates', () => ({
  ProjectDetailSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('../ProjectDetail/ProjectDetailHelpers', () => ({
  PresenceIndicators: () => <div data-testid="presence-indicators" />,
  TabPresenceIndicator: () => null,
  statusVariants: { active: 'default', completed: 'success', on_hold: 'warning' } as any,
  priorityVariants: { high: 'danger', medium: 'warning', low: 'default' } as any,
}));

vi.mock('../ProjectDetail/ProjectDetailTabs', () => ({
  TasksTabPanel: () => <div data-testid="tasks-tab-panel" />,
  AssetsTabPanel: () => <div data-testid="assets-tab-panel" />,
  BoardsTabPanel: () => <div data-testid="boards-tab-panel" />,
}));

import { ProjectDetail } from '../ProjectDetail';

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, boards: [] }),
    }) as any;
  });

  const renderPage = (projectId = 'proj-1') =>
    render(
      <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays project name', () => {
    renderPage();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  test('displays tab navigation', () => {
    renderPage();
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
  });

  test('shows overview tab content by default', () => {
    renderPage();
    expect(screen.getByTestId('project-overview-tab')).toBeInTheDocument();
  });

  test('shows project not found for invalid project', async () => {
    const { useProjects } = await import('@/hooks/useProjects');
    vi.mocked(useProjects).mockReturnValue({
      projects: [],
      loading: false,
      error: null,
    } as any);

    renderPage('nonexistent');
    expect(screen.getByText('Project Not Found')).toBeInTheDocument();
  });

  test('shows loading skeleton when projects are loading', async () => {
    const { useProjects } = await import('@/hooks/useProjects');
    vi.mocked(useProjects).mockReturnValue({
      projects: [],
      loading: true,
      error: null,
    } as any);

    renderPage();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
