/**
 * Unit Tests for useTeams hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockUseAuth = vi.fn(() => ({ user: { id: 'user-1', name: 'Test User' } }));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

const { mockApiService } = vi.hoisted(() => ({
  mockApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));
vi.mock('@/services/apiService', () => ({
  apiService: mockApiService,
}));

const mockTeams = [
  {
    id: 'team-1',
    name: 'Design Team',
    description: 'The design team',
    createdBy: 'user-1',
    createdAt: '2025-01-01',
    members: [{ userId: 'user-1', role: 'owner', joinedAt: '2025-01-01' }],
    invites: [],
  },
];

import { useTeams } from '../useTeams';

describe('useTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch teams on mount', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { teams: mockTeams },
    });

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    mockApiService.get.mockRejectedValue(new Error('Failed to fetch teams'));

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Failed to fetch teams'));
  });

  it('should create a team', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { teams: [] },
    });
    mockApiService.post.mockResolvedValueOnce({
      success: true,
      data: { team: mockTeams[0] },
    });

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Update get mock to return the team after creation
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { teams: mockTeams },
    });

    await act(async () => {
      await result.current.createTeam({ name: 'Design Team' });
    });

    await waitFor(() => expect(result.current.teams).toHaveLength(1));
  });

  it('should update a team', async () => {
    const updated = { ...mockTeams[0], name: 'Updated Team' };
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { teams: mockTeams },
    });
    mockApiService.makeRequest.mockResolvedValueOnce({
      success: true,
      data: updated,
    });

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.teams).toHaveLength(1));

    // Update get mock to return updated team after update
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { teams: [updated] },
    });

    await act(async () => {
      await result.current.updateTeam('team-1', { name: 'Updated Team' });
    });

    await waitFor(() => expect(result.current.teams[0].name).toBe('Updated Team'));
  });

  it('should invite a member', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { teams: mockTeams },
    });
    mockApiService.post.mockResolvedValueOnce({
      success: true,
    });

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.teams).toHaveLength(1));

    await act(async () => {
      await result.current.inviteMember('team-1', 'new@example.com', 'member');
    });

    expect(mockApiService.post).toHaveBeenCalledWith(
      '/teams/team-1/invite',
      expect.objectContaining({ email: 'new@example.com', role: 'member' })
    );
  });

  it('should not fetch when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    renderHook(() => useTeams(), { wrapper: createWrapper() });
    expect(mockApiService.get).not.toHaveBeenCalled();
  });
});
