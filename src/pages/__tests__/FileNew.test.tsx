/**
 * FileNew Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/contexts/FilesContext', () => ({
  useFilesOptional: vi.fn(() => ({
    state: {
      files: [
        { id: 'f1', name: 'design.png', type: 'image', size: 1024000, createdAt: '2024-01-01', source: 'upload' },
        { id: 'f2', name: 'document.pdf', type: 'pdf', size: 2048000, createdAt: '2024-01-02', source: 'upload' },
      ],
      isLoading: false,
      error: null,
      filters: { search: '', projectId: undefined, source: 'all' },
      pagination: { page: 1, pageSize: 20, total: 2 },
      selectedFile: null,
      stats: { totalFiles: 2, totalSize: 3072000 },
    },
    refreshFiles: vi.fn(),
    uploadFiles: vi.fn().mockResolvedValue([]),
    renameFile: vi.fn().mockResolvedValue(true),
    deleteFile: vi.fn().mockResolvedValue(true),
    linkFileToProject: vi.fn().mockResolvedValue(true),
    setFilters: vi.fn(),
    setPage: vi.fn(),
    setSelectedFile: vi.fn(),
  })),
  FileRecord: {},
  FileSource: {},
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [{ id: 'p1', name: 'Project 1' }],
    loading: false,
  })),
}));

vi.mock('@/hooks/useWorkMomentumCapture', () => ({
  useReportEntityFocus: vi.fn(() => ({
    reportFile: vi.fn(),
    reportProject: vi.fn(),
    reportAsset: vi.fn(),
  })),
}));

vi.mock('@/store', () => ({
  useProjectContext: vi.fn(() => ({
    activeProject: null,
  })),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  formatFileSize: (size: number) => `${(size / 1024).toFixed(1)} KB`,
  formatRelativeTime: () => '2 hours ago',
}));

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

// Mock file sub-components
vi.mock('@/components/files/FileToolbar', () => ({
  FileToolbar: () => <div data-testid="file-toolbar">File Toolbar</div>,
}));

vi.mock('@/components/files/FileMetadata', () => ({
  FileFilters: () => <div data-testid="file-filters" />,
  FileStatsBar: () => <div data-testid="file-stats" />,
  FileErrorBar: () => null,
  FileUploadProgress: () => null,
}));

vi.mock('@/components/files/FileViewer', () => ({
  FileViewer: () => <div data-testid="file-viewer" />,
}));

import FileNew from '../FileNew';

describe('FileNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderFileNew = () => {
    return render(
      <MemoryRouter>
        <FileNew />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderFileNew();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('renders file toolbar', () => {
    renderFileNew();
    expect(screen.getByTestId('file-toolbar')).toBeInTheDocument();
  });
});
