/**
 * PresenceIndicators Component
 * Real-time presence and activity indicators for collaborative messaging
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Eye, MessageCircle, Edit3, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { realtimeCollaborationService, PresenceUser, TypingIndicator } from '../../services/realtimeCollaborationService';
import { MessageUser } from '../../types/messaging';

interface PresenceIndicatorsProps {
  conversationId: string;
  currentUser: MessageUser;
  className?: string;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  color: string;
  userName: string;
}

export function PresenceIndicators({
  conversationId,
  currentUser,
  className
}: PresenceIndicatorsProps) {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    // Initialize collaboration service
    realtimeCollaborationService.connect();
    realtimeCollaborationService.joinAsUser(currentUser);
    realtimeCollaborationService.joinConversation(conversationId);

    // Event listeners
    const handlePresenceUpdate = (users: PresenceUser[]) => {
      setPresenceUsers(users);
    };

    const handleConnectionStatus = (status: { connected: boolean; offline?: boolean }) => {
      setIsConnected(status.connected);
      setConnectionStatus(status.connected ? 'connected' : status.offline ? 'disconnected' : 'connecting');
    };

    const handleUserJoined = (user: PresenceUser) => {
      setPresenceUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      setPresenceUsers(prev => prev.filter(u => u.id !== userId));
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setCursors(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };

    const handleTypingIndicator = (indicator: TypingIndicator) => {
      if (indicator.conversationId !== conversationId) return;

      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (indicator.isTyping) {
          newSet.add(indicator.userId);
        } else {
          newSet.delete(indicator.userId);
        }
        return newSet;
      });

      // Auto-clear typing indicator after 3 seconds
      if (indicator.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(indicator.userId);
            return newSet;
          });
        }, 3000);
      }
    };

    const handleCursorMove = (data: { userId: string; position: { x: number; y: number }; conversationId: string }) => {
      if (data.conversationId !== conversationId) return;

      const user = presenceUsers.find(u => u.id === data.userId);
      if (user) {
        setCursors(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            userId: data.userId,
            x: data.position.x,
            y: data.position.y,
            color: user.color,
            userName: user.name
          });
          return newMap;
        });

        // Clear cursor after 2 seconds of inactivity
        setTimeout(() => {
          setCursors(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }, 2000);
      }
    };

    // Attach event listeners
    realtimeCollaborationService.on('presence_update', handlePresenceUpdate);
    realtimeCollaborationService.on('connection_status', handleConnectionStatus);
    realtimeCollaborationService.on('user_joined', handleUserJoined);
    realtimeCollaborationService.on('user_left', handleUserLeft);
    realtimeCollaborationService.on('typing_indicator', handleTypingIndicator);
    realtimeCollaborationService.on('cursor_move', handleCursorMove);

    // Track mouse movement for cursor sharing
    const handleMouseMove = (e: MouseEvent) => {
      if (isConnected) {
        realtimeCollaborationService.sendCursorPosition(conversationId, {
          x: e.clientX,
          y: e.clientY
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      // Cleanup
      realtimeCollaborationService.off('presence_update', handlePresenceUpdate);
      realtimeCollaborationService.off('connection_status', handleConnectionStatus);
      realtimeCollaborationService.off('user_joined', handleUserJoined);
      realtimeCollaborationService.off('user_left', handleUserLeft);
      realtimeCollaborationService.off('typing_indicator', handleTypingIndicator);
      realtimeCollaborationService.off('cursor_move', handleCursorMove);

      document.removeEventListener('mousemove', handleMouseMove);
      realtimeCollaborationService.leaveConversation(conversationId);
    };
  }, [conversationId, currentUser.id, isConnected]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi size={14} className="text-green-600" />;
      case 'connecting':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Wifi size={14} className="text-yellow-600" />
        </motion.div>;
      case 'disconnected':
        return <WifiOff size={14} className="text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
    }
  };

  const UserCursor = ({ cursor }: { cursor: CursorPosition }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed pointer-events-none z-50"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: 'translate(-2px, -2px)'
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M2 2L18 10L8 12L2 18L2 2Z"
          fill={cursor.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        className="ml-4 -mt-1 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.userName}
      </div>
    </motion.div>
  );

  const TypingIndicator = () => {
    const typingUserNames = presenceUsers
      .filter(user => typingUsers.has(user.id))
      .map(user => user.name);

    if (typingUserNames.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Edit3 size={14} />
        </motion.div>
        <span>
          {typingUserNames.length === 1
            ? `${typingUserNames[0]} is typing...`
            : typingUserNames.length === 2
            ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`
            : `${typingUserNames[0]} and ${typingUserNames.length - 1} others are typing...`
          }
        </span>
      </motion.div>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center justify-between', className)}>
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-xs font-medium text-gray-600">
                  {getStatusText()}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {connectionStatus === 'connected' && 'Real-time collaboration active'}
              {connectionStatus === 'connecting' && 'Connecting to collaboration server...'}
              {connectionStatus === 'disconnected' && 'Working offline - real-time features unavailable'}
            </TooltipContent>
          </Tooltip>

          {/* Online Users Count */}
          {presenceUsers.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Users size={10} className="mr-1" />
              {presenceUsers.length + 1} online
            </Badge>
          )}
        </div>

        {/* Presence Avatars */}
        <div className="flex items-center gap-1">
          <AnimatePresence>
            {presenceUsers.slice(0, 5).map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="w-6 h-6 border-2 border-white shadow-sm">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback
                          className="text-xs text-white font-medium"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Activity indicators */}
                      {typingUsers.has(user.id) && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"
                        />
                      )}

                      {user.currentView && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white">
                          <Eye size={8} className="text-white p-0.5" />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{user.name}</p>
                      {typingUsers.has(user.id) && (
                        <p className="text-xs text-blue-600">Typing...</p>
                      )}
                      {user.currentView && (
                        <p className="text-xs text-green-600">Viewing: {user.currentView}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Last seen: {user.lastSeen.toLocaleTimeString()}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Overflow indicator */}
          {presenceUsers.length > 5 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 bg-gray-100 border-2 border-white shadow-sm rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-600 font-medium">
                    +{presenceUsers.length - 5}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <p className="font-medium">Additional users online:</p>
                  {presenceUsers.slice(5).map(user => (
                    <p key={user.id} className="text-xs">{user.name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Live Cursors */}
        <AnimatePresence>
          {Array.from(cursors.values()).map(cursor => (
            <UserCursor key={cursor.userId} cursor={cursor} />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.size > 0 && (
            <div className="fixed bottom-4 left-4 z-40">
              <TypingIndicator />
            </div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

export default PresenceIndicators;