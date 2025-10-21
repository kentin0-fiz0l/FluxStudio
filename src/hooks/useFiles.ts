import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../utils/apiHelpers';

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

export function useFiles(projectId?: string) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fetchFiles = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const url = projectId
        ? getApiUrl(`/api/files?projectId=${projectId}`)
        : getApiUrl('/api/files');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const result = await response.json();
      // Validate and clean the files data
      const validFiles = (result.files || []).filter((file: any) =>
        file &&
        typeof file === 'object' &&
        file.id &&
        file.originalName &&
        file.url &&
        file.type
      ).map((file: any) => ({
        ...file,
        url: file.url || '',
        originalName: file.originalName || 'Unknown File',
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        uploadedBy: file.uploadedBy || 'unknown',
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        isImage: file.isImage || false,
        isVideo: file.isVideo || false
      }));
      setFiles(validFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  const uploadFiles = useCallback(async (fileList: FileList, targetProjectId?: string) => {
    if (!user) throw new Error('Authentication required');
    if (!fileList || fileList.length === 0) throw new Error('No files selected');

    const formData = new FormData();
    Array.from(fileList).forEach(file => {
      formData.append('files', file);
    });

    if (targetProjectId) {
      formData.append('projectId', targetProjectId);
    }

    try {
      setUploadProgress(0);
      const token = localStorage.getItem('auth_token');

      const xhr = new XMLHttpRequest();

      return new Promise<FileRecord[]>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              const uploadedFiles = Array.isArray(response) ? response : response.files || [];
              // Validate uploaded files
              const validUploadedFiles = uploadedFiles.filter((file: any) =>
                file &&
                typeof file === 'object' &&
                file.id &&
                file.originalName &&
                file.url &&
                file.type
              ).map((file: any) => ({
                ...file,
                url: file.url || '',
                originalName: file.originalName || 'Unknown File',
                type: file.type || 'application/octet-stream',
                size: file.size || 0,
                uploadedBy: file.uploadedBy || 'unknown',
                uploadedAt: file.uploadedAt || new Date().toISOString(),
                isImage: file.isImage || false,
                isVideo: file.isVideo || false
              }));
              setFiles(prev => [...validUploadedFiles, ...prev]);
              setUploadProgress(0);
              resolve(validUploadedFiles);
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', getApiUrl('/api/files/upload'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadProgress(0);
      throw error;
    }
  }, [user]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }, [user]);

  const updateFile = useCallback(async (fileId: string, updates: {
    originalName?: string;
    projectId?: string;
  }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update file');
      }

      const updatedFile = await response.json();
      setFiles(prev => prev.map(file =>
        file.id === fileId ? updatedFile : file
      ));

      return updatedFile;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }, [user]);

  const getFileById = useCallback(async (fileId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch file');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching file:', error);
      throw error;
    }
  }, [user]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getFileIcon = useCallback((file: FileRecord) => {
    if (file.isImage) return '🖼️';
    if (file.isVideo) return '🎥';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('document') || file.type.includes('word')) return '📝';
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return '📊';
    if (file.type.includes('audio')) return '🎵';
    if (file.type.includes('zip') || file.type.includes('archive')) return '📦';
    return '📎';
  }, []);

  // Fetch files on mount or when projectId changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    uploadProgress,
    fetchFiles,
    uploadFiles,
    deleteFile,
    updateFile,
    getFileById,
    formatFileSize,
    getFileIcon
  };
}