import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stable mock references that survive vi.resetModules()
const mockPendingMutations = {
  toArray: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  bulkPut: vi.fn().mockResolvedValue(undefined),
};

const mockDeleteLegacyDB = vi.fn().mockResolvedValue(undefined);

vi.mock('../db', () => ({
  db: { pendingMutations: mockPendingMutations },
  generateId: (prefix = 'mut') => `${prefix}-mock-${Date.now()}`,
  deleteLegacyDB: mockDeleteLegacyDB,
}));

vi.mock('@/store', () => ({ useStore: vi.fn() }));

// We need to reset the module-level `initialized` flag between tests
let initOfflineBridge: typeof import('../offlineBridge').initOfflineBridge;

describe('offlineBridge', () => {
  let onlineListeners: Array<() => void>;
  let offlineListeners: Array<() => void>;

  beforeEach(async () => {
    onlineListeners = [];
    offlineListeners = [];

    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online') onlineListeners.push(handler as () => void);
      if (event === 'offline') offlineListeners.push(handler as () => void);
    });

    // Reset module to clear `initialized` flag
    vi.resetModules();

    // Re-setup mock implementations (vi.restoreAllMocks from prev afterEach clears them)
    mockDeleteLegacyDB.mockResolvedValue(undefined);
    mockPendingMutations.toArray.mockResolvedValue([]);
    mockPendingMutations.clear.mockResolvedValue(undefined);
    mockPendingMutations.bulkPut.mockResolvedValue(undefined);

    const mod = await import('../offlineBridge');
    initOfflineBridge = mod.initOfflineBridge;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockStore(overrides: Record<string, unknown> = {}) {
    const offlineState = {
      networkStatus: 'online' as const,
      pendingActions: [] as unknown[],
      setNetworkStatus: vi.fn(),
      queueAction: vi.fn(),
      sync: vi.fn(),
      ...overrides,
    };

    const state = { offline: offlineState };
    const listeners: Array<(s: typeof state, prev: typeof state) => void> = [];

    return {
      getState: () => state,
      subscribe: (fn: (s: typeof state, prev: typeof state) => void) => {
        listeners.push(fn);
        return () => {};
      },
      _listeners: listeners,
      _state: state,
    };
  }

  it('should set initial network status based on navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const store = createMockStore();

    initOfflineBridge(store as any);

    expect(store._state.offline.setNetworkStatus).toHaveBeenCalledWith('online');
  });

  it('should set offline when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const store = createMockStore();

    initOfflineBridge(store as any);

    expect(store._state.offline.setNetworkStatus).toHaveBeenCalledWith('offline');
  });

  it('should register online/offline event listeners', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const store = createMockStore();

    initOfflineBridge(store as any);

    expect(onlineListeners.length).toBeGreaterThan(0);
    expect(offlineListeners.length).toBeGreaterThan(0);
  });

  it('should call setNetworkStatus online when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const store = createMockStore();

    initOfflineBridge(store as any);

    // Fire online event
    onlineListeners.forEach((fn) => fn());
    expect(store._state.offline.setNetworkStatus).toHaveBeenCalledWith('online');
  });

  it('should call setNetworkStatus offline when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const store = createMockStore();

    initOfflineBridge(store as any);

    offlineListeners.forEach((fn) => fn());
    expect(store._state.offline.setNetworkStatus).toHaveBeenCalledWith('offline');
  });

  it('should hydrate pending actions from IndexedDB', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const store = createMockStore();

    mockPendingMutations.toArray.mockResolvedValueOnce([
      { id: 'persisted-1', type: 'CREATE', payload: {}, endpoint: '/api/x', method: 'POST', maxRetries: 3 },
    ]);

    initOfflineBridge(store as any);

    // Wait for async hydration
    await vi.waitFor(() => {
      expect(store._state.offline.queueAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CREATE' })
      );
    });
  });

  it('should sync after hydration if online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const store = createMockStore();

    mockPendingMutations.toArray.mockResolvedValueOnce([
      { id: 'p-1', type: 'UPDATE', payload: {}, endpoint: '/api/y', method: 'PUT', maxRetries: 2 },
    ]);

    initOfflineBridge(store as any);

    await vi.waitFor(() => {
      expect(store._state.offline.sync).toHaveBeenCalled();
    });
  });

  it('should not hydrate duplicates', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const existingAction = { id: 'existing-1', type: 'TEST', payload: {} };
    const store = createMockStore({ pendingActions: [existingAction] });

    mockPendingMutations.toArray.mockResolvedValueOnce([
      { id: 'existing-1', type: 'TEST', payload: {}, endpoint: '', method: 'POST', maxRetries: 3 },
    ]);

    initOfflineBridge(store as any);

    await vi.waitFor(() => {
      expect(mockPendingMutations.toArray).toHaveBeenCalled();
    });

    // queueAction should NOT have been called since the action already exists
    expect(store._state.offline.queueAction).not.toHaveBeenCalled();
  });

  it('should not initialize twice', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const store = createMockStore();

    initOfflineBridge(store as any);
    initOfflineBridge(store as any);

    // setNetworkStatus should only be called once (from first init)
    expect(store._state.offline.setNetworkStatus).toHaveBeenCalledTimes(1);
  });
});
