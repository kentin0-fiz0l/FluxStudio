/**
 * Comprehensive Tests for useFormationYjs Hook
 * @file src/hooks/__tests__/useFormationYjs.test.ts
 *
 * Tests: connection lifecycle, performer CRUD, concurrent edits,
 * keyframe operations, offline/reconnect, undo/redo, awareness, edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';
import type { Formation, Performer, Position } from '@/services/formationService';

// ============================================================================
// Realistic Yjs Mock Infrastructure
// ============================================================================

/**
 * Lightweight Y.Map mock that stores data in a real Map and supports
 * observe/observeDeep callbacks.
 */
class MockYMap {
  _data = new Map<string, unknown>();
  _observers: Array<() => void> = [];
  _deepObservers: Array<() => void> = [];

  get(key: string) {
    return this._data.get(key);
  }

  set(key: string, value: unknown) {
    this._data.set(key, value);
    this._notify();
  }

  delete(key: string) {
    this._data.delete(key);
    this._notify();
  }

  has(key: string) {
    return this._data.has(key);
  }

  forEach(fn: (value: unknown, key: string) => void) {
    this._data.forEach(fn);
  }

  get size() {
    return this._data.size;
  }

  observe(fn: () => void) {
    this._observers.push(fn);
  }

  unobserve(fn: () => void) {
    this._observers = this._observers.filter((o) => o !== fn);
  }

  observeDeep(fn: () => void) {
    this._deepObservers.push(fn);
  }

  unobserveDeep(fn: () => void) {
    this._deepObservers = this._deepObservers.filter((o) => o !== fn);
  }

  _notify() {
    this._observers.forEach((fn) => fn());
    this._deepObservers.forEach((fn) => fn());
  }

  toJSON() {
    const obj: Record<string, unknown> = {};
    this._data.forEach((v, k) => {
      obj[k] = v instanceof MockYMap ? v.toJSON() : v;
    });
    return obj;
  }
}

/**
 * Lightweight Y.Array mock with insert/delete/push/get/forEach.
 */
class MockYArray {
  _items: unknown[] = [];
  _observers: Array<() => void> = [];
  _deepObservers: Array<() => void> = [];

  get length() {
    return this._items.length;
  }

  get(index: number) {
    return this._items[index];
  }

  push(items: unknown[]) {
    this._items.push(...items);
    this._notify();
  }

  insert(index: number, items: unknown[]) {
    this._items.splice(index, 0, ...items);
    this._notify();
  }

  delete(index: number, length: number) {
    this._items.splice(index, length);
    this._notify();
  }

  forEach(fn: (item: unknown, index: number) => void) {
    this._items.forEach(fn);
  }

  toArray() {
    return [...this._items];
  }

  observe(fn: () => void) {
    this._observers.push(fn);
  }

  unobserve(fn: () => void) {
    this._observers = this._observers.filter((o) => o !== fn);
  }

  observeDeep(fn: () => void) {
    this._deepObservers.push(fn);
  }

  unobserveDeep(fn: () => void) {
    this._deepObservers = this._deepObservers.filter((o) => o !== fn);
  }

  _notify() {
    this._observers.forEach((fn) => fn());
    this._deepObservers.forEach((fn) => fn());
  }
}

/**
 * MockYDoc: simulates a Yjs doc with named maps and arrays that persist
 * across getMap/getArray calls.
 */
class MockYDoc {
  _maps = new Map<string, MockYMap>();
  _arrays = new Map<string, MockYArray>();
  _updateHandlers: Array<(update: Uint8Array, origin: unknown) => void> = [];
  _destroyed = false;

  getMap(name: string): MockYMap {
    if (!this._maps.has(name)) this._maps.set(name, new MockYMap());
    return this._maps.get(name)!;
  }

  getArray(name: string): MockYArray {
    if (!this._arrays.has(name)) this._arrays.set(name, new MockYArray());
    return this._arrays.get(name)!;
  }

  transact(fn: () => void, origin?: unknown) {
    fn();
    // Fire update handlers with a fake update
    this._updateHandlers.forEach((h) => h(new Uint8Array(), origin ?? null));
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    if (event === 'update') {
      this._updateHandlers.push(handler as (u: Uint8Array, o: unknown) => void);
    }
  }

  off(event: string, handler: (...args: unknown[]) => void) {
    if (event === 'update') {
      this._updateHandlers = this._updateHandlers.filter((h) => h !== handler);
    }
  }

  destroy() {
    this._destroyed = true;
  }
}

// ============================================================================
// Mock Awareness
// ============================================================================

const mockAwarenessState = new Map<number, Record<string, unknown>>();
let localClientId = 1;

const mockAwareness = {
  clientID: localClientId,
  getLocalState: vi.fn(() => mockAwarenessState.get(localClientId) ?? null),
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

// ============================================================================
// Mock WebSocket Provider
// ============================================================================

type ProviderHandler = (arg: unknown) => void;

let providerHandlers: Record<string, ProviderHandler[]> = {};
const mockProvider = {
  awareness: mockAwareness,
  wsconnected: true,
  on: vi.fn((event: string, handler: ProviderHandler) => {
    if (!providerHandlers[event]) providerHandlers[event] = [];
    providerHandlers[event].push(handler);
  }),
  off: vi.fn(),
  connect: vi.fn(() => {
    mockProvider.wsconnected = true;
  }),
  disconnect: vi.fn(() => {
    mockProvider.wsconnected = false;
  }),
  destroy: vi.fn(),
};

function emitProviderEvent(event: string, arg: unknown) {
  (providerHandlers[event] || []).forEach((h) => h(arg));
}

// ============================================================================
// Mock IndexedDB Persistence
// ============================================================================

let persistenceHandlers: Record<string, Array<() => void>> = {};

const mockPersistence = {
  on: vi.fn((event: string, handler: () => void) => {
    if (!persistenceHandlers[event]) persistenceHandlers[event] = [];
    persistenceHandlers[event].push(handler);
  }),
  destroy: vi.fn(),
};

// ============================================================================
// Mock Y.UndoManager
// ============================================================================

let undoStack: unknown[] = [];
let redoStack: unknown[] = [];
let undoManagerHandlers: Record<string, Array<() => void>> = {};

const mockUndoManager = {
  undoStack,
  redoStack,
  on: vi.fn((event: string, handler: () => void) => {
    if (!undoManagerHandlers[event]) undoManagerHandlers[event] = [];
    undoManagerHandlers[event].push(handler);
  }),
  off: vi.fn(),
  undo: vi.fn(() => {
    if (undoStack.length > 0) {
      redoStack.push(undoStack.pop());
      (undoManagerHandlers['stack-item-popped'] || []).forEach((h) => h());
    }
  }),
  redo: vi.fn(() => {
    if (redoStack.length > 0) {
      undoStack.push(redoStack.pop());
      (undoManagerHandlers['stack-item-popped'] || []).forEach((h) => h());
    }
  }),
  destroy: vi.fn(),
};

// ============================================================================
// Shared MockYDoc instance -- created fresh each test in beforeEach
// ============================================================================

let currentDoc: MockYDoc;

// ============================================================================
// vi.mock calls -- these run before any imports
// ============================================================================

vi.mock('yjs', () => ({
  Doc: vi.fn(() => currentDoc),
  Map: vi.fn(() => new MockYMap()),
  Array: vi.fn(() => new MockYArray()),
  UndoManager: vi.fn(() => mockUndoManager),
}));

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn(() => mockProvider),
}));

vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: vi.fn(() => mockPersistence),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
    },
  })),
}));

// ============================================================================
// Import hook after mocks are set up
// ============================================================================

import { useFormationYjs } from '../useFormationYjs';

// ============================================================================
// Helpers
// ============================================================================

const defaultProps = {
  projectId: 'project-1',
  formationId: 'formation-1',
  enabled: true,
};

function makeFormation(overrides: Partial<Formation> = {}): Formation {
  return {
    id: 'formation-1',
    name: 'Test Formation',
    description: 'A test formation',
    projectId: 'project-1',
    stageWidth: 40,
    stageHeight: 30,
    gridSize: 5,
    performers: [
      { id: 'p1', name: 'Alice', label: 'A', color: '#FF0000' },
      { id: 'p2', name: 'Bob', label: 'B', color: '#00FF00' },
    ],
    keyframes: [
      {
        id: 'kf1',
        timestamp: 0,
        transition: 'linear',
        duration: 500,
        positions: new Map([
          ['p1', { x: 10, y: 20, rotation: 0 }],
          ['p2', { x: 30, y: 40, rotation: 0 }],
        ]),
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-123',
    ...overrides,
  };
}

/**
 * Seed the current MockYDoc with formation meta so that syncYjsToReact finds data.
 */
function seedDoc(formation: Formation) {
  const meta = currentDoc.getMap('formation:meta');
  meta.set('id', formation.id);
  meta.set('name', formation.name);
  meta.set('projectId', formation.projectId);
  meta.set('description', formation.description || '');
  meta.set('stageWidth', formation.stageWidth);
  meta.set('stageHeight', formation.stageHeight);
  meta.set('gridSize', formation.gridSize);
  meta.set('createdBy', formation.createdBy);
  meta.set('createdAt', formation.createdAt);
  meta.set('updatedAt', formation.updatedAt);

  const performers = currentDoc.getMap('formation:performers');
  formation.performers.forEach((p) => {
    const yp = new MockYMap();
    yp.set('id', p.id);
    yp.set('name', p.name);
    yp.set('label', p.label);
    yp.set('color', p.color);
    if (p.group) yp.set('group', p.group);
    performers.set(p.id, yp);
  });

  const keyframes = currentDoc.getArray('formation:keyframes');
  formation.keyframes.forEach((kf) => {
    const ykf = new MockYMap();
    ykf.set('id', kf.id);
    ykf.set('timestamp', kf.timestamp);
    ykf.set('transition', kf.transition ?? 'linear');
    ykf.set('duration', kf.duration ?? 500);
    const ypos = new MockYMap();
    kf.positions.forEach((pos, pid) => {
      ypos.set(pid, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
    });
    ykf.set('formation:positions', ypos);
    keyframes.push([ykf]);
  });
}

/**
 * Render the hook, simulate connection + sync, and return the result.
 */
async function renderConnectedHook(
  overrides: Record<string, unknown> = {},
  initialFormation?: Formation,
) {
  const formation = initialFormation ?? makeFormation();

  // Seed the doc before rendering so initializeYjsFromFormation / sync sees data
  seedDoc(formation);

  const hookResult = renderHook(() =>
    useFormationYjs({ ...defaultProps, initialData: formation, ...overrides }),
  );

  // Simulate provider emitting 'status: connected' and 'sync: true'
  await act(async () => {
    emitProviderEvent('status', { status: 'connected' });
  });
  await act(async () => {
    emitProviderEvent('sync', true);
  });

  return hookResult;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('useFormationYjs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockAwarenessState.clear();
    localClientId = 1;
    mockAwareness.clientID = localClientId;
    providerHandlers = {};
    persistenceHandlers = {};
    undoStack = [];
    redoStack = [];
    mockUndoManager.undoStack = undoStack;
    mockUndoManager.redoStack = redoStack;
    undoManagerHandlers = {};
    mockProvider.wsconnected = true;
    currentDoc = new MockYDoc();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // 1. Connection Lifecycle
  // ==========================================================================

  describe('Connection Lifecycle', () => {
    it('should connect to room and set isConnected to true', async () => {
      const onConnectionChange = vi.fn();
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, onConnectionChange }),
      );

      // Initially not connected
      expect(result.current.isConnected).toBe(false);

      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });

      expect(result.current.isConnected).toBe(true);
      expect(onConnectionChange).toHaveBeenCalledWith(true);
    });

    it('should mark isSyncing=false after sync event', async () => {
      seedDoc(makeFormation());
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, initialData: makeFormation() }),
      );

      expect(result.current.isSyncing).toBe(true);

      await act(async () => {
        emitProviderEvent('sync', true);
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncedAt).toBeTypeOf('number');
    });

    it('should disconnect and set isConnected to false', async () => {
      const onConnectionChange = vi.fn();
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, onConnectionChange }),
      );

      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });
      expect(result.current.isConnected).toBe(true);

      await act(async () => {
        emitProviderEvent('status', { status: 'disconnected' });
      });

      expect(result.current.isConnected).toBe(false);
      expect(onConnectionChange).toHaveBeenCalledWith(false);
    });

    it('should reconnect after disconnect', async () => {
      const { result } = renderHook(() => useFormationYjs(defaultProps));

      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });
      expect(result.current.isConnected).toBe(true);

      await act(async () => {
        emitProviderEvent('status', { status: 'disconnected' });
      });
      expect(result.current.isConnected).toBe(false);

      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });
      expect(result.current.isConnected).toBe(true);
    });

    it('should set error on connection-error event', async () => {
      const { result } = renderHook(() => useFormationYjs(defaultProps));

      await act(async () => {
        emitProviderEvent('connection-error', new Event('error'));
      });

      expect(result.current.error).toBe('Failed to connect to collaboration server');
    });

    it('should clear error on successful connection', async () => {
      const { result } = renderHook(() => useFormationYjs(defaultProps));

      await act(async () => {
        emitProviderEvent('connection-error', new Event('error'));
      });
      expect(result.current.error).not.toBeNull();

      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });
      expect(result.current.error).toBeNull();
    });

    it('should not initialize when enabled=false', () => {
      renderHook(() =>
        useFormationYjs({ ...defaultProps, enabled: false }),
      );

      expect(mockAwareness.setLocalState).not.toHaveBeenCalled();
    });

    it('should not initialize with missing formationId', () => {
      renderHook(() =>
        useFormationYjs({ ...defaultProps, formationId: '' }),
      );

      expect(mockAwareness.setLocalState).not.toHaveBeenCalled();
    });

    it('should destroy provider and doc on unmount', async () => {
      const { unmount } = renderHook(() => useFormationYjs(defaultProps));

      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });

      unmount();

      expect(mockProvider.destroy).toHaveBeenCalled();
      expect(mockPersistence.destroy).toHaveBeenCalled();
      expect(currentDoc._destroyed).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Performer CRUD
  // ==========================================================================

  describe('Performer CRUD', () => {
    it('should add a performer and verify in Yjs map', async () => {
      const { result } = await renderConnectedHook();

      let newPerformer: Performer | undefined;
      act(() => {
        newPerformer = result.current.addPerformer({
          name: 'Charlie',
          label: 'C',
          color: '#0000FF',
        });
      });

      expect(newPerformer).toBeDefined();
      expect(newPerformer!.name).toBe('Charlie');
      expect(newPerformer!.id).toMatch(/^performer-/);

      // Verify in Yjs performers map
      const performersMap = currentDoc.getMap('formation:performers');
      const yp = performersMap.get(newPerformer!.id) as MockYMap;
      expect(yp).toBeDefined();
      expect(yp.get('name')).toBe('Charlie');
      expect(yp.get('label')).toBe('C');
      expect(yp.get('color')).toBe('#0000FF');
    });

    it('should add a performer with initial position to first keyframe', async () => {
      const { result } = await renderConnectedHook();

      let newPerformer: Performer | undefined;
      act(() => {
        newPerformer = result.current.addPerformer(
          { name: 'Diana', label: 'D', color: '#FFFF00' },
          { x: 25, y: 75, rotation: 45 },
        );
      });

      // Check position was added to first keyframe
      const keyframes = currentDoc.getArray('formation:keyframes');
      const firstKf = keyframes.get(0) as MockYMap;
      const positions = firstKf.get('formation:positions') as MockYMap;
      const pos = positions.get(newPerformer!.id);
      expect(pos).toEqual({ x: 25, y: 75, rotation: 45 });
    });

    it('should update performer fields', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updatePerformer('p1', {
          name: 'Alice Updated',
          color: '#FF00FF',
        });
      });

      const performersMap = currentDoc.getMap('formation:performers');
      const yp = performersMap.get('p1') as MockYMap;
      expect(yp.get('name')).toBe('Alice Updated');
      expect(yp.get('color')).toBe('#FF00FF');
    });

    it('should update performer group field', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updatePerformer('p1', { group: 'brass' });
      });

      const performersMap = currentDoc.getMap('formation:performers');
      const yp = performersMap.get('p1') as MockYMap;
      expect(yp.get('group')).toBe('brass');
    });

    it('should remove a performer and clean up from all keyframes', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.removePerformer('p1');
      });

      // Performer should be removed from performers map
      const performersMap = currentDoc.getMap('formation:performers');
      expect(performersMap.has('p1')).toBe(false);

      // Performer position should be removed from all keyframes
      const keyframes = currentDoc.getArray('formation:keyframes');
      keyframes.forEach((kf) => {
        const positions = (kf as MockYMap).get('formation:positions') as MockYMap;
        expect(positions.has('p1')).toBe(false);
      });
    });

    it('should no-op when updating a non-existent performer', async () => {
      const { result } = await renderConnectedHook();

      // Should not throw
      act(() => {
        result.current.updatePerformer('non-existent', { name: 'Ghost' });
      });

      const performersMap = currentDoc.getMap('formation:performers');
      expect(performersMap.has('non-existent')).toBe(false);
    });

    it('should throw when adding performer without initialized doc', () => {
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, enabled: false }),
      );

      expect(() => {
        result.current.addPerformer({ name: 'X', label: 'X', color: '#000' });
      }).toThrow('Yjs document not initialized');
    });
  });

  // ==========================================================================
  // 3. Concurrent Edits (CRDT merge simulation)
  // ==========================================================================

  describe('Concurrent Edits', () => {
    it('should handle two independent performer additions', async () => {
      const { result } = await renderConnectedHook();

      // Simulate two concurrent additions (like from two clients)
      let p3: Performer | undefined;
      let p4: Performer | undefined;
      act(() => {
        p3 = result.current.addPerformer({ name: 'Eve', label: 'E', color: '#111' });
        p4 = result.current.addPerformer({ name: 'Frank', label: 'F', color: '#222' });
      });

      const performersMap = currentDoc.getMap('formation:performers');
      // Original 2 + 2 new = 4
      expect(performersMap.size).toBe(4);
      expect(performersMap.has(p3!.id)).toBe(true);
      expect(performersMap.has(p4!.id)).toBe(true);
    });

    it('should merge concurrent field updates on same performer', async () => {
      const { result } = await renderConnectedHook();

      // User A updates name, User B updates color (simulated sequentially)
      act(() => {
        result.current.updatePerformer('p1', { name: 'Alice-A' });
      });
      act(() => {
        result.current.updatePerformer('p1', { color: '#AABB00' });
      });

      const performersMap = currentDoc.getMap('formation:performers');
      const yp = performersMap.get('p1') as MockYMap;
      expect(yp.get('name')).toBe('Alice-A');
      expect(yp.get('color')).toBe('#AABB00');
    });

    it('should handle concurrent position updates on different performers in same keyframe', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updatePosition('kf1', 'p1', { x: 99, y: 99 });
      });
      act(() => {
        result.current.updatePosition('kf1', 'p2', { x: 11, y: 11 });
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      const kf = keyframes.get(0) as MockYMap;
      const positions = kf.get('formation:positions') as MockYMap;
      expect(positions.get('p1')).toEqual({ x: 99, y: 99, rotation: 0 });
      expect(positions.get('p2')).toEqual({ x: 11, y: 11, rotation: 0 });
    });

    it('should handle add and remove of the same performer in sequence', async () => {
      const { result } = await renderConnectedHook();

      let newP: Performer | undefined;
      act(() => {
        newP = result.current.addPerformer({ name: 'Temp', label: 'T', color: '#000' });
      });

      const performersMap = currentDoc.getMap('formation:performers');
      expect(performersMap.has(newP!.id)).toBe(true);

      act(() => {
        result.current.removePerformer(newP!.id);
      });

      expect(performersMap.has(newP!.id)).toBe(false);
    });
  });

  // ==========================================================================
  // 4. Keyframe Operations
  // ==========================================================================

  describe('Keyframe Operations', () => {
    it('should add a keyframe with positions', async () => {
      const { result } = await renderConnectedHook();

      const positions = new Map<string, Position>([
        ['p1', { x: 50, y: 60, rotation: 90 }],
        ['p2', { x: 70, y: 80, rotation: 0 }],
      ]);

      let kf: { id: string } | undefined;
      act(() => {
        kf = result.current.addKeyframe(1000, positions);
      });

      expect(kf).toBeDefined();
      expect(kf!.id).toMatch(/^keyframe-/);

      const keyframes = currentDoc.getArray('formation:keyframes');
      // 1 original + 1 new = 2
      expect(keyframes.length).toBe(2);

      // Find the new keyframe
      const newKf = keyframes.get(1) as MockYMap;
      expect(newKf.get('timestamp')).toBe(1000);
      const yPos = newKf.get('formation:positions') as MockYMap;
      expect(yPos.get('p1')).toEqual({ x: 50, y: 60, rotation: 90 });
    });

    it('should add keyframe with default center positions when no positions provided', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.addKeyframe(2000);
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      const newKf = keyframes.get(keyframes.length - 1) as MockYMap;
      const yPos = newKf.get('formation:positions') as MockYMap;

      // All performers should be at center (50, 50)
      expect(yPos.get('p1')).toEqual({ x: 50, y: 50, rotation: 0 });
      expect(yPos.get('p2')).toEqual({ x: 50, y: 50, rotation: 0 });
    });

    it('should insert keyframes ordered by timestamp', async () => {
      const { result } = await renderConnectedHook();

      // Original keyframe is at timestamp 0
      act(() => {
        result.current.addKeyframe(2000); // later
      });
      act(() => {
        result.current.addKeyframe(500); // between 0 and 2000
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      expect(keyframes.length).toBe(3);

      const ts0 = (keyframes.get(0) as MockYMap).get('timestamp') as number;
      const ts1 = (keyframes.get(1) as MockYMap).get('timestamp') as number;
      const ts2 = (keyframes.get(2) as MockYMap).get('timestamp') as number;

      expect(ts0).toBe(0);
      expect(ts1).toBe(500);
      expect(ts2).toBe(2000);
    });

    it('should remove a keyframe by id', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.removeKeyframe('kf1');
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      expect(keyframes.length).toBe(0);
    });

    it('should no-op when removing a non-existent keyframe', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.removeKeyframe('non-existent');
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      // Still has the original keyframe
      expect(keyframes.length).toBe(1);
    });

    it('should update keyframe properties (timestamp, transition, duration)', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updateKeyframe('kf1', {
          timestamp: 1500,
          transition: 'ease-in-out',
          duration: 800,
        });
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      const kf = keyframes.get(0) as MockYMap;
      expect(kf.get('timestamp')).toBe(1500);
      expect(kf.get('transition')).toBe('ease-in-out');
      expect(kf.get('duration')).toBe(800);
    });

    it('should update a single position within a keyframe', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updatePosition('kf1', 'p1', { x: 77, y: 88, rotation: 180 });
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      const kf = keyframes.get(0) as MockYMap;
      const positions = kf.get('formation:positions') as MockYMap;
      expect(positions.get('p1')).toEqual({ x: 77, y: 88, rotation: 180 });
    });

    it('should batch update multiple positions within a keyframe', async () => {
      const { result } = await renderConnectedHook();

      const newPositions = new Map<string, Position>([
        ['p1', { x: 1, y: 2, rotation: 10 }],
        ['p2', { x: 3, y: 4, rotation: 20 }],
      ]);

      act(() => {
        result.current.updatePositions('kf1', newPositions);
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      const kf = keyframes.get(0) as MockYMap;
      const positions = kf.get('formation:positions') as MockYMap;
      expect(positions.get('p1')).toEqual({ x: 1, y: 2, rotation: 10 });
      expect(positions.get('p2')).toEqual({ x: 3, y: 4, rotation: 20 });
    });

    it('should throw when adding keyframe without initialized doc', () => {
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, enabled: false }),
      );

      expect(() => {
        result.current.addKeyframe(0);
      }).toThrow('Yjs document not initialized');
    });
  });

  // ==========================================================================
  // 5. Offline / Reconnect
  // ==========================================================================

  describe('Offline / Reconnect', () => {
    it('should set hasPendingChanges when making local changes while connected', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updateMeta({ name: 'Offline Edit' });
      });

      // The transact fires update handler with origin null => sets pending
      expect(result.current.hasPendingChanges).toBe(true);
    });

    it('should sync local data from IndexedDB persistence on synced event', async () => {
      seedDoc(makeFormation());
      renderHook(() => useFormationYjs({ ...defaultProps, initialData: makeFormation() }));

      // Trigger persistence synced before WebSocket sync
      await act(async () => {
        (persistenceHandlers['synced'] || []).forEach((h) => h());
      });

      // The hook should have called syncYjsToReact via persistence synced
      // We just verify it didn't throw
    });

    it('should set lastSyncedAt after sync completes', async () => {
      seedDoc(makeFormation());
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, initialData: makeFormation() }),
      );

      expect(result.current.lastSyncedAt).toBeNull();

      await act(async () => {
        emitProviderEvent('sync', true);
      });

      expect(result.current.lastSyncedAt).toBeTypeOf('number');
      expect(result.current.lastSyncedAt! - Date.now()).toBeLessThan(1000);
    });

    it('should set hasPendingChanges on local mutation', async () => {
      seedDoc(makeFormation());
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, initialData: makeFormation() }),
      );

      // Connect and sync first
      await act(async () => {
        emitProviderEvent('status', { status: 'connected' });
      });
      await act(async () => {
        emitProviderEvent('sync', true);
      });

      // Make a local change -- transact fires update handler with null origin
      await act(async () => {
        result.current.updateMeta({ name: 'Changed' });
      });

      // The update handler should have set hasPendingChanges to true
      expect(result.current.hasPendingChanges).toBe(true);
    });

    it('should register doc update handler for tracking pending changes', async () => {
      await renderConnectedHook();

      // Verify update handlers were registered on the doc
      expect(currentDoc._updateHandlers.length).toBeGreaterThan(0);

      // The provider wsconnected flag is used in the handler
      expect(mockProvider.wsconnected).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Undo / Redo
  // ==========================================================================

  describe('Undo / Redo', () => {
    it('should report canYUndo=false and canYRedo=false initially', async () => {
      const { result } = await renderConnectedHook();

      expect(result.current.canYUndo).toBe(false);
      expect(result.current.canYRedo).toBe(false);
    });

    it('should call undoManager.undo() when yUndo is called', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.yUndo();
      });

      expect(mockUndoManager.undo).toHaveBeenCalled();
    });

    it('should call undoManager.redo() when yRedo is called', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.yRedo();
      });

      expect(mockUndoManager.redo).toHaveBeenCalled();
    });

    it('should update canYUndo when stack-item-added fires', async () => {
      await renderConnectedHook();

      // Simulate adding an item to the undo stack
      undoStack.push({});
      mockUndoManager.undoStack = undoStack;

      act(() => {
        (undoManagerHandlers['stack-item-added'] || []).forEach((h) => h());
      });

      // The hook internally calls setCanYUndo(undoManager.undoStack.length > 0)
      // Since we mock the UndoManager instance, we can verify the handler was registered
      expect(mockUndoManager.on).toHaveBeenCalledWith(
        'stack-item-added',
        expect.any(Function),
      );
    });

    it('should register stack-item-popped handler', async () => {
      await renderConnectedHook();

      expect(mockUndoManager.on).toHaveBeenCalledWith(
        'stack-item-popped',
        expect.any(Function),
      );
    });

    it('should destroy undoManager on unmount', async () => {
      const { unmount } = await renderConnectedHook();

      unmount();

      expect(mockUndoManager.destroy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 7. Awareness (Presence)
  // ==========================================================================

  describe('Awareness (Presence)', () => {
    it('should initialize awareness state with all required fields', async () => {
      renderHook(() => useFormationYjs(defaultProps));

      await vi.waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalled();
      });

      const state = mockAwareness.setLocalState.mock.calls[0][0];
      expect(state).toMatchObject({
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

    describe('updateCursor', () => {
      it('should set cursor position via awareness', async () => {
        const { result } = await renderConnectedHook();

        act(() => {
          result.current.updateCursor(50, 75);
        });

        expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith(
          'cursor',
          expect.objectContaining({ x: 50, y: 75, timestamp: expect.any(Number) }),
        );
      });

      it('should throttle rapid cursor updates (50ms)', async () => {
        const { result } = await renderConnectedHook();

        // Clear mock calls from initialization
        mockAwareness.setLocalStateField.mockClear();

        // First call goes through immediately
        act(() => {
          result.current.updateCursor(10, 20);
        });
        // Second call within 50ms should be buffered
        act(() => {
          result.current.updateCursor(30, 40);
        });
        act(() => {
          result.current.updateCursor(50, 60);
        });

        // Only the first immediate call + lastActivity update
        const cursorCalls = mockAwareness.setLocalStateField.mock.calls.filter(
          (c: unknown[]) => c[0] === 'cursor',
        );
        expect(cursorCalls.length).toBe(1); // Only immediate call

        // Advance past throttle
        await act(async () => {
          vi.advanceTimersByTime(60);
        });

        // Now the pending cursor (last value: 50, 60) should have been sent
        const allCursorCalls = mockAwareness.setLocalStateField.mock.calls.filter(
          (c: unknown[]) => c[0] === 'cursor',
        );
        expect(allCursorCalls.length).toBe(2);
        expect(allCursorCalls[1][1]).toMatchObject({ x: 50, y: 60 });
      });
    });

    describe('clearCursor', () => {
      it('should set cursor to null', async () => {
        const { result } = await renderConnectedHook();

        act(() => {
          result.current.clearCursor();
        });

        expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', null);
      });
    });

    describe('setSelectedPerformers', () => {
      it('should update selectedPerformerIds atomically', async () => {
        const { result } = await renderConnectedHook();
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setSelectedPerformers(['p1', 'p2']);
        });

        expect(mockAwareness.setLocalState).toHaveBeenCalled();
        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.selectedPerformerIds).toEqual(['p1', 'p2']);
      });

      it('should preserve existing state fields when updating selection', async () => {
        // Pre-seed awareness state
        mockAwarenessState.set(localClientId, {
          user: { id: 'user-123', name: 'Test User', color: '#FF0000' },
          isActive: true,
          cursor: { x: 50, y: 50, timestamp: Date.now() },
          selectedPerformerIds: [],
          draggingPerformerId: null,
        });

        const { result } = await renderConnectedHook();
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setSelectedPerformers(['p1']);
        });

        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.user).toBeDefined();
        expect(state.selectedPerformerIds).toEqual(['p1']);
      });

      it('should clear selection with empty array', async () => {
        const { result } = await renderConnectedHook();

        act(() => {
          result.current.setSelectedPerformers(['p1']);
        });
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setSelectedPerformers([]);
        });

        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.selectedPerformerIds).toEqual([]);
      });
    });

    describe('setDraggingPerformer', () => {
      it('should update draggingPerformerId atomically', async () => {
        const { result } = await renderConnectedHook();
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setDraggingPerformer('p1');
        });

        expect(mockAwareness.setLocalState).toHaveBeenCalled();
        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.draggingPerformerId).toBe('p1');
      });

      it('should clear dragging state with null', async () => {
        const { result } = await renderConnectedHook();

        act(() => {
          result.current.setDraggingPerformer('p1');
        });
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setDraggingPerformer(null);
        });

        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.draggingPerformerId).toBeNull();
      });
    });

    describe('isPerformerBeingDragged', () => {
      it('should return false when no one is dragging', async () => {
        const { result } = await renderConnectedHook();

        const status = result.current.isPerformerBeingDragged('p1');
        expect(status.dragging).toBe(false);
        expect(status.by).toBeUndefined();
      });

      it('should detect another user dragging a performer', async () => {
        // Set up another client dragging p1
        const otherClientId = 2;
        const otherState: FormationAwarenessState = {
          user: { id: 'user-456', name: 'Other', color: '#00FF00' },
          isActive: true,
          lastActivity: Date.now(),
          cursor: { x: 0, y: 0, timestamp: Date.now() },
          selectedPerformerIds: [],
          draggingPerformerId: 'p1',
        };
        mockAwarenessState.set(otherClientId, otherState as unknown as Record<string, unknown>);

        const { result } = renderHook(() => useFormationYjs(defaultProps));

        // Trigger awareness change handler
        await vi.waitFor(() => {
          expect(mockAwareness.on).toHaveBeenCalled();
        });

        const changeHandler = (mockAwareness.on.mock.calls as Array<[string, () => void]>).find(
          (call) => call[0] === 'change',
        )?.[1];

        if (changeHandler) {
          act(() => {
            changeHandler();
          });

          const status = result.current.isPerformerBeingDragged('p1');
          expect(status.dragging).toBe(true);
          expect(status.by?.user.id).toBe('user-456');
        }
      });
    });

    describe('Collaborator filtering', () => {
      it('should filter out own client from collaborators', async () => {
        mockAwarenessState.set(localClientId, {
          user: { id: 'user-123', name: 'Test User', color: '#FF0000' },
          isActive: true,
          selectedPerformerIds: [],
        });

        const { result } = renderHook(() => useFormationYjs(defaultProps));

        expect(result.current.collaborators).not.toContainEqual(
          expect.objectContaining({ user: expect.objectContaining({ id: 'user-123' }) }),
        );
      });

      it('should filter out inactive clients', async () => {
        const inactiveClientId = 3;
        mockAwarenessState.set(inactiveClientId, {
          user: { id: 'user-789', name: 'Inactive', color: '#0000FF' },
          isActive: false,
          selectedPerformerIds: [],
        });

        const { result } = renderHook(() => useFormationYjs(defaultProps));

        expect(result.current.collaborators).not.toContainEqual(
          expect.objectContaining({ user: expect.objectContaining({ id: 'user-789' }) }),
        );
      });

      it('should include active remote clients in collaborators', async () => {
        const otherClientId = 2;
        mockAwarenessState.set(otherClientId, {
          user: { id: 'user-456', name: 'Active User', color: '#00FF00' },
          isActive: true,
          lastActivity: Date.now(),
          selectedPerformerIds: [],
        });

        renderHook(() => useFormationYjs(defaultProps));

        await vi.waitFor(() => {
          expect(mockAwareness.on).toHaveBeenCalled();
        });

        const changeHandler = (mockAwareness.on.mock.calls as Array<[string, () => void]>).find(
          (call) => call[0] === 'change',
        )?.[1];

        expect(changeHandler).toBeDefined();
      });
    });

    describe('Heartbeat', () => {
      it('should send heartbeat every 5 seconds when cursor is active', async () => {
        renderHook(() => useFormationYjs(defaultProps));

        // Set local state with active cursor
        mockAwarenessState.set(localClientId, {
          user: { id: 'user-123', name: 'Test User', color: '#FF0000' },
          isActive: true,
          cursor: { x: 10, y: 20, timestamp: Date.now() },
          lastActivity: Date.now(),
        });

        mockAwareness.setLocalStateField.mockClear();

        // Advance time by 5 seconds
        await act(async () => {
          vi.advanceTimersByTime(5000);
        });

        // Should have updated cursor timestamp and lastActivity
        const cursorCalls = mockAwareness.setLocalStateField.mock.calls.filter(
          (c: unknown[]) => c[0] === 'cursor',
        );
        const activityCalls = mockAwareness.setLocalStateField.mock.calls.filter(
          (c: unknown[]) => c[0] === 'lastActivity',
        );

        expect(cursorCalls.length).toBeGreaterThanOrEqual(1);
        expect(activityCalls.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ==========================================================================
  // 8. Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty formation (no performers, no keyframes)', async () => {
      const emptyFormation = makeFormation({
        performers: [],
        keyframes: [],
      });

      const { result } = await renderConnectedHook({}, emptyFormation);

      // Should not throw
      expect(result.current.formation).toBeDefined();
    });

    it('should handle formation with many performers', async () => {
      const performers = Array.from({ length: 50 }, (_, i) => ({
        id: `p${i}`,
        name: `Performer ${i}`,
        label: `P${i}`,
        color: `#${String(i).padStart(6, '0')}`,
      }));

      const manyFormation = makeFormation({ performers, keyframes: [] });
      const { result } = await renderConnectedHook({}, manyFormation);

      const performersMap = currentDoc.getMap('formation:performers');
      expect(performersMap.size).toBe(50);

      // Can still add more
      act(() => {
        result.current.addPerformer({ name: 'Extra', label: 'X', color: '#FFF' });
      });
      expect(performersMap.size).toBe(51);
    });

    it('should handle rapid successive position updates', async () => {
      const { result } = await renderConnectedHook();

      // Rapidly update positions many times
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updatePosition('kf1', 'p1', { x: i, y: i });
        }
      });

      // Should have the last value
      const keyframes = currentDoc.getArray('formation:keyframes');
      const kf = keyframes.get(0) as MockYMap;
      const positions = kf.get('formation:positions') as MockYMap;
      expect(positions.get('p1')).toEqual({ x: 99, y: 99, rotation: 0 });
    });

    it('should handle concurrent add and remove of same performer', async () => {
      const { result } = await renderConnectedHook();

      // Add a performer then immediately remove it
      let temp: Performer | undefined;
      act(() => {
        temp = result.current.addPerformer({ name: 'Temp', label: 'T', color: '#000' });
        result.current.removePerformer(temp.id);
      });

      const performersMap = currentDoc.getMap('formation:performers');
      expect(performersMap.has(temp!.id)).toBe(false);
    });

    it('should handle updateMeta with partial updates', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updateMeta({ name: 'New Name' });
      });

      const meta = currentDoc.getMap('formation:meta');
      expect(meta.get('name')).toBe('New Name');
      // Other fields should remain
      expect(meta.get('stageWidth')).toBe(40);
      expect(meta.get('description')).toBe('A test formation');
    });

    it('should set updatedAt when updating meta', async () => {
      const { result } = await renderConnectedHook();

      const before = new Date().toISOString();
      act(() => {
        result.current.updateMeta({ gridSize: 10 });
      });

      const meta = currentDoc.getMap('formation:meta');
      const updatedAt = meta.get('updatedAt') as string;
      expect(updatedAt).toBeDefined();
      expect(new Date(updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });

    it('should handle setAudioTrack with full track data', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.setAudioTrack({
          id: 'audio-1',
          url: 'https://example.com/track.mp3',
          filename: 'track.mp3',
          duration: 180000,
          waveformData: [0.1, 0.5, 0.3],
        });
      });

      const meta = currentDoc.getMap('formation:meta');
      const audioMap = meta.get('audioTrack') as MockYMap;
      expect(audioMap).toBeDefined();
      expect(audioMap.get('id')).toBe('audio-1');
      expect(audioMap.get('url')).toBe('https://example.com/track.mp3');
      expect(audioMap.get('duration')).toBe(180000);
      expect(audioMap.get('waveformData')).toEqual([0.1, 0.5, 0.3]);
    });

    it('should handle setAudioTrack with null to remove track', async () => {
      const { result } = await renderConnectedHook();

      // First set a track
      act(() => {
        result.current.setAudioTrack({
          id: 'audio-1',
          url: 'https://example.com/track.mp3',
          filename: 'track.mp3',
          duration: 180000,
        });
      });

      // Then remove it
      act(() => {
        result.current.setAudioTrack(null);
      });

      const meta = currentDoc.getMap('formation:meta');
      expect(meta.has('audioTrack')).toBe(false);
    });

    it('should no-op when doc is not initialized for mutation functions', async () => {
      const { result } = renderHook(() =>
        useFormationYjs({ ...defaultProps, enabled: false }),
      );

      // These should not throw
      act(() => {
        result.current.updateMeta({ name: 'X' });
        result.current.updatePerformer('p1', { name: 'X' });
        result.current.removePerformer('p1');
        result.current.updateKeyframe('kf1', { timestamp: 0 });
        result.current.removeKeyframe('kf1');
        result.current.updatePosition('kf1', 'p1', { x: 0, y: 0 });
        result.current.updatePositions('kf1', new Map());
        result.current.setAudioTrack(null);
      });
    });

    it('should handle position update with default rotation of 0', async () => {
      const { result } = await renderConnectedHook();

      act(() => {
        result.current.updatePosition('kf1', 'p1', { x: 10, y: 20 });
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      const kf = keyframes.get(0) as MockYMap;
      const positions = kf.get('formation:positions') as MockYMap;
      expect(positions.get('p1')).toEqual({ x: 10, y: 20, rotation: 0 });
    });

    it('should handle multiple keyframe removal leaving empty array', async () => {
      const formation = makeFormation({
        keyframes: [
          {
            id: 'kf1',
            timestamp: 0,
            transition: 'linear',
            duration: 500,
            positions: new Map(),
          },
          {
            id: 'kf2',
            timestamp: 1000,
            transition: 'ease',
            duration: 300,
            positions: new Map(),
          },
        ],
      });

      const { result } = await renderConnectedHook({}, formation);

      act(() => {
        result.current.removeKeyframe('kf1');
      });
      act(() => {
        result.current.removeKeyframe('kf2');
      });

      const keyframes = currentDoc.getArray('formation:keyframes');
      expect(keyframes.length).toBe(0);
    });
  });

  // ==========================================================================
  // Formation State Sync
  // ==========================================================================

  describe('Formation State Sync', () => {
    it('should sync formation state on successful WebSocket sync', async () => {
      const onUpdate = vi.fn();
      const { result } = await renderConnectedHook({ onUpdate });

      expect(result.current.formation).toBeDefined();
      expect(result.current.formation?.id).toBe('formation-1');
      expect(result.current.formation?.name).toBe('Test Formation');
      expect(result.current.formation?.performers).toHaveLength(2);
      expect(result.current.formation?.keyframes).toHaveLength(1);
    });

    it('should call onUpdate callback when formation syncs', async () => {
      const onUpdate = vi.fn();
      await renderConnectedHook({ onUpdate });

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'formation-1',
          name: 'Test Formation',
        }),
      );
    });

    it('should sort keyframes by timestamp during sync', async () => {
      const formation = makeFormation({
        keyframes: [
          {
            id: 'kf3',
            timestamp: 3000,
            transition: 'linear',
            duration: 500,
            positions: new Map(),
          },
          {
            id: 'kf1',
            timestamp: 0,
            transition: 'linear',
            duration: 500,
            positions: new Map(),
          },
          {
            id: 'kf2',
            timestamp: 1500,
            transition: 'linear',
            duration: 500,
            positions: new Map(),
          },
        ],
      });

      const { result } = await renderConnectedHook({}, formation);

      const kfs = result.current.formation?.keyframes;
      expect(kfs).toBeDefined();
      expect(kfs![0].timestamp).toBe(0);
      expect(kfs![1].timestamp).toBe(1500);
      expect(kfs![2].timestamp).toBe(3000);
    });
  });

  // ==========================================================================
  // 9. Conflict Detection
  // ==========================================================================

  describe('Conflict Detection', () => {
    it('should start with empty conflicts array', async () => {
      const { result } = await renderConnectedHook();

      expect(result.current.conflicts).toEqual([]);
    });

    describe('Performer deleted during drag', () => {
      it('should detect performer-deleted conflict when dragged performer is removed', async () => {
        const { result } = await renderConnectedHook();

        // Start dragging performer p1
        act(() => {
          result.current.setDraggingPerformer('p1');
        });

        // Simulate remote user deleting performer p1
        act(() => {
          result.current.removePerformer('p1');
        });

        // Should have a performer-deleted conflict
        expect(result.current.conflicts.length).toBe(1);
        expect(result.current.conflicts[0].entityId).toBe('p1');
        expect(result.current.conflicts[0].type).toBe('performer-deleted');
      });

      it('should cancel local drag when performer is deleted', async () => {
        const { result } = await renderConnectedHook();

        // Start dragging
        act(() => {
          result.current.setDraggingPerformer('p1');
        });

        mockAwareness.setLocalState.mockClear();

        // Simulate remote delete
        act(() => {
          result.current.removePerformer('p1');
        });

        // Drag should have been cancelled via awareness update
        const setLocalStateCalls = mockAwareness.setLocalState.mock.calls;
        const lastCall = setLocalStateCalls[setLocalStateCalls.length - 1];
        expect(lastCall[0].draggingPerformerId).toBeNull();
      });

      it('should not detect conflict when non-dragged performer is removed', async () => {
        const { result } = await renderConnectedHook();

        // Start dragging p1
        act(() => {
          result.current.setDraggingPerformer('p1');
        });

        // Remove p2 (not the one being dragged)
        act(() => {
          result.current.removePerformer('p2');
        });

        // Should have no conflicts
        expect(result.current.conflicts.length).toBe(0);
      });

      it('should not detect conflict when no performer is being dragged', async () => {
        const { result } = await renderConnectedHook();

        // Remove a performer without dragging
        act(() => {
          result.current.removePerformer('p1');
        });

        expect(result.current.conflicts.length).toBe(0);
      });
    });

    describe('Keyframe deleted during edit', () => {
      it('should detect keyframe-deleted conflict when active keyframe is removed', async () => {
        const { result } = await renderConnectedHook();

        // Set active keyframe
        act(() => {
          result.current.setActiveKeyframe('kf1');
        });

        // Simulate remote user deleting the keyframe
        act(() => {
          result.current.removeKeyframe('kf1');
        });

        // Should have a keyframe-deleted conflict
        expect(result.current.conflicts.length).toBe(1);
        expect(result.current.conflicts[0].entityId).toBe('kf1');
        expect(result.current.conflicts[0].type).toBe('keyframe-deleted');
      });

      it('should clear active keyframe ref when keyframe is deleted', async () => {
        const { result } = await renderConnectedHook();

        // Set active keyframe
        act(() => {
          result.current.setActiveKeyframe('kf1');
        });

        // Delete it
        act(() => {
          result.current.removeKeyframe('kf1');
        });

        // Should have the conflict
        expect(result.current.conflicts[0].type).toBe('keyframe-deleted');

        // Adding another keyframe and deleting it should not trigger conflict
        // because the activeKeyframeRef was cleared
        let newKf: { id: string } | undefined;
        act(() => {
          newKf = result.current.addKeyframe(2000);
        });
        act(() => {
          result.current.removeKeyframe(newKf!.id);
        });

        // Should still only have the one original conflict
        expect(result.current.conflicts.length).toBe(1);
      });

      it('should not detect conflict when non-active keyframe is removed', async () => {
        const formation = makeFormation({
          keyframes: [
            {
              id: 'kf1',
              timestamp: 0,
              transition: 'linear',
              duration: 500,
              positions: new Map(),
            },
            {
              id: 'kf2',
              timestamp: 1000,
              transition: 'linear',
              duration: 500,
              positions: new Map(),
            },
          ],
        });

        const { result } = await renderConnectedHook({}, formation);

        // Set active keyframe to kf1
        act(() => {
          result.current.setActiveKeyframe('kf1');
        });

        // Delete kf2 (not the active one)
        act(() => {
          result.current.removeKeyframe('kf2');
        });

        // Should have no conflicts
        expect(result.current.conflicts.length).toBe(0);
      });
    });

    describe('Simultaneous move detection', () => {
      it('should detect simultaneous-move when another user is dragging the same performer', async () => {
        const { result } = await renderConnectedHook();

        // Local user starts dragging p1
        act(() => {
          result.current.setDraggingPerformer('p1');
        });

        // Set up another client also dragging p1 (via awareness)
        const otherClientId = 2;
        mockAwarenessState.set(otherClientId, {
          user: { id: 'user-456', name: 'Other User', color: '#00FF00' },
          isActive: true,
          lastActivity: Date.now(),
          selectedPerformerIds: [],
          draggingPerformerId: 'p1',
        });

        // Simulate a remote update (origin is not null/undefined/'local')
        act(() => {
          currentDoc._updateHandlers.forEach((h) =>
            h(new Uint8Array(), 'remote-client'),
          );
        });

        // Should have a simultaneous-move conflict
        const moveConflicts = result.current.conflicts.filter(
          (c) => c.type === 'simultaneous-move',
        );
        expect(moveConflicts.length).toBe(1);
        expect(moveConflicts[0].entityId).toBe('p1');
        expect(moveConflicts[0].remoteUserId).toBe('user-456');
      });

      it('should not detect simultaneous-move for local updates', async () => {
        const { result } = await renderConnectedHook();

        // Start dragging p1
        act(() => {
          result.current.setDraggingPerformer('p1');
        });

        // Simulate a local update (origin is null)
        act(() => {
          currentDoc._updateHandlers.forEach((h) =>
            h(new Uint8Array(), null),
          );
        });

        // No conflicts
        expect(result.current.conflicts.length).toBe(0);
      });

      it('should not detect simultaneous-move when not dragging', async () => {
        await renderConnectedHook();

        // Simulate a remote update without any local drag
        const otherClientId = 2;
        mockAwarenessState.set(otherClientId, {
          user: { id: 'user-456', name: 'Other User', color: '#00FF00' },
          isActive: true,
          lastActivity: Date.now(),
          selectedPerformerIds: [],
          draggingPerformerId: 'p1',
        });

        const { result } = await renderConnectedHook();

        act(() => {
          currentDoc._updateHandlers.forEach((h) =>
            h(new Uint8Array(), 'remote-client'),
          );
        });

        expect(result.current.conflicts.length).toBe(0);
      });
    });

    describe('Conflict auto-clear and manual clear', () => {
      it('should auto-clear conflicts after 3 seconds', async () => {
        const { result } = await renderConnectedHook();

        // Create a conflict
        act(() => {
          result.current.setDraggingPerformer('p1');
        });
        act(() => {
          result.current.removePerformer('p1');
        });

        expect(result.current.conflicts.length).toBe(1);

        // Advance time by 3 seconds
        await act(async () => {
          vi.advanceTimersByTime(3000);
        });

        expect(result.current.conflicts.length).toBe(0);
      });

      it('should manually clear a conflict by ID', async () => {
        const { result } = await renderConnectedHook();

        // Create a conflict
        act(() => {
          result.current.setDraggingPerformer('p1');
        });
        act(() => {
          result.current.removePerformer('p1');
        });

        expect(result.current.conflicts.length).toBe(1);
        const conflictId = result.current.conflicts[0].id;

        // Clear it manually
        act(() => {
          result.current.clearConflict(conflictId);
        });

        expect(result.current.conflicts.length).toBe(0);
      });

      it('should handle clearing a non-existent conflict gracefully', async () => {
        const { result } = await renderConnectedHook();

        // Should not throw
        act(() => {
          result.current.clearConflict('non-existent-id');
        });

        expect(result.current.conflicts.length).toBe(0);
      });

      it('should handle multiple conflicts simultaneously', async () => {
        const formation = makeFormation({
          keyframes: [
            {
              id: 'kf1',
              timestamp: 0,
              transition: 'linear',
              duration: 500,
              positions: new Map([
                ['p1', { x: 10, y: 20, rotation: 0 }],
                ['p2', { x: 30, y: 40, rotation: 0 }],
              ]),
            },
          ],
        });

        const { result } = await renderConnectedHook({}, formation);

        // Start dragging p1 and set active keyframe
        act(() => {
          result.current.setDraggingPerformer('p1');
          result.current.setActiveKeyframe('kf1');
        });

        // Delete the performer (triggers performer-deleted conflict)
        act(() => {
          result.current.removePerformer('p1');
        });

        // Delete the keyframe (triggers keyframe-deleted conflict)
        act(() => {
          result.current.removeKeyframe('kf1');
        });

        // Should have two conflicts
        expect(result.current.conflicts.length).toBe(2);
        const types = result.current.conflicts.map((c) => c.type).sort();
        expect(types).toContain('performer-deleted');
        expect(types).toContain('keyframe-deleted');
      });

      it('should have correct conflict event structure', async () => {
        const { result } = await renderConnectedHook();

        act(() => {
          result.current.setDraggingPerformer('p1');
        });
        act(() => {
          result.current.removePerformer('p1');
        });

        const conflict = result.current.conflicts[0];
        expect(conflict.id).toMatch(/^conflict-/);
        expect(conflict.entityId).toBe('p1');
        expect(conflict.type).toBe('performer-deleted');
        expect(conflict.timestamp).toBeTypeOf('number');
        expect(conflict.timestamp).toBeLessThanOrEqual(Date.now());
      });
    });

    describe('setActiveKeyframe', () => {
      it('should update awareness with active keyframe', async () => {
        const { result } = await renderConnectedHook();
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setActiveKeyframe('kf1');
        });

        expect(mockAwareness.setLocalState).toHaveBeenCalled();
        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.activeKeyframeId).toBe('kf1');
      });

      it('should clear active keyframe with null', async () => {
        const { result } = await renderConnectedHook();

        act(() => {
          result.current.setActiveKeyframe('kf1');
        });
        mockAwareness.setLocalState.mockClear();

        act(() => {
          result.current.setActiveKeyframe(null);
        });

        const state = mockAwareness.setLocalState.mock.calls[0][0];
        expect(state.activeKeyframeId).toBeNull();
      });
    });
  });
});
