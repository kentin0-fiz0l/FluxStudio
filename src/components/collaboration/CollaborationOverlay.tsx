/**
 * Collaboration Overlay Component
 * Shows real-time collaboration features like cursors, presence, and activity
 */

import React, { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  Users,
  MousePointer,
  MessageSquare,
  Video,
  ScreenShare,
  Eye,
  Edit,
  Circle,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  X,
  Send,
  Smile
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collaborationService,
  CollaboratorPresence,
  CursorPosition,
  SelectionRange
} from '../../services/realtimeCollaboration';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CollaborationOverlayProps {
  resourceId: string;
  resourceType: 'project' | 'document' | 'design' | 'review';
  children: React.ReactNode;
}

interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  position: CursorPosition;
}

interface RemoteSelection {
  userId: string;
  name: string;
  color: string;
  selection: SelectionRange;
}

export function CollaborationOverlay({
  resourceId,
  resourceType,
  children
}: CollaborationOverlayProps) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [remoteSelections, setRemoteSelections] = useState<Map<string, RemoteSelection>>(new Map());
  const [showPresence, setShowPresence] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Join collaboration session
    collaborationService.joinSession(resourceType, resourceId, {
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      avatar: user.avatar
    });

    // Setup event listeners
    collaborationService.on('presence:update', handlePresenceUpdate);
    collaborationService.on('cursor:move', handleCursorMove);
    collaborationService.on('selection:change', handleSelectionChange);
    collaborationService.on('comment:add', handleCommentAdd);

    // Track local mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const position: CursorPosition = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          timestamp: Date.now()
        };
        collaborationService.updateCursor(position);
      }
    };

    // Track local selection
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Convert to line/column format (simplified)
        const selectionRange: SelectionRange = {
          start: { line: 0, column: range.startOffset },
          end: { line: 0, column: range.endOffset },
          text: selection.toString()
        };
        collaborationService.updateSelection(selectionRange);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('selectionchange', handleSelectionChange);
      collaborationService.off('presence:update', handlePresenceUpdate);
      collaborationService.off('cursor:move', handleCursorMove);
      collaborationService.off('selection:change', handleSelectionChange);
      collaborationService.off('comment:add', handleCommentAdd);
      collaborationService.leaveSession(`${resourceType}_${resourceId}`);
    };
  }, [user, resourceId, resourceType]);

  const handlePresenceUpdate = (presence: CollaboratorPresence) => {
    setCollaborators(prev => {
      const updated = [...prev];
      const index = updated.findIndex(c => c.userId === presence.userId);
      if (index >= 0) {
        updated[index] = presence;
      } else {
        updated.push(presence);
      }
      return updated.filter(c => c.status !== 'offline');
    });
  };

  const handleCursorMove = ({ userId, cursor }: { userId: string; cursor: CursorPosition }) => {
    if (userId === user?.id) return;

    const collaborator = collaborators.find(c => c.userId === userId);
    if (collaborator) {
      setRemoteCursors(prev => new Map(prev.set(userId, {
        userId,
        name: collaborator.user.name,
        color: collaborator.color,
        position: cursor
      })));
    }
  };

  const handleSelectionChange = ({ userId, selection }: { userId: string; selection: SelectionRange }) => {
    if (userId === user?.id) return;

    const collaborator = collaborators.find(c => c.userId === userId);
    if (collaborator) {
      setRemoteSelections(prev => new Map(prev.set(userId, {
        userId,
        name: collaborator.user.name,
        color: collaborator.color,
        selection
      })));
    }
  };

  const handleCommentAdd = (comment: any) => {
    setMessages(prev => [...prev, comment]);
  };

  const startScreenShare = async () => {
    const stream = await collaborationService.startScreenShare(`${resourceType}_${resourceId}`);
    if (stream) {
      setIsScreenSharing(true);
    }
  };

  const sendMessage = () => {
    if (inputMessage.trim()) {
      collaborationService.addComment(inputMessage);
      setInputMessage('');
    }
  };

  const getStatusColor = (status: CollaboratorPresence['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Main Content */}
      {children}

      {/* Remote Cursors */}
      <AnimatePresence>
        {Array.from(remoteCursors.values()).map(cursor => (
          <motion.div
            key={cursor.userId}
            className="absolute pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: cursor.position.x,
              y: cursor.position.y
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="relative">
              <MousePointer
                size={20}
                style={{ color: cursor.color }}
                className="drop-shadow-md"
              />
              <div
                className="absolute -bottom-6 left-4 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Remote Selections */}
      {Array.from(remoteSelections.values()).map(selection => (
        <div
          key={selection.userId}
          className="absolute pointer-events-none"
          style={{
            backgroundColor: `${selection.color}20`,
            border: `2px solid ${selection.color}`
          }}
        >
          {/* Selection overlay would be positioned based on actual text */}
        </div>
      ))}

      {/* Collaboration Toolbar */}
      {showPresence && (
        <div className="absolute top-4 right-4 z-40">
          <Card className="w-80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users size={16} />
                  Active Collaborators ({collaborators.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPresence(false)}
                >
                  <X size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Collaborators List */}
              <div className="space-y-2">
                {collaborators.map(collaborator => (
                  <div
                    key={collaborator.userId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={collaborator.user.avatar} />
                          <AvatarFallback>
                            {collaborator.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
                            getStatusColor(collaborator.status)
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {collaborator.user.name}
                          {collaborator.userId === user?.id && ' (You)'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {collaborator.location || 'Viewing'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: collaborator.color }}
                            >
                              <Circle
                                size={8}
                                fill={collaborator.color}
                                className="mr-1"
                              />
                              {collaborator.device}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Device: {collaborator.device}</p>
                            <p>Last seen: {new Date(collaborator.lastSeen).toLocaleTimeString()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>

              {/* Collaboration Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare size={14} className="mr-1" />
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={startScreenShare}
                  disabled={isScreenSharing}
                >
                  {isScreenSharing ? (
                    <>
                      <MonitorUp size={14} className="mr-1" />
                      Sharing
                    </>
                  ) : (
                    <>
                      <ScreenShare size={14} className="mr-1" />
                      Share
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Presence Indicator */}
      {!showPresence && (
        <div className="absolute top-4 right-4 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresence(true)}
            className="bg-white shadow-md"
          >
            <Users size={14} className="mr-1" />
            {collaborators.length}
          </Button>
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="absolute bottom-4 right-4 z-40">
          <Card className="w-80 h-96 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Quick Chat</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                >
                  <X size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {messages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{msg.userName}: </span>
                    <span>{msg.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-1 text-sm border rounded-md"
                />
                <Button size="sm" onClick={sendMessage}>
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CollaborationOverlay;