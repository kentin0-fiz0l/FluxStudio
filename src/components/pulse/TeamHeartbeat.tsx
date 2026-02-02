/**
 * TeamHeartbeat - Team presence and activity indicator
 *
 * Shows who's online and what they're working on:
 * - Online team members
 * - Recent contributions
 * - Current viewing location
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import { Users, Circle, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamMember } from '@/hooks/useProjectPulse';

export interface TeamHeartbeatProps {
  /** Team members data */
  members: TeamMember[];
  /** Custom className */
  className?: string;
  /** Compact mode for sidebar */
  compact?: boolean;
  /** Maximum avatars to show before "+X" */
  maxAvatars?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function MemberAvatar({
  member,
  size = 'md',
}: {
  member: TeamMember;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div className="relative" title={member.name}>
      {member.avatar ? (
        <img
          src={member.avatar}
          alt={member.name}
          className={cn(
            'rounded-full border-2 border-white dark:border-neutral-900',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full border-2 border-white dark:border-neutral-900',
            'bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center',
            'font-medium text-neutral-600 dark:text-neutral-300',
            sizeClasses[size]
          )}
        >
          {getInitials(member.name)}
        </div>
      )}
      {/* Online indicator */}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2',
          'border-white dark:border-neutral-900',
          member.isOnline
            ? 'bg-green-500'
            : 'bg-neutral-400 dark:bg-neutral-600'
        )}
      />
    </div>
  );
}

function MemberRow({
  member,
  compact,
}: {
  member: TeamMember;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg',
        compact ? 'p-2' : 'p-3',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
      )}
    >
      <MemberAvatar member={member} size={compact ? 'sm' : 'md'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium text-neutral-900 dark:text-neutral-100 truncate',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {member.name}
          </span>
          {member.isOnline && (
            <span className="text-xs text-green-600 dark:text-green-400">
              online
            </span>
          )}
        </div>
        {member.currentView && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
            <Eye className="h-3 w-3" />
            {member.currentView}
          </p>
        )}
        {!member.isOnline && member.lastActivity && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {member.lastActivity}
          </p>
        )}
      </div>
    </div>
  );
}

export function TeamHeartbeat({
  members,
  className,
  compact = false,
  maxAvatars = 5,
}: TeamHeartbeatProps) {
  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  if (members.length === 0) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <Users className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No team members
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Invite people to collaborate on this project
        </p>
      </div>
    );
  }

  // Compact view: just avatars
  if (compact) {
    const displayMembers = members.slice(0, maxAvatars);
    const remainingCount = members.length - maxAvatars;

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex -space-x-2">
          {displayMembers.map((member) => (
            <MemberAvatar key={member.id} member={member} size="sm" />
          ))}
          {remainingCount > 0 && (
            <div
              className={cn(
                'w-6 h-6 rounded-full border-2 border-white dark:border-neutral-900',
                'bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center',
                'text-[10px] font-medium text-neutral-600 dark:text-neutral-300'
              )}
            >
              +{remainingCount}
            </div>
          )}
        </div>
        {onlineMembers.length > 0 && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {onlineMembers.length} online
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Users className="h-4 w-4" />
          <span>{members.length} team members</span>
        </div>
        {onlineMembers.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Circle className="h-2 w-2 fill-current" />
            {onlineMembers.length} online
          </div>
        )}
      </div>

      {/* Online members */}
      {onlineMembers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-3 py-1">
            Online now
          </p>
          {onlineMembers.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      )}

      {/* Offline members */}
      {offlineMembers.length > 0 && onlineMembers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-3 py-1 mt-2">
            Offline
          </p>
          {offlineMembers.slice(0, 3).map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
          {offlineMembers.length > 3 && (
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 py-2">
              +{offlineMembers.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* If no online members, show all */}
      {onlineMembers.length === 0 && (
        <div>
          {members.slice(0, 5).map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
          {members.length > 5 && (
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 py-2">
              +{members.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamHeartbeat;
