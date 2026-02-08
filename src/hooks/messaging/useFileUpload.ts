/**
 * useFileUpload Hook
 *
 * Extracts file attachment handling from MessagesNew.tsx:
 * - Pending attachments state
 * - File selection (via input)
 * - Drag & drop support
 * - Upload progress tracking
 * - Attachment removal
 *
 * Phase 4.2 Technical Debt Resolution
 */

import { useState, useRef, useCallback } from 'react';
import type { PendingAttachment } from '@/components/messaging/types';

interface UseFileUploadOptions {
  conversationId: string | null;
}

interface UseFileUploadReturn {
  // State
  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Handlers
  handleAttach: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleFileDrop: (files: FileList) => Promise<void>;
  handleRemoveAttachment: (id: string) => void;

  // Helpers
  clearAllAttachments: () => void;
  hasUploadingFiles: boolean;
  hasReadyAttachments: boolean;
}

export function useFileUpload({
  conversationId,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file input click
  const handleAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Upload a single file
  const uploadFile = useCallback(async (file: File): Promise<void> => {
    if (!conversationId) return;

    const token = localStorage.getItem('auth_token');
    const attachmentId = `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      progress: 0
    }]);

    // Upload file
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/conversations/${conversationId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Update attachment with assetId and completed state
      setPendingAttachments(prev => prev.map(a =>
        a.id === attachmentId
          ? { ...a, uploading: false, assetId: data.asset.id, asset: data.asset }
          : a
      ));
    } catch (error) {
      console.error('Failed to upload file:', error);
      // Mark as error
      setPendingAttachments(prev => prev.map(a =>
        a.id === attachmentId
          ? { ...a, uploading: false, error: 'Upload failed' }
          : a
      ));
    }
  }, [conversationId]);

  // Handle file input change
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !conversationId) return;

    for (const file of Array.from(files)) {
      await uploadFile(file);
    }

    // Clear the input
    e.target.value = '';
  }, [conversationId, uploadFile]);

  // Handle dropped files (for drag & drop support)
  const handleFileDrop = useCallback(async (files: FileList) => {
    if (!conversationId) return;

    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  }, [conversationId, uploadFile]);

  // Remove an attachment
  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      // Revoke object URL to free memory
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  // Clear all attachments (used after sending)
  const clearAllAttachments = useCallback(() => {
    pendingAttachments.forEach(a => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setPendingAttachments([]);
  }, [pendingAttachments]);

  // Computed helpers
  const hasUploadingFiles = pendingAttachments.some(a => a.uploading);
  const hasReadyAttachments = pendingAttachments.some(a => a.assetId && !a.error && !a.uploading);

  return {
    // State
    pendingAttachments,
    setPendingAttachments,
    fileInputRef,

    // Handlers
    handleAttach,
    handleFileSelect,
    handleFileDrop,
    handleRemoveAttachment,

    // Helpers
    clearAllAttachments,
    hasUploadingFiles,
    hasReadyAttachments,
  };
}

export default useFileUpload;
