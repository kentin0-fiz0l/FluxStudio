/**
 * Connectors Page - FluxStudio
 *
 * Full-featured integration dashboard with OAuth connection,
 * file browsing, and import functionality.
 *
 * Features:
 * - Real-time connector status from backend
 * - OAuth connect/disconnect flows
 * - File explorer for each provider
 * - Import files to FluxStudio
 * - Link imported files to projects
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud,
  Github,
  Droplet,
  HardDrive,
  Figma,
  MessageSquare,
  XCircle,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  File,
  FileImage,
  FileText,
  FileCode,
  ChevronRight,
  ChevronLeft,
  Download,
  Link2,
  ExternalLink,
  Loader2,
  Search,
  Grid3X3,
  List,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectors } from '@/store';
import type { Connector, ConnectorFile, ConnectorProvider, ImportedFile } from '@/store';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { UniversalEmptyState } from '@/components/ui/UniversalEmptyState';

// Provider icons
const providerIcons: Record<ConnectorProvider, React.ReactNode> = {
  github: <Github className="h-6 w-6" aria-hidden="true" />,
  google_drive: <Cloud className="h-6 w-6" aria-hidden="true" />,
  dropbox: <Droplet className="h-6 w-6" aria-hidden="true" />,
  onedrive: <HardDrive className="h-6 w-6" aria-hidden="true" />,
  figma: <Figma className="h-6 w-6" aria-hidden="true" />,
  slack: <MessageSquare className="h-6 w-6" aria-hidden="true" />,
};

// Provider colors
const providerColors: Record<ConnectorProvider, { bg: string; icon: string; border: string }> = {
  github: { bg: 'bg-neutral-900', icon: 'text-white', border: 'border-neutral-700' },
  google_drive: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  dropbox: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-200' },
  onedrive: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-200' },
  figma: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  slack: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200' },
};

// File type icons
const getFileIcon = (file: ConnectorFile) => {
  if (file.type === 'folder') return <FolderOpen className="h-5 w-5 text-amber-500" aria-hidden="true" />;
  if (file.type === 'repo') return <Github className="h-5 w-5 text-neutral-700" aria-hidden="true" />;

  const ext = file.name.split('.').pop()?.toLowerCase();
  const mime = file.mimeType?.toLowerCase() || '';

  if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return <FileImage className="h-5 w-5 text-pink-500" aria-hidden="true" />;
  }
  if (mime.includes('text') || ['txt', 'md', 'doc', 'docx', 'pdf'].includes(ext || '')) {
    return <FileText className="h-5 w-5 text-blue-500" aria-hidden="true" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'cpp', 'c', 'h'].includes(ext || '')) {
    return <FileCode className="h-5 w-5 text-green-500" aria-hidden="true" />;
  }

  return <File className="h-5 w-5 text-neutral-400" aria-hidden="true" />;
};

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Format relative time
const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Connector Card Component
interface ConnectorCardProps {
  connector: Connector;
  onConnect: () => void;
  onDisconnect: () => void;
  onBrowse: () => void;
  isActive: boolean;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
  connector,
  onConnect,
  onDisconnect,
  onBrowse,
  isActive,
}) => {
  const colors = providerColors[connector.id] || providerColors.github;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isActive && 'ring-2 ring-primary-500 ring-offset-2'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              colors.bg,
              colors.icon
            )}
            aria-hidden="true"
          >
            {providerIcons[connector.id]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900">{connector.name}</h3>
              {connector.status === 'connected' && (
                <Badge variant="success" size="sm">Connected</Badge>
              )}
              {connector.status === 'expired' && (
                <Badge variant="warning" size="sm">Expired</Badge>
              )}
            </div>
            <p className="text-sm text-neutral-600 mb-2">{connector.description}</p>
            {connector.username && (
              <p className="text-xs text-neutral-500">
                Signed in as <span className="font-medium">{connector.username}</span>
              </p>
            )}
          </div>

          {/* Status indicator */}
          <div
            className={cn(
              'w-3 h-3 rounded-full flex-shrink-0',
              connector.status === 'connected' && 'bg-green-500',
              connector.status === 'disconnected' && 'bg-neutral-300',
              connector.status === 'pending' && 'bg-amber-500',
              connector.status === 'expired' && 'bg-red-500'
            )}
            aria-label={`Status: ${connector.status}`}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100">
          {connector.status === 'connected' ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={onBrowse}
                icon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
              >
                Browse Files
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onConnect}
              icon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
            >
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// File Explorer Component
interface FileExplorerProps {
  provider: ConnectorProvider;
  files: ConnectorFile[];
  currentPath: string[];
  loading: boolean;
  onNavigate: (file: ConnectorFile) => void;
  onBack: () => void;
  onImport: (file: ConnectorFile) => void;
  onClose: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  provider,
  files,
  currentPath,
  loading,
  onNavigate,
  onBack,
  onImport,
  onClose,
}) => {
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [importing, setImporting] = React.useState<string | null>(null);

  const filteredFiles = React.useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(query));
  }, [files, searchQuery]);

  const handleImport = async (file: ConnectorFile) => {
    if (file.type === 'folder' || file.type === 'repo') {
      onNavigate(file);
      return;
    }
    setImporting(file.id);
    await onImport(file);
    setImporting(null);
  };

  // Get breadcrumb display
  const getBreadcrumbs = () => {
    const parts = [providerIcons[provider], 'Root'];
    if (provider === 'github' && currentPath.length > 0) {
      parts[1] = 'Repositories';
      if (currentPath[0]) {
        parts.push(currentPath[0]); // repo name
        if (currentPath.length > 1) {
          parts.push(...currentPath.slice(1).join('/').split('/'));
        }
      }
    } else {
      parts.push(...currentPath);
    }
    return parts;
  };

  return (
    <Card className="mt-6">
      <CardHeader className="border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close file explorer"
            >
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              {currentPath.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                  aria-label="Go back"
                >
                  Back
                </Button>
              )}
              <div className="flex items-center gap-1">
                {getBreadcrumbs().map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="h-4 w-4 text-neutral-300" aria-hidden="true" />}
                    <span className={i === getBreadcrumbs().length - 1 ? 'font-medium text-neutral-900' : ''}>
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-neutral-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Search files"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5',
                  viewMode === 'list' ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50'
                )}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5',
                  viewMode === 'grid' ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50'
                )}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 text-neutral-300 mx-auto mb-2 animate-spin" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <UniversalEmptyState
            icon={FolderOpen}
            title={searchQuery ? 'No matching files' : 'No files found'}
            description={searchQuery ? 'Try a different search term or clear the filter.' : 'This folder is empty or you don\'t have access to any files.'}
            illustration="file"
            size="sm"
            primaryAction={searchQuery ? { label: 'Clear search', onClick: () => setSearchQuery('') } : undefined}
          />
        ) : viewMode === 'list' ? (
          <table className="w-full" role="grid">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">Size</th>
                <th className="px-4 py-3 hidden md:table-cell">Modified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => file.type === 'folder' || file.type === 'repo' ? onNavigate(file) : null}
                      className={cn(
                        'flex items-center gap-3 text-left',
                        (file.type === 'folder' || file.type === 'repo') && 'cursor-pointer hover:text-primary-600'
                      )}
                    >
                      {getFileIcon(file)}
                      <div>
                        <span className="font-medium text-neutral-900">{file.name}</span>
                        {file.type === 'repo' && file.language && (
                          <span className="ml-2 text-xs text-neutral-500">{file.language}</span>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500 hidden sm:table-cell">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500 hidden md:table-cell">
                    {formatRelativeTime(file.modifiedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {file.webUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.webUrl, '_blank')}
                          aria-label={`Open ${file.name} in browser`}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      {file.type === 'file' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImport(file)}
                          disabled={importing === file.id}
                          icon={
                            importing === file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Download className="h-4 w-4" aria-hidden="true" />
                            )
                          }
                        >
                          Import
                        </Button>
                      )}
                      {(file.type === 'folder' || file.type === 'repo') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate(file)}
                          icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                          aria-label={`Open ${file.name}`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {filteredFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => file.type === 'folder' || file.type === 'repo' ? onNavigate(file) : handleImport(file)}
                className="group p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 flex items-center justify-center mb-2">
                    {getFileIcon(file)}
                  </div>
                  <span className="text-sm font-medium text-neutral-900 truncate w-full">
                    {file.name}
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    {file.type === 'folder' || file.type === 'repo'
                      ? file.type === 'repo' ? 'Repository' : 'Folder'
                      : formatFileSize(file.size)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Imported Files Section
interface ImportedFilesSectionProps {
  files: ImportedFile[];
  onLink: (fileId: string) => void;
}

const ImportedFilesSection: React.FC<ImportedFilesSectionProps> = ({ files, onLink }) => {
  if (files.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-neutral-400" aria-hidden="true" />
          Recently Imported
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-neutral-100">
          {files.slice(0, 10).map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
            >
              <div className="flex items-center gap-3">
                {providerIcons[file.provider]}
                <div>
                  <p className="font-medium text-neutral-900">{file.name}</p>
                  <p className="text-xs text-neutral-500">
                    Imported {formatRelativeTime(file.createdAt)}
                    {file.projectId && ' • Linked to project'}
                  </p>
                </div>
              </div>
              {!file.projectId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLink(file.id)}
                  icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
                >
                  Link to Project
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Connectors Page
export default function Connectors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    state,
    setCurrentProvider,
    setError,
    fetchConnectors,
    connect,
    disconnect,
    fetchFiles,
    importFile,
    fetchImportedFiles,
    linkFileToProject: _linkFileToProject,
    navigateToFolder,
    navigateBack,
  } = useConnectors();

  // Get notifications context for showing import success
  let showToast: ((title: string, message: string, type?: string) => void) | undefined;
  try {
    const notificationContext = useNotifications();
    showToast = (title, message, type = 'info') => {
      notificationContext.addToast({
        type: type as 'info' | 'success' | 'warning' | 'error',
        title,
        message,
        priority: 'medium',
      });
    };
  } catch {
    // Notifications context not available
  }

  // Handle browse files
  const handleBrowse = async (provider: ConnectorProvider) => {
    setCurrentProvider(provider);
    await fetchFiles(provider);
  };

  // Handle import
  const handleImport = async (file: ConnectorFile) => {
    if (!state.currentProvider) return;

    const imported = await importFile(state.currentProvider, file.id);
    if (imported && showToast) {
      showToast('File Imported', `Successfully imported "${file.name}"`, 'info');
    }
  };

  // Handle link to project (navigate to projects with file pre-selected)
  const handleLinkToProject = (fileId: string) => {
    navigate(`/projects?linkFile=${fileId}`);
  };

  // Close file explorer
  const handleCloseExplorer = () => {
    setCurrentProvider(null);
  };

  // Fetch imported files on mount
  React.useEffect(() => {
    fetchImportedFiles();
  }, [fetchImportedFiles]);

  // Group connectors by category
  const groupedConnectors = React.useMemo(() => {
    const groups: Record<string, Connector[]> = {};
    for (const connector of state.connectors) {
      if (!groups[connector.category]) {
        groups[connector.category] = [];
      }
      groups[connector.category].push(connector);
    }
    return groups;
  }, [state.connectors]);

  const connectedCount = state.connectors.filter(c => c.status === 'connected').length;

  return (
    <DashboardLayout
      user={user ? { name: user.name || user.email, email: user.email } : undefined}
      breadcrumbs={[{ label: 'Connectors' }]}
    >
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900" id="connectors-page-heading">
              Integrations
            </h1>
            <p className="text-neutral-600 mt-1">
              Connect your favorite tools and services to enhance your workflow.
              {connectedCount > 0 && (
                <Badge variant="info" size="sm" className="ml-2">
                  {connectedCount} connected
                </Badge>
              )}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={cn('h-4 w-4', state.loading && 'animate-spin')} aria-hidden="true" />}
            onClick={() => fetchConnectors()}
            disabled={state.loading}
            aria-label="Refresh connectors"
          >
            Refresh
          </Button>
        </div>

        {/* Error message */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{state.error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Loading state */}
        {state.loading && state.connectors.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 text-neutral-300 mx-auto mb-2 animate-spin" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Loading connectors...</p>
          </div>
        ) : (
          <>
            {/* Connectors by category */}
            <div className="space-y-8" role="region" aria-labelledby="connectors-page-heading">
              {Object.entries(groupedConnectors).map(([category, connectors]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connectors.map((connector) => (
                      <ConnectorCard
                        key={connector.id}
                        connector={connector}
                        onConnect={() => connect(connector.id)}
                        onDisconnect={() => disconnect(connector.id)}
                        onBrowse={() => handleBrowse(connector.id)}
                        isActive={state.currentProvider === connector.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* File Explorer */}
            {state.currentProvider && (
              <FileExplorer
                provider={state.currentProvider}
                files={state.files}
                currentPath={state.currentPath}
                loading={state.filesLoading}
                onNavigate={navigateToFolder}
                onBack={navigateBack}
                onImport={handleImport}
                onClose={handleCloseExplorer}
              />
            )}

            {/* Recently Imported Files */}
            <ImportedFilesSection
              files={state.importedFiles}
              onLink={handleLinkToProject}
            />

            {/* Request Integration CTA */}
            <Card className="mt-8 bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary-900 mb-1">
                      Need a new integration?
                    </h3>
                    <p className="text-primary-700">
                      We're constantly adding new integrations. Let us know what tools you use
                      and we'll prioritize them in our roadmap.
                    </p>
                  </div>
                  <Button variant="primary">
                    Request Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
