/**
 * CollaboratorActivity Component
 *
 * Shows what each collaborator is currently doing in the formation editor.
 * Displays activity descriptions, small avatar badges for canvas overlay,
 * and an activity feed with the last 5 actions per user.
 */

import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { Users, Edit3, MousePointer, Move, Eye, Clock } from 'lucide-react';
import type { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  action: string;
  timestamp: number;
}

interface CollaboratorActivityProps {
  /** List of remote collaborators from awareness */
  collaborators: FormationAwarenessState[];
  /** Current set name for contextual descriptions */
  currentSetName?: string;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const IDLE_THRESHOLD = 30_000; // 30 seconds
const MAX_FEED_ENTRIES_PER_USER = 5;
const MAX_TOTAL_FEED_ENTRIES = 20;

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function describeActivity(
  collaborator: FormationAwarenessState,
  currentSetName?: string,
): string {
  const { draggingPerformerId, selectedPerformerIds, activeKeyframeId, cursor, isActive, lastActivity } = collaborator;
  const now = Date.now();

  if (now - lastActivity > IDLE_THRESHOLD) {
    return 'Idle';
  }

  if (draggingPerformerId) {
    return `Moving performer ${draggingPerformerId.split('-').pop() ?? ''}`;
  }

  if (selectedPerformerIds && selectedPerformerIds.length > 0) {
    if (selectedPerformerIds.length === 1) {
      return 'Selecting a performer';
    }
    return `Selecting ${selectedPerformerIds.length} performers`;
  }

  if (activeKeyframeId) {
    const setLabel = currentSetName ? currentSetName : `keyframe ${activeKeyframeId.split('-').pop() ?? ''}`;
    return `Editing ${setLabel}`;
  }

  if (cursor) {
    return 'Viewing canvas';
  }

  if (isActive) {
    return 'Active';
  }

  return 'Idle';
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

// ============================================================================
// Avatar Badge (for canvas overlay)
// ============================================================================

interface AvatarBadgeProps {
  collaborator: FormationAwarenessState;
  currentSetName?: string;
}

function AvatarBadge({ collaborator, currentSetName }: AvatarBadgeProps) {
  const { user, cursor } = collaborator;
  const activity = describeActivity(collaborator, currentSetName);
  const isIdle = Date.now() - collaborator.lastActivity > IDLE_THRESHOLD;

  if (!cursor) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`absolute pointer-events-auto cursor-default transition-all duration-200 ${
              isIdle ? 'opacity-40' : 'opacity-100'
            }`}
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              transform: 'translate(-50%, -120%)',
              zIndex: 50,
            }}
          >
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white text-[10px] font-medium shadow-md"
              style={{ backgroundColor: user.color }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                  {getInitials(user.name)}
                </span>
              )}
              <span className="max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
            </div>
            {/* Pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: `4px solid ${user.color}`,
              }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{user.name}</p>
          <p className="text-gray-400">{activity}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Activity Feed
// ============================================================================

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-xs text-gray-400 dark:text-gray-500">
        <Clock className="w-3 h-3 mr-1.5" aria-hidden="true" />
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
            style={{ backgroundColor: entry.userColor }}
          >
            {getInitials(entry.userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
              <span className="font-medium">{entry.userName.split(' ')[0]}</span>{' '}
              <span className="text-gray-500 dark:text-gray-400">{entry.action}</span>
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatTimeAgo(entry.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CollaboratorActivity({
  collaborators,
  currentSetName,
  className = '',
}: CollaboratorActivityProps) {
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const prevStatesRef = useRef<Map<string, string>>(new Map());

  // Track activity changes and build feed
  const updateActivityFeed = useCallback(() => {
    const newEntries: ActivityEntry[] = [];

    for (const collab of collaborators) {
      const prevAction = prevStatesRef.current.get(collab.user.id);
      const currentAction = describeActivity(collab, currentSetName);

      if (prevAction !== currentAction && currentAction !== 'Idle' && currentAction !== 'Active') {
        newEntries.push({
          id: `${collab.user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: collab.user.id,
          userName: collab.user.name,
          userColor: collab.user.color,
          action: currentAction.toLowerCase(),
          timestamp: Date.now(),
        });
      }

      prevStatesRef.current.set(collab.user.id, currentAction);
    }

    if (newEntries.length > 0) {
      setActivityFeed((prev) => {
        const updated = [...newEntries, ...prev];

        // Enforce per-user limit
        const countByUser = new Map<string, number>();
        const filtered = updated.filter((entry) => {
          const count = countByUser.get(entry.userId) ?? 0;
          if (count >= MAX_FEED_ENTRIES_PER_USER) return false;
          countByUser.set(entry.userId, count + 1);
          return true;
        });

        return filtered.slice(0, MAX_TOTAL_FEED_ENTRIES);
      });
    }
  }, [collaborators, currentSetName]);

  useEffect(() => {
    updateActivityFeed();
  }, [updateActivityFeed]);

  // Active collaborator descriptions
  const collaboratorActivities = useMemo(() => {
    return collaborators.map((collab) => ({
      ...collab,
      activityDescription: describeActivity(collab, currentSetName),
    }));
  }, [collaborators, currentSetName]);

  const activeCollaborators = collaboratorActivities.filter(
    (c) => Date.now() - c.lastActivity < IDLE_THRESHOLD,
  );
  const idleCollaborators = collaboratorActivities.filter(
    (c) => Date.now() - c.lastActivity >= IDLE_THRESHOLD,
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Current Activity Summary */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Activity ({collaborators.length} online)
          </span>
        </div>

        {/* Active collaborators */}
        {activeCollaborators.length > 0 && (
          <div className="space-y-1.5">
            {activeCollaborators.map((collab) => (
              <div
                key={collab.user.id}
                className="flex items-center gap-2 text-xs"
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: collab.user.color }}
                >
                  {collab.user.avatar ? (
                    <img
                      src={collab.user.avatar}
                      alt={collab.user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(collab.user.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {collab.user.name}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    {collab.activityDescription === 'Active' ? (
                      'is active'
                    ) : collab.activityDescription === 'Viewing canvas' ? (
                      'is viewing canvas'
                    ) : (
                      `is ${collab.activityDescription.toLowerCase()}`
                    )}
                  </span>
                </div>
                {collab.draggingPerformerId ? (
                  <Move className="w-3 h-3 text-orange-500 flex-shrink-0 animate-pulse" aria-hidden="true" />
                ) : collab.selectedPerformerIds && collab.selectedPerformerIds.length > 0 ? (
                  <MousePointer className="w-3 h-3 text-blue-500 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Edit3 className="w-3 h-3 text-green-500 flex-shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Idle collaborators */}
        {idleCollaborators.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
              <Eye className="w-3 h-3" aria-hidden="true" />
              {idleCollaborators.length === 1
                ? `${idleCollaborators[0].user.name} is idle`
                : `${idleCollaborators.length} idle`}
            </div>
          </div>
        )}

        {collaborators.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            No collaborators in session
          </p>
        )}
      </div>

      {/* Activity Feed */}
      <div className="px-1 py-2">
        <div className="flex items-center gap-1.5 px-2 mb-1.5">
          <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Recent Activity
          </span>
        </div>
        <ActivityFeed entries={activityFeed} />
      </div>

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {activeCollaborators.length > 0 &&
          `${activeCollaborators.length} active collaborators. ` +
            activeCollaborators
              .map((c) => `${c.user.name} ${c.activityDescription.toLowerCase()}`)
              .join('. ')}
      </div>
    </div>
  );
}

// ============================================================================
// Canvas Avatar Badges Overlay
// ============================================================================

interface CollaboratorAvatarBadgesProps {
  collaborators: FormationAwarenessState[];
  currentSetName?: string;
}

export function CollaboratorAvatarBadges({
  collaborators,
  currentSetName,
}: CollaboratorAvatarBadgesProps) {
  const collaboratorsWithCursor = collaborators.filter((c) => c.cursor);

  if (collaboratorsWithCursor.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {collaboratorsWithCursor.map((collab) => (
        <AvatarBadge
          key={collab.user.id}
          collaborator={collab}
          currentSetName={currentSetName}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default CollaboratorActivity;
