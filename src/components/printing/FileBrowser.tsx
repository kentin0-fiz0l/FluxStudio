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
  FileText,
  Upload,
  AlertCircle,
  Search,
  HardDrive,
  Folder,
} from 'lucide-react';
import { FileBrowserProps } from '@/types/printing';
import { cn } from '@/lib/utils';
import { useFileBrowser } from '@/hooks/useFileBrowser';
import { formatFileSize } from './file-browser/utils';
import { FileItem } from './file-browser/FileItem';
import { FileDeleteDialog } from './file-browser/FileDeleteDialog';
import { FileLinkDialog } from './file-browser/FileLinkDialog';

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  loading = false,
  error = null,
  onUpload,
  onDelete,
  onAddToQueue,
  className = '',
}) => {
  const {
    searchQuery,
    setSearchQuery,
    uploadProgress,
    deleteFile,
    setDeleteFile,
    addingFile,
    fileInputRef,
    projects,
    selectedProject,
    setSelectedProject,
    projectFiles,
    linkingFile,
    linkModalOpen,
    setLinkModalOpen,
    fileToLink,
    setFileToLink,
    fileList,
    hasFiles,
    filteredFiles,
    handleLinkToProject,
    handleUnlinkFile,
    handleOpenLinkModal,
    handleFileSelect,
    handleDelete,
    handleAddToQueue,
    handleUploadClick,
  } = useFileBrowser({ files, onUpload, onDelete, onAddToQueue });

  // Loading state
  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
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
            <FileText className="h-5 w-5" aria-hidden="true" />
            G-code Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-error-600 dark:text-error-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
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
              <FileText className="h-5 w-5" aria-hidden="true" />
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
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden space-y-4">
          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="space-y-2 p-3 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary-900 dark:text-primary-200">Uploading...</span>
                <span className="text-primary-700 dark:text-primary-300">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filter by Project</label>
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
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      All Files
                    </div>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" aria-hidden="true" />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden="true" />
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
                <FileText className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">No Files</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Upload G-code files to get started
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  className="mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                  Upload Files
                </Button>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <Search className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mx-auto" aria-hidden="true" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No files match your search</p>
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
          <div className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-3 bg-neutral-50 dark:bg-neutral-900">
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {formatFileSize(files.total - files.free)} / {formatFileSize(files.total)} used
                </span>
              </div>
              <span className="text-neutral-500 dark:text-neutral-500">
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
      <FileDeleteDialog
        filename={deleteFile}
        onClose={() => setDeleteFile(null)}
        onConfirm={handleDelete}
      />

      {/* Link to Project Dialog */}
      <FileLinkDialog
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        filename={fileToLink}
        projects={projects}
        isLinking={!!linkingFile}
        onLink={handleLinkToProject}
        onCancel={() => {
          setLinkModalOpen(false);
          setFileToLink(null);
        }}
      />
    </>
  );
};

export default FileBrowser;
