import React from 'react';
import { apiService } from '@/services/apiService';
import type { Project } from '@/components/printing/file-browser/utils';
import type { GCodeFile } from '@/types/printing';

interface UseFileBrowserOptions {
  files: { files: GCodeFile[]; total: number; free: number } | null | undefined;
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (filename: string) => Promise<void>;
  onAddToQueue?: (filename: string) => Promise<void>;
}

export function useFileBrowser({ files, onUpload, onDelete, onAddToQueue }: UseFileBrowserOptions) {
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

  const fileList = React.useMemo(() => files?.files || [], [files?.files]);
  const hasFiles = fileList.length > 0;

  // Fetch user's projects on mount
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const result = await apiService.get<{ projects: Array<{ id: string; title: string }> }>('/projects');
        setProjects(result.data?.projects?.map((p) => ({
          id: p.id,
          title: p.title
        })) || []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };

    fetchProjects();
  }, []);

  // Fetch project files when a project is selected
  React.useEffect(() => {
    if (!selectedProject || selectedProject === 'all') {
      setProjectFiles(new Map());
      return;
    }

    const fetchProjectFiles = async () => {
      try {
        const result = await apiService.get<{ files: Array<{ filename: string }> }>(`/api/printing/projects/${selectedProject}/files`);
        const fileMap = new Map<string, string>();

        result.data?.files?.forEach((f) => {
          fileMap.set(f.filename, selectedProject);
        });

        setProjectFiles(fileMap);
      } catch (err) {
        console.error('Failed to fetch project files:', err);
      }
    };

    fetchProjectFiles();
  }, [selectedProject]);

  const handleLinkToProject = async (filename: string, projectId: string) => {
    setLinkingFile(filename);
    try {
      await apiService.post(`/api/printing/files/${encodeURIComponent(filename)}/link`, { project_id: projectId });
      setProjectFiles(prev => new Map(prev).set(filename, projectId));
      setLinkModalOpen(false);
      setFileToLink(null);
    } catch (err) {
      console.error('Failed to link file:', err);
      alert(err instanceof Error ? err.message : 'Failed to link file to project');
    } finally {
      setLinkingFile(null);
    }
  };

  const handleUnlinkFile = async (filename: string) => {
    setLinkingFile(filename);
    try {
      await apiService.delete(`/api/printing/files/${encodeURIComponent(filename)}/link`);
      const newMap = new Map(projectFiles);
      newMap.delete(filename);
      setProjectFiles(newMap);
    } catch (err) {
      console.error('Failed to unlink file:', err);
      alert(err instanceof Error ? err.message : 'Failed to unlink file');
    } finally {
      setLinkingFile(null);
    }
  };

  const handleOpenLinkModal = (filename: string) => {
    setFileToLink(filename);
    setLinkModalOpen(true);
  };

  const filteredFiles = React.useMemo(() => {
    let filtered = fileList;

    if (selectedProject && selectedProject !== 'all') {
      filtered = filtered.filter(file => projectFiles.has(file.name));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((file) =>
        (file.display || file.name).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fileList, searchQuery, selectedProject, projectFiles]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !onUpload) return;

    const invalidFiles = Array.from(selectedFiles).filter(
      (file) => !file.name.toLowerCase().endsWith('.gcode')
    );

    if (invalidFiles.length > 0) {
      alert('Only .gcode files are allowed');
      return;
    }

    setUploadProgress(0);
    try {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return {
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
  };
}
