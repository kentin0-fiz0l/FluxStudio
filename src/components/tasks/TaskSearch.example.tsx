/**
 * TaskSearch Component - Usage Examples
 *
 * This file demonstrates various ways to use the TaskSearch component
 * in different scenarios and configurations.
 */

import React, { useState } from 'react';
import { TaskSearch } from './TaskSearch';
import { Task, TeamMember } from '@/hooks/useTaskSearch';

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

export const BasicTaskSearchExample: React.FC = () => {
  const [tasks, _setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Design homepage mockups',
      description: 'Create initial design concepts for the new homepage',
      status: 'in_progress',
      priority: 'high',
      assignedTo: 'user-1',
      dueDate: '2025-10-20',
      createdBy: 'user-2',
      createdAt: '2025-10-15T10:00:00Z',
      updatedAt: '2025-10-17T14:30:00Z',
      completedAt: null,
    },
    {
      id: '2',
      title: 'Implement authentication system',
      description: 'Build JWT-based authentication with refresh tokens',
      status: 'todo',
      priority: 'critical',
      assignedTo: 'user-2',
      dueDate: '2025-10-18',
      createdBy: 'user-1',
      createdAt: '2025-10-14T09:00:00Z',
      updatedAt: '2025-10-14T09:00:00Z',
      completedAt: null,
    },
    {
      id: '3',
      title: 'Write unit tests',
      description: 'Add comprehensive test coverage for API endpoints',
      status: 'review',
      priority: 'medium',
      assignedTo: 'user-1',
      dueDate: '2025-10-25',
      createdBy: 'user-2',
      createdAt: '2025-10-16T11:00:00Z',
      updatedAt: '2025-10-17T16:00:00Z',
      completedAt: null,
    },
  ]);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
    { id: 'user-2', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
  ];

  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Basic Task Search
        </h2>
        <p className="text-neutral-600">
          Search and filter tasks with full-text search, status, priority, and more.
        </p>
      </div>

      <TaskSearch
        tasks={tasks}
        onFilteredTasks={setFilteredTasks}
        teamMembers={teamMembers}
        currentUserId="user-1"
      />

      {/* Display filtered results */}
      <div className="space-y-2">
        <h3 className="font-semibold text-neutral-900">
          Results ({filteredTasks.length})
        </h3>
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="p-4 border border-neutral-200 rounded-lg bg-white"
          >
            <h4 className="font-medium text-neutral-900">{task.title}</h4>
            <p className="text-sm text-neutral-600 mt-1">{task.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 bg-neutral-100 rounded">
                {task.status}
              </span>
              <span className="text-xs px-2 py-1 bg-neutral-100 rounded">
                {task.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: Compact Mode (for sidebars or narrow layouts)
// ============================================================================

export const CompactTaskSearchExample: React.FC = () => {
  const [tasks] = useState<Task[]>([
    // Same tasks as above...
  ]);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  ];

  return (
    <div className="p-4 max-w-md bg-neutral-50 rounded-lg">
      <h3 className="font-semibold text-neutral-900 mb-4">
        Compact Search
      </h3>

      <TaskSearch
        tasks={tasks}
        onFilteredTasks={() => {}}
        teamMembers={teamMembers}
        currentUserId="user-1"
        compact={true}
        showPresets={false}
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: Without URL Sync (for modal or embedded use)
// ============================================================================

export const NoURLSyncExample: React.FC = () => {
  const [tasks] = useState<Task[]>([
    // Same tasks as above...
  ]);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  ];

  return (
    <div className="p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">
        Search Without URL Sync (for Modals)
      </h3>

      <TaskSearch
        tasks={tasks}
        onFilteredTasks={() => {}}
        teamMembers={teamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: Integrated with Task List View
// ============================================================================

export const IntegratedExample: React.FC = () => {
  const [tasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Design homepage mockups',
      description: 'Create initial design concepts for the new homepage',
      status: 'in_progress',
      priority: 'high',
      assignedTo: 'user-1',
      dueDate: '2025-10-20',
      createdBy: 'user-2',
      createdAt: '2025-10-15T10:00:00Z',
      updatedAt: '2025-10-17T14:30:00Z',
      completedAt: null,
    },
    {
      id: '2',
      title: 'Implement authentication system',
      description: 'Build JWT-based authentication with refresh tokens',
      status: 'todo',
      priority: 'critical',
      assignedTo: 'user-2',
      dueDate: '2025-10-18',
      createdBy: 'user-1',
      createdAt: '2025-10-14T09:00:00Z',
      updatedAt: '2025-10-14T09:00:00Z',
      completedAt: null,
    },
  ]);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
    { id: 'user-2', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
  ];

  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Project Tasks</h1>
          <p className="text-neutral-600 mt-1">
            Manage and track all tasks for your project
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <TaskSearch
        tasks={tasks}
        onFilteredTasks={setFilteredTasks}
        teamMembers={teamMembers}
        currentUserId="user-1"
        syncWithURL={true}
        showPresets={true}
      />

      {/* Task List (simplified example) */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Title
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr
                key={task.id}
                className="border-b border-neutral-100 hover:bg-neutral-50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{task.title}</div>
                  <div className="text-sm text-neutral-600">{task.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-neutral-100">
                    {task.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-neutral-100">
                    {task.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-700">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            No tasks found. Try adjusting your filters.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: Using Hook Directly (Advanced)
// ============================================================================

import { useTaskSearch } from '@/hooks/useTaskSearch';

export const DirectHookExample: React.FC = () => {
  const [tasks] = useState<Task[]>([
    // Tasks...
  ]);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  ];

  // Use the hook directly for custom UI
  const {
    filteredTasks,
    filters,
    updateFilter,
    toggleFilter: _toggleFilterFn,
    clearAllFilters,
    activeFilterCount,
    resultCount,
    applyPreset,
    toggleFilter: _toggleFilter,
  } = useTaskSearch(tasks, teamMembers, 'user-1', {
    syncWithURL: false,
    debounceDelay: 500,
    initialSort: 'priority',
  });

  return (
    <div className="p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">
        Custom Search UI with Direct Hook Usage
      </h3>

      {/* Custom search input */}
      <input
        type="text"
        value={filters.query}
        onChange={(e) => updateFilter('query', e.target.value)}
        placeholder="Search..."
        className="w-full px-4 py-2 border rounded-lg mb-4"
      />

      {/* Custom filter buttons */}
      <div className="space-x-2 mb-4">
        <button
          onClick={() => applyPreset('my-tasks')}
          className="px-3 py-1 bg-blue-100 rounded"
        >
          My Tasks
        </button>
        <button
          onClick={() => applyPreset('overdue')}
          className="px-3 py-1 bg-red-100 rounded"
        >
          Overdue
        </button>
        <button
          onClick={() => applyPreset('high-priority')}
          className="px-3 py-1 bg-orange-100 rounded"
        >
          High Priority
        </button>
      </div>

      {/* Active filters count */}
      {activeFilterCount > 0 && (
        <div className="mb-4">
          <span className="text-sm text-neutral-600">
            {activeFilterCount} active filters
          </span>
          <button
            onClick={clearAllFilters}
            className="ml-2 text-sm text-blue-600 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      <p className="text-sm text-neutral-600 mb-4">
        Showing {resultCount} of {tasks.length} tasks
      </p>

      <div className="space-y-2">
        {filteredTasks.map(task => (
          <div key={task.id} className="p-3 border rounded">
            {task.title}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 6: Keyboard Shortcut Demo
// ============================================================================

export const KeyboardShortcutExample: React.FC = () => {
  const [tasks] = useState<Task[]>([
    // Tasks...
  ]);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Keyboard Shortcuts</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <kbd className="px-2 py-1 bg-white rounded border">⌘K</kbd> or{' '}
            <kbd className="px-2 py-1 bg-white rounded border">Ctrl+K</kbd> -
            Focus search input
          </li>
          <li>
            <kbd className="px-2 py-1 bg-white rounded border">Tab</kbd> -
            Navigate through filters
          </li>
          <li>
            <kbd className="px-2 py-1 bg-white rounded border">Enter</kbd> -
            Activate filter button
          </li>
        </ul>
      </div>

      <TaskSearch
        tasks={tasks}
        onFilteredTasks={() => {}}
        teamMembers={teamMembers}
        currentUserId="user-1"
      />
    </div>
  );
};
