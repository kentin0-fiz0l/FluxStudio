/**
 * useRealtimeActivities — Socket.IO listener for live activity feed updates
 *
 * Sprint 50 T1: Replaces polling with Socket.IO events for instant activity
 * updates. Falls back to the existing 30s polling in useActivitiesQuery
 * when the socket is unavailable.
 *
 * Events listened:
 * - project:activity  — New activity on a project the user is joined to
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { Activity } from '@/hooks/useActivities';

interface UseRealtimeActivitiesOptions {
  projectId: string | undefined;
  /** Callback fired for each new activity (e.g., to show a toast) */
  onNewActivity?: (activity: Activity) => void;
}

export function useRealtimeActivities({ projectId, onNewActivity }: UseRealtimeActivitiesOptions) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveActivities, setLiveActivities] = useState<Activity[]>([]);

  const handleActivity = useCallback(
    (activity: Activity) => {
      // Prepend to local live list (for optimistic display)
      setLiveActivities((prev) => [activity, ...prev].slice(0, 50));

      // Invalidate TanStack Query cache so the full list re-fetches
      queryClient.invalidateQueries({ queryKey: ['activities', 'list', projectId] });

      onNewActivity?.(activity);
    },
    [projectId, queryClient, onNewActivity],
  );

  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const socket = io(`${apiUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join the project room for scoped events
      socket.emit('join:project', { projectId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for project activity events
    socket.on('project:activity', (data: Activity) => {
      if (data.projectId === projectId) {
        handleActivity(data);
      }
    });

    return () => {
      socket.emit('leave:project', { projectId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [projectId, handleActivity]);

  /** Clear the local live activities buffer */
  const clearLiveActivities = useCallback(() => {
    setLiveActivities([]);
  }, []);

  return {
    isConnected,
    liveActivities,
    clearLiveActivities,
  };
}
