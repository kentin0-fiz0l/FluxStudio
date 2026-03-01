import { MessageSquare, Plus, Clock, Palette } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import { statusConfig } from './constants';
import type { DesignFile, ReviewSession } from './types';

interface ReviewSidebarProps {
  files: DesignFile[];
  selectedFile: DesignFile;
  reviewSession?: ReviewSession;
  isReadOnly?: boolean;
  onFileSelect: (file: DesignFile) => void;
  onFileUpload?: (file: File, version?: number) => void;
  getReviewProgress: () => number;
}

export function ReviewSidebar({
  files,
  selectedFile,
  reviewSession,
  isReadOnly = false,
  onFileSelect,
  onFileUpload,
  getReviewProgress,
}: ReviewSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Design Review</h2>
        {reviewSession && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{Math.round(getReviewProgress())}%</span>
            </div>
            <Progress value={getReviewProgress()} className="h-2" />
            {reviewSession.deadline && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Due {new Date(reviewSession.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {files.map((file) => {
          const statusInfo = statusConfig[file.status];
          const StatusIcon = statusInfo.icon;
          const openAnnotations = file.annotations?.filter(a => a.status === 'open').length || 0;

          return (
            <Card
              key={file.id}
              className={cn(
                'cursor-pointer transition-all border-2',
                selectedFile?.id === file.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => onFileSelect(file)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {file.thumbnail_url ? (
                    <img
                      src={file.thumbnail_url}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <Palette className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn('text-white text-xs', statusInfo.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                        {statusInfo.label}
                      </Badge>
                      <span className="text-xs text-gray-500">v{file.version}</span>
                    </div>
                    {openAnnotations > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <MessageSquare className="h-3 w-3" aria-hidden="true" />
                        {openAnnotations} open comment{openAnnotations !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload New Version */}
      {!isReadOnly && (
        <div className="p-4 border-t border-gray-200">
          <label htmlFor="file-upload" className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 cursor-pointer">
              <Plus className="h-6 w-6 mx-auto mb-2 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-600">Upload new version</span>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onFileUpload) {
                  onFileUpload(file, selectedFile.version + 1);
                }
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
