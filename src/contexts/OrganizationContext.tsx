import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Organization,
  Team,
  Project,
  ProjectFile,
  OrganizationContext as OrgContextType,
  OrganizationStats,
  TeamStats,
  ProjectStats,
  OrganizationMember,
  TeamMember,
  ProjectMember
} from '../types/organization';

interface OrganizationContextProps {
  // Current state
  currentOrganization: Organization | null;
  currentTeam: Team | null;
  currentProject: Project | null;
  organizations: Organization[];
  teams: Team[];
  projects: Project[];
  files: ProjectFile[];

  // Navigation
  breadcrumbs: Array<{
    type: 'organization' | 'team' | 'project';
    id: string;
    name: string;
    path: string;
  }>;

  // Loading states
  isLoading: boolean;
  isLoadingOrganizations: boolean;
  isLoadingTeams: boolean;
  isLoadingProjects: boolean;
  isLoadingFiles: boolean;

  // Navigation methods
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentTeam: (team: Team | null) => void;
  setCurrentProject: (project: Project | null) => void;
  navigateTo: (type: 'organization' | 'team' | 'project', id: string) => void;

  // Data fetching methods
  fetchOrganizations: () => Promise<void>;
  fetchTeams: (organizationId: string) => Promise<void>;
  fetchProjects: (organizationId: string, teamId?: string) => Promise<void>;
  fetchFiles: (projectId: string) => Promise<void>;

  // CRUD operations - Organizations
  createOrganization: (data: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;

  // CRUD operations - Teams
  createTeam: (organizationId: string, data: Partial<Team>) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;

  // CRUD operations - Projects
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // File operations
  uploadFile: (projectId: string, file: File, metadata?: any) => Promise<ProjectFile>;
  updateFile: (id: string, data: Partial<ProjectFile>) => Promise<ProjectFile>;
  deleteFile: (id: string) => Promise<void>;

  // Statistics
  getOrganizationStats: (id: string) => Promise<OrganizationStats>;
  getTeamStats: (id: string) => Promise<TeamStats>;
  getProjectStats: (id: string) => Promise<ProjectStats>;

  // Members management
  getOrganizationMembers: (id: string) => Promise<OrganizationMember[]>;
  getTeamMembers: (id: string) => Promise<TeamMember[]>;
  getProjectMembers: (id: string) => Promise<ProjectMember[]>;
}

const OrganizationContext = createContext<OrganizationContextProps | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  // State management
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Breadcrumbs computation
  const breadcrumbs = React.useMemo(() => {
    const crumbs: Array<{
      type: 'organization' | 'team' | 'project';
      id: string;
      name: string;
      path: string;
    }> = [];

    if (currentOrganization) {
      crumbs.push({
        type: 'organization',
        id: currentOrganization.id,
        name: currentOrganization.name,
        path: `/dashboard/organization/${currentOrganization.id}`
      });
    }

    if (currentTeam) {
      crumbs.push({
        type: 'team',
        id: currentTeam.id,
        name: currentTeam.name,
        path: `/dashboard/organization/${currentOrganization?.id}/team/${currentTeam.id}`
      });
    }

    if (currentProject) {
      crumbs.push({
        type: 'project',
        id: currentProject.id,
        name: currentProject.name,
        path: `/dashboard/organization/${currentOrganization?.id}${currentTeam ? `/team/${currentTeam.id}` : ''}/project/${currentProject.id}`
      });
    }

    return crumbs;
  }, [currentOrganization, currentTeam, currentProject]);

  // API base URL
  const API_BASE = '/api';

  // Utility function for API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  // Navigation methods
  const navigateTo = async (type: 'organization' | 'team' | 'project', id: string) => {
    setIsLoading(true);

    try {
      switch (type) {
        case 'organization':
          const org = organizations.find(o => o.id === id);
          if (org) {
            setCurrentOrganization(org);
            setCurrentTeam(null);
            setCurrentProject(null);
            await fetchTeams(id);
          }
          break;

        case 'team':
          const team = teams.find(t => t.id === id);
          if (team) {
            setCurrentTeam(team);
            setCurrentProject(null);
            await fetchProjects(team.organizationId, id);
          }
          break;

        case 'project':
          const project = projects.find(p => p.id === id);
          if (project) {
            setCurrentProject(project);
            await fetchFiles(id);
          }
          break;
      }
    } catch (error) {
      console.error(`Error navigating to ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Data fetching methods
  const fetchOrganizations = async () => {
    setIsLoadingOrganizations(true);
    try {
      const data = await apiCall('/organizations');
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  const fetchTeams = async (organizationId: string) => {
    setIsLoadingTeams(true);
    try {
      const data = await apiCall(`/organizations/${organizationId}/teams`);
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const fetchProjects = async (organizationId: string, teamId?: string) => {
    setIsLoadingProjects(true);
    try {
      const endpoint = teamId
        ? `/organizations/${organizationId}/teams/${teamId}/projects`
        : `/organizations/${organizationId}/projects`;
      const data = await apiCall(endpoint);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchFiles = async (projectId: string) => {
    setIsLoadingFiles(true);
    try {
      const data = await apiCall(`/projects/${projectId}/files`);
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // CRUD operations - Organizations
  const createOrganization = async (data: Partial<Organization>): Promise<Organization> => {
    const response = await apiCall('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await fetchOrganizations();
    return response;
  };

  const updateOrganization = async (id: string, data: Partial<Organization>): Promise<Organization> => {
    const response = await apiCall(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    await fetchOrganizations();
    return response;
  };

  const deleteOrganization = async (id: string): Promise<void> => {
    await apiCall(`/organizations/${id}`, {
      method: 'DELETE',
    });
    await fetchOrganizations();
    if (currentOrganization?.id === id) {
      setCurrentOrganization(null);
      setCurrentTeam(null);
      setCurrentProject(null);
    }
  };

  // CRUD operations - Teams
  const createTeam = async (organizationId: string, data: Partial<Team>): Promise<Team> => {
    const response = await apiCall(`/organizations/${organizationId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ ...data, organizationId }),
    });
    await fetchTeams(organizationId);
    return response;
  };

  const updateTeam = async (id: string, data: Partial<Team>): Promise<Team> => {
    const response = await apiCall(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (currentOrganization) {
      await fetchTeams(currentOrganization.id);
    }
    return response;
  };

  const deleteTeam = async (id: string): Promise<void> => {
    await apiCall(`/teams/${id}`, {
      method: 'DELETE',
    });
    if (currentOrganization) {
      await fetchTeams(currentOrganization.id);
    }
    if (currentTeam?.id === id) {
      setCurrentTeam(null);
      setCurrentProject(null);
    }
  };

  // CRUD operations - Projects
  const createProject = async (data: Partial<Project>): Promise<Project> => {
    const endpoint = data.teamId
      ? `/teams/${data.teamId}/projects`
      : `/organizations/${data.organizationId}/projects`;
    const response = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (currentOrganization) {
      await fetchProjects(currentOrganization.id, currentTeam?.id);
    }
    return response;
  };

  const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await apiCall(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (currentOrganization) {
      await fetchProjects(currentOrganization.id, currentTeam?.id);
    }
    return response;
  };

  const deleteProject = async (id: string): Promise<void> => {
    await apiCall(`/projects/${id}`, {
      method: 'DELETE',
    });

    if (currentOrganization) {
      await fetchProjects(currentOrganization.id, currentTeam?.id);
    }
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  // File operations
  const uploadFile = async (projectId: string, file: File, metadata?: any): Promise<ProjectFile> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    await fetchFiles(projectId);
    return result;
  };

  const updateFile = async (id: string, data: Partial<ProjectFile>): Promise<ProjectFile> => {
    const response = await apiCall(`/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (currentProject) {
      await fetchFiles(currentProject.id);
    }
    return response;
  };

  const deleteFile = async (id: string): Promise<void> => {
    await apiCall(`/files/${id}`, {
      method: 'DELETE',
    });

    if (currentProject) {
      await fetchFiles(currentProject.id);
    }
  };

  // Statistics
  const getOrganizationStats = async (id: string): Promise<OrganizationStats> => {
    return apiCall(`/organizations/${id}/stats`);
  };

  const getTeamStats = async (id: string): Promise<TeamStats> => {
    return apiCall(`/teams/${id}/stats`);
  };

  const getProjectStats = async (id: string): Promise<ProjectStats> => {
    return apiCall(`/projects/${id}/stats`);
  };

  // Members management
  const getOrganizationMembers = async (id: string): Promise<OrganizationMember[]> => {
    return apiCall(`/organizations/${id}/members`);
  };

  const getTeamMembers = async (id: string): Promise<TeamMember[]> => {
    return apiCall(`/teams/${id}/members`);
  };

  const getProjectMembers = async (id: string): Promise<ProjectMember[]> => {
    return apiCall(`/projects/${id}/members`);
  };

  // Initialize data on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const contextValue: OrganizationContextProps = {
    // Current state
    currentOrganization,
    currentTeam,
    currentProject,
    organizations,
    teams,
    projects,
    files,

    // Navigation
    breadcrumbs,

    // Loading states
    isLoading,
    isLoadingOrganizations,
    isLoadingTeams,
    isLoadingProjects,
    isLoadingFiles,

    // Navigation methods
    setCurrentOrganization,
    setCurrentTeam,
    setCurrentProject,
    navigateTo,

    // Data fetching methods
    fetchOrganizations,
    fetchTeams,
    fetchProjects,
    fetchFiles,

    // CRUD operations - Organizations
    createOrganization,
    updateOrganization,
    deleteOrganization,

    // CRUD operations - Teams
    createTeam,
    updateTeam,
    deleteTeam,

    // CRUD operations - Projects
    createProject,
    updateProject,
    deleteProject,

    // File operations
    uploadFile,
    updateFile,
    deleteFile,

    // Statistics
    getOrganizationStats,
    getTeamStats,
    getProjectStats,

    // Members management
    getOrganizationMembers,
    getTeamMembers,
    getProjectMembers,
  };

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}