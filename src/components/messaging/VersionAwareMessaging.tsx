/**
 * VersionAwareMessaging Component
 * Intelligent messaging system that tracks file versions and links conversations to design evolution
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  MessageSquare,
  ArrowRight,
  Clock,
  Download,
  History,
  Layers,
  Pin,
  Link,
  CheckCircle,
  PlayCircle,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Conversation, MessageUser, ImageAnnotation } from '../../types/messaging';
import { FileVersionTracker } from './FileVersionTracker';
import { RealtimeImageAnnotation } from './RealtimeImageAnnotation';
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
  annotations?: ImageAnnotation[];
}

interface VersionThread {
  id: string;
  baseFilename: string;
  versions: FileVersion[];
  conversations: Conversation[];
  totalMessages: number;
  startDate: Date;
  lastActivity: Date;
  status: 'active' | 'completed' | 'archived';
  milestones: VersionMilestone[];
  collaborators: MessageUser[];
  currentVersion: FileVersion;
}

interface VersionMilestone {
  id: string;
  versionId: string;
  type: 'approval' | 'revision' | 'feedback' | 'delivery';
  title: string;
  description: string;
  date: Date;
  user: MessageUser;
  status: 'completed' | 'pending' | 'skipped';
}

interface ConversationLink {
  id: string;
  fromConversationId: string;
  toConversationId: string;
  type: 'version_update' | 'feedback_response' | 'approval_request' | 'iteration';
  createdAt: Date;
  createdBy: MessageUser;
  context?: string;
}

interface VersionAwareMessagingProps {
  conversationId: string;
  currentUser: MessageUser;
  className?: string;
  onVersionSelect?: (version: FileVersion) => void;
  onConversationNavigate?: (conversationId: string) => void;
}

// Mock data for demonstration
const mockVersionThreads: VersionThread[] = [
  {
    id: 'thread-1',
    baseFilename: 'logo-design',
    versions: [
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
        approvalStatus: 'approved',
        annotations: []
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
        conversationId: 'conv2',
        messageId: 'msg2',
        changelog: 'Refined typography and added monochrome version',
        isCurrentVersion: false,
        parentVersionId: 'v1',
        tags: ['refinement', 'typography'],
        approvalStatus: 'approved',
        annotations: []
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
        conversationId: 'conv3',
        messageId: 'msg3',
        changelog: 'Client feedback incorporated - adjusted colors and spacing',
        isCurrentVersion: true,
        parentVersionId: 'v2',
        tags: ['client-feedback', 'final'],
        approvalStatus: 'pending',
        annotations: []
      }
    ],
    conversations: [
      {
        id: 'conv1',
        name: 'Logo Design - Initial Concept',
        type: 'project' as const,
        participants: [
          { id: 'u1', name: 'Sarah Designer', userType: 'designer' as const, avatar: '/mock/sarah.jpg' },
          { id: 'u2', name: 'John Client', userType: 'client' as const, avatar: '/mock/john.jpg' }
        ],
        lastMessage: {
          id: 'msg1',
          content: 'Here\'s the initial logo concept with multiple color variations.',
          author: { id: 'u1', name: 'Sarah Designer', userType: 'designer' as const, avatar: '/mock/sarah.jpg' },
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:00:00Z'),
          conversationId: 'conv1',
          type: 'text' as const,
          status: 'sent' as const,
          isEdited: false
        },
        metadata: { priority: 'medium', tags: ['design', 'logo'], isArchived: false, isMuted: false, isPinned: false },
        lastActivity: new Date('2024-01-15T16:30:00Z'),
        unreadCount: 0,
        permissions: { canWrite: true, canAddMembers: true, canArchive: true, canDelete: true },
        createdBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer' as const },
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T16:30:00Z')
      }
    ],
    totalMessages: 12,
    startDate: new Date('2024-01-15T10:00:00Z'),
    lastActivity: new Date('2024-01-22T09:15:00Z'),
    status: 'active',
    milestones: [
      {
        id: 'mile1',
        versionId: 'v1',
        type: 'feedback',
        title: 'Initial Concept Review',
        description: 'Client feedback on initial logo concepts',
        date: new Date('2024-01-16T14:00:00Z'),
        user: { id: 'u2', name: 'John Client', userType: 'client', avatar: '/mock/john.jpg' },
        status: 'completed'
      },
      {
        id: 'mile2',
        versionId: 'v2',
        type: 'revision',
        title: 'Typography Refinement',
        description: 'Refined typography based on feedback',
        date: new Date('2024-01-18T14:30:00Z'),
        user: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
        status: 'completed'
      },
      {
        id: 'mile3',
        versionId: 'v3',
        type: 'approval',
        title: 'Final Approval',
        description: 'Final version pending client approval',
        date: new Date('2024-01-22T09:15:00Z'),
        user: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
        status: 'pending'
      }
    ],
    collaborators: [
      { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
      { id: 'u2', name: 'John Client', userType: 'client', avatar: '/mock/john.jpg' },
      { id: 'u3', name: 'Mike Manager', userType: 'client', avatar: '/mock/mike.jpg' }
    ],
    currentVersion: {
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
      conversationId: 'conv3',
      messageId: 'msg3',
      changelog: 'Client feedback incorporated - adjusted colors and spacing',
      isCurrentVersion: true,
      parentVersionId: 'v2',
      tags: ['client-feedback', 'final'],
      approvalStatus: 'pending',
      annotations: []
    }
  }
];

const mockConversationLinks: ConversationLink[] = [
  {
    id: 'link1',
    fromConversationId: 'conv1',
    toConversationId: 'conv2',
    type: 'version_update',
    createdAt: new Date('2024-01-18T14:30:00Z'),
    createdBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
    context: 'Updated design based on feedback from initial concept'
  },
  {
    id: 'link2',
    fromConversationId: 'conv2',
    toConversationId: 'conv3',
    type: 'iteration',
    createdAt: new Date('2024-01-22T09:15:00Z'),
    createdBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
    context: 'Final iteration incorporating all client feedback'
  }
];

export function VersionAwareMessaging({
  conversationId,
  currentUser,
  className,
  onVersionSelect,
  onConversationNavigate: _onConversationNavigate
}: VersionAwareMessagingProps) {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedVersion, _setSelectedVersion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'versions' | 'annotations' | 'links'>('timeline');
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineSpeed, setTimelineSpeed] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [showExpanded, setShowExpanded] = useState(false);

  // Find current thread based on conversation
  const currentThread = useMemo(() => {
    return mockVersionThreads.find(thread =>
      thread.conversations.some(conv => conv.id === conversationId)
    );
  }, [conversationId]);

  // Filter threads based on search and status
  const filteredThreads = useMemo(() => {
    return mockVersionThreads.filter(thread => {
      const matchesSearch = searchQuery === '' ||
        thread.baseFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.collaborators.some(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = filterStatus === 'all' || thread.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, filterStatus]);

  // Get conversation links for current conversation
  const conversationLinks = useMemo(() => {
    return mockConversationLinks.filter(link =>
      link.fromConversationId === conversationId || link.toConversationId === conversationId
    );
  }, [conversationId]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'archived': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'approval': return CheckCircle;
      case 'revision': return RefreshCw;
      case 'feedback': return MessageSquare;
      case 'delivery': return Zap;
      default: return Clock;
    }
  };

  const VersionTimeline = ({ thread }: { thread: VersionThread }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isTimelinePlaying) {
        interval = setInterval(() => {
          setCurrentIndex(prev => (prev + 1) % thread.versions.length);
        }, 2000 / timelineSpeed);
      }
      return () => clearInterval(interval);
    }, [isTimelinePlaying, timelineSpeed, thread.versions.length]);

    return (
      <div className="space-y-4">
        {/* Timeline Controls */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
            >
              {isTimelinePlaying ? <Pause className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentIndex(Math.min(thread.versions.length - 1, currentIndex + 1))}
              disabled={currentIndex === thread.versions.length - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Speed:</span>
            <Select value={timelineSpeed.toString()} onValueChange={(value) => setTimelineSpeed(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timeline Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Version {currentIndex + 1} of {thread.versions.length}</span>
            <span>{thread.versions[currentIndex]?.version}</span>
          </div>
          <Progress value={(currentIndex / (thread.versions.length - 1)) * 100} />
        </div>

        {/* Current Version Display */}
        {thread.versions[currentIndex] && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-4 bg-white"
          >
            <div className="flex gap-4">
              {thread.versions[currentIndex].thumbnailUrl && (
                <img
                  src={thread.versions[currentIndex].thumbnailUrl}
                  alt={thread.versions[currentIndex].filename}
                  className="w-32 h-32 rounded border object-cover"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-lg mb-2">
                  {thread.versions[currentIndex].filename}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  {thread.versions[currentIndex].changelog}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={thread.versions[currentIndex].uploadedBy.avatar} />
                      <AvatarFallback>
                        {thread.versions[currentIndex].uploadedBy.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{thread.versions[currentIndex].uploadedBy.name}</span>
                  </div>
                  <span>{formatTimeAgo(thread.versions[currentIndex].uploadedAt)}</span>
                  <Badge variant="outline" className="text-xs">
                    {thread.versions[currentIndex].approvalStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Milestones */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            Project Milestones
          </h4>
          {thread.milestones.map((milestone) => {
            const Icon = getMilestoneIcon(milestone.type);
            const isActive = thread.versions[currentIndex]?.id === milestone.versionId;

            return (
              <motion.div
                key={milestone.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded border transition-all",
                  isActive ? "border-blue-500 bg-blue-50" : "border-gray-200"
                )}
                animate={{ scale: isActive ? 1.02 : 1 }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  milestone.status === 'completed' ? "bg-green-100 text-green-600" :
                  milestone.status === 'pending' ? "bg-yellow-100 text-yellow-600" :
                  "bg-gray-100 text-gray-400"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{milestone.title}</p>
                  <p className="text-xs text-gray-500">{milestone.description}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(milestone.date)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const ConversationLinksView = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Link className="w-4 h-4" />
        Related Conversations
      </h4>
      {conversationLinks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No linked conversations</p>
        </div>
      ) : (
        conversationLinks.map(link => (
          <Card key={link.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm capitalize">
                    {link.type.replace('_', ' ')}
                  </p>
                  {link.context && (
                    <p className="text-xs text-gray-500">{link.context}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(link.createdAt)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <Card className="border-b rounded-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Version-Aware Messaging</CardTitle>
                <p className="text-sm text-gray-500">
                  Track design evolution through conversations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpanded(!showExpanded)}
              >
                {showExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search threads, collaborators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Threads Sidebar */}
        <div className="w-80 border-r bg-gray-50">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Version Threads</h3>
                <Badge variant="secondary">{filteredThreads.length}</Badge>
              </div>

              {filteredThreads.map(thread => (
                <Card
                  key={thread.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedThread === thread.id ? "border-blue-500 bg-blue-50" : "hover:shadow-md"
                  )}
                  onClick={() => setSelectedThread(thread.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {thread.currentVersion.thumbnailUrl && (
                        <img
                          src={thread.currentVersion.thumbnailUrl}
                          alt={thread.baseFilename}
                          className="w-12 h-12 rounded border object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {thread.baseFilename}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          {thread.versions.length} versions • {thread.totalMessages} messages
                        </p>

                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(thread.status)}>
                            {thread.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(thread.lastActivity)}
                          </span>
                        </div>

                        <div className="flex -space-x-1 mt-2">
                          {thread.collaborators.slice(0, 3).map(user => (
                            <Avatar key={user.id} className="w-5 h-5 border border-white">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-xs">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {thread.collaborators.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-gray-100 border border-white text-xs flex items-center justify-center">
                              +{thread.collaborators.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <Card className="border-b rounded-none">
                <CardContent className="p-4">
                  {(() => {
                    const thread = filteredThreads.find(t => t.id === selectedThread);
                    if (!thread) return null;

                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{thread.baseFilename}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>{thread.versions.length} versions</span>
                            <span>{thread.totalMessages} messages</span>
                            <span>{thread.collaborators.length} collaborators</span>
                            <Badge className={getStatusColor(thread.status)}>
                              {thread.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export Thread
                          </Button>
                          <Button size="sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            New Message
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
                <div className="border-b">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="versions">Versions</TabsTrigger>
                    <TabsTrigger value="annotations">Annotations</TabsTrigger>
                    <TabsTrigger value="links">Links</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="timeline" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        {(() => {
                          const thread = filteredThreads.find(t => t.id === selectedThread);
                          return thread ? <VersionTimeline thread={thread} /> : null;
                        })()}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="versions" className="h-full m-0">
                    <FileVersionTracker
                      conversationId={conversationId}
                      onVersionSelect={onVersionSelect}
                      className="h-full"
                    />
                  </TabsContent>

                  <TabsContent value="annotations" className="h-full m-0">
                    <div className="h-full">
                      {selectedVersion ? (
                        <RealtimeImageAnnotation
                          imageUrl={mockVersionThreads[0].currentVersion.url}
                          annotations={mockVersionThreads[0].currentVersion.annotations || []}
                          currentUser={currentUser}
                          onAnnotationsChange={(_annotations) => {
                            // Handle annotation changes
                          }}
                          conversationId={conversationId}
                          fileVersionId={selectedVersion}
                          className="h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Select a version to view annotations</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="links" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <ConversationLinksView />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a Version Thread</h3>
                <p className="text-sm">
                  Choose a thread from the sidebar to view its timeline and version history
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Thread Indicator */}
      {currentThread && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm">
            <Pin className="w-4 h-4" />
            <span>Active Thread: {currentThread.baseFilename}</span>
            <Badge variant="outline" className="bg-blue-700 border-blue-500 text-white">
              {currentThread.currentVersion.version}
            </Badge>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default VersionAwareMessaging;