/**
 * ProjectContext Tests
 *
 * Sprint 24: ProjectContext was migrated to Zustand.
 * ProjectProvider is a no-op passthrough and all hooks delegate to the store.
 * These tests verify the backward-compatible wrapper behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock store state
const mockSetActiveProject = vi.fn();
const mockClearActiveProject = vi.fn();
const mockFetchProjects = vi.fn().mockResolvedValue(undefined);

const mockStoreState = {
  projects: {
    projects: [] as Array<{ id: string; name: string; status: string; description?: string }>,
    activeProjectId: null as string | null,
    isLoading: false,
    error: null as string | null,
    setActiveProject: mockSetActiveProject,
    clearActiveProject: mockClearActiveProject,
    fetchProjects: mockFetchProjects,
  },
};

vi.mock('../../store/store', () => ({
  useStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

import { ProjectProvider, useProjectContext, useProjectContextOptional, useCurrentProjectId } from '../ProjectContext';

describe('ProjectProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.projects.projects = [];
    mockStoreState.projects.activeProjectId = null;
    mockStoreState.projects.isLoading = false;
    mockStoreState.projects.error = null;
  });

  it('renders children', () => {
    const { getByText } = render(
      <MemoryRouter>
        <ProjectProvider>
          <div>Hello Child</div>
        </ProjectProvider>
      </MemoryRouter>
    );
    expect(getByText('Hello Child')).toBeInTheDocument();
  });

  it('provides initial context values', () => {
    let contextValue: ReturnType<typeof useProjectContext> | null = null;

    function Consumer() {
      contextValue = useProjectContext();
      return null;
    }

    render(
      <MemoryRouter>
        <ProjectProvider>
          <Consumer />
        </ProjectProvider>
      </MemoryRouter>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.projects).toEqual([]);
    expect(contextValue!.currentProject).toBeNull();
    expect(contextValue!.error).toBeNull();
    expect(contextValue!.isReady).toBe(true);
  });

  it('reflects projects from store', () => {
    const mockProjects = [
      { id: 'p1', name: 'Project 1', description: 'Desc 1', status: 'in_progress' },
      { id: 'p2', name: 'Project 2', description: 'Desc 2', status: 'planning' },
    ];
    mockStoreState.projects.projects = mockProjects;

    let contextValue: ReturnType<typeof useProjectContext> | null = null;

    function Consumer() {
      contextValue = useProjectContext();
      return null;
    }

    render(
      <MemoryRouter>
        <ProjectProvider>
          <Consumer />
        </ProjectProvider>
      </MemoryRouter>
    );

    expect(contextValue!.projects).toHaveLength(2);
    expect(contextValue!.projects[0].name).toBe('Project 1');
  });

  it('reflects active project from store', () => {
    const mockProjects = [
      { id: 'p1', name: 'Project 1', status: 'in_progress' },
    ];
    mockStoreState.projects.projects = mockProjects;
    mockStoreState.projects.activeProjectId = 'p1';

    let contextValue: ReturnType<typeof useProjectContext> | null = null;

    function Consumer() {
      contextValue = useProjectContext();
      return null;
    }

    render(
      <MemoryRouter>
        <ProjectProvider>
          <Consumer />
        </ProjectProvider>
      </MemoryRouter>
    );

    expect(contextValue!.currentProject).not.toBeNull();
    expect(contextValue!.currentProject!.id).toBe('p1');
  });

  it('reflects error state from store', () => {
    mockStoreState.projects.error = 'Unauthorized';

    let contextValue: ReturnType<typeof useProjectContext> | null = null;

    function Consumer() {
      contextValue = useProjectContext();
      return null;
    }

    render(
      <MemoryRouter>
        <ProjectProvider>
          <Consumer />
        </ProjectProvider>
      </MemoryRouter>
    );

    expect(contextValue!.error).toBe('Unauthorized');
    expect(contextValue!.isReady).toBe(true);
  });

  it('returns null currentProject when no user (empty store)', () => {
    mockStoreState.projects.projects = [];
    mockStoreState.projects.activeProjectId = null;

    let contextValue: ReturnType<typeof useProjectContext> | null = null;

    function Consumer() {
      contextValue = useProjectContext();
      return null;
    }

    render(
      <MemoryRouter>
        <ProjectProvider>
          <Consumer />
        </ProjectProvider>
      </MemoryRouter>
    );

    expect(contextValue!.currentProject).toBeNull();
    expect(contextValue!.projects).toEqual([]);
  });
});

describe('useProjectContext', () => {
  beforeEach(() => {
    mockStoreState.projects.projects = [];
    mockStoreState.projects.activeProjectId = null;
  });

  it('works without ProjectProvider (since provider is a no-op)', () => {
    // Sprint 24: useProjectContext now reads from Zustand directly,
    // so it no longer throws when used outside a provider.
    let contextValue: ReturnType<typeof useProjectContext> | null = null;

    function Test() {
      contextValue = useProjectContext();
      return null;
    }

    render(
      <MemoryRouter>
        <Test />
      </MemoryRouter>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.projects).toEqual([]);
  });
});

describe('useProjectContextOptional', () => {
  beforeEach(() => {
    mockStoreState.projects.projects = [];
    mockStoreState.projects.activeProjectId = null;
  });

  it('returns context value (same as useProjectContext since Sprint 24)', () => {
    // Sprint 24: useProjectContextOptional no longer returns null outside provider.
    // It delegates to Zustand just like useProjectContext.
    let contextValue: ReturnType<typeof useProjectContextOptional> | null = null;

    function Test() {
      contextValue = useProjectContextOptional();
      return null;
    }

    render(
      <MemoryRouter>
        <Test />
      </MemoryRouter>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.projects).toEqual([]);
  });
});

describe('useCurrentProjectId', () => {
  beforeEach(() => {
    mockStoreState.projects.activeProjectId = null;
  });

  it('returns null when no project is selected', () => {
    let projectId: string | null = 'unset' as any;

    function Test() {
      projectId = useCurrentProjectId();
      return null;
    }

    render(
      <MemoryRouter>
        <Test />
      </MemoryRouter>
    );

    expect(projectId).toBeNull();
  });

  it('returns active project ID from store', () => {
    mockStoreState.projects.activeProjectId = 'proj-42';

    let projectId: string | null = null;

    function Test() {
      projectId = useCurrentProjectId();
      return null;
    }

    render(
      <MemoryRouter>
        <Test />
      </MemoryRouter>
    );

    expect(projectId).toBe('proj-42');
  });
});
