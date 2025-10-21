/**
 * FileCard Molecule - Flux Design Language
 *
 * A reusable file card component for displaying file information.
 * Supports thumbnails, file type icons, and actions.
 *
 * @example
 * <FileCard
 *   file={{ name: 'design.pdf', size: 1024000, type: 'application/pdf' }}
 *   showActions
 * />
 */

import * as React from 'react';
import { FileText, Image, Video, Music, Archive, File, Download, Share2, Trash2, MoreVertical } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { cn, formatFileSize, formatRelativeTime } from '@/lib/utils';

export interface FileCardFile {
  id?: string;
  name: string;
  size: number;
  type: string;
  thumbnail?: string;
  modifiedAt?: Date | string;
  owner?: string;
  shared?: boolean;
  starred?: boolean;
}

export interface FileCardProps {
  /**
   * File data
   */
  file: FileCardFile;

  /**
   * Show action buttons
   */
  showActions?: boolean;

  /**
   * Show file size
   */
  showSize?: boolean;

  /**
   * Show modified date
   */
  showModified?: boolean;

  /**
   * Show owner
   */
  showOwner?: boolean;

  /**
   * Click callback
   */
  onClick?: (file: FileCardFile) => void;

  /**
   * Download callback
   */
  onDownload?: (file: FileCardFile) => void;

  /**
   * Share callback
   */
  onShare?: (file: FileCardFile) => void;

  /**
   * Delete callback
   */
  onDelete?: (file: FileCardFile) => void;

  /**
   * More options callback
   */
  onMoreOptions?: (file: FileCardFile) => void;

  /**
   * Custom className
   */
  className?: string;

  /**
   * View mode
   */
  view?: 'grid' | 'list';
}

export const FileCard = React.forwardRef<HTMLDivElement, FileCardProps>(
  (
    {
      file,
      showActions = false,
      showSize = true,
      showModified = true,
      showOwner = false,
      onClick,
      onDownload,
      onShare,
      onDelete,
      onMoreOptions,
      className,
      view = 'grid',
    },
    ref
  ) => {
    // Get file icon based on type
    const getFileIcon = (type: string) => {
      if (type.startsWith('image/')) return <Image className="h-6 w-6" />;
      if (type.startsWith('video/')) return <Video className="h-6 w-6" />;
      if (type.startsWith('audio/')) return <Music className="h-6 w-6" />;
      if (type.includes('pdf')) return <FileText className="h-6 w-6" />;
      if (type.includes('zip') || type.includes('compressed')) return <Archive className="h-6 w-6" />;
      return <File className="h-6 w-6" />;
    };

    // Get file type color
    const getFileTypeColor = (type: string) => {
      if (type.startsWith('image/')) return 'text-blue-600 bg-blue-50';
      if (type.startsWith('video/')) return 'text-purple-600 bg-purple-50';
      if (type.startsWith('audio/')) return 'text-pink-600 bg-pink-50';
      if (type.includes('pdf')) return 'text-red-600 bg-red-50';
      if (type.includes('zip')) return 'text-amber-600 bg-amber-50';
      return 'text-neutral-600 bg-neutral-50';
    };

    // Get file extension
    const getFileExtension = (name: string) => {
      const parts = name.split('.');
      return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
    };

    // Grid view
    if (view === 'grid') {
      return (
        <Card
          ref={ref}
          interactive={!!onClick}
          onClick={() => onClick?.(file)}
          className={cn('group transition-all', className)}
          padding="sm"
        >
          {/* Thumbnail or Icon */}
          <div className="relative aspect-video bg-neutral-100 rounded-lg overflow-hidden mb-3">
            {file.thumbnail ? (
              <img
                src={file.thumbnail}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center', getFileTypeColor(file.type))}>
                {getFileIcon(file.type)}
              </div>
            )}

            {/* Badges overlay */}
            <div className="absolute top-2 right-2 flex gap-1">
              {file.shared && (
                <Badge variant="solidPrimary" size="sm">
                  Shared
                </Badge>
              )}
              {file.starred && (
                <Badge variant="solidWarning" size="sm">
                  P
                </Badge>
              )}
            </div>

            {/* Actions overlay (on hover) */}
            {showActions && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file);
                    }}
                    className="bg-white/90 hover:bg-white text-neutral-900"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {onShare && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(file);
                    }}
                    className="bg-white/90 hover:bg-white text-neutral-900"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file);
                    }}
                    className="bg-white/90 hover:bg-white text-error-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* File info */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-medium text-neutral-900 truncate flex-1">
                {file.name}
              </h3>
              {onMoreOptions && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoreOptions(file);
                  }}
                  className="flex-shrink-0 h-6 w-6"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500">
              {showSize && <span>{formatFileSize(file.size)}</span>}
              {showSize && showModified && file.modifiedAt && <span>"</span>}
              {showModified && file.modifiedAt && (
                <span>{formatRelativeTime(file.modifiedAt)}</span>
              )}
            </div>

            {showOwner && file.owner && (
              <p className="text-xs text-neutral-500 mt-1">By {file.owner}</p>
            )}
          </div>
        </Card>
      );
    }

    // List view
    return (
      <Card
        ref={ref}
        interactive={!!onClick}
        onClick={() => onClick?.(file)}
        className={cn('group transition-all', className)}
        padding="sm"
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getFileTypeColor(file.type))}>
            {file.thumbnail ? (
              <img
                src={file.thumbnail}
                alt={file.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              getFileIcon(file.type)
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-neutral-900 truncate">
                {file.name}
              </h3>
              {file.shared && <Badge variant="primary" size="sm">Shared</Badge>}
              {file.starred && <span className="text-warning-500">P</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
              <span>{getFileExtension(file.name)}</span>
              {showSize && (
                <>
                  <span>"</span>
                  <span>{formatFileSize(file.size)}</span>
                </>
              )}
              {showModified && file.modifiedAt && (
                <>
                  <span>"</span>
                  <span>{formatRelativeTime(file.modifiedAt)}</span>
                </>
              )}
              {showOwner && file.owner && (
                <>
                  <span>"</span>
                  <span>By {file.owner}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {onShare && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(file);
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file);
                  }}
                  className="text-error-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {onMoreOptions && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoreOptions(file);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

FileCard.displayName = 'FileCard';
