/**
 * FormationCursorOverlay Component
 *
 * Displays remote users' cursors on the formation canvas during
 * real-time collaboration. Shows cursor position, user name,
 * and selection indicators for performers.
 */

import { useMemo } from 'react';
import { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';

// ============================================================================
// Types
// ============================================================================

interface FormationCursorOverlayProps {
  /** List of remote collaborators with their awareness state */
  collaborators: FormationAwarenessState[];
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Current zoom level */
  zoom?: number;
  /** Optional class name */
  className?: string;
}

interface CursorDisplayProps {
  collaborator: FormationAwarenessState;
  canvasWidth: number;
  canvasHeight: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationCursorOverlay({
  collaborators,
  canvasWidth,
  canvasHeight,
  zoom: _zoom = 1,
  className = '',
}: FormationCursorOverlayProps) {
  // Filter active collaborators with cursor positions
  const activeCursors = useMemo(() => {
    return collaborators.filter(
      (c) => c.isActive && c.cursor && c.cursor.x !== undefined && c.cursor.y !== undefined
    );
  }, [collaborators]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 50 }}
    >
      {/* Remote cursors */}
      {activeCursors.map((collaborator) => (
        <CursorDisplay
          key={collaborator.user.id}
          collaborator={collaborator}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      ))}

      {/* Dragging indicators */}
      {collaborators
        .filter((c) => c.draggingPerformerId)
        .map((collaborator) => (
          <DraggingIndicator
            key={`drag-${collaborator.user.id}`}
            collaborator={collaborator}
          />
        ))}
    </div>
  );
}

// ============================================================================
// Cursor Display Component
// ============================================================================

function CursorDisplay({ collaborator, canvasWidth, canvasHeight }: CursorDisplayProps) {
  const { user, cursor } = collaborator;

  if (!cursor) return null;

  // Convert normalized (0-100) position to pixel position
  const x = (cursor.x / 100) * canvasWidth;
  const y = (cursor.y / 100) * canvasHeight;

  // Check if cursor is stale (> 5 seconds old)
  const isStale = Date.now() - cursor.timestamp > 5000;

  return (
    <div
      className={`absolute transition-all duration-75 ease-out ${isStale ? 'opacity-40' : 'opacity-100'}`}
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor arrow SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.5 3.21V20.79C5.5 21.26 6.05 21.52 6.42 21.21L10.24 17.94L12.59 22.8C12.78 23.2 13.27 23.36 13.66 23.17L15.79 22.13C16.18 21.94 16.35 21.45 16.16 21.06L13.81 16.2L18.86 15.43C19.38 15.35 19.58 14.71 19.19 14.38L6.29 3.11C5.93 2.81 5.5 3.02 5.5 3.21Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* User name label */}
      <div
        className="absolute left-4 top-5 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-sm"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  );
}

// ============================================================================
// Dragging Indicator Component
// ============================================================================

interface DraggingIndicatorProps {
  collaborator: FormationAwarenessState;
}

function DraggingIndicator({ collaborator }: DraggingIndicatorProps) {
  const { user, draggingPerformerId } = collaborator;

  if (!draggingPerformerId) return null;

  return (
    <div
      className="fixed bottom-4 left-4 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse"
      style={{ backgroundColor: user.color, color: 'white' }}
    >
      <span className="w-2 h-2 bg-white rounded-full" />
      {user.name} is moving a performer...
    </div>
  );
}

// ============================================================================
// Selection Ring Component (for performers)
// ============================================================================

interface PerformerSelectionRingProps {
  performerId: string;
  userColor: string;
  userName: string;
  position: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
}

export function PerformerSelectionRing({
  performerId: _performerId,
  userColor,
  userName,
  position,
  canvasWidth,
  canvasHeight,
}: PerformerSelectionRingProps) {
  // Convert normalized (0-100) position to pixel position
  const x = (position.x / 100) * canvasWidth;
  const y = (position.y / 100) * canvasHeight;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Selection ring */}
      <div
        className="w-12 h-12 rounded-full border-2 animate-pulse"
        style={{ borderColor: userColor }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{ backgroundColor: userColor }}
        />
      </div>

      {/* User name tooltip */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: userColor }}
      >
        {userName}
      </div>
    </div>
  );
}

// ============================================================================
// Selection Rings Overlay (for showing what performers others have selected)
// ============================================================================

interface SelectionRingsOverlayProps {
  collaborators: FormationAwarenessState[];
  performerPositions: Map<string, { x: number; y: number }>;
  canvasWidth: number;
  canvasHeight: number;
}

export function SelectionRingsOverlay({
  collaborators,
  performerPositions,
  canvasWidth,
  canvasHeight,
}: SelectionRingsOverlayProps) {
  const rings = useMemo(() => {
    const result: Array<{
      performerId: string;
      userColor: string;
      userName: string;
      position: { x: number; y: number };
    }> = [];

    collaborators.forEach((collaborator) => {
      if (!collaborator.selectedPerformerIds) return;

      collaborator.selectedPerformerIds.forEach((performerId) => {
        const position = performerPositions.get(performerId);
        if (position) {
          result.push({
            performerId,
            userColor: collaborator.user.color,
            userName: collaborator.user.name,
            position,
          });
        }
      });
    });

    return result;
  }, [collaborators, performerPositions]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 45 }}>
      {rings.map((ring) => (
        <PerformerSelectionRing
          key={`${ring.performerId}-${ring.userName}`}
          performerId={ring.performerId}
          userColor={ring.userColor}
          userName={ring.userName}
          position={ring.position}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default FormationCursorOverlay;
