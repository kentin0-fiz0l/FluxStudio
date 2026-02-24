/**
 * Unit Tests for useOrganizations hook
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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

vi.mock('../../services/apiService', () => ({
  apiService: {
    getOrganizations: vi.fn(),
    createOrganization: vi.fn(),
  },
}));

const mockOrgs = [
  {
    id: 'org-1',
    name: 'Test Org',
    description: 'A test org',
    createdBy: 'user-1',
    createdAt: '2025-01-01',
    settings: { allowMemberInvites: true, requireApprovalForJoining: false, defaultMemberRole: 'member' },
    subscription: { plan: 'pro', status: 'active', memberLimit: 50, teamLimit: 10 },
  },
];

import { useOrganizations } from '../useOrganizations';
import { apiService } from '../../services/apiService';

describe('useOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch organizations on mount', async () => {
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockOrgs,
    });

    const { result } = renderHook(() => useOrganizations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organizations).toHaveLength(1);
    expect(result.current.currentOrganization?.id).toBe('org-1');
  });

  it('should handle fetch error', async () => {
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrganizations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.organizations).toEqual([]);
  });

  it('should create an organization', async () => {
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    });
    (apiService.createOrganization as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { organization: mockOrgs[0] },
    });

    const { result } = renderHook(() => useOrganizations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // After mutation, getOrganizations will be invalidated and re-fetched
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockOrgs,
    });

    await act(async () => {
      await result.current.createOrganization({ name: 'Test Org' });
    });

    await waitFor(() => expect(result.current.organizations).toHaveLength(1));
    expect(result.current.currentOrganization?.id).toBe('org-1');
  });

  it('should switch organizations', async () => {
    const orgs = [
      { ...mockOrgs[0] },
      { ...mockOrgs[0], id: 'org-2', name: 'Second Org' },
    ];
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: orgs,
    });

    const { result } = renderHook(() => useOrganizations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.organizations).toHaveLength(2));

    act(() => {
      result.current.switchOrganization('org-2');
    });

    expect(result.current.currentOrganization?.id).toBe('org-2');
  });

  it('should not fetch when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    renderHook(() => useOrganizations(), { wrapper: createWrapper() });
    expect(apiService.getOrganizations).not.toHaveBeenCalled();
  });

  it('should leave an organization', async () => {
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockOrgs,
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));

    const { result } = renderHook(() => useOrganizations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    // After leave, invalidation will re-fetch with empty data
    (apiService.getOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    });

    await act(async () => {
      await result.current.leaveOrganization('org-1');
    });

    await waitFor(() => expect(result.current.organizations).toHaveLength(0));
  });
});
