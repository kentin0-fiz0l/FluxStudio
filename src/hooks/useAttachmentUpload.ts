/**
 * useAttachmentUpload Hook
 * Manages file upload state and logic for message attachments
 *
 * Features:
 * - Tracks pending uploads with progress
 * - Generates image previews
 * - Handles upload errors gracefully
 * - Cleans up object URLs on removal
 */

import { useState, useCallback } from 'react';
import type { PendingAttachment, MessageAsset } from '../components/messaging/types';
import { generateTempId } from '../components/messaging/utils';

interface UseAttachmentUploadOptions {
  /** Conversation ID for the upload endpoint */
  conversationId: string | null;
  /** Auth token for API requests */
  getAuthToken: () => string | null;
}

interface UseAttachmentUploadReturn {
  /** List of pending attachments */
  pendingAttachments: PendingAttachment[];
  /** Upload a single file */
  uploadFile: (file: File) => Promise<void>;
  /** Upload multiple files */
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  /** Remove an attachment by ID */
  removeAttachment: (id: string) => void;
  /** Clear all pending attachments */
  clearAllAttachments: () => void;
  /** Check if there are any uploads in progress */
  hasUploading: boolean;
  /** Check if there are any upload errors */
  hasErrors: boolean;
  /** Get successfully uploaded attachments (have assetId) */
  getUploadedAttachments: () => PendingAttachment[];
}

export function useAttachmentUpload({
  conversationId,
  getAuthToken,
}: UseAttachmentUploadOptions): UseAttachmentUploadReturn {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const uploadFile = useCallback(async (file: File) => {
    if (!conversationId) return;

    const attachmentId = generateTempId();
    let preview: string | undefined;

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    // Add to pending with uploading state
    setPendingAttachments(prev => [...prev, {
      id: attachmentId,
      file,
      preview,
      uploading: true,
      progress: 0,
    }]);

    // Upload file
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/conversations/${conversationId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();

      // Update attachment with assetId and completed state
      setPendingAttachments(prev => prev.map(a =>
        a.id === attachmentId
          ? {
              ...a,
              uploading: false,
              assetId: data.asset?.id,
              asset: data.asset as MessageAsset,
            }
          : a
      ));
    } catch (error) {
      console.error('Failed to upload file:', error);
      // Mark as error
      setPendingAttachments(prev => prev.map(a =>
        a.id === attachmentId
          ? { ...a, uploading: false, error: error instanceof Error ? error.message : 'Upload failed' }
          : a
      ));
    }
  }, [conversationId, getAuthToken]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    await Promise.all(fileArray.map(file => uploadFile(file)));
  }, [uploadFile]);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      // Revoke object URL to free memory
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const clearAllAttachments = useCallback(() => {
    // Revoke all object URLs
    pendingAttachments.forEach(a => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setPendingAttachments([]);
  }, [pendingAttachments]);

  const getUploadedAttachments = useCallback(() => {
    return pendingAttachments.filter(a => a.assetId && !a.error && !a.uploading);
  }, [pendingAttachments]);

  const hasUploading = pendingAttachments.some(a => a.uploading);
  const hasErrors = pendingAttachments.some(a => a.error);

  return {
    pendingAttachments,
    uploadFile,
    uploadFiles,
    removeAttachment,
    clearAllAttachments,
    hasUploading,
    hasErrors,
    getUploadedAttachments,
  };
}

export default useAttachmentUpload;
