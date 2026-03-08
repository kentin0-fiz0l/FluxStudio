/**
 * usePresence Hook
 *
 * Unified presence system that consolidates:
 * - Formation Yjs awareness (cursor, selection, drag state)
 * - Messaging Socket.IO presence (typing indicators, user status)
 * - Collaboration service awareness
 *
 * Uses Yjs Awareness when a Yjs provider is connected,
 * falls back to Socket.IO events otherwise.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import { messagingSocketService } from '@/services/messagingSocketService';
import { useAuth } from '@/store/slices/authSlice';
import { getUserColor } from '@/services/formation/yjs/formationYjsTypes';

// ============================================================================
// Types
// ============================================================================

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  status?: 'online' | 'idle' | 'offline';
}

export interface PresenceContext {
  type: 'conversation' | 'formation' | 'document';
  id: string;
}

export interface UsePresenceOptions {
  context: PresenceContext;
  /** Yjs Awareness instance - if provided, uses Yjs for presence */
  awareness?: Awareness | null;
}

export interface UsePresenceResult {
  activeUsers: PresenceUser[];
  typingUsers: PresenceUser[];
  setTyping: (isTyping: boolean) => void;
  setStatus: (status: 'online' | 'idle' | 'offline') => void;
  myPresence: PresenceUser | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePresence({
  context,
  awareness,
}: UsePresenceOptions): UsePresenceResult {
  const { user } = useAuth();

  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<PresenceUser[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const myPresence: PresenceUser | null = user
    ? {
        id: user.id,
        name: user.name || user.email,
        color: getUserColor(user.id),
        avatar: user.avatar,
        status: 'online',
      }
    : null;

  // ============================================================================
  // Yjs Awareness-based presence
  // ============================================================================

  useEffect(() => {
    if (!awareness || !user) return;

    const handleAwarenessChange = () => {
      const states = Array.from(awareness.getStates().entries());
      const users: PresenceUser[] = [];
      const typing: PresenceUser[] = [];

      states.forEach(([clientId, state]) => {
        if (clientId === awareness.clientID) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        if (!s.user || !s.isActive) return;

        const presenceUser: PresenceUser = {
          id: s.user.id,
          name: s.user.name,
          color: s.user.color,
          avatar: s.user.avatar,
          status: s.isActive ? 'online' : 'idle',
        };
        users.push(presenceUser);

        if (s.isTyping) {
          typing.push(presenceUser);
        }
      });

      setActiveUsers(users);
      setTypingUsers(typing);
    };

    awareness.on('change', handleAwarenessChange);
    // Initial read
    handleAwarenessChange();

    return () => {
      awareness.off('change', handleAwarenessChange);
    };
  }, [awareness, user]);

  // ============================================================================
  // Socket.IO-based presence (fallback for conversations without Yjs)
  // ============================================================================

  useEffect(() => {
    if (awareness || context.type !== 'conversation') return;

    const cleanups: Array<() => void> = [];

    // Listen for typing events
    const onUserTyping = (data: unknown) => {
      const d = data as {
        conversationId: string;
        userId: string;
        userName?: string;
        userEmail?: string;
        avatarUrl?: string | null;
        isTyping: boolean;
      };
      if (d.conversationId !== context.id) return;
      if (d.userId === user?.id) return;

      const typingUser: PresenceUser = {
        id: d.userId,
        name: d.userName || d.userEmail || 'Unknown',
        color: getUserColor(d.userId),
        avatar: d.avatarUrl || undefined,
      };

      if (d.isTyping) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === typingUser.id)) return prev;
          return [...prev, typingUser];
        });

        // Auto-clear after 5 seconds if no stop event
        const existingTimeout = typingTimeoutsRef.current.get(d.userId);
        if (existingTimeout) clearTimeout(existingTimeout);
        typingTimeoutsRef.current.set(
          d.userId,
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.id !== d.userId));
            typingTimeoutsRef.current.delete(d.userId);
          }, 5000),
        );
      }
    };

    const onUserStoppedTyping = (data: unknown) => {
      const d = data as { conversationId: string; userId: string };
      if (d.conversationId !== context.id) return;
      setTypingUsers((prev) => prev.filter((u) => u.id !== d.userId));
      const timeout = typingTimeoutsRef.current.get(d.userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutsRef.current.delete(d.userId);
      }
    };

    const onUserStatus = (data: unknown) => {
      const d = data as { userId: string; status: string };
      setActiveUsers((prev) => {
        const existing = prev.find((u) => u.id === d.userId);
        if (d.status === 'online' && !existing) {
          return [...prev, { id: d.userId, name: '', color: getUserColor(d.userId), status: 'online' }];
        }
        if (d.status === 'offline' && existing) {
          return prev.filter((u) => u.id !== d.userId);
        }
        return prev;
      });
    };

    cleanups.push(messagingSocketService.on('conversation:user-typing', onUserTyping));
    cleanups.push(messagingSocketService.on('conversation:user-stopped-typing', onUserStoppedTyping));
    cleanups.push(messagingSocketService.on('user:status', onUserStatus));

    return () => {
      cleanups.forEach((fn) => fn());
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
    };
  }, [awareness, context.type, context.id, user?.id]);

  // ============================================================================
  // Heartbeat (5s interval)
  // ============================================================================

  useEffect(() => {
    if (!user) return;

    heartbeatRef.current = setInterval(() => {
      if (document.hidden) return;

      if (awareness) {
        awareness.setLocalStateField('lastActivity', Date.now());
      }
    }, 5000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (awareness) {
        const currentState = awareness.getLocalState() || {};
        awareness.setLocalState({
          ...currentState,
          isActive: !document.hidden,
          lastActivity: Date.now(),
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [awareness, user]);

  // ============================================================================
  // Actions
  // ============================================================================

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (awareness) {
        awareness.setLocalStateField('isTyping', isTyping);
      } else if (context.type === 'conversation') {
        if (isTyping) {
          messagingSocketService.startTyping(context.id);
        } else {
          messagingSocketService.stopTyping(context.id);
        }
      }
    },
    [awareness, context.type, context.id],
  );

  const setStatus = useCallback(
    (status: 'online' | 'idle' | 'offline') => {
      if (awareness) {
        const currentState = awareness.getLocalState() || {};
        awareness.setLocalState({
          ...currentState,
          isActive: status !== 'offline',
          lastActivity: Date.now(),
        });
      }
    },
    [awareness],
  );

  return {
    activeUsers,
    typingUsers,
    setTyping,
    setStatus,
    myPresence,
  };
}

export default usePresence;
