/**
 * Unit Tests for useAgent Hooks
 * @file src/hooks/__tests__/useAgent.test.ts
 *
 * Tests all agent-related hooks with mocked API and store.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// Use vi.hoisted to create mocks that can be referenced in vi.mock factories
const { mockGet, mockPost, mockAgentStore } = vi.hoisted(() => {
  const mockAgentStore = {
    sessions: [] as { id: string; messages: { role: string; content: string }[] }[],
    currentSessionId: null as string | null,
    isStreaming: false,
    pendingActions: [] as { id: string; status: string }[],
    dailyBrief: null,
    whatChanged: null,
    isLoadingBrief: false,
    isPanelOpen: false,
    createSession: vi.fn(() => 'new-session-id'),
    setCurrentSession: vi.fn(),
    addMessage: vi.fn(() => 'msg-id'),
    updateMessage: vi.fn(),
    streamMessageChunk: vi.fn(),
    finishStreaming: vi.fn(),
    setStreaming: vi.fn(),
    setError: vi.fn(),
    updatePendingAction: vi.fn(),
    setDailyBrief: vi.fn(),
    setLoadingBrief: vi.fn(),
    setWhatChanged: vi.fn(),
    setPanelOpen: vi.fn(),
    togglePanel: vi.fn(),
  };

  return {
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockAgentStore,
  };
});

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: mockGet,
    post: mockPost,
  },
}));

vi.mock('@/store/store', () => ({
  useStore: (selector: (state: { agent: typeof mockAgentStore }) => typeof mockAgentStore) =>
    selector({ agent: mockAgentStore }),
}));

// Import hooks after mocks are set up
import {
  useAgentSession,
  useAgentActions,
  useDailyBrief,
  useWhatChanged,
  useAgentSearch,
  useAgentPanel,
} from '../useAgent';

// Create wrapper for TanStack Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAgentSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentStore.sessions = [];
    mockAgentStore.currentSessionId = null;
    mockAgentStore.isStreaming = false;

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-auth-token');

    // Mock fetch for SSE
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.session).toBeUndefined();
    expect(result.current.sessions).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
  });

  it('should have sendMessage function', () => {
    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should have startNewSession function', () => {
    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.startNewSession).toBe('function');
  });

  it('should create session when sending first message', async () => {
    mockPost.mockResolvedValue({ data: { id: 'session-123' } });

    // Mock fetch for SSE with a completed stream
    const mockReadableStream = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"start","sessionId":"session-123"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"chunk","content":"Hello!"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"done"}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: mockReadableStream,
    });

    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(mockAgentStore.addMessage).toHaveBeenCalled();
    expect(mockAgentStore.setStreaming).toHaveBeenCalledWith(true);
  });

  it('should handle authentication error', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(mockAgentStore.setError).toHaveBeenCalledWith('Not authenticated');
  });
});

describe('useAgentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentStore.pendingActions = [];
  });

  it('should fetch pending actions', async () => {
    const mockActions = [
      { id: 'action-1', type: 'create_project', status: 'pending' },
      { id: 'action-2', type: 'upload_asset', status: 'pending' },
    ];

    mockGet.mockResolvedValue({ data: mockActions });

    renderHook(() => useAgentActions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/agent/pending_actions');
    });
  });

  it('should have approve function', () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAgentActions(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.approve).toBe('function');
  });

  it('should have reject function', () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAgentActions(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.reject).toBe('function');
  });

  it('should call approve API when approving action', async () => {
    mockGet.mockResolvedValue({ data: [] });
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAgentActions(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.approve('action-1');
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/agent/pending_action/action-1/approve');
    });
  });

  it('should call reject API when rejecting action', async () => {
    mockGet.mockResolvedValue({ data: [] });
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAgentActions(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.reject('action-2');
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/agent/pending_action/action-2/reject');
    });
  });

  it('should update store after approval', async () => {
    mockGet.mockResolvedValue({ data: [] });
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAgentActions(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.approve('action-1');
    });

    await waitFor(() => {
      expect(mockAgentStore.updatePendingAction).toHaveBeenCalledWith('action-1', 'approved');
    });
  });
});

describe('useDailyBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentStore.dailyBrief = null;
    mockAgentStore.isLoadingBrief = false;
  });

  it('should fetch daily brief', async () => {
    const mockBrief = {
      brief: 'Good morning! You have 3 active projects.',
      stats: { projectUpdates: 5 },
      activeProjectCount: 3,
      generatedAt: new Date().toISOString(),
    };

    mockGet.mockResolvedValue({ data: mockBrief });

    renderHook(() => useDailyBrief(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/agent/daily_brief');
    });
  });

  it('should sync brief with store', async () => {
    const mockBrief = {
      brief: 'Test brief',
      stats: {},
      activeProjectCount: 0,
      generatedAt: new Date().toISOString(),
    };

    mockGet.mockResolvedValue({ data: mockBrief });

    renderHook(() => useDailyBrief(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockAgentStore.setDailyBrief).toHaveBeenCalledWith(mockBrief);
    });
  });

  it('should have refetch function', () => {
    mockGet.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useDailyBrief(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should return loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useDailyBrief(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBeDefined();
  });

  it('should handle API error', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDailyBrief(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
    });
  });
});

describe('useWhatChanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentStore.whatChanged = null;
  });

  it('should fetch changes without since parameter', async () => {
    const mockChanges = {
      since: new Date().toISOString(),
      summary: { projectUpdates: 2 },
      changes: { projects: [] },
    };

    mockGet.mockResolvedValue({ data: mockChanges });

    renderHook(() => useWhatChanged(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/agent/what_changed');
    });
  });

  it('should fetch changes with since parameter', async () => {
    const since = '2026-01-01T00:00:00Z';
    mockGet.mockResolvedValue({ data: {} });

    renderHook(() => useWhatChanged(since), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        `/agent/what_changed?since=${encodeURIComponent(since)}`
      );
    });
  });

  it('should sync changes with store', async () => {
    const mockChanges = {
      since: new Date().toISOString(),
      summary: {},
      changes: {},
    };

    mockGet.mockResolvedValue({ data: mockChanges });

    renderHook(() => useWhatChanged(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockAgentStore.setWhatChanged).toHaveBeenCalledWith(mockChanges);
    });
  });

  it('should re-fetch when since changes', async () => {
    mockGet.mockResolvedValue({ data: {} });

    const { rerender } = renderHook(
      ({ since }) => useWhatChanged(since),
      {
        wrapper: createWrapper(),
        initialProps: { since: '2026-01-01' },
      }
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    mockGet.mockClear();

    rerender({ since: '2026-02-01' });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('2026-02-01')
      );
    });
  });
});

describe('useAgentSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have search function', () => {
    const { result } = renderHook(() => useAgentSearch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.search).toBe('function');
    expect(typeof result.current.searchAsync).toBe('function');
  });

  it('should return search results', async () => {
    const mockResults = [
      { id: 'proj-1', name: 'Project Alpha', status: 'active' },
      { id: 'proj-2', name: 'Project Beta', status: 'completed' },
    ];

    mockGet.mockResolvedValue({ data: mockResults });

    const { result } = renderHook(() => useAgentSearch(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.search('Project');
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/agent/search_projects?query=Project'
      );
    });
  });

  it('should track searching state', () => {
    const { result } = renderHook(() => useAgentSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('should handle search errors', async () => {
    mockGet.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => useAgentSearch(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
    });
  });
});

describe('useAgentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentStore.isPanelOpen = false;
  });

  it('should return panel state', () => {
    const { result } = renderHook(() => useAgentPanel(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should have open function', () => {
    const { result } = renderHook(() => useAgentPanel(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.open).toBe('function');

    act(() => {
      result.current.open();
    });

    expect(mockAgentStore.setPanelOpen).toHaveBeenCalledWith(true);
  });

  it('should have close function', () => {
    const { result } = renderHook(() => useAgentPanel(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.close).toBe('function');

    act(() => {
      result.current.close();
    });

    expect(mockAgentStore.setPanelOpen).toHaveBeenCalledWith(false);
  });

  it('should have toggle function', () => {
    const { result } = renderHook(() => useAgentPanel(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.toggle).toBe('function');

    act(() => {
      result.current.toggle();
    });

    expect(mockAgentStore.togglePanel).toHaveBeenCalled();
  });
});

describe('SSE Event Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse start event', async () => {
    const mockReadableStream = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"start","sessionId":"new-session"}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: mockReadableStream,
    });

    mockPost.mockResolvedValue({ data: { id: 'session-123' } });

    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(mockAgentStore.setCurrentSession).toHaveBeenCalledWith('new-session');
  });

  it('should parse chunk events', async () => {
    const mockReadableStream = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"start","sessionId":"s1"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"chunk","content":"Hello "}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"chunk","content":"world!"}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: mockReadableStream,
    });

    mockPost.mockResolvedValue({ data: { id: 'session-123' } });

    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(mockAgentStore.streamMessageChunk).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'Hello '
    );
    expect(mockAgentStore.streamMessageChunk).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'world!'
    );
  });

  it('should parse tools event', async () => {
    const mockReadableStream = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"tools","tools":["search_projects","list_projects"]}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: mockReadableStream,
    });

    mockPost.mockResolvedValue({ data: { id: 'session-123' } });

    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('List my projects');
    });

    expect(mockAgentStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { toolsUsed: ['search_projects', 'list_projects'] }
    );
  });

  it('should parse error event', async () => {
    const mockReadableStream = {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"error","error":"Something went wrong"}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: mockReadableStream,
    });

    mockPost.mockResolvedValue({ data: { id: 'session-123' } });

    const { result } = renderHook(() => useAgentSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(mockAgentStore.setError).toHaveBeenCalledWith('Something went wrong');
  });
});
