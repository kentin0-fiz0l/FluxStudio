/**
 * Task Search Integration Example
 *
 * Complete example showing how to integrate TaskSearch with TaskListView
 * for a full-featured task management page.
 */

import React, { useState, useCallback } from 'react';
import { TaskSearch } from './TaskSearch';
import { TaskListView } from './TaskListView';
import { Task, TeamMember } from '@/hooks/useTaskSearch';
import { Button } from '../ui/button';
import { Plus, Download, Settings } from 'lucide-react';

// ============================================================================
// MOCK DATA (Replace with actual API calls)
// ============================================================================

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Design homepage mockups',
    description: 'Create initial design concepts for the new homepage with focus on user experience and accessibility',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'alice-123',
    dueDate: '2025-10-20',
    createdBy: 'bob-456',
    createdAt: '2025-10-15T10:00:00Z',
    updatedAt: '2025-10-17T14:30:00Z',
    completedAt: null,
  },
  {
    id: '2',
    title: 'Implement authentication system',
    description: 'Build JWT-based authentication with refresh tokens, password reset, and email verification',
    status: 'todo',
    priority: 'critical',
    assignedTo: 'bob-456',
    dueDate: '2025-10-18',
    createdBy: 'alice-123',
    createdAt: '2025-10-14T09:00:00Z',
    updatedAt: '2025-10-14T09:00:00Z',
    completedAt: null,
  },
  {
    id: '3',
    title: 'Write unit tests for API endpoints',
    description: 'Add comprehensive test coverage for all REST API endpoints with edge cases',
    status: 'review',
    priority: 'medium',
    assignedTo: 'alice-123',
    dueDate: '2025-10-25',
    createdBy: 'bob-456',
    createdAt: '2025-10-16T11:00:00Z',
    updatedAt: '2025-10-17T16:00:00Z',
    completedAt: null,
  },
  {
    id: '4',
    title: 'Deploy to production environment',
    description: 'Deploy the application to production with proper monitoring and rollback plan',
    status: 'completed',
    priority: 'low',
    assignedTo: 'alice-123',
    dueDate: null,
    createdBy: 'alice-123',
    createdAt: '2025-10-10T08:00:00Z',
    updatedAt: '2025-10-16T18:00:00Z',
    completedAt: '2025-10-16T18:00:00Z',
  },
  {
    id: '5',
    title: 'Optimize database queries',
    description: 'Improve database query performance by adding indexes and optimizing slow queries',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'bob-456',
    dueDate: '2025-10-22',
    createdBy: 'bob-456',
    createdAt: '2025-10-13T14:00:00Z',
    updatedAt: '2025-10-17T10:00:00Z',
    completedAt: null,
  },
  {
    id: '6',
    title: 'Update documentation',
    description: 'Update API documentation and add examples for all endpoints',
    status: 'todo',
    priority: 'low',
    assignedTo: null,
    dueDate: '2025-11-01',
    createdBy: 'alice-123',
    createdAt: '2025-10-12T09:00:00Z',
    updatedAt: '2025-10-12T09:00:00Z',
    completedAt: null,
  },
];

const mockTeamMembers: TeamMember[] = [
  { id: 'alice-123', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  { id: 'bob-456', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
  { id: 'carol-789', name: 'Carol Williams', email: 'carol@fluxstudio.com' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TaskManagementPage: React.FC = () => {
  // State management
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(mockTasks);
  const [isLoading, setIsLoading] = useState(false);

  // Current user (would come from auth context in production)
  const currentUserId = 'alice-123';

  // ============================================================================
  // TASK CRUD OPERATIONS
  // ============================================================================

  /**
   * Update a task
   */
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setIsLoading(true);
    try {
      // In production, make API call here
      // await api.tasks.update(taskId, updates);

      // Optimistic update
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, ...updates, updatedAt: new Date().toISOString() }
            : task
        )
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      // Show error toast/notification
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a task
   */
  const handleTaskDelete = useCallback(async (taskId: string) => {
    setIsLoading(true);
    try {
      // In production, make API call here
      // await api.tasks.delete(taskId);

      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Show error toast/notification
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new task
   */
  const handleTaskCreate = useCallback(() => {
    // In production, open a modal or navigate to create page
    console.log('Opening task creation modal...');

    // Example of adding a new task
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      description: 'Task description',
      status: 'todo',
      priority: 'medium',
      assignedTo: null,
      dueDate: null,
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    setTasks(prevTasks => [...prevTasks, newTask]);
  }, [currentUserId]);

  /**
   * Export filtered tasks
   */
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(filteredTasks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `tasks-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [filteredTasks]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Page Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                Project Tasks
              </h1>
              <p className="mt-1 text-neutral-600">
                Manage and track all tasks for your project
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={handleExport}
                icon={<Download className="w-5 h-5" />}
                disabled={filteredTasks.length === 0}
              >
                Export
              </Button>

              <Button
                variant="ghost"
                size="md"
                icon={<Settings className="w-5 h-5" />}
              >
                Settings
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleTaskCreate}
                icon={<Plus className="w-5 h-5" />}
              >
                New Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <TaskSearch
              tasks={tasks}
              onFilteredTasks={setFilteredTasks}
              teamMembers={mockTeamMembers}
              currentUserId={currentUserId}
              syncWithURL={true}
              showPresets={true}
            />
          </div>

          {/* Task List */}
          <div className="bg-white rounded-lg shadow-sm">
            <TaskListView
              projectId="project-123"
              tasks={filteredTasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onTaskCreate={handleTaskCreate}
              loading={isLoading}
            />
          </div>

          {/* Stats Footer */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Tasks</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">
                  {tasks.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Filtered</p>
                <p className="text-2xl font-bold text-primary-600 mt-1">
                  {filteredTasks.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">In Progress</p>
                <p className="text-2xl font-bold text-info-600 mt-1">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Completed</p>
                <p className="text-2xl font-bold text-success-600 mt-1">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ALTERNATIVE: COMPACT SIDEBAR VERSION
// ============================================================================

export const TaskManagementWithSidebar: React.FC = () => {
  const [tasks, _setTasks] = useState<Task[]>(mockTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(mockTasks);
  const currentUserId = 'alice-123';

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar with Compact Search */}
      <div className="w-80 bg-white border-r border-neutral-200 overflow-y-auto">
        <div className="p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
        </div>
        <div className="p-4">
          <TaskSearch
            tasks={tasks}
            onFilteredTasks={setFilteredTasks}
            teamMembers={mockTeamMembers}
            currentUserId={currentUserId}
            syncWithURL={false}
            showPresets={true}
            compact={true}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Tasks</h1>
            <p className="text-neutral-600">
              {filteredTasks.length} of {tasks.length} tasks
            </p>
          </div>

          <TaskListView
            projectId="project-123"
            tasks={filteredTasks}
            onTaskUpdate={async () => {}}
            onTaskDelete={async () => {}}
            onTaskCreate={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ALTERNATIVE: MODAL VERSION (Without URL Sync)
// ============================================================================

export const TaskSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (task: Task) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const [tasks] = useState<Task[]>(mockTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(mockTasks);
  const currentUserId = 'alice-123';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">Select Task</h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Filters (No URL Sync in Modal) */}
        <div className="p-6 border-b border-neutral-200">
          <TaskSearch
            tasks={tasks}
            onFilteredTasks={setFilteredTasks}
            teamMembers={mockTeamMembers}
            currentUserId={currentUserId}
            syncWithURL={false}
            showPresets={false}
            compact={true}
          />
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {filteredTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onSelect(task)}
                className="w-full p-4 text-left border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <h3 className="font-medium text-neutral-900">{task.title}</h3>
                <p className="text-sm text-neutral-600 mt-1">{task.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-neutral-100 rounded">
                    {task.status}
                  </span>
                  <span className="text-xs px-2 py-1 bg-neutral-100 rounded">
                    {task.priority}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export as default for easy import
export default TaskManagementPage;
