/**
 * Unit Tests for useFiles hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

const mockUseAuth = vi.fn(() => ({ user: { id: 'user-1', name: 'Test User' } }));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => mockUseAuth(),
  createAuthSlice: vi.fn(() => () => ({})),
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

// Mock store for offline queueAction
vi.mock('../../store/store', () => ({
  useStore: vi.fn((selector: (state: any) => any) => {
    const mockState = {
      offline: { queueAction: vi.fn() },
    };
    return selector(mockState);
  }),
}));

// Mock toast
vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
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
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { files: mockFiles },
    });

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.files).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should fetch files with projectId filter', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { files: mockFiles },
    });

    renderHook(() => useFiles('proj-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(mockApiService.get).toHaveBeenCalled());
    const [endpoint, options] = mockApiService.get.mock.calls[0];
    expect(endpoint).toBe('/api/files');
    expect(options?.params?.projectId).toBe('proj-1');
  });

  it('should handle fetch error', async () => {
    mockApiService.get.mockRejectedValue(new Error('Failed to fetch files'));

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Failed to fetch files'));
    expect(result.current.files).toEqual([]);
  });

  it('should not fetch files when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null as any });

    renderHook(() => useFiles(), { wrapper: createWrapper() });
    expect(mockApiService.get).not.toHaveBeenCalled();
  });

  it('should delete a file and update state', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { files: mockFiles },
    });
    mockApiService.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.files).toHaveLength(2));

    // After delete + invalidation, return remaining files
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { files: [mockFiles[1]] },
    });

    await act(async () => {
      await result.current.deleteFile('file-1');
    });

    await waitFor(() => expect(result.current.files).toHaveLength(1));
    expect(result.current.files[0].id).toBe('file-2');
  });

  it('should format file sizes correctly', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { files: [] },
    });

    const { result } = renderHook(() => useFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.formatFileSize(0)).toBe('0 Bytes');
    expect(result.current.formatFileSize(1024)).toBe('1 KB');
    expect(result.current.formatFileSize(1048576)).toBe('1 MB');
  });
});
