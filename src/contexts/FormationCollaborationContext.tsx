/* eslint-disable react-refresh/only-export-components */
/**
 * FormationCollaborationContext
 *
 * Provides real-time collaboration state and actions for formation editing.
 * Wraps the useFormationYjs hook and exposes it via React Context.
 */

import { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { toast } from '@/lib/toast';
import { useFormationYjs, UseFormationYjsResult } from '@/hooks/useFormationYjs';
import type { Formation } from '@/services/formationService';
import { useAuth } from '@/store/slices/authSlice';

// ============================================================================
// Types
// ============================================================================

interface FormationCollaborationContextValue extends Omit<UseFormationYjsResult, 'doc' | 'provider'> {
  /** Is collaborative mode enabled */
  isCollaborative: boolean;
  /** Current user info for presence */
  currentUser: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  } | null;
  /** Check if performer is locked by another user */
  canMovePerformer: (performerId: string) => { allowed: boolean; reason?: string; blockedBy?: string };
  /** Try to start dragging a performer (returns false if blocked) */
  tryStartDrag: (performerId: string) => boolean;
  /** End dragging a performer */
  endDrag: () => void;
}

interface FormationCollaborationProviderProps {
  children: ReactNode;
  projectId: string;
  formationId: string;
  initialData?: Formation;
  enabled?: boolean;
  onFormationUpdate?: (formation: Formation) => void;
}

// ============================================================================
// Context
// ============================================================================

const FormationCollaborationContext = createContext<FormationCollaborationContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function FormationCollaborationProvider({
  children,
  projectId,
  formationId,
  initialData,
  enabled = true,
  onFormationUpdate,
}: FormationCollaborationProviderProps) {
  const { user } = useAuth();

  // Get user color based on user ID
  const userColor = useMemo(() => {
    if (!user?.id) return '#3B82F6';
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    ];
    const hash = user.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }, [user?.id]);

  // Current user info
  const currentUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name || user.email || 'Anonymous',
      color: userColor,
      avatar: user.avatar,
    };
  }, [user, userColor]);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      // Don't show toast for initial connection, only for reconnection
    } else {
      toast.warning('Collaboration disconnected. Reconnecting...');
    }
  }, []);

  // Initialize Yjs collaboration
  const yjsResult = useFormationYjs({
    projectId,
    formationId,
    enabled: enabled && !!formationId,
    initialData,
    onUpdate: onFormationUpdate,
    onConnectionChange: handleConnectionChange,
  });

  // Check if performer can be moved (not being dragged by someone else)
  const canMovePerformer = useCallback((performerId: string) => {
    const { dragging, by } = yjsResult.isPerformerBeingDragged(performerId);

    if (dragging && by) {
      return {
        allowed: false,
        reason: `${by.user.name} is currently moving this performer`,
        blockedBy: by.user.name,
      };
    }

    return { allowed: true };
  }, [yjsResult]);

  // Try to start dragging a performer
  const tryStartDrag = useCallback((performerId: string) => {
    const { allowed, reason } = canMovePerformer(performerId);

    if (!allowed) {
      toast.warning(reason || `Another user is moving this performer`);
      return false;
    }

    // Set ourselves as dragging this performer
    yjsResult.setDraggingPerformer(performerId);
    return true;
  }, [canMovePerformer, yjsResult]);

  // End dragging
  const endDrag = useCallback(() => {
    yjsResult.setDraggingPerformer(null);
  }, [yjsResult]);

  // Build context value
  const contextValue = useMemo<FormationCollaborationContextValue>(() => ({
    // From useFormationYjs (excluding doc and provider)
    formation: yjsResult.formation,
    isConnected: yjsResult.isConnected,
    isSyncing: yjsResult.isSyncing,
    error: yjsResult.error,
    collaborators: yjsResult.collaborators,
    hasPendingChanges: yjsResult.hasPendingChanges,
    lastSyncedAt: yjsResult.lastSyncedAt,

    // Mutations
    updateMeta: yjsResult.updateMeta,
    addPerformer: yjsResult.addPerformer,
    updatePerformer: yjsResult.updatePerformer,
    removePerformer: yjsResult.removePerformer,
    addKeyframe: yjsResult.addKeyframe,
    updateKeyframe: yjsResult.updateKeyframe,
    removeKeyframe: yjsResult.removeKeyframe,
    updatePosition: yjsResult.updatePosition,
    updatePositions: yjsResult.updatePositions,
    setAudioTrack: yjsResult.setAudioTrack,

    // Awareness
    updateCursor: yjsResult.updateCursor,
    clearCursor: yjsResult.clearCursor,
    setSelectedPerformers: yjsResult.setSelectedPerformers,
    setDraggingPerformer: yjsResult.setDraggingPerformer,
    isPerformerBeingDragged: yjsResult.isPerformerBeingDragged,

    // Y.UndoManager
    yUndo: yjsResult.yUndo,
    yRedo: yjsResult.yRedo,
    canYUndo: yjsResult.canYUndo,
    canYRedo: yjsResult.canYRedo,

    // Additional collaboration features
    isCollaborative: enabled && yjsResult.isConnected,
    currentUser,
    canMovePerformer,
    tryStartDrag,
    endDrag,
  }), [yjsResult, enabled, currentUser, canMovePerformer, tryStartDrag, endDrag]);

  return (
    <FormationCollaborationContext.Provider value={contextValue}>
      {children}
    </FormationCollaborationContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useFormationCollaboration(): FormationCollaborationContextValue {
  const context = useContext(FormationCollaborationContext);

  if (!context) {
    throw new Error(
      'useFormationCollaboration must be used within a FormationCollaborationProvider'
    );
  }

  return context;
}

// ============================================================================
// Optional Hook (doesn't throw if not in provider)
// ============================================================================

export function useFormationCollaborationOptional(): FormationCollaborationContextValue | null {
  return useContext(FormationCollaborationContext);
}

// ============================================================================
// Export
// ============================================================================

export default FormationCollaborationContext;
