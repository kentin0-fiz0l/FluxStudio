/**
 * useTaskDeletion Hook
 * Manages delete confirmation and deletion operations for tasks
 */

import { useState, useCallback, useEffect } from 'react';

interface UseTaskDeletionOptions {
  onTaskDelete: (taskId: string) => Promise<void>;
  confirmationTimeout?: number;
}

interface UseTaskDeletionReturn {
  deleteConfirm: string | null;
  deletingTaskId: string | null;
  handleDelete: (taskId: string) => Promise<void>;
  cancelDelete: () => void;
  isConfirming: (taskId: string) => boolean;
  isDeleting: (taskId: string) => boolean;
}

export function useTaskDeletion({
  onTaskDelete,
  confirmationTimeout = 3000,
}: UseTaskDeletionOptions): UseTaskDeletionReturn {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Auto-cancel confirmation after timeout
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(null), confirmationTimeout);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm, confirmationTimeout]);

  /**
   * Delete task with confirmation
   * First call shows confirmation, second call executes delete
   */
  const handleDelete = useCallback(async (taskId: string) => {
    // First click - show confirmation
    if (deleteConfirm !== taskId) {
      setDeleteConfirm(taskId);
      return;
    }

    // Second click - execute delete
    setDeletingTaskId(taskId);

    try {
      await onTaskDelete(taskId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setDeletingTaskId(null);
    }
  }, [deleteConfirm, onTaskDelete]);

  /**
   * Cancel delete confirmation
   */
  const cancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  /**
   * Check if a task is in confirmation state
   */
  const isConfirming = useCallback((taskId: string) => {
    return deleteConfirm === taskId;
  }, [deleteConfirm]);

  /**
   * Check if a task is being deleted
   */
  const isDeleting = useCallback((taskId: string) => {
    return deletingTaskId === taskId;
  }, [deletingTaskId]);

  return {
    deleteConfirm,
    deletingTaskId,
    handleDelete,
    cancelDelete,
    isConfirming,
    isDeleting,
  };
}
