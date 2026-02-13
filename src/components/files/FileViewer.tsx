import React from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui';
import { Download, Link2 } from 'lucide-react';
import { FileRecord } from '../../contexts/FilesContext';
import { formatFileSize, formatRelativeTime } from '../../lib/utils';

// File type icons (shared)
import {
  Image,
  Video,
  Music,
  FileText,
  File,
  Archive,
  Code,
} from 'lucide-react';

const fileTypeIcons: Record<string, React.ReactNode> = {
  image: <Image className="h-5 w-5 text-blue-500" />,
  video: <Video className="h-5 w-5 text-purple-500" />,
  audio: <Music className="h-5 w-5 text-pink-500" />,
  document: <FileText className="h-5 w-5 text-orange-500" />,
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  text: <Code className="h-5 w-5 text-green-500" />,
  code: <Code className="h-5 w-5 text-green-500" />,
  archive: <Archive className="h-5 w-5 text-amber-500" />,
  other: <File className="h-5 w-5 text-neutral-400" />,
};

export interface FileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileRecord | null;
  onDownload: (file: FileRecord) => void;
  onLinkProject: (file: FileRecord) => void;
}

export function FileViewer({
  open,
  onOpenChange,
  file,
  onDownload,
  onLinkProject,
}: FileViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{file?.name}</DialogTitle>
        </DialogHeader>

        {file && (
          <div className="space-y-4">
            {/* Preview area */}
            <div className="aspect-video bg-neutral-100 rounded-lg flex items-center justify-center overflow-hidden">
              {file.isImage ? (
                <img
                  src={file.fileUrl}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {fileTypeIcons[file.fileType]}
                  </div>
                  <p className="text-neutral-500">
                    Preview not available for {file.fileType} files
                  </p>
                </div>
              )}
            </div>

            {/* File details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Size:</span>
                <span className="ml-2 text-neutral-900">{formatFileSize(file.size)}</span>
              </div>
              <div>
                <span className="text-neutral-500">Type:</span>
                <span className="ml-2 text-neutral-900">{file.mimeType}</span>
              </div>
              <div>
                <span className="text-neutral-500">Source:</span>
                <span className="ml-2 text-neutral-900 capitalize">{file.provider || file.source}</span>
              </div>
              <div>
                <span className="text-neutral-500">Created:</span>
                <span className="ml-2 text-neutral-900">{formatRelativeTime(file.createdAt)}</span>
              </div>
              {file.projectName && (
                <div className="col-span-2">
                  <span className="text-neutral-500">Project:</span>
                  <span className="ml-2 text-primary-600">{file.projectName}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                icon={<Download className="h-4 w-4" />}
                onClick={() => onDownload(file)}
              >
                Download
              </Button>
              <Button
                variant="outline"
                icon={<Link2 className="h-4 w-4" />}
                onClick={() => {
                  onOpenChange(false);
                  onLinkProject(file);
                }}
              >
                Link to Project
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
