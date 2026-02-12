/**
 * Connector Slice - External connector integrations
 *
 * Migrated from ConnectorsContext.tsx
 * Manages GitHub, Google Drive, Dropbox, OneDrive, Figma, Slack integrations.
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';
import { getApiUrl } from '@/utils/apiHelpers';

// ============================================================================
// Types
// ============================================================================

export type ConnectorProvider = 'github' | 'google_drive' | 'dropbox' | 'onedrive' | 'figma' | 'slack';
export type ConnectorStatus = 'connected' | 'disconnected' | 'pending' | 'expired';

export interface Connector {
  id: ConnectorProvider;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: ConnectorStatus;
  username?: string;
  email?: string;
  connectedAt?: string;
  lastUsedAt?: string;
  isExpired?: boolean;
}

export interface ConnectorFile {
  id: string;
  name: string;
  path?: string;
  type: 'file' | 'folder' | 'repo';
  size?: number;
  mimeType?: string;
  modifiedAt?: string;
  downloadUrl?: string;
  webUrl?: string;
  provider?: ConnectorProvider;
  fullName?: string;
  defaultBranch?: string;
  language?: string;
  owner?: {
    login: string;
    avatarUrl: string;
  };
}

export interface ImportedFile {
  id: string;
  userId: string;
  provider: ConnectorProvider;
  providerFileId: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  fileType: string;
  syncStatus: string;
  projectId?: string;
  createdAt: string;
}

export interface SyncJob {
  id: string;
  provider: ConnectorProvider;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ConnectorState {
  connectors: Connector[];
  files: ConnectorFile[];
  importedFiles: ImportedFile[];
  syncJobs: SyncJob[];
  currentProvider: ConnectorProvider | null;
  currentPath: string[];
  loading: boolean;
  filesLoading: boolean;
  error: string | null;
}

export interface ConnectorActions {
  setConnectors: (connectors: Connector[]) => void;
  setFiles: (files: ConnectorFile[]) => void;
  setImportedFiles: (files: ImportedFile[]) => void;
  addImportedFile: (file: ImportedFile) => void;
  setSyncJobs: (jobs: SyncJob[]) => void;
  setCurrentProvider: (provider: ConnectorProvider | null) => void;
  pushPath: (segment: string) => void;
  popPath: () => void;
  setLoading: (loading: boolean) => void;
  setFilesLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateConnectorStatus: (provider: ConnectorProvider, status: ConnectorStatus, username?: string) => void;
  fetchConnectors: () => Promise<void>;
  connect: (provider: ConnectorProvider) => Promise<void>;
  disconnect: (provider: ConnectorProvider) => Promise<void>;
  fetchFiles: (provider: ConnectorProvider, options?: { path?: string; folderId?: string; owner?: string; repo?: string }) => Promise<void>;
  importFile: (provider: ConnectorProvider, fileId: string, projectId?: string) => Promise<ImportedFile | null>;
  fetchImportedFiles: (options?: { provider?: ConnectorProvider; projectId?: string }) => Promise<void>;
  linkFileToProject: (fileId: string, projectId: string) => Promise<void>;
}

export interface ConnectorSlice {
  connectors: ConnectorState & ConnectorActions;
}

// ============================================================================
// Helpers
// ============================================================================

function getAuthHeader() {
  const token = localStorage.getItem('auth_token');
  return { Authorization: `Bearer ${token}` };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ConnectorState = {
  connectors: [],
  files: [],
  importedFiles: [],
  syncJobs: [],
  currentProvider: null,
  currentPath: [],
  loading: false,
  filesLoading: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createConnectorSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  ConnectorSlice
> = (set, get) => ({
  connectors: {
    ...initialState,

    setConnectors: (connectors) => {
      set((state) => {
        state.connectors.connectors = connectors;
        state.connectors.loading = false;
      });
    },

    setFiles: (files) => {
      set((state) => {
        state.connectors.files = files;
        state.connectors.filesLoading = false;
      });
    },

    setImportedFiles: (files) => {
      set((state) => {
        state.connectors.importedFiles = files;
      });
    },

    addImportedFile: (file) => {
      set((state) => {
        state.connectors.importedFiles.unshift(file);
      });
    },

    setSyncJobs: (jobs) => {
      set((state) => {
        state.connectors.syncJobs = jobs;
      });
    },

    setCurrentProvider: (provider) => {
      set((state) => {
        state.connectors.currentProvider = provider;
        state.connectors.currentPath = [];
        state.connectors.files = [];
      });
    },

    pushPath: (segment) => {
      set((state) => {
        state.connectors.currentPath.push(segment);
      });
    },

    popPath: () => {
      set((state) => {
        state.connectors.currentPath.pop();
      });
    },

    setLoading: (loading) => {
      set((state) => {
        state.connectors.loading = loading;
      });
    },

    setFilesLoading: (loading) => {
      set((state) => {
        state.connectors.filesLoading = loading;
      });
    },

    setError: (error) => {
      set((state) => {
        state.connectors.error = error;
        state.connectors.loading = false;
        state.connectors.filesLoading = false;
      });
    },

    updateConnectorStatus: (provider, status, username) => {
      set((state) => {
        const connector = state.connectors.connectors.find((c) => c.id === provider);
        if (connector) {
          connector.status = status;
          if (username !== undefined) connector.username = username;
        }
      });
    },

    fetchConnectors: async () => {
      set((state) => { state.connectors.loading = true; });
      try {
        const response = await fetch(getApiUrl('/connectors/list'), {
          headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error('Failed to fetch connectors');
        const data = await response.json();
        set((state) => {
          state.connectors.connectors = data.connectors || [];
          state.connectors.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.connectors.error = 'Failed to load connectors';
          state.connectors.loading = false;
        });
      }
    },

    connect: async (provider) => {
      try {
        const response = await fetch(getApiUrl(`/connectors/${provider}/auth-url`), {
          headers: getAuthHeader(),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get authorization URL');
        }
        const data = await response.json();
        window.location.href = data.url;
      } catch (error) {
        set((state) => {
          state.connectors.error = (error as Error).message;
        });
      }
    },

    disconnect: async (provider) => {
      try {
        const response = await fetch(getApiUrl(`/connectors/${provider}`), {
          method: 'DELETE',
          headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error('Failed to disconnect');

        set((state) => {
          const connector = state.connectors.connectors.find((c) => c.id === provider);
          if (connector) connector.status = 'disconnected';
          if (state.connectors.currentProvider === provider) {
            state.connectors.currentProvider = null;
            state.connectors.currentPath = [];
            state.connectors.files = [];
          }
        });
      } catch {
        set((state) => {
          state.connectors.error = 'Failed to disconnect';
        });
      }
    },

    fetchFiles: async (provider, options = {}) => {
      set((state) => { state.connectors.filesLoading = true; });
      try {
        const params = new URLSearchParams();
        if (options.path) params.append('path', options.path);
        if (options.folderId) params.append('folderId', options.folderId);
        if (options.owner) params.append('owner', options.owner);
        if (options.repo) params.append('repo', options.repo);

        const url = `${getApiUrl(`/connectors/${provider}/files`)}${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, { headers: getAuthHeader() });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch files');
        }
        const data = await response.json();
        set((state) => {
          state.connectors.files = data.files || [];
          state.connectors.filesLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.connectors.error = (error as Error).message;
          state.connectors.filesLoading = false;
        });
      }
    },

    importFile: async (provider, fileId, projectId) => {
      try {
        const response = await fetch(getApiUrl(`/connectors/${provider}/import`), {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, projectId }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to import file');
        }
        const data = await response.json();
        set((state) => {
          state.connectors.importedFiles.unshift(data.file);
        });
        return data.file;
      } catch (error) {
        set((state) => {
          state.connectors.error = (error as Error).message;
        });
        return null;
      }
    },

    fetchImportedFiles: async (options = {}) => {
      try {
        const params = new URLSearchParams();
        if (options.provider) params.append('provider', options.provider);
        if (options.projectId) params.append('projectId', options.projectId);

        const url = `${getApiUrl('/connectors/files')}${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, { headers: getAuthHeader() });
        if (!response.ok) throw new Error('Failed to fetch imported files');
        const data = await response.json();
        set((state) => {
          state.connectors.importedFiles = data.files || [];
        });
      } catch {
        // silent fail
      }
    },

    linkFileToProject: async (fileId, projectId) => {
      try {
        const response = await fetch(getApiUrl(`/connectors/files/${fileId}/link`), {
          method: 'POST',
          headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });
        if (!response.ok) throw new Error('Failed to link file');
        await get().connectors.fetchImportedFiles();
      } catch {
        set((state) => {
          state.connectors.error = 'Failed to link file to project';
        });
      }
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

/**
 * useConnectors - backwards-compatible hook matching the old ConnectorsContext API.
 * Returns { state, ...actions } shape.
 */
export const useConnectors = () => {
  return useStore((s) => ({
    state: {
      connectors: s.connectors.connectors,
      files: s.connectors.files,
      importedFiles: s.connectors.importedFiles,
      syncJobs: s.connectors.syncJobs,
      currentProvider: s.connectors.currentProvider,
      currentPath: s.connectors.currentPath,
      loading: s.connectors.loading,
      filesLoading: s.connectors.filesLoading,
      error: s.connectors.error,
    },
    dispatch: () => {}, // No-op: kept for backwards compat; use direct actions
    setCurrentProvider: s.connectors.setCurrentProvider,
    setError: s.connectors.setError,
    fetchConnectors: s.connectors.fetchConnectors,
    connect: s.connectors.connect,
    disconnect: s.connectors.disconnect,
    fetchFiles: s.connectors.fetchFiles,
    importFile: s.connectors.importFile,
    fetchImportedFiles: s.connectors.fetchImportedFiles,
    linkFileToProject: s.connectors.linkFileToProject,
    navigateToFolder: (folder: ConnectorFile) => {
      if (folder.type !== 'folder' && folder.type !== 'repo') return;
      const provider = s.connectors.currentProvider;
      if (!provider) return;
      if (provider === 'github' && folder.type === 'repo' && folder.fullName) {
        const [owner, repo] = folder.fullName.split('/');
        s.connectors.pushPath(folder.fullName);
        s.connectors.fetchFiles(provider, { owner, repo, path: '' });
        return;
      }
      s.connectors.pushPath(folder.id);
      switch (provider) {
        case 'google_drive':
        case 'onedrive':
          s.connectors.fetchFiles(provider, { folderId: folder.id });
          break;
        case 'dropbox':
          s.connectors.fetchFiles(provider, { path: folder.path || folder.id });
          break;
        case 'github':
          if (s.connectors.currentPath.length > 0) {
            const [owner, repo] = s.connectors.currentPath[0].split('/');
            const newPath = [...s.connectors.currentPath.slice(1), folder.name].join('/');
            s.connectors.fetchFiles(provider, { owner, repo, path: newPath });
          }
          break;
      }
    },
    navigateBack: () => {
      const provider = s.connectors.currentProvider;
      if (!provider || s.connectors.currentPath.length === 0) return;
      s.connectors.popPath();
      const newPath = s.connectors.currentPath.slice(0, -1);
      if (newPath.length === 0) {
        s.connectors.fetchFiles(provider);
        return;
      }
      switch (provider) {
        case 'github':
          if (newPath.length === 1) {
            const [owner, repo] = newPath[0].split('/');
            s.connectors.fetchFiles(provider, { owner, repo, path: '' });
          } else {
            const [owner, repo] = newPath[0].split('/');
            const path = newPath.slice(1).join('/');
            s.connectors.fetchFiles(provider, { owner, repo, path });
          }
          break;
        case 'google_drive':
        case 'onedrive':
          s.connectors.fetchFiles(provider, { folderId: newPath[newPath.length - 1] });
          break;
        case 'dropbox':
          s.connectors.fetchFiles(provider, { path: newPath[newPath.length - 1] });
          break;
      }
    },
  }));
};

export const useConnectorList = () => {
  return useStore((state) => state.connectors.connectors);
};
