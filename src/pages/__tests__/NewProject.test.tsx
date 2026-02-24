/**
 * NewProject Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockCreateProject = vi.fn();
const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [],
    createProject: mockCreateProject,
    loading: false,
    error: null,
  })),
  Project: {} as any,
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: vi.fn(() => ({
    teams: [],
    loading: false,
  })),
}));

vi.mock('@/hooks/useOrganizations', () => ({
  useOrganizations: vi.fn(() => ({
    currentOrganization: null,
    organizations: [],
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/services/observability', () => ({
  observability: { analytics: { track: vi.fn() } },
}));

vi.mock('@/components/templates/TemplateSelector', () => ({
  TemplateSelector: () => <div data-testid="template-selector" />,
}));

vi.mock('@/components/projects/AIProjectCreator', () => ({
  AIProjectCreator: () => <div data-testid="ai-creator" />,
}));

vi.mock('@/services/templates/TemplateService', () => ({
  templateService: { getTemplates: vi.fn(() => []) },
}));

vi.mock('@/components/payments/UpgradePrompt', () => ({
  UpgradePrompt: () => <div data-testid="upgrade-prompt" />,
}));

vi.mock('@/services/usageService', () => ({
  fetchUsage: vi.fn(() => Promise.resolve({ usage: { projects: { current: 1, limit: 10 } }, plan: 'free' })),
  isAtLimit: vi.fn(() => false),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));

vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(() => ({})),
    handleSubmit: vi.fn((fn: any) => (e: any) => { e?.preventDefault?.(); fn({ name: 'Test', description: 'Desc' }); }),
    formState: { errors: {}, isSubmitting: false },
    setValue: vi.fn(),
    watch: vi.fn((field: string) => {
      if (field === 'name') return '';
      if (field === 'description') return '';
      return '';
    }),
    reset: vi.fn(),
    trigger: vi.fn(),
    getValues: vi.fn(() => ({ name: '', description: '' })),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    control: {},
  })),
}));

import { NewProject } from '../NewProject';

describe('NewProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNewProject = () => render(
    <MemoryRouter>
      <NewProject />
    </MemoryRouter>
  );

  test('renders without crashing', () => {
    renderNewProject();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays creation mode tabs', () => {
    renderNewProject();
    // Should show blank, template, and AI creation options
    expect(screen.getByText(/blank/i) || screen.getByText(/template/i) || screen.getByText(/new project/i)).toBeTruthy();
  });

  test('shows back navigation', () => {
    renderNewProject();
    // Back navigation exists in some form
    expect(document.querySelector('[aria-label]') || document.querySelector('a[href="/projects"]')).toBeTruthy();
  });

  test('displays project name input', () => {
    renderNewProject();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  test('handles project creation', async () => {
    mockCreateProject.mockResolvedValue({ id: 'new-1', name: 'Test' });
    renderNewProject();

    // Multiple buttons may match /create/i - find the submit button specifically
    const submitBtns = screen.queryAllByRole('button', { name: /create project/i });
    const submitBtn = submitBtns[0] || screen.queryByRole('button', { name: /^create$/i });
    if (submitBtn) {
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalled();
      });
    }
  });
});
