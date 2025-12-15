/**
 * PulsePanel - Main Project Pulse container
 *
 * A collapsible panel showing real-time project activity:
 * - Attention items (needs your action)
 * - Activity stream (what's happening)
 * - Team heartbeat (who's online)
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  RefreshCw,
  Activity,
  Inbox,
  Users,
  ChevronRight,
  Check,
  CheckCheck,
  WifiOff,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useProjectPulse } from '@/hooks/useProjectPulse';
import { useActiveProject } from '@/contexts/ActiveProjectContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ActivityStream } from './ActivityStream';
import { AttentionInbox } from './AttentionInbox';
import { TeamHeartbeat } from './TeamHeartbeat';
import { ResumeCard } from '@/components/momentum/ResumeCard';

export interface PulsePanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Custom className */
  className?: string;
  /** Panel position */
  position?: 'right' | 'overlay';
}

type TabId = 'attention' | 'activity' | 'team';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function PulsePanel({
  isOpen,
  onClose,
  className,
  position = 'right',
}: PulsePanelProps) {
  const navigate = useNavigate();
  const { activeProject, hasFocus } = useActiveProject();
  const {
    activityStream,
    attentionItems,
    teamMembers,
    unseenCount,
    isLoading,
    isConnected,
    refresh,
    markAllSeen,
  } = useProjectPulse();

  const [activeTab, setActiveTab] = React.useState<TabId>('attention');

  // Keyboard shortcut: Escape to close
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: onClose,
        description: 'Close Pulse panel',
      },
    ],
    enabled: isOpen,
  });

  // Mark as seen when opening
  React.useEffect(() => {
    if (isOpen && unseenCount > 0) {
      // Delay marking as seen to let user see the "new" indicators
      const timer = setTimeout(() => {
        markAllSeen();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, unseenCount, markAllSeen]);

  const tabs: Tab[] = [
    {
      id: 'attention',
      label: 'Needs Attention',
      icon: <Inbox className="h-4 w-4" />,
      badge: attentionItems.length,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <Activity className="h-4 w-4" />,
      badge: unseenCount > 0 ? unseenCount : undefined,
    },
    {
      id: 'team',
      label: 'Team',
      icon: <Users className="h-4 w-4" />,
      badge: teamMembers.filter((m) => m.isOnline).length || undefined,
    },
  ];

  const handleItemClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  const panelContent = (
    <div
      className={cn(
        'flex flex-col h-full bg-white dark:bg-neutral-900',
        'border-l border-neutral-200 dark:border-neutral-800',
        position === 'overlay' && 'rounded-lg shadow-xl border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Project Pulse
          </h2>
          {unseenCount > 0 && (
            <Badge variant="info" size="sm">
              {unseenCount} new
            </Badge>
          )}
          {/* Connection status indicator */}
          {!isConnected && (
            <span
              className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
              title="Offline - real-time updates paused"
            >
              <WifiOff className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Mark as Seen button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllSeen}
            disabled={unseenCount === 0}
            aria-label="Mark all as seen"
            title="Mark all as seen"
            className={cn(
              unseenCount === 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh pulse"
          >
            <RefreshCw
              className={cn('h-4 w-4', isLoading && 'animate-spin')}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close pulse panel (Esc)"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project context */}
      {activeProject && (
        <button
          onClick={() => {
            navigate(`/projects/${activeProject.id}`);
            onClose();
          }}
          className={cn(
            'flex items-center justify-between px-4 py-2',
            'bg-primary-50 dark:bg-primary-900/20',
            'text-sm text-primary-700 dark:text-primary-300',
            'hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors'
          )}
        >
          <span className="font-medium truncate">{activeProject.name}</span>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        </button>
      )}

      {/* Resume Card - Work Momentum */}
      <ResumeCard onResume={onClose} />

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5',
              'text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={cn(
                  'min-w-[18px] h-[18px] flex items-center justify-center',
                  'text-[10px] font-bold rounded-full',
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                )}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* No project focused - empty state */}
        {!hasFocus && (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <Activity className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Pick a project to see its Pulse
            </p>
            <p className="text-neutral-500 dark:text-neutral-500 text-xs mt-1">
              Focus on a project to see activity, attention items, and team presence
            </p>
          </div>
        )}

        {/* Attention tab */}
        {hasFocus && activeTab === 'attention' && (
          attentionItems.length > 0 ? (
            <AttentionInbox items={attentionItems} onItemClick={handleItemClick} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <Check className="h-10 w-10 text-green-500 dark:text-green-400 mb-3" />
              <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                All caught up!
              </p>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                No items need your attention right now
              </p>
            </div>
          )
        )}

        {/* Activity tab */}
        {hasFocus && activeTab === 'activity' && (
          activityStream.length > 0 ? (
            <ActivityStream
              items={activityStream}
              onItemClick={handleItemClick}
              maxItems={15}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <Clock className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                No recent activity
              </p>
              <p className="text-neutral-500 dark:text-neutral-500 text-xs mt-1">
                Activity will appear here as your team works
              </p>
            </div>
          )
        )}

        {/* Team tab */}
        {hasFocus && activeTab === 'team' && (
          teamMembers.length > 0 ? (
            <TeamHeartbeat members={teamMembers} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <Users className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                No team members online
              </p>
              <p className="text-neutral-500 dark:text-neutral-500 text-xs mt-1">
                {isConnected
                  ? 'Team presence appears when others focus on this project'
                  : 'Connect to see who is working on this project'}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );

  if (position === 'overlay') {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={cn(
            'fixed top-16 right-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] z-50',
            'animate-in slide-in-from-right-4 duration-200',
            className
          )}
        >
          {panelContent}
        </div>
      </>
    );
  }

  // Right sidebar position
  return (
    <div
      className={cn(
        'w-80 flex-shrink-0 h-full',
        'animate-in slide-in-from-right duration-200',
        className
      )}
    >
      {panelContent}
    </div>
  );
}

export default PulsePanel;
