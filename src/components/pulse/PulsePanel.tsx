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
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useProjectPulse } from '@/hooks/useProjectPulse';
import { useActiveProject } from '@/contexts/ActiveProjectContext';
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
  const { activeProject } = useActiveProject();
  const {
    activityStream,
    attentionItems,
    teamMembers,
    unseenCount,
    isLoading,
    refresh,
    markAllSeen,
  } = useProjectPulse();

  const [activeTab, setActiveTab] = React.useState<TabId>('attention');

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
        </div>
        <div className="flex items-center gap-1">
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
            aria-label="Close pulse panel"
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
        {activeTab === 'attention' && (
          <AttentionInbox items={attentionItems} onItemClick={handleItemClick} />
        )}
        {activeTab === 'activity' && (
          <ActivityStream
            items={activityStream}
            onItemClick={handleItemClick}
            maxItems={15}
          />
        )}
        {activeTab === 'team' && <TeamHeartbeat members={teamMembers} />}
      </div>

      {/* Footer */}
      {attentionItems.length === 0 && activeTab === 'attention' && (
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>All caught up!</span>
          </div>
        </div>
      )}
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
