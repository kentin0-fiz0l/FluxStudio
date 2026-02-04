/**
 * useTaskEditing Hook
 * Manages inline editing state and operations for task lists
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Task } from './useTasks';

export interface EditState {
  taskId: string | null;
  field: keyof Task | null;
  value: string;
}

interface UseTaskEditingOptions {
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

interface UseTaskEditingReturn {
  editState: EditState;
  loadingStates: Record<string, boolean>;
  editInputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  startEdit: (taskId: string, field: keyof Task, currentValue: string) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setEditValue: (value: string) => void;
  handleEditKeyDown: (e: React.KeyboardEvent) => void;
  toggleComplete: (task: Task) => Promise<void>;
  isEditing: (taskId: string, field: keyof Task) => boolean;
  isLoading: (taskId: string) => boolean;
}

const initialEditState: EditState = {
  taskId: null,
  field: null,
  value: '',
};

export function useTaskEditing({ onTaskUpdate }: UseTaskEditingOptions): UseTaskEditingReturn {
  const [editState, setEditState] = useState<EditState>(initialEditState);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Auto-focus edit input when entering edit mode
  useEffect(() => {
    if (editState.taskId && editState.field && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editState.taskId, editState.field]);

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
    setEditState(initialEditState);
  }, []);

  /**
   * Update edit value
   */
  const setEditValue = useCallback((value: string) => {
    setEditState(prev => ({ ...prev, value }));
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
   * Check if a specific field is being edited
   */
  const isEditing = useCallback((taskId: string, field: keyof Task) => {
    return editState.taskId === taskId && editState.field === field;
  }, [editState]);

  /**
   * Check if a task is in loading state
   */
  const isLoading = useCallback((taskId: string) => {
    return loadingStates[taskId] || false;
  }, [loadingStates]);

  return {
    editState,
    loadingStates,
    editInputRef,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditValue,
    handleEditKeyDown,
    toggleComplete,
    isEditing,
    isLoading,
  };
}
