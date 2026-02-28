/* eslint-disable react-refresh/only-export-components */
/**
 * Socket.IO React Context for Real-time Communication
 *
 * Connection state (isConnected, typingUsers, onlineUsers) has been migrated
 * to Zustand socketSlice (Sprint 65). This context now provides imperative
 * socket methods (sendMessage, joinConversation, etc.) that delegate to
 * socketService, while reading reactive state from the Zustand store.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { socketService, ProjectPresenceMember, PulseEvent } from '../services/socketService';
import { useAuth } from '@/store/slices/authSlice';
import { useStore } from '@/store/store';
import { Message, MessageUser, UserPresence } from '../types/messaging';

interface SocketContextType {
  // Connection state (from Zustand)
  isConnected: boolean;
  connectionError: string | null;
  socket: typeof import('../services/socketService').socketService | null;

  // Real-time messaging
  sendMessage: (messageData: {
    conversationId: string;
    content: string;
    type?: string;
    priority?: string;
    attachments?: unknown[];
    mentions?: string[];
    replyTo?: string;
  }) => void;

  // Conversation management
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  activeConversations: Set<string>;

  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  typingUsers: Map<string, Set<string>>; // conversationId -> Set of userIds

  // User presence
  onlineUsers: Map<string, UserPresence>;
  updateUserPresence: (userId: string, presence: UserPresence) => void;

  // Message reactions and status
  addReaction: (messageId: string, conversationId: string, reaction: string) => void;
  markMessageAsRead: (messageId: string, conversationId: string) => void;

  // Real-time message events
  onMessageReceived: (callback: (message: Message) => void) => () => void;
  onUserPresenceChanged: (callback: (user: UserPresence) => void) => () => void;
  onTypingChanged: (callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void) => () => void;
  onMentionReceived: (callback: (notification: unknown) => void) => () => void;

  // Project presence
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  onProjectPresence: (callback: (data: {
    projectId: string;
    presence: ProjectPresenceMember[];
    event: 'join' | 'leave';
    userId?: string;
    userName?: string;
  }) => void) => () => void;
  onPulseEvent: (callback: (event: PulseEvent) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();

  // Connection state from Zustand (managed by useSocketBridge)
  const isConnected = useStore(s => s.socket.isConnected);
  const connectionError = useStore(s => s.socket.connectionError);

  // Local state for imperative collections (not migrated to Zustand)
  const [activeConversations] = useState(new Set<string>());
  const [typingUsers] = useState(new Map<string, Set<string>>());
  const [onlineUsers] = useState(new Map<string, UserPresence>());

  // Conversation management
  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
    activeConversations.add(conversationId);
  }, [activeConversations]);

  const leaveConversation = useCallback((conversationId: string) => {
    socketService.leaveConversation(conversationId);
    activeConversations.delete(conversationId);
    typingUsers.delete(conversationId);
  }, [activeConversations, typingUsers]);

  // Messaging functions
  const sendMessage = useCallback((messageData: {
    conversationId: string;
    content: string;
    type?: string;
    priority?: string;
    attachments?: unknown[];
    mentions?: string[];
    replyTo?: string;
  }) => {
    if (!user) return;

    const author: MessageUser = {
      id: user.id,
      name: user.name || '',
      userType: user.userType || 'designer',
      avatar: user.avatar,
      isOnline: true
    };

    socketService.sendMessage({
      ...messageData,
      author
    });
  }, [user]);

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    socketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketService.stopTyping(conversationId);
  }, []);

  // Message interactions
  const addReaction = useCallback((messageId: string, conversationId: string, reaction: string) => {
    socketService.addReaction(messageId, conversationId, reaction);
  }, []);

  const markMessageAsRead = useCallback((messageId: string, conversationId: string) => {
    socketService.markMessageAsRead(messageId, conversationId);
  }, []);

  // User presence management
  const updateUserPresence = useCallback((userId: string, presence: UserPresence) => {
    onlineUsers.set(userId, presence);
  }, [onlineUsers]);

  // Event subscription helpers
  const onMessageReceived = useCallback((callback: (message: Message) => void) => {
    socketService.on('message:received', callback);
    return () => socketService.off('message:received', callback);
  }, []);

  const onUserPresenceChanged = useCallback((callback: (user: UserPresence) => void) => {
    const handleOnline = (user: UserPresence) => callback({ ...user, isOnline: true });
    const handleOffline = (user: UserPresence) => callback({ ...user, isOnline: false });

    socketService.on('user:online', handleOnline);
    socketService.on('user:offline', handleOffline);

    return () => {
      socketService.off('user:online', handleOnline);
      socketService.off('user:offline', handleOffline);
    };
  }, []);

  const onTypingChanged = useCallback((callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void) => {
    const handleStarted = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      callback({ ...data, isTyping: true });
    };
    const handleStopped = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      callback({ ...data, isTyping: false });
    };

    socketService.on('typing:started', handleStarted);
    socketService.on('typing:stopped', handleStopped);

    return () => {
      socketService.off('typing:started', handleStarted);
      socketService.off('typing:stopped', handleStopped);
    };
  }, []);

  const onMentionReceived = useCallback((callback: (notification: unknown) => void) => {
    socketService.on('notification:mention', callback);
    return () => socketService.off('notification:mention', callback);
  }, []);

  // Project presence management
  const joinProject = useCallback((projectId: string) => {
    if (!user) return;
    const userName = user.name || user.email?.split('@')[0] || 'Unknown';
    socketService.joinProject(projectId, { userName });
  }, [user]);

  const leaveProject = useCallback((projectId: string) => {
    if (!user) return;
    const userName = user.name || user.email?.split('@')[0] || 'Unknown';
    socketService.leaveProject(projectId, { userName });
  }, [user]);

  const onProjectPresence = useCallback((callback: (data: {
    projectId: string;
    presence: ProjectPresenceMember[];
    event: 'join' | 'leave';
    userId?: string;
    userName?: string;
  }) => void) => {
    socketService.on('project:presence', callback);
    return () => socketService.off('project:presence', callback);
  }, []);

  const onPulseEvent = useCallback((callback: (event: PulseEvent) => void) => {
    socketService.on('pulse:event', callback);
    return () => socketService.off('pulse:event', callback);
  }, []);

  const contextValue: SocketContextType = {
    // Connection state (from Zustand)
    isConnected,
    connectionError,

    // Real-time messaging
    sendMessage,

    // Conversation management
    joinConversation,
    leaveConversation,
    activeConversations,

    // Typing indicators
    startTyping,
    stopTyping,
    typingUsers,

    // User presence
    onlineUsers,
    updateUserPresence,

    // Message interactions
    addReaction,
    markMessageAsRead,

    // Event subscriptions
    onMessageReceived,
    onUserPresenceChanged,
    onTypingChanged,
    onMentionReceived,

    // Project presence
    joinProject,
    leaveProject,
    onProjectPresence,
    onPulseEvent,

    // Socket service reference
    socket: socketService
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
