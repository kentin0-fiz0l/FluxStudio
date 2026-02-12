import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

import { createProjectSlice, type ProjectSlice, type Project } from '../slices/projectSlice';

function createTestStore() {
  return create<ProjectSlice>()(
    immer((...args) => ({
      ...createProjectSlice(...(args as Parameters<typeof createProjectSlice>)),
    }))
  );
}

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  status: 'in_progress',
  priority: 'medium',
  progress: 50,
  startDate: '2025-01-01',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ownerId: 'user-1',
  ...overrides,
});

describe('projectSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start empty', () => {
      const { projects } = store.getState();
      expect(projects.projects).toEqual([]);
      expect(projects.activeProjectId).toBeNull();
      expect(projects.recentProjectIds).toEqual([]);
      expect(projects.isLoading).toBe(false);
      expect(projects.error).toBeNull();
    });
  });

  describe('setProjects', () => {
    it('should replace all projects', () => {
      const p1 = makeProject({ id: 'a' });
      const p2 = makeProject({ id: 'b' });
      store.getState().projects.setProjects([p1, p2]);
      expect(store.getState().projects.projects).toHaveLength(2);
    });
  });

  describe('addProject', () => {
    it('should append a project', () => {
      store.getState().projects.addProject(makeProject());
      expect(store.getState().projects.projects).toHaveLength(1);
    });
  });

  describe('updateProject', () => {
    it('should update matching project and set updatedAt', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1', name: 'Old' }));
      store.getState().projects.updateProject('p1', { name: 'New' });

      const p = store.getState().projects.projects[0];
      expect(p.name).toBe('New');
      expect(p.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    });

    it('should do nothing for non-existent id', () => {
      store.getState().projects.addProject(makeProject());
      store.getState().projects.updateProject('nonexistent', { name: 'X' });
      expect(store.getState().projects.projects[0].name).toBe('Test Project');
    });
  });

  describe('removeProject', () => {
    it('should remove project and clear active if matching', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1' }));
      store.getState().projects.setActiveProject('p1');
      store.getState().projects.removeProject('p1');

      expect(store.getState().projects.projects).toHaveLength(0);
      expect(store.getState().projects.activeProjectId).toBeNull();
    });

    it('should remove from recentProjectIds', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1' }));
      store.getState().projects.addToRecent('p1');
      store.getState().projects.removeProject('p1');
      expect(store.getState().projects.recentProjectIds).not.toContain('p1');
    });
  });

  describe('setActiveProject', () => {
    it('should set active project and add to recent', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1' }));
      store.getState().projects.setActiveProject('p1');

      expect(store.getState().projects.activeProjectId).toBe('p1');
      expect(store.getState().projects.recentProjectIds).toContain('p1');
    });

    it('should persist to localStorage', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1', name: 'My Proj' }));
      store.getState().projects.setActiveProject('p1');

      const stored = JSON.parse(localStorage.getItem('fluxstudio.activeProject')!);
      expect(stored.id).toBe('p1');
    });

    it('should limit recent projects to 5', () => {
      for (let i = 0; i < 7; i++) {
        store.getState().projects.addProject(makeProject({ id: `p${i}` }));
        store.getState().projects.setActiveProject(`p${i}`);
      }
      expect(store.getState().projects.recentProjectIds).toHaveLength(5);
    });
  });

  describe('clearActiveProject', () => {
    it('should clear active project and localStorage', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1' }));
      store.getState().projects.setActiveProject('p1');
      store.getState().projects.clearActiveProject();

      expect(store.getState().projects.activeProjectId).toBeNull();
      expect(localStorage.getItem('fluxstudio.activeProject')).toBeNull();
    });
  });

  describe('getActiveProject', () => {
    it('should return the active project object', () => {
      const p = makeProject({ id: 'p1' });
      store.getState().projects.addProject(p);
      store.getState().projects.setActiveProject('p1');

      expect(store.getState().projects.getActiveProject()?.id).toBe('p1');
    });

    it('should return null when no active project', () => {
      expect(store.getState().projects.getActiveProject()).toBeNull();
    });
  });

  describe('isProjectActive', () => {
    it('should return true for active project', () => {
      store.getState().projects.addProject(makeProject({ id: 'p1' }));
      store.getState().projects.setActiveProject('p1');
      expect(store.getState().projects.isProjectActive('p1')).toBe(true);
      expect(store.getState().projects.isProjectActive('p2')).toBe(false);
    });
  });

  describe('fetchProjects', () => {
    it('should fetch and set projects on success', async () => {
      localStorage.setItem('auth_token', 'tok');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [makeProject()] }),
      });

      await store.getState().projects.fetchProjects();

      expect(store.getState().projects.projects).toHaveLength(1);
      expect(store.getState().projects.isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });

      await store.getState().projects.fetchProjects();

      expect(store.getState().projects.error).toBe('Failed to fetch projects');
      expect(store.getState().projects.isLoading).toBe(false);
    });
  });
});
