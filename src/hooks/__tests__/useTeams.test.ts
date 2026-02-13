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

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teams: mockTeams }),
    }));

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Failed to fetch teams'));
  });

  it('should create a team', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teams: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ team: mockTeams[0] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teams: mockTeams }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createTeam({ name: 'Design Team' });
    });

    await waitFor(() => expect(result.current.teams).toHaveLength(1));
  });

  it('should update a team', async () => {
    const updated = { ...mockTeams[0], name: 'Updated Team' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teams: mockTeams }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teams: [updated] }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.teams).toHaveLength(1));

    await act(async () => {
      await result.current.updateTeam('team-1', { name: 'Updated Team' });
    });

    await waitFor(() => expect(result.current.teams[0].name).toBe('Updated Team'));
  });

  it('should invite a member', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teams: mockTeams }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teams: mockTeams }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.teams).toHaveLength(1));

    await act(async () => {
      await result.current.inviteMember('team-1', 'new@example.com', 'member');
    });

    expect(fetchMock.mock.calls[1][0]).toContain('/invite');
  });

  it('should not fetch when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useTeams(), { wrapper: createWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
