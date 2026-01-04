'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getFileCategory } from '@/lib/utils';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  path: string;
  url: string;
  fileType: 'image' | 'video' | 'audio' | '3d' | 'document' | 'unknown';
}

export function useUpload(projectId: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    const supabase = createClient();
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Generate unique file path
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = `${projectId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Create asset record in database
      const fileType = getFileCategory(file.type);
      const { error: dbError } = await supabase
        .from('assets')
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: fileType === 'unknown' ? 'document' : fileType,
          mime_type: file.type,
          file_size: file.size,
          project_id: projectId,
          uploaded_by: user.user.id,
        });

      if (dbError) throw dbError;

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });

      return {
        path: filePath,
        url: publicUrl,
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
