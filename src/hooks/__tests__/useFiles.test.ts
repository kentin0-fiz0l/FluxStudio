/**
 * Unit Tests for useFiles hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

const mockUseAuth = vi.fn(() => ({ user: { id: 'user-1', name: 'Test User' } }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

const mockFiles = [
  {
    id: 'file-1',
    name: 'test.png',
    originalName: 'test.png',
    type: 'image/png',
    size: 1024,
    url: 'https://cdn.example.com/test.png',
    uploadedBy: 'user-1',
    uploadedAt: '2025-01-15T10:00:00.000Z',
    isImage: true,
    isVideo: false,
  },
  {
    id: 'file-2',
    name: 'doc.pdf',
    originalName: 'doc.pdf',
    type: 'application/pdf',
    size: 2048,
    url: 'https://cdn.example.com/doc.pdf',
    uploadedBy: 'user-1',
    uploadedAt: '2025-01-15T11:00:00.000Z',
    isImage: false,
    isVideo: false,
  },
];

import { useFiles } from '../useFiles';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should fetch files on mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles }),
    }));

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.files).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should fetch files with projectId filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useFiles('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('projectId=proj-1');
  });

  it('should handle fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Failed to fetch files'));
    expect(result.current.files).toEqual([]);
  });

  it('should not fetch files when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useFiles(), { wrapper: createWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should delete a file and update state', async () => {
    const remainingFiles = [mockFiles[1]];
    const fetchMock = vi.fn()
      // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: mockFiles }),
      })
      // DELETE request
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Refetch after invalidation
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: remainingFiles }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.files).toHaveLength(2));

    await act(async () => {
      await result.current.deleteFile('file-1');
    });

    await waitFor(() => expect(result.current.files).toHaveLength(1));
    expect(result.current.files[0].id).toBe('file-2');
  });

  it('should format file sizes correctly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    }));

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.formatFileSize(0)).toBe('0 Bytes');
    expect(result.current.formatFileSize(1024)).toBe('1 KB');
    expect(result.current.formatFileSize(1048576)).toBe('1 MB');
  });
});
