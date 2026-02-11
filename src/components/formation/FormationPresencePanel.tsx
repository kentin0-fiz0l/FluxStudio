/**
 * FormationPresencePanel Component
 *
 * Displays active collaborators in a formation editing session.
 * Shows user avatars, names, and activity status.
 */

import React, { useMemo } from 'react';
import { Users, Wifi, WifiOff, Eye, Edit3 } from 'lucide-react';
import { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

interface FormationPresencePanelProps {
  /** List of remote collaborators */
  collaborators: FormationAwarenessState[];
  /** Current connection status */
  isConnected: boolean;
  /** Is still syncing initial state */
  isSyncing?: boolean;
  /** Current user info */
  currentUser?: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationPresencePanel({
  collaborators,
  isConnected,
  isSyncing = false,
  currentUser,
  className = '',
}: FormationPresencePanelProps) {
  // Sort collaborators by activity (most recent first)
  const sortedCollaborators = useMemo(() => {
    return [...collaborators].sort((a, b) => b.lastActivity - a.lastActivity);
  }, [collaborators]);

  // Count active vs idle users (for future UI features)
  const { activeCount: _activeCount, idleCount: _idleCount } = useMemo(() => {
    const now = Date.now();
    const IDLE_THRESHOLD = 30000; // 30 seconds

    let active = 0;
    let idle = 0;

    collaborators.forEach((c) => {
      if (now - c.lastActivity < IDLE_THRESHOLD) {
        active++;
      } else {
        idle++;
      }
    });

    return { activeCount: active, idleCount: idle };
  }, [collaborators]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection status badge */}
      <Badge
        variant={isConnected ? 'default' : 'secondary'}
        className="gap-1 px-2 py-1"
      >
        {isSyncing ? (
          <>
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Syncing...</span>
          </>
        ) : isConnected ? (
          <>
            <Wifi className="w-3 h-3" />
            <span className="text-xs">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="text-xs">Offline</span>
          </>
        )}
      </Badge>

      {/* Collaborator count */}
      {collaborators.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 px-2 py-1 cursor-default">
                <Users className="w-3 h-3" />
                <span className="text-xs">{collaborators.length + 1}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-0">
              <CollaboratorList
                collaborators={sortedCollaborators}
                currentUser={currentUser}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Avatar stack (max 4 visible) */}
      <AvatarStack
        collaborators={sortedCollaborators}
        currentUser={currentUser}
        maxVisible={4}
      />
    </div>
  );
}

// ============================================================================
// Avatar Stack Component
// ============================================================================

interface AvatarStackProps {
  collaborators: FormationAwarenessState[];
  currentUser?: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
  maxVisible?: number;
}

function AvatarStack({ collaborators, currentUser, maxVisible = 4 }: AvatarStackProps) {
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const remaining = collaborators.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2">
      {/* Current user avatar (always first) */}
      {currentUser && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold cursor-default relative z-10"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(currentUser.name)
                )}
                {/* "You" indicator */}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>{currentUser.name} (You)</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Other collaborators */}
      {visibleCollaborators.map((collaborator, index) => (
        <CollaboratorAvatar
          key={collaborator.user.id}
          collaborator={collaborator}
          style={{ zIndex: maxVisible - index }}
        />
      ))}

      {/* Overflow indicator */}
      {remaining > 0 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center bg-gray-400 text-white text-xs font-bold"
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Collaborator Avatar Component
// ============================================================================

interface CollaboratorAvatarProps {
  collaborator: FormationAwarenessState;
  style?: React.CSSProperties;
}

function CollaboratorAvatar({ collaborator, style }: CollaboratorAvatarProps) {
  const { user, isActive, lastActivity, draggingPerformerId } = collaborator;

  const isIdle = Date.now() - lastActivity > 30000;
  const isDragging = !!draggingPerformerId;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold cursor-default transition-opacity ${
              isIdle ? 'opacity-60' : 'opacity-100'
            }`}
            style={{ backgroundColor: user.color, ...style }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user.name)
            )}

            {/* Activity indicator */}
            {isDragging && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse" />
            )}
            {!isDragging && isActive && !isIdle && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{user.name}</p>
            {isDragging && (
              <p className="text-xs text-orange-400">Moving a performer</p>
            )}
            {isIdle && (
              <p className="text-xs text-gray-400">Idle</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Collaborator List Component (for tooltip dropdown)
// ============================================================================

interface CollaboratorListProps {
  collaborators: FormationAwarenessState[];
  currentUser?: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
}

function CollaboratorList({ collaborators, currentUser }: CollaboratorListProps) {
  return (
    <div className="p-2 min-w-[200px]">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
        Collaborators ({collaborators.length + (currentUser ? 1 : 0)})
      </div>

      <div className="space-y-1">
        {/* Current user */}
        {currentUser && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: currentUser.color }}
            >
              {getInitials(currentUser.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">You</p>
            </div>
            <Edit3 className="w-3 h-3 text-green-500" />
          </div>
        )}

        {/* Other collaborators */}
        {collaborators.map((collaborator) => {
          const isIdle = Date.now() - collaborator.lastActivity > 30000;
          const isDragging = !!collaborator.draggingPerformerId;

          return (
            <div
              key={collaborator.user.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                  isIdle ? 'opacity-60' : ''
                }`}
                style={{ backgroundColor: collaborator.user.color }}
              >
                {collaborator.user.avatar ? (
                  <img
                    src={collaborator.user.avatar}
                    alt={collaborator.user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(collaborator.user.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{collaborator.user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isDragging
                    ? 'Moving a performer'
                    : isIdle
                    ? 'Idle'
                    : 'Active'}
                </p>
              </div>
              {isDragging ? (
                <Edit3 className="w-3 h-3 text-orange-500 animate-pulse" />
              ) : isIdle ? (
                <Eye className="w-3 h-3 text-gray-400" />
              ) : (
                <Edit3 className="w-3 h-3 text-green-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function getInitials(name: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

// ============================================================================
// Export
// ============================================================================

export default FormationPresencePanel;
