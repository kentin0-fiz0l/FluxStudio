import React, { useCallback, useState } from 'react';
import { Plus, Upload, CheckCircle, AlertCircle, File, Image, Video, FileText } from 'lucide-react';
import { useFileUpload, UploadProgress, FileUpload as UploadedFile } from '../hooks/useFileUpload';

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  className?: string;
  maxFiles?: number;
}

export function FileUpload({ onUploadComplete, className = '', maxFiles = 10 }: FileUploadProps) {
  const { uploadFiles, uploads } = useFileUpload();
  const [dragActive, setDragActive] = useState(false);

  // Define handleFiles first so other handlers can reference it
  const handleFiles = useCallback(async (files: File[]) => {
    const limited = files.slice(0, maxFiles);
    try {
      const uploadedFiles = await uploadFiles(limited);
      onUploadComplete?.(uploadedFiles);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [uploadFiles, onUploadComplete, maxFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  }, [handleFiles]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-8 h-8" aria-hidden="true" />;
    if (file.type.startsWith('video/')) return <Video className="w-8 h-8" aria-hidden="true" />;
    if (file.type.includes('text') || file.type.includes('document')) return <FileText className="w-8 h-8" aria-hidden="true" />;
    return <File className="w-8 h-8" aria-hidden="true" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (upload: UploadProgress) => {
    switch (upload.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" aria-hidden="true" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />;
      default:
        return (
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
          aria-label="Upload files"
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white/70" aria-hidden="true" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-white/60 text-sm">
              Support for images, videos, documents, and archives up to 50MB
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Choose Files
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/80">Uploading Files</h4>
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center space-x-3">
                <div className="text-white/60">
                  {getFileIcon(upload.file)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white truncate">
                      {upload.file.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white/60">
                        {formatFileSize(upload.file.size)}
                      </span>
                      {getStatusIcon(upload)}
                    </div>
                  </div>

                  {upload.status === 'uploading' && (
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}

                  {upload.status === 'error' && upload.error && (
                    <p className="text-xs text-red-400 mt-1">{upload.error}</p>
                  )}

                  {upload.status === 'completed' && (
                    <p className="text-xs text-green-400 mt-1">Upload completed</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}