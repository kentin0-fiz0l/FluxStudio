/**
 * ProjectOverview Page - Command Center
 * Decomposed: types in types.ts, helpers in OverviewHelpers.tsx, sections in OverviewSections.tsx
 */

import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Badge, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/hooks/useProjects';
import { AssetRecord } from '@/contexts/AssetsContext';
import { useMetMap } from '@/contexts/MetMapContext';
import { getApiUrl } from '@/utils/apiHelpers';
import { useMomentumStallNotification } from '@/hooks/useMomentumStallNotification';
import { isRecoveryActive, clearRecovery } from '@/utils/momentumRecovery';
import { ProjectNotFound } from './OverviewHelpers';
import { AISnapshotSection, RecentMessagesSection, RecentAssetsSection, SidebarSections } from './OverviewSections';
import type {
  RecentMessage, ActivityItem, AggregatedSnapshot,
  ConversationSummaryData, NextStepState, NextStepStatus, PulseTone, ClarityState,
} from './types';
import { generateStepId, loadNextStepStates, saveNextStepStates } from './types';

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [project, setProject] = React.useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = React.useState(true);
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const [recentMessages, setRecentMessages] = React.useState<RecentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(true);
  const [projectAssets, setProjectAssets] = React.useState<AssetRecord[]>([]);
  const [assetsLoading, setAssetsLoading] = React.useState(true);
  const { songs, songsLoading, setFilters: setMetMapFilters } = useMetMap();
  const [recentActivity, setRecentActivity] = React.useState<ActivityItem[]>([]);
  const [aiSummaryState, setAiSummaryState] = React.useState<'loading' | 'disabled' | 'empty' | 'ready'>('loading');
  const [snapshot, setSnapshot] = React.useState<AggregatedSnapshot | null>(null);
  const [nextStepStates, setNextStepStates] = React.useState<NextStepState>({});
  const [showRecoveryPanel, setShowRecoveryPanel] = React.useState(false);

  React.useEffect(() => { if (projectId) setNextStepStates(loadNextStepStates(projectId)); }, [projectId]);
  React.useEffect(() => { if (projectId) setShowRecoveryPanel(isRecoveryActive(projectId)); }, [projectId]);

  const updateStepStatus = React.useCallback((stepId: string, status: NextStepStatus) => {
    if (!projectId) return;
    setNextStepStates(prev => { const updated = { ...prev, [stepId]: status }; saveNextStepStates(projectId, updated); return updated; });
    if (status === 'accepted' || status === 'completed') { clearRecovery(projectId); setShowRecoveryPanel(false); }
  }, [projectId]);

  const clearAcceptedSteps = React.useCallback(() => {
    if (!projectId) return;
    setNextStepStates(prev => {
      const updated: NextStepState = {};
      for (const [stepId, status] of Object.entries(prev)) { if (status === 'completed') updated[stepId] = status; }
      saveNextStepStates(projectId, updated);
      return updated;
    });
  }, [projectId]);

  const dismissRecoveryPanel = React.useCallback(() => { if (!projectId) return; clearRecovery(projectId); setShowRecoveryPanel(false); }, [projectId]);
  const getStepStatus = React.useCallback((stepId: string): NextStepStatus => nextStepStates[stepId] || 'suggested', [nextStepStates]);

  const handleDiscussStep = React.useCallback((stepText: string) => {
    if (!projectId) return;
    navigate(`/messages?projectId=${projectId}&prefill=${encodeURIComponent(`Let's discuss this next step: "${stepText}"`)}`);
  }, [projectId, navigate]);

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

  // Load project
  React.useEffect(() => {
    async function loadProject() {
      if (!projectId || !token) { setProjectLoading(false); return; }
      setProjectLoading(true); setProjectError(null);
      try {
        const response = await fetch(getApiUrl(`/api/projects/${projectId}`), { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) { setProjectError(response.status === 404 ? 'not_found' : 'error'); setProjectLoading(false); return; }
        const data = await response.json();
        setProject(data.project || data);
      } catch (error) { console.error('Failed to load project:', error); setProjectError('error'); }
      finally { setProjectLoading(false); }
    }
    loadProject();
  }, [projectId, token]);

  // Load messages
  React.useEffect(() => {
    async function loadRecentMessages() {
      if (!projectId || !token) { setMessagesLoading(false); return; }
      setMessagesLoading(true);
      try {
        const convResponse = await fetch(getApiUrl(`/api/messaging/conversations?projectId=${projectId}&limit=5`), { headers: { 'Authorization': `Bearer ${token}` } });
        if (!convResponse.ok) { setMessagesLoading(false); return; }
        const convData = await convResponse.json();
        const conversations = convData.conversations || [];
        const messages: RecentMessage[] = [];
        for (const conv of conversations.slice(0, 3)) {
          const msgResponse = await fetch(getApiUrl(`/api/messaging/conversations/${conv.id}/messages?limit=2`), { headers: { 'Authorization': `Bearer ${token}` } });
          if (msgResponse.ok) {
            const msgData = await msgResponse.json();
            messages.push(...(msgData.messages || []).map((m: Record<string, unknown>) => ({ id: m.id as string, content: m.content as string, authorName: (m.author as Record<string, unknown>)?.name as string || 'Unknown', authorAvatar: (m.author as Record<string, unknown>)?.avatar as string | undefined, conversationId: conv.id, conversationName: conv.name, createdAt: m.createdAt as string })));
          }
        }
        messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentMessages(messages.slice(0, 5));
      } catch (error) { console.error('Failed to load messages:', error); }
      finally { setMessagesLoading(false); }
    }
    loadRecentMessages();
  }, [projectId, token]);

  // Load assets
  React.useEffect(() => {
    async function loadProjectAssets() {
      if (!projectId || !token) { setAssetsLoading(false); return; }
      setAssetsLoading(true);
      try {
        const response = await fetch(getApiUrl(`/api/projects/${projectId}/assets?limit=5`), { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) { const data = await response.json(); setProjectAssets(data.assets || []); }
      } catch (error) { console.error('Failed to load assets:', error); }
      finally { setAssetsLoading(false); }
    }
    loadProjectAssets();
  }, [projectId, token]);

  // Load MetMap
  React.useEffect(() => { if (projectId) setMetMapFilters({ projectId }); }, [projectId, setMetMapFilters]);

  // Load AI summaries
  React.useEffect(() => {
    async function loadProjectSnapshot() {
      if (!projectId || !token) { setAiSummaryState('empty'); return; }
      setAiSummaryState('loading');
      try {
        const convResponse = await fetch(getApiUrl(`/api/messaging/conversations?projectId=${projectId}&limit=10`), { headers: { 'Authorization': `Bearer ${token}` } });
        if (!convResponse.ok) { setAiSummaryState('empty'); return; }
        const convData = await convResponse.json();
        const conversations = convData.conversations || [];
        if (conversations.length === 0) { setAiSummaryState('empty'); return; }
        const summaries: ConversationSummaryData[] = [];
        for (const conv of conversations) {
          try {
            const summaryResponse = await fetch(getApiUrl(`/api/projects/${projectId}/conversations/${conv.id}/summary`), { headers: { 'Authorization': `Bearer ${token}` } });
            if (summaryResponse.ok) { const summaryData = await summaryResponse.json(); if (summaryData.success && summaryData.summary) summaries.push({ ...summaryData.summary, conversationName: conv.name }); }
          } catch { /* skip */ }
        }
        const aiDisabled = summaries.length > 0 && summaries.every(s => s.generatedBy === 'disabled' || s.generatedBy === 'disabled-fallback');
        if (summaries.length === 0) { setAiSummaryState('empty'); return; }
        const aggregated = aggregateSummaries(summaries, aiDisabled);
        setSnapshot(aggregated);
        setAiSummaryState(aiDisabled ? 'disabled' : 'ready');
      } catch (error) { console.error('Failed to load project snapshot:', error); setAiSummaryState('empty'); }
    }
    loadProjectSnapshot();
  }, [projectId, token]);

  // Build activity
  React.useEffect(() => {
    const activities: ActivityItem[] = [];
    recentMessages.forEach(msg => activities.push({ id: `msg-${msg.id}`, type: 'message', description: `${msg.authorName} sent a message${msg.conversationName ? ` in ${msg.conversationName}` : ''}`, timestamp: msg.createdAt, actor: msg.authorName }));
    projectAssets.forEach(asset => activities.push({ id: `asset-${asset.id}`, type: 'asset', description: `New asset added: ${asset.name}`, timestamp: asset.createdAt }));
    songs.slice(0, 3).forEach(song => activities.push({ id: `metmap-${song.id}`, type: 'metmap', description: `MetMap session: ${song.title}`, timestamp: song.updatedAt || song.createdAt }));
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 10));
  }, [recentMessages, projectAssets, songs]);

  function aggregateSummaries(summaries: ConversationSummaryData[], aiDisabled: boolean): AggregatedSnapshot {
    const whatsHappening: string[] = [];
    const decisions: Array<{ text: string; decidedBy?: string; conversationName?: string }> = [];
    const openQuestions: Array<{ text: string; askedBy?: string; conversationName?: string }> = [];
    const nextSteps: Array<{ id: string; text: string; priority?: string }> = [];
    const pulseVotes: Record<PulseTone, number> = { calm: 0, neutral: 0, intense: 0 };
    const clarityVotes: Record<ClarityState, number> = { focused: 0, mixed: 0, uncertain: 0 };
    let totalMessages = 0;
    let latestUpdate = '';
    summaries.forEach(summary => {
      if (summary.content.summary) whatsHappening.push(...summary.content.summary.slice(0, 2));
      if (summary.content.decisions) summary.content.decisions.forEach(d => decisions.push({ ...d, conversationName: summary.conversationName }));
      if (summary.content.openQuestions) summary.content.openQuestions.forEach(q => openQuestions.push({ ...q, conversationName: summary.conversationName }));
      if (summary.content.nextSteps) summary.content.nextSteps.forEach(step => { if (!nextSteps.some(s => s.text === step.text)) nextSteps.push({ id: generateStepId(step.text), text: step.text, priority: step.priority }); });
      pulseVotes[summary.pulseTone]++;
      clarityVotes[summary.clarityState]++;
      totalMessages += summary.messageCount || 0;
      if (!latestUpdate || new Date(summary.updatedAt) > new Date(latestUpdate)) latestUpdate = summary.updatedAt;
    });
    const overallPulse = (Object.entries(pulseVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral') as PulseTone;
    const overallClarity = (Object.entries(clarityVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed') as ClarityState;
    return { whatsHappening: whatsHappening.slice(0, 5), decisions: decisions.slice(0, 5), openQuestions: openQuestions.slice(0, 3), nextSteps: nextSteps.slice(0, 5), overallPulse, overallClarity, lastUpdated: latestUpdate, summaryCount: summaries.length, totalMessages, aiEnabled: !aiDisabled };
  }

  if (projectLoading) {
    return <DashboardLayout><div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div></DashboardLayout>;
  }

  if (projectError || !project) {
    return <ProjectNotFound projectId={projectId || 'unknown'} />;
  }

  const statusVariants: Record<string, 'info' | 'warning' | 'default' | 'success' | 'error'> = {
    planning: 'info', in_progress: 'warning', on_hold: 'default', completed: 'success', cancelled: 'error',
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
              <Link to="/projects" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"><ArrowLeft className="w-4 h-4" aria-hidden="true" />Projects</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{project.name}</span>
            </nav>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{project.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">Project Overview</span>
                  <Badge variant={statusVariants[project.status] || 'default'}>{project.status.replace('_', ' ')}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>Full Details</Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AISnapshotSection
                aiSummaryState={aiSummaryState}
                snapshot={snapshot}
                projectId={projectId}
                project={project}
                nextStepStates={nextStepStates}
                showRecoveryPanel={showRecoveryPanel}
                getStepStatus={getStepStatus}
                updateStepStatus={updateStepStatus}
                clearAcceptedSteps={clearAcceptedSteps}
                dismissRecoveryPanel={dismissRecoveryPanel}
                handleDiscussStep={handleDiscussStep}
              />
              <RecentMessagesSection projectId={projectId} messagesLoading={messagesLoading} recentMessages={recentMessages} />
              <RecentAssetsSection projectId={projectId} assetsLoading={assetsLoading} projectAssets={projectAssets} />
            </div>
            <SidebarSections projectId={projectId} project={project} recentActivity={recentActivity} songs={songs} songsLoading={songsLoading} />
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
