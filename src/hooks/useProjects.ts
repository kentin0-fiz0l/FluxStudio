import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

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

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/projects'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const result = await response.json();
      setProjects(result.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createProject = useCallback(async (projectData: {
    name: string;
    description?: string;
    organizationId?: string;
    teamId?: string;
    startDate?: string;
    dueDate?: string;
    priority?: Project['priority'];
    members?: string[];
  }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');

      // Fetch CSRF token for POST request
      const csrfResponse = await fetch(getApiUrl('/api/csrf-token'), {
        credentials: 'include'
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch(getApiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      const result = await response.json();
      const newProject = result.project;

      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }, [user]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }

      const result = await response.json();
      const updatedProject = result.project;

      setProjects(prev => prev.map(project =>
        project.id === projectId ? updatedProject : project
      ));

      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }, [user]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }

      setProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }, [user]);

  // Task management functions
  const createTask = useCallback(async (projectId: string, taskData: {
    title: string;
    description?: string;
    assignedTo?: string;
    dueDate?: string;
    priority?: Task['priority'];
  }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }

      const result = await response.json();
      await fetchProjects(); // Refresh projects to get updated tasks
      return result.task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }, [user, fetchProjects]);

  const updateTask = useCallback(async (projectId: string, taskId: string, updates: Partial<Task>) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }

      const result = await response.json();
      await fetchProjects(); // Refresh projects to get updated tasks
      return result.task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }, [user, fetchProjects]);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }

      await fetchProjects(); // Refresh projects to get updated tasks
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }, [user, fetchProjects]);

  // Milestone management functions
  const createMilestone = useCallback(async (projectId: string, milestoneData: {
    title: string;
    description?: string;
    dueDate?: string;
  }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/milestones`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(milestoneData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create milestone');
      }

      const result = await response.json();
      await fetchProjects(); // Refresh projects to get updated milestones
      return result.milestone;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }, [user, fetchProjects]);

  const updateMilestone = useCallback(async (projectId: string, milestoneId: string, updates: Partial<Milestone>) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/milestones/${milestoneId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update milestone');
      }

      const result = await response.json();
      await fetchProjects(); // Refresh projects to get updated milestones
      return result.milestone;
    } catch (error) {
      console.error('Error updating milestone:', error);
      throw error;
    }
  }, [user, fetchProjects]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    createMilestone,
    updateMilestone
  };
}