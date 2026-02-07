/**
 * Files Page - FluxStudio
 *
 * File management tool for uploading, organizing, and viewing files.
 * Features:
 * - Drag-and-drop upload
 * - Search and filter by type
 * - Preview images, audio, and PDFs
 * - Project linking
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import axios, { AxiosProgressEvent } from 'axios';
import { DashboardLayout } from '../components/templates/DashboardLayout';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { EmptyState, emptyStateConfigs } from '../components/common/EmptyState';
import { buildApiUrl } from '../config/environment';

// Types
interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  thumbnailUrl?: string;
  fileType: string;
  uploadedBy: string;
  uploaderName?: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  byType: {
    image: number;
    video: number;
    audio: number;
    document: number;
    pdf: number;
  };
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  return '📁';
}

// File type filter options
const FILE_TYPES = [
  { value: 'all', label: 'All Files' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'document', label: 'Documents' },
];

// File Card Component
function FileCard({
  file,
  isSelected,
  onClick
}: {
  file: FileItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isImage = file.mimeType.startsWith('image/');

  return (
    <button
      type="button"
      className={`group relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md text-left w-full ${
        isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {isImage && (file.thumbnailUrl || file.fileUrl) ? (
          <img
            src={file.thumbnailUrl || file.fileUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl">{getFileIcon(file.mimeType)}</span>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium text-sm text-gray-900 truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <span>{formatFileSize(file.size)}</span>
          <span className="text-gray-300">|</span>
          <span>{formatDate(file.createdAt)}</span>
        </div>
        {file.projectName && (
          <div className="text-xs text-indigo-600 mt-1 truncate">{file.projectName}</div>
        )}
      </div>
    </button>
  );
}

// Upload Progress Component
function UploadProgress({
  files,
  progress
}: {
  files: string[];
  progress: number;
}) {
  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
        <span className="text-sm font-medium text-indigo-900">
          Uploading {files.length} file{files.length !== 1 ? 's' : ''}...
        </span>
        <span className="text-sm text-indigo-600 ml-auto">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-indigo-100 rounded-full h-2 mb-3">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {files.map((name, i) => (
          <div key={i} className="text-xs text-indigo-700 truncate flex items-center gap-2">
            <span className="text-indigo-400">•</span>
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

// Upload Zone Component
function UploadZone({
  onUpload,
  uploading,
  uploadingFiles,
  uploadProgress
}: {
  onUpload: (files: FileList) => void;
  uploading: boolean;
  uploadingFiles?: string[];
  uploadProgress?: number;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  }, [onUpload]);

  return (
    <div>
      {uploading && uploadingFiles && uploadProgress !== undefined && (
        <UploadProgress files={uploadingFiles} progress={uploadProgress} />
      )}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
        />
        <div className="text-4xl mb-3">📁</div>
        <div className="text-gray-700 font-medium mb-1">
          {uploading ? 'Upload in progress...' : 'Drop files here'}
        </div>
        <div className="text-sm text-gray-500 mb-3">or</div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Select Files
        </button>
        <div className="text-xs text-gray-400 mt-3">
          Max 100MB per file. Images, audio, video, PDFs, and documents.
        </div>
      </div>
    </div>
  );
}

// File Detail Panel
function FileDetailPanel({
  file,
  onClose,
  onDelete,
  onCreateAsset
}: {
  file: FileItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCreateAsset: (file: FileItem) => void;
}) {
  const isImage = file.mimeType.startsWith('image/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div className="bg-white border-l border-gray-200 w-80 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b border-gray-200">
        {isImage ? (
          <img src={file.fileUrl} alt={file.name} className="w-full rounded-lg" />
        ) : isAudio ? (
          <audio controls className="w-full" src={file.fileUrl}>
            Your browser does not support audio playback.
          </audio>
        ) : isPdf ? (
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 bg-gray-100 rounded-lg text-center hover:bg-gray-200 transition-colors"
          >
            <span className="text-4xl">📄</span>
            <div className="text-sm text-gray-600 mt-2">Open PDF</div>
          </a>
        ) : (
          <div className="p-6 bg-gray-100 rounded-lg text-center">
            <span className="text-4xl">{getFileIcon(file.mimeType)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500">File name</dt>
            <dd className="text-gray-900 break-all">{file.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="text-gray-900">{file.mimeType}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Size</dt>
            <dd className="text-gray-900">{formatFileSize(file.size)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Uploaded</dt>
            <dd className="text-gray-900">{formatDate(file.createdAt)}</dd>
          </div>
          {file.uploaderName && (
            <div>
              <dt className="text-gray-500">Uploaded by</dt>
              <dd className="text-gray-900">{file.uploaderName}</dd>
            </div>
          )}
          {file.projectName && (
            <div>
              <dt className="text-gray-500">Project</dt>
              <dd className="text-indigo-600">{file.projectName}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={() => onCreateAsset(file)}
          className="w-full px-4 py-2 text-center bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Create Asset from this File
        </button>
        <a
          href={file.fileUrl}
          download={file.name}
          className="block w-full px-4 py-2 text-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Download
        </a>
        <button
          onClick={() => {
            if (confirm('Delete this file? This cannot be undone.')) {
              onDelete(file.id);
            }
          }}
          className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Main Component
export default function ToolsFiles() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);

  const pageSize = 20;

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await apiService.get('/files', { params });
      if (response.data.success) {
        setFiles(response.data.files);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      showNotification({ type: 'error', title: 'Failed to load files' });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, typeFilter, showNotification]);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiService.get('/files/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading file stats:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    loadFiles();
    loadStats();
  }, [user, navigate, loadFiles, loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadFiles();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter]);

  const handleUpload = async (fileList: FileList) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadingFiles(Array.from(fileList).map(f => f.name));
    try {
      const formData = new FormData();
      Array.from(fileList).forEach(file => formData.append('files', file));

      // Use axios directly for progress tracking
      const token = localStorage.getItem('authToken');
      const response = await axios.post(buildApiUrl('/files/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(percent);
          }
        }
      });

      if (response.data.success) {
        showNotification({ type: 'success', title: `${fileList.length} file${fileList.length !== 1 ? 's' : ''} uploaded successfully` });
        setShowUpload(false);
        loadFiles();
        loadStats();
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification({ type: 'error', title: 'Failed to upload files' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFiles([]);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await apiService.delete(`/files/${fileId}`);
      showNotification({ type: 'success', title: 'File deleted' });
      setSelectedFile(null);
      loadFiles();
      loadStats();
    } catch (error) {
      console.error('Delete error:', error);
      showNotification({ type: 'error', title: 'Failed to delete file' });
    }
  };

  const handleCreateAsset = async (file: FileItem) => {
    try {
      const response = await apiService.post('/api/assets', {
        fileId: file.id,
        name: file.name
      });
      if (response.data.success) {
        showNotification({ type: 'success', title: 'Asset created! Redirecting...' });
        // Navigate to assets page
        setTimeout(() => {
          navigate('/tools/assets');
        }, 500);
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      showNotification({ type: 'error', title: 'Failed to create asset' });
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Tools', path: '/tools' },
        { label: 'Files' }
      ]}
    >
      <div className="h-full flex">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Link
                  to="/tools"
                  className="inline-block text-sm text-indigo-600 hover:text-indigo-700 mb-2"
                >
                  ← Back to Tools
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Files</h1>
                {stats && (
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.totalFiles} files · {formatFileSize(stats.totalSize)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload
              </button>
            </div>

            {showUpload && (
              <div className="mb-4">
                <UploadZone
                  onUpload={handleUpload}
                  uploading={uploading}
                  uploadingFiles={uploadingFiles}
                  uploadProgress={uploadProgress}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FILE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mb-3" />
                <span className="text-sm">Loading files...</span>
              </div>
            ) : files.length === 0 ? (
              searchQuery || typeFilter !== 'all' ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📂</div>
                  <div className="text-gray-700 font-medium mb-1">No files found</div>
                  <div className="text-sm text-gray-500">
                    Try adjusting your search or filters
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={FileUp}
                  title={emptyStateConfigs.files.title}
                  description={emptyStateConfigs.files.description}
                  primaryCtaLabel={emptyStateConfigs.files.primaryCtaLabel}
                  onPrimaryCta={() => setShowUpload(true)}
                  secondaryCtaLabel="Go to Projects"
                  onSecondaryCta={() => navigate('/projects')}
                  learnMoreItems={emptyStateConfigs.files.learnMoreItems as unknown as string[]}
                />
              )
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      isSelected={selectedFile?.id === file.id}
                      onClick={() => setSelectedFile(file)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {selectedFile && (
          <FileDetailPanel
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
            onDelete={handleDelete}
            onCreateAsset={handleCreateAsset}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
