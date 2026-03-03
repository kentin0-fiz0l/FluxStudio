/**
 * ActivityFeed Component Tests
 *
 * Tests: loading state, error state, empty state, activity rendering.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ActivityFeed } from '../ActivityFeed';

vi.mock('@/hooks/useActivities', () => ({
  useActivitiesQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useRealtimeActivities', () => ({
  useRealtimeActivities: vi.fn(() => ({
    isConnected: false,
  })),
}));

vi.mock('../activity', () => ({
  ActivityItem: vi.fn(({ activity }: any) => (
    <div data-testid={`activity-item-${activity.id}`}>{activity.type}</div>
  )),
  ActivityFeedSkeleton: vi.fn(() => <div data-testid="activity-skeleton">Loading...</div>),
  EmptyState: vi.fn(() => <div data-testid="empty-state">No activity yet</div>),
  groupActivitiesByDate: vi.fn((activities: any[]) => {
    if (activities.length === 0) return [];
    return [['Today', activities]];
  }),
}));

const { useActivitiesQuery } = await import('@/hooks/useActivities');

describe('ActivityFeed', () => {
  test('renders loading skeleton when data is loading', () => {
    vi.mocked(useActivitiesQuery).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ActivityFeed projectId="p1" />);

    expect(screen.getByTestId('activity-skeleton')).toBeTruthy();
  });

  test('renders error state with retry button', () => {
    vi.mocked(useActivitiesQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: 'Network error' },
      refetch: vi.fn(),
    } as any);

    render(<ActivityFeed projectId="p1" />);

    expect(screen.getByText(/Failed to load activity feed/)).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  test('renders empty state when no activities exist', () => {
    vi.mocked(useActivitiesQuery).mockReturnValue({
      data: { activities: [], hasMore: false, total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ActivityFeed projectId="p1" />);

    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });

  test('renders activity items when data is available', () => {
    vi.mocked(useActivitiesQuery).mockReturnValue({
      data: {
        activities: [
          {
            id: 'a1',
            projectId: 'p1',
            type: 'task.created',
            userId: 'u1',
            userName: 'Alice',
            userEmail: 'alice@test.com',
            entityType: 'task',
            entityId: 'e1',
            timestamp: '2025-03-01T10:00:00Z',
            action: 'created',
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ActivityFeed projectId="p1" />);

    expect(screen.getByTestId('activity-item-a1')).toBeTruthy();
  });

  test('renders Activity header with total count in non-compact mode', () => {
    vi.mocked(useActivitiesQuery).mockReturnValue({
      data: { activities: [], hasMore: false, total: 42 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<ActivityFeed projectId="p1" />);

    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });
});
