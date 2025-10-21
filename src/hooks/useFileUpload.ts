import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getAuthToken } from '../utils/apiHelpers';

export interface FileUpload {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  tags: string[];
  description: string;
  isPublic: boolean;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function useFileUpload() {
  const { token } = useAuth();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(false);

  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    // Initialize upload progress tracking
    const initialUploads = filesToUpload.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }));

    setUploads(initialUploads);
    setLoading(true);

    try {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });

      // Update status to uploading
      setUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'uploading' as const,
        progress: 0
      })));

      const response = await fetch(getApiUrl('/api/files/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();

      // Update status to completed
      setUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'completed' as const,
        progress: 100
      })));

      // Add uploaded files to the files list
      setFiles(prev => [...prev, ...result.files]);

      return result.files;
    } catch (error) {
      // Update status to error
      setUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      })));
      throw error;
    } finally {
      setLoading(false);
      // Clear upload progress after a delay
      setTimeout(() => setUploads([]), 3000);
    }
  }, [token]);

  const fetchFiles = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/files'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const result = await response.json();
      setFiles(result.files);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (!token) return;

    try {
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }, [token]);

  const updateFile = useCallback(async (fileId: string, updates: Partial<Pick<FileUpload, 'description' | 'tags' | 'isPublic'>>) => {
    if (!token) return;

    try {
      const response = await fetch(getApiUrl(`/api/files/${fileId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update file');
      }

      const updatedFile = await response.json();
      setFiles(prev => prev.map(file => file.id === fileId ? updatedFile : file));
      return updatedFile;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }, [token]);

  return {
    files,
    uploads,
    loading,
    uploadFiles,
    fetchFiles,
    deleteFile,
    updateFile
  };
}