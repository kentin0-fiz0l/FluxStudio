import React, { useState, useEffect } from 'react';
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

// ============================================================================
// Helpers
// ============================================================================

function isPdf(file: FileRecord): boolean {
  return file.fileType === 'pdf' || file.mimeType?.includes('pdf') || file.name?.endsWith('.pdf');
}

function isVideo(file: FileRecord): boolean {
  return file.fileType === 'video' || file.mimeType?.startsWith('video/');
}

function isAudio(file: FileRecord): boolean {
  return file.fileType === 'audio' || file.mimeType?.startsWith('audio/');
}

function isCode(file: FileRecord): boolean {
  if (file.fileType === 'text') return true;
  const codeExts = ['.js', '.ts', '.tsx', '.jsx', '.py', '.css', '.html', '.json', '.md', '.yml', '.yaml', '.sh', '.sql', '.xml', '.csv', '.txt', '.env', '.toml', '.rs', '.go', '.java', '.rb', '.php', '.swift', '.kt'];
  return codeExts.some(ext => file.name?.toLowerCase().endsWith(ext));
}

// ============================================================================
// Sub-components
// ============================================================================

function PdfPreview({ url }: { url: string }) {
  return (
    <iframe
      src={`${url}#toolbar=1&navpanes=0`}
      className="w-full h-full border-0 rounded-lg"
      title="PDF Preview"
    />
  );
}

function VideoPreview({ url, mimeType }: { url: string; mimeType?: string }) {
  return (
    <video
      controls
      className="w-full h-full rounded-lg object-contain bg-black"
      preload="metadata"
    >
      <source src={url} type={mimeType || 'video/mp4'} />
      Your browser does not support video playback.
    </video>
  );
}

function AudioPreview({ url, mimeType, fileName }: { url: string; mimeType?: string; fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-xl">
        <Music className="w-16 h-16 text-white" />
      </div>
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center truncate max-w-xs">
        {fileName}
      </p>
      <audio controls className="w-full max-w-md" preload="metadata">
        <source src={url} type={mimeType || 'audio/mpeg'} />
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}

function CodePreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.text();
      })
      .then(text => setContent(text.slice(0, 50000))) // cap at 50k chars
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500 dark:text-neutral-400">Could not load file preview</p>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <pre className="w-full h-full overflow-auto p-4 text-xs font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 rounded-lg leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </pre>
  );
}

// ============================================================================
// FileViewer
// ============================================================================

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
            <div className={`bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center overflow-hidden ${
              isPdf(file) || isCode(file) ? 'h-[60vh]' : 'aspect-video'
            }`}>
              {file.isImage ? (
                <img
                  src={file.fileUrl}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : isPdf(file) ? (
                <PdfPreview url={file.fileUrl} />
              ) : isVideo(file) ? (
                <VideoPreview url={file.fileUrl} mimeType={file.mimeType} />
              ) : isAudio(file) ? (
                <AudioPreview url={file.fileUrl} mimeType={file.mimeType} fileName={file.name} />
              ) : isCode(file) ? (
                <CodePreview url={file.fileUrl} />
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {fileTypeIcons[file.fileType]}
                  </div>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    Preview not available for {file.fileType} files
                  </p>
                </div>
              )}
            </div>

            {/* File details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Size:</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-100">{formatFileSize(file.size)}</span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Type:</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-100">{file.mimeType}</span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Source:</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-100 capitalize">{file.provider || file.source}</span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Created:</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-100">{formatRelativeTime(file.createdAt)}</span>
              </div>
              {file.projectName && (
                <div className="col-span-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Project:</span>
                  <span className="ml-2 text-primary-600 dark:text-primary-400">{file.projectName}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
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
