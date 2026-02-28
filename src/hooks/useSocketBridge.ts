import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socketService';
import { useAuth } from '@/store/slices/authSlice';
import { useStore } from '@/store/store';
import { socketLogger } from '@/lib/logger';
import { toast } from '@/lib/toast';

/**
 * Side-effect hook that bridges socketService events to Zustand socketSlice.
 * Call once at app root (replaces SocketProvider's connection state management).
 */
export function useSocketBridge() {
  const { user } = useAuth();
  const setConnected = useStore(s => s.socket.setConnected);
  const setConnectionError = useStore(s => s.socket.setConnectionError);
  const addTypingUser = useStore(s => s.socket.addTypingUser);
  const removeTypingUser = useStore(s => s.socket.removeTypingUser);
  const setUserOnline = useStore(s => s.socket.setUserOnline);
  const setUserOffline = useStore(s => s.socket.setUserOffline);

  const typingTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  // Auth: connect when user is available
  useEffect(() => {
    if (user) {
      socketService.authenticateUser(user.id, {
        name: user.name || '',
        userType: user.userType || 'designer',
      });
    }
    return () => {
      socketService.disconnect();
    };
  }, [user]);

  // Event listeners
  useEffect(() => {
    let wasConnected = false;

    const handleConnect = () => {
      setConnected(true);
      socketLogger.info('Socket connected');
      if (wasConnected) toast.reconnected();
      wasConnected = true;
    };

    const handleDisconnect = () => {
      setConnected(false);
      socketLogger.info('Socket disconnected');
      if (wasConnected) toast.offline();
    };

    const handleTypingStarted = (data: { conversationId: string; userId: string }) => {
      addTypingUser(data.conversationId, data.userId);
      const key = `${data.conversationId}-${data.userId}`;
      if (typingTimeouts.current.has(key)) {
        clearTimeout(typingTimeouts.current.get(key)!);
      }
      typingTimeouts.current.set(key, setTimeout(() => {
        removeTypingUser(data.conversationId, data.userId);
        typingTimeouts.current.delete(key);
      }, 5000));
    };

    const handleTypingStopped = (data: { conversationId: string; userId: string }) => {
      removeTypingUser(data.conversationId, data.userId);
      const key = `${data.conversationId}-${data.userId}`;
      if (typingTimeouts.current.has(key)) {
        clearTimeout(typingTimeouts.current.get(key)!);
        typingTimeouts.current.delete(key);
      }
    };

    const handleUserOnline = (user: { userId: string }) => {
      setUserOnline(user.userId);
    };

    const handleUserOffline = (user: { userId: string }) => {
      setUserOffline(user.userId);
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('typing:started', handleTypingStarted);
    socketService.on('typing:stopped', handleTypingStopped);
    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);

    const timeouts = typingTimeouts.current;
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('typing:started', handleTypingStarted);
      socketService.off('typing:stopped', handleTypingStopped);
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
      timeouts.forEach(t => clearTimeout(t));
      timeouts.clear();
    };
  }, [setConnected, setConnectionError, addTypingUser, removeTypingUser, setUserOnline, setUserOffline]);
}
