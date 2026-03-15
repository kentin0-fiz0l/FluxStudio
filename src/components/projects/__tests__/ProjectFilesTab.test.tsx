/**
 * ProjectFilesTab Tests
 *
 * Tests the ProjectFilesTab component:
 * - Empty state renders when files array is empty
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock hooks and services
const mockUseProjectFiles = vi.fn();

vi.mock('@/hooks/useProjectFiles', () => ({
  useProjectFiles: (...args: any[]) => mockUseProjectFiles(...args),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    quickPrint: vi.fn(),
  },
}));

vi.mock('@/config/environment', () => ({
  config: {
    ENABLE_FLUXPRINT: false,
  },
}));

vi.mock('@/components/printing/QuickPrintDialog', () => ({
  QuickPrintDialog: () => null,
}));

import { ProjectFilesTab } from '../ProjectFilesTab';

describe('ProjectFilesTab', () => {
  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (project = mockProject) => {
    return render(
      <MemoryRouter>
        <ProjectFilesTab project={project} />
      </MemoryRouter>
    );
  };

  test('renders loading state', () => {
    mockUseProjectFiles.mockReturnValue({
      files: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      uploadFiles: { mutate: vi.fn(), isLoading: false, error: null },
      uploadProgress: 0,
      deleteFile: { mutate: vi.fn(), isLoading: false, error: null },
    });

    renderComponent();
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
  });

  test('renders error state', () => {
    mockUseProjectFiles.mockReturnValue({
      files: [],
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
      uploadFiles: { mutate: vi.fn(), isLoading: false, error: null },
      uploadProgress: 0,
      deleteFile: { mutate: vi.fn(), isLoading: false, error: null },
    });

    renderComponent();
    expect(screen.getByText('Failed to load files')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('renders empty state when files array is empty', () => {
    mockUseProjectFiles.mockReturnValue({
      files: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      uploadFiles: { mutate: vi.fn(), isLoading: false, error: null },
      uploadProgress: 0,
      deleteFile: { mutate: vi.fn(), isLoading: false, error: null },
    });

    renderComponent();
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
  });

  test('renders files list when data exists', () => {
    mockUseProjectFiles.mockReturnValue({
      files: [
        {
          id: 'file-1',
          name: 'design.stl',
          size: 2048000,
          type: 'model/stl',
          uploadedAt: '2025-06-01T00:00:00.000Z',
          printStatus: 'idle',
        },
        {
          id: 'file-2',
          name: 'photo.jpg',
          size: 512000,
          type: 'image/jpeg',
          uploadedAt: '2025-06-15T00:00:00.000Z',
          printStatus: 'idle',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      uploadFiles: { mutate: vi.fn(), isLoading: false, error: null },
      uploadProgress: 0,
      deleteFile: { mutate: vi.fn(), isLoading: false, error: null },
    });

    renderComponent();
    expect(screen.getByText('design.stl')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Project Files')).toBeInTheDocument();
    // File count summary: "2 files . 1 printable" appears in multiple elements,
    // so use getAllByText for the printable count
    expect(screen.getByText(/2 files/)).toBeInTheDocument();
    expect(screen.getAllByText(/1 printable/).length).toBeGreaterThanOrEqual(1);
  });
});
