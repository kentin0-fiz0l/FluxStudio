import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => ({ token: 'test-token', user: { id: 'u1' } }),
}))

import { useMetMapBranches } from '../useMetMapBranches'
import { apiService } from '@/services/apiService'

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('useMetMapBranches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns empty branches initially', () => {
    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })
    expect(result.current.branches).toEqual([])
  })

  test('query disabled when no songId', () => {
    const { result } = renderHook(() => useMetMapBranches(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(false)
    expect(apiService.get).not.toHaveBeenCalled()
  })

  test('query disabled when no token', () => {
    vi.mocked(apiService.get).mockClear()
    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })
    expect(result.current.branches).toEqual([])
  })

  test('createBranch calls API with correct params', async () => {
    vi.mocked(apiService.post).mockResolvedValueOnce({
      success: true,
      data: {
        branch: {
          id: 'branch-1',
          songId: 'song-1',
          name: 'Experiment A',
        },
      },
    })

    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })

    await result.current.createBranch({ name: 'Experiment A', description: 'Jazz variation' })

    expect(apiService.post).toHaveBeenCalledWith(
      '/api/metmap/songs/song-1/branches',
      { name: 'Experiment A', description: 'Jazz variation' }
    )
  })

  test('deleteBranch calls API with correct params', async () => {
    vi.mocked(apiService.delete).mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })

    await result.current.deleteBranch('branch-1')

    expect(apiService.delete).toHaveBeenCalledWith(
      '/api/metmap/songs/song-1/branches/branch-1'
    )
  })

  test('mergeBranch calls API with correct params', async () => {
    vi.mocked(apiService.post).mockResolvedValueOnce({
      success: true,
      data: { branch: { id: 'branch-1', mergedAt: '2025-01-01' } },
    })

    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })

    await result.current.mergeBranch('branch-1')

    expect(apiService.post).toHaveBeenCalledWith(
      '/api/metmap/songs/song-1/branches/branch-1/merge'
    )
  })

  test('isCreating flag reflects mutation state', async () => {
    let resolvePost: (v: any) => void
    vi.mocked(apiService.post).mockReturnValueOnce(
      new Promise((r) => { resolvePost = r })
    )

    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isCreating).toBe(false)

    const promise = result.current.createBranch({ name: 'Test' })

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true)
    })

    resolvePost!({ data: { branch: { id: 'b-1' } } })
    await promise

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false)
    })
  })

  test('isMerging flag reflects mutation state', async () => {
    let resolvePost: (v: any) => void
    vi.mocked(apiService.post).mockReturnValueOnce(
      new Promise((r) => { resolvePost = r })
    )

    const { result } = renderHook(() => useMetMapBranches('song-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isMerging).toBe(false)

    const promise = result.current.mergeBranch('branch-1')

    await waitFor(() => {
      expect(result.current.isMerging).toBe(true)
    })

    resolvePost!({ data: { branch: { id: 'branch-1' } } })
    await promise

    await waitFor(() => {
      expect(result.current.isMerging).toBe(false)
    })
  })
})
