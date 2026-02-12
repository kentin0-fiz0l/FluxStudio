/**
 * Organization Slice - Organization, team, and project navigation state
 *
 * Migrated from OrganizationContext.tsx
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';
import type {
  Organization,
  Team,
  Project,
  ProjectFile,
  OrganizationStats,
  TeamStats,
  ProjectStats,
  OrganizationMember,
  TeamMember,
  ProjectMember,
} from '../../types/organization';

// ============================================================================
// Types
// ============================================================================

export interface Breadcrumb {
  type: 'organization' | 'team' | 'project';
  id: string;
  name: string;
  path: string;
}

export interface OrgState {
  currentOrganization: Organization | null;
  currentTeam: Team | null;
  currentProject: Project | null;
  organizations: Organization[];
  teams: Team[];
  projects: Project[];
  files: ProjectFile[];
  breadcrumbs: Breadcrumb[];
  isLoading: boolean;
  isLoadingOrganizations: boolean;
  isLoadingTeams: boolean;
  isLoadingProjects: boolean;
  isLoadingFiles: boolean;
}

export interface OrgActions {
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentTeam: (team: Team | null) => void;
  setCurrentProject: (project: Project | null) => void;
  navigateTo: (type: 'organization' | 'team' | 'project', id: string) => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  fetchTeams: (organizationId: string) => Promise<void>;
  fetchProjects: (organizationId: string, teamId?: string) => Promise<void>;
  fetchFiles: (projectId: string) => Promise<void>;
  createOrganization: (data: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  createTeam: (organizationId: string, data: Partial<Team>) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  uploadFile: (projectId: string, file: File, metadata?: any) => Promise<ProjectFile>;
  updateFile: (id: string, data: Partial<ProjectFile>) => Promise<ProjectFile>;
  deleteFile: (id: string) => Promise<void>;
  getOrganizationStats: (id: string) => Promise<OrganizationStats>;
  getTeamStats: (id: string) => Promise<TeamStats>;
  getProjectStats: (id: string) => Promise<ProjectStats>;
  getOrganizationMembers: (id: string) => Promise<OrganizationMember[]>;
  getTeamMembers: (id: string) => Promise<TeamMember[]>;
  getProjectMembers: (id: string) => Promise<ProjectMember[]>;
  resetOrg: () => void;
}

export interface OrgSlice {
  org: OrgState & OrgActions;
}

// ============================================================================
// Helpers
// ============================================================================

const API_BASE = '/api';

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
  return response.json();
}

function computeBreadcrumbs(
  org: Organization | null,
  team: Team | null,
  project: Project | null
): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [];
  if (org) {
    crumbs.push({ type: 'organization', id: org.id, name: org.name, path: `/dashboard/organization/${org.id}` });
  }
  if (team) {
    crumbs.push({ type: 'team', id: team.id, name: team.name, path: `/dashboard/organization/${org?.id}/team/${team.id}` });
  }
  if (project) {
    crumbs.push({
      type: 'project',
      id: project.id,
      name: project.name,
      path: `/dashboard/organization/${org?.id}${team ? `/team/${team.id}` : ''}/project/${project.id}`,
    });
  }
  return crumbs;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: OrgState = {
  currentOrganization: null,
  currentTeam: null,
  currentProject: null,
  organizations: [],
  teams: [],
  projects: [],
  files: [],
  breadcrumbs: [],
  isLoading: false,
  isLoadingOrganizations: false,
  isLoadingTeams: false,
  isLoadingProjects: false,
  isLoadingFiles: false,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createOrgSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  OrgSlice
> = (set, get) => ({
  org: {
    ...initialState,

    setCurrentOrganization: (org) => {
      set((state) => {
        state.org.currentOrganization = org;
        state.org.breadcrumbs = computeBreadcrumbs(org, state.org.currentTeam, state.org.currentProject);
      });
    },

    setCurrentTeam: (team) => {
      set((state) => {
        state.org.currentTeam = team;
        state.org.breadcrumbs = computeBreadcrumbs(state.org.currentOrganization, team, state.org.currentProject);
      });
    },

    setCurrentProject: (project) => {
      set((state) => {
        state.org.currentProject = project;
        state.org.breadcrumbs = computeBreadcrumbs(state.org.currentOrganization, state.org.currentTeam, project);
      });
    },

    navigateTo: async (type, id) => {
      set((state) => { state.org.isLoading = true; });
      try {
        const s = get().org;
        switch (type) {
          case 'organization': {
            const org = s.organizations.find((o) => o.id === id);
            if (org) {
              set((state) => {
                state.org.currentOrganization = org;
                state.org.currentTeam = null;
                state.org.currentProject = null;
                state.org.breadcrumbs = computeBreadcrumbs(org, null, null);
              });
              await get().org.fetchTeams(id);
            }
            break;
          }
          case 'team': {
            const team = s.teams.find((t) => t.id === id);
            if (team) {
              set((state) => {
                state.org.currentTeam = team;
                state.org.currentProject = null;
                state.org.breadcrumbs = computeBreadcrumbs(state.org.currentOrganization, team, null);
              });
              await get().org.fetchProjects(team.primaryOrganizationId, id);
            }
            break;
          }
          case 'project': {
            const project = s.projects.find((p) => p.id === id);
            if (project) {
              set((state) => {
                state.org.currentProject = project;
                state.org.breadcrumbs = computeBreadcrumbs(state.org.currentOrganization, state.org.currentTeam, project);
              });
              await get().org.fetchFiles(id);
            }
            break;
          }
        }
      } catch { /* ignore */ } finally {
        set((state) => { state.org.isLoading = false; });
      }
    },

    fetchOrganizations: async () => {
      set((state) => { state.org.isLoadingOrganizations = true; });
      try {
        const data = await apiCall('/organizations');
        set((state) => { state.org.organizations = data; });
      } catch { /* ignore */ } finally {
        set((state) => { state.org.isLoadingOrganizations = false; });
      }
    },

    fetchTeams: async (organizationId) => {
      set((state) => { state.org.isLoadingTeams = true; });
      try {
        const data = await apiCall(`/organizations/${organizationId}/teams`);
        set((state) => { state.org.teams = data; });
      } catch { /* ignore */ } finally {
        set((state) => { state.org.isLoadingTeams = false; });
      }
    },

    fetchProjects: async (organizationId, teamId?) => {
      set((state) => { state.org.isLoadingProjects = true; });
      try {
        const endpoint = teamId
          ? `/organizations/${organizationId}/teams/${teamId}/projects`
          : `/organizations/${organizationId}/projects`;
        const data = await apiCall(endpoint);
        set((state) => { state.org.projects = data; });
      } catch { /* ignore */ } finally {
        set((state) => { state.org.isLoadingProjects = false; });
      }
    },

    fetchFiles: async (projectId) => {
      set((state) => { state.org.isLoadingFiles = true; });
      try {
        const data = await apiCall(`/projects/${projectId}/files`);
        set((state) => { state.org.files = data; });
      } catch { /* ignore */ } finally {
        set((state) => { state.org.isLoadingFiles = false; });
      }
    },

    createOrganization: async (data) => {
      const response = await apiCall('/organizations', { method: 'POST', body: JSON.stringify(data) });
      await get().org.fetchOrganizations();
      return response;
    },

    updateOrganization: async (id, data) => {
      const response = await apiCall(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      await get().org.fetchOrganizations();
      return response;
    },

    deleteOrganization: async (id) => {
      await apiCall(`/organizations/${id}`, { method: 'DELETE' });
      await get().org.fetchOrganizations();
      if (get().org.currentOrganization?.id === id) {
        set((state) => {
          state.org.currentOrganization = null;
          state.org.currentTeam = null;
          state.org.currentProject = null;
          state.org.breadcrumbs = [];
        });
      }
    },

    createTeam: async (organizationId, data) => {
      const response = await apiCall(`/organizations/${organizationId}/teams`, {
        method: 'POST',
        body: JSON.stringify({ ...data, organizationId }),
      });
      await get().org.fetchTeams(organizationId);
      return response;
    },

    updateTeam: async (id, data) => {
      const response = await apiCall(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const org = get().org.currentOrganization;
      if (org) await get().org.fetchTeams(org.id);
      return response;
    },

    deleteTeam: async (id) => {
      await apiCall(`/teams/${id}`, { method: 'DELETE' });
      const org = get().org.currentOrganization;
      if (org) await get().org.fetchTeams(org.id);
      if (get().org.currentTeam?.id === id) {
        set((state) => { state.org.currentTeam = null; state.org.currentProject = null; });
      }
    },

    createProject: async (data) => {
      const teamId = data.primaryTeamId || data.teamIds?.[0];
      const endpoint = teamId
        ? `/teams/${teamId}/projects`
        : `/organizations/${data.organizationId}/projects`;
      const response = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) });
      const org = get().org.currentOrganization;
      if (org) await get().org.fetchProjects(org.id, get().org.currentTeam?.id);
      return response;
    },

    updateProject: async (id, data) => {
      const response = await apiCall(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const org = get().org.currentOrganization;
      if (org) await get().org.fetchProjects(org.id, get().org.currentTeam?.id);
      return response;
    },

    deleteProject: async (id) => {
      await apiCall(`/projects/${id}`, { method: 'DELETE' });
      const org = get().org.currentOrganization;
      if (org) await get().org.fetchProjects(org.id, get().org.currentTeam?.id);
      if (get().org.currentProject?.id === id) {
        set((state) => { state.org.currentProject = null; });
      }
    },

    uploadFile: async (projectId, file, metadata?) => {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata) formData.append('metadata', JSON.stringify(metadata));

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });
      if (!response.ok) throw new Error(`File upload failed: ${response.statusText}`);
      const result = await response.json();
      await get().org.fetchFiles(projectId);
      return result;
    },

    updateFile: async (id, data) => {
      const response = await apiCall(`/files/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const project = get().org.currentProject;
      if (project) await get().org.fetchFiles(project.id);
      return response;
    },

    deleteFile: async (id) => {
      await apiCall(`/files/${id}`, { method: 'DELETE' });
      const project = get().org.currentProject;
      if (project) await get().org.fetchFiles(project.id);
    },

    getOrganizationStats: (id) => apiCall(`/organizations/${id}/stats`),
    getTeamStats: (id) => apiCall(`/teams/${id}/stats`),
    getProjectStats: (id) => apiCall(`/projects/${id}/stats`),
    getOrganizationMembers: (id) => apiCall(`/organizations/${id}/members`),
    getTeamMembers: (id) => apiCall(`/teams/${id}/members`),
    getProjectMembers: (id) => apiCall(`/projects/${id}/members`),

    resetOrg: () => {
      set((state) => {
        Object.assign(state.org, initialState);
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useOrganization = () => {
  return useStore((state) => state.org);
};

export const useOrg = useOrganization;
