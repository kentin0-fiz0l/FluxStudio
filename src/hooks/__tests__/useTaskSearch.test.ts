/**
 * Unit Tests for useTaskSearch hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, null, children);
  };
}

const mockTasks = [
  {
    id: 'task-1',
    title: 'Design homepage',
    description: 'Create homepage design',
    status: 'todo' as const,
    priority: 'high' as const,
    assignedTo: 'user-1',
    dueDate: '2025-06-01',
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    completedAt: null,
  },
  {
    id: 'task-2',
    title: 'Write tests',
    description: 'Unit tests for hooks',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    assignedTo: 'user-2',
    dueDate: null,
    createdBy: 'user-1',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    completedAt: null,
  },
  {
    id: 'task-3',
    title: 'Code review',
    description: 'Review pull requests',
    status: 'completed' as const,
    priority: 'low' as const,
    assignedTo: 'user-1',
    dueDate: '2025-01-10',
    createdBy: 'user-2',
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
    completedAt: '2025-01-09T00:00:00Z',
  },
];

const mockMembers = [
  { id: 'user-1', name: 'User One', email: 'one@test.com' },
  { id: 'user-2', name: 'User Two', email: 'two@test.com' },
];

describe('useTaskSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all tasks with no filters', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.filteredTasks).toHaveLength(3);
    expect(result.current.resultCount).toBe(3);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('should filter by search query', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false, debounceDelay: 50 }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('query', 'design');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].title).toBe('Design homepage');
  });

  it('should filter by status', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('status', ['in_progress']);
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('task-2');
  });

  it('should filter by priority', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('priority', ['high']);
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('task-1');
  });

  it('should filter by assignee', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('assignedTo', ['user-2']);
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('task-2');
  });

  it('should filter by no due date', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('dueDate', 'no-date');
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('task-2');
  });

  it('should toggle filters', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.toggleFilter('status', 'todo');
    });

    expect(result.current.filters.status).toContain('todo');

    act(() => {
      result.current.toggleFilter('status', 'todo');
    });

    expect(result.current.filters.status).not.toContain('todo');
  });

  it('should clear all filters', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('status', ['todo']);
      result.current.updateFilter('priority', ['high']);
    });

    expect(result.current.activeFilterCount).toBe(2);

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.filteredTasks).toHaveLength(3);
  });

  it('should apply my-tasks preset', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.applyPreset('my-tasks');
    });

    expect(result.current.filters.assignedTo).toContain('user-1');
    // Only non-completed tasks assigned to user-1
    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('task-1');
  });

  it('should apply high-priority preset', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.applyPreset('high-priority');
    });

    expect(result.current.filters.priority).toContain('high');
    expect(result.current.filters.priority).toContain('critical');
  });

  it('should sort by title ascending', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('sortBy', 'title-asc');
    });

    expect(result.current.filteredTasks[0].title).toBe('Code review');
    expect(result.current.filteredTasks[2].title).toBe('Write tests');
  });

  it('should sort by priority', async () => {
    const { useTaskSearch } = await import('../useTaskSearch');
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockMembers, 'user-1', { syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('sortBy', 'priority');
    });

    expect(result.current.filteredTasks[0].priority).toBe('high');
    expect(result.current.filteredTasks[2].priority).toBe('low');
  });
});
