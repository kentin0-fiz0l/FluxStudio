/**
 * ProjectContext Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock AuthContext
const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' };

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isAuthenticated: true,
  })),
}));

// Mock apiHelpers
vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: (path: string) => `http://localhost:3001${path}`,
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { ProjectProvider, useProjectContext, useProjectContextOptional, useCurrentProjectId } from '../ProjectContext';

describe('ProjectProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock for fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ projects: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('fetches projects on mount when user is present', async () => {
    localStorage.setItem('auth_token', 'test-token');

    render(
      <MemoryRouter>
        <ProjectProvider>
          <div>Test</div>
        </ProjectProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  it('provides initial context values', async () => {
    let contextValue: any = null;

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

    await waitFor(() => {
      expect(contextValue).not.toBeNull();
      expect(contextValue.projects).toEqual([]);
      expect(contextValue.currentProject).toBeNull();
      expect(contextValue.error).toBeNull();
    });
  });

  it('populates projects after fetch', async () => {
    const mockProjects = [
      { id: 'p1', name: 'Project 1', description: 'Desc 1', status: 'in_progress' },
      { id: 'p2', name: 'Project 2', description: 'Desc 2', status: 'planning' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    });

    let contextValue: any = null;

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

    await waitFor(() => {
      expect(contextValue.projects).toHaveLength(2);
      expect(contextValue.projects[0].name).toBe('Project 1');
    });
  });

  it('restores project from localStorage', async () => {
    const mockProjects = [
      { id: 'p1', name: 'Project 1', status: 'in_progress' },
    ];

    localStorage.setItem('fluxstudio.currentProjectId', 'p1');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    });

    let contextValue: any = null;

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

    await waitFor(() => {
      expect(contextValue.currentProject).not.toBeNull();
      expect(contextValue.currentProject.id).toBe('p1');
    });
  });

  it('handles fetch error gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    });

    let contextValue: any = null;

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

    await waitFor(() => {
      expect(contextValue.error).toBeTruthy();
      expect(contextValue.isReady).toBe(true);
    });
  });

  it('clears state when user is null', async () => {
    const { useAuth } = await import('../AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);

    let contextValue: any = null;

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

    expect(contextValue.currentProject).toBeNull();
    expect(contextValue.projects).toEqual([]);
  });
});

describe('useProjectContext', () => {
  it('throws when used outside provider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      function Test() {
        useProjectContext();
        return null;
      }
      render(
        <MemoryRouter>
          <Test />
        </MemoryRouter>
      );
    }).toThrow('useProjectContext must be used within a ProjectProvider');

    consoleSpy.mockRestore();
  });
});

describe('useProjectContextOptional', () => {
  it('returns null when used outside provider', () => {
    let contextValue: any = 'unset';

    function Test() {
      contextValue = useProjectContextOptional();
      return null;
    }

    render(
      <MemoryRouter>
        <Test />
      </MemoryRouter>
    );

    expect(contextValue).toBeNull();
  });
});

describe('useCurrentProjectId', () => {
  it('returns null when no project is selected', () => {
    let projectId: any = 'unset';

    function Test() {
      projectId = useCurrentProjectId();
      return null;
    }

    render(
      <MemoryRouter>
        <Test />
      </MemoryRouter>
    );

    // Outside provider, returns null
    expect(projectId).toBeNull();
  });
});
