/**
 * FileVersionTracker Component
 * Tracks and displays file versions linked to conversations with visual diff capabilities
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  History,
  GitBranch,
  Download,
  Eye,
  MoreHorizontal,
  Clock,
  MessageSquare,
  GitCompare,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface FileVersion {
  id: string;
  filename: string;
  fileType: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  version: string;
  versionNumber: number;
  uploadedBy: MessageUser;
  uploadedAt: Date;
  conversationId: string;
  messageId: string;
  changelog?: string;
  isCurrentVersion: boolean;
  parentVersionId?: string;
  tags: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

interface FileVersionGroup {
  baseFilename: string;
  versions: FileVersion[];
  totalVersions: number;
  latestVersion: FileVersion;
  conversationIds: string[];
}

interface FileVersionTrackerProps {
  conversationId: string;
  className?: string;
  onVersionSelect?: (version: FileVersion) => void;
  onCompareVersions?: (version1: FileVersion, version2: FileVersion) => void;
}

// Mock data for demonstration
const mockFileVersions: FileVersion[] = [
  {
    id: 'v1',
    filename: 'logo-design-v1.figma',
    fileType: 'figma',
    url: '/mock/logo-v1.figma',
    thumbnailUrl: '/mock/logo-v1-thumb.png',
    size: 2.4 * 1024 * 1024,
    version: 'v1.0',
    versionNumber: 1,
    uploadedBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
    uploadedAt: new Date('2024-01-15T10:00:00Z'),
    conversationId: 'conv1',
    messageId: 'msg1',
    changelog: 'Initial logo concept with color variations',
    isCurrentVersion: false,
    tags: ['initial', 'concept'],
    approvalStatus: 'approved'
  },
  {
    id: 'v2',
    filename: 'logo-design-v2.figma',
    fileType: 'figma',
    url: '/mock/logo-v2.figma',
    thumbnailUrl: '/mock/logo-v2-thumb.png',
    size: 2.8 * 1024 * 1024,
    version: 'v2.0',
    versionNumber: 2,
    uploadedBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
    uploadedAt: new Date('2024-01-18T14:30:00Z'),
    conversationId: 'conv1',
    messageId: 'msg2',
    changelog: 'Refined typography and added monochrome version',
    isCurrentVersion: false,
    parentVersionId: 'v1',
    tags: ['refinement', 'typography'],
    approvalStatus: 'approved'
  },
  {
    id: 'v3',
    filename: 'logo-design-v3.figma',
    fileType: 'figma',
    url: '/mock/logo-v3.figma',
    thumbnailUrl: '/mock/logo-v3-thumb.png',
    size: 3.1 * 1024 * 1024,
    version: 'v3.0',
    versionNumber: 3,
    uploadedBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
    uploadedAt: new Date('2024-01-22T09:15:00Z'),
    conversationId: 'conv1',
    messageId: 'msg3',
    changelog: 'Client feedback incorporated - adjusted colors and spacing',
    isCurrentVersion: true,
    parentVersionId: 'v2',
    tags: ['client-feedback', 'final'],
    approvalStatus: 'pending'
  }
];

export function FileVersionTracker({
  conversationId,
  className,
  onVersionSelect,
  onCompareVersions
}: FileVersionTrackerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [showVersionHistory, setShowVersionHistory] = useState(true);

  // Group versions by base filename
  const fileGroups = useMemo(() => {
    const groups = new Map<string, FileVersion[]>();

    mockFileVersions
      .filter(version => version.conversationId === conversationId)
      .forEach(version => {
        const baseFilename = version.filename.replace(/-v\d+/, '').replace(/\.[^.]+$/, '');
        if (!groups.has(baseFilename)) {
          groups.set(baseFilename, []);
        }
        groups.get(baseFilename)!.push(version);
      });

    return Array.from(groups.entries()).map(([baseFilename, versions]) => {
      const sortedVersions = versions.sort((a, b) => b.versionNumber - a.versionNumber);
      return {
        baseFilename,
        versions: sortedVersions,
        totalVersions: versions.length,
        latestVersion: sortedVersions[0],
        conversationIds: [...new Set(versions.map(v => v.conversationId))]
      };
    });
  }, [conversationId]);

  const toggleGroupExpansion = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleVersionSelection = (versionId: string) => {
    const newSelected = new Set(selectedVersions);
    if (newSelected.has(versionId)) {
      newSelected.delete(versionId);
    } else {
      if (newSelected.size < 2) {
        newSelected.add(versionId);
      } else {
        // Replace oldest selection if we already have 2
        const [first] = newSelected;
        newSelected.delete(first);
        newSelected.add(versionId);
      }
    }
    setSelectedVersions(newSelected);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'figma':
      case 'sketch':
      case 'xd':
        return ImageIcon;
      case 'mp4':
      case 'mov':
        return Video;
      case 'pdf':
      case 'doc':
      case 'docx':
        return FileText;
      default:
        return File;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  const VersionCard = ({ version, isInGroup = false }: { version: FileVersion; isInGroup?: boolean }) => {
    const Icon = getFileIcon(version.fileType);
    const isSelected = selectedVersions.has(version.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-3 border rounded-lg cursor-pointer transition-all duration-200',
          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          isInGroup && 'ml-6'
        )}
        onClick={() => toggleVersionSelection(version.id)}
      >
        <div className="flex items-start gap-3">
          {/* File Icon/Thumbnail */}
          <div className="flex-shrink-0">
            {version.thumbnailUrl ? (
              <img
                src={version.thumbnailUrl}
                alt={version.filename}
                className="w-12 h-12 rounded border object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center">
                <Icon size={20} className="text-gray-600" />
              </div>
            )}
          </div>

          {/* Version Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {version.filename}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {version.isCurrentVersion && (
                  <Badge className="bg-blue-600 text-white text-xs">
                    Current
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {version.version}
                </Badge>
              </div>
            </div>

            {version.changelog && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {version.changelog}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={version.uploadedBy.avatar} />
                    <AvatarFallback className="text-xs">
                      {version.uploadedBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{version.uploadedBy.name}</span>
                </div>
                <span>{formatTimeAgo(version.uploadedAt)}</span>
                <span>{formatFileSize(version.size)}</span>
              </div>

              {version.approvalStatus && (
                <Badge
                  variant="outline"
                  className={cn('text-xs', getStatusColor(version.approvalStatus))}
                >
                  {version.approvalStatus}
                </Badge>
              )}
            </div>

            {version.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {version.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onVersionSelect?.(version)}>
                <Eye size={14} className="mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download size={14} className="mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare size={14} className="mr-2" />
                View in Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={20} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">File Versions</h3>
          <Badge variant="secondary">
            {fileGroups.reduce((sum, group) => sum + group.totalVersions, 0)} versions
          </Badge>
        </div>

        <div className="flex gap-2">
          {selectedVersions.size === 2 && (
            <Button
              size="sm"
              onClick={() => {
                const [v1, v2] = Array.from(selectedVersions);
                const version1 = mockFileVersions.find(v => v.id === v1);
                const version2 = mockFileVersions.find(v => v.id === v2);
                if (version1 && version2) {
                  onCompareVersions?.(version1, version2);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <GitCompare size={14} className="mr-1" />
              Compare
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
          >
            <GitBranch size={14} className="mr-1" />
            {showVersionHistory ? 'Hide' : 'Show'} History
          </Button>
        </div>
      </div>

      {showVersionHistory && (
        <div className="space-y-3">
          {fileGroups.map(group => (
            <Card key={group.baseFilename}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleGroupExpansion(group.baseFilename)}
                  >
                    {expandedGroups.has(group.baseFilename) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <CardTitle className="text-sm">{group.baseFilename}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {group.totalVersions} versions
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Latest: {group.latestVersion.version}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Always show latest version */}
                <VersionCard version={group.latestVersion} />

                {/* Show older versions when expanded */}
                <AnimatePresence>
                  {expandedGroups.has(group.baseFilename) && group.versions.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Separator />
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>Version History</span>
                      </div>
                      {group.versions.slice(1).map(version => (
                        <VersionCard key={version.id} version={version} isInGroup />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}

          {fileGroups.length === 0 && (
            <div className="text-center py-8">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No file versions found
              </h3>
              <p className="text-gray-500">
                File versions will appear here when files are shared in this conversation
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selection Info */}
      {selectedVersions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-900">
              {selectedVersions.size} version{selectedVersions.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedVersions(new Set())}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileVersionTracker;