/**
 * Shared Test Helpers for Service Layer Tests
 * Provides reusable socket mock factory, fetch mock factory, and common fixtures.
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Socket Mock Factory
// ---------------------------------------------------------------------------

export interface MockSocket {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  connected: boolean;
  id: string;
}

export interface SocketMockContext {
  mockSocket: MockSocket;
  mockIo: ReturnType<typeof vi.fn>;
  eventHandlers: Map<string, (...args: unknown[]) => void>;
  /** Manually trigger a registered socket event */
  trigger: (event: string, ...args: unknown[]) => void;
}

/**
 * Creates a fresh socket.io mock context for use with vi.hoisted().
 * Usage:
 * ```ts
 * const ctx = vi.hoisted(() => createSocketMockContext());
 * vi.mock('socket.io-client', () => ({ io: ctx.mockIo }));
 * ```
 */
export function createSocketMockContext(): SocketMockContext {
  const eventHandlers = new Map<string, (...args: unknown[]) => void>();

  const mockSocket: MockSocket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers.set(event, handler);
      return mockSocket;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  };

  const mockIo = vi.fn(() => mockSocket);

  const trigger = (event: string, ...args: unknown[]) => {
    const handler = eventHandlers.get(event);
    if (handler) handler(...args);
  };

  return { mockSocket, mockIo, eventHandlers, trigger };
}

// ---------------------------------------------------------------------------
// Fetch Mock Factory
// ---------------------------------------------------------------------------

export interface FetchMockContext {
  mockFetch: ReturnType<typeof vi.fn>;
  /** Queue a successful JSON response */
  respondWith: <T>(data: T, status?: number) => void;
  /** Queue an error response */
  respondWithError: (message: string, status?: number) => void;
  /** Reset the mock */
  reset: () => void;
}

export function createFetchMockContext(): FetchMockContext {
  const mockFetch = vi.fn();

  const respondWith = <T>(data: T, status = 200) => {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : String(status),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
  };

  const respondWithError = (message: string, status = 500) => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      statusText: 'Error',
      json: () => Promise.resolve({ error: message }),
      text: () => Promise.resolve(JSON.stringify({ error: message })),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
  };

  const reset = () => {
    mockFetch.mockReset();
  };

  return { mockFetch, respondWith, respondWithError, reset };
}

// ---------------------------------------------------------------------------
// Common Mock Factories
// ---------------------------------------------------------------------------

export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    trace: vi.fn(),
  };
}

export function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => [...store.keys()][index] ?? null),
  };
}

// ---------------------------------------------------------------------------
// Common Fixtures
// ---------------------------------------------------------------------------

export const fixtures = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.png',
    role: 'admin' as const,
    organizationId: 'org-1',
  },

  user2: {
    id: 'user-2',
    name: 'Other User',
    email: 'other@example.com',
    avatar: 'https://example.com/avatar2.png',
    role: 'member' as const,
    organizationId: 'org-1',
  },

  project: {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'in_progress' as const,
    ownerId: 'user-1',
    organizationId: 'org-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  message: {
    id: 'msg-1',
    content: 'Hello world',
    senderId: 'user-1',
    conversationId: 'conv-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    type: 'text' as const,
  },

  conversation: {
    id: 'conv-1',
    name: 'Test Conversation',
    type: 'group' as const,
    projectId: 'proj-1',
    participants: ['user-1', 'user-2'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  formation: {
    id: 'form-1',
    name: 'Test Formation',
    projectId: 'proj-1',
    type: 'layout' as const,
    data: {},
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  workflow: {
    id: 'wf-1',
    name: 'Test Workflow',
    projectId: 'proj-1',
    status: 'active' as const,
    steps: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token',
};

// ---------------------------------------------------------------------------
// Timer Helpers
// ---------------------------------------------------------------------------

export function setupFakeTimers() {
  vi.useFakeTimers();
  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers(),
  };
}

// ---------------------------------------------------------------------------
// Environment Helpers
// ---------------------------------------------------------------------------

export function mockImportMetaEnv(overrides: Record<string, string> = {}) {
  const defaults = {
    VITE_SERVER_URL: 'http://localhost:3001',
    VITE_WS_URL: 'ws://localhost:4000',
    VITE_API_URL: 'http://localhost:3001/api',
    MODE: 'test',
  };
  return { ...defaults, ...overrides };
}
