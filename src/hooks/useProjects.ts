import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '@/config/environment';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '@/store/slices/authSlice';
import { hookLogger } from '../lib/logger';
import { queryKeys } from '../lib/queryClient';
import { toast } from '../lib/toast';
import { useStore } from '../store/store';


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

// ---------- hook ----------

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('offline');
  }
  return false;
}

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queueAction = useStore((s) => s.offline.queueAction);

  // Query: fetch projects list
  const {
    data: projects = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Project[], Error>({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const response = await apiService.get<{ projects: Project[] }>('/projects');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch projects');
      }

      const result = response.data as { projects: Project[] };
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

      const response = await apiService.post<{ project: Project }>('/projects', projectData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create project');
      }

      return (response.data as { project: Project }).project;
    },
    onMutate: async (projectData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all });
      const previous = queryClient.getQueryData<Project[]>(queryKeys.projects.all);
      const tempProject: Project = {
        id: `temp-${Date.now()}`,
        name: projectData.name,
        description: projectData.description || '',
        status: 'planning',
        priority: projectData.priority || 'medium',
        organizationId: projectData.organizationId,
        teamId: projectData.teamId,
        createdBy: user?.id || '',
        startDate: projectData.startDate || new Date().toISOString(),
        dueDate: projectData.dueDate,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: projectData.members || [],
        tasks: [],
        milestones: [],
        files: [],
        settings: { isPrivate: false, allowComments: true, requireApproval: false },
      };
      queryClient.setQueryData<Project[]>(
        queryKeys.projects.all,
        (old = []) => [...old, tempProject],
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success('Project created');
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err, input, context) => {
      if ((context as { previous?: Project[] })?.previous) {
        queryClient.setQueryData(queryKeys.projects.all, (context as { previous: Project[] }).previous);
      }
      if (isNetworkError(err)) {
        queueAction({
          type: 'create-project',
          payload: input,
          endpoint: getApiUrl('/api/projects'),
          method: 'POST',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }
      projectsLogger.error('Error creating project', err);
      toast.error(err.message || 'Failed to create project');
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

      const response = await apiService.makeRequest<{ project: Project }>(buildApiUrl(`/projects/${projectId}`), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update project');
      }

      return (response.data as { project: Project }).project;
    },
    onMutate: async ({ projectId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all });
      const previous = queryClient.getQueryData<Project[]>(queryKeys.projects.all);
      queryClient.setQueryData<Project[]>(
        queryKeys.projects.all,
        (old = []) => old.map((p) =>
          p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
        ),
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err, { projectId, updates }, context) => {
      if ((context as { previous?: Project[] })?.previous) {
        queryClient.setQueryData(queryKeys.projects.all, (context as { previous: Project[] }).previous);
      }
      if (isNetworkError(err)) {
        queueAction({
          type: 'update-project',
          payload: updates,
          endpoint: getApiUrl(`/api/projects/${projectId}`),
          method: 'PUT',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }
      projectsLogger.error('Error updating project', err);
      toast.error(err.message || 'Failed to update project');
    },
  });

  // Mutation: delete project
  const deleteProjectMutation = useMutation<void, Error, string, { previous: Project[] | undefined }>({
    mutationFn: async (projectId) => {
      if (!user) throw new Error('Authentication required');

      const response = await apiService.delete(`/projects/${projectId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete project');
      }
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all });
      const previous = queryClient.getQueryData<Project[]>(queryKeys.projects.all);
      queryClient.setQueryData<Project[]>(
        queryKeys.projects.all,
        (old = []) => old.filter((p) => p.id !== projectId),
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err, projectId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.projects.all, context.previous);
      }
      if (isNetworkError(err)) {
        queueAction({
          type: 'delete-project',
          payload: { id: projectId },
          endpoint: getApiUrl(`/api/projects/${projectId}`),
          method: 'DELETE',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }
      projectsLogger.error('Error deleting project', err);
      toast.error(err.message || 'Failed to delete project');
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
      const response = await apiService.post<{ task: Task }>(`/projects/${projectId}/tasks`, taskData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create task');
      }
      return (response.data as { task: Task }).task;
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
      const response = await apiService.makeRequest<{ task: Task }>(buildApiUrl(`/projects/${projectId}/tasks/${taskId}`), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update task');
      }
      return (response.data as { task: Task }).task;
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
      const response = await apiService.delete(`/projects/${projectId}/tasks/${taskId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task');
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
      const response = await apiService.post<{ milestone: Milestone }>(`/projects/${projectId}/milestones`, milestoneData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create milestone');
      }
      return (response.data as { milestone: Milestone }).milestone;
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
      const response = await apiService.makeRequest<{ milestone: Milestone }>(buildApiUrl(`/projects/${projectId}/milestones/${milestoneId}`), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update milestone');
      }
      return (response.data as { milestone: Milestone }).milestone;
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
