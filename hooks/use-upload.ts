'use client';

import { useState, useCallback } from 'react';
import { getFileCategory } from '@/lib/utils';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  id: string;
  path: string;
  url: string;
  fileType: 'image' | 'video' | 'audio' | '3d' | 'document' | 'unknown';
}

export function useUpload(projectId: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      const fileType = getFileCategory(file.type);

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });

      return {
        id: data.id,
        path: data.path,
        url: data.url,
        fileType,
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Upload failed'));
      return null;
    } finally {
      setUploading(false);
    }
  }, [projectId]);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await upload(file);
      if (result) results.push(result);
    }

    return results;
  }, [upload]);

  return {
    upload,
    uploadMultiple,
    uploading,
    progress,
    error,
  };
}
