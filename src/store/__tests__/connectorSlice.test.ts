import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));
vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: (path: string) => `/api${path}`,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock apiService to avoid CSRF fetch interference — use vi.hoisted to avoid hoisting issues
const { mockApiService } = vi.hoisted(() => ({
  mockApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));
vi.mock('@/services/apiService', () => ({
  apiService: mockApiService,
}));

import { createConnectorSlice, type ConnectorSlice } from '../slices/connectorSlice';

function createTestStore() {
  return create<ConnectorSlice>()(
    immer((...args) => ({
      ...createConnectorSlice(...(args as Parameters<typeof createConnectorSlice>)),
    }))
  );
}

describe('connectorSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockApiService.get.mockReset();
    mockApiService.post.mockReset();
    mockApiService.put.mockReset();
    mockApiService.delete.mockReset();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const { connectors } = store.getState();
      expect(connectors.connectors).toEqual([]);
      expect(connectors.files).toEqual([]);
      expect(connectors.importedFiles).toEqual([]);
      expect(connectors.syncJobs).toEqual([]);
      expect(connectors.currentProvider).toBeNull();
      expect(connectors.currentPath).toEqual([]);
      expect(connectors.loading).toBe(false);
      expect(connectors.filesLoading).toBe(false);
      expect(connectors.error).toBeNull();
    });
  });

  describe('setConnectors', () => {
    it('should set connectors and clear loading', () => {
      const list = [{ id: 'github', name: 'GitHub', status: 'connected' }] as any[];
      store.getState().connectors.setConnectors(list);

      expect(store.getState().connectors.connectors).toEqual(list);
      expect(store.getState().connectors.loading).toBe(false);
    });
  });

  describe('setCurrentProvider', () => {
    it('should set provider and reset path/files', () => {
      store.getState().connectors.setFiles([{ id: 'f1' }] as any[]);
      store.getState().connectors.pushPath('some-path');

      store.getState().connectors.setCurrentProvider('github');

      expect(store.getState().connectors.currentProvider).toBe('github');
      expect(store.getState().connectors.currentPath).toEqual([]);
      expect(store.getState().connectors.files).toEqual([]);
    });
  });

  describe('pushPath / popPath', () => {
    it('should push and pop path segments', () => {
      store.getState().connectors.pushPath('a');
      store.getState().connectors.pushPath('b');

      expect(store.getState().connectors.currentPath).toEqual(['a', 'b']);

      store.getState().connectors.popPath();
      expect(store.getState().connectors.currentPath).toEqual(['a']);
    });
  });

  describe('updateConnectorStatus', () => {
    it('should update status and username of a connector', () => {
      store.getState().connectors.setConnectors([
        { id: 'github', name: 'GitHub', status: 'disconnected' },
      ] as any[]);

      store.getState().connectors.updateConnectorStatus('github', 'connected', 'octocat');

      const gh = store.getState().connectors.connectors[0];
      expect(gh.status).toBe('connected');
      expect(gh.username).toBe('octocat');
    });
  });

  describe('setError', () => {
    it('should set error and clear loading flags', () => {
      store.getState().connectors.setLoading(true);
      store.getState().connectors.setFilesLoading(true);

      store.getState().connectors.setError('Something broke');

      expect(store.getState().connectors.error).toBe('Something broke');
      expect(store.getState().connectors.loading).toBe(false);
      expect(store.getState().connectors.filesLoading).toBe(false);
    });
  });

  describe('fetchConnectors', () => {
    it('should fetch and set connector list', async () => {
      const connectors = [{ id: 'github', name: 'GitHub', status: 'connected' }];
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { connectors },
      });

      await store.getState().connectors.fetchConnectors();

      expect(store.getState().connectors.connectors).toEqual(connectors);
      expect(store.getState().connectors.loading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: false, error: 'Failed to load connectors' });

      await store.getState().connectors.fetchConnectors();

      expect(store.getState().connectors.error).toBe('Failed to load connectors');
    });
  });

  describe('fetchFiles', () => {
    it('should fetch files for a provider', async () => {
      const files = [{ id: 'f1', name: 'readme.md', type: 'file' }];
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { files },
      });

      await store.getState().connectors.fetchFiles('github', { owner: 'user', repo: 'repo' });

      expect(store.getState().connectors.files).toEqual(files);
      expect(store.getState().connectors.filesLoading).toBe(false);
    });
  });

  describe('importFile', () => {
    it('should import file and add to importedFiles', async () => {
      const file = { id: 'imp-1', name: 'design.fig', provider: 'figma' };
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { file },
      });

      const result = await store.getState().connectors.importFile('figma', 'ext-id-1');

      expect(result).toEqual(file);
      expect(store.getState().connectors.importedFiles).toHaveLength(1);
    });

    it('should return null on failure', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      const result = await store.getState().connectors.importFile('figma', 'bad-id');

      expect(result).toBeNull();
      expect(store.getState().connectors.error).toBe('Not found');
    });
  });

  describe('disconnect', () => {
    it('should disconnect and reset if current provider', async () => {
      store.getState().connectors.setConnectors([
        { id: 'github', name: 'GitHub', status: 'connected' },
      ] as any[]);
      store.getState().connectors.setCurrentProvider('github');

      mockApiService.delete.mockResolvedValueOnce({ success: true });

      await store.getState().connectors.disconnect('github');

      expect(store.getState().connectors.connectors[0].status).toBe('disconnected');
      expect(store.getState().connectors.currentProvider).toBeNull();
    });
  });

  describe('addImportedFile', () => {
    it('should prepend file to importedFiles', () => {
      store.getState().connectors.setImportedFiles([{ id: 'old' }] as any[]);
      store.getState().connectors.addImportedFile({ id: 'new' } as any);

      expect(store.getState().connectors.importedFiles[0].id).toBe('new');
      expect(store.getState().connectors.importedFiles).toHaveLength(2);
    });
  });
});
