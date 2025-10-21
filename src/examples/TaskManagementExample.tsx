/**
 * Task Management Example Component
 *
 * Demonstrates how to use React Query hooks for task management with:
 * - Fetching tasks
 * - Creating tasks with optimistic updates
 * - Updating tasks with instant UI feedback
 * - Deleting tasks with rollback on error
 * - Loading and error states
 * - Batch operations
 */

import React, { useState } from 'react';
import {
  useTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useBatchUpdateTasksMutation,
  Task,
  CreateTaskInput,
} from '../hooks/useTasks';

interface TaskManagementExampleProps {
  projectId: string;
}

export const TaskManagementExample: React.FC<TaskManagementExampleProps> = ({ projectId }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Fetch tasks with automatic caching and refetching
  const { data: tasks = [], isLoading, error, refetch } = useTasksQuery(projectId);

  // Mutations with optimistic updates
  const createTask = useCreateTaskMutation(projectId);
  const updateTask = useUpdateTaskMutation(projectId);
  const deleteTask = useDeleteTaskMutation(projectId);
  const batchUpdateTasks = useBatchUpdateTasksMutation(projectId);

  // Handle create task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: CreateTaskInput = {
      title: newTaskTitle,
      description: '',
      status: 'todo',
      priority: 'medium',
    };

    try {
      await createTask.mutateAsync(newTask);
      setNewTaskTitle(''); // Clear input on success
    } catch (error) {
      // Error handling is done in the mutation with toast notifications
      console.error('Failed to create task:', error);
    }
  };

  // Handle status change
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTask.mutateAsync({
        taskId,
        updates: { status: newStatus },
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // Handle priority change
  const handlePriorityChange = async (taskId: string, newPriority: Task['priority']) => {
    try {
      await updateTask.mutateAsync({
        taskId,
        updates: { priority: newPriority },
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask.mutateAsync(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Handle batch status update
  const handleBatchStatusUpdate = async (newStatus: Task['status']) => {
    if (selectedTasks.size === 0) return;

    try {
      await batchUpdateTasks.mutateAsync({
        taskIds: Array.from(selectedTasks),
        updates: { status: newStatus },
      });
      setSelectedTasks(new Set()); // Clear selection after batch update
    } catch (error) {
      console.error('Failed to batch update tasks:', error);
    }
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-neutral-600">Loading tasks...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4">
        <h3 className="text-error-900 font-medium mb-2">Failed to load tasks</h3>
        <p className="text-error-700 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-error-600 text-white rounded hover:bg-error-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get task count by status
  const taskCounts = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Task Management</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="text-sm text-neutral-600">To Do</div>
            <div className="text-2xl font-bold text-neutral-900">{taskCounts.todo}</div>
          </div>
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="text-sm text-primary-600">In Progress</div>
            <div className="text-2xl font-bold text-primary-900">{taskCounts.in_progress}</div>
          </div>
          <div className="bg-warning-50 rounded-lg p-4">
            <div className="text-sm text-warning-600">Review</div>
            <div className="text-2xl font-bold text-warning-900">{taskCounts.review}</div>
          </div>
          <div className="bg-success-50 rounded-lg p-4">
            <div className="text-sm text-success-600">Completed</div>
            <div className="text-2xl font-bold text-success-900">{taskCounts.completed}</div>
          </div>
        </div>
      </div>

      {/* Create task form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Create New Task</h3>
        <form onSubmit={handleCreateTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={createTask.isPending}
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || createTask.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>

      {/* Batch actions */}
      {selectedTasks.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-primary-900 font-medium">
              {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchStatusUpdate('completed')}
                disabled={batchUpdateTasks.isPending}
                className="px-4 py-2 bg-success-600 text-white rounded hover:bg-success-700 disabled:opacity-50 transition-colors"
              >
                Mark as Completed
              </button>
              <button
                onClick={() => handleBatchStatusUpdate('in_progress')}
                disabled={batchUpdateTasks.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Mark as In Progress
              </button>
              <button
                onClick={() => setSelectedTasks(new Set())}
                className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Tasks</h3>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500 mb-4">No tasks yet. Create your first task above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                    selectedTasks.has(task.id) ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                    />

                    {/* Task content */}
                    <div className="flex-1">
                      <h4 className="font-medium text-neutral-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-neutral-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                        <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                        {task.dueDate && (
                          <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Status dropdown */}
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                      className="px-3 py-1 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={updateTask.isPending}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                    </select>

                    {/* Priority dropdown */}
                    <select
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(task.id, e.target.value as Task['priority'])}
                      className="px-3 py-1 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={updateTask.isPending}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTask.isPending}
                      className="px-3 py-1 text-error-600 hover:bg-error-50 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagementExample;
