/**
 * Unit Tests for useProjects hook
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
  createAuthSlice: vi.fn(() => () => ({})),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

vi.mock('../../lib/logger', () => ({
  hookLogger: {
    child: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

const mockProjects = [
  {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'in_progress',
    priority: 'medium',
    createdBy: 'user-1',
    startDate: '2025-01-01',
    progress: 50,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    members: ['user-1'],
    tasks: [],
    milestones: [],
    files: [],
    settings: { isPrivate: false, allowComments: true, requireApproval: false },
  },
];

import { useProjects } from '../useProjects';

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch projects on mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    }));

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    // Use an error message that does NOT include "fetch" or "network"
    // to avoid triggering apiService retry logic
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ message: 'Server error' }),
      headers: new Headers(),
    }));

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Server error'));
  });

  it('should create a project', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ csrfToken: 'csrf-123' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ project: mockProjects[0] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: mockProjects }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createProject({ name: 'New Project' });
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
  });

  it('should delete a project from state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: mockProjects }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.deleteProject('proj-1');
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(0));
  });

  it('should not fetch when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useProjects(), { wrapper: createWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should throw when creating task without auth', async () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

    await expect(
      result.current.createTask('proj-1', { title: 'Task' })
    ).rejects.toThrow('Authentication required');
  });
});
