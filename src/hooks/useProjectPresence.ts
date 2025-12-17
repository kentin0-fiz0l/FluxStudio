/**
 * useProjectPresence - Socket-based project presence tracking
 *
 * Uses the existing socketService singleton to:
 * - Join/leave project rooms when project focus changes
 * - Track online team members in the focused project
 * - Receive real-time pulse events
 *
 * No duplicate socket connections - uses the unified socketService.
 *
 * Part of Project Pulse: "Who's working on this project right now?"
 */

import * as React from 'react';
import { socketService, ProjectPresenceMember, PulseEvent } from '@/services/socketService';
import { useActiveProjectOptional } from '@/contexts/ActiveProjectContext';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectPresenceState {
  /** List of members currently online in the project */
  members: ProjectPresenceMember[];
  /** Whether socket is connected */
  isConnected: boolean;
  /** Count of online members */
  onlineCount: number;
  /** Latest pulse event (for real-time updates) */
  latestPulseEvent: PulseEvent | null;
}

export interface UseProjectPresenceReturn extends ProjectPresenceState {
  /** Register a callback for pulse events */
  onPulseEvent: (callback: (event: PulseEvent) => void) => () => void;
}

export function useProjectPresence(): UseProjectPresenceReturn {
  const activeProjectContext = useActiveProjectOptional();
  const activeProject = activeProjectContext?.activeProject ?? null;
  const hasFocus = activeProjectContext?.hasFocus ?? false;
  const { user } = useAuth();

  const [members, setMembers] = React.useState<ProjectPresenceMember[]>([]);
  const [isConnected, setIsConnected] = React.useState(() => socketService.isSocketConnected());
  const [latestPulseEvent, setLatestPulseEvent] = React.useState<PulseEvent | null>(null);

  // Track current project join state to avoid double joins/leaves
  const joinedProjectRef = React.useRef<string | null>(null);

  const projectId = activeProject?.id;
  const userId = user?.id;
  const userName = user?.name || user?.userEmail?.split('@')[0] || 'Unknown';

  // Pulse event listeners (external callbacks)
  const pulseListenersRef = React.useRef(new Set<(event: PulseEvent) => void>());

  // Register callback for pulse events
  const onPulseEvent = React.useCallback((callback: (event: PulseEvent) => void) => {
    pulseListenersRef.current.add(callback);
    return () => {
      pulseListenersRef.current.delete(callback);
    };
  }, []);

  // Handle presence updates from server
  const handlePresenceUpdate = React.useCallback(
    (data: {
      projectId: string;
      presence: ProjectPresenceMember[];
      event: 'join' | 'leave';
      userId?: string;
      userName?: string;
    }) => {
      if (data.projectId === projectId) {
        setMembers(data.presence || []);
      }
    },
    [projectId]
  );

  // Handle pulse events from server
  const handlePulseEvent = React.useCallback(
    (event: PulseEvent) => {
      // Only process events for the focused project
      if (event.projectId === projectId) {
        setLatestPulseEvent(event);
        // Notify external listeners
        pulseListenersRef.current.forEach((callback) => {
          try {
            callback(event);
          } catch (err) {
            console.error('Error in pulse event listener:', err);
          }
        });
      }
    },
    [projectId]
  );

  // Connection state tracking
  React.useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socketService.isSocketConnected());

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
    };
  }, []);

  // Register presence and pulse event handlers
  React.useEffect(() => {
    socketService.on('project:presence', handlePresenceUpdate);
    socketService.on('pulse:event', handlePulseEvent);

    return () => {
      socketService.off('project:presence', handlePresenceUpdate);
      socketService.off('pulse:event', handlePulseEvent);
    };
  }, [handlePresenceUpdate, handlePulseEvent]);

  // Join/leave project room based on focus
  React.useEffect(() => {
    if (!hasFocus || !projectId || !userId) {
      // Not focused - leave any joined project and clear state
      if (joinedProjectRef.current) {
        socketService.leaveProject(joinedProjectRef.current, { userName });
        joinedProjectRef.current = null;
      }
      setMembers([]);
      setLatestPulseEvent(null);
      return;
    }

    // If already joined this project, nothing to do
    if (joinedProjectRef.current === projectId) {
      return;
    }

    // Leave previous project if any
    if (joinedProjectRef.current) {
      socketService.leaveProject(joinedProjectRef.current, { userName });
    }

    // Join new project
    socketService.joinProject(projectId, { userName });
    joinedProjectRef.current = projectId;

    return () => {
      // Cleanup: leave project on unmount
      if (joinedProjectRef.current) {
        socketService.leaveProject(joinedProjectRef.current, { userName });
        joinedProjectRef.current = null;
      }
    };
  }, [hasFocus, projectId, userId, userName]);

  return {
    members,
    isConnected,
    onlineCount: members.filter((m) => m.isOnline).length,
    latestPulseEvent,
    onPulseEvent,
  };
}

// Re-export types for convenience
export type { ProjectPresenceMember, PulseEvent };

export default useProjectPresence;
