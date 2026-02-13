/**
 * Unit Tests for useActivities hooks
 * Tests TanStack Query-based activity fetching hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', name: 'Test User' } })),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

const mockActivitiesResponse = {
  success: true,
  activities: [
    {
      id: 'act-1',
      projectId: 'proj-1',
      type: 'task.created',
      action: 'created',
      userId: 'user-1',
      userName: 'Test User',
      entityType: 'task',
      entityId: 'task-1',
      entityTitle: 'Test Task',
      timestamp: '2025-01-15T10:00:00.000Z',
    },
    {
      id: 'act-2',
      projectId: 'proj-1',
      type: 'comment.created',
      action: 'commented',
      userId: 'user-2',
      userName: 'Other User',
      entityType: 'comment',
      entityId: 'comment-1',
      timestamp: '2025-01-15T09:00:00.000Z',
    },
  ],
  total: 2,
  hasMore: false,
};

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useActivitiesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch activities for a project', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    }));

    const { useActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useActivitiesQuery('proj-1'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.activities).toHaveLength(2);
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.hasMore).toBe(false);
  });

  it('should not fetch when projectId is undefined', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useActivitiesQuery(undefined),
      { wrapper: createWrapper() }
    );

    // When enabled is false, query should not be loading/fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    }));

    const { useActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useActivitiesQuery('proj-1', undefined, { retry: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });

  it('should pass query params to the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useActivitiesQuery } = await import('../useActivities');
    renderHook(
      () => useActivitiesQuery('proj-1', { limit: 10, type: 'task.created' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=10');
    expect(url).toContain('type=task.created');
  });

  it('should normalize response with missing fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ activities: [] }),
    }));

    const { useActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useActivitiesQuery('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      success: true,
      activities: [],
      total: 0,
      hasMore: false,
    });
  });
});

describe('useRecentActivitiesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    }));
  });

  it('should fetch recent activities with date filter', async () => {
    const { useRecentActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useRecentActivitiesQuery('proj-1', 5),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activities).toHaveLength(2);
  });
});

describe('useUserActivitiesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    }));
  });

  it('should fetch activities for a specific user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useUserActivitiesQuery } = await import('../useActivities');
    renderHook(
      () => useUserActivitiesQuery('proj-1', 'user-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('userId=user-1');
  });
});

describe('useDashboardActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch dashboard activities', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    }));

    const { useDashboardActivities } = await import('../useActivities');
    const { result } = renderHook(
      () => useDashboardActivities({ limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activities).toHaveLength(2);
  });

  it('should pass pagination params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivitiesResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useDashboardActivities } = await import('../useActivities');
    renderHook(
      () => useDashboardActivities({ limit: 5, offset: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=5');
    expect(url).toContain('offset=10');
  });
});
