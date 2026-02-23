/**
 * UserCard Molecule - Flux Design Language
 *
 * A reusable user card component for displaying user information.
 * Supports avatars, badges, and actions.
 *
 * @example
 * <UserCard
 *   user={{ name: 'John Doe', email: 'john@example.com', avatar: '...' }}
 *   showActions
 * />
 */

import * as React from 'react';
import { Mail, MoreVertical, User } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface UserCardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
}

export interface UserCardUser {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  initials?: string;
}

export interface UserCardProps {
  /**
   * User data
   */
  user: UserCardUser;

  /**
   * Show action buttons
   */
  showActions?: boolean;

  /**
   * Show email
   */
  showEmail?: boolean;

  /**
   * Show role badge
   */
  showRole?: boolean;

  /**
   * Show status indicator
   */
  showStatus?: boolean;

  /**
   * Click callback
   */
  onClick?: (user: UserCardUser) => void;

  /**
   * Message callback
   */
  onMessage?: (user: UserCardUser) => void;

  /**
   * More options callback
   */
  onMoreOptions?: (user: UserCardUser) => void;

  /**
   * View profile callback
   */
  onView?: () => void;

  /**
   * Custom action buttons
   */
  actions?: UserCardAction[];

  /**
   * Custom className
   */
  className?: string;

  /**
   * Variant
   */
  variant?: 'default' | 'compact' | 'detailed';
}

export const UserCard = React.forwardRef<HTMLDivElement, UserCardProps>(
  (
    {
      user,
      showActions = false,
      showEmail = true,
      showRole = true,
      showStatus = true,
      onClick,
      onMessage,
      onMoreOptions,
      onView,
      actions,
      className,
      variant = 'default',
    },
    ref
  ) => {
    // Get initials from name
    const getInitials = (name: string) => {
      return user.initials || name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    // Status color mapping
    const statusColors = {
      online: 'bg-success-500',
      offline: 'bg-neutral-400',
      away: 'bg-warning-500',
      busy: 'bg-error-500',
    };

    // Role badge variant
    const getRoleBadgeVariant = (role?: string) => {
      if (!role) return 'default';
      const lowerRole = role.toLowerCase();
      if (lowerRole.includes('admin')) return 'solidPrimary';
      if (lowerRole.includes('owner')) return 'solidSecondary';
      if (lowerRole.includes('member')) return 'default';
      return 'outline';
    };

    return (
      <Card
        ref={ref}
        interactive={!!onClick}
        onClick={() => onClick?.(user)}
        className={cn(
          'transition-all',
          variant === 'compact' && 'p-4',
          variant === 'detailed' && 'p-6',
          className
        )}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className={cn(
                  'rounded-full object-cover',
                  variant === 'compact' ? 'h-10 w-10' : 'h-12 w-12'
                )}
              />
            ) : (
              <div
                className={cn(
                  'rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 flex items-center justify-center font-semibold',
                  variant === 'compact' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'
                )}
              >
                {getInitials(user.name)}
              </div>
            )}

            {/* Status indicator */}
            {showStatus && user.status && (
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900',
                  statusColors[user.status]
                )}
                aria-label={`Status: ${user.status}`}
              />
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    'font-semibold text-neutral-900 dark:text-neutral-100 truncate',
                    variant === 'compact' ? 'text-sm' : 'text-base'
                  )}
                >
                  {user.name}
                </h3>

                {showEmail && user.email && (
                  <p
                    className={cn(
                      'text-neutral-500 dark:text-neutral-400 truncate',
                      variant === 'compact' ? 'text-xs' : 'text-sm'
                    )}
                  >
                    {user.email}
                  </p>
                )}
              </div>

              {/* More options button or actions dropdown */}
              {(onMoreOptions || (actions && actions.length > 0)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMoreOptions && !actions) {
                          onMoreOptions(user);
                        }
                      }}
                      className="flex-shrink-0"
                      aria-label={`More options for ${user.name}`}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  {actions && actions.length > 0 && (
                    <DropdownMenuContent align="end">
                      {actions.map((action, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            action.onClick();
                          }}
                          className={cn(
                            action.variant === 'danger' && 'text-error-600 focus:text-error-600'
                          )}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              )}
            </div>

            {/* Role badge */}
            {showRole && user.role && (
              <div className="mt-2">
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                  {user.role}
                </Badge>
              </div>
            )}

            {/* Actions */}
            {showActions && onMessage && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Mail className="h-4 w-4" aria-hidden="true" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage(user);
                  }}
                >
                  Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<User className="h-4 w-4" aria-hidden="true" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onView) {
                      onView();
                    } else {
                      onClick?.(user);
                    }
                  }}
                >
                  View Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }
);

UserCard.displayName = 'UserCard';
