/**
 * Unit Tests for useComments hooks (TanStack Query)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } })),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockComments = [
  {
    id: 'comment-1',
    taskId: 'task-1',
    projectId: 'proj-1',
    content: 'First comment',
    mentions: [],
    createdBy: 'user-1',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: null,
    author: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'comment-2',
    taskId: 'task-1',
    projectId: 'proj-1',
    content: 'Second comment',
    mentions: ['user-2'],
    createdBy: 'user-2',
    createdAt: '2025-01-15T11:00:00.000Z',
    updatedAt: null,
    author: { id: 'user-2', name: 'Other User', email: 'other@example.com' },
  },
];

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCommentsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch comments for a task', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, comments: mockComments }),
    }));

    const { useCommentsQuery } = await import('../useComments');
    const { result } = renderHook(
      () => useCommentsQuery('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].content).toBe('First comment');
  });

  it('should not fetch when projectId or taskId is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useCommentsQuery } = await import('../useComments');
    const { result } = renderHook(
      () => useCommentsQuery(undefined, 'task-1'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should handle error responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Forbidden' }),
    }));

    const { useCommentsQuery } = await import('../useComments');
    const { result } = renderHook(
      () => useCommentsQuery('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });

  it('should handle data array response format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockComments }),
    }));

    const { useCommentsQuery } = await import('../useComments');
    const { result } = renderHook(
      () => useCommentsQuery('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useCommentQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch a single comment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, comment: mockComments[0] }),
    }));

    const { useCommentQuery } = await import('../useComments');
    const { result } = renderHook(
      () => useCommentQuery('proj-1', 'task-1', 'comment-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('comment-1');
  });

  it('should not fetch without commentId', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useCommentQuery } = await import('../useComments');
    renderHook(
      () => useCommentQuery('proj-1', 'task-1', undefined),
      { wrapper: createWrapper() }
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useCreateCommentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should create a comment with optimistic update', async () => {
    const newComment = {
      id: 'comment-3',
      taskId: 'task-1',
      projectId: 'proj-1',
      content: 'New comment',
      mentions: [],
      createdBy: 'user-1',
      createdAt: '2025-01-15T12:00:00.000Z',
      updatedAt: null,
      author: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, comment: newComment }),
    }));

    const { useCreateCommentMutation } = await import('../useComments');
    const { result } = renderHook(
      () => useCreateCommentMutation('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ content: 'New comment' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle creation error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Failed to create' }),
    }));

    const { useCreateCommentMutation } = await import('../useComments');
    const { result } = renderHook(
      () => useCreateCommentMutation('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ content: 'Failing comment' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to create');
  });
});

describe('useUpdateCommentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should update a comment', async () => {
    const updated = { ...mockComments[0], content: 'Updated content', updatedAt: '2025-01-15T12:00:00.000Z' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, comment: updated }),
    }));

    const { useUpdateCommentMutation } = await import('../useComments');
    const { result } = renderHook(
      () => useUpdateCommentMutation('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate({ commentId: 'comment-1', updates: { content: 'Updated content' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeleteCommentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should delete a comment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));

    const { useDeleteCommentMutation } = await import('../useComments');
    const { result } = renderHook(
      () => useDeleteCommentMutation('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate('comment-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle deletion error and rollback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Cannot delete' }),
    }));

    const { useDeleteCommentMutation } = await import('../useComments');
    const { result } = renderHook(
      () => useDeleteCommentMutation('proj-1', 'task-1'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.mutate('comment-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
