/**
 * PresenceIndicator - Displays active collaborators and their status
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { collaborationService, CollaboratorPresence } from '../../services/collaborationService';

interface PresenceIndicatorProps {
  roomId?: string;
  roomType?: 'project' | 'document' | 'canvas';
  className?: string;
  showDetails?: boolean;
  maxDisplay?: number;
}

export function PresenceIndicator({
  roomId,
  roomType = 'project',
  className,
  showDetails = false,
  maxDisplay = 5
}: PresenceIndicatorProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;

    // Join collaboration room
    collaborationService.joinRoom(roomId, roomType);

    // Set up event listeners
    collaborationService.onPresenceChanged((presence) => {
      const activeCollaborators = Array.from(presence.values())
        .filter(p => p.status === 'online');
      setCollaborators(activeCollaborators);
    });

    collaborationService.onTypingChanged((userId, isTyping) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });

    return () => {
      collaborationService.leaveRoom();
    };
  }, [roomId, roomType]);

  if (collaborators.length === 0) {
    return null;
  }

  const displayedCollaborators = collaborators.slice(0, maxDisplay);
  const remainingCount = Math.max(0, collaborators.length - maxDisplay);

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Active collaborators label */}
        {showDetails && (
          <span className="text-xs text-gray-500">
            {collaborators.length} active {collaborators.length === 1 ? 'user' : 'users'}
          </span>
        )}

        {/* Collaborator avatars */}
        <div className="flex -space-x-2">
          <AnimatePresence>
            {displayedCollaborators.map((collaborator) => (
              <motion.div
                key={collaborator.userId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className={cn(
                        "h-8 w-8 border-2 border-white shadow-sm cursor-pointer",
                        "hover:z-10 hover:scale-110 transition-transform"
                      )}>
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback className="text-xs bg-primary-600 text-white">
                          {collaborator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Status indicator */}
                      <div className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
                        collaborator.status === 'online' ? 'bg-green-500' :
                        collaborator.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-400'
                      )} />

                      {/* Typing indicator */}
                      {typingUsers.has(collaborator.userId) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1"
                        >
                          <div className="flex gap-0.5 bg-white rounded-full p-1 shadow-sm">
                            <motion.div
                              className="w-1 h-1 bg-gray-500 rounded-full"
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                              className="w-1 h-1 bg-gray-500 rounded-full"
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                              className="w-1 h-1 bg-gray-500 rounded-full"
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{collaborator.name}</p>
                      <p className="text-xs text-gray-500">{collaborator.email}</p>
                      {collaborator.currentPage && (
                        <p className="text-xs text-gray-400">
                          Viewing: {collaborator.currentPage}
                        </p>
                      )}
                      {typingUsers.has(collaborator.userId) && (
                        <p className="text-xs text-blue-500">Typing...</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Remaining count */}
          {remainingCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-0"
            >
              <Avatar className="h-8 w-8 border-2 border-white shadow-sm bg-gray-100">
                <AvatarFallback className="text-xs text-gray-600">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          )}
        </div>

        {/* Live indicator */}
        {collaborators.length > 0 && (
          <Badge variant="outline" className="h-6 px-2 text-xs border-green-500 text-green-600">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

// Cursor tracking component for live cursor positions
export function CursorPresence({ userId, cursor, userName }: {
  userId: string;
  cursor: { x: number; y: number };
  userName: string;
}) {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500'
  ];

  // Generate consistent color based on userId
  const colorIndex = userId.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{
        x: cursor.x,
        y: cursor.y,
        opacity: 1
      }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 200
      }}
    >
      {/* Cursor */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="relative"
      >
        <path
          d="M5.5 3.5L20.5 12L12 14.5L9.5 20.5L5.5 3.5Z"
          className={color}
          fill="currentColor"
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* User name label */}
      <div
        className={cn(
          "absolute top-5 left-5 px-2 py-1 rounded text-white text-xs whitespace-nowrap shadow-sm",
          color
        )}
      >
        {userName}
      </div>
    </motion.div>
  );
}