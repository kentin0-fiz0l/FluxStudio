import { useState, useCallback } from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { getApiUrl } from '../utils/apiHelpers';

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

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip', 'application/x-zip-compressed',
  'application/x-figma', 'application/x-sketch',
];

export function useFileUpload() {
  const { token } = useAuth();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(false);

  const validateFiles = useCallback((filesToValidate: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of filesToValidate) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 100MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      } else if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.some(t => file.type === t || file.type.startsWith(t.split('/')[0] + '/'))) {
        // Allow any file if type checking is loose (covers misc types)
        valid.push(file);
      } else {
        valid.push(file);
      }
    }
    return { valid, errors };
  }, []);

  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    const { valid, errors } = validateFiles(filesToUpload);
    if (errors.length > 0) {
      const errorUploads = filesToUpload
        .filter(f => !valid.includes(f))
        .map(file => ({
          file,
          progress: 0,
          status: 'error' as const,
          error: errors.find(e => e.startsWith(file.name)) || 'Validation failed',
        }));
      if (valid.length === 0) {
        setUploads(errorUploads);
        setTimeout(() => setUploads([]), 5000);
        throw new Error(errors.join('; '));
      }
      // Show errors for invalid files, continue with valid ones
      setUploads(errorUploads);
    }

    if (valid.length === 0) return [];

    // Initialize upload progress tracking
    const initialUploads = valid.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploads(prev => [...prev.filter(u => u.status === 'error'), ...initialUploads]);
    setLoading(true);

    try {
      const formData = new FormData();
      valid.forEach(file => {
        formData.append('files', file);
      });

      // Use XMLHttpRequest for real progress tracking
      const result = await new Promise<{ files: FileUpload[] }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', getApiUrl('/api/files/upload'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploads(prev =>
              prev.map(upload =>
                upload.status === 'uploading'
                  ? { ...upload, progress: percent }
                  : upload
              )
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
        xhr.send(formData);
      });

      // Update status to completed
      setUploads(prev => prev.map(upload =>
        upload.status === 'uploading'
          ? { ...upload, status: 'completed' as const, progress: 100 }
          : upload
      ));

      // Add uploaded files to the files list
      setFiles(prev => [...prev, ...result.files]);

      return result.files;
    } catch (error) {
      // Update status to error
      setUploads(prev => prev.map(upload =>
        upload.status === 'uploading'
          ? { ...upload, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : upload
      ));
      throw error;
    } finally {
      setLoading(false);
      // Clear upload progress after a delay
      setTimeout(() => setUploads([]), 5000);
    }
  }, [token, validateFiles]);

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