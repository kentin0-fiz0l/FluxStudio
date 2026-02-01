/**
 * Task List View Component - Flux Design Language
 *
 * A comprehensive table-based interface for managing project tasks.
 * Features inline editing, sorting, filtering, and full accessibility support.
 *
 * WCAG 2.1 Level A Compliant - Includes:
 * - Full keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - ARIA labels and live regions for screen readers
 * - Focus management and visual indicators
 * - Semantic HTML with proper roles
 *
 * @example
 * <TaskListView
 *   projectId="123"
 *   tasks={tasks}
 *   onTaskUpdate={handleUpdate}
 *   onTaskDelete={handleDelete}
 *   onTaskCreate={handleCreate}
 * />
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '../ui';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskListControls } from './TaskListControls';
import { TaskFilterPanel } from './TaskFilterPanel';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import { TaskMobileCard } from './TaskMobileCard';
import type { Task, SortField, SortDirection, FilterState, EditState } from './types';
import { sortTasks } from './utils';

// Re-export Task type for consumers
export type { Task };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TaskListViewProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTaskCreate: () => void;
  loading?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TaskListView: React.FC<TaskListViewProps> = ({
  projectId,
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  loading = false,
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    priority: [],
    assignee: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    taskId: null,
    field: null,
    value: '',
  });
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Refs for accessibility
  const tableRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================

  // Auto-focus edit input when entering edit mode
  useEffect(() => {
    if (editState.taskId && editState.field && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editState.taskId, editState.field]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = tasks
      .map(t => t.assignedTo)
      .filter((a): a is string => a !== null);
    return Array.from(new Set(assignees));
  }, [tasks]);

  // Apply filters and sorting
  const processedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority));
    }

    // Apply assignee filter
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(task =>
        task.assignedTo && filters.assignee.includes(task.assignedTo)
      );
    }

    // Apply sorting
    return sortTasks(filtered, sortField, sortDirection);
  }, [tasks, filters, sortField, sortDirection]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0;
  }, [filters]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Toggle sort direction or change sort field
   */
  const handleSort = useCallback((field: SortField) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        return field;
      } else {
        setSortDirection('asc');
        return field;
      }
    });
  }, []);

  /**
   * Toggle filter value
   */
  const toggleFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K][number]
  ) => {
    setFilters(prev => {
      const current = prev[key];
      const valueToCheck = value as typeof current[number];
      const exists = (current as readonly (typeof valueToCheck)[]).includes(valueToCheck);

      return {
        ...prev,
        [key]: exists
          ? current.filter((v): v is typeof valueToCheck => v !== valueToCheck)
          : [...current, valueToCheck],
      };
    });
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      status: [],
      priority: [],
      assignee: [],
    });
  }, []);

  /**
   * Enter edit mode for a field
   */
  const startEdit = useCallback((taskId: string, field: keyof Task, currentValue: string) => {
    setEditState({
      taskId,
      field,
      value: currentValue || '',
    });
  }, []);

  /**
   * Cancel edit mode
   */
  const cancelEdit = useCallback(() => {
    setEditState({
      taskId: null,
      field: null,
      value: '',
    });
  }, []);

  /**
   * Save edited value
   */
  const saveEdit = useCallback(async () => {
    if (!editState.taskId || !editState.field) return;

    setLoadingStates(prev => ({ ...prev, [editState.taskId!]: true }));

    try {
      await onTaskUpdate(editState.taskId, {
        [editState.field]: editState.value || null,
      });
      cancelEdit();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [editState.taskId!]: false }));
    }
  }, [editState, onTaskUpdate, cancelEdit]);

  /**
   * Handle keyboard navigation in edit mode
   */
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  /**
   * Toggle task completion status
   */
  const toggleComplete = useCallback(async (task: Task) => {
    setLoadingStates(prev => ({ ...prev, [task.id]: true }));

    try {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      await onTaskUpdate(task.id, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [task.id]: false }));
    }
  }, [onTaskUpdate]);

  /**
   * Delete task with confirmation
   */
  const handleDelete = useCallback(async (taskId: string) => {
    if (deleteConfirm !== taskId) {
      setDeleteConfirm(taskId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    setLoadingStates(prev => ({ ...prev, [taskId]: true }));

    try {
      await onTaskDelete(taskId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
      setLoadingStates(prev => ({ ...prev, [taskId]: false }));
    }
  }, [deleteConfirm, onTaskDelete]);

  /**
   * Open the edit modal for a task
   */
  const handleOpenEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  }, []);

  /**
   * Close the edit modal
   */
  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingTask(null);
  }, []);

  /**
   * Handle saving task from modal
   */
  const handleModalSave = useCallback(async (taskId: string | null, taskData: Partial<Task>) => {
    if (taskId) {
      await onTaskUpdate(taskId, taskData);
    }
  }, [onTaskUpdate]);

  /**
   * Handle deleting task from modal
   */
  const handleModalDelete = useCallback(async (taskId: string) => {
    await onTaskDelete(taskId);
  }, [onTaskDelete]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4" ref={tableRef}>
      {/* Header with Filters - Extracted Component */}
      <TaskListControls
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={filters.status.length + filters.priority.length + filters.assignee.length}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
        onTaskCreate={onTaskCreate}
      />

      {/* Filter Panel - Extracted Component */}
      {showFilters && (
        <TaskFilterPanel
          filters={filters}
          uniqueAssignees={uniqueAssignees}
          onToggleFilter={toggleFilter}
        />
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12" role="status" aria-live="polite">
          <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-neutral-600">Loading tasks...</p>
        </div>
      ) : processedTasks.length === 0 ? (
        // Empty State
        <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
          {hasActiveFilters ? (
            <>
              <AlertCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                No Matching Tasks
              </h3>
              <p className="text-neutral-600 mb-6">
                Try adjusting your filters to see more tasks
              </p>
              <Button
                variant="outline"
                onClick={clearFilters}
                icon={<X className="w-4 h-4" />}
              >
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                No Tasks Yet
              </h3>
              <p className="text-neutral-600 mb-6">
                Create your first task to get started
              </p>
              <Button
                onClick={onTaskCreate}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Task
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Task list">
                {/* Table Header - Extracted Component */}
                <TaskTableHeader
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                {/* Table Body - Extracted Row Component */}
                <tbody>
                  {processedTasks.map((task, index) => (
                    <TaskTableRow
                      key={task.id}
                      task={task}
                      index={index}
                      isEditing={(taskId, field) => editState.taskId === taskId && editState.field === field}
                      isLoading={(taskId) => !!loadingStates[taskId]}
                      editValue={editState.value}
                      editInputRef={editInputRef}
                      deleteConfirm={deleteConfirm}
                      onStartEdit={startEdit}
                      onEditValueChange={(value) => setEditState(prev => ({ ...prev, value }))}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      onEditKeyDown={handleEditKeyDown}
                      onToggleComplete={toggleComplete}
                      onOpenEditModal={handleOpenEditModal}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View - Extracted Component */}
          <div className="md:hidden space-y-3" role="list" aria-label="Task list">
            {processedTasks.map(task => (
              <TaskMobileCard
                key={task.id}
                task={task}
                isLoading={!!loadingStates[task.id]}
                onToggleComplete={toggleComplete}
                onOpenEditModal={handleOpenEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Results Summary */}
          <div
            className="text-sm text-neutral-600 text-center"
            role="status"
            aria-live="polite"
          >
            Showing {processedTasks.length} of {tasks.length} tasks
            {hasActiveFilters && ' (filtered)'}
          </div>
        </>
      )}

      {/* Task Edit Modal */}
      <TaskDetailModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        projectId={projectId}
        task={editingTask}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        teamMembers={[]}
      />
    </div>
  );
};
