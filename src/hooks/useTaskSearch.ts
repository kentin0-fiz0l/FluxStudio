/**
 * useTaskSearch Hook - Flux Studio
 *
 * Custom hook for managing task search, filtering, and sorting logic.
 * Handles debounced search, multi-filter application, URL state sync, and sorting.
 *
 * @example
 * const {
 *   filteredTasks,
 *   filters,
 *   updateFilter,
 *   clearAllFilters,
 *   activeFilterCount,
 *   resultCount
 * } = useTaskSearch(tasks, teamMembers, currentUserId);
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export type DueDateFilter = 'overdue' | 'today' | 'this-week' | 'this-month' | 'no-date' | null;

export type SortOption = 'recent' | 'title-asc' | 'title-desc' | 'due-date' | 'priority' | 'status';

export interface SearchFilters {
  query: string;
  status: Task['status'][];
  priority: Task['priority'][];
  assignedTo: string[];
  dueDate: DueDateFilter;
  createdBy: string[];
  sortBy: SortOption;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce hook - delays updating value until after delay period
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Filter tasks by due date range
 */
function filterByDueDate(tasks: Task[], filter: DueDateFilter): Task[] {
  if (!filter) return tasks;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case 'overdue':
      return tasks.filter(task => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < today && task.status !== 'completed';
      });

    case 'today':
      return tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        return dueDateStart.getTime() === today.getTime();
      });

    case 'this-week':
      const weekEnd = new Date(today.getTime() + 7 * 86400000);
      return tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < weekEnd;
      });

    case 'this-month':
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      return tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= monthEnd;
      });

    case 'no-date':
      return tasks.filter(task => !task.dueDate);

    default:
      return tasks;
  }
}

/**
 * Sort tasks by specified criteria
 */
function sortTasks(tasks: Task[], sortBy: SortOption): Task[] {
  const sorted = [...tasks];

  switch (sortBy) {
    case 'recent':
      return sorted.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));

    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));

    case 'due-date':
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    case 'priority':
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    case 'status':
      const statusOrder = { 'in-progress': 0, 'review': 1, 'todo': 2, 'completed': 3 };
      return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    default:
      return sorted;
  }
}

/**
 * Parse filters from URL search params
 */
function parseFiltersFromURL(searchParams: URLSearchParams): Partial<SearchFilters> {
  const urlFilters: Partial<SearchFilters> = {};

  const query = searchParams.get('q');
  if (query) urlFilters.query = query;

  const status = searchParams.getAll('status') as Task['status'][];
  if (status.length > 0) urlFilters.status = status;

  const priority = searchParams.getAll('priority') as Task['priority'][];
  if (priority.length > 0) urlFilters.priority = priority;

  const assignedTo = searchParams.getAll('assignee');
  if (assignedTo.length > 0) urlFilters.assignedTo = assignedTo;

  const dueDate = searchParams.get('due') as DueDateFilter;
  if (dueDate) urlFilters.dueDate = dueDate;

  const createdBy = searchParams.getAll('creator');
  if (createdBy.length > 0) urlFilters.createdBy = createdBy;

  const sortBy = searchParams.get('sort') as SortOption;
  if (sortBy) urlFilters.sortBy = sortBy;

  return urlFilters;
}

/**
 * Serialize filters to URL search params
 */
function serializeFiltersToURL(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set('q', filters.query);
  if (filters.sortBy !== 'recent') params.set('sort', filters.sortBy);

  filters.status.forEach(s => params.append('status', s));
  filters.priority.forEach(p => params.append('priority', p));
  filters.assignedTo.forEach(a => params.append('assignee', a));
  if (filters.dueDate) params.set('due', filters.dueDate);
  filters.createdBy.forEach(c => params.append('creator', c));

  return params;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseTaskSearchOptions {
  /**
   * Enable URL state synchronization
   */
  syncWithURL?: boolean;

  /**
   * Debounce delay for search query (ms)
   */
  debounceDelay?: number;

  /**
   * Initial sort option
   */
  initialSort?: SortOption;
}

export interface UseTaskSearchReturn {
  // Filtered and sorted tasks
  filteredTasks: Task[];

  // Current filters
  filters: SearchFilters;

  // Update specific filter
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;

  // Toggle array filter value (for multi-select)
  toggleFilter: <K extends keyof Pick<SearchFilters, 'status' | 'priority' | 'assignedTo' | 'createdBy'>>(
    key: K,
    value: SearchFilters[K][number]
  ) => void;

  // Clear all filters
  clearAllFilters: () => void;

  // Clear specific filter category
  clearFilter: <K extends keyof SearchFilters>(key: K) => void;

  // Active filter count
  activeFilterCount: number;

  // Result count
  resultCount: number;

  // Check if any filters are active
  hasActiveFilters: boolean;

  // Preset filters
  applyPreset: (preset: 'my-tasks' | 'overdue' | 'high-priority' | 'in-progress') => void;
}

export function useTaskSearch(
  tasks: Task[],
  teamMembers: TeamMember[],
  currentUserId: string,
  options: UseTaskSearchOptions = {}
): UseTaskSearchReturn {
  const {
    syncWithURL = true,
    debounceDelay = 300,
    initialSort = 'recent'
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL or defaults
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const defaultFilters: SearchFilters = {
      query: '',
      status: [],
      priority: [],
      assignedTo: [],
      dueDate: null,
      createdBy: [],
      sortBy: initialSort,
    };

    if (syncWithURL) {
      const urlFilters = parseFiltersFromURL(searchParams);
      return { ...defaultFilters, ...urlFilters };
    }

    return defaultFilters;
  });

  // Debounced search query
  const debouncedQuery = useDebounce(filters.query, debounceDelay);

  // Sync filters to URL
  useEffect(() => {
    if (syncWithURL) {
      const params = serializeFiltersToURL(filters);
      setSearchParams(params, { replace: true });
    }
  }, [filters, syncWithURL, setSearchParams]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count += filters.status.length;
    if (filters.priority.length > 0) count += filters.priority.length;
    if (filters.assignedTo.length > 0) count += filters.assignedTo.length;
    if (filters.dueDate) count += 1;
    if (filters.createdBy.length > 0) count += filters.createdBy.length;
    return count;
  }, [filters]);

  // Check if any filters are active (including search)
  const hasActiveFilters = useMemo(() => {
    return activeFilterCount > 0 || debouncedQuery.length > 0;
  }, [activeFilterCount, debouncedQuery]);

  // Apply all filters and sorting
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply full-text search
    if (debouncedQuery) {
      const lowerQuery = debouncedQuery.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      result = result.filter(task => filters.status.includes(task.status));
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      result = result.filter(task => filters.priority.includes(task.priority));
    }

    // Apply assignee filter
    if (filters.assignedTo.length > 0) {
      result = result.filter(task =>
        task.assignedTo && filters.assignedTo.includes(task.assignedTo)
      );
    }

    // Apply due date filter
    if (filters.dueDate) {
      result = filterByDueDate(result, filters.dueDate);
    }

    // Apply created by filter
    if (filters.createdBy.length > 0) {
      result = result.filter(task => filters.createdBy.includes(task.createdBy));
    }

    // Apply sorting
    result = sortTasks(result, filters.sortBy);

    return result;
  }, [tasks, debouncedQuery, filters]);

  // Update specific filter
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle array filter value
  const toggleFilter = useCallback(<K extends keyof Pick<SearchFilters, 'status' | 'priority' | 'assignedTo' | 'createdBy'>>(
    key: K,
    value: SearchFilters[K][number]
  ) => {
    setFilters(prev => {
      const current = prev[key] as SearchFilters[K];
      const exists = current.includes(value);

      return {
        ...prev,
        [key]: exists
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      query: '',
      status: [],
      priority: [],
      assignedTo: [],
      dueDate: null,
      createdBy: [],
      sortBy: filters.sortBy, // Preserve sort
    });
  }, [filters.sortBy]);

  // Clear specific filter category
  const clearFilter = useCallback(<K extends keyof SearchFilters>(key: K) => {
    setFilters(prev => ({
      ...prev,
      [key]: Array.isArray(prev[key]) ? [] : key === 'query' ? '' : null,
    }));
  }, []);

  // Apply preset filters
  const applyPreset = useCallback((preset: 'my-tasks' | 'overdue' | 'high-priority' | 'in-progress') => {
    switch (preset) {
      case 'my-tasks':
        setFilters(prev => ({
          ...prev,
          assignedTo: [currentUserId],
          status: ['todo', 'in-progress', 'review'],
        }));
        break;

      case 'overdue':
        setFilters(prev => ({
          ...prev,
          dueDate: 'overdue',
          status: ['todo', 'in-progress', 'review'],
        }));
        break;

      case 'high-priority':
        setFilters(prev => ({
          ...prev,
          priority: ['high', 'critical'],
          status: ['todo', 'in-progress', 'review'],
        }));
        break;

      case 'in-progress':
        setFilters(prev => ({
          ...prev,
          status: ['in-progress'],
        }));
        break;
    }
  }, [currentUserId]);

  return {
    filteredTasks,
    filters,
    updateFilter,
    toggleFilter,
    clearAllFilters,
    clearFilter,
    activeFilterCount,
    resultCount: filteredTasks.length,
    hasActiveFilters,
    applyPreset,
  };
}
