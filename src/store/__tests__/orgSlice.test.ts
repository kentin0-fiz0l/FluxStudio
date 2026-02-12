import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { createOrgSlice, type OrgSlice } from '../slices/orgSlice';

function createTestStore() {
  return create<OrgSlice>()(
    immer((...args) => ({
      ...createOrgSlice(...(args as Parameters<typeof createOrgSlice>)),
    }))
  );
}

describe('orgSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const { org } = store.getState();
      expect(org.currentOrganization).toBeNull();
      expect(org.currentTeam).toBeNull();
      expect(org.currentProject).toBeNull();
      expect(org.organizations).toEqual([]);
      expect(org.teams).toEqual([]);
      expect(org.projects).toEqual([]);
      expect(org.files).toEqual([]);
      expect(org.breadcrumbs).toEqual([]);
      expect(org.isLoading).toBe(false);
      expect(org.isLoadingOrganizations).toBe(false);
      expect(org.isLoadingTeams).toBe(false);
      expect(org.isLoadingProjects).toBe(false);
      expect(org.isLoadingFiles).toBe(false);
    });
  });

  describe('setCurrentOrganization', () => {
    it('should set org and compute breadcrumbs', () => {
      const org = { id: 'org-1', name: 'Acme' } as any;
      store.getState().org.setCurrentOrganization(org);

      const state = store.getState().org;
      expect(state.currentOrganization).toEqual(org);
      expect(state.breadcrumbs).toHaveLength(1);
      expect(state.breadcrumbs[0].type).toBe('organization');
      expect(state.breadcrumbs[0].name).toBe('Acme');
    });

    it('should clear org when null', () => {
      store.getState().org.setCurrentOrganization({ id: 'org-1', name: 'Acme' } as any);
      store.getState().org.setCurrentOrganization(null);
      expect(store.getState().org.currentOrganization).toBeNull();
      expect(store.getState().org.breadcrumbs).toEqual([]);
    });
  });

  describe('setCurrentTeam', () => {
    it('should set team and update breadcrumbs', () => {
      const org = { id: 'org-1', name: 'Acme' } as any;
      const team = { id: 'team-1', name: 'Design' } as any;
      store.getState().org.setCurrentOrganization(org);
      store.getState().org.setCurrentTeam(team);

      const state = store.getState().org;
      expect(state.currentTeam).toEqual(team);
      expect(state.breadcrumbs).toHaveLength(2);
      expect(state.breadcrumbs[1].type).toBe('team');
    });
  });

  describe('setCurrentProject', () => {
    it('should set project and update breadcrumbs', () => {
      const org = { id: 'org-1', name: 'Acme' } as any;
      const project = { id: 'proj-1', name: 'Website' } as any;
      store.getState().org.setCurrentOrganization(org);
      store.getState().org.setCurrentProject(project);

      const state = store.getState().org;
      expect(state.currentProject).toEqual(project);
      expect(state.breadcrumbs).toHaveLength(2);
      expect(state.breadcrumbs[1].type).toBe('project');
    });
  });

  describe('fetchOrganizations', () => {
    it('should fetch and set organizations', async () => {
      const orgs = [{ id: 'org-1', name: 'Acme' }];
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(orgs) });

      await store.getState().org.fetchOrganizations();

      expect(store.getState().org.organizations).toEqual(orgs);
      expect(store.getState().org.isLoadingOrganizations).toBe(false);
    });

    it('should handle fetch failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Server Error' });

      await store.getState().org.fetchOrganizations();

      expect(store.getState().org.organizations).toEqual([]);
      expect(store.getState().org.isLoadingOrganizations).toBe(false);
    });
  });

  describe('fetchTeams', () => {
    it('should fetch teams for organization', async () => {
      const teams = [{ id: 'team-1', name: 'Design' }];
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(teams) });

      await store.getState().org.fetchTeams('org-1');

      expect(store.getState().org.teams).toEqual(teams);
      expect(store.getState().org.isLoadingTeams).toBe(false);
    });
  });

  describe('fetchProjects', () => {
    it('should fetch projects with team filter', async () => {
      const projects = [{ id: 'proj-1', name: 'Website' }];
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(projects) });

      await store.getState().org.fetchProjects('org-1', 'team-1');

      expect(store.getState().org.projects).toEqual(projects);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/teams/team-1/projects'),
        expect.any(Object)
      );
    });

    it('should fetch org-level projects without team', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await store.getState().org.fetchProjects('org-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/organizations/org-1/projects'),
        expect.any(Object)
      );
    });
  });

  describe('navigateTo', () => {
    it('should navigate to organization and fetch teams', async () => {
      const org = { id: 'org-1', name: 'Acme' } as any;
      // Set orgs in state first
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([org]) });
      await store.getState().org.fetchOrganizations();

      // Now navigate - fetchTeams call
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
      await store.getState().org.navigateTo('organization', 'org-1');

      const state = store.getState().org;
      expect(state.currentOrganization).toEqual(org);
      expect(state.currentTeam).toBeNull();
      expect(state.currentProject).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('resetOrg', () => {
    it('should reset all state to initial values', () => {
      store.getState().org.setCurrentOrganization({ id: 'org-1', name: 'Acme' } as any);
      store.getState().org.resetOrg();

      const state = store.getState().org;
      expect(state.currentOrganization).toBeNull();
      expect(state.organizations).toEqual([]);
      expect(state.breadcrumbs).toEqual([]);
    });
  });
});
