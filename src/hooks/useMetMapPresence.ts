/**
 * useMetMapPresence — Manages Yjs Awareness state for live presence.
 *
 * Sprint 31: Shows who's connected, what they're editing, and idle status.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Awareness } from 'y-protocols/awareness';
import type { MetMapPresence } from '../services/metmapCollaboration';

// 8-color palette for peer identification
const PRESENCE_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

const IDLE_TIMEOUT_MS = 60_000; // 60 seconds
const ACTIVITY_THROTTLE_MS = 5_000; // throttle lastActive updates

interface UseMetMapPresenceOptions {
  userId: string;
  username: string;
  avatar?: string;
}

interface UseMetMapPresenceReturn {
  /** All peers (including self) */
  peers: MetMapPresence[];
  /** Remote peers only (excluding self) */
  remotePeers: MetMapPresence[];
  /** Set the section currently being edited */
  setEditingSection: (sectionId: string | null) => void;
  /** Set the keyframe currently selected */
  setSelectedKeyframe: (keyframeId: string | null) => void;
  /** Set the cursor bar position */
  setCursorBar: (bar: number | null) => void;
}

export function useMetMapPresence(
  awareness: Awareness | null,
  options: UseMetMapPresenceOptions
): UseMetMapPresenceReturn {
  const { userId, username, avatar } = options;
  const [peers, setPeers] = useState<MetMapPresence[]>([]);
  const lastActivityRef = useRef(0);
  const localStateRef = useRef<Partial<MetMapPresence>>({});

  // Assign color based on awareness clientID
  const color = awareness
    ? PRESENCE_COLORS[awareness.clientID % PRESENCE_COLORS.length]
    : PRESENCE_COLORS[0];

  // Set initial local awareness state
  useEffect(() => {
    if (!awareness) return;

    const initialState: MetMapPresence = {
      userId,
      username,
      color,
      avatar,
      editingSection: null,
      selectedKeyframe: null,
      cursorBar: null,
      lastActive: Date.now(),
    };

    awareness.setLocalState(initialState);
    localStateRef.current = initialState;

    // Listen for awareness changes
    const handleChange = () => {
      const states: MetMapPresence[] = [];
      awareness.getStates().forEach((state) => {
        if (state && state.userId) {
          states.push(state as MetMapPresence);
        }
      });
      setPeers(states);
    };

    awareness.on('change', handleChange);
    // Read initial state
    handleChange();

    return () => {
      awareness.off('change', handleChange);
    };
  }, [awareness, userId, username, color, avatar]);

  // Update local field helper
  const updateLocal = useCallback(
    (field: keyof MetMapPresence, value: unknown) => {
      if (!awareness) return;
      const current = awareness.getLocalState() || {};
      // Throttle lastActive updates
      const now = Date.now();
      if (now - lastActivityRef.current > ACTIVITY_THROTTLE_MS) {
        lastActivityRef.current = now;
        awareness.setLocalState({ ...current, [field]: value, lastActive: now });
      } else {
        awareness.setLocalState({ ...current, [field]: value });
      }
    },
    [awareness]
  );

  const setEditingSection = useCallback(
    (sectionId: string | null) => updateLocal('editingSection', sectionId),
    [updateLocal]
  );

  const setSelectedKeyframe = useCallback(
    (keyframeId: string | null) => updateLocal('selectedKeyframe', keyframeId),
    [updateLocal]
  );

  const setCursorBar = useCallback(
    (bar: number | null) => updateLocal('cursorBar', bar),
    [updateLocal]
  );

  // Filter remote peers
  const remotePeers = peers.filter((p) => p.userId !== userId);

  return {
    peers,
    remotePeers,
    setEditingSection,
    setSelectedKeyframe,
    setCursorBar,
  };
}

/**
 * Check if a peer is idle (no activity for IDLE_TIMEOUT_MS).
 */
export function isPeerIdle(peer: MetMapPresence): boolean {
  return Date.now() - (peer.lastActive || 0) > IDLE_TIMEOUT_MS;
}

export { PRESENCE_COLORS };
