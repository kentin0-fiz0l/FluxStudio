/**
 * Files Context - FluxStudio
 *
 * Global state management for the Files app.
 * Handles file listing, uploads, actions, and integration with projects.
 *
 * Features:
 * - File listing with filters, search, and pagination
 * - File uploads with progress tracking
 * - File actions (rename, delete, link to project)
 * - Integration with notifications
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useAuth } from './AuthContext';
import { getApiUrl } from '../utils/apiHelpers';
import { createLogger } from '../lib/logger';

const filesLogger = createLogger('FilesContext');

// ==================== Types ====================

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'text' | 'archive' | 'other';
export type FileSource = 'upload' | 'connector' | 'generated' | 'all';

export interface FileRecord {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploaderName?: string;
  uploaderEmail?: string;
  projectId?: string;
  projectName?: string;
  organizationId?: string;
  organizationName?: string;
  source: FileSource;
  provider?: string;
  connectorFileId?: string;
  storageKey: string;
  extension?: string;
  fileType: FileType;
  description?: string;
  metadata?: Record<string, any>;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  createdAt: string;
  updatedAt: string;
  previews?: FilePreview[];
}

export interface FilePreview {
  type: string;
  url: string;
  width?: number;
  height?: number;
  pageNumber?: number;
}

export interface FilesFilter {
  search: string;
  type: FileType | 'all';
  source: FileSource;
  projectId?: string;
}

export interface FilesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FilesStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

export interface FilesState {
  files: FileRecord[];
  loading: boolean;
  error: string | null;
  filters: FilesFilter;
  pagination: FilesPagination;
  selectedFile: FileRecord | null;
  uploadProgress: Record<string, number>;
  stats: FilesStats | null;
}

type FilesAction =
  | { type: 'SET_FILES'; payload: FileRecord[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<FilesFilter> }
  | { type: 'SET_PAGINATION'; payload: Partial<FilesPagination> }
  | { type: 'SET_SELECTED_FILE'; payload: FileRecord | null }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: { filename: string; progress: number } }
  | { type: 'CLEAR_UPLOAD_PROGRESS'; payload: string }
  | { type: 'SET_STATS'; payload: FilesStats | null }
  | { type: 'ADD_FILES'; payload: FileRecord[] }
  | { type: 'UPDATE_FILE'; payload: FileRecord }
  | { type: 'REMOVE_FILE'; payload: string };

export interface FilesContextValue {
  state: FilesState;
  dispatch: React.Dispatch<FilesAction>;
  refreshFiles: (params?: Partial<FilesFilter>) => Promise<void>;
  uploadFiles: (files: FileList | File[], options?: { projectId?: string }) => Promise<FileRecord[]>;
  renameFile: (fileId: string, newName: string) => Promise<FileRecord | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
  linkFileToProject: (fileId: string, projectId: string) => Promise<FileRecord | null>;
  unlinkFileFromProject: (fileId: string) => Promise<FileRecord | null>;
  getFileById: (fileId: string) => Promise<FileRecord | null>;
  fetchStats: () => Promise<void>;
  setSelectedFile: (file: FileRecord | null) => void;
  setFilters: (filters: Partial<FilesFilter>) => void;
  setPage: (page: number) => void;
}

// ==================== Initial State ====================

const initialState: FilesState = {
  files: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    type: 'all',
    source: 'all',
    projectId: undefined
  },
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  },
  selectedFile: null,
  uploadProgress: {},
  stats: null
};

// ==================== Reducer ====================

function filesReducer(state: FilesState, action: FilesAction): FilesState {
  switch (action.type) {
    case 'SET_FILES':
      return { ...state, files: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 } // Reset page on filter change
      };

    case 'SET_PAGINATION':
      return { ...state, pagination: { ...state.pagination, ...action.payload } };

    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload };

    case 'SET_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: {
          ...state.uploadProgress,
          [action.payload.filename]: action.payload.progress
        }
      };

    case 'CLEAR_UPLOAD_PROGRESS': {
      const { [action.payload]: _, ...rest } = state.uploadProgress;
      return { ...state, uploadProgress: rest };
    }

    case 'SET_STATS':
      return { ...state, stats: action.payload };

    case 'ADD_FILES':
      return { ...state, files: [...action.payload, ...state.files] };

    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(f =>
          f.id === action.payload.id ? action.payload : f
        ),
        selectedFile: state.selectedFile?.id === action.payload.id
          ? action.payload
          : state.selectedFile
      };

    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(f => f.id !== action.payload),
        selectedFile: state.selectedFile?.id === action.payload
          ? null
          : state.selectedFile
      };

    default:
      return state;
  }
}

// ==================== Context ====================

const FilesContext = React.createContext<FilesContextValue | null>(null);

export function FilesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = React.useReducer(filesReducer, initialState);

  // Get auth token
  const getToken = React.useCallback(() => {
    return localStorage.getItem('auth_token');
  }, []);

  // Fetch files with current filters
  const refreshFiles = React.useCallback(async (params?: Partial<FilesFilter>) => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const token = getToken();
      const filters = { ...state.filters, ...params };
      const { page, pageSize } = state.pagination;

      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.type && filters.type !== 'all') queryParams.set('type', filters.type);
      if (filters.source && filters.source !== 'all') queryParams.set('source', filters.source);
      if (filters.projectId) queryParams.set('projectId', filters.projectId);
      queryParams.set('limit', String(pageSize));
      queryParams.set('offset', String((page - 1) * pageSize));

      const response = await fetch(getApiUrl(`/files?${queryParams.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();

      dispatch({ type: 'SET_FILES', payload: data.files || [] });
      dispatch({
        type: 'SET_PAGINATION',
        payload: {
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }
      });

      if (params) {
        dispatch({ type: 'SET_FILTERS', payload: params });
      }
    } catch (error) {
      filesLogger.error('Error fetching files', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to fetch files'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, state.filters, state.pagination, getToken]);

  // Upload files
  const uploadFiles = React.useCallback(async (
    files: FileList | File[],
    options?: { projectId?: string }
  ): Promise<FileRecord[]> => {
    if (!user) throw new Error('Authentication required');

    const fileArray = Array.from(files);
    if (fileArray.length === 0) throw new Error('No files selected');

    const formData = new FormData();
    fileArray.forEach(file => {
      formData.append('files', file);
      dispatch({
        type: 'SET_UPLOAD_PROGRESS',
        payload: { filename: file.name, progress: 0 }
      });
    });

    if (options?.projectId) {
      formData.append('projectId', options.projectId);
    }

    try {
      const token = getToken();

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            fileArray.forEach(file => {
              dispatch({
                type: 'SET_UPLOAD_PROGRESS',
                payload: { filename: file.name, progress }
              });
            });
          }
        });

        xhr.addEventListener('load', () => {
          fileArray.forEach(file => {
            dispatch({ type: 'CLEAR_UPLOAD_PROGRESS', payload: file.name });
          });

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              const uploadedFiles = response.files || [];

              dispatch({ type: 'ADD_FILES', payload: uploadedFiles });
              resolve(uploadedFiles);
            } catch (_parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          fileArray.forEach(file => {
            dispatch({ type: 'CLEAR_UPLOAD_PROGRESS', payload: file.name });
          });
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', getApiUrl('/files/upload'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (error) {
      fileArray.forEach(file => {
        dispatch({ type: 'CLEAR_UPLOAD_PROGRESS', payload: file.name });
      });
      throw error;
    }
  }, [user, getToken]);

  // Rename file
  const renameFile = React.useCallback(async (
    fileId: string,
    newName: string
  ): Promise<FileRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}/rename`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename file');
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_FILE', payload: data.file });
      return data.file;
    } catch (error) {
      filesLogger.error('Error renaming file', error);
      throw error;
    }
  }, [user, getToken]);

  // Delete file
  const deleteFile = React.useCallback(async (fileId: string): Promise<boolean> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete file');
      }

      dispatch({ type: 'REMOVE_FILE', payload: fileId });
      return true;
    } catch (error) {
      filesLogger.error('Error deleting file', error);
      throw error;
    }
  }, [user, getToken]);

  // Link file to project
  const linkFileToProject = React.useCallback(async (
    fileId: string,
    projectId: string
  ): Promise<FileRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}/link`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link file');
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_FILE', payload: data.file });
      return data.file;
    } catch (error) {
      filesLogger.error('Error linking file', error);
      throw error;
    }
  }, [user, getToken]);

  // Unlink file from project
  const unlinkFileFromProject = React.useCallback(async (
    fileId: string
  ): Promise<FileRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}/unlink`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink file');
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_FILE', payload: data.file });
      return data.file;
    } catch (error) {
      filesLogger.error('Error unlinking file', error);
      throw error;
    }
  }, [user, getToken]);

  // Get file by ID
  const getFileById = React.useCallback(async (fileId: string): Promise<FileRecord | null> => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json();
        throw new Error(error.error || 'Failed to get file');
      }

      const data = await response.json();
      return data.file;
    } catch (error) {
      filesLogger.error('Error getting file', error);
      throw error;
    }
  }, [user, getToken]);

  // Fetch file stats
  const fetchStats = React.useCallback(async () => {
    if (!user) return;

    try {
      const token = getToken();
      const response = await fetch(getApiUrl('/files/stats'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      dispatch({ type: 'SET_STATS', payload: data.stats });
    } catch (error) {
      filesLogger.error('Error fetching stats', error);
    }
  }, [user, getToken]);

  // Helper to set selected file
  const setSelectedFile = React.useCallback((file: FileRecord | null) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: file });
  }, []);

  // Helper to set filters
  const setFilters = React.useCallback((filters: Partial<FilesFilter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  // Helper to set page
  const setPage = React.useCallback((page: number) => {
    dispatch({ type: 'SET_PAGINATION', payload: { page } });
  }, []);

  // Fetch files on mount and when filters/pagination change
  React.useEffect(() => {
    if (user) {
      refreshFiles();
    }
  }, [user, state.filters, state.pagination.page]);

  const value: FilesContextValue = {
    state,
    dispatch,
    refreshFiles,
    uploadFiles,
    renameFile,
    deleteFile,
    linkFileToProject,
    unlinkFileFromProject,
    getFileById,
    fetchStats,
    setSelectedFile,
    setFilters,
    setPage
  };

  return (
    <FilesContext.Provider value={value}>
      {children}
    </FilesContext.Provider>
  );
}

// ==================== Hook ====================

export function useFiles(): FilesContextValue {
  const context = React.useContext(FilesContext);

  if (!context) {
    throw new Error('useFiles must be used within a FilesProvider');
  }

  return context;
}

// ==================== Optional Hook ====================

export function useFilesOptional(): FilesContextValue | null {
  return React.useContext(FilesContext);
}

export default FilesContext;
