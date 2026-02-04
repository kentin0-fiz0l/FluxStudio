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
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Activity,
  Target,
  Zap,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/hooks/useProjects';
import { AssetRecord } from '@/contexts/AssetsContext';
import { useMetMap } from '@/contexts/MetMapContext';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/utils/apiHelpers';
import { isMetMapAsset } from '@/utils/assetHelpers';
import { MetMapAssetCard } from '@/components/assets/MetMapAssetCard';
import { useMomentumStallNotification } from '@/hooks/useMomentumStallNotification';
import { isRecoveryActive, clearRecovery } from '@/utils/momentumRecovery';
import { MomentumRecoveryPanel } from '@/components/projects/MomentumRecoveryPanel';
import { TeamAlignmentPanel } from '@/components/projects/TeamAlignmentPanel';

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

// Summary types matching ConversationSummary component
type PulseTone = 'calm' | 'neutral' | 'intense';
type ClarityState = 'focused' | 'mixed' | 'uncertain';

interface SummaryContent {
  summary?: string[];
  decisions?: Array<{ text: string; decidedBy?: string }>;
  openQuestions?: Array<{ text: string; askedBy?: string }>;
  nextSteps?: Array<{ text: string; priority?: string }>;
  sentiment?: string;
}

interface ConversationSummaryData {
  id: string;
  conversationId: string;
  conversationName?: string;
  projectId?: string;
  content: SummaryContent;
  pulseTone: PulseTone;
  clarityState: ClarityState;
  generatedBy: string;
  messageCount: number;
  updatedAt: string;
}

interface AggregatedSnapshot {
  whatsHappening: string[];
  decisions: Array<{ text: string; decidedBy?: string; conversationName?: string }>;
  openQuestions: Array<{ text: string; askedBy?: string; conversationName?: string }>;
  nextSteps: Array<{ id: string; text: string; priority?: string }>;
  overallPulse: PulseTone;
  overallClarity: ClarityState;
  lastUpdated: string;
  summaryCount: number;
  totalMessages: number;
  aiEnabled: boolean;
}

// Next step status lifecycle
type NextStepStatus = 'suggested' | 'accepted' | 'completed';

interface NextStepState {
  [stepId: string]: NextStepStatus;
}

// Generate a stable ID for a next step based on its text
function generateStepId(text: string): string {
  // Create a simple hash from the text for stable identification
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `step_${Math.abs(hash).toString(36)}`;
}

// LocalStorage key for next step states
function getNextStepStorageKey(projectId: string): string {
  return `fluxstudio_nextsteps_${projectId}`;
}

// Load next step states from localStorage
function loadNextStepStates(projectId: string): NextStepState {
  try {
    const stored = localStorage.getItem(getNextStepStorageKey(projectId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return {};
}

// Save next step states to localStorage
function saveNextStepStates(projectId: string, states: NextStepState): void {
  try {
    localStorage.setItem(getNextStepStorageKey(projectId), JSON.stringify(states));
  } catch {
    // localStorage not available
  }
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
 * Snapshot pulse/clarity indicator - shows project health at a glance
 */
const SnapshotPulseIndicator: React.FC<{
  pulse: PulseTone;
  clarity: ClarityState;
}> = ({ pulse, clarity }) => {
  const pulseConfig = {
    calm: { icon: Activity, label: 'Steady pace', color: 'text-green-600' },
    neutral: { icon: Activity, label: 'Active', color: 'text-blue-600' },
    intense: { icon: Zap, label: 'High activity', color: 'text-orange-600' },
  };

  const clarityConfig = {
    focused: { icon: Target, label: 'Clear direction', color: 'text-green-600' },
    mixed: { icon: Target, label: 'Mixed signals', color: 'text-yellow-600' },
    uncertain: { icon: HelpCircle, label: 'Needs clarity', color: 'text-orange-600' },
  };

  const pulseInfo = pulseConfig[pulse];
  const clarityInfo = clarityConfig[clarity];
  const PulseIcon = pulseInfo.icon;
  const ClarityIcon = clarityInfo.icon;

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <PulseIcon className={cn('w-3.5 h-3.5', pulseInfo.color)} />
        <span>{pulseInfo.label}</span>
      </div>
      <span className="text-gray-300">|</span>
      <div className="flex items-center gap-1.5">
        <ClarityIcon className={cn('w-3.5 h-3.5', clarityInfo.color)} />
        <span>{clarityInfo.label}</span>
      </div>
    </div>
  );
};

/**
 * Project not found / inaccessible state
 */
const ProjectNotFound: React.FC<{ projectId: string }> = ({ projectId: _projectId }) => (
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
  const [project, setProject] = React.useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = React.useState(true);
  const [projectError, setProjectError] = React.useState<string | null>(null);

  // Messages data
  const [recentMessages, setRecentMessages] = React.useState<RecentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(true);

  // Assets data
  const [projectAssets, setProjectAssets] = React.useState<AssetRecord[]>([]);
  const [assetsLoading, setAssetsLoading] = React.useState(true);

  // MetMap data
  const { songs, songsLoading, setFilters: setMetMapFilters } = useMetMap();

  // Activity data (derived from recent data)
  const [recentActivity, setRecentActivity] = React.useState<ActivityItem[]>([]);

  // AI Snapshot state
  const [aiSummaryState, setAiSummaryState] = React.useState<'loading' | 'disabled' | 'empty' | 'ready'>('loading');
  const [snapshot, setSnapshot] = React.useState<AggregatedSnapshot | null>(null);

  // Next step action states (persisted in localStorage)
  const [nextStepStates, setNextStepStates] = React.useState<NextStepState>({});

  // Recovery state (for momentum recovery panel)
  const [showRecoveryPanel, setShowRecoveryPanel] = React.useState(false);

  // Load next step states on mount
  React.useEffect(() => {
    if (projectId) {
      const states = loadNextStepStates(projectId);
      setNextStepStates(states);
    }
  }, [projectId]);

  // Check recovery state on mount
  React.useEffect(() => {
    if (projectId) {
      setShowRecoveryPanel(isRecoveryActive(projectId));
    }
  }, [projectId]);

  // Update step status and persist
  const updateStepStatus = React.useCallback((stepId: string, status: NextStepStatus) => {
    if (!projectId) return;

    setNextStepStates(prev => {
      const updated = { ...prev, [stepId]: status };
      saveNextStepStates(projectId, updated);
      return updated;
    });

    // Clear recovery state when a meaningful action is taken
    if (status === 'accepted' || status === 'completed') {
      clearRecovery(projectId);
      setShowRecoveryPanel(false);
    }
  }, [projectId]);

  // Clear all accepted steps (for recovery panel reset)
  const clearAcceptedSteps = React.useCallback(() => {
    if (!projectId) return;

    setNextStepStates(prev => {
      const updated: NextStepState = {};
      // Reset all accepted steps back to suggested, keep completed
      for (const [stepId, status] of Object.entries(prev)) {
        if (status === 'completed') {
          updated[stepId] = status;
        }
        // Skip accepted and suggested - they'll default to suggested
      }
      saveNextStepStates(projectId, updated);
      return updated;
    });
  }, [projectId]);

  // Dismiss recovery panel
  const dismissRecoveryPanel = React.useCallback(() => {
    if (!projectId) return;
    clearRecovery(projectId);
    setShowRecoveryPanel(false);
  }, [projectId]);

  // Get step status (default to 'suggested')
  const getStepStatus = React.useCallback((stepId: string): NextStepStatus => {
    return nextStepStates[stepId] || 'suggested';
  }, [nextStepStates]);

  // Handle discuss action - navigate to messages with prefilled content
  const handleDiscussStep = React.useCallback((stepText: string) => {
    if (!projectId) return;

    // Navigate to messages with prefilled content
    const discussText = `Let's discuss this next step: "${stepText}"`;
    const encodedText = encodeURIComponent(discussText);
    navigate(`/messages?projectId=${projectId}&prefill=${encodedText}`);
  }, [projectId, navigate]);

  // Momentum stall detection - triggers notification when project is stuck
  const isDataLoading = projectLoading || messagesLoading || assetsLoading || aiSummaryState === 'loading';
  useMomentumStallNotification(projectId, {
    projectName: project?.name,
    recentMessages: recentMessages as unknown as Array<{ id: string; createdAt: string; [key: string]: unknown }>,
    projectAssets: projectAssets as unknown as Array<{ id: string; createdAt: string; updatedAt?: string; [key: string]: unknown }>,
    metmapSessions: songs as unknown as Array<{ id: string; createdAt: string; updatedAt?: string; [key: string]: unknown }>,
    snapshot: snapshot as unknown as { openQuestions?: Array<{ text: string; [key: string]: unknown }>; aiEnabled?: boolean; [key: string]: unknown } | null,
    nextStepStates,
    isLoading: isDataLoading,
  });

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

  // Load and aggregate conversation summaries for AI Snapshot
  React.useEffect(() => {
    async function loadProjectSnapshot() {
      if (!projectId || !token) {
        setAiSummaryState('empty');
        return;
      }

      setAiSummaryState('loading');

      try {
        // First get conversations for this project
        const convResponse = await fetch(
          getApiUrl(`/api/messaging/conversations?projectId=${projectId}&limit=10`),
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!convResponse.ok) {
          setAiSummaryState('empty');
          return;
        }

        const convData = await convResponse.json();
        const conversations = convData.conversations || [];

        if (conversations.length === 0) {
          setAiSummaryState('empty');
          return;
        }

        // Fetch summaries for each conversation
        const summaries: ConversationSummaryData[] = [];
        for (const conv of conversations) {
          try {
            const summaryResponse = await fetch(
              getApiUrl(`/api/projects/${projectId}/conversations/${conv.id}/summary`),
              { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (summaryResponse.ok) {
              const summaryData = await summaryResponse.json();
              if (summaryData.success && summaryData.summary) {
                summaries.push({
                  ...summaryData.summary,
                  conversationName: conv.name,
                });
              }
            }
          } catch {
            // Skip failed summary fetches
          }
        }

        // Check if AI is disabled (all summaries have 'disabled' generator)
        const aiDisabled = summaries.length > 0 &&
          summaries.every(s => s.generatedBy === 'disabled' || s.generatedBy === 'disabled-fallback');

        if (summaries.length === 0) {
          setAiSummaryState('empty');
          return;
        }

        // Aggregate summaries into a project snapshot
        const aggregated = aggregateSummaries(summaries, aiDisabled);
        setSnapshot(aggregated);
        setAiSummaryState(aiDisabled ? 'disabled' : 'ready');

      } catch (error) {
        console.error('Failed to load project snapshot:', error);
        setAiSummaryState('empty');
      }
    }

    loadProjectSnapshot();
  }, [projectId, token]);

  // Build recent activity from messages, assets, and MetMap
  React.useEffect(() => {
    const activities: ActivityItem[] = [];

    // Add recent messages as activity
    recentMessages.forEach(msg => {
      activities.push({
        id: `msg-${msg.id}`,
        type: 'message',
        description: `${msg.authorName} sent a message${msg.conversationName ? ` in ${msg.conversationName}` : ''}`,
        timestamp: msg.createdAt,
        actor: msg.authorName,
      });
    });

    // Add recent assets as activity
    projectAssets.forEach(asset => {
      activities.push({
        id: `asset-${asset.id}`,
        type: 'asset',
        description: `New asset added: ${asset.name}`,
        timestamp: asset.createdAt,
      });
    });

    // Add MetMap songs as activity
    songs.slice(0, 3).forEach(song => {
      activities.push({
        id: `metmap-${song.id}`,
        type: 'metmap',
        description: `MetMap session: ${song.title}`,
        timestamp: song.updatedAt || song.createdAt,
      });
    });

    // Sort by timestamp and take top 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 10));
  }, [recentMessages, projectAssets, songs]);

  // Aggregate conversation summaries into a project snapshot
  function aggregateSummaries(summaries: ConversationSummaryData[], aiDisabled: boolean): AggregatedSnapshot {
    const whatsHappening: string[] = [];
    const decisions: Array<{ text: string; decidedBy?: string; conversationName?: string }> = [];
    const openQuestions: Array<{ text: string; askedBy?: string; conversationName?: string }> = [];
    const nextSteps: Array<{ id: string; text: string; priority?: string }> = [];

    // Track pulse/clarity votes
    const pulseVotes: Record<PulseTone, number> = { calm: 0, neutral: 0, intense: 0 };
    const clarityVotes: Record<ClarityState, number> = { focused: 0, mixed: 0, uncertain: 0 };
    let totalMessages = 0;
    let latestUpdate = '';

    summaries.forEach(summary => {
      // Aggregate summary bullets (take first 2 from each)
      if (summary.content.summary) {
        whatsHappening.push(...summary.content.summary.slice(0, 2));
      }

      // Aggregate decisions with conversation context
      if (summary.content.decisions) {
        summary.content.decisions.forEach(d => {
          decisions.push({
            ...d,
            conversationName: summary.conversationName,
          });
        });
      }

      // Aggregate open questions with conversation context
      if (summary.content.openQuestions) {
        summary.content.openQuestions.forEach(q => {
          openQuestions.push({
            ...q,
            conversationName: summary.conversationName,
          });
        });
      }

      // Aggregate next steps (de-duplicate by text, add IDs)
      if (summary.content.nextSteps) {
        summary.content.nextSteps.forEach(step => {
          if (!nextSteps.some(s => s.text === step.text)) {
            nextSteps.push({
              id: generateStepId(step.text),
              text: step.text,
              priority: step.priority,
            });
          }
        });
      }

      // Vote on pulse/clarity
      pulseVotes[summary.pulseTone]++;
      clarityVotes[summary.clarityState]++;
      totalMessages += summary.messageCount || 0;

      // Track latest update
      if (!latestUpdate || new Date(summary.updatedAt) > new Date(latestUpdate)) {
        latestUpdate = summary.updatedAt;
      }
    });

    // Determine overall pulse (most votes wins)
    const overallPulse = (Object.entries(pulseVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral') as PulseTone;
    const overallClarity = (Object.entries(clarityVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed') as ClarityState;

    return {
      whatsHappening: whatsHappening.slice(0, 5), // Limit to 5 bullets
      decisions: decisions.slice(0, 5), // Limit to 5 decisions
      openQuestions: openQuestions.slice(0, 3), // Limit to 3 questions
      nextSteps: nextSteps.slice(0, 5), // Limit to 5 steps
      overallPulse,
      overallClarity,
      lastUpdated: latestUpdate,
      summaryCount: summaries.length,
      totalMessages,
      aiEnabled: !aiDisabled,
    };
  }

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

                  {aiSummaryState === 'empty' && (
                    <div className="py-6 text-center">
                      <Sparkles className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-2">No summary available yet</p>
                      <p className="text-sm text-gray-400">
                        Insights will appear here as project conversations grow.
                      </p>
                    </div>
                  )}

                  {/* Disabled state - still shows aggregated data if available */}
                  {aiSummaryState === 'disabled' && snapshot && (
                    <div className="space-y-4">
                      {/* Disabled notice */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>AI features disabled - showing basic analysis</span>
                      </div>

                      {/* What's happening */}
                      {snapshot.whatsHappening.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">What&apos;s Happening</h4>
                          <ul className="space-y-1.5">
                            {snapshot.whatsHappening.map((item, idx) => (
                              <li key={idx} className="text-sm text-gray-600 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-gray-300 before:rounded-full">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Open questions */}
                      {snapshot.openQuestions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            Open Questions
                          </h4>
                          <ul className="space-y-2">
                            {snapshot.openQuestions.map((q, idx) => (
                              <li key={idx} className="text-sm text-gray-600 pl-4">
                                <span>{q.text}</span>
                                {q.conversationName && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({q.conversationName})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {snapshot.lastUpdated ? formatRelativeTime(snapshot.lastUpdated) : 'Unknown'}
                        </span>
                        <span>
                          Basic analysis · {snapshot.summaryCount} conversation{snapshot.summaryCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Ready state - full AI-powered snapshot */}
                  {aiSummaryState === 'ready' && snapshot && (
                    <div className="space-y-4">
                      {/* Pulse/Clarity indicator */}
                      <SnapshotPulseIndicator
                        pulse={snapshot.overallPulse}
                        clarity={snapshot.overallClarity}
                      />

                      {/* What's happening */}
                      {snapshot.whatsHappening.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">What&apos;s Happening</h4>
                          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                            {snapshot.whatsHappening.map((item, idx) => (
                              <p key={idx} className="text-sm text-gray-600 leading-relaxed">
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Team Alignment Signals */}
                      {projectId && (snapshot.decisions.length > 0 || snapshot.openQuestions.length > 0) && (
                        <TeamAlignmentPanel
                          projectId={projectId}
                          projectName={project?.name}
                          snapshot={snapshot}
                          nextStepStates={nextStepStates}
                          participantCount={project?.members?.length}
                          className="mb-4"
                        />
                      )}

                      {/* Key decisions */}
                      {snapshot.decisions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Key Decisions
                          </h4>
                          <ul className="space-y-2">
                            {snapshot.decisions.map((d, idx) => (
                              <li key={idx} className="flex gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-gray-700">{d.text}</span>
                                  {(d.decidedBy || d.conversationName) && (
                                    <span className="text-xs text-gray-400 ml-1">
                                      ({d.decidedBy || d.conversationName})
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Open questions */}
                      {snapshot.openQuestions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            Open Questions
                          </h4>
                          <ul className="space-y-2">
                            {snapshot.openQuestions.map((q, idx) => (
                              <li key={idx} className="flex gap-2 text-sm">
                                <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-gray-600">{q.text}</span>
                                  {q.conversationName && (
                                    <span className="text-xs text-gray-400 ml-1">
                                      ({q.conversationName})
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Momentum Recovery Panel - shows after stall notification */}
                      {showRecoveryPanel && projectId && (
                        <MomentumRecoveryPanel
                          projectId={projectId}
                          projectName={project?.name}
                          snapshot={snapshot}
                          nextSteps={snapshot.nextSteps}
                          nextStepStates={nextStepStates}
                          onAcceptStep={(stepId) => updateStepStatus(stepId, 'accepted')}
                          onClearAcceptedSteps={clearAcceptedSteps}
                          onDismiss={dismissRecoveryPanel}
                          className="mb-4"
                        />
                      )}

                      {/* Next steps - Actionable */}
                      {snapshot.nextSteps.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <ArrowRight className="w-4 h-4 text-blue-500" />
                            Next Steps
                          </h4>
                          <ul className="space-y-3">
                            {/* Sort: high priority first, then by status (suggested > accepted > completed) */}
                            {[...snapshot.nextSteps]
                              .sort((a, b) => {
                                // Priority order: high > medium > low/undefined
                                const priorityOrder = { high: 0, medium: 1, low: 2 };
                                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
                                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
                                if (aPriority !== bPriority) return aPriority - bPriority;

                                // Status order: suggested > accepted > completed
                                const statusOrder = { suggested: 0, accepted: 1, completed: 2 };
                                const aStatus = statusOrder[getStepStatus(a.id)];
                                const bStatus = statusOrder[getStepStatus(b.id)];
                                return aStatus - bStatus;
                              })
                              .map((step) => {
                                const status = getStepStatus(step.id);
                                const isCompleted = status === 'completed';

                                return (
                                  <li
                                    key={step.id}
                                    className={cn(
                                      'p-3 rounded-lg border transition-all',
                                      isCompleted
                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                        : status === 'accepted'
                                        ? 'bg-blue-50/50 border-blue-200'
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    )}
                                  >
                                    <div className="flex items-start gap-2">
                                      {/* Status icon */}
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <ArrowRight className={cn(
                                          'w-4 h-4 flex-shrink-0 mt-0.5',
                                          step.priority === 'high' ? 'text-red-500' :
                                          step.priority === 'medium' ? 'text-amber-500' :
                                          'text-blue-500'
                                        )} />
                                      )}

                                      <div className="flex-1 min-w-0">
                                        {/* Step text */}
                                        <p className={cn(
                                          'text-sm',
                                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
                                        )}>
                                          {step.text}
                                        </p>

                                        {/* Badges row */}
                                        <div className="flex items-center gap-2 mt-1.5">
                                          {/* Priority badge */}
                                          {step.priority && (
                                            <span className={cn(
                                              'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                              step.priority === 'high' ? 'bg-red-100 text-red-700' :
                                              step.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                              'bg-blue-100 text-blue-700'
                                            )}>
                                              {step.priority}
                                            </span>
                                          )}

                                          {/* Status badge */}
                                          <span className={cn(
                                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                            status === 'completed' ? 'bg-green-100 text-green-700' :
                                            status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                          )}>
                                            {status}
                                          </span>
                                        </div>

                                        {/* Action buttons */}
                                        {!isCompleted && (
                                          <div className="flex items-center gap-2 mt-2">
                                            {status === 'suggested' && (
                                              <button
                                                onClick={() => updateStepStatus(step.id, 'accepted')}
                                                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                              >
                                                Accept
                                              </button>
                                            )}
                                            {status === 'accepted' && (
                                              <button
                                                onClick={() => updateStepStatus(step.id, 'completed')}
                                                className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                                              >
                                                Mark complete
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDiscussStep(step.text)}
                                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                                            >
                                              Discuss
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}

                      {/* Empty content fallback */}
                      {snapshot.whatsHappening.length === 0 &&
                       snapshot.decisions.length === 0 &&
                       snapshot.openQuestions.length === 0 &&
                       snapshot.nextSteps.length === 0 && (
                        <div className="py-4 text-center text-gray-500 text-sm">
                          <p>Conversations are being tracked, but no key insights yet.</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Keep collaborating - summaries build over time.
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {snapshot.lastUpdated ? formatRelativeTime(snapshot.lastUpdated) : 'Unknown'}
                        </span>
                        <span>
                          AI generated · {snapshot.summaryCount} conversation{snapshot.summaryCount !== 1 ? 's' : ''}
                          {snapshot.totalMessages > 0 && ` · ${snapshot.totalMessages} msgs`}
                        </span>
                      </div>
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
                        isMetMapAsset(asset) ? (
                          <MetMapAssetCard
                            key={asset.id}
                            asset={asset}
                            projectId={projectId}
                            compact
                          />
                        ) : (
                          <div
                            key={asset.id}
                            className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            <div className="w-full aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                              {asset.thumbnailUrl ? (
                                <img
                                  src={asset.thumbnailUrl}
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
                        )
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
