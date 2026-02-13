/**
 * Unit Tests for useProjectCounts hook
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

describe('useProjectCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch project counts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        counts: { messages: 10, files: 5, assets: 3, boards: 2 },
      }),
    }));

    const { useProjectCounts } = await import('../useProjectCounts');
    const { result } = renderHook(() => useProjectCounts('proj-1'), { wrapper: createWrapper() });

    // placeholderData makes isLoading false immediately — wait for actual data
    await waitFor(() => expect(result.current.counts).toEqual({ messages: 10, files: 5, assets: 3, boards: 2 }));
    expect(result.current.error).toBeNull();
  });

  it('should return default counts when projectId is undefined', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useProjectCounts } = await import('../useProjectCounts');
    const { result } = renderHook(() => useProjectCounts(undefined), { wrapper: createWrapper() });

    // Hook uses placeholderData: defaultCounts, so disabled query returns defaults
    expect(result.current.counts).toEqual({ messages: 0, files: 0, assets: 0, boards: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should handle error with default counts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { useProjectCounts } = await import('../useProjectCounts');
    const { result } = renderHook(() => useProjectCounts('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    // After error, data is undefined (placeholder only during loading), so counts defaults to null
    expect(result.current.counts).toBeNull();
  });

  it('should handle invalid response format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Invalid project' }),
    }));

    const { useProjectCounts } = await import('../useProjectCounts');
    const { result } = renderHook(() => useProjectCounts('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Invalid project'));
  });
});
