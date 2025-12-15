/**
 * CollaborativeCursors - Real-time cursor visualization
 *
 * Shows other users' cursor positions on a collaborative canvas.
 * Each cursor has the user's name and a unique color.
 */

import * as React from 'react';
import { useCollaborators, useCollaboration } from '@/store';
import { realtime } from '@/services/realtime';

interface CollaborativeCursorsProps {
  canvasRef: React.RefObject<HTMLElement>;
  sessionId?: string;
  className?: string;
}

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName?: string;
  color?: string;
}

export function CollaborativeCursors({
  canvasRef,
  sessionId,
  className = '',
}: CollaborativeCursorsProps) {
  const collaborators = useCollaborators(sessionId);
  const collaboration = useCollaboration();

  const [cursors, setCursors] = React.useState<Record<string, CursorPosition>>({});

  // Track and broadcast local cursor position
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update local cursor in store
      collaboration.updateLocalCursor({
        x,
        y,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to other users via realtime
      realtime.channels.collaboration.updateCursor(sessionId || '', { x, y });
    };

    const handleMouseLeave = () => {
      collaboration.updateLocalCursor(null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, sessionId, collaboration]);

  // Listen for cursor updates from other users
  React.useEffect(() => {
    const subscription = realtime.channels.collaboration.onCursorMove((cursor) => {
      setCursors((prev) => ({
        ...prev,
        [cursor.userId]: cursor,
      }));

      // Remove cursor after inactivity
      setTimeout(() => {
        setCursors((prev) => {
          const current = prev[cursor.userId];
          if (current && current.x === cursor.x && current.y === cursor.y) {
            const next = { ...prev };
            delete next[cursor.userId];
            return next;
          }
          return prev;
        });
      }, 5000);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Build cursor data from collaborators
  const cursorData = React.useMemo(() => {
    return collaborators
      .filter((c) => c.isActive && c.cursor)
      .map((c) => ({
        ...c.cursor!,
        userId: c.userId,
        userName: c.userName,
        color: c.color,
      }));
  }, [collaborators]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {cursorData.map((cursor) => (
        <CursorDisplay key={cursor.userId} cursor={cursor} />
      ))}
      {Object.values(cursors).map((cursor) => (
        <CursorDisplay key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  );
}

interface CursorDisplayProps {
  cursor: CursorPosition;
}

function CursorDisplay({ cursor }: CursorDisplayProps) {
  return (
    <div
      className="absolute transition-all duration-75 ease-out"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.5 3.21V20.79C5.5 21.26 6.05 21.52 6.42 21.21L10.24 17.94L12.59 22.8C12.78 23.2 13.27 23.36 13.66 23.17L15.79 22.13C16.18 21.94 16.35 21.45 16.16 21.06L13.81 16.2L18.86 15.43C19.38 15.35 19.58 14.71 19.19 14.38L6.29 3.11C5.93 2.81 5.5 3.02 5.5 3.21Z"
          fill={cursor.color || '#3B82F6'}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* User name label */}
      {cursor.userName && (
        <div
          className="absolute left-4 top-5 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: cursor.color || '#3B82F6' }}
        >
          {cursor.userName}
        </div>
      )}
    </div>
  );
}

export default CollaborativeCursors;
