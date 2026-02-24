/**
 * useProjectFiles Hook
 * Phase 4A: Designer-First Quick Print Integration
 *
 * Manages project files with integrated printing capabilities using React Query.
 * Features:
 * - File list fetching with caching
 * - File upload with progress tracking
 * - File deletion
 * - Real-time print status updates via WebSocket
 * - Optimistic updates
 * - Error handling with toast notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { usePrintWebSocket } from './usePrintWebSocket';
import { apiService } from '@/services/apiService';
import { CACHE_STABLE } from '@/lib/queryConfig';

/**
 * Project file type
 */
export interface ProjectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy?: string;
  url?: string;
  printStatus?: 'idle' | 'queued' | 'printing' | 'completed' | 'failed';
  printProgress?: number;
  printJobId?: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean;
  files: ProjectFile[];
  message: string;
}

/**
 * Hook options
 */
export interface UseProjectFilesOptions {
  projectId: string;
  enabled?: boolean;
}

/**
 * Hook return type
 */
export interface UseProjectFilesReturn {
  /** Project files */
  files: ProjectFile[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Refetch files */
  refetch: () => void;

  /** Upload files mutation */
  uploadFiles: {
    mutate: (files: FileList, options?: { onSuccess?: (data: unknown) => void; onError?: (error: Error) => void }) => void;
    isLoading: boolean;
    error: Error | null;
  };

  /** Upload progress (0-100) */
  uploadProgress: number;

  /** Delete file mutation */
  deleteFile: {
    mutate: (fileId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => void;
    isLoading: boolean;
    error: Error | null;
  };
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Fetch project files
 */
async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`/api/projects/${projectId}/files`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch project files');
  }

  return response.json();
}

/**
 * Upload files to project with progress tracking
 */
async function uploadProjectFiles(
  projectId: string,
  files: FileList,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  const filesArray = Array.from(files);
  const result = await apiService.uploadMultipleFiles(projectId, filesArray, onProgress);

  if (!result.success) {
    throw new Error(result.error || 'Failed to upload files');
  }

  return result.data as FileUploadResult;
}

/**
 * Delete project file
 */
async function deleteProjectFile(
  projectId: string,
  fileId: string
): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete file');
  }

  return response.json();
}

/**
 * Custom hook for managing project files with real-time print status
 */
export function useProjectFiles(
  options: UseProjectFilesOptions
): UseProjectFilesReturn {
  const { projectId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Fetch files
  const {
    data: files = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => fetchProjectFiles(projectId),
    enabled,
    staleTime: CACHE_STABLE.staleTime,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  // Upload files mutation with progress tracking
  const uploadFilesMutation = useMutation({
    mutationFn: (files: FileList) =>
      uploadProjectFiles(projectId, files, (progress) => {
        setUploadProgress(progress);
      }),
    onSuccess: (_data) => {
      // Reset progress
      setUploadProgress(0);

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });

      // Show success toast (handled by caller)
    },
    onError: (error: Error) => {
      // Reset progress on error
      setUploadProgress(0);
      console.error('File upload error:', error.message);
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => deleteProjectFile(projectId, fileId),
    onMutate: async (fileId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project-files', projectId] });

      // Snapshot previous value
      const previousFiles = queryClient.getQueryData<ProjectFile[]>([
        'project-files',
        projectId,
      ]);

      // Optimistically remove file
      queryClient.setQueryData<ProjectFile[]>(
        ['project-files', projectId],
        (old) => old?.filter((file) => file.id !== fileId) || []
      );

      return { previousFiles };
    },
    onError: (error: Error, _fileId, context) => {
      // Rollback on error
      if (context?.previousFiles) {
        queryClient.setQueryData(['project-files', projectId], context.previousFiles);
      }
      console.error('File deletion error:', error.message);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });

  // Subscribe to WebSocket updates for real-time print status
  const { connectionStatus } = usePrintWebSocket({
    enabled,
    onJobComplete: (_event) => {
      // Refetch to get updated status
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
    onJobFailed: (_event) => {
      // Refetch to get updated status
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });

  // Join project room on mount for project-scoped updates
  useEffect(() => {
    if (!enabled || !connectionStatus.connected) return;

    // Request to join project room
    // (WebSocket implementation should handle this)

    return () => {
    };
  }, [projectId, enabled, connectionStatus.connected]);

  return {
    files,
    isLoading,
    error: error as Error | null,
    refetch,
    uploadFiles: {
      mutate: uploadFilesMutation.mutate,
      isLoading: uploadFilesMutation.isPending,
      error: uploadFilesMutation.error as Error | null,
    },
    uploadProgress,
    deleteFile: {
      mutate: deleteFileMutation.mutate,
      isLoading: deleteFileMutation.isPending,
      error: deleteFileMutation.error as Error | null,
    },
  };
}

export default useProjectFiles;
