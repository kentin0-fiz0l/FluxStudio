import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  FileText,
  Star,
  Paperclip,
  Image,
  Video,
  MoreVertical,
  Search,
  Plus,
  Eye,
  Download,
  Share2,
  Zap,
  Target
} from 'lucide-react';
import { useMessaging } from '../../hooks/useMessaging';
import { LazyImage } from '../LazyImage';
import {
  Priority,
  MessageUser
} from '../../types/messaging';

interface ProjectCommunicationWidgetProps {
  projectId: string;
  projectName?: string;
  className?: string;
  allowExpand?: boolean;
}

interface ProjectTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  count?: number;
  priority?: Priority;
}

interface ProjectMilestone {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: Date;
  progress: number;
  assignees: MessageUser[];
  priority: Priority;
}

interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: MessageUser;
  uploadedAt: Date;
  hasComments: boolean;
  commentCount: number;
  isLatestVersion: boolean;
  version: string;
}

// Factory functions to create mock data with fresh dates
function createMockProjectMilestones(): ProjectMilestone[] {
  const now = Date.now();
  return [
    {
      id: 'milestone-1',
      name: 'Uniform Design Concepts',
      status: 'completed',
      dueDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      progress: 100,
      assignees: [
        { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
      ],
      priority: 'high'
    },
    {
      id: 'milestone-2',
      name: 'Client Feedback Integration',
      status: 'in_progress',
      dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
      progress: 65,
      assignees: [
        { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
      ],
      priority: 'high'
    },
    {
      id: 'milestone-3',
      name: 'Final Designs & Production',
      status: 'pending',
      dueDate: new Date(now + 14 * 24 * 60 * 60 * 1000),
      progress: 0,
      assignees: [
        { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
      ],
      priority: 'medium'
    }
  ];
}

function createMockProjectFiles(): ProjectFile[] {
  const now = Date.now();
  return [
    {
      id: 'file-1',
      name: 'Fall_2024_Uniform_Concepts_v3.pdf',
      type: 'application/pdf',
      size: 2458000,
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      uploadedAt: new Date(now - 2 * 60 * 60 * 1000),
      hasComments: true,
      commentCount: 7,
      isLatestVersion: true,
      version: 'v3'
    },
    {
      id: 'file-2',
      name: 'Color_Palette_Options.png',
      type: 'image/png',
      size: 890000,
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      uploadedAt: new Date(now - 4 * 60 * 60 * 1000),
      hasComments: true,
      commentCount: 3,
      isLatestVersion: true,
      version: 'v1'
    },
    {
      id: 'file-3',
      name: 'Drill_Formation_Demo.mp4',
      type: 'video/mp4',
      size: 15600000,
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      uploadedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      hasComments: false,
      commentCount: 0,
      isLatestVersion: true,
      version: 'v1'
    }
  ];
}

// Default mock data - initialized once
const mockProjectMilestones = createMockProjectMilestones();
const mockProjectFiles = createMockProjectFiles();

function MilestoneCard({ milestone }: { milestone: ProjectMilestone }) {
  const getStatusColor = (status: ProjectMilestone['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isOverdue = milestone.dueDate < new Date() && milestone.status !== 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${
        isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      } hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-gray-900">{milestone.name}</h4>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(milestone.priority)}`}>
            {milestone.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
            {milestone.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{milestone.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${milestone.progress}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`h-2 rounded-full ${
              milestone.status === 'completed' ? 'bg-green-500' :
              milestone.status === 'blocked' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {milestone.assignees.map((assignee) => (
            <div
              key={assignee.id}
              className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center"
            >
              {assignee.avatar ? (
                <LazyImage src={assignee.avatar} alt={assignee.name} width={24} height={24} className="rounded-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-gray-600">
                  {assignee.name.charAt(0)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          Due {milestone.dueDate.toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}

function FileCard({ file }: { file: ProjectFile }) {
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Memoize the icon component to avoid creating during render
  const FileIcon = useMemo(() => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return FileText;
  }, [file.type]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileIcon size={16} className="text-gray-600" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900 truncate">{file.name}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.size)} • {file.version} • {file.uploadedBy.name}
              </p>
              <p className="text-xs text-gray-400">
                {file.uploadedAt.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Eye size={14} aria-hidden="true" />
              </button>
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Download size={14} aria-hidden="true" />
              </button>
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Share2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {file.hasComments && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <MessageSquare size={12} aria-hidden="true" />
                <span>{file.commentCount} comments</span>
              </div>
              {file.isLatestVersion && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Latest
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActivityFeed({ projectId }: { projectId: string }) {
  const { conversations, conversationMessages } = useMessaging();

  // Get project-related conversations
  const projectConversations = conversations.filter(conv =>
    conv.projectId === projectId || conv.type === 'project'
  );

  // conversationMessages is for the active conversation only (Message[])
  // Filter to show only messages from project conversations
  const projectConversationIds = new Set(projectConversations.map(c => c.id));
  const recentMessages = conversationMessages
    .filter(msg => projectConversationIds.has(msg.conversationId))
    .sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
    })
    .slice(0, 5);

  if (recentMessages.length === 0) {
    return (
      <div className="p-6 text-center">
        <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
        <p className="text-gray-500 text-sm">No recent project activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentMessages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {message.author.avatar ? (
              <LazyImage
                src={message.author.avatar}
                alt={message.author.name}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600">
                {message.author.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">{message.author.name}</span>
              <span className="text-xs text-gray-500">
                {(() => {
                  const dateObj = message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
                  return isNaN(dateObj.getTime()) ? 'Invalid time' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{message.content}</p>

            {message.attachments && message.attachments.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Paperclip size={12} className="text-gray-400" aria-hidden="true" />
                <span className="text-xs text-gray-500">
                  {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function ProjectCommunicationWidget({
  projectId,
  projectName = 'Fall 2024 Show',
  className = '',
  allowExpand = true
}: ProjectCommunicationWidgetProps) {
  const [activeTab, setActiveTab] = useState<string>('activity');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabs: ProjectTab[] = [
    {
      id: 'activity',
      label: 'Activity',
      icon: Zap,
      count: 12
    },
    {
      id: 'milestones',
      label: 'Milestones',
      icon: Target,
      count: mockProjectMilestones.filter(m => m.status !== 'completed').length,
      priority: 'high'
    },
    {
      id: 'files',
      label: 'Files',
      icon: FileText,
      count: mockProjectFiles.length
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      count: 4
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return <ActivityFeed projectId={projectId} />;

      case 'milestones':
        return (
          <div className="space-y-3">
            {mockProjectMilestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </div>
        );

      case 'files':
        return (
          <div className="space-y-3">
            {mockProjectFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        );

      case 'team':
        return (
          <div className="p-6 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
            <p className="text-gray-500 text-sm">Team management coming soon</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star size={16} className="text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{projectName}</h3>
              <p className="text-sm text-gray-500">Project Communication</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Search size={16} aria-hidden="true" />
            </button>

            {allowExpand && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-200 text-blue-800'
                    : tab.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`${isExpanded ? 'h-96' : 'h-64'} overflow-y-auto transition-all duration-300`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <MessageSquare size={16} aria-hidden="true" />
            <span className="text-sm font-medium">New Message</span>
          </button>

          <button className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus size={16} aria-hidden="true" />
            <span className="text-sm font-medium">Add File</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectCommunicationWidget;