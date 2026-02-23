/**
 * ProjectFilesTab Component
 * Phase 4A: Designer-First Foundation
 *
 * Displays project files with integrated printing capabilities for 3D files.
 * Features:
 * - File grid/list view
 * - File type detection and icons
 * - Print button for STL/OBJ/GLTF/GCODE files
 * - Print status badges for queued/printing files
 * - File upload integration
 * - Context menu actions
 */

import React, { useState } from 'react';
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  FileCode,
  Printer,
  Download,
  Trash2,
  MoreVertical,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Box,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { QuickPrintDialog } from '../printing/QuickPrintDialog';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '@/lib/utils';
import type { QuickPrintConfig } from '@/types/printing';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { toast } from '@/lib/toast';
import { apiService } from '@/services/apiService';
import { config } from '@/config/environment';

// ============================================================================
// Type Definitions
// ============================================================================

interface ProjectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy?: string;
  url?: string;
  printStatus?: 'idle' | 'queued' | 'printing' | 'completed' | 'failed';
  printProgress?: number;
}

interface ProjectFilesTabProps {
  project: {
    id: string;
    name: string;
    files?: ProjectFile[];
  };
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if file is 3D printable
 */
function isPrintableFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ['stl', 'obj', 'gltf', 'glb', 'gcode', '3mf'].includes(ext || '');
}

/**
 * Get file icon based on type
 */
function getFileIcon(filename: string) {
  const ext = filename.toLowerCase().split('.').pop();

  // 3D files
  if (['stl', 'obj', 'gltf', 'glb', 'gcode', '3mf'].includes(ext || '')) {
    return <Box className="h-5 w-5" aria-hidden="true" />;
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return <Image className="h-5 w-5" aria-hidden="true" />;
  }

  // Videos
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
    return <Film className="h-5 w-5" aria-hidden="true" />;
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    return <Music className="h-5 w-5" aria-hidden="true" />;
  }

  // Code
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp'].includes(ext || '')) {
    return <FileCode className="h-5 w-5" aria-hidden="true" />;
  }

  // Archive
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) {
    return <Archive className="h-5 w-5" aria-hidden="true" />;
  }

  return <FileText className="h-5 w-5" aria-hidden="true" />;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// Print Status Badge Component
// ============================================================================

interface PrintStatusBadgeProps {
  status: 'idle' | 'queued' | 'printing' | 'completed' | 'failed';
  progress?: number;
}

const PrintStatusBadge: React.FC<PrintStatusBadgeProps> = ({ status, progress }) => {
  if (status === 'idle') return null;

  const config = {
    queued: {
      icon: <Clock className="h-3 w-3" aria-hidden="true" />,
      label: 'Queued',
      variant: 'secondary' as const,
    },
    printing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
      label: `Printing ${progress || 0}%`,
      variant: 'default' as const,
    },
    completed: {
      icon: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
      label: 'Printed',
      variant: 'success' as const,
    },
    failed: {
      icon: <XCircle className="h-3 w-3" aria-hidden="true" />,
      label: 'Failed',
      variant: 'error' as const,
    },
  };

  const { icon, label, variant } = config[status];

  return (
    <Badge variant={variant} size="sm" className="flex items-center gap-1">
      {icon}
      {label}
    </Badge>
  );
};

// ============================================================================
// File Card Component
// ============================================================================

interface FileCardProps {
  file: ProjectFile;
  onPrint: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
  onDelete: (file: ProjectFile) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onPrint, onDownload, onDelete }) => {
  const isPrintable = isPrintableFile(file.name);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 text-neutral-600 mt-1">
            {getFileIcon(file.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-neutral-900 truncate text-sm mb-1">
              {file.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.uploadedAt)}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              aria-label="File actions"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPrintable && (
              <>
                <DropdownMenuItem
                  onClick={() => config.ENABLE_FLUXPRINT ? onPrint(file) : null}
                  disabled={!config.ENABLE_FLUXPRINT}
                  className={!config.ENABLE_FLUXPRINT ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
                  {config.ENABLE_FLUXPRINT ? "Print This File" : "Print (Coming Soon)"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(file)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <PrintStatusBadge status={file.printStatus || 'idle'} progress={file.printProgress} />
        </div>

        {isPrintable && file.printStatus === 'idle' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrint(file)}
            icon={<Printer className="h-4 w-4" aria-hidden="true" />}
            className="flex-shrink-0"
          >
            Print
          </Button>
        )}
      </div>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ProjectFilesTab: React.FC<ProjectFilesTabProps> = ({ project, className = '' }) => {
  // ============================================================================
  // State
  // ============================================================================

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // Real data fetching with React Query
  const {
    files,
    isLoading,
    error,
    refetch,
    uploadFiles,
    uploadProgress,
    deleteFile,
  } = useProjectFiles({
    projectId: project.id,
    enabled: true,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePrint = (file: ProjectFile) => {
    setSelectedFile(file);
    setIsPrintDialogOpen(true);
  };

  const handlePrintSubmit = async (config: QuickPrintConfig) => {
    if (!selectedFile) return;

    try {
      const result = await apiService.quickPrint({
        filename: selectedFile.name,
        projectId: project.id,
        config: config as unknown as Parameters<typeof apiService.quickPrint>[0]['config']
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to queue print job');
      }

      toast.success(`Print queued! Job #${(result.data as { queueId: string }).queueId}`);

      // Refetch files to update status
      refetch();

      // Close dialog
      setIsPrintDialogOpen(false);
      setSelectedFile(null);
    } catch (error: unknown) {
      toast.error(`Failed to print: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so QuickPrintDialog can handle loading state
    }
  };

  const handleDownload = (file: ProjectFile) => {
    if (!file.url) {
      toast.error('File URL not available');
      return;
    }

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Downloading ${file.name}`);
  };

  const handleDelete = (file: ProjectFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    deleteFile.mutate(file.id, {
      onSuccess: () => {
        toast.success(`Deleted ${file.name}`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to delete: ${error.message}`);
      },
    });
  };

  const handleUpload = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.stl,.obj,.gltf,.glb,.gcode,.3mf,.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.md';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;

      if (!files || files.length === 0) return;

      toast.info(`Uploading ${files.length} file(s)...`);

      uploadFiles.mutate(files, {
        onSuccess: (data) => {
          const uploadData = data as { files: { length: number }[] };
          toast.success(`Uploaded ${uploadData.files.length} file(s) successfully`);
        },
        onError: (error: Error) => {
          toast.error(`Upload failed: ${error.message}`);
        },
      });
    };

    input.click();
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden="true" />
        <p className="ml-3 text-neutral-600">Loading files...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <XCircle className="h-16 w-16 text-error-500 mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Failed to load files</h3>
        <p className="text-neutral-600 mb-4">{error.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (files.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <FileText className="h-16 w-16 text-neutral-300 mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No files yet</h3>
        <p className="text-neutral-600 text-center mb-6 max-w-md">
          Upload design files, 3D models, documentation, and more. Files marked as printable (STL,
          OBJ, GCODE) will get a Print button.
        </p>
        <Button variant="primary" onClick={handleUpload} icon={<Upload className="h-4 w-4" aria-hidden="true" />}>
          Upload Files
        </Button>
      </div>
    );
  }

  const hasPrintableFiles = files.some((f) => isPrintableFile(f.name));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Coming Soon Banner for Print Feature */}
      {!config.ENABLE_FLUXPRINT && hasPrintableFiles && (
        <Alert className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
          <Printer className="h-5 w-5 text-primary-600" aria-hidden="true" />
          <AlertDescription className="text-sm">
            <strong className="block mb-1">3D Printing Coming Soon!</strong>
            <span className="text-neutral-600">
              You have {files.filter((f) => isPrintableFile(f.name)).length} printable file(s).
              The 3D printing feature will be available soon, allowing you to print directly from FluxStudio.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Progress Bar */}
      {uploadFiles.isLoading && (
        <Card className="p-4 bg-primary-50 border-primary-200">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="h-5 w-5 text-primary-600 animate-pulse" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-neutral-900">Uploading files...</span>
                <span className="text-sm text-primary-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <p className="text-xs text-neutral-600 ml-8">
              Please wait while your files are being uploaded...
            </p>
          )}
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Project Files</h2>
          <p className="text-neutral-600 text-sm mt-1">
            {files.length} file{files.length !== 1 ? 's' : ''} •{' '}
            {files.filter((f) => isPrintableFile(f.name)).length} printable
          </p>
        </div>
        <Button variant="primary" onClick={handleUpload} icon={<Upload className="h-4 w-4" aria-hidden="true" />}>
          Upload Files
        </Button>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onPrint={handlePrint}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Quick Print Dialog */}
      <QuickPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => {
          setIsPrintDialogOpen(false);
          setSelectedFile(null);
        }}
        filename={selectedFile?.name || ''}
        fileSize={selectedFile?.size}
        onPrint={handlePrintSubmit}
        projectId={project.id}
      />
    </div>
  );
};

export default ProjectFilesTab;
