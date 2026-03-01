import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  FileText,
  Trash2,
  Plus,
  Link as LinkIcon,
  Folder,
  X,
} from 'lucide-react';
import { GCodeFile } from '@/types/printing';
import { formatFileSize, formatDate } from './utils';

interface FileItemProps {
  file: GCodeFile;
  onAddToQueue: (filename: string) => void;
  onDelete: (filename: string) => void;
  onLinkToProject?: (filename: string) => void;
  onUnlink?: (filename: string) => void;
  isAdding: boolean;
  isDeleting: boolean;
  projectName?: string | null;
  isLinked?: boolean;
}

export const FileItem: React.FC<FileItemProps> = React.memo(({
  file,
  onAddToQueue,
  onDelete,
  onLinkToProject,
  onUnlink,
  isAdding,
  isDeleting,
  projectName,
  isLinked,
}) => {
  const estimatedTime = file.gcodeAnalysis?.estimatedPrintTime;

  return (
    <div className="group p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {file.display || file.name}
                </h4>
                {isLinked && projectName && (
                  <Badge variant="outline" size="sm" className="flex items-center gap-1 shrink-0">
                    <Folder className="h-3 w-3" aria-hidden="true" />
                    <span className="max-w-[100px] truncate">{projectName}</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{formatDate(file.date)}</span>
                {estimatedTime && (
                  <>
                    <span>•</span>
                    <span>
                      ~{Math.round(estimatedTime / 60)}m print
                    </span>
                  </>
                )}
              </div>
            </div>

            <Badge variant="default" size="sm">
              {file.origin}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAddToQueue(file.name)}
              disabled={isAdding || isDeleting}
              loading={isAdding}
              className="text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
              Add to Queue
            </Button>

            {!isLinked && onLinkToProject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLinkToProject(file.name)}
                disabled={isAdding || isDeleting}
                className="text-xs h-7"
              >
                <LinkIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                Link to Project
              </Button>
            )}

            {isLinked && onUnlink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnlink(file.name)}
                disabled={isAdding || isDeleting}
                className="text-xs h-7"
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                Unlink
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(file.name)}
              disabled={isAdding || isDeleting}
              className="text-xs h-7"
            >
              <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

FileItem.displayName = 'FileItem';
