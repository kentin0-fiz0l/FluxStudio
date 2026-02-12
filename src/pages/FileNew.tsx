/**
 * Files Page - FluxStudio
 *
 * Full-featured file management dashboard with uploads, previews, and project linking.
 *
 * Features:
 * - Real-time file listing from backend API
 * - File uploads with drag-and-drop and progress tracking
 * - Search, filter by type/source
 * - Grid and list view modes
 * - File actions (preview, rename, delete, link to project)
 * - Integration with Connectors for imported files
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/templates';
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Card, CardContent } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useFilesOptional, FileRecord, FileType, FileSource } from '../contexts/FilesContext';
import { useProjects } from '../hooks/useProjects';
import { useReportEntityFocus } from '../hooks/useWorkMomentumCapture';
import { useProjectContext } from '@/store';
import { toast } from '../lib/toast';
import { cn, formatFileSize, formatRelativeTime } from '../lib/utils';
import {
  Upload,
  LayoutGrid,
  List as ListIcon,
  Search,
  FolderOpen,
  Image,
  Video,
  Music,
  FileText,
  File,
  Archive,
  Code,
  Download,
  Pencil,
  Trash2,
  Link2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Cloud,
  Github,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Eye
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

// File type icons
const fileTypeIcons: Record<string, React.ReactNode> = {
  image: <Image className="h-5 w-5 text-blue-500" />,
  video: <Video className="h-5 w-5 text-purple-500" />,
  audio: <Music className="h-5 w-5 text-pink-500" />,
  document: <FileText className="h-5 w-5 text-orange-500" />,
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  text: <Code className="h-5 w-5 text-green-500" />,
  code: <Code className="h-5 w-5 text-green-500" />,
  archive: <Archive className="h-5 w-5 text-amber-500" />,
  other: <File className="h-5 w-5 text-neutral-400" />
};

// Source icons
const sourceIcons: Record<string, React.ReactNode> = {
  upload: <Upload className="h-4 w-4" />,
  connector: <Cloud className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
  google_drive: <Cloud className="h-4 w-4" />,
  dropbox: <Cloud className="h-4 w-4" />,
  onedrive: <HardDrive className="h-4 w-4" />,
  generated: <File className="h-4 w-4" />
};

// Type filter options
const typeFilterOptions: { value: FileType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'text', label: 'Text/Code' },
  { value: 'archive', label: 'Archives' },
  { value: 'other', label: 'Other' }
];

// Source filter options
const sourceFilterOptions: { value: FileSource; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'upload', label: 'Uploads' },
  { value: 'connector', label: 'Connectors' },
  { value: 'generated', label: 'Generated' }
];

// File card component
interface FileCardItemProps {
  file: FileRecord;
  view: ViewMode;
  onPreview: (file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onRename: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onLinkProject: (file: FileRecord) => void;
}

const FileCardItem: React.FC<FileCardItemProps> = ({
  file,
  view,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onLinkProject
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const icon = fileTypeIcons[file.fileType] || fileTypeIcons.other;
  const sourceIcon = file.provider ? sourceIcons[file.provider] : sourceIcons[file.source];

  if (view === 'grid') {
    return (
      <Card
        className="group cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onPreview(file)}
      >
        <CardContent className="p-4">
          {/* Thumbnail or icon */}
          <div className="aspect-video bg-neutral-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
            {file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : file.isImage && file.fileUrl ? (
              <img
                src={file.fileUrl}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-neutral-400 scale-150">
                {icon}
              </div>
            )}

            {/* Source badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="default" size="sm" className="flex items-center gap-1 bg-white/90">
                {sourceIcon}
                <span className="capitalize">{file.provider || file.source}</span>
              </Badge>
            </div>

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/90 hover:bg-white text-neutral-900"
                onClick={(e) => { e.stopPropagation(); onPreview(file); }}
                aria-label="Preview file"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/90 hover:bg-white text-neutral-900"
                onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                aria-label="Download file"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* File info */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-neutral-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{formatRelativeTime(file.createdAt)}</span>
              </div>
              {file.projectName && (
                <div className="text-xs text-primary-600 mt-1 truncate">
                  Linked to: {file.projectName}
                </div>
              )}
            </div>

            {/* Menu button */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRename(file); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" /> Rename
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onLinkProject(file); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <Link2 className="h-4 w-4" /> {file.projectId ? 'Change Project' : 'Link to Project'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownload(file); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(file); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card
      className="group cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => onPreview(file)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-neutral-900 truncate">{file.name}</h3>
              <Badge variant="default" size="sm" className="flex items-center gap-1">
                {sourceIcon}
                <span className="capitalize hidden sm:inline">{file.provider || file.source}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
              <span className="uppercase">{file.extension || file.fileType}</span>
              <span>•</span>
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatRelativeTime(file.createdAt)}</span>
              {file.projectName && (
                <>
                  <span>•</span>
                  <span className="text-primary-600 truncate">{file.projectName}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onPreview(file); }}
              aria-label="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDownload(file); }}
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onRename(file); }}
              aria-label="Rename"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(file); }}
              className="text-red-600"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function FileNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filesContext = useFilesOptional();
  const { projects } = useProjects();
  const { reportFile } = useReportEntityFocus();
  const projectContext = useProjectContext();
  const currentProject = projectContext?.currentProject ?? null;

  // Extract values from context (with defaults for when context is unavailable)
  const state = filesContext?.state;
  const refreshFiles = filesContext?.refreshFiles;
  const uploadFiles = filesContext?.uploadFiles;
  const renameFile = filesContext?.renameFile;
  const deleteFile = filesContext?.deleteFile;
  const linkFileToProject = filesContext?.linkFileToProject;
  const setFilters = filesContext?.setFilters;
  const setPage = filesContext?.setPage;
  const setSelectedFile = filesContext?.setSelectedFile;

  // UI State - ALL hooks must be called before any early returns
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [showRenameDialog, setShowRenameDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showLinkDialog, setShowLinkDialog] = React.useState(false);
  const [showPreviewDrawer, setShowPreviewDrawer] = React.useState(false);
  const [selectedFileForAction, setSelectedFileForAction] = React.useState<FileRecord | null>(null);
  const [newFileName, setNewFileName] = React.useState('');
  const [isDragging, setIsDragging] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);

  // Handle URL params for filtering - prioritize current project from context
  React.useEffect(() => {
    const urlProjectId = searchParams.get('projectId');
    const source = searchParams.get('source') as FileSource;

    // Use current project from context, or URL param as fallback
    const effectiveProjectId = currentProject?.id || urlProjectId;

    if (effectiveProjectId || source) {
      setFilters?.({
        projectId: effectiveProjectId || undefined,
        source: source || 'all'
      });
    } else {
      // Clear project filter when no project context
      setFilters?.({
        projectId: undefined,
        source: source || 'all'
      });
    }
  }, [searchParams, setFilters, currentProject]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== state?.filters.search) {
        setFilters?.({ search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, state?.filters.search, setFilters]);

  // Guard: If context not available, return null (handled by ProtectedRoute)
  // This check is AFTER all hooks to satisfy React's rules of hooks
  if (!filesContext || !user || !state || !refreshFiles || !uploadFiles ||
      !renameFile || !deleteFile || !linkFileToProject || !setFilters ||
      !setPage || !setSelectedFile) {
    return null;
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleUpload(files);
    }
  };

  // Upload handler
  const handleUpload = async (files: FileList | File[]) => {
    try {
      const uploaded = await uploadFiles(files);
      toast.success(`Uploaded ${uploaded.length} file(s)`);
      setShowUploadDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  // File input change handler
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  // Action handlers
  const handlePreview = (file: FileRecord) => {
    setSelectedFile(file);
    setShowPreviewDrawer(true);
    // Report to Work Momentum
    reportFile(file.id);
  };

  const handleDownload = (file: FileRecord) => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  const handleRenameClick = (file: FileRecord) => {
    setSelectedFileForAction(file);
    setNewFileName(file.name);
    setShowRenameDialog(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedFileForAction || !newFileName.trim()) return;

    try {
      await renameFile(selectedFileForAction.id, newFileName.trim());
      toast.success('File renamed');
      setShowRenameDialog(false);
      setSelectedFileForAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rename failed');
    }
  };

  const handleDeleteClick = (file: FileRecord) => {
    setSelectedFileForAction(file);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFileForAction) return;

    try {
      await deleteFile(selectedFileForAction.id);
      toast.success('File deleted');
      setShowDeleteDialog(false);
      setSelectedFileForAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleLinkProjectClick = (file: FileRecord) => {
    setSelectedFileForAction(file);
    setShowLinkDialog(true);
  };

  const handleLinkProject = async (projectId: string) => {
    if (!selectedFileForAction) return;

    try {
      await linkFileToProject(selectedFileForAction.id, projectId);
      toast.success('File linked to project');
      setShowLinkDialog(false);
      setSelectedFileForAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Link failed');
    }
  };

  // Stats
  const uploadingCount = Object.keys(state.uploadProgress).length;
  const hasUploads = uploadingCount > 0;

  return (
    <DashboardLayout
      user={user ? { name: user.name || user.email, email: user.email } : undefined}
      breadcrumbs={[{ label: 'Files' }]}
      onLogout={logout}
    >
      <div
        ref={dropZoneRef}
        className={cn(
          'p-6 min-h-full transition-colors',
          isDragging && 'bg-primary-50 ring-2 ring-primary-500 ring-inset'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-primary-500/10 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <Upload className="h-16 w-16 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900">Drop files to upload</h3>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
              <FolderOpen className="w-7 h-7 text-primary-600" aria-hidden="true" />
              Files
            </h1>
            <p className="text-neutral-600 mt-1">
              Uploads, imports, and generated assets in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={cn('h-4 w-4', state.loading && 'animate-spin')} />}
              onClick={() => refreshFiles()}
              disabled={state.loading}
            >
              Refresh
            </Button>
            <Button
              icon={<Upload className="h-4 w-4" />}
              onClick={() => setShowUploadDialog(true)}
            >
              Upload Files
            </Button>
          </div>
        </div>

        {/* Upload progress */}
        {hasUploads && (
          <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-900">
                  Uploading {uploadingCount} file(s)...
                </p>
                {Object.entries(state.uploadProgress).map(([filename, progress]) => (
                  <div key={filename} className="mt-2">
                    <div className="flex items-center justify-between text-xs text-primary-700 mb-1">
                      <span className="truncate">{filename}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-primary-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Search files"
            />
          </div>

          {/* Type filter */}
          <select
            value={state.filters.type}
            onChange={(e) => setFilters({ type: e.target.value as FileType | 'all' })}
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            aria-label="Filter by type"
          >
            {typeFilterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Source filter */}
          <select
            value={state.filters.source}
            onChange={(e) => setFilters({ source: e.target.value as FileSource })}
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            aria-label="Filter by source"
          >
            {sourceFilterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2',
                viewMode === 'grid' ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50'
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2',
                viewMode === 'list' ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4 text-sm text-neutral-600">
          <span>{state.pagination.total} file(s)</span>
          {state.filters.search && <span>matching "{state.filters.search}"</span>}
          {state.filters.type !== 'all' && <span>• Type: {state.filters.type}</span>}
          {state.filters.source !== 'all' && <span>• Source: {state.filters.source}</span>}
        </div>

        {/* Error */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{state.error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshFiles()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {state.loading && state.files.length === 0 ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 text-neutral-300 mx-auto mb-4 animate-spin" />
            <p className="text-neutral-600">Loading files...</p>
          </div>
        ) : state.files.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 text-neutral-200 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Files Found</h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              {state.filters.search || state.filters.type !== 'all' || state.filters.source !== 'all'
                ? 'Try adjusting your filters or search term.'
                : 'Upload files or connect a service to get started.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setShowUploadDialog(true)}
                icon={<Upload className="h-4 w-4" />}
              >
                Upload Files
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/connectors')}
                icon={<Cloud className="h-4 w-4" />}
              >
                Connect a Service
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Files grid/list */}
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-2'
            )}>
              {state.files.map((file) => (
                <FileCardItem
                  key={file.id}
                  file={file}
                  view={viewMode}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onRename={handleRenameClick}
                  onDelete={handleDeleteClick}
                  onLinkProject={handleLinkProjectClick}
                />
              ))}
            </div>

            {/* Pagination */}
            {state.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(state.pagination.page - 1)}
                  disabled={state.pagination.page <= 1}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <span className="text-sm text-neutral-600 px-4">
                  Page {state.pagination.page} of {state.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(state.pagination.page + 1)}
                  disabled={state.pagination.page >= state.pagination.totalPages}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
            </DialogHeader>

            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
                'border-neutral-300 hover:border-primary-500'
              )}
            >
              <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">
                Drag and drop files here, or click to select
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Files
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename File</DialogTitle>
            </DialogHeader>

            <Input
              label="New Name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameSubmit} disabled={!newFileName.trim()}>
                Rename
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete File</DialogTitle>
            </DialogHeader>

            <p className="text-neutral-600">
              Are you sure you want to delete "{selectedFileForAction?.name}"? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Link to Project Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary-600" />
                Link to Project
              </DialogTitle>
            </DialogHeader>

            {selectedFileForAction && (
              <p className="text-sm text-neutral-600 mb-4">
                Select a project to link "{selectedFileForAction.name}" to:
              </p>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">No projects available</p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLinkProject(project.id)}
                    className={cn(
                      'w-full p-3 text-left rounded-lg border transition-all',
                      selectedFileForAction?.projectId === project.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50'
                    )}
                  >
                    <p className="font-medium text-neutral-900">{project.name}</p>
                    <p className="text-xs text-neutral-500">{project.status}</p>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Drawer - will be implemented as FilePreviewDrawer component */}
        <Dialog open={showPreviewDrawer} onOpenChange={setShowPreviewDrawer}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{state.selectedFile?.name}</DialogTitle>
            </DialogHeader>

            {state.selectedFile && (
              <div className="space-y-4">
                {/* Preview area */}
                <div className="aspect-video bg-neutral-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {state.selectedFile.isImage ? (
                    <img
                      src={state.selectedFile.fileUrl}
                      alt={state.selectedFile.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl mb-4">
                        {fileTypeIcons[state.selectedFile.fileType]}
                      </div>
                      <p className="text-neutral-500">
                        Preview not available for {state.selectedFile.fileType} files
                      </p>
                    </div>
                  )}
                </div>

                {/* File details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">Size:</span>
                    <span className="ml-2 text-neutral-900">{formatFileSize(state.selectedFile.size)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Type:</span>
                    <span className="ml-2 text-neutral-900">{state.selectedFile.mimeType}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Source:</span>
                    <span className="ml-2 text-neutral-900 capitalize">{state.selectedFile.provider || state.selectedFile.source}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Created:</span>
                    <span className="ml-2 text-neutral-900">{formatRelativeTime(state.selectedFile.createdAt)}</span>
                  </div>
                  {state.selectedFile.projectName && (
                    <div className="col-span-2">
                      <span className="text-neutral-500">Project:</span>
                      <span className="ml-2 text-primary-600">{state.selectedFile.projectName}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => handleDownload(state.selectedFile!)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    icon={<Link2 className="h-4 w-4" />}
                    onClick={() => {
                      setShowPreviewDrawer(false);
                      handleLinkProjectClick(state.selectedFile!);
                    }}
                  >
                    Link to Project
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default FileNew;
