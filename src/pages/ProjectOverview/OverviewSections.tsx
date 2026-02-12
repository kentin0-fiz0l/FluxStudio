/**
 * Content sections for ProjectOverview render
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  Music,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Project } from '@/hooks/useProjects';
import { AssetRecord } from '@/contexts/AssetsContext';
import { isMetMapAsset } from '@/utils/assetHelpers';
import { MetMapAssetCard } from '@/components/assets/MetMapAssetCard';
import { MomentumRecoveryPanel } from '@/components/projects/MomentumRecoveryPanel';
import { TeamAlignmentPanel } from '@/components/projects/TeamAlignmentPanel';
import { cn } from '@/lib/utils';
import { SectionHeader, EmptySection, SectionSkeleton, SnapshotPulseIndicator } from './OverviewHelpers';
import type { AggregatedSnapshot, RecentMessage, ActivityItem, NextStepState, NextStepStatus } from './types';
import { formatRelativeTime } from './types';

// ============================================================================
// AI Snapshot Section
// ============================================================================

export const AISnapshotSection: React.FC<{
  aiSummaryState: 'loading' | 'disabled' | 'empty' | 'ready';
  snapshot: AggregatedSnapshot | null;
  projectId?: string;
  project: Project | null;
  nextStepStates: NextStepState;
  showRecoveryPanel: boolean;
  getStepStatus: (stepId: string) => NextStepStatus;
  updateStepStatus: (stepId: string, status: NextStepStatus) => void;
  clearAcceptedSteps: () => void;
  dismissRecoveryPanel: () => void;
  handleDiscussStep: (text: string) => void;
}> = ({
  aiSummaryState, snapshot, projectId, project, nextStepStates,
  showRecoveryPanel, getStepStatus, updateStepStatus,
  clearAcceptedSteps, dismissRecoveryPanel, handleDiscussStep,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <SectionHeader title="AI Project Snapshot" icon={<Sparkles className="w-5 h-5" />} />
    </CardHeader>
    <CardContent>
      {aiSummaryState === 'loading' && <SectionSkeleton />}

      {aiSummaryState === 'empty' && (
        <div className="py-6 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-2">No summary available yet</p>
          <p className="text-sm text-gray-400">Insights will appear here as project conversations grow.</p>
        </div>
      )}

      {aiSummaryState === 'disabled' && snapshot && (
        <DisabledSnapshotContent snapshot={snapshot} />
      )}

      {aiSummaryState === 'ready' && snapshot && (
        <ReadySnapshotContent
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
      )}
    </CardContent>
  </Card>
);

const DisabledSnapshotContent: React.FC<{ snapshot: AggregatedSnapshot }> = ({ snapshot }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>AI features disabled - showing basic analysis</span>
    </div>
    {snapshot.whatsHappening.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">What&apos;s Happening</h4>
        <ul className="space-y-1.5">
          {snapshot.whatsHappening.map((item, idx) => (
            <li key={idx} className="text-sm text-gray-600 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-gray-300 before:rounded-full">{item}</li>
          ))}
        </ul>
      </div>
    )}
    {snapshot.openQuestions.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-500" />Open Questions
        </h4>
        <ul className="space-y-2">
          {snapshot.openQuestions.map((q, idx) => (
            <li key={idx} className="text-sm text-gray-600 pl-4">
              <span>{q.text}</span>
              {q.conversationName && <span className="text-xs text-gray-400 ml-1">({q.conversationName})</span>}
            </li>
          ))}
        </ul>
      </div>
    )}
    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{snapshot.lastUpdated ? formatRelativeTime(snapshot.lastUpdated) : 'Unknown'}</span>
      <span>Basic analysis · {snapshot.summaryCount} conversation{snapshot.summaryCount !== 1 ? 's' : ''}</span>
    </div>
  </div>
);

const ReadySnapshotContent: React.FC<{
  snapshot: AggregatedSnapshot;
  projectId?: string;
  project: Project | null;
  nextStepStates: NextStepState;
  showRecoveryPanel: boolean;
  getStepStatus: (stepId: string) => NextStepStatus;
  updateStepStatus: (stepId: string, status: NextStepStatus) => void;
  clearAcceptedSteps: () => void;
  dismissRecoveryPanel: () => void;
  handleDiscussStep: (text: string) => void;
}> = ({ snapshot, projectId, project, nextStepStates, showRecoveryPanel, getStepStatus, updateStepStatus, clearAcceptedSteps, dismissRecoveryPanel, handleDiscussStep }) => (
  <div className="space-y-4">
    <SnapshotPulseIndicator pulse={snapshot.overallPulse} clarity={snapshot.overallClarity} />

    {snapshot.whatsHappening.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">What&apos;s Happening</h4>
        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          {snapshot.whatsHappening.map((item, idx) => (
            <p key={idx} className="text-sm text-gray-600 leading-relaxed">{item}</p>
          ))}
        </div>
      </div>
    )}

    {projectId && (snapshot.decisions.length > 0 || snapshot.openQuestions.length > 0) && (
      <TeamAlignmentPanel projectId={projectId} projectName={project?.name} snapshot={snapshot} nextStepStates={nextStepStates} participantCount={project?.members?.length} className="mb-4" />
    )}

    {snapshot.decisions.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" />Key Decisions</h4>
        <ul className="space-y-2">
          {snapshot.decisions.map((d, idx) => (
            <li key={idx} className="flex gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-700">{d.text}</span>
                {(d.decidedBy || d.conversationName) && <span className="text-xs text-gray-400 ml-1">({d.decidedBy || d.conversationName})</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}

    {snapshot.openQuestions.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-amber-500" />Open Questions</h4>
        <ul className="space-y-2">
          {snapshot.openQuestions.map((q, idx) => (
            <li key={idx} className="flex gap-2 text-sm">
              <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-600">{q.text}</span>
                {q.conversationName && <span className="text-xs text-gray-400 ml-1">({q.conversationName})</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}

    {showRecoveryPanel && projectId && (
      <MomentumRecoveryPanel projectId={projectId} projectName={project?.name} snapshot={snapshot} nextSteps={snapshot.nextSteps} nextStepStates={nextStepStates} onAcceptStep={(stepId) => updateStepStatus(stepId, 'accepted')} onClearAcceptedSteps={clearAcceptedSteps} onDismiss={dismissRecoveryPanel} className="mb-4" />
    )}

    {snapshot.nextSteps.length > 0 && (
      <NextStepsList snapshot={snapshot} getStepStatus={getStepStatus} updateStepStatus={updateStepStatus} handleDiscussStep={handleDiscussStep} />
    )}

    {snapshot.whatsHappening.length === 0 && snapshot.decisions.length === 0 && snapshot.openQuestions.length === 0 && snapshot.nextSteps.length === 0 && (
      <div className="py-4 text-center text-gray-500 text-sm">
        <p>Conversations are being tracked, but no key insights yet.</p>
        <p className="text-xs text-gray-400 mt-1">Keep collaborating - summaries build over time.</p>
      </div>
    )}

    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{snapshot.lastUpdated ? formatRelativeTime(snapshot.lastUpdated) : 'Unknown'}</span>
      <span>AI generated · {snapshot.summaryCount} conversation{snapshot.summaryCount !== 1 ? 's' : ''}{snapshot.totalMessages > 0 && ` · ${snapshot.totalMessages} msgs`}</span>
    </div>
  </div>
);

const NextStepsList: React.FC<{
  snapshot: AggregatedSnapshot;
  getStepStatus: (stepId: string) => NextStepStatus;
  updateStepStatus: (stepId: string, status: NextStepStatus) => void;
  handleDiscussStep: (text: string) => void;
}> = ({ snapshot, getStepStatus, updateStepStatus, handleDiscussStep }) => (
  <div className="space-y-3">
    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><ArrowRight className="w-4 h-4 text-blue-500" />Next Steps</h4>
    <ul className="space-y-3">
      {[...snapshot.nextSteps]
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
          if (aPriority !== bPriority) return aPriority - bPriority;
          const statusOrder = { suggested: 0, accepted: 1, completed: 2 };
          return statusOrder[getStepStatus(a.id)] - statusOrder[getStepStatus(b.id)];
        })
        .map((step) => {
          const status = getStepStatus(step.id);
          const isCompleted = status === 'completed';
          return (
            <li key={step.id} className={cn('p-3 rounded-lg border transition-all', isCompleted ? 'bg-gray-50 border-gray-200 opacity-60' : status === 'accepted' ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300')}>
              <div className="flex items-start gap-2">
                {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> : <ArrowRight className={cn('w-4 h-4 flex-shrink-0 mt-0.5', step.priority === 'high' ? 'text-red-500' : step.priority === 'medium' ? 'text-amber-500' : 'text-blue-500')} />}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', isCompleted ? 'text-gray-400 line-through' : 'text-gray-700')}>{step.text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {step.priority && <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', step.priority === 'high' ? 'bg-red-100 text-red-700' : step.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{step.priority}</span>}
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', status === 'completed' ? 'bg-green-100 text-green-700' : status === 'accepted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>{status}</span>
                  </div>
                  {!isCompleted && (
                    <div className="flex items-center gap-2 mt-2">
                      {status === 'suggested' && <button onClick={() => updateStepStatus(step.id, 'accepted')} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">Accept</button>}
                      {status === 'accepted' && <button onClick={() => updateStepStatus(step.id, 'completed')} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">Mark complete</button>}
                      <button onClick={() => handleDiscussStep(step.text)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">Discuss</button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
    </ul>
  </div>
);

// ============================================================================
// Messages Section
// ============================================================================

export const RecentMessagesSection: React.FC<{
  projectId?: string;
  messagesLoading: boolean;
  recentMessages: RecentMessage[];
}> = ({ projectId, messagesLoading, recentMessages }) => (
  <Card>
    <CardHeader className="pb-3">
      <SectionHeader title="Recent Messages" icon={<MessageSquare className="w-5 h-5" />} action={{ label: 'View All', href: `/messages?projectId=${projectId}` }} />
    </CardHeader>
    <CardContent>
      {messagesLoading ? <SectionSkeleton /> : recentMessages.length === 0 ? (
        <EmptySection message="No messages yet. Start a conversation to collaborate with your team." icon={<MessageSquare className="w-8 h-8 mx-auto text-gray-300" />} />
      ) : (
        <div className="space-y-3">
          {recentMessages.map((message) => (
            <Link key={message.id} to={`/messages?projectId=${projectId}&conversationId=${message.conversationId}`} className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 text-sm font-medium">{message.authorName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{message.authorName}</span>
                    {message.conversationName && <span className="text-xs text-gray-400">in {message.conversationName}</span>}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                  <span className="text-xs text-gray-400 mt-1 block">{formatRelativeTime(message.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ============================================================================
// Assets Section
// ============================================================================

export const RecentAssetsSection: React.FC<{
  projectId?: string;
  assetsLoading: boolean;
  projectAssets: AssetRecord[];
}> = ({ projectId, assetsLoading, projectAssets }) => (
  <Card>
    <CardHeader className="pb-3">
      <SectionHeader title="Recent Assets" icon={<FileText className="w-5 h-5" />} action={{ label: 'View All', href: `/assets?projectId=${projectId}` }} />
    </CardHeader>
    <CardContent>
      {assetsLoading ? <SectionSkeleton /> : projectAssets.length === 0 ? (
        <EmptySection message="No assets uploaded yet. Add files, images, or documents to your project." icon={<FileText className="w-8 h-8 mx-auto text-gray-300" />} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {projectAssets.map((asset) => (
            isMetMapAsset(asset) ? (
              <MetMapAssetCard key={asset.id} asset={asset} projectId={projectId} compact />
            ) : (
              <div key={asset.id} className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors cursor-pointer">
                <div className="w-full aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                  {asset.thumbnailUrl ? <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover rounded-md" /> : <FileText className="w-8 h-8 text-gray-400" />}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                <p className="text-xs text-gray-400">{formatRelativeTime(asset.createdAt)}</p>
              </div>
            )
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ============================================================================
// Sidebar Sections
// ============================================================================

export const SidebarSections: React.FC<{
  projectId?: string;
  project: Project | null;
  recentActivity: ActivityItem[];
  songs: Array<{ id: string; title: string; bpmDefault: number; sectionCount?: number; createdAt: string; updatedAt?: string }>;
  songsLoading: boolean;
}> = ({ projectId, project, recentActivity, songs, songsLoading }) => (
  <div className="space-y-6">
    {/* Recent Activity */}
    <Card>
      <CardHeader className="pb-3"><SectionHeader title="Recent Activity" icon={<Clock className="w-5 h-5" />} /></CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <EmptySection message="Activity will appear here as your team works on the project." />
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{item.description}</p>
                  <span className="text-xs text-gray-400">{formatRelativeTime(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* MetMap Sessions */}
    <Card>
      <CardHeader className="pb-3"><SectionHeader title="MetMap Sessions" icon={<Music className="w-5 h-5" />} action={{ label: 'Open MetMap', href: `/tools/metmap?projectId=${projectId}` }} /></CardHeader>
      <CardContent>
        {songsLoading ? <SectionSkeleton /> : songs.length === 0 ? (
          <EmptySection message="No MetMap sessions yet. Create timelines for your musical projects." icon={<Music className="w-8 h-8 mx-auto text-gray-300" />} />
        ) : (
          <div className="space-y-2">
            {songs.slice(0, 3).map((song) => (
              <Link key={song.id} to={`/tools/metmap?projectId=${projectId}&song=${song.id}`} className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <p className="font-medium text-gray-900 text-sm">{song.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span>{song.bpmDefault} BPM</span><span>·</span><span>{song.sectionCount || 0} sections</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Quick Links */}
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Link to={`/messages?projectId=${projectId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"><MessageSquare className="w-4 h-4 text-gray-400" />Messages</Link>
          <Link to={`/assets?projectId=${projectId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"><FileText className="w-4 h-4 text-gray-400" />Assets</Link>
          <Link to={`/tools/metmap?projectId=${projectId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"><Music className="w-4 h-4 text-gray-400" />MetMap</Link>
          <Link to={`/notifications?projectId=${projectId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-gray-900"><Clock className="w-4 h-4 text-gray-400" />Notifications</Link>
        </div>
      </CardContent>
    </Card>

    {/* Team */}
    <Card>
      <CardHeader className="pb-3"><SectionHeader title="Team" icon={<Users className="w-5 h-5" />} /></CardHeader>
      <CardContent>
        {project?.members && project.members.length > 0 ? (
          <div className="flex items-center -space-x-2">
            {project.members.slice(0, 5).map((memberId, index) => (
              <div key={memberId} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center" title={`Team member ${index + 1}`}>
                <span className="text-indigo-600 text-xs font-medium">{String.fromCharCode(65 + index)}</span>
              </div>
            ))}
            {project.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-gray-600 text-xs font-medium">+{project.members.length - 5}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="No team members assigned yet." />
        )}
      </CardContent>
    </Card>
  </div>
);
