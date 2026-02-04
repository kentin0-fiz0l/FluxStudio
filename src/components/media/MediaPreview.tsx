// React import not needed with JSX transform
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import { EnhancedImageViewer } from '../messaging/EnhancedImageViewer';
import { Button } from '../ui/button';
import {
  Download,
  ExternalLink,
  FileText,
  File as FileIcon,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    artist?: string;
    album?: string;
    title?: string;
  };
}

interface MediaPreviewProps {
  file: MediaFile;
  className?: string;
  onClose?: () => void;
  onDownload?: (file: MediaFile) => void;
  onShare?: (file: MediaFile) => void;
}

const getFileType = (mimeType: string, fileName: string): 'video' | 'audio' | 'image' | 'document' | 'other' => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';

  // Check by file extension as fallback
  const extension = fileName.split('.').pop()?.toLowerCase();

  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'm4v'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'];

  if (extension && videoExtensions.includes(extension)) return 'video';
  if (extension && audioExtensions.includes(extension)) return 'audio';
  if (extension && imageExtensions.includes(extension)) return 'image';
  if (extension && documentExtensions.includes(extension)) return 'document';

  return 'other';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export function MediaPreview({
  file,
  className,
  onClose,
  onDownload,
  onShare,
}: MediaPreviewProps) {
  const fileType = getFileType(file.type, file.name);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(file);
    } else {
      // Default share behavior
      if (navigator.share) {
        navigator.share({
          title: file.name,
          url: file.url,
        });
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(file.url);
      }
    }
  };

  const renderMediaViewer = () => {
    switch (fileType) {
      case 'video':
        return (
          <VideoPlayer
            src={file.url}
            poster={file.thumbnailUrl}
            className="w-full max-h-[70vh]"
            onTimeUpdate={(_currentTime, _duration) => {
              // Optional: track viewing progress
            }}
            onLoadedMetadata={(_duration) => {
              // Optional: update file metadata
            }}
          />
        );

      case 'audio':
        return (
          <AudioPlayer
            src={file.url}
            title={file.metadata?.title || file.name}
            artist={file.metadata?.artist}
            className="w-full"
            onTimeUpdate={(_currentTime, _duration) => {
              // Optional: track listening progress
            }}
            onLoadedMetadata={(_duration) => {
              // Optional: update file metadata
            }}
          />
        );

      case 'image':
        return (
          <EnhancedImageViewer
            attachment={{ id: file.id, type: file.type || 'image/*', url: file.url, name: file.name, size: file.size || 0, isImage: true, isVideo: false, uploadedAt: new Date(), uploadedBy: 'user' }}
            className="w-full max-h-[70vh]"
          />
        );

      case 'document':
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg min-h-[400px]">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Preview</h3>
            <p className="text-gray-600 text-center mb-4">
              This document type cannot be previewed directly in the browser.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(file.url, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg min-h-[400px]">
            <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unsupported File Type</h3>
            <p className="text-gray-600 text-center mb-4">
              This file type is not supported for preview.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <FileIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 truncate max-w-md">
                {file.name}
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                <span className="capitalize">{fileType}</span>
                {file.metadata?.duration && (
                  <span>{formatDuration(file.metadata.duration)}</span>
                )}
                {file.metadata?.width && file.metadata?.height && (
                  <span>{file.metadata.width} × {file.metadata.height}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-2"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Metadata */}
        {(file.metadata?.artist || file.metadata?.album) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {file.metadata.artist && (
                <span>Artist: {file.metadata.artist}</span>
              )}
              {file.metadata.album && (
                <span>Album: {file.metadata.album}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Viewer */}
      <div className="p-4">
        {renderMediaViewer()}
      </div>
    </div>
  );
}

// Export utility functions for external use
export { getFileType, formatFileSize, formatDuration };
export type { MediaFile };