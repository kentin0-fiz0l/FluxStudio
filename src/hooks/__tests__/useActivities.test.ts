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
vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', name: 'Test User' } })),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

const mockApiService = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  makeRequest: vi.fn(),
}));

vi.mock('@/services/apiService', () => ({
  apiService: mockApiService,
}));

const mockActivitiesData = {
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
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockActivitiesData,
    });

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
    const { useActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useActivitiesQuery(undefined),
      { wrapper: createWrapper() }
    );

    // When enabled is false, query should not be loading/fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockApiService.get).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockApiService.get.mockRejectedValue(new Error('Not found'));

    const { useActivitiesQuery } = await import('../useActivities');
    const { result } = renderHook(
      () => useActivitiesQuery('proj-1', undefined, { retry: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });

  it('should pass query params to the API', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockActivitiesData,
    });

    const { useActivitiesQuery } = await import('../useActivities');
    renderHook(
      () => useActivitiesQuery('proj-1', { limit: 10, type: 'task.created' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockApiService.get).toHaveBeenCalled());

    const [endpoint, options] = mockApiService.get.mock.calls[0];
    expect(endpoint).toContain('/projects/proj-1/activities');
    expect(options?.params?.limit).toBe('10');
    expect(options?.params?.type).toBe('task.created');
  });

  it('should normalize response with missing fields', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { activities: [] },
    });

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
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockActivitiesData,
    });
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
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockActivitiesData,
    });
  });

  it('should fetch activities for a specific user', async () => {
    const { useUserActivitiesQuery } = await import('../useActivities');
    renderHook(
      () => useUserActivitiesQuery('proj-1', 'user-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockApiService.get).toHaveBeenCalled());
    const [endpoint, options] = mockApiService.get.mock.calls[0];
    expect(endpoint).toContain('/projects/proj-1/activities');
    expect(options?.params?.userId).toBe('user-1');
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
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockActivitiesData,
    });

    const { useDashboardActivities } = await import('../useActivities');
    const { result } = renderHook(
      () => useDashboardActivities({ limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activities).toHaveLength(2);
  });

  it('should pass pagination params', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockActivitiesData,
    });

    const { useDashboardActivities } = await import('../useActivities');
    renderHook(
      () => useDashboardActivities({ limit: 5, offset: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockApiService.get).toHaveBeenCalled());
    const [endpoint, options] = mockApiService.get.mock.calls[0];
    expect(endpoint).toBe('/projects/activities/recent');
    expect(options?.params?.limit).toBe('5');
    expect(options?.params?.offset).toBe('10');
  });
});
