import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ProjectsList } from '../ProjectsList';

// Mock ProjectCard since it's a complex molecule
vi.mock('../../molecules', () => ({
  ProjectCard: ({ project }: any) => <div data-testid="project-card">{project.name}</div>,
}));

vi.mock('../../common/EmptyState', () => ({
  EmptyState: ({ title }: any) => <div>{title}</div>,
  emptyStateConfigs: { projects: { title: 'No projects', description: '', primaryCtaLabel: 'Create', learnMoreItems: [] } },
}));

const baseProps = {
  projects: [],
  loading: false,
  error: null,
  viewMode: 'grid' as const,
  searchTerm: '',
  statusFilter: 'all',
  selectedProjects: new Set<string>(),
  onSelectProject: vi.fn(),
  onViewProject: vi.fn(),
  onEditProject: vi.fn(),
  onFocusProject: vi.fn(),
  isProjectFocused: vi.fn(() => false),
  onCreateProject: vi.fn(),
};

describe('ProjectsList', () => {
  test('renders loading state', () => {
    render(<ProjectsList {...baseProps} loading={true} />);
    expect(screen.getByText('Loading projects...')).toBeDefined();
  });

  test('renders error state', () => {
    render(<ProjectsList {...baseProps} error="Network error" />);
    expect(screen.getByText(/Network error/)).toBeDefined();
  });

  test('renders empty state with filters', () => {
    render(<ProjectsList {...baseProps} searchTerm="foo" />);
    expect(screen.getByText('No Projects Found')).toBeDefined();
  });

  test('renders project cards when projects exist', () => {
    const projects = [
      { id: '1', name: 'Project A', description: '', status: 'in_progress' as const, priority: 'medium' as const },
      { id: '2', name: 'Project B', description: '', status: 'planning' as const, priority: 'high' as const },
    ];
    render(<ProjectsList {...baseProps} projects={projects as any} />);
    expect(screen.getAllByTestId('project-card')).toHaveLength(2);
    expect(screen.getByText('Project A')).toBeDefined();
  });
});
