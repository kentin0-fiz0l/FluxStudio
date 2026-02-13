import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { hookLogger } from '../lib/logger';
import { queryKeys } from '../lib/queryClient';


const projectsLogger = hookLogger.child('useProjects');

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  organizationId?: string;
  teamId?: string;
  createdBy: string;
  startDate: string;
  dueDate?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  members: string[];
  tasks: Task[];
  milestones: Milestone[];
  files: ProjectFile[];
  settings: {
    isPrivate: boolean;
    allowComments: boolean;
    requireApproval: boolean;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  dueDate?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  size: number;
}

// ---------- helpers ----------

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(getApiUrl('/api/csrf-token'), { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}

// ---------- hook ----------

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query: fetch projects list
  const {
    data: projects = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Project[], Error>({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/projects'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const result = await response.json();
      return result.projects || [];
    },
    enabled: !!user,
  });

  const error = queryError?.message ?? null;

  // Mutation: create project
  const createProjectMutation = useMutation<
    Project,
    Error,
    {
      name: string;
      description?: string;
      organizationId?: string;
      teamId?: string;
      startDate?: string;
      dueDate?: string;
      priority?: Project['priority'];
      members?: string[];
    }
  >({
    mutationFn: async (projectData) => {
      if (!user) throw new Error('Authentication required');

      const csrfToken = await fetchCsrfToken();
      const token = localStorage.getItem('auth_token');

      const response = await fetch(getApiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      const result = await response.json();
      return result.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error creating project', err);
    },
  });

  // Mutation: update project
  const updateProjectMutation = useMutation<
    Project,
    Error,
    { projectId: string; updates: Partial<Project> }
  >({
    mutationFn: async ({ projectId, updates }) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }

      const result = await response.json();
      return result.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error updating project', err);
    },
  });

  // Mutation: delete project
  const deleteProjectMutation = useMutation<void, Error, string>({
    mutationFn: async (projectId) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error deleting project', err);
    },
  });

  // Task mutations
  const createTaskMutation = useMutation<
    Task,
    Error,
    { projectId: string; taskData: { title: string; description?: string; assignedTo?: string; dueDate?: string; priority?: Task['priority'] } }
  >({
    mutationFn: async ({ projectId, taskData }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }
      const result = await response.json();
      return result.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error creating task', err);
    },
  });

  const updateTaskMutation = useMutation<
    Task,
    Error,
    { projectId: string; taskId: string; updates: Partial<Task> }
  >({
    mutationFn: async ({ projectId, taskId, updates }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }
      const result = await response.json();
      return result.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error updating task', err);
    },
  });

  const deleteTaskMutation = useMutation<void, Error, { projectId: string; taskId: string }>({
    mutationFn: async ({ projectId, taskId }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error deleting task', err);
    },
  });

  // Milestone mutations
  const createMilestoneMutation = useMutation<
    Milestone,
    Error,
    { projectId: string; milestoneData: { title: string; description?: string; dueDate?: string } }
  >({
    mutationFn: async ({ projectId, milestoneData }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/milestones`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(milestoneData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create milestone');
      }
      const result = await response.json();
      return result.milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error creating milestone', err);
    },
  });

  const updateMilestoneMutation = useMutation<
    Milestone,
    Error,
    { projectId: string; milestoneId: string; updates: Partial<Milestone> }
  >({
    mutationFn: async ({ projectId, milestoneId, updates }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/milestones/${milestoneId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update milestone');
      }
      const result = await response.json();
      return result.milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      projectsLogger.error('Error updating milestone', err);
    },
  });

  // Wrap mutations to keep the same call signatures
  const createProject = useCallback(
    async (projectData: Parameters<typeof createProjectMutation.mutateAsync>[0]) => {
      return createProjectMutation.mutateAsync(projectData);
    },
    [createProjectMutation]
  );

  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      return updateProjectMutation.mutateAsync({ projectId, updates });
    },
    [updateProjectMutation]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      return deleteProjectMutation.mutateAsync(projectId);
    },
    [deleteProjectMutation]
  );

  const createTask = useCallback(
    async (projectId: string, taskData: { title: string; description?: string; assignedTo?: string; dueDate?: string; priority?: Task['priority'] }) => {
      return createTaskMutation.mutateAsync({ projectId, taskData });
    },
    [createTaskMutation]
  );

  const updateTask = useCallback(
    async (projectId: string, taskId: string, updates: Partial<Task>) => {
      return updateTaskMutation.mutateAsync({ projectId, taskId, updates });
    },
    [updateTaskMutation]
  );

  const deleteTask = useCallback(
    async (projectId: string, taskId: string) => {
      return deleteTaskMutation.mutateAsync({ projectId, taskId });
    },
    [deleteTaskMutation]
  );

  const createMilestone = useCallback(
    async (projectId: string, milestoneData: { title: string; description?: string; dueDate?: string }) => {
      return createMilestoneMutation.mutateAsync({ projectId, milestoneData });
    },
    [createMilestoneMutation]
  );

  const updateMilestone = useCallback(
    async (projectId: string, milestoneId: string, updates: Partial<Milestone>) => {
      return updateMilestoneMutation.mutateAsync({ projectId, milestoneId, updates });
    },
    [updateMilestoneMutation]
  );

  return {
    projects,
    loading,
    error,
    fetchProjects: refetch,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    createMilestone,
    updateMilestone,
  };
}
