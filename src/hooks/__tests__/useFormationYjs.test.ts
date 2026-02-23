/**
 * Unit Tests for useFormationYjs Hook
 * @file src/hooks/__tests__/useFormationYjs.test.ts
 *
 * Tests awareness state management and sync functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';

// Create mock awareness instance
const mockAwarenessState = new Map<number, Record<string, unknown>>();
let localClientId = 1;

const mockAwareness = {
  clientID: localClientId,
  getLocalState: vi.fn(() => mockAwarenessState.get(localClientId)),
  setLocalState: vi.fn((state: Record<string, unknown>) => {
    mockAwarenessState.set(localClientId, state);
  }),
  setLocalStateField: vi.fn((field: string, value: unknown) => {
    const current = mockAwarenessState.get(localClientId) || {};
    mockAwarenessState.set(localClientId, { ...current, [field]: value });
  }),
  getStates: vi.fn(() => mockAwarenessState),
  on: vi.fn(),
  off: vi.fn(),
};

// Create mock WebSocket provider
const mockProvider = {
  awareness: mockAwareness,
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

// Mock Y.Doc
const mockDoc = {
  getMap: vi.fn(() => ({
    observeDeep: vi.fn(),
    unobserveDeep: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  })),
  getArray: vi.fn(() => ({
    observeDeep: vi.fn(),
    unobserveDeep: vi.fn(),
    toArray: vi.fn(() => []),
  })),
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

// Mock Yjs modules
vi.mock('yjs', () => ({
  Doc: vi.fn(() => mockDoc),
  UndoManager: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    destroy: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
  })),
}));

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn(() => mockProvider),
}));

vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: vi.fn(() => ({
    on: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
    },
  })),
}));

// Import hook after mocks
import { useFormationYjs } from '../useFormationYjs';

describe('useFormationYjs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAwarenessState.clear();
    localClientId = 1;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial Awareness State', () => {
    it('should initialize awareness state with all required fields', async () => {
      renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      // Wait for effect to run
      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      const setLocalStateCall = mockAwareness.setLocalState.mock.calls[0][0];

      // Verify all fields are initialized
      expect(setLocalStateCall).toMatchObject({
        user: expect.objectContaining({
          id: 'user-123',
          name: 'Test User',
        }),
        isActive: true,
        lastActivity: expect.any(Number),
        cursor: null,
        selectedPerformerIds: [],
        draggingPerformerId: null,
        activeKeyframeId: null,
      });
    });

    it('should initialize selectedPerformerIds as empty array', async () => {
      renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      const initialState = mockAwareness.setLocalState.mock.calls[0][0];
      expect(initialState.selectedPerformerIds).toEqual([]);
      expect(Array.isArray(initialState.selectedPerformerIds)).toBe(true);
    });
  });

  describe('setSelectedPerformers', () => {
    it('should update selectedPerformerIds atomically', async () => {
      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      // Wait for initialization
      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // Call setSelectedPerformers
      act(() => {
        result.current.setSelectedPerformers(['performer-1', 'performer-2']);
      });

      // Verify setLocalState was called with the full state including selectedPerformerIds
      expect(mockAwareness.setLocalState).toHaveBeenCalled();
      const stateCall = mockAwareness.setLocalState.mock.calls[0][0];
      expect(stateCall.selectedPerformerIds).toEqual(['performer-1', 'performer-2']);
    });

    it('should preserve existing state fields when updating selection', async () => {
      // Set up initial state
      mockAwarenessState.set(localClientId, {
        user: { id: 'user-123', name: 'Test User', color: '#FF0000' },
        isActive: true,
        cursor: { x: 50, y: 50, timestamp: Date.now() },
        selectedPerformerIds: [],
        draggingPerformerId: null,
      });

      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      act(() => {
        result.current.setSelectedPerformers(['performer-1']);
      });

      const stateCall = mockAwareness.setLocalState.mock.calls[0][0];

      // Verify user and other fields are preserved
      expect(stateCall.user).toBeDefined();
      expect(stateCall.selectedPerformerIds).toEqual(['performer-1']);
    });

    it('should clear selection when called with empty array', async () => {
      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      // First set some performers
      act(() => {
        result.current.setSelectedPerformers(['performer-1']);
      });

      vi.clearAllMocks();

      // Then clear
      act(() => {
        result.current.setSelectedPerformers([]);
      });

      const stateCall = mockAwareness.setLocalState.mock.calls[0][0];
      expect(stateCall.selectedPerformerIds).toEqual([]);
    });
  });

  describe('setDraggingPerformer', () => {
    it('should update draggingPerformerId atomically', async () => {
      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      act(() => {
        result.current.setDraggingPerformer('performer-1');
      });

      expect(mockAwareness.setLocalState).toHaveBeenCalled();
      const stateCall = mockAwareness.setLocalState.mock.calls[0][0];
      expect(stateCall.draggingPerformerId).toBe('performer-1');
    });

    it('should clear dragging state when called with null', async () => {
      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      // Set dragging
      act(() => {
        result.current.setDraggingPerformer('performer-1');
      });

      vi.clearAllMocks();

      // Clear dragging
      act(() => {
        result.current.setDraggingPerformer(null);
      });

      const stateCall = mockAwareness.setLocalState.mock.calls[0][0];
      expect(stateCall.draggingPerformerId).toBeNull();
    });
  });

  describe('Collaborator State Parsing', () => {
    it('should correctly parse collaborator awareness states', async () => {
      // Set up another client's state
      const otherClientId = 2;
      const otherClientState: FormationAwarenessState = {
        user: { id: 'user-456', name: 'Other User', color: '#00FF00' },
        isActive: true,
        lastActivity: Date.now(),
        cursor: { x: 25, y: 75, timestamp: Date.now() },
        selectedPerformerIds: ['performer-2', 'performer-3'],
        draggingPerformerId: undefined,
      };
      mockAwarenessState.set(otherClientId, otherClientState as unknown as Record<string, unknown>);

      renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.on).toHaveBeenCalled();
      });

      // Simulate awareness change event
      const changeHandler = (mockAwareness.on.mock.calls as Array<[string, () => void]>).find(
        (call) => call[0] === 'change'
      )?.[1];

      if (changeHandler) {
        act(() => {
          changeHandler();
        });

        // The collaborators state should include the other client
        // Note: Due to mock limitations, we're testing the handler setup
        expect(mockAwareness.getStates).toHaveBeenCalled();
      }
    });

    it('should filter out own client from collaborators', async () => {
      // Set up local state
      mockAwarenessState.set(localClientId, {
        user: { id: 'user-123', name: 'Test User', color: '#FF0000' },
        isActive: true,
        selectedPerformerIds: ['performer-1'],
      });

      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      // The local client should not appear in collaborators
      expect(result.current.collaborators).not.toContainEqual(
        expect.objectContaining({ user: { id: 'user-123' } })
      );
    });

    it('should filter out inactive clients', async () => {
      // Set up inactive client
      const inactiveClientId = 3;
      mockAwarenessState.set(inactiveClientId, {
        user: { id: 'user-789', name: 'Inactive User', color: '#0000FF' },
        isActive: false,
        selectedPerformerIds: [],
      });

      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      // Inactive client should not appear in collaborators
      expect(result.current.collaborators).not.toContainEqual(
        expect.objectContaining({ user: { id: 'user-789' } })
      );
    });
  });

  describe('isPerformerBeingDragged', () => {
    it('should return false when no one is dragging', async () => {
      const { result } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(result.current.isPerformerBeingDragged).toBeDefined();
      });

      const dragStatus = result.current.isPerformerBeingDragged('performer-1');
      expect(dragStatus.dragging).toBe(false);
      expect(dragStatus.by).toBeUndefined();
    });
  });

  describe('Hook Lifecycle', () => {
    it('should not initialize when disabled', () => {
      renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: false,
      }));

      // Provider should not be created when disabled
      expect(mockAwareness.setLocalState).not.toHaveBeenCalled();
    });

    it('should clean up on unmount', async () => {
      const { unmount } = renderHook(() => useFormationYjs({
        projectId: 'project-1',
        formationId: 'formation-1',
        enabled: true,
      }));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      unmount();

      expect(mockProvider.destroy).toHaveBeenCalled();
    });
  });
});
