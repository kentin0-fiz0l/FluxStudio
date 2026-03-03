/**
 * ProjectDashboard Component Tests
 *
 * Tests: renders with data, shows not-found state, sidebar/header/content layout.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ProjectDashboard } from '../ProjectDashboard';

// Mock dependencies
vi.mock('../../../contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentProject: null,
    currentTeam: null,
    currentOrganization: null,
    files: [],
    isLoading: false,
    isLoadingFiles: false,
    navigateTo: vi.fn(),
    fetchFiles: vi.fn(),
    uploadFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    getProjectStats: vi.fn().mockResolvedValue(null),
    getProjectMembers: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', name: 'Test' } })),
}));

vi.mock('../../MobileOptimizedHeader', () => ({
  MobileOptimizedHeader: () => <div data-testid="mobile-header" />,
}));

vi.mock('../../OrganizationBreadcrumb', () => ({
  OrganizationBreadcrumb: () => <div data-testid="breadcrumb" />,
}));

vi.mock('../ProjectHeader', () => ({
  ProjectHeader: () => <div data-testid="project-header" />,
}));

vi.mock('../FileSearchBar', () => ({
  FileSearchBar: () => <div data-testid="file-search-bar" />,
}));

vi.mock('../FileGrid', () => ({
  FileGrid: () => <div data-testid="file-grid" />,
}));

vi.mock('../ProjectSidebar', () => ({
  ProjectSidebar: () => <div data-testid="project-sidebar" />,
}));

const { useOrganization } = await import('../../../contexts/OrganizationContext');

describe('ProjectDashboard', () => {
  test('renders "Project Not Found" when currentProject is null', () => {
    render(<ProjectDashboard />);

    expect(screen.getByText('Project Not Found')).toBeTruthy();
    expect(screen.getByText('Return to Dashboard')).toBeTruthy();
  });

  test('renders project layout when currentProject exists', () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentProject: {
        id: 'p1',
        name: 'Test Project',
        status: 'active',
        priority: 'high',
        createdAt: '2025-01-01',
        metadata: { projectType: 'design' },
      },
      currentTeam: null,
      currentOrganization: null,
      files: [],
      isLoading: false,
      isLoadingFiles: false,
      navigateTo: vi.fn(),
      fetchFiles: vi.fn(),
      uploadFile: vi.fn(),
      updateFile: vi.fn(),
      deleteFile: vi.fn(),
      getProjectStats: vi.fn().mockResolvedValue(null),
      getProjectMembers: vi.fn().mockResolvedValue([]),
    } as any);

    render(<ProjectDashboard />);

    expect(screen.getByTestId('project-header')).toBeTruthy();
    expect(screen.getByTestId('file-search-bar')).toBeTruthy();
    expect(screen.getByTestId('file-grid')).toBeTruthy();
    expect(screen.getByTestId('project-sidebar')).toBeTruthy();
  });

  test('renders breadcrumb navigation when project exists', () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentProject: {
        id: 'p1',
        name: 'Test',
        status: 'active',
        priority: 'medium',
        createdAt: '2025-01-01',
        metadata: { projectType: 'design' },
      },
      currentTeam: null,
      currentOrganization: null,
      files: [],
      isLoading: false,
      isLoadingFiles: false,
      navigateTo: vi.fn(),
      fetchFiles: vi.fn(),
      uploadFile: vi.fn(),
      updateFile: vi.fn(),
      deleteFile: vi.fn(),
      getProjectStats: vi.fn().mockResolvedValue(null),
      getProjectMembers: vi.fn().mockResolvedValue([]),
    } as any);

    render(<ProjectDashboard />);

    expect(screen.getByTestId('breadcrumb')).toBeTruthy();
  });
});
