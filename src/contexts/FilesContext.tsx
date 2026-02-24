/* eslint-disable react-refresh/only-export-components */
/**
 * FilesContext - Deprecated Wrapper
 *
 * Sprint 24: Migrated to Zustand assetSlice.
 * All state now lives in src/store/slices/assetSlice.ts.
 *
 * New code should import from '@/store' instead:
 *   import { useFileStore } from '@/store';
 *
 * Types can be imported from the store:
 *   import type { FileRecord, FileType, FileSource, FilesFilter } from '@/store/slices/assetSlice';
 */

import * as React from 'react';
import { useStore } from '../store/store';
import { getApiUrl } from '../utils/apiHelpers';

// ============================================================================
// Types (kept for backward compat imports)
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

export interface FilesContextValue {
  state: FilesState;
  dispatch: React.Dispatch<never>;
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

// ============================================================================
// Deprecated Provider (no-op passthrough)
// ============================================================================

/** @deprecated Use Zustand store directly. This is a no-op passthrough. */
export function FilesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ============================================================================
// Deprecated Hooks (delegate to Zustand)
// ============================================================================

/** @deprecated Import useFileStore from '@/store' instead. */
export function useFiles(): FilesContextValue {
  const assets = useStore((s) => s.assets);

  const state: FilesState = {
    files: assets.files as unknown as FileRecord[],
    loading: assets.filesLoading,
    error: assets.filesError,
    filters: assets.filesFilter as unknown as FilesFilter,
    pagination: assets.filesPagination,
    selectedFile: assets.selectedFile as unknown as FileRecord | null,
    uploadProgress: assets.uploadProgress,
    stats: assets.filesStats as unknown as FilesStats | null,
  };

  return {
    state,
     
    dispatch: (() => {}) as React.Dispatch<never>,
    refreshFiles: assets.refreshFiles as FilesContextValue['refreshFiles'],
    uploadFiles: assets.uploadFiles as FilesContextValue['uploadFiles'],
    renameFile: assets.renameFile as FilesContextValue['renameFile'],
    deleteFile: assets.deleteFile,
    linkFileToProject: assets.linkFileToProject as FilesContextValue['linkFileToProject'],
    unlinkFileFromProject: assets.unlinkFileFromProject as FilesContextValue['unlinkFileFromProject'],
    getFileById: async (fileId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/files/${fileId}`), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to get file');
      }
      const data = await response.json();
      return data.file;
    },
    fetchStats: assets.fetchFileStats,
    setSelectedFile: assets.setSelectedFile as FilesContextValue['setSelectedFile'],
    setFilters: assets.setFilesFilter as FilesContextValue['setFilters'],
    setPage: assets.setFilesPage,
  };
}

/** @deprecated Import useFileStore from '@/store' instead. */
export function useFilesOptional(): FilesContextValue {
  return useFiles();
}

export default null;
