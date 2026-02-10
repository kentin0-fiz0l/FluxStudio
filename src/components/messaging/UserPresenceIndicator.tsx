/**
 * User Presence Indicator Component
 * Shows online users and their status with real-time Socket.IO updates
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Users, Circle, Clock, CircleDashed, Moon, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';
import { messagingSocketService } from '../../services/messagingSocketService';

interface UserPresenceIndicatorProps {
  onlineUsers: MessageUser[];
  currentUser: MessageUser;
  onStartDirectMessage?: (user: MessageUser) => void;
  onUserStatusChange?: (userId: string, isOnline: boolean) => void;
  className?: string;
}

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

interface UserStatusUpdate {
  userId: string;
  status: string;
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
  onUserStatusChange,
  className
}: UserPresenceIndicatorProps) {
  const [filter, setFilter] = useState<'all' | 'online' | 'designers' | 'clients'>('all');
  const [users, setUsers] = useState<MessageUser[]>(onlineUsers);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize user statuses from props
  useEffect(() => {
    const initialStatuses = new Map<string, UserStatus>();
    onlineUsers.forEach((user) => {
      initialStatuses.set(user.id, user.isOnline ? 'online' : 'offline');
    });
    setUserStatuses(initialStatuses);
    setUsers(onlineUsers);
  }, [onlineUsers]);

  // Subscribe to Socket.IO presence events
  useEffect(() => {
    // Connect to messaging socket if not already connected
    messagingSocketService.connect();

    // Check connection status
    setIsConnected(messagingSocketService.getConnectionStatus());

    // Handle connection events
    const unsubConnect = messagingSocketService.on('connect', () => {
      setIsConnected(true);
      setLastUpdate(new Date());
    });

    const unsubDisconnect = messagingSocketService.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle user status updates
    const unsubStatus = messagingSocketService.on('user:status', (data: unknown) => {
      const statusData = data as UserStatusUpdate;
      const { userId, status } = statusData;

      setUserStatuses((prev) => {
        const updated = new Map(prev);
        updated.set(userId, status as UserStatus);
        return updated;
      });

      // Update user online status in the list
      setUsers((prevUsers) => {
        return prevUsers.map((user) => {
          if (user.id === userId) {
            const isOnline = status === 'online' || status === 'away' || status === 'busy';
            // Notify parent of status change
            onUserStatusChange?.(userId, isOnline);
            return {
              ...user,
              isOnline,
              lastSeen: isOnline ? undefined : new Date(),
            };
          }
          return user;
        });
      });

      setLastUpdate(new Date());
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubStatus();
    };
  }, [onUserStatusChange]);

  // Get user status from real-time data or fallback to prop data
  const getUserStatus = useCallback(
    (user: MessageUser): UserStatus => {
      const realtimeStatus = userStatuses.get(user.id);
      if (realtimeStatus) return realtimeStatus;
      return user.isOnline ? 'online' : 'offline';
    },
    [userStatuses]
  );

  const filteredUsers = users.filter((user) => {
    if (filter === 'online') {
      const status = getUserStatus(user);
      return status !== 'offline';
    }
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
            {/* Connection status indicator */}
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
              )}
              title={isConnected ? 'Connected to real-time updates' : 'Disconnected - reconnecting...'}
            />
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {users.filter((u) => getUserStatus(u) !== 'offline').length} online
            </Badge>
            <button
              onClick={() => {
                messagingSocketService.connect();
                setLastUpdate(new Date());
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={`Last updated: ${lastUpdate.toLocaleTimeString()}`}
            >
              <RefreshCw className={cn('w-4 h-4', !isConnected && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'online' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('online')}
          >
            Online
          </Button>
          <Button
            variant={filter === 'designers' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('designers')}
          >
            Designers
          </Button>
          <Button
            variant={filter === 'clients' ? 'primary' : 'outline'}
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
            {/* Online/Active Users First (sorted by status priority) */}
            {filteredUsers
              .filter((user) => getUserStatus(user) !== 'offline')
              .sort((a, b) => {
                const statusPriority: Record<UserStatus, number> = {
                  online: 0,
                  busy: 1,
                  away: 2,
                  offline: 3,
                };
                const aPriority = statusPriority[getUserStatus(a)];
                const bPriority = statusPriority[getUserStatus(b)];
                if (aPriority !== bPriority) return aPriority - bPriority;
                return a.name.localeCompare(b.name);
              })
              .map((user) => (
                <UserItem key={user.id} user={user} />
              ))}

            {/* Offline Users */}
            {filter === 'all' && (
              <>
                {filteredUsers.filter((user) => getUserStatus(user) !== 'offline').length > 0 &&
                  filteredUsers.filter((user) => getUserStatus(user) === 'offline').length > 0 && (
                    <div className="px-2 py-4">
                      <div className="border-t" />
                    </div>
                  )}

                {filteredUsers
                  .filter((user) => getUserStatus(user) === 'offline')
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
                  .map((user) => (
                    <UserItem key={user.id} user={user} />
                  ))}
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Status Summary */}
      <div className="p-4 border-t bg-muted/30">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-green-600">
              {users.filter((u) => getUserStatus(u) === 'online').length}
            </div>
            <div className="text-muted-foreground">Online</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-600">
              {users.filter((u) => getUserStatus(u) === 'away').length}
            </div>
            <div className="text-muted-foreground">Away</div>
          </div>
          <div>
            <div className="font-semibold text-red-600">
              {users.filter((u) => getUserStatus(u) === 'busy').length}
            </div>
            <div className="text-muted-foreground">Busy</div>
          </div>
          <div>
            <div className="font-semibold text-gray-600">
              {users.filter((u) => getUserStatus(u) === 'offline').length}
            </div>
            <div className="text-muted-foreground">Offline</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPresenceIndicator;