/**
 * useTaskSorting Hook
 * Manages sort state and sorting operations for task lists
 */

import { useState, useMemo, useCallback } from 'react';
import type { Task } from './useTasks';

export type SortField = 'status' | 'priority' | 'dueDate' | 'title';
export type SortDirection = 'asc' | 'desc';

interface UseTaskSortingOptions {
  tasks: Task[];
  defaultField?: SortField;
  defaultDirection?: SortDirection;
}

interface UseTaskSortingReturn {
  sortField: SortField;
  sortDirection: SortDirection;
  sortedTasks: Task[];
  handleSort: (field: SortField) => void;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
}

/**
 * Sort tasks by field and direction
 */
export function sortTasks(tasks: Task[], field: SortField, direction: SortDirection): Task[] {
  return [...tasks].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case 'status':
        // Custom order: todo, in-progress, review, completed
        const statusOrder = { todo: 0, 'in_progress': 1, review: 2, completed: 3 };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
        break;
      case 'priority':
        // Custom order: critical, high, medium, low
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case 'dueDate':
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export function useTaskSorting({
  tasks,
  defaultField = 'status',
  defaultDirection = 'asc',
}: UseTaskSortingOptions): UseTaskSortingReturn {
  const [sortField, setSortField] = useState<SortField>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  // Apply sorting
  const sortedTasks = useMemo(() => {
    return sortTasks(tasks, sortField, sortDirection);
  }, [tasks, sortField, sortDirection]);

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

  return {
    sortField,
    sortDirection,
    sortedTasks,
    handleSort,
    setSortField,
    setSortDirection,
  };
}
