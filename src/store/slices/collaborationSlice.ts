/**
 * Collaboration Slice - Real-time collaboration state
 *
 * Handles:
 * - Active collaborators per entity
 * - Cursor positions
 * - Selection states
 * - Edit locks
 * - Collaboration history
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export interface Collaborator {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  selection?: Selection;
  lastActivity: string;
  isActive: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  entityId?: string;
  timestamp: string;
}

export interface Selection {
  entityId: string;
  entityType: 'section' | 'element' | 'text' | 'node';
  range?: { start: number; end: number };
}

export interface EditLock {
  entityId: string;
  entityType: string;
  lockedBy: string;
  lockedAt: string;
  expiresAt: string;
}

export interface CollaborationEdit {
  id: string;
  entityId: string;
  entityType: string;
  operation: 'create' | 'update' | 'delete' | 'move';
  data: unknown;
  userId: string;
  userName: string;
  timestamp: string;
  undone?: boolean;
}

export interface CollaborationSession {
  id: string;
  entityType: 'project' | 'board' | 'metmap' | 'document';
  entityId: string;
  collaborators: Collaborator[];
  locks: EditLock[];
  recentEdits: CollaborationEdit[];
  startedAt: string;
}

export interface CollaborationState {
  sessions: Record<string, CollaborationSession>;
  activeSessionId: string | null;
  localCursor: CursorPosition | null;
  localSelection: Selection | null;
  myColor: string;
}

export interface CollaborationActions {
  joinSession: (entityType: string, entityId: string) => void;
  leaveSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  updateCollaborator: (sessionId: string, collaborator: Partial<Collaborator> & { id: string }) => void;
  removeCollaborator: (sessionId: string, collaboratorId: string) => void;
  updateLocalCursor: (position: CursorPosition | null) => void;
  updateLocalSelection: (selection: Selection | null) => void;
  acquireLock: (sessionId: string, entityId: string, entityType: string) => boolean;
  releaseLock: (sessionId: string, entityId: string) => void;
  addEdit: (sessionId: string, edit: Omit<CollaborationEdit, 'id' | 'timestamp'>) => void;
  undoEdit: (sessionId: string, editId: string) => void;
  clearSession: (sessionId: string) => void;
}

export interface CollaborationSlice {
  collaboration: CollaborationState & CollaborationActions;
}

// ============================================================================
// Color Palette for Collaborators
// ============================================================================

const COLLABORATOR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky
];

// ============================================================================
// Initial State
// ============================================================================

const initialState: CollaborationState = {
  sessions: {},
  activeSessionId: null,
  localCursor: null,
  localSelection: null,
  myColor: COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)],
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createCollaborationSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  CollaborationSlice
> = (set, get) => ({
  collaboration: {
    ...initialState,

    joinSession: (entityType, entityId) => {
      const sessionId = `${entityType}:${entityId}`;
      const existingSession = get().collaboration.sessions[sessionId];

      if (!existingSession) {
        set((state) => {
          state.collaboration.sessions[sessionId] = {
            id: sessionId,
            entityType: entityType as CollaborationSession['entityType'],
            entityId,
            collaborators: [],
            locks: [],
            recentEdits: [],
            startedAt: new Date().toISOString(),
          };
          state.collaboration.activeSessionId = sessionId;
        });
      } else {
        set((state) => {
          state.collaboration.activeSessionId = sessionId;
        });
      }
    },

    leaveSession: (sessionId) => {
      set((state) => {
        if (state.collaboration.activeSessionId === sessionId) {
          state.collaboration.activeSessionId = null;
        }
        // Keep session data for potential reconnection
      });
    },

    setActiveSession: (sessionId) => {
      set((state) => {
        state.collaboration.activeSessionId = sessionId;
      });
    },

    updateCollaborator: (sessionId, collaborator) => {
      set((state) => {
        const session = state.collaboration.sessions[sessionId];
        if (!session) return;

        const existingIndex = session.collaborators.findIndex((c) => c.id === collaborator.id);
        if (existingIndex >= 0) {
          session.collaborators[existingIndex] = {
            ...session.collaborators[existingIndex],
            ...collaborator,
            lastActivity: new Date().toISOString(),
          };
        } else {
          // New collaborator - assign color
          const usedColors = session.collaborators.map((c) => c.color);
          const availableColors = COLLABORATOR_COLORS.filter((c) => !usedColors.includes(c));
          const color = availableColors[0] || COLLABORATOR_COLORS[session.collaborators.length % COLLABORATOR_COLORS.length];

          session.collaborators.push({
            ...collaborator,
            userId: collaborator.userId || '',
            userName: collaborator.userName || 'Anonymous',
            color,
            isActive: true,
            lastActivity: new Date().toISOString(),
          });
        }
      });
    },

    removeCollaborator: (sessionId, collaboratorId) => {
      set((state) => {
        const session = state.collaboration.sessions[sessionId];
        if (!session) return;

        session.collaborators = session.collaborators.filter((c) => c.id !== collaboratorId);

        // Release any locks held by this collaborator
        session.locks = session.locks.filter((l) => l.lockedBy !== collaboratorId);
      });
    },

    updateLocalCursor: (position) => {
      set((state) => {
        state.collaboration.localCursor = position;
      });
    },

    updateLocalSelection: (selection) => {
      set((state) => {
        state.collaboration.localSelection = selection;
      });
    },

    acquireLock: (sessionId, entityId, entityType) => {
      const session = get().collaboration.sessions[sessionId];
      if (!session) return false;

      const existingLock = session.locks.find((l) => l.entityId === entityId);
      if (existingLock) {
        // Check if lock expired
        if (new Date(existingLock.expiresAt) > new Date()) {
          return false; // Lock still valid
        }
      }

      const userId = get().auth.user?.id || 'local';
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30000); // 30 second lock

      set((state) => {
        const s = state.collaboration.sessions[sessionId];
        if (!s) return;

        // Remove expired lock if exists
        s.locks = s.locks.filter((l) => l.entityId !== entityId);

        // Add new lock
        s.locks.push({
          entityId,
          entityType,
          lockedBy: userId,
          lockedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
      });

      return true;
    },

    releaseLock: (sessionId, entityId) => {
      set((state) => {
        const session = state.collaboration.sessions[sessionId];
        if (!session) return;

        session.locks = session.locks.filter((l) => l.entityId !== entityId);
      });
    },

    addEdit: (sessionId, edit) => {
      const id = `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      set((state) => {
        const session = state.collaboration.sessions[sessionId];
        if (!session) return;

        session.recentEdits.unshift({
          ...edit,
          id,
          timestamp: new Date().toISOString(),
        });

        // Keep only last 50 edits
        if (session.recentEdits.length > 50) {
          session.recentEdits = session.recentEdits.slice(0, 50);
        }
      });
    },

    undoEdit: (sessionId, editId) => {
      set((state) => {
        const session = state.collaboration.sessions[sessionId];
        if (!session) return;

        const edit = session.recentEdits.find((e) => e.id === editId);
        if (edit) {
          edit.undone = true;
        }
      });
    },

    clearSession: (sessionId) => {
      set((state) => {
        delete state.collaboration.sessions[sessionId];
        if (state.collaboration.activeSessionId === sessionId) {
          state.collaboration.activeSessionId = null;
        }
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useCollaboration = () => {
  return useStore((state) => state.collaboration);
};

export const useActiveSession = () => {
  const activeSessionId = useStore((state) => state.collaboration.activeSessionId);
  const sessions = useStore((state) => state.collaboration.sessions);
  return activeSessionId ? sessions[activeSessionId] : null;
};

export const useCollaborators = (sessionId?: string) => {
  const activeSessionId = useStore((state) => state.collaboration.activeSessionId);
  const sessions = useStore((state) => state.collaboration.sessions);
  const id = sessionId || activeSessionId;
  return id ? sessions[id]?.collaborators || [] : [];
};

export const useLocks = (sessionId?: string) => {
  const activeSessionId = useStore((state) => state.collaboration.activeSessionId);
  const sessions = useStore((state) => state.collaboration.sessions);
  const id = sessionId || activeSessionId;
  return id ? sessions[id]?.locks || [] : [];
};

export const useIsEntityLocked = (entityId: string, sessionId?: string) => {
  const locks = useLocks(sessionId);
  const userId = useStore((state) => state.auth.user?.id);
  const lock = locks.find((l) => l.entityId === entityId);

  if (!lock) return { locked: false, byMe: false };

  const isExpired = new Date(lock.expiresAt) < new Date();
  if (isExpired) return { locked: false, byMe: false };

  return {
    locked: true,
    byMe: lock.lockedBy === userId,
    lockedBy: lock.lockedBy,
    expiresAt: lock.expiresAt,
  };
};
