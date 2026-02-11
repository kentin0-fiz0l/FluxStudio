/**
 * FormationCursorOverlay Component
 *
 * Displays remote users' cursors on the formation canvas during
 * real-time collaboration. Shows cursor position, user name,
 * and selection indicators for performers.
 *
 * UX Spec:
 * - 100ms CSS transitions for smooth cursor movement
 * - Progressive fade: 3s → 60% opacity, 5s → 40%, 10s → remove cursor
 * - 2px dashed border for remote selection rings
 * - Label max-width 120px with truncation
 * - Zoom scaling for selection rings
 */

import { useMemo, useEffect, useRef } from 'react';
import type { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';
import type { Position } from '@/services/formationService';

// ============================================================================
// Constants
// ============================================================================

/** Cursor staleness thresholds in milliseconds */
const CURSOR_FADE_THRESHOLD_1 = 3000;  // 3s → 60% opacity
const CURSOR_FADE_THRESHOLD_2 = 5000;  // 5s → 40% opacity
const CURSOR_REMOVE_THRESHOLD = 10000; // 10s → remove cursor

/** Base size for selection rings (before zoom scaling) */
const SELECTION_RING_BASE_SIZE = 40; // px

// ============================================================================
// Types
// ============================================================================

export interface FormationCursorOverlayProps {
  /** List of remote collaborators with their awareness state */
  collaborators: FormationAwarenessState[];
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Map of performer IDs to their current positions (normalized 0-100) */
  performerPositions?: Map<string, Position>;
  /** Current zoom level (affects selection ring size) */
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
// Helper Functions
// ============================================================================

/**
 * Calculate cursor opacity based on staleness (progressive fade)
 * - 0-3s: 100% opacity
 * - 3-5s: 60% opacity
 * - 5-10s: 40% opacity
 * - 10s+: hidden (return null to filter out)
 */
function getCursorOpacity(timestamp: number): number | null {
  const age = Date.now() - timestamp;

  if (age >= CURSOR_REMOVE_THRESHOLD) return null; // Remove cursor
  if (age >= CURSOR_FADE_THRESHOLD_2) return 0.4;  // 40% opacity
  if (age >= CURSOR_FADE_THRESHOLD_1) return 0.6;  // 60% opacity
  return 1; // Full opacity
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationCursorOverlay({
  collaborators,
  canvasWidth,
  canvasHeight,
  performerPositions,
  zoom = 1,
  className = '',
}: FormationCursorOverlayProps) {
  // Track previous collaborator count for announcements
  const prevCollaboratorCountRef = useRef(collaborators.length);
  const announcementRef = useRef<string>('');

  // Generate screen reader announcement when collaborators change
  useEffect(() => {
    const prevCount = prevCollaboratorCountRef.current;
    const currentCount = collaborators.length;

    if (currentCount > prevCount) {
      // New collaborator joined
      const newCollaborators = collaborators.slice(prevCount);
      const names = newCollaborators.map(c => c.user?.name).filter(Boolean).join(', ');
      announcementRef.current = names
        ? `${names} joined the canvas`
        : `${currentCount - prevCount} collaborator${currentCount - prevCount > 1 ? 's' : ''} joined`;
    } else if (currentCount < prevCount) {
      // Collaborator left
      announcementRef.current = `A collaborator left the canvas. ${currentCount} collaborator${currentCount !== 1 ? 's' : ''} remaining`;
    }

    prevCollaboratorCountRef.current = currentCount;
  }, [collaborators]);

  // Generate dragging announcement
  const draggingAnnouncement = useMemo(() => {
    const draggingUsers = collaborators.filter(c => c.draggingPerformerId);
    if (draggingUsers.length === 0) return '';
    return draggingUsers.map(c => `${c.user?.name || 'Someone'} is moving a performer`).join('. ');
  }, [collaborators]);

  // Filter active collaborators with valid, non-stale cursors
  const activeCursors = useMemo(() => {
    return collaborators.filter((c) => {
      if (!c.isActive || !c.cursor || c.cursor.x === undefined || c.cursor.y === undefined) {
        return false;
      }
      // Remove cursors older than 10 seconds
      return getCursorOpacity(c.cursor.timestamp) !== null;
    });
  }, [collaborators]);

  // Collect selection rings for performers selected by other collaborators
  const selectionRings = useMemo(() => {
    if (!performerPositions) {
      console.log('[CursorOverlay] No performerPositions provided');
      return [];
    }

    const rings: Array<{
      performerId: string;
      userColor: string;
      userName: string;
      position: Position;
    }> = [];

    console.log('[CursorOverlay] Processing collaborators:', collaborators.length);
    console.log('[CursorOverlay] performerPositions size:', performerPositions.size);

    collaborators.forEach((collaborator) => {
      console.log('[CursorOverlay] Collaborator:', collaborator.user?.name, 'selectedPerformerIds:', collaborator.selectedPerformerIds);
      if (!collaborator.selectedPerformerIds) return;

      collaborator.selectedPerformerIds.forEach((performerId) => {
        const position = performerPositions.get(performerId);
        console.log('[CursorOverlay] Looking for performer:', performerId, 'found position:', position);
        if (position) {
          rings.push({
            performerId,
            userColor: collaborator.user.color,
            userName: collaborator.user.name,
            position,
          });
        }
      });
    });

    console.log('[CursorOverlay] Total selection rings:', rings.length);
    return rings;
  }, [collaborators, performerPositions]);

  // Collect performers being dragged by other users
  const draggingRings = useMemo(() => {
    if (!performerPositions) return [];

    return collaborators
      .filter((c) => c.draggingPerformerId && performerPositions.has(c.draggingPerformerId))
      .map((collaborator) => ({
        performerId: collaborator.draggingPerformerId!,
        position: performerPositions.get(collaborator.draggingPerformerId!)!,
        userColor: collaborator.user.color,
        userName: collaborator.user.name,
      }));
  }, [collaborators, performerPositions]);

  // Don't render if no collaborators
  if (collaborators.length === 0) return null;

  // Calculate selection count for announcement
  const totalSelections = selectionRings.length;
  const selectingUsers = [...new Set(selectionRings.map(r => r.userName))];

  return (
    <>
      {/* Screen reader announcements - visually hidden but accessible */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''} on canvas
        {totalSelections > 0 && `. ${selectingUsers.join(', ')} ${selectingUsers.length === 1 ? 'has' : 'have'} selected performers`}
        {draggingAnnouncement && `. ${draggingAnnouncement}`}
      </div>

      {/* Visual overlay - hidden from screen readers */}
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        style={{ zIndex: 50 }}
        aria-hidden="true"
        data-testid="formation-cursor-overlay"
      >
      {/* Selection rings for performers selected by others */}
      {selectionRings.map((ring) => (
        <PerformerSelectionRing
          key={`selection-${ring.performerId}-${ring.userName}`}
          performerId={ring.performerId}
          userColor={ring.userColor}
          userName={ring.userName}
          position={ring.position}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          zoom={zoom}
        />
      ))}

      {/* Dragging indicators on performers being moved */}
      {draggingRings.map((ring) => (
        <PerformerDraggingRing
          key={`dragging-${ring.performerId}`}
          performerId={ring.performerId}
          userColor={ring.userColor}
          userName={ring.userName}
          position={ring.position}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          zoom={zoom}
        />
      ))}

      {/* Remote cursors */}
      {activeCursors.map((collaborator) => (
        <CursorDisplay
          key={collaborator.user.id}
          collaborator={collaborator}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      ))}

      {/* Dragging notification banner */}
      {collaborators
        .filter((c) => c.draggingPerformerId)
        .map((collaborator) => (
          <DraggingIndicator
            key={`drag-banner-${collaborator.user.id}`}
            collaborator={collaborator}
          />
        ))}
      </div>
    </>
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

  // Progressive fade based on cursor age
  const opacity = getCursorOpacity(cursor.timestamp);
  if (opacity === null) return null; // Cursor too old, remove it

  return (
    <div
      className="absolute ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
        opacity,
        transition: 'left 100ms ease-out, top 100ms ease-out, opacity 300ms ease-out',
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

      {/* User name label - max 120px with truncation */}
      <div
        className="absolute left-4 top-5 px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm overflow-hidden text-ellipsis"
        style={{
          backgroundColor: user.color,
          maxWidth: '120px',
          whiteSpace: 'nowrap',
        }}
        title={user.name}
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
// Selection Ring Component (for performers selected by others)
// ============================================================================

interface PerformerSelectionRingProps {
  performerId: string;
  userColor: string;
  userName: string;
  position: Position;
  canvasWidth: number;
  canvasHeight: number;
  zoom?: number;
}

function PerformerSelectionRing({
  performerId: _performerId,
  userColor,
  userName,
  position,
  canvasWidth,
  canvasHeight,
  zoom = 1,
}: PerformerSelectionRingProps) {
  // Convert normalized (0-100) position to pixel position
  const x = (position.x / 100) * canvasWidth;
  const y = (position.y / 100) * canvasHeight;

  // Scale ring size with zoom
  const ringSize = SELECTION_RING_BASE_SIZE * zoom;

  return (
    <div
      className="absolute ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        transition: 'left 100ms ease-out, top 100ms ease-out',
      }}
    >
      {/* Selection ring - 2px dashed border per UX spec */}
      <div
        className="rounded-full animate-pulse"
        style={{
          width: ringSize,
          height: ringSize,
          border: `2px dashed ${userColor}`,
          boxShadow: `0 0 8px ${userColor}40`,
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{ backgroundColor: userColor }}
        />
      </div>

      {/* Small user indicator badge */}
      <div
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
        style={{ backgroundColor: userColor }}
        title={`Selected by ${userName}`}
      >
        {userName.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

// ============================================================================
// Dragging Ring Component (for performers being dragged by others)
// ============================================================================

interface PerformerDraggingRingProps {
  performerId: string;
  userColor: string;
  userName: string;
  position: Position;
  canvasWidth: number;
  canvasHeight: number;
  zoom?: number;
}

function PerformerDraggingRing({
  performerId: _performerId,
  userColor,
  userName,
  position,
  canvasWidth,
  canvasHeight,
  zoom = 1,
}: PerformerDraggingRingProps) {
  // Convert normalized (0-100) position to pixel position
  const x = (position.x / 100) * canvasWidth;
  const y = (position.y / 100) * canvasHeight;

  // Scale ring size with zoom (slightly larger than selection ring)
  const ringSize = (SELECTION_RING_BASE_SIZE + 8) * zoom;

  return (
    <div
      className="absolute ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        transition: 'left 100ms ease-out, top 100ms ease-out',
      }}
    >
      {/* Dragging ring with dashed animated border */}
      <div
        className="rounded-full"
        style={{
          width: ringSize,
          height: ringSize,
          border: `2px dashed ${userColor}`,
          animation: 'spin 2s linear infinite',
          boxShadow: `0 0 12px ${userColor}60`,
        }}
        title={`Being dragged by ${userName}`}
      />

      {/* User name badge below - max 120px with truncation */}
      <div
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium text-white shadow-sm overflow-hidden text-ellipsis"
        style={{
          backgroundColor: userColor,
          maxWidth: '120px',
          whiteSpace: 'nowrap',
        }}
        title={userName}
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
  zoom?: number;
}

export function SelectionRingsOverlay({
  collaborators,
  performerPositions,
  canvasWidth,
  canvasHeight,
  zoom = 1,
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
          zoom={zoom}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default FormationCursorOverlay;
