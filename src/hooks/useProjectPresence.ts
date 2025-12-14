/**
 * useProjectPresence - Socket-based project presence and pulse events
 *
 * Manages real-time presence for a focused project:
 * - Emits project:join when focusing a project
 * - Emits project:leave when unfocusing
 * - Listens for project:presence updates
 * - Listens for pulse:event for real-time activity updates
 * - Provides list of online team members
 *
 * Part of Real Pulse: "Who's working on this project right now?"
 */

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useActiveProject } from '@/contexts/ActiveProjectContext';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceMember {
  userId: string;
  userName: string;
  avatar?: string;
  joinedAt: string;
  isOnline: boolean;
}

export interface PulseEvent {
  projectId: string;
  event: unknown;
  type: 'activity' | 'attention';
  timestamp: string;
}

export interface ProjectPresenceState {
  /** List of members currently online in the project */
  members: PresenceMember[];
  /** Whether socket is connected */
  isConnected: boolean;
  /** Count of online members */
  onlineCount: number;
  /** Latest pulse event (for real-time updates) */
  latestPulseEvent: PulseEvent | null;
  /** Register a callback for pulse events */
  onPulseEvent: (callback: (event: PulseEvent) => void) => () => void;
}

// Singleton socket instance for presence
let presenceSocket: Socket | null = null;

// Pulse event listeners
const pulseEventListeners = new Set<(event: PulseEvent) => void>();

function getPresenceSocket(): Socket | null {
  if (presenceSocket) return presenceSocket;

  const isDevelopment = window.location.hostname === 'localhost';
  const socketUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;

  try {
    presenceSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    presenceSocket.on('connect', () => {
      console.log('Project presence socket connected');
    });

    presenceSocket.on('disconnect', () => {
      console.log('Project presence socket disconnected');
    });

    presenceSocket.on('connect_error', (err) => {
      console.warn('Project presence socket connection error:', err.message);
    });

    // Global pulse event handler
    presenceSocket.on('pulse:event', (data: PulseEvent) => {
      pulseEventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error('Error in pulse event listener:', err);
        }
      });
    });
  } catch (err) {
    console.error('Failed to create presence socket:', err);
    return null;
  }

  return presenceSocket;
}

export function useProjectPresence(): ProjectPresenceState {
  const { activeProject, hasFocus } = useActiveProject();
  const { user } = useAuth();

  const [members, setMembers] = React.useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [latestPulseEvent, setLatestPulseEvent] = React.useState<PulseEvent | null>(null);

  const projectId = activeProject?.id;
  const userId = user?.id;
  const userName = user?.name || user?.userEmail?.split('@')[0] || 'Unknown';

  // Track current project join state
  const joinedProjectRef = React.useRef<string | null>(null);

  // Handle presence updates
  const handlePresenceUpdate = React.useCallback(
    (data: {
      projectId: string;
      presence: PresenceMember[];
      event: string;
      userId?: string;
      userName?: string;
    }) => {
      if (data.projectId === projectId) {
        setMembers(data.presence || []);
      }
    },
    [projectId]
  );

  // Handle pulse events
  const handlePulseEvent = React.useCallback(
    (data: PulseEvent) => {
      if (data.projectId === projectId) {
        setLatestPulseEvent(data);
      }
    },
    [projectId]
  );

  // Register pulse event callback
  const onPulseEvent = React.useCallback(
    (callback: (event: PulseEvent) => void) => {
      pulseEventListeners.add(callback);
      return () => {
        pulseEventListeners.delete(callback);
      };
    },
    []
  );

  // Connect socket and manage presence
  React.useEffect(() => {
    if (!projectId || !hasFocus || !userId) {
      setMembers([]);
      setLatestPulseEvent(null);
      return;
    }

    const socket = getPresenceSocket();
    if (!socket) {
      return;
    }

    // Track connection state
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('project:presence', handlePresenceUpdate);

    // Register local pulse event handler
    pulseEventListeners.add(handlePulseEvent);

    // Set initial connection state
    setIsConnected(socket.connected);

    // Join project room
    if (socket.connected) {
      socket.emit('project:join', projectId, { userId, userName });
      joinedProjectRef.current = projectId;
    } else {
      // Wait for connection then join
      socket.once('connect', () => {
        socket.emit('project:join', projectId, { userId, userName });
        joinedProjectRef.current = projectId;
      });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('project:presence', handlePresenceUpdate);
      pulseEventListeners.delete(handlePulseEvent);

      // Leave project room
      if (joinedProjectRef.current && socket.connected) {
        socket.emit('project:leave', joinedProjectRef.current, { userId, userName });
        joinedProjectRef.current = null;
      }
    };
  }, [projectId, hasFocus, userId, userName, handlePresenceUpdate, handlePulseEvent]);

  // Handle project change (leave old, join new)
  React.useEffect(() => {
    const socket = getPresenceSocket();
    if (!socket?.connected || !userId) return;

    // If we were in a different project, leave it
    if (joinedProjectRef.current && joinedProjectRef.current !== projectId) {
      socket.emit('project:leave', joinedProjectRef.current, { userId, userName });
      joinedProjectRef.current = null;
    }
  }, [projectId, userId, userName]);

  return {
    members,
    isConnected,
    onlineCount: members.length,
    latestPulseEvent,
    onPulseEvent,
  };
}

export default useProjectPresence;
