import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

export function FileUpload({
  onUpload,
  maxSize = 10,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', 'video/*'],
  disabled = false
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    // Check max files
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create file objects
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(true);

    // Simulate upload progress
    for (const fileObj of newFiles) {
      try {
        // Simulate upload with progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileObj.id ? { ...f, progress } : f
            )
          );
        }

        // Mark as success
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileObj.id ? { ...f, status: 'success' } : f
          )
        );
      } catch (error) {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileObj.id
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    // Call onUpload callback
    try {
      await onUpload(acceptedFiles);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [uploadedFiles, disabled, maxFiles, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxSize * 1024 * 1024,
    disabled: disabled || isUploading
  });

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf')) return FileText;
    if (type.includes('zip') || type.includes('rar')) return Archive;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />

        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">
            Drop files here...
          </p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag & drop files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse
            </p>
            <Badge variant="outline" className="mb-2">
              Max {maxFiles} files • {maxSize}MB each
            </Badge>
          </div>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
          </h3>

          <AnimatePresence>
            {uploadedFiles.map((fileObj) => {
              const FileIcon = getFileIcon(fileObj.file.type);

              return (
                <motion.div
                  key={fileObj.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Preview or Icon */}
                        <div className="flex-shrink-0">
                          {fileObj.preview ? (
                            <img
                              src={fileObj.preview}
                              alt={fileObj.file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <FileIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {fileObj.file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(fileObj.file.size)}
                              </p>
                            </div>

                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              {fileObj.status === 'uploading' && (
                                <div className="animate-spin">
                                  <Upload className="h-4 w-4 text-blue-500" />
                                </div>
                              )}
                              {fileObj.status === 'success' && (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                              {fileObj.status === 'error' && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {fileObj.status === 'uploading' && (
                            <div className="mb-2">
                              <Progress value={fileObj.progress} className="h-1" />
                            </div>
                          )}

                          {/* Error Message */}
                          {fileObj.status === 'error' && fileObj.error && (
                            <p className="text-xs text-red-500 mb-2">
                              {fileObj.error}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {fileObj.status === 'success' && (
                              <Badge variant="secondary" className="text-xs">
                                Uploaded
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => removeFile(fileObj.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
