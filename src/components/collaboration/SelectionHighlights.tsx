/**
 * SelectionHighlights - Shows what other users have selected
 *
 * Renders colored borders around elements selected by collaborators.
 */

import * as React from 'react';
import { useCollaborators } from '@/store';

interface SelectionHighlightsProps {
  sessionId: string;
  className?: string;
}

export function SelectionHighlights({ sessionId, className = '' }: SelectionHighlightsProps) {
  const collaborators = useCollaborators(sessionId);

  // Get all selections from collaborators
  const selections = collaborators
    .filter((c) => c.isActive && c.selection)
    .map((c) => ({
      userId: c.userId,
      userName: c.userName,
      color: c.color,
      selection: c.selection!,
    }));

  if (selections.length === 0) {
    return null;
  }

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {selections.map((selection) => (
        <SelectionOverlay
          key={`${selection.userId}-${selection.selection.entityId}`}
          entityId={selection.selection.entityId}
          color={selection.color}
          userName={selection.userName}
        />
      ))}
    </div>
  );
}

interface SelectionOverlayProps {
  entityId: string;
  color: string;
  userName: string;
}

function SelectionOverlay({ entityId, color, userName }: SelectionOverlayProps) {
  const [bounds, setBounds] = React.useState<DOMRect | null>(null);

  // Find the element by data attribute
  React.useEffect(() => {
    const element = document.querySelector(`[data-entity-id="${entityId}"]`);
    if (element) {
      const updateBounds = () => setBounds(element.getBoundingClientRect());
      updateBounds();

      // Watch for changes
      const observer = new ResizeObserver(updateBounds);
      observer.observe(element);

      return () => observer.disconnect();
    }
  }, [entityId]);

  if (!bounds) {
    return null;
  }

  return (
    <div
      className="absolute transition-all duration-150"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        border: `2px solid ${color}`,
        borderRadius: '4px',
        pointerEvents: 'none',
      }}
    >
      {/* User label */}
      <div
        className="absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium text-white rounded whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </div>
  );
}

export default SelectionHighlights;
