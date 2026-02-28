/**
 * Helper functions for the ProjectDashboard component
 */

import React from 'react';
import { FileText, Image, Video, Music, Archive } from 'lucide-react';

export function getFileIcon(mimeType: string): React.ReactElement {
  if (mimeType.startsWith('image/')) return React.createElement(Image, { className: 'h-5 w-5', 'aria-hidden': 'true' });
  if (mimeType.startsWith('video/')) return React.createElement(Video, { className: 'h-5 w-5', 'aria-hidden': 'true' });
  if (mimeType.startsWith('audio/')) return React.createElement(Music, { className: 'h-5 w-5', 'aria-hidden': 'true' });
  if (mimeType.includes('zip') || mimeType.includes('rar')) return React.createElement(Archive, { className: 'h-5 w-5', 'aria-hidden': 'true' });
  return React.createElement(FileText, { className: 'h-5 w-5', 'aria-hidden': 'true' });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
