/**
 * Asset Slice - Assets and Files state
 *
 * Migrated from AssetsContext.tsx + FilesContext.tsx
 * Combines asset management and file management into a single slice.
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';
import { getApiUrl } from '@/utils/apiHelpers';

// ============================================================================
// Asset Types (from assets/types.ts)
// ============================================================================

export type AssetType = 'file' | 'design' | 'code' | 'document' | 'media' | 'other';
export type AssetStatus = 'active' | 'archived' | 'deleted';
export type RelationType = 'derived_from' | 'depends_on' | 'references' | 'variant_of' | 'composed_of';

export interface AssetRecord {
  id: string;
  name: string;
  description?: string;
  assetType: AssetType;
  currentVersion: number;
  currentFileId?: string;
  createdBy: string;
  creatorName?: string;
  creatorEmail?: string;
  projectId?: string;
  projectName?: string;
  organizationId?: string;
  organizationName?: string;
  status: AssetStatus;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetsFilter {
  search: string;
  type: AssetType | 'all';
  projectId?: string;
  status: AssetStatus;
  tags?: string[];
}

export interface AssetsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssetsStats {
  totalAssets: number;
  projectsWithAssets: number;
  totalVersions: number;
  byType: Record<string, number>;
}

// ============================================================================
// File Types (from FilesContext.tsx)
// ============================================================================

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
  metadata?: Record<string, unknown>;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  createdAt: string;
  updatedAt: string;
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

// ============================================================================
// Combined State
// ============================================================================

export interface AssetSliceState {
  // Assets
  assets: AssetRecord[];
  assetsLoading: boolean;
  assetsError: string | null;
  assetsFilter: AssetsFilter;
  assetsPagination: AssetsPagination;
  selectedAsset: AssetRecord | null;
  assetsStats: AssetsStats | null;
  popularTags: { tag: string; count: number }[];

  // Files
  files: FileRecord[];
  filesLoading: boolean;
  filesError: string | null;
  filesFilter: FilesFilter;
  filesPagination: FilesPagination;
  selectedFile: FileRecord | null;
  uploadProgress: Record<string, number>;
  filesStats: FilesStats | null;
}

export interface AssetSliceActions {
  // Asset actions
  setAssets: (assets: AssetRecord[]) => void;
  addAsset: (asset: AssetRecord) => void;
  updateAsset: (asset: AssetRecord) => void;
  removeAsset: (id: string) => void;
  setSelectedAsset: (asset: AssetRecord | null) => void;
  setAssetsFilter: (filter: Partial<AssetsFilter>) => void;
  setAssetsPage: (page: number) => void;
  setAssetsLoading: (loading: boolean) => void;
  setAssetsError: (error: string | null) => void;
  setAssetsStats: (stats: AssetsStats | null) => void;
  setPopularTags: (tags: { tag: string; count: number }[]) => void;
  setAssetsPagination: (pagination: Partial<AssetsPagination>) => void;

  // File actions
  setFiles: (files: FileRecord[]) => void;
  addFiles: (files: FileRecord[]) => void;
  updateFile: (file: FileRecord) => void;
  removeFile: (id: string) => void;
  setSelectedFile: (file: FileRecord | null) => void;
  setFilesFilter: (filter: Partial<FilesFilter>) => void;
  setFilesPage: (page: number) => void;
  setFilesLoading: (loading: boolean) => void;
  setFilesError: (error: string | null) => void;
  setUploadProgress: (filename: string, progress: number) => void;
  clearUploadProgress: (filename: string) => void;
  setFilesStats: (stats: FilesStats | null) => void;
  setFilesPagination: (pagination: Partial<FilesPagination>) => void;

  // API actions
  refreshFiles: (params?: Partial<FilesFilter>) => Promise<void>;
  uploadFiles: (files: FileList | File[], options?: { projectId?: string }) => Promise<FileRecord[]>;
  renameFile: (fileId: string, newName: string) => Promise<FileRecord | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
  linkFileToProject: (fileId: string, projectId: string) => Promise<FileRecord | null>;
  unlinkFileFromProject: (fileId: string) => Promise<FileRecord | null>;
  fetchFileStats: () => Promise<void>;
}

export interface AssetSlice {
  assets: AssetSliceState & AssetSliceActions;
}

// ============================================================================
// Helpers
// ============================================================================

function getToken() {
  return localStorage.getItem('auth_token');
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AssetSliceState = {
  assets: [],
  assetsLoading: false,
  assetsError: null,
  assetsFilter: { search: '', type: 'all', status: 'active' },
  assetsPagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
  selectedAsset: null,
  assetsStats: null,
  popularTags: [],

  files: [],
  filesLoading: false,
  filesError: null,
  filesFilter: { search: '', type: 'all', source: 'all' },
  filesPagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
  selectedFile: null,
  uploadProgress: {},
  filesStats: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createAssetSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  AssetSlice
> = (set, get) => ({
  assets: {
    ...initialState,

    // Asset state setters
    setAssets: (assets) => set((s) => { s.assets.assets = assets; }),
    addAsset: (asset) => set((s) => { s.assets.assets.unshift(asset); }),
    updateAsset: (asset) => set((s) => {
      const idx = s.assets.assets.findIndex((a) => a.id === asset.id);
      if (idx !== -1) s.assets.assets[idx] = asset;
      if (s.assets.selectedAsset?.id === asset.id) s.assets.selectedAsset = asset;
    }),
    removeAsset: (id) => set((s) => {
      s.assets.assets = s.assets.assets.filter((a) => a.id !== id);
      if (s.assets.selectedAsset?.id === id) s.assets.selectedAsset = null;
    }),
    setSelectedAsset: (asset) => set((s) => { s.assets.selectedAsset = asset; }),
    setAssetsFilter: (filter) => set((s) => {
      Object.assign(s.assets.assetsFilter, filter);
      s.assets.assetsPagination.page = 1;
    }),
    setAssetsPage: (page) => set((s) => { s.assets.assetsPagination.page = page; }),
    setAssetsLoading: (loading) => set((s) => { s.assets.assetsLoading = loading; }),
    setAssetsError: (error) => set((s) => { s.assets.assetsError = error; }),
    setAssetsStats: (stats) => set((s) => { s.assets.assetsStats = stats; }),
    setPopularTags: (tags) => set((s) => { s.assets.popularTags = tags; }),
    setAssetsPagination: (pagination) => set((s) => { Object.assign(s.assets.assetsPagination, pagination); }),

    // File state setters
    setFiles: (files) => set((s) => { s.assets.files = files; }),
    addFiles: (files) => set((s) => { s.assets.files = [...files, ...s.assets.files]; }),
    updateFile: (file) => set((s) => {
      const idx = s.assets.files.findIndex((f) => f.id === file.id);
      if (idx !== -1) s.assets.files[idx] = file;
      if (s.assets.selectedFile?.id === file.id) s.assets.selectedFile = file;
    }),
    removeFile: (id) => set((s) => {
      s.assets.files = s.assets.files.filter((f) => f.id !== id);
      if (s.assets.selectedFile?.id === id) s.assets.selectedFile = null;
    }),
    setSelectedFile: (file) => set((s) => { s.assets.selectedFile = file; }),
    setFilesFilter: (filter) => set((s) => {
      Object.assign(s.assets.filesFilter, filter);
      s.assets.filesPagination.page = 1;
    }),
    setFilesPage: (page) => set((s) => { s.assets.filesPagination.page = page; }),
    setFilesLoading: (loading) => set((s) => { s.assets.filesLoading = loading; }),
    setFilesError: (error) => set((s) => { s.assets.filesError = error; }),
    setUploadProgress: (filename, progress) => set((s) => { s.assets.uploadProgress[filename] = progress; }),
    clearUploadProgress: (filename) => set((s) => { delete s.assets.uploadProgress[filename]; }),
    setFilesStats: (stats) => set((s) => { s.assets.filesStats = stats; }),
    setFilesPagination: (pagination) => set((s) => { Object.assign(s.assets.filesPagination, pagination); }),

    // File API actions
    refreshFiles: async (params) => {
      set((s) => { s.assets.filesLoading = true; s.assets.filesError = null; });
      try {
        const token = getToken();
        const filters = { ...get().assets.filesFilter, ...params };
        const { page, pageSize } = get().assets.filesPagination;

        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.set('search', filters.search);
        if (filters.type && filters.type !== 'all') queryParams.set('type', filters.type);
        if (filters.source && filters.source !== 'all') queryParams.set('source', filters.source);
        if (filters.projectId) queryParams.set('projectId', filters.projectId);
        queryParams.set('limit', String(pageSize));
        queryParams.set('offset', String((page - 1) * pageSize));

        const response = await fetch(getApiUrl(`/files?${queryParams.toString()}`), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch files');

        const data = await response.json();
        set((s) => {
          s.assets.files = data.files || [];
          s.assets.filesPagination.total = data.total || 0;
          s.assets.filesPagination.totalPages = data.totalPages || 0;
          s.assets.filesLoading = false;
        });
        if (params) {
          set((s) => { Object.assign(s.assets.filesFilter, params); });
        }
      } catch (error) {
        set((s) => {
          s.assets.filesError = error instanceof Error ? error.message : 'Failed to fetch files';
          s.assets.filesLoading = false;
        });
      }
    },

    uploadFiles: async (files, options) => {
      const token = getToken();
      const fileArray = Array.from(files);
      if (fileArray.length === 0) throw new Error('No files selected');

      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append('files', file);
        set((s) => { s.assets.uploadProgress[file.name] = 0; });
      });
      if (options?.projectId) formData.append('projectId', options.projectId);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            fileArray.forEach((file) => {
              set((s) => { s.assets.uploadProgress[file.name] = progress; });
            });
          }
        });
        xhr.addEventListener('load', () => {
          fileArray.forEach((file) => {
            set((s) => { delete s.assets.uploadProgress[file.name]; });
          });
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              const uploaded = response.files || [];
              set((s) => { s.assets.files = [...uploaded, ...s.assets.files]; });
              resolve(uploaded);
            } catch { reject(new Error('Invalid response format')); }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || 'Upload failed'));
            } catch { reject(new Error(`Upload failed: ${xhr.statusText}`)); }
          }
        });
        xhr.addEventListener('error', () => {
          fileArray.forEach((file) => {
            set((s) => { delete s.assets.uploadProgress[file.name]; });
          });
          reject(new Error('Upload failed'));
        });
        xhr.open('POST', getApiUrl('/files/upload'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    },

    renameFile: async (fileId, newName) => {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}/rename`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error('Failed to rename file');
      const data = await response.json();
      set((s) => {
        const idx = s.assets.files.findIndex((f) => f.id === fileId);
        if (idx !== -1) s.assets.files[idx] = data.file;
      });
      return data.file;
    },

    deleteFile: async (fileId) => {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete file');
      set((s) => {
        s.assets.files = s.assets.files.filter((f) => f.id !== fileId);
        if (s.assets.selectedFile?.id === fileId) s.assets.selectedFile = null;
      });
      return true;
    },

    linkFileToProject: async (fileId, projectId) => {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}/link`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) throw new Error('Failed to link file');
      const data = await response.json();
      set((s) => {
        const idx = s.assets.files.findIndex((f) => f.id === fileId);
        if (idx !== -1) s.assets.files[idx] = data.file;
      });
      return data.file;
    },

    unlinkFileFromProject: async (fileId) => {
      const token = getToken();
      const response = await fetch(getApiUrl(`/files/${fileId}/unlink`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to unlink file');
      const data = await response.json();
      set((s) => {
        const idx = s.assets.files.findIndex((f) => f.id === fileId);
        if (idx !== -1) s.assets.files[idx] = data.file;
      });
      return data.file;
    },

    fetchFileStats: async () => {
      const token = getToken();
      try {
        const response = await fetch(getApiUrl('/files/stats'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        set((s) => { s.assets.filesStats = data.stats; });
      } catch {
        // silent fail
      }
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useAssetStore = () => {
  return useStore((state) => state.assets);
};

export const useFileStore = () => {
  return useStore((state) => ({
    files: state.assets.files,
    loading: state.assets.filesLoading,
    error: state.assets.filesError,
    filter: state.assets.filesFilter,
    pagination: state.assets.filesPagination,
    selectedFile: state.assets.selectedFile,
    uploadProgress: state.assets.uploadProgress,
    stats: state.assets.filesStats,
    setFiles: state.assets.setFiles,
    addFiles: state.assets.addFiles,
    updateFile: state.assets.updateFile,
    removeFile: state.assets.removeFile,
    setSelectedFile: state.assets.setSelectedFile,
    setFilter: state.assets.setFilesFilter,
    setPage: state.assets.setFilesPage,
    refreshFiles: state.assets.refreshFiles,
    uploadFiles: state.assets.uploadFiles,
    renameFile: state.assets.renameFile,
    deleteFile: state.assets.deleteFile,
    linkFileToProject: state.assets.linkFileToProject,
    unlinkFileFromProject: state.assets.unlinkFileFromProject,
    fetchStats: state.assets.fetchFileStats,
  }));
};
