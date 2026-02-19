import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../utils/apiHelpers';
import { queryKeys } from '../lib/queryClient';
import { toast } from '../lib/toast';
import { useStore } from '../store/store';

export interface FileRecord {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  projectId?: string;
  isImage: boolean;
  isVideo: boolean;
  thumbnailUrl?: string;
}

function validateFile(file: unknown): file is FileRecord {
  if (!file || typeof file !== 'object') return false;
  const f = file as Record<string, unknown>;
  return !!f.id && !!f.originalName && !!f.url && !!f.type;
}

function normalizeFile(file: unknown): FileRecord {
  const f = file as Record<string, unknown>;
  return {
    id: String(f.id || ''),
    name: String(f.name || ''),
    url: String(f.url || ''),
    originalName: String(f.originalName || 'Unknown File'),
    type: String(f.type || 'application/octet-stream'),
    size: Number(f.size || 0),
    uploadedBy: String(f.uploadedBy || 'unknown'),
    uploadedAt: String(f.uploadedAt || new Date().toISOString()),
    isImage: Boolean(f.isImage),
    isVideo: Boolean(f.isVideo),
    thumbnailUrl: f.thumbnailUrl ? String(f.thumbnailUrl) : undefined,
    projectId: f.projectId ? String(f.projectId) : undefined,
  };
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('offline');
  }
  return false;
}

export function useFiles(projectId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queueAction = useStore((s) => s.offline.queueAction);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const {
    data: files = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<FileRecord[], Error>({
    queryKey: queryKeys.files.list(projectId),
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const url = projectId
        ? getApiUrl(`/api/files?projectId=${projectId}`)
        : getApiUrl('/api/files');

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch files');

      const result = await response.json();
      return (result.files || []).filter(validateFile).map(normalizeFile);
    },
    enabled: !!user,
  });

  const error = queryError?.message ?? null;

  const uploadFiles = useCallback(async (fileList: FileList, targetProjectId?: string) => {
    if (!user) throw new Error('Authentication required');
    if (!fileList || fileList.length === 0) throw new Error('No files selected');

    const formData = new FormData();
    Array.from(fileList).forEach(file => formData.append('files', file));
    if (targetProjectId) formData.append('projectId', targetProjectId);

    setUploadProgress(0);
    const token = localStorage.getItem('auth_token');

    return new Promise<FileRecord[]>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            const uploadedFiles = Array.isArray(response) ? response : response.files || [];
            const valid = uploadedFiles.filter(validateFile).map(normalizeFile);
            setUploadProgress(0);
            queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
            resolve(valid);
          } catch {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.open('POST', getApiUrl('/api/files/upload'));
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }, [user, queryClient]);

  const deleteFileMutation = useMutation<void, Error, string, { previous: FileRecord[] | undefined }>({
    mutationFn: async (fileId) => {
      if (!user) throw new Error('Authentication required');
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }
    },
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.files.list(projectId) });
      const previous = queryClient.getQueryData<FileRecord[]>(queryKeys.files.list(projectId));
      queryClient.setQueryData<FileRecord[]>(
        queryKeys.files.list(projectId),
        (old = []) => old.filter((f) => f.id !== fileId),
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success('File deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (err, fileId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.files.list(projectId), context.previous);
      }
      if (isNetworkError(err)) {
        queueAction({
          type: 'delete-file',
          payload: { id: fileId },
          endpoint: getApiUrl(`/api/files/${fileId}`),
          method: 'DELETE',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }
      toast.error(err.message || 'Failed to delete file');
    },
  });

  const updateFileMutation = useMutation<
    FileRecord,
    Error,
    { fileId: string; updates: { originalName?: string; projectId?: string } },
    { previous: FileRecord[] | undefined }
  >({
    mutationFn: async ({ fileId, updates }) => {
      if (!user) throw new Error('Authentication required');
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update file');
      }
      return await response.json();
    },
    onMutate: async ({ fileId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.files.list(projectId) });
      const previous = queryClient.getQueryData<FileRecord[]>(queryKeys.files.list(projectId));
      queryClient.setQueryData<FileRecord[]>(
        queryKeys.files.list(projectId),
        (old = []) => old.map((f) =>
          f.id === fileId ? { ...f, ...updates, name: updates.originalName || f.name } : f,
        ),
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (err, { fileId, updates }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.files.list(projectId), context.previous);
      }
      if (isNetworkError(err)) {
        queueAction({
          type: 'update-file',
          payload: updates,
          endpoint: getApiUrl(`/api/files/${fileId}`),
          method: 'PUT',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }
      toast.error(err.message || 'Failed to update file');
    },
  });

  const deleteFile = useCallback(async (fileId: string) => deleteFileMutation.mutateAsync(fileId), [deleteFileMutation]);
  const updateFile = useCallback(
    async (fileId: string, updates: { originalName?: string; projectId?: string }) =>
      updateFileMutation.mutateAsync({ fileId, updates }),
    [updateFileMutation]
  );

  const getFileById = useCallback(async (fileId: string) => {
    if (!user) throw new Error('Authentication required');
    const token = localStorage.getItem('auth_token');
    const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch file');
    }
    return await response.json();
  }, [user]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getFileIcon = useCallback((file: FileRecord) => {
    if (file.isImage) return '\uD83D\uDDBC\uFE0F';
    if (file.isVideo) return '\uD83C\uDFA5';
    if (file.type.includes('pdf')) return '\uD83D\uDCC4';
    if (file.type.includes('document') || file.type.includes('word')) return '\uD83D\uDCDD';
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return '\uD83D\uDCCA';
    if (file.type.includes('audio')) return '\uD83C\uDFB5';
    if (file.type.includes('zip') || file.type.includes('archive')) return '\uD83D\uDCE6';
    return '\uD83D\uDCCE';
  }, []);

  return {
    files,
    loading,
    error,
    uploadProgress,
    fetchFiles: refetch,
    uploadFiles,
    deleteFile,
    updateFile,
    getFileById,
    formatFileSize,
    getFileIcon,
  };
}
