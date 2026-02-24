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
  AlertCircle,
  Sparkles,
  Loader2,
  Tag,
  BarChart3,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { analyzeFile, FileAnalysisResult } from '../../services/aiAnalysis/fileAnalyzer';
import { SmartTagging } from './SmartTagging';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'success' | 'error';
  error?: string;
  analysis?: FileAnalysisResult;
  selectedTags?: string[];
}

interface EnhancedFileUploadProps {
  onUpload: (files: File[], analyses?: FileAnalysisResult[]) => Promise<void>;
  maxSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  enableAIAnalysis?: boolean;
  showInsights?: boolean;
  onAnalysisComplete?: (analysis: FileAnalysisResult) => void;
}

// Pure helpers (stable references, no per-render re-creation)
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf')) return FileText;
  if (type.includes('zip') || type.includes('rar')) return Archive;
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Memoized file item component to prevent re-renders of entire list
const FileUploadItem = React.memo(function FileUploadItem({
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
        alert(`Maximum ${maxFiles} files allowed`);
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
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-900">
                Analysis Details
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFileId(null)}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* File Metadata */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                File Information
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Category:</span>{' '}
                  <span className="font-medium capitalize">
                    {selectedFile.analysis.category}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Confidence:</span>{' '}
                  <span className="font-medium">
                    {Math.round(selectedFile.analysis.confidence * 100)}%
                  </span>
                </div>
                {selectedFile.analysis.qualityScore && (
                  <div>
                    <span className="text-gray-600">Quality:</span>{' '}
                    <span className="font-medium">
                      {selectedFile.analysis.qualityScore}/100
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Processing:</span>{' '}
                  <span className="font-medium">
                    {selectedFile.analysis.processingTime}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Image Analysis */}
            {selectedFile.analysis.imageAnalysis && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Image Analysis
                </h4>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Dimensions:</span>{' '}
                    <span className="font-medium">
                      {selectedFile.analysis.imageAnalysis.dimensions.width} ×{' '}
                      {selectedFile.analysis.imageAnalysis.dimensions.height}
                    </span>
                  </div>
                  {selectedFile.analysis.imageAnalysis.dominantColors && (
                    <div>
                      <span className="text-sm text-gray-600 mb-1 block">
                        Dominant Colors:
                      </span>
                      <div className="flex gap-2">
                        {selectedFile.analysis.imageAnalysis.dominantColors.map(
                          (color, index) => (
                            <div
                              key={index}
                              className="w-8 h-8 rounded border border-gray-300"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text Analysis */}
            {selectedFile.analysis.textAnalysis && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Text Analysis
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Words:</span>{' '}
                    <span className="font-medium">
                      {selectedFile.analysis.textAnalysis.wordCount}
                    </span>
                  </div>
                  {selectedFile.analysis.textAnalysis.sentiment && (
                    <div>
                      <span className="text-gray-600">Sentiment:</span>{' '}
                      <Badge
                        variant={
                          selectedFile.analysis.textAnalysis.sentiment === 'positive'
                            ? 'default'
                            : selectedFile.analysis.textAnalysis.sentiment ===
                              'negative'
                            ? 'error'
                            : 'secondary'
                        }
                        className="ml-2"
                      >
                        {selectedFile.analysis.textAnalysis.sentiment}
                      </Badge>
                    </div>
                  )}
                  {selectedFile.analysis.textAnalysis.keywords &&
                    selectedFile.analysis.textAnalysis.keywords.length > 0 && (
                      <div>
                        <span className="text-gray-600 block mb-1">Keywords:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedFile.analysis.textAnalysis.keywords.map(
                            (keyword, index) => (
                              <span
                                key={index}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                              >
                                {keyword}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Insights */}
            {selectedFile.analysis.insights &&
              selectedFile.analysis.insights.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    AI Insights
                  </h4>
                  <ul className="space-y-1">
                    {selectedFile.analysis.insights.map((insight, index) => (
                      <li key={index} className="text-sm text-gray-600 flex gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Tag Management */}
            <div>
              <SmartTagging
                fileId={selectedFile.id}
                tags={selectedFile.selectedTags || []}
                onTagsChange={(tags) => handleTagsChange(selectedFile.id, tags)}
                showAnalytics={false}
                showHierarchy={false}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default EnhancedFileUpload;
