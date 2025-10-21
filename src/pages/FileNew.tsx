/**
 * Files Page - Redesigned with Flux Design Language
 *
 * Modern file management interface using the new component library.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/templates';
import { FileCard } from '../components/molecules';
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useFiles } from '../hooks/useFiles';
import {
  Folder,
  FolderPlus,
  Upload,
  LayoutGrid,
  List as ListIcon,
  Home,
  ChevronRight,
  Clock,
  Share2,
  Star
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type TabFilter = 'all' | 'recent' | 'shared' | 'starred';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  modifiedAt: Date;
  owner?: string;
  shared?: boolean;
  starred?: boolean;
  thumbnail?: string;
}

export function FileNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { files: backendFiles, loading } = useFiles();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Mock file data (replace with real data from useFiles)
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'Design Assets',
      type: 'folder',
      modifiedAt: new Date('2024-10-08'),
      owner: 'John Doe'
    },
    {
      id: '2',
      name: 'Project Files',
      type: 'folder',
      modifiedAt: new Date('2024-10-08'),
      owner: 'John Doe',
      starred: true
    },
    {
      id: '3',
      name: 'winter-show-script.pdf',
      type: 'file',
      size: 2048576,
      mimeType: 'application/pdf',
      modifiedAt: new Date('2024-10-07'),
      owner: 'John Doe',
      starred: true,
      shared: true
    },
    {
      id: '4',
      name: 'design-mockup.png',
      type: 'file',
      size: 2097152,
      mimeType: 'image/png',
      modifiedAt: new Date('2024-10-08'),
      owner: 'Jane Smith',
      starred: true,
      thumbnail: 'https://placeholders.dev/300x200'
    },
    {
      id: '5',
      name: 'demo-video.mp4',
      type: 'file',
      size: 15728640,
      mimeType: 'video/mp4',
      modifiedAt: new Date('2024-10-08'),
      owner: 'John Doe'
    },
    {
      id: '6',
      name: 'background-music.mp3',
      type: 'file',
      size: 4194304,
      mimeType: 'audio/mpeg',
      modifiedAt: new Date('2024-10-08'),
      owner: 'John Doe'
    }
  ]);

  // Tab options
  const tabOptions = [
    { value: 'all' as TabFilter, label: 'All Files', icon: Folder },
    { value: 'recent' as TabFilter, label: 'Recent', icon: Clock },
    { value: 'shared' as TabFilter, label: 'Shared', icon: Share2 },
    { value: 'starred' as TabFilter, label: 'Starred', icon: Star }
  ];

  // Filter files based on active tab and search
  const filteredFiles = useMemo(() => {
    let result = files;

    // Filter by tab
    switch (activeTab) {
      case 'recent':
        result = files
          .filter(f => f.type === 'file')
          .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
          .slice(0, 10);
        break;
      case 'shared':
        result = files.filter(f => f.shared);
        break;
      case 'starred':
        result = files.filter(f => f.starred);
        break;
      default:
        result = files.filter(f => !currentFolder);  // Only show root items
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [files, activeTab, searchTerm, currentFolder]);

  // Handlers
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: FileItem = {
      id: Date.now().toString(),
      name: newFolderName,
      type: 'folder',
      modifiedAt: new Date(),
      owner: user?.name || 'You'
    };

    setFiles(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      // Navigate into folder
      setCurrentFolder(file.id);
      setBreadcrumbs(prev => [...prev, { id: file.id, name: file.name }]);
    } else {
      // Open file preview
      console.log('Open file:', file.name);
    }
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentFolder(crumb.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleNavigateToRoot = () => {
    setCurrentFolder(null);
    setBreadcrumbs([]);
  };

  const handleToggleStar = (fileId: string) => {
    setFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, starred: !f.starred } : f)
    );
  };

  return (
    <DashboardLayout
      user={user}
      breadcrumbs={[{ label: 'Files' }]}
      onSearch={setSearchTerm}
      onLogout={logout}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-3">
              <Folder className="w-8 h-8 text-primary-600" aria-hidden="true" />
              Files
            </h1>
            <p className="text-neutral-600 mt-1">
              Organize and share your files with your team
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowNewFolder(true)}
              icon={<FolderPlus className="w-4 h-4" aria-hidden="true" />}
            >
              New Folder
            </Button>
            <Button
              onClick={() => setShowUpload(true)}
              icon={<Upload className="w-4 h-4" aria-hidden="true" />}
            >
              Upload Files
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={handleNavigateToRoot}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span>Home</span>
            </button>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                <button
                  onClick={() => handleNavigateToBreadcrumb(index)}
                  className="text-primary-600 hover:text-primary-700 transition-colors"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-neutral-200 pb-px">
          {tabOptions.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="default" size="md">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              aria-label="List view"
            >
              <ListIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Files Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Files Found</h3>
            <p className="text-neutral-600 mb-6">
              {searchTerm
                ? 'Try adjusting your search'
                : 'Create a folder or upload files to get started'}
            </p>
            {!searchTerm && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowNewFolder(true)}
                  icon={<FolderPlus className="w-4 h-4" aria-hidden="true" />}
                >
                  New Folder
                </Button>
                <Button
                  onClick={() => setShowUpload(true)}
                  icon={<Upload className="w-4 h-4" aria-hidden="true" />}
                >
                  Upload Files
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-2'
          }>
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                view={viewMode}
                showActions
                showSize={file.type === 'file'}
                showModified
                showOwner
                onClick={() => handleFileClick(file)}
                onDownload={(f) => console.log('Download:', f.name)}
                onShare={(f) => console.log('Share:', f.name)}
                onDelete={(f) => setFiles(prev => prev.filter(item => item.id !== f.id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors">
              <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-4" aria-hidden="true" />
              <p className="text-neutral-600 mb-2">
                Drag and drop files here, or click to select
              </p>
              <Button variant="secondary" size="sm">
                Choose Files
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowUpload(false)}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
