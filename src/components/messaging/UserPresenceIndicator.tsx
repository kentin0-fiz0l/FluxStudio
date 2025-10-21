/**
 * User Presence Indicator Component
 * Shows online users and their status
 */

import React, { useState } from 'react';
import { MessageCircle, Users, Circle, Clock, CircleDashed, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface UserPresenceIndicatorProps {
  onlineUsers: MessageUser[];
  currentUser: MessageUser;
  onStartDirectMessage?: (user: MessageUser) => void;
  className?: string;
}

const statusIcons = {
  online: Circle,
  away: Clock,
  busy: CircleDashed,
  offline: Moon,
};

const statusColors = {
  online: 'text-green-500',
  away: 'text-yellow-500',
  busy: 'text-red-500',
  offline: 'text-gray-400',
};

export function UserPresenceIndicator({
  onlineUsers,
  currentUser,
  onStartDirectMessage,
  className
}: UserPresenceIndicatorProps) {
  const [filter, setFilter] = useState<'all' | 'online' | 'designers' | 'clients'>('all');

  const filteredUsers = onlineUsers.filter(user => {
    if (filter === 'online' && !user.isOnline) return false;
    if (filter === 'designers' && user.userType !== 'designer') return false;
    if (filter === 'clients' && user.userType !== 'client') return false;
    return user.id !== currentUser.id;
  });

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Never';

    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return 'Never';

    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return dateObj.toLocaleDateString();
  };

  const getUserStatus = (user: MessageUser) => {
    if (!user.isOnline) return 'offline';
    // In a real app, you might have more sophisticated status detection
    return 'online';
  };

  const UserItem = ({ user }: { user: MessageUser }) => {
    const status = getUserStatus(user);
    const StatusIcon = statusIcons[status];

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
        {/* Avatar with Status */}
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <StatusIcon className={cn("w-4 h-4 fill-current", statusColors[status])} />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{user.name}</h4>
            <Badge variant="outline" className="text-xs capitalize">
              {user.userType}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{status}</span>
            {!user.isOnline && user.lastSeen && (
              <>
                <span>•</span>
                <span>Last seen {formatLastSeen(user.lastSeen)}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {onStartDirectMessage && user.isOnline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartDirectMessage(user)}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Online Users
          </h3>
          <Badge variant="secondary">
            {onlineUsers.filter(u => u.isOnline).length} online
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'online' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('online')}
          >
            Online
          </Button>
          <Button
            variant={filter === 'designers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('designers')}
          >
            Designers
          </Button>
          <Button
            variant={filter === 'clients' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('clients')}
          >
            Clients
          </Button>
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No users found</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'online'
                ? 'No users are currently online'
                : 'No users match the current filter'
              }
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Online Users First */}
            {filteredUsers
              .filter(user => user.isOnline)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(user => (
                <UserItem key={user.id} user={user} />
              ))
            }

            {/* Offline Users */}
            {filter === 'all' && (
              <>
                {filteredUsers.filter(user => user.isOnline).length > 0 &&
                 filteredUsers.filter(user => !user.isOnline).length > 0 && (
                  <div className="px-2 py-4">
                    <div className="border-t" />
                  </div>
                )}

                {filteredUsers
                  .filter(user => !user.isOnline)
                  .sort((a, b) => {
                    const getTime = (date: Date | undefined) => {
                      if (!date) return 0;
                      const dateObj = date instanceof Date ? date : new Date(date);
                      return isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
                    };
                    const aTime = getTime(a.lastSeen);
                    const bTime = getTime(b.lastSeen);
                    return bTime - aTime; // Most recently seen first
                  })
                  .map(user => (
                    <UserItem key={user.id} user={user} />
                  ))
                }
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Status Summary */}
      <div className="p-4 border-t bg-muted/30">
        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-green-600">
              {onlineUsers.filter(u => u.isOnline).length}
            </div>
            <div className="text-muted-foreground">Online</div>
          </div>
          <div>
            <div className="font-semibold text-gray-600">
              {onlineUsers.filter(u => !u.isOnline).length}
            </div>
            <div className="text-muted-foreground">Offline</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPresenceIndicator;