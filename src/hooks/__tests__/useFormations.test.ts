/**
 * Unit Tests for useFormations hooks
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

const mockFetchFormations = vi.fn();
const mockFetchFormation = vi.fn();
const mockCreateFormation = vi.fn();
const mockUpdateFormation = vi.fn();
const mockDeleteFormation = vi.fn();
const mockSaveFormation = vi.fn();

vi.mock('../../services/formationsApi', () => ({
  fetchFormations: (...args: any[]) => mockFetchFormations(...args),
  fetchFormation: (...args: any[]) => mockFetchFormation(...args),
  createFormation: (...args: any[]) => mockCreateFormation(...args),
  updateFormation: (...args: any[]) => mockUpdateFormation(...args),
  deleteFormation: (...args: any[]) => mockDeleteFormation(...args),
  saveFormation: (...args: any[]) => mockSaveFormation(...args),
}));

const mockFormationList = [
  { id: 'form-1', name: 'Opening', description: 'Opening formation', createdAt: '2025-01-01' },
  { id: 'form-2', name: 'Halftime', description: 'Halftime show', createdAt: '2025-01-02' },
];

const mockFormation = {
  id: 'form-1',
  name: 'Opening',
  description: 'Opening formation',
  performers: [],
  keyframes: [],
};

import { useFormations, useFormation, useCreateFormation, useSaveFormation } from '../useFormations';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useFormations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
  });

  it('should fetch formations on mount', async () => {
    mockFetchFormations.mockResolvedValue(mockFormationList);

    const { result } = renderHook(() => useFormations({ projectId: 'proj-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.formations).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when disabled', () => {
    renderHook(() => useFormations({ projectId: 'proj-1', enabled: false }), { wrapper: createWrapper() });
    expect(mockFetchFormations).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    mockFetchFormations.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFormations({ projectId: 'proj-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.formations).toEqual([]);
  });

  it('should create a formation and refetch', async () => {
    mockFetchFormations.mockResolvedValue(mockFormationList);
    mockCreateFormation.mockResolvedValue(mockFormation);

    const { result } = renderHook(() => useFormations({ projectId: 'proj-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: 'New Formation' });
    });

    expect(mockCreateFormation).toHaveBeenCalledWith('proj-1', { name: 'New Formation' });
  });

  it('should remove a formation from local state', async () => {
    const remainingFormations = [mockFormationList[1]];
    mockFetchFormations
      .mockResolvedValueOnce(mockFormationList) // initial fetch
      .mockResolvedValueOnce(remainingFormations); // refetch after delete
    mockDeleteFormation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFormations({ projectId: 'proj-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.formations).toHaveLength(2));

    await act(async () => {
      await result.current.remove('form-1');
    });

    await waitFor(() => expect(result.current.formations).toHaveLength(1));
    expect(result.current.formations[0].id).toBe('form-2');
  });
});

describe('useFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
  });

  it('should fetch a single formation', async () => {
    mockFetchFormation.mockResolvedValue(mockFormation);

    const { result } = renderHook(() => useFormation({ formationId: 'form-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.formation?.id).toBe('form-1');
  });

  it('should not fetch when formationId is undefined', () => {
    renderHook(() => useFormation({ formationId: undefined }), { wrapper: createWrapper() });
    expect(mockFetchFormation).not.toHaveBeenCalled();
  });

  it('should update a formation', async () => {
    mockFetchFormation.mockResolvedValue(mockFormation);
    mockUpdateFormation.mockResolvedValue({ ...mockFormation, name: 'Updated' });

    const { result } = renderHook(() => useFormation({ formationId: 'form-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.formation).not.toBeNull());

    await act(async () => {
      await result.current.update({ name: 'Updated' });
    });

    expect(mockUpdateFormation).toHaveBeenCalledWith('form-1', { name: 'Updated' });
  });

  it('should handle save with saving state', async () => {
    mockFetchFormation.mockResolvedValue(mockFormation);
    mockSaveFormation.mockResolvedValue(mockFormation);

    const { result } = renderHook(() => useFormation({ formationId: 'form-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.formation).not.toBeNull());

    await act(async () => {
      await result.current.save({ performers: [], keyframes: [] });
    });

    expect(mockSaveFormation).toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });
});

describe('useCreateFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
  });

  it('should create a formation', async () => {
    mockCreateFormation.mockResolvedValue(mockFormation);

    const { result } = renderHook(() => useCreateFormation(), { wrapper: createWrapper() });

    let created: any;
    await act(async () => {
      created = await result.current.create('proj-1', { name: 'New' });
    });

    expect(created.id).toBe('form-1');
    expect(result.current.loading).toBe(false);
  });

  it('should handle creation error', async () => {
    mockCreateFormation.mockRejectedValue(new Error('Create failed'));

    const { result } = renderHook(() => useCreateFormation(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.create('proj-1', { name: 'New' });
      } catch {
        // expected — mutateAsync rethrows
      }
    });

    await waitFor(() => expect(result.current.error).toBe('Create failed'));
  });
});

describe('useSaveFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test User' } });
  });

  it('should save and track lastSaved timestamp', async () => {
    mockSaveFormation.mockResolvedValue(mockFormation);

    const { result } = renderHook(() => useSaveFormation(), { wrapper: createWrapper() });

    expect(result.current.lastSaved).toBeNull();

    await act(async () => {
      await result.current.save('form-1', { performers: [], keyframes: [] });
    });

    await waitFor(() => expect(result.current.lastSaved).toBeInstanceOf(Date));
    expect(result.current.saving).toBe(false);
  });
});
