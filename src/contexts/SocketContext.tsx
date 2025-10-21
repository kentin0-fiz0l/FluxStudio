/**
 * Socket.IO React Context for Real-time Communication
 * Provides WebSocket connection management and real-time messaging state
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { Message, MessageUser, UserPresence, TypingIndicator } from '../types/messaging';

interface SocketContextType {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Real-time messaging
  sendMessage: (messageData: {
    conversationId: string;
    content: string;
    type?: string;
    priority?: string;
    attachments?: any[];
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
  onMentionReceived: (callback: (notification: any) => void) => () => void;
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

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Real-time state
  const [activeConversations] = useState(new Set<string>());
  const [typingUsers] = useState(new Map<string, Set<string>>());
  const [onlineUsers] = useState(new Map<string, UserPresence>());

  // Typing timeout management
  const typingTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  // Initialize socket connection when user is available
  useEffect(() => {
    if (user) {
      socketService.authenticateUser(user.id, {
        name: user.name,
        userType: user.userType
      });
    }

    return () => {
      // Cleanup on unmount
      socketService.disconnect();
    };
  }, [user]);

  // Set up socket event listeners
  useEffect(() => {
    // Connection events
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('🔗 Socket connected in context');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('🔌 Socket disconnected in context');
    };

    // Typing events
    const handleTypingStarted = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      const { conversationId, userId } = data;

      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId)!.add(userId);

      // Clear existing timeout for this user
      const timeoutKey = `${conversationId}-${userId}`;
      if (typingTimeouts.current.has(timeoutKey)) {
        clearTimeout(typingTimeouts.current.get(timeoutKey)!);
      }

      // Set new timeout to auto-remove typing indicator
      const timeout = setTimeout(() => {
        if (typingUsers.has(conversationId)) {
          typingUsers.get(conversationId)!.delete(userId);
        }
        typingTimeouts.current.delete(timeoutKey);
      }, 5000);

      typingTimeouts.current.set(timeoutKey, timeout);
    };

    const handleTypingStopped = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      const { conversationId, userId } = data;

      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId)!.delete(userId);
      }

      // Clear timeout
      const timeoutKey = `${conversationId}-${userId}`;
      if (typingTimeouts.current.has(timeoutKey)) {
        clearTimeout(typingTimeouts.current.get(timeoutKey)!);
        typingTimeouts.current.delete(timeoutKey);
      }
    };

    // Presence events
    const handleUserOnline = (user: UserPresence) => {
      onlineUsers.set(user.userId, { ...user, isOnline: true });
    };

    const handleUserOffline = (user: UserPresence) => {
      onlineUsers.set(user.userId, { ...user, isOnline: false });
    };

    // Register event listeners
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('typing:started', handleTypingStarted);
    socketService.on('typing:stopped', handleTypingStopped);
    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);

    // Cleanup function
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('typing:started', handleTypingStarted);
      socketService.off('typing:stopped', handleTypingStopped);
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);

      // Clear all typing timeouts
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
    };
  }, [typingUsers, onlineUsers]);

  // Conversation management
  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
    activeConversations.add(conversationId);
  }, [activeConversations]);

  const leaveConversation = useCallback((conversationId: string) => {
    socketService.leaveConversation(conversationId);
    activeConversations.delete(conversationId);

    // Clear typing indicators for this conversation
    typingUsers.delete(conversationId);
  }, [activeConversations, typingUsers]);

  // Messaging functions
  const sendMessage = useCallback((messageData: {
    conversationId: string;
    content: string;
    type?: string;
    priority?: string;
    attachments?: any[];
    mentions?: string[];
    replyTo?: string;
  }) => {
    if (!user) return;

    const author: MessageUser = {
      id: user.id,
      name: user.name,
      userType: user.userType,
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

  const onMentionReceived = useCallback((callback: (notification: any) => void) => {
    socketService.on('notification:mention', callback);
    return () => socketService.off('notification:mention', callback);
  }, []);

  const contextValue: SocketContextType = {
    // Connection state
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
    onMentionReceived
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;