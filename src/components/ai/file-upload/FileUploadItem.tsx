import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  Tag,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import type { UploadedFile } from './types';

export function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf')) return FileText;
  if (type.includes('zip') || type.includes('rar')) return Archive;
  return File;
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export const FileUploadItem = React.memo(function FileUploadItem({
  fileObj,
  isSelected,
  showInsights,
  onSelect,
  onRemove,
}: {
  fileObj: UploadedFile;
  isSelected: boolean;
  showInsights: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const FileIcon = getFileIcon(fileObj.file.type);

  return (
    <motion.div
      key={fileObj.id}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        interactive
        className={cn(
          'cursor-pointer transition-all',
          isSelected && 'ring-2 ring-blue-500'
        )}
        onClick={() => onSelect(fileObj.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {fileObj.preview ? (
                <img
                  src={fileObj.preview}
                  alt={fileObj.file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <FileIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{fileObj.file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(fileObj.file.size)}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {fileObj.status === 'uploading' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" aria-hidden="true" />}
                  {fileObj.status === 'analyzing' && <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" aria-hidden="true" />}
                  {fileObj.status === 'success' && <Check className="h-4 w-4 text-green-500" aria-hidden="true" />}
                  {fileObj.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />}
                </div>
              </div>
              {(fileObj.status === 'uploading' || fileObj.status === 'analyzing') && (
                <div className="mb-2">
                  <Progress value={fileObj.progress} className={cn('h-1', fileObj.status === 'analyzing' && 'bg-purple-200')} />
                  <p className="text-xs text-gray-500 mt-1">
                    {fileObj.status === 'uploading' ? 'Uploading...' : 'Analyzing with AI...'}
                  </p>
                </div>
              )}
              {fileObj.status === 'error' && fileObj.error && (
                <p className="text-xs text-red-500 mb-2">{fileObj.error}</p>
              )}
              {fileObj.analysis && showInsights && (
                <div className="mb-2 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">{fileObj.analysis.category}</Badge>
                    {fileObj.analysis.confidence && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                        {Math.round(fileObj.analysis.confidence * 100)}% confidence
                      </Badge>
                    )}
                    {fileObj.analysis.qualityScore && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        {fileObj.analysis.qualityScore}/100 quality
                      </Badge>
                    )}
                  </div>
                  {fileObj.selectedTags && fileObj.selectedTags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-gray-400" aria-hidden="true" />
                      {fileObj.selectedTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                      {fileObj.selectedTags.length > 3 && (
                        <span className="text-xs text-gray-500">+{fileObj.selectedTags.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                {fileObj.status === 'success' && (
                  <>
                    {fileObj.analysis && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); onSelect(fileObj.id); }}>
                        <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
                        View Details
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onRemove(fileObj.id); }}>
                      <X className="h-3 w-3 mr-1" aria-hidden="true" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
