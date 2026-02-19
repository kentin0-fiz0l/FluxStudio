/**
 * FileBrowser Component
 * G-code file browser with upload and management
 * Phase 3D: Added project selector and file linking
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  FileText,
  Upload,
  Trash2,
  Plus,
  AlertCircle,
  Search,
  HardDrive,
  Link as LinkIcon,
  Folder,
  X,
} from 'lucide-react';
import { FileBrowserProps, GCodeFile } from '@/types/printing';
import { cn } from '@/lib/utils';

/**
 * Project type
 */
interface Project {
  id: string;
  title: string;
}

/**
 * Format file size in human-readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format date
 */
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

/**
 * File Item Component
 */
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

const FileItem: React.FC<FileItemProps> = ({
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
    <div className="group p-3 bg-white border border-neutral-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-neutral-900 truncate">
                  {file.display || file.name}
                </h4>
                {isLinked && projectName && (
                  <Badge variant="outline" size="sm" className="flex items-center gap-1 shrink-0">
                    <Folder className="h-3 w-3" />
                    <span className="max-w-[100px] truncate">{projectName}</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
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
              <Plus className="h-3 w-3 mr-1" />
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
                <LinkIcon className="h-3 w-3 mr-1" />
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
                <X className="h-3 w-3 mr-1" />
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
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  loading = false,
  error = null,
  onUpload,
  onDelete,
  onAddToQueue,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [deleteFile, setDeleteFile] = React.useState<string | null>(null);
  const [addingFile, setAddingFile] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Phase 3D: Project integration state
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null);
  const [projectFiles, setProjectFiles] = React.useState<Map<string, string>>(new Map());
  const [linkingFile, setLinkingFile] = React.useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [fileToLink, setFileToLink] = React.useState<string | null>(null);

  const fileList = files?.files || [];
  const hasFiles = fileList.length > 0;

  /**
   * Fetch user's projects on mount
   */
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects?.map((p: Record<string, unknown>) => ({
            id: p.id,
            title: p.title
          })) || []);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };

    fetchProjects();
  }, []);

  /**
   * Fetch project files when a project is selected
   */
  React.useEffect(() => {
    if (!selectedProject || selectedProject === 'all') {
      setProjectFiles(new Map());
      return;
    }

    const fetchProjectFiles = async () => {
      try {
        const response = await fetch(`/api/printing/projects/${selectedProject}/files`);
        if (response.ok) {
          const data = await response.json();
          const fileMap = new Map<string, string>();

          data.files?.forEach((f: { filename: string }) => {
            fileMap.set(f.filename, selectedProject);
          });

          setProjectFiles(fileMap);
        }
      } catch (err) {
        console.error('Failed to fetch project files:', err);
      }
    };

    fetchProjectFiles();
  }, [selectedProject]);

  /**
   * Link file to project handler
   */
  const handleLinkToProject = async (filename: string, projectId: string) => {
    setLinkingFile(filename);
    try {
      const response = await fetch(`/api/printing/files/${encodeURIComponent(filename)}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (response.ok) {
        // Update local state
        setProjectFiles(prev => new Map(prev).set(filename, projectId));
        setLinkModalOpen(false);
        setFileToLink(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to link file');
      }
    } catch (err) {
      console.error('Failed to link file:', err);
      alert('Failed to link file to project');
    } finally {
      setLinkingFile(null);
    }
  };

  /**
   * Unlink file from project
   */
  const handleUnlinkFile = async (filename: string) => {
    setLinkingFile(filename);
    try {
      const response = await fetch(`/api/printing/files/${encodeURIComponent(filename)}/link`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        const newMap = new Map(projectFiles);
        newMap.delete(filename);
        setProjectFiles(newMap);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to unlink file');
      }
    } catch (err) {
      console.error('Failed to unlink file:', err);
      alert('Failed to unlink file');
    } finally {
      setLinkingFile(null);
    }
  };

  /**
   * Open link modal for a file
   */
  const handleOpenLinkModal = (filename: string) => {
    setFileToLink(filename);
    setLinkModalOpen(true);
  };

  /**
   * Filter files based on search query and project selection
   */
  const filteredFiles = React.useMemo(() => {
    let filtered = fileList;

    // Filter by project if selected
    if (selectedProject && selectedProject !== 'all') {
      filtered = filtered.filter(file => projectFiles.has(file.name));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((file) =>
        (file.display || file.name).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fileList, searchQuery, selectedProject, projectFiles]);

  /**
   * Handle file upload
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !onUpload) return;

    // Validate file types
    const invalidFiles = Array.from(selectedFiles).filter(
      (file) => !file.name.toLowerCase().endsWith('.gcode')
    );

    if (invalidFiles.length > 0) {
      alert('Only .gcode files are allowed');
      return;
    }

    setUploadProgress(0);
    try {
      // Simulate progress (in real implementation, use XHR or fetch with progress)
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(Array.from(selectedFiles));

      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 1000);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload files');
      setUploadProgress(null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle delete file
   */
  const handleDelete = async (filename: string) => {
    if (!onDelete) return;

    setDeleteFile(filename);
    try {
      await onDelete(filename);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete file');
    } finally {
      setDeleteFile(null);
    }
  };

  /**
   * Handle add to queue
   */
  const handleAddToQueue = async (filename: string) => {
    if (!onAddToQueue) return;

    setAddingFile(filename);
    try {
      await onAddToQueue(filename);
    } catch (err) {
      console.error('Add to queue error:', err);
      alert('Failed to add file to queue');
    } finally {
      setAddingFile(null);
    }
  };

  /**
   * Trigger file input
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            G-code Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            G-code Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-error-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('h-full flex flex-col', className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              G-code Files
              {hasFiles && (
                <Badge variant="default" size="sm">
                  {fileList.length}
                </Badge>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploadProgress !== null}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden space-y-4">
          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="space-y-2 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary-900">Uploading...</span>
                <span className="text-primary-700">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Filter by Project</label>
              <Select
                value={selectedProject || 'all'}
                onValueChange={(value) => setSelectedProject(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Files" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      All Files
                    </div>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {project.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search */}
          {hasFiles && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* File List */}
          {!hasFiles ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <FileText className="h-12 w-12 text-neutral-300 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">No Files</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Upload G-code files to get started
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  className="mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <Search className="h-10 w-10 text-neutral-300 mx-auto" />
                <p className="text-sm text-neutral-500">No files match your search</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {filteredFiles.map((file) => {
                  const linkedProjectId = projectFiles.get(file.name);
                  const linkedProject = linkedProjectId
                    ? projects.find(p => p.id === linkedProjectId)
                    : null;

                  return (
                    <FileItem
                      key={file.path}
                      file={file}
                      onAddToQueue={handleAddToQueue}
                      onDelete={handleDelete}
                      onLinkToProject={handleOpenLinkModal}
                      onUnlink={handleUnlinkFile}
                      isAdding={addingFile === file.name}
                      isDeleting={deleteFile === file.name}
                      projectName={linkedProject?.title}
                      isLinked={!!linkedProjectId}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>

        {/* Storage Info Footer */}
        {files && hasFiles && (
          <div className="border-t border-neutral-200 px-6 py-3 bg-neutral-50">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5" />
                <span>
                  {formatFileSize(files.total - files.free)} / {formatFileSize(files.total)} used
                </span>
              </div>
              <span className="text-neutral-500">
                {fileList.length} {fileList.length === 1 ? 'file' : 'files'}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gcode"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteFile}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFile(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteFile) handleDelete(deleteFile);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to Project Dialog */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link File to Project</DialogTitle>
            <DialogDescription>
              Select a project to organize "{fileToLink}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                onValueChange={(projectId) => {
                  if (fileToLink) {
                    handleLinkToProject(fileToLink, projectId);
                  }
                }}
                disabled={!!linkingFile}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {project.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLinkModalOpen(false);
                setFileToLink(null);
              }}
              disabled={!!linkingFile}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileBrowser;
