/**
 * Unit Tests for useTasks hooks (TanStack Query)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', name: 'Test User' } })),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

vi.mock('../../lib/queryClient', () => ({
  queryKeys: {
    tasks: {
      all: ['tasks'],
      lists: () => ['tasks', 'list'],
      list: (projectId: string) => ['tasks', 'list', projectId],
      details: () => ['tasks', 'detail'],
      detail: (taskId: string) => ['tasks', 'detail', taskId],
    },
    projects: {
      detail: (id: string) => ['projects', 'detail', id],
    },
    milestones: {
      list: (projectId: string) => ['milestones', 'list', projectId],
    },
  },
  invalidateProjectQueries: vi.fn(),
}));

vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/taskSocketService', () => ({
  taskSocketService: {
    emitTaskCreated: vi.fn(),
    emitTaskUpdated: vi.fn(),
    emitTaskDeleted: vi.fn(),
  },
}));

const mockTasks = [
  {
    id: 'task-1',
    title: 'Design homepage',
    description: 'Create homepage design',
    status: 'todo',
    priority: 'high',
    assignedTo: 'user-1',
    dueDate: '2025-06-01',
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'task-2',
    title: 'Write tests',
    description: 'Unit tests for hooks',
    status: 'in_progress',
    priority: 'medium',
    assignedTo: 'user-2',
    dueDate: null,
    createdBy: 'user-1',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    completedAt: null,
  },
];

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTasksQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch tasks for a project', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, tasks: mockTasks }),
    }));

    const { useTasksQuery } = await import('../useTasks');
    const { result } = renderHook(
      () => useTasksQuery('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].title).toBe('Design homepage');
  });

  it('should not fetch when projectId is undefined', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useTasksQuery } = await import('../useTasks');
    const { result } = renderHook(
      () => useTasksQuery(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should handle API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    }));

    const { useTasksQuery } = await import('../useTasks');
    const { result } = renderHook(
      () => useTasksQuery('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should handle data array response format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockTasks }),
    }));

    const { useTasksQuery } = await import('../useTasks');
    const { result } = renderHook(
      () => useTasksQuery('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useTaskQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch a single task', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, task: mockTasks[0] }),
    }));

    const { useTaskQuery } = await import('../useTasks');
    const { result } = renderHook(
      () => useTaskQuery('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('task-1');
  });

  it('should not fetch without taskId', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useTaskQuery } = await import('../useTasks');
    renderHook(
      () => useTaskQuery('proj-1', undefined),
      { wrapper: createWrapper() }
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useCreateTaskMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should create a task', async () => {
    const newTask = { ...mockTasks[0], id: 'task-3', title: 'New task' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, task: newTask }),
    }));

    const { useCreateTaskMutation } = await import('../useTasks');
    const { result } = renderHook(
      () => useCreateTaskMutation('proj-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ title: 'New task' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle creation error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Validation failed' }),
    }));

    const { useCreateTaskMutation } = await import('../useTasks');
    const { result } = renderHook(
      () => useCreateTaskMutation('proj-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ title: '' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateTaskMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should update a task', async () => {
    const updated = { ...mockTasks[0], status: 'completed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, task: updated }),
    }));

    const { useUpdateTaskMutation } = await import('../useTasks');
    const { result } = renderHook(
      () => useUpdateTaskMutation('proj-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ taskId: 'task-1', updates: { status: 'completed' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeleteTaskMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should delete a task', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));

    const { useDeleteTaskMutation } = await import('../useTasks');
    const { result } = renderHook(
      () => useDeleteTaskMutation('proj-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate('task-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useBatchUpdateTasksMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should batch update multiple tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, task: mockTasks[0] }),
    }));

    const { useBatchUpdateTasksMutation } = await import('../useTasks');
    const { result } = renderHook(
      () => useBatchUpdateTasksMutation('proj-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ taskIds: ['task-1', 'task-2'], updates: { status: 'completed' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useTasks convenience wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should return simplified interface', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, tasks: mockTasks }),
    }));

    const { useTasks } = await import('../useTasks');
    const { result } = renderHook(
      () => useTasks('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.tasks).toBeDefined());
    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe('function');
  });
});
