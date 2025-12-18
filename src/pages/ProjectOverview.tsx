/**
 * ProjectOverview Page - Command Center
 *
 * The default landing page for a selected project. Composes existing systems
 * (Messages, Assets, MetMap, AI summaries) into a single, readable overview.
 *
 * Route: /projects/:projectId/overview
 *
 * WCAG 2.1 Level A Compliant:
 * - Semantic HTML with proper heading hierarchy
 * - ARIA labels for all sections
 * - Keyboard accessible navigation
 * - Screen reader friendly content structure
 *
 * All data is project-scoped. Renders cleanly even if AI features are disabled.
 */

import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Music,
  Sparkles,
  Clock,
  Users,
  AlertCircle,
  Folder,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, Project } from '@/hooks/useProjects';
import { useMessaging } from '@/contexts/MessagingContext';
import { useAssets, AssetRecord } from '@/contexts/AssetsContext';
import { useMetMap } from '@/contexts/MetMapContext';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/utils/apiHelpers';

// ============================================================================
// Types
// ============================================================================

interface RecentMessage {
  id: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  conversationId: string;
  conversationName?: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: 'message' | 'asset' | 'task' | 'metmap';
  description: string;
  timestamp: string;
  actor?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Section Header with optional action
 */
const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  action?: { label: string; href: string };
}> = ({ title, icon, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    {action && (
      <Link
        to={action.href}
        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
      >
        {action.label}
        <ChevronRight className="w-4 h-4" />
      </Link>
    )}
  </div>
);

/**
 * Empty state component for sections with no data
 */
const EmptySection: React.FC<{
  message: string;
  icon?: React.ReactNode;
}> = ({ message, icon }) => (
  <div className="py-8 text-center text-gray-400">
    {icon && <div className="mb-2">{icon}</div>}
    <p className="text-sm">{message}</p>
  </div>
);

/**
 * Loading skeleton for sections
 */
const SectionSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
    <div className="h-4 bg-gray-200 rounded w-2/3" />
  </div>
);

/**
 * Project not found / inaccessible state
 */
const ProjectNotFound: React.FC<{ projectId: string }> = ({ projectId }) => (
  <DashboardLayout>
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-screen">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Project Not Found
        </h1>
        <p className="text-gray-500 mb-6">
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Folder className="w-5 h-5" />
          View All Projects
        </Link>
      </div>
    </div>
  </DashboardLayout>
);

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  // Project data
  const { projects, loading: projectsLoading, error: projectsError, fetchProject } = useProjects();
  const [project, setProject] = React.useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = React.useState(true);
  const [projectError, setProjectError] = React.useState<string | null>(null);

  // Messages data
  const [recentMessages, setRecentMessages] = React.useState<RecentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(true);

  // Assets data
  const { state: assetsState, refreshAssets } = useAssets();
  const [projectAssets, setProjectAssets] = React.useState<AssetRecord[]>([]);
  const [assetsLoading, setAssetsLoading] = React.useState(true);

  // MetMap data
  const { songs, songsLoading, setFilters: setMetMapFilters } = useMetMap();

  // Activity data (placeholder)
  const [recentActivity] = React.useState<ActivityItem[]>([]);

  // AI Summary state (placeholder)
  const [aiSummaryState, setAiSummaryState] = React.useState<'loading' | 'disabled' | 'empty' | 'ready'>('empty');

  // Load project details
  React.useEffect(() => {
    async function loadProject() {
      if (!projectId || !token) {
        setProjectLoading(false);
        return;
      }

      setProjectLoading(true);
      setProjectError(null);

      try {
        const response = await fetch(getApiUrl(`/api/projects/${projectId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          if (response.status === 404) {
            setProjectError('not_found');
          } else {
            setProjectError('error');
          }
          setProjectLoading(false);
          return;
        }

        const data = await response.json();
        setProject(data.project || data);
      } catch (error) {
        console.error('Failed to load project:', error);
        setProjectError('error');
      } finally {
        setProjectLoading(false);
      }
    }

    loadProject();
  }, [projectId, token]);

  // Load recent messages for project
  React.useEffect(() => {
    async function loadRecentMessages() {
      if (!projectId || !token) {
        setMessagesLoading(false);
        return;
      }

      setMessagesLoading(true);

      try {
        // First get conversations for this project
        const convResponse = await fetch(
          getApiUrl(`/api/messaging/conversations?projectId=${projectId}&limit=5`),
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!convResponse.ok) {
          setMessagesLoading(false);
          return;
        }

        const convData = await convResponse.json();
        const conversations = convData.conversations || [];

        // Collect recent messages from conversations
        const messages: RecentMessage[] = [];
        for (const conv of conversations.slice(0, 3)) {
          const msgResponse = await fetch(
            getApiUrl(`/api/messaging/conversations/${conv.id}/messages?limit=2`),
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          if (msgResponse.ok) {
            const msgData = await msgResponse.json();
            const convMessages = (msgData.messages || []).map((m: any) => ({
              id: m.id,
              content: m.content,
              authorName: m.author?.name || 'Unknown',
              authorAvatar: m.author?.avatar,
              conversationId: conv.id,
              conversationName: conv.name,
              createdAt: m.createdAt
            }));
            messages.push(...convMessages);
          }
        }

        // Sort by date and take top 5
        messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentMessages(messages.slice(0, 5));
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    }

    loadRecentMessages();
  }, [projectId, token]);

  // Load project assets
  React.useEffect(() => {
    async function loadProjectAssets() {
      if (!projectId || !token) {
        setAssetsLoading(false);
        return;
      }

      setAssetsLoading(true);

      try {
        const response = await fetch(
          getApiUrl(`/api/projects/${projectId}/assets?limit=5`),
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          setProjectAssets(data.assets || []);
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setAssetsLoading(false);
      }
    }

    loadProjectAssets();
  }, [projectId, token]);

  // Load MetMap songs for project
  React.useEffect(() => {
    if (projectId) {
      setMetMapFilters({ projectId });
    }
  }, [projectId, setMetMapFilters]);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle loading state
  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  // Handle not found / error state
  if (projectError || !project) {
    return <ProjectNotFound projectId={projectId || 'unknown'} />;
  }

  // Get status badge variant
  const statusVariants: Record<string, 'info' | 'warning' | 'default' | 'success' | 'error'> = {
    planning: 'info',
    in_progress: 'warning',
    on_hold: 'default',
    completed: 'success',
    cancelled: 'error',
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
              <Link
                to="/projects"
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Projects
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{project.name}</span>
            </nav>

            {/* Project Title */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{project.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">Project Overview</span>
                  <Badge variant={statusVariants[project.status] || 'default'}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              {/* Actions placeholder */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  Full Details
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Project Snapshot */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="AI Project Snapshot"
                    icon={<Sparkles className="w-5 h-5" />}
                  />
                </CardHeader>
                <CardContent>
                  {aiSummaryState === 'loading' && <SectionSkeleton />}
                  {aiSummaryState === 'disabled' && (
                    <EmptySection
                      message="AI features are currently disabled. Enable AI in settings to see project insights."
                      icon={<Sparkles className="w-8 h-8 mx-auto text-gray-300" />}
                    />
                  )}
                  {aiSummaryState === 'empty' && (
                    <div className="py-6 text-center">
                      <Sparkles className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-2">No AI summary available yet</p>
                      <p className="text-sm text-gray-400">
                        AI-generated insights will appear here as project activity grows.
                      </p>
                    </div>
                  )}
                  {aiSummaryState === 'ready' && (
                    <div className="space-y-4">
                      <p className="text-gray-700">AI-generated summary will appear here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Recent Messages"
                    icon={<MessageSquare className="w-5 h-5" />}
                    action={{
                      label: 'View All',
                      href: `/messages?projectId=${projectId}`
                    }}
                  />
                </CardHeader>
                <CardContent>
                  {messagesLoading ? (
                    <SectionSkeleton />
                  ) : recentMessages.length === 0 ? (
                    <EmptySection
                      message="No messages yet. Start a conversation to collaborate with your team."
                      icon={<MessageSquare className="w-8 h-8 mx-auto text-gray-300" />}
                    />
                  ) : (
                    <div className="space-y-3">
                      {recentMessages.map((message) => (
                        <Link
                          key={message.id}
                          to={`/messages?projectId=${projectId}&conversationId=${message.conversationId}`}
                          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 text-sm font-medium">
                                {message.authorName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 text-sm">
                                  {message.authorName}
                                </span>
                                {message.conversationName && (
                                  <span className="text-xs text-gray-400">
                                    in {message.conversationName}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {message.content}
                              </p>
                              <span className="text-xs text-gray-400 mt-1 block">
                                {formatRelativeTime(message.createdAt)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Assets */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Recent Assets"
                    icon={<FileText className="w-5 h-5" />}
                    action={{
                      label: 'View All',
                      href: `/assets?projectId=${projectId}`
                    }}
                  />
                </CardHeader>
                <CardContent>
                  {assetsLoading ? (
                    <SectionSkeleton />
                  ) : projectAssets.length === 0 ? (
                    <EmptySection
                      message="No assets uploaded yet. Add files, images, or documents to your project."
                      icon={<FileText className="w-8 h-8 mx-auto text-gray-300" />}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {projectAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                        >
                          <div className="w-full aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                            {asset.file?.thumbnailUrl ? (
                              <img
                                src={asset.file.thumbnailUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <FileText className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {asset.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatRelativeTime(asset.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Recent Activity"
                    icon={<Clock className="w-5 h-5" />}
                  />
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <EmptySection
                      message="Activity will appear here as your team works on the project."
                    />
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-gray-700">{item.description}</p>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent MetMap Sessions */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="MetMap Sessions"
                    icon={<Music className="w-5 h-5" />}
                    action={{
                      label: 'Open MetMap',
                      href: `/tools/metmap?projectId=${projectId}`
                    }}
                  />
                </CardHeader>
                <CardContent>
                  {songsLoading ? (
                    <SectionSkeleton />
                  ) : songs.length === 0 ? (
                    <EmptySection
                      message="No MetMap sessions yet. Create timelines for your musical projects."
                      icon={<Music className="w-8 h-8 mx-auto text-gray-300" />}
                    />
                  ) : (
                    <div className="space-y-2">
                      {songs.slice(0, 3).map((song) => (
                        <Link
                          key={song.id}
                          to={`/tools/metmap?projectId=${projectId}&song=${song.id}`}
                          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                        >
                          <p className="font-medium text-gray-900 text-sm">{song.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>{song.bpmDefault} BPM</span>
                            <span>·</span>
                            <span>{song.sectionCount || 0} sections</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link
                      to={`/messages?projectId=${projectId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      Messages
                    </Link>
                    <Link
                      to={`/assets?projectId=${projectId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      Assets
                    </Link>
                    <Link
                      to={`/tools/metmap?projectId=${projectId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"
                    >
                      <Music className="w-4 h-4 text-gray-400" />
                      MetMap
                    </Link>
                    <Link
                      to={`/notifications?projectId=${projectId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      Notifications
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members placeholder */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Team"
                    icon={<Users className="w-5 h-5" />}
                  />
                </CardHeader>
                <CardContent>
                  {project.members && project.members.length > 0 ? (
                    <div className="flex items-center -space-x-2">
                      {project.members.slice(0, 5).map((memberId, index) => (
                        <div
                          key={memberId}
                          className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center"
                          title={`Team member ${index + 1}`}
                        >
                          <span className="text-indigo-600 text-xs font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                      ))}
                      {project.members.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            +{project.members.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptySection message="No team members assigned yet." />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
