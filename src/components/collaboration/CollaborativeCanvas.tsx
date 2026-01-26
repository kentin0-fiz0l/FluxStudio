/**
 * CollaborativeCanvas - Real-time collaborative editing canvas
 *
 * Wraps any canvas content with collaboration features:
 * - Multi-user cursors
 * - Presence indicators
 * - Selection highlighting
 * - Edit conflict resolution
 */

import * as React from 'react';
import { useCollaboration, useActiveSession, useIsEntityLocked } from '@/store';
import { realtime } from '@/services/realtime';
import { CollaborativeCursors } from './CollaborativeCursors';
import { PresenceIndicator } from './PresenceIndicator';
import { SelectionHighlights } from './SelectionHighlights';
import { Lock } from 'lucide-react';

interface CollaborativeCanvasProps {
  entityType: 'board' | 'metmap' | 'document' | 'project';
  entityId: string;
  children: React.ReactNode;
  showCursors?: boolean;
  showPresence?: boolean;
  showSelections?: boolean;
  className?: string;
}

export function CollaborativeCanvas({
  entityType,
  entityId,
  children,
  showCursors = true,
  showPresence = true,
  showSelections = true,
  className = '',
}: CollaborativeCanvasProps) {
  const collaboration = useCollaboration();
  const session = useActiveSession();
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const sessionId = `${entityType}:${entityId}`;

  // Join collaboration session on mount
  React.useEffect(() => {
    collaboration.joinSession(entityType, entityId);

    // Join via realtime
    realtime.channels.collaboration.joinBoard(sessionId);

    return () => {
      collaboration.leaveSession(sessionId);
      realtime.channels.collaboration.leaveBoard(sessionId);
    };
  }, [entityType, entityId, sessionId, collaboration]);

  // Listen for user join/leave events
  React.useEffect(() => {
    const joinSub = realtime.channels.collaboration.onUserJoined((data) => {
      if (data.boardId === sessionId) {
        collaboration.updateCollaborator(sessionId, {
          id: data.userId,
          userId: data.userId,
          userName: data.userName,
          isActive: true,
        });
      }
    });

    const leaveSub = realtime.channels.collaboration.onUserLeft((data) => {
      if (data.boardId === sessionId) {
        collaboration.removeCollaborator(sessionId, data.userId);
      }
    });

    return () => {
      joinSub.unsubscribe();
      leaveSub.unsubscribe();
    };
  }, [sessionId, collaboration]);

  // Listen for remote edits
  React.useEffect(() => {
    const editSub = realtime.channels.collaboration.onEdit((edit) => {
      collaboration.addEdit(sessionId, {
        entityId: edit.entityId,
        entityType: edit.entityType,
        operation: edit.operation,
        data: edit.data,
        userId: edit.userId,
        userName: '', // Would come from user lookup
      });
    });

    return () => editSub.unsubscribe();
  }, [sessionId, collaboration]);

  const collaboratorCount = session?.collaborators.length || 0;

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar overlay */}
      {showPresence && collaboratorCount > 0 && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
          <PresenceIndicator roomId={sessionId} maxDisplay={4} />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {collaboratorCount} {collaboratorCount === 1 ? 'viewer' : 'viewing'}
          </span>
        </div>
      )}

      {/* Canvas content */}
      <div ref={canvasRef} className="relative">
        {children}

        {/* Cursors overlay */}
        {showCursors && <CollaborativeCursors canvasRef={canvasRef} sessionId={sessionId} />}

        {/* Selection highlights */}
        {showSelections && <SelectionHighlights sessionId={sessionId} />}
      </div>
    </div>
  );
}

// Hook for collaborative editing operations
export function useCollaborativeEdit(sessionId: string, entityId: string, entityType: string) {
  const collaboration = useCollaboration();
  const lockStatus = useIsEntityLocked(entityId, sessionId);

  const requestEdit = React.useCallback(() => {
    if (lockStatus.locked && !lockStatus.byMe) {
      return { success: false, reason: 'locked_by_other' };
    }

    const acquired = collaboration.acquireLock(sessionId, entityId, entityType);
    return { success: acquired, reason: acquired ? null : 'lock_failed' };
  }, [sessionId, entityId, entityType, lockStatus, collaboration]);

  const commitEdit = React.useCallback(
    (operation: 'create' | 'update' | 'delete', data: unknown) => {
      // Add to local edit history
      collaboration.addEdit(sessionId, {
        entityId,
        entityType,
        operation,
        data,
        userId: '', // Would come from auth
        userName: '',
      });

      // Broadcast via realtime
      realtime.channels.collaboration.broadcastEdit(sessionId, {
        entityId,
        entityType,
        operation,
        data,
      });

      // Release lock
      collaboration.releaseLock(sessionId, entityId);
    },
    [sessionId, entityId, entityType, collaboration]
  );

  const cancelEdit = React.useCallback(() => {
    collaboration.releaseLock(sessionId, entityId);
  }, [sessionId, entityId, collaboration]);

  return {
    isLocked: lockStatus.locked,
    isLockedByMe: lockStatus.byMe,
    requestEdit,
    commitEdit,
    cancelEdit,
  };
}

export default CollaborativeCanvas;
