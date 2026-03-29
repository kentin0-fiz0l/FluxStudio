import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { toast } from '@/lib/toast';
import { analyzeFile, FileAnalysisResult } from '../../services/aiAnalysis/fileAnalyzer';
import { FileUploadItem } from './file-upload/FileUploadItem';
import { FileAnalysisPanel } from './file-upload/FileAnalysisPanel';
import type { UploadedFile, EnhancedFileUploadProps } from './file-upload/types';

export type { UploadedFile, EnhancedFileUploadProps } from './file-upload/types';

export function EnhancedFileUpload({
  onUpload,
  maxSize = 10,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', 'video/*', 'audio/*'],
  disabled = false,
  enableAIAnalysis = true,
  showInsights = true,
  onAnalysisComplete,
}: EnhancedFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;

      // Check max files
      if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
        toast.warning(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Create file objects
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        progress: 0,
        status: 'uploading' as const,
        selectedTags: [],
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      setIsUploading(true);

      const analyses: FileAnalysisResult[] = [];

      // Process each file
      for (const fileObj of newFiles) {
        try {
          // Simulate upload with progress
          for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            setUploadedFiles((prev) =>
              prev.map((f) => (f.id === fileObj.id ? { ...f, progress } : f))
            );
          }

          // Mark as analyzing if AI is enabled
          if (enableAIAnalysis) {
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, status: 'analyzing', progress: 100 }
                  : f
              )
            );

            // Perform AI analysis
            const analysis = await analyzeFile(fileObj.file, {
              extractColors: true,
              analyzeSentiment: true,
              generateKeywords: true,
            });

            analyses.push(analysis);

            // Update with analysis results
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? {
                      ...f,
                      status: 'success',
                      analysis,
                      selectedTags: analysis.tags,
                    }
                  : f
              )
            );

            // Call analysis complete callback
            if (onAnalysisComplete) {
              onAnalysisComplete(analysis);
            }
          } else {
            // Mark as success without analysis
            setUploadedFiles((prev) =>
              prev.map((f) => (f.id === fileObj.id ? { ...f, status: 'success' } : f))
            );
          }
        } catch (error) {
          console.error('File processing error:', error);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? {
                    ...f,
                    status: 'error',
                    error:
                      error instanceof Error ? error.message : 'Processing failed',
                  }
                : f
            )
          );
        }
      }

      setIsUploading(false);

      // Call onUpload callback with analyses
      try {
        await onUpload(
          acceptedFiles,
          enableAIAnalysis ? analyses : undefined
        );
      } catch (error) {
        console.error('Upload error:', error);
      }
    },
    [
      uploadedFiles,
      disabled,
      maxFiles,
      onUpload,
      enableAIAnalysis,
      onAnalysisComplete,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxSize * 1024 * 1024,
    disabled: disabled || isUploading,
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
  };

  const handleTagsChange = (fileId: string, tags: string[]) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, selectedTags: tags } : f))
    );
  };

  const handleSelectFile = useCallback((id: string) => {
    setSelectedFileId((prev) => (prev === id ? null : id));
  }, []);

  const selectedFile = uploadedFiles.find((f) => f.id === selectedFileId);

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

        <motion.div
          animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {enableAIAnalysis ? (
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500" aria-hidden="true" />
          ) : (
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden="true" />
          )}
        </motion.div>

        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">Drop files here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              {enableAIAnalysis
                ? 'Drag & drop files for AI analysis'
                : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline">
                Max {maxFiles} files • {maxSize}MB each
              </Badge>
              {enableAIAnalysis && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
                  AI Powered
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
            </h3>
            {enableAIAnalysis && (
              <Badge variant="secondary" className="text-xs">
                {uploadedFiles.filter((f) => f.analysis).length} analyzed
              </Badge>
            )}
          </div>

          <AnimatePresence>
            {uploadedFiles.map((fileObj) => (
              <FileUploadItem
                key={fileObj.id}
                fileObj={fileObj}
                isSelected={selectedFileId === fileObj.id}
                showInsights={showInsights}
                onSelect={handleSelectFile}
                onRemove={removeFile}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detailed Analysis Panel */}
      {selectedFile && selectedFile.analysis && (
        <FileAnalysisPanel
          selectedFile={selectedFile}
          onClose={() => setSelectedFileId(null)}
          onTagsChange={handleTagsChange}
        />
      )}
    </div>
  );
}

export default EnhancedFileUpload;
