/**
 * useTaskFiltering Hook
 * Manages filter state and filter operations for task lists
 */

import { useState, useMemo, useCallback } from 'react';
import type { Task } from './useTasks';

export interface FilterState {
  status: Task['status'][];
  priority: Task['priority'][];
  assignee: string[];
}

interface UseTaskFilteringOptions {
  tasks: Task[];
}

interface UseTaskFilteringReturn {
  filters: FilterState;
  filteredTasks: Task[];
  uniqueAssignees: string[];
  hasActiveFilters: boolean;
  toggleFilter: <K extends keyof FilterState>(key: K, value: FilterState[K][number]) => void;
  clearFilters: () => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const initialFilters: FilterState = {
  status: [],
  priority: [],
  assignee: [],
};

export function useTaskFiltering({ tasks }: UseTaskFilteringOptions): UseTaskFilteringReturn {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Get unique assignees for filter options
  const uniqueAssignees = useMemo(() => {
    const assignees = tasks
      .map(t => t.assignedTo)
      .filter((a): a is string => a !== null);
    return Array.from(new Set(assignees));
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
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

    return filtered;
  }, [tasks, filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0;
  }, [filters]);

  /**
   * Toggle filter value
   */
  const toggleFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K][number]
  ) => {
    setFilters(prev => {
      const current = prev[key];
      const exists = (current as unknown[]).includes(value);

      return {
        ...prev,
        [key]: exists
          ? (current as unknown[]).filter(v => v !== value)
          : [...current, value],
      };
    });
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  return {
    filters,
    filteredTasks,
    uniqueAssignees,
    hasActiveFilters,
    toggleFilter,
    clearFilters,
    setFilters,
  };
}

export type { Task };
