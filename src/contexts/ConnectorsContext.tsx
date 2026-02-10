/**
 * ConnectorsContext - FluxStudio
 *
 * Manages external connector integrations (GitHub, Google Drive, Dropbox, OneDrive).
 * Provides connector status, file browsing, and import functionality.
 */

import * as React from 'react';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/utils/apiHelpers';
import { createLogger } from '../lib/logger';

const connectorLogger = createLogger('ConnectorsContext');

// Types
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
  // GitHub specific
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

export interface ConnectorsState {
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

export type ConnectorsAction =
  | { type: 'SET_CONNECTORS'; payload: Connector[] }
  | { type: 'SET_FILES'; payload: ConnectorFile[] }
  | { type: 'SET_IMPORTED_FILES'; payload: ImportedFile[] }
  | { type: 'ADD_IMPORTED_FILE'; payload: ImportedFile }
  | { type: 'SET_SYNC_JOBS'; payload: SyncJob[] }
  | { type: 'SET_CURRENT_PROVIDER'; payload: ConnectorProvider | null }
  | { type: 'SET_CURRENT_PATH'; payload: string[] }
  | { type: 'PUSH_PATH'; payload: string }
  | { type: 'POP_PATH' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FILES_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_CONNECTOR_STATUS'; payload: { provider: ConnectorProvider; status: ConnectorStatus; username?: string } };

const initialState: ConnectorsState = {
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

function connectorsReducer(state: ConnectorsState, action: ConnectorsAction): ConnectorsState {
  switch (action.type) {
    case 'SET_CONNECTORS':
      return { ...state, connectors: action.payload, loading: false };

    case 'SET_FILES':
      return { ...state, files: action.payload, filesLoading: false };

    case 'SET_IMPORTED_FILES':
      return { ...state, importedFiles: action.payload };

    case 'ADD_IMPORTED_FILE':
      return { ...state, importedFiles: [action.payload, ...state.importedFiles] };

    case 'SET_SYNC_JOBS':
      return { ...state, syncJobs: action.payload };

    case 'SET_CURRENT_PROVIDER':
      return { ...state, currentProvider: action.payload, currentPath: [], files: [] };

    case 'SET_CURRENT_PATH':
      return { ...state, currentPath: action.payload };

    case 'PUSH_PATH':
      return { ...state, currentPath: [...state.currentPath, action.payload] };

    case 'POP_PATH':
      return { ...state, currentPath: state.currentPath.slice(0, -1) };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_FILES_LOADING':
      return { ...state, filesLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, filesLoading: false };

    case 'UPDATE_CONNECTOR_STATUS':
      return {
        ...state,
        connectors: state.connectors.map(c =>
          c.id === action.payload.provider
            ? { ...c, status: action.payload.status, username: action.payload.username }
            : c
        ),
      };

    default:
      return state;
  }
}

export interface ConnectorsContextValue {
  state: ConnectorsState;
  dispatch: React.Dispatch<ConnectorsAction>;
  fetchConnectors: () => Promise<void>;
  connect: (provider: ConnectorProvider) => Promise<void>;
  disconnect: (provider: ConnectorProvider) => Promise<void>;
  fetchFiles: (provider: ConnectorProvider, options?: { path?: string; folderId?: string; owner?: string; repo?: string }) => Promise<void>;
  importFile: (provider: ConnectorProvider, fileId: string, projectId?: string) => Promise<ImportedFile | null>;
  fetchImportedFiles: (options?: { provider?: ConnectorProvider; projectId?: string }) => Promise<void>;
  linkFileToProject: (fileId: string, projectId: string) => Promise<void>;
  navigateToFolder: (folder: ConnectorFile) => void;
  navigateBack: () => void;
}

const ConnectorsContext = React.createContext<ConnectorsContextValue | null>(null);

export function ConnectorsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = React.useReducer(connectorsReducer, initialState);

  const getAuthHeader = () => {
    const token = localStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch all connectors with status
  const fetchConnectors = React.useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch(getApiUrl('/connectors/list'), {
        headers: getAuthHeader(),
      });

      if (!response.ok) throw new Error('Failed to fetch connectors');

      const data = await response.json();
      dispatch({ type: 'SET_CONNECTORS', payload: data.connectors || [] });
    } catch (error) {
      connectorLogger.error('Error fetching connectors', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load connectors' });
    }
  }, [user]);

  // Connect to a provider (redirect to OAuth)
  const connect = React.useCallback(async (provider: ConnectorProvider) => {
    try {
      const response = await fetch(getApiUrl(`/connectors/${provider}/auth-url`), {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get authorization URL');
      }

      const data = await response.json();

      // Redirect to OAuth provider
      window.location.href = data.url;
    } catch (error) {
      connectorLogger.error('Error connecting to provider', error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, []);

  // Disconnect from a provider
  const disconnect = React.useCallback(async (provider: ConnectorProvider) => {
    try {
      const response = await fetch(getApiUrl(`/connectors/${provider}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      dispatch({
        type: 'UPDATE_CONNECTOR_STATUS',
        payload: { provider, status: 'disconnected' },
      });

      // Clear files if we were browsing this provider
      if (state.currentProvider === provider) {
        dispatch({ type: 'SET_CURRENT_PROVIDER', payload: null });
      }
    } catch (error) {
      connectorLogger.error('Error disconnecting', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to disconnect' });
    }
  }, [state.currentProvider]);

  // Fetch files from a provider
  const fetchFiles = React.useCallback(async (
    provider: ConnectorProvider,
    options: { path?: string; folderId?: string; owner?: string; repo?: string } = {}
  ) => {
    dispatch({ type: 'SET_FILES_LOADING', payload: true });

    try {
      const params = new URLSearchParams();
      if (options.path) params.append('path', options.path);
      if (options.folderId) params.append('folderId', options.folderId);
      if (options.owner) params.append('owner', options.owner);
      if (options.repo) params.append('repo', options.repo);

      const url = `${getApiUrl(`/connectors/${provider}/files`)}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch files');
      }

      const data = await response.json();
      dispatch({ type: 'SET_FILES', payload: data.files || [] });
    } catch (error) {
      connectorLogger.error('Error fetching files', error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  }, []);

  // Import a file
  const importFile = React.useCallback(async (
    provider: ConnectorProvider,
    fileId: string,
    projectId?: string
  ): Promise<ImportedFile | null> => {
    try {
      const response = await fetch(getApiUrl(`/connectors/${provider}/import`), {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import file');
      }

      const data = await response.json();
      dispatch({ type: 'ADD_IMPORTED_FILE', payload: data.file });
      return data.file;
    } catch (error) {
      connectorLogger.error('Error importing file', error);
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      return null;
    }
  }, []);

  // Fetch imported files
  const fetchImportedFiles = React.useCallback(async (
    options: { provider?: ConnectorProvider; projectId?: string } = {}
  ) => {
    try {
      const params = new URLSearchParams();
      if (options.provider) params.append('provider', options.provider);
      if (options.projectId) params.append('projectId', options.projectId);

      const url = `${getApiUrl('/connectors/files')}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });

      if (!response.ok) throw new Error('Failed to fetch imported files');

      const data = await response.json();
      dispatch({ type: 'SET_IMPORTED_FILES', payload: data.files || [] });
    } catch (error) {
      connectorLogger.error('Error fetching imported files', error);
    }
  }, []);

  // Link file to project
  const linkFileToProject = React.useCallback(async (fileId: string, projectId: string) => {
    try {
      const response = await fetch(getApiUrl(`/connectors/files/${fileId}/link`), {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) throw new Error('Failed to link file');

      // Refresh imported files
      await fetchImportedFiles();
    } catch (error) {
      connectorLogger.error('Error linking file', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to link file to project' });
    }
  }, [fetchImportedFiles]);

  // Navigate into a folder
  const navigateToFolder = React.useCallback((folder: ConnectorFile) => {
    if (folder.type !== 'folder' && folder.type !== 'repo') return;

    const provider = state.currentProvider;
    if (!provider) return;

    // Handle GitHub repos specially
    if (provider === 'github' && folder.type === 'repo' && folder.fullName) {
      const [owner, repo] = folder.fullName.split('/');
      dispatch({ type: 'PUSH_PATH', payload: folder.fullName });
      fetchFiles(provider, { owner, repo, path: '' });
      return;
    }

    // Handle folder navigation
    dispatch({ type: 'PUSH_PATH', payload: folder.id });

    switch (provider) {
      case 'google_drive':
      case 'onedrive':
        fetchFiles(provider, { folderId: folder.id });
        break;
      case 'dropbox':
        fetchFiles(provider, { path: folder.path || folder.id });
        break;
      case 'github':
        // Already handled above for repos, this is for directories within repos
        if (state.currentPath.length > 0) {
          const [owner, repo] = state.currentPath[0].split('/');
          const newPath = [...state.currentPath.slice(1), folder.name].join('/');
          fetchFiles(provider, { owner, repo, path: newPath });
        }
        break;
    }
  }, [state.currentProvider, state.currentPath, fetchFiles]);

  // Navigate back
  const navigateBack = React.useCallback(() => {
    const provider = state.currentProvider;
    if (!provider || state.currentPath.length === 0) return;

    dispatch({ type: 'POP_PATH' });

    const newPath = state.currentPath.slice(0, -1);

    if (newPath.length === 0) {
      // Back to root
      fetchFiles(provider);
      return;
    }

    switch (provider) {
      case 'github':
        if (newPath.length === 1) {
          // Back to repo root
          const [owner, repo] = newPath[0].split('/');
          fetchFiles(provider, { owner, repo, path: '' });
        } else {
          const [owner, repo] = newPath[0].split('/');
          const path = newPath.slice(1).join('/');
          fetchFiles(provider, { owner, repo, path });
        }
        break;
      case 'google_drive':
      case 'onedrive':
        fetchFiles(provider, { folderId: newPath[newPath.length - 1] });
        break;
      case 'dropbox':
        // For Dropbox, we need to reconstruct the path
        fetchFiles(provider, { path: newPath[newPath.length - 1] });
        break;
    }
  }, [state.currentProvider, state.currentPath, fetchFiles]);

  // Fetch connectors on mount
  React.useEffect(() => {
    if (user) {
      fetchConnectors();
    }
  }, [user, fetchConnectors]);

  // Handle OAuth callback success/error from URL params
  // Only process when on the /connectors page to avoid interfering with other OAuth flows
  React.useEffect(() => {
    // Only handle connector OAuth callbacks when on the connectors page
    if (!window.location.pathname.startsWith('/connectors')) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const provider = params.get('provider');

    if (success === 'true' && provider) {
      // Refresh connectors after successful OAuth
      fetchConnectors();
      // Clean URL
      window.history.replaceState({}, '', '/connectors');
    } else if (error && provider) {
      // Only handle errors that include a provider (connector-specific errors)
      dispatch({ type: 'SET_ERROR', payload: decodeURIComponent(error) });
      // Clean URL
      window.history.replaceState({}, '', '/connectors');
    }
  }, [fetchConnectors]);

  const value: ConnectorsContextValue = {
    state,
    dispatch,
    fetchConnectors,
    connect,
    disconnect,
    fetchFiles,
    importFile,
    fetchImportedFiles,
    linkFileToProject,
    navigateToFolder,
    navigateBack,
  };

  return (
    <ConnectorsContext.Provider value={value}>
      {children}
    </ConnectorsContext.Provider>
  );
}

export function useConnectors() {
  const context = React.useContext(ConnectorsContext);
  if (!context) {
    throw new Error('useConnectors must be used within a ConnectorsProvider');
  }
  return context;
}

export default ConnectorsContext;
