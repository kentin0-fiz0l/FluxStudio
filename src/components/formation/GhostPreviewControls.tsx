/**
 * GhostPreviewControls - Floating accept/reject bar for ghost previews
 *
 * Positioned near the centroid of affected performers. Shows the source label
 * and accept (green check) / reject (red X) buttons.
 */

import { useMemo } from 'react';
import { Check, X, Sparkles, GitBranch, Shield, Terminal } from 'lucide-react';
import type { Position } from '../../services/formationTypes';
import type { GhostPreviewEntry, GhostPreviewSource } from '../../store/slices/ghostPreviewSlice';
import { calculateCentroid } from '../../utils/drillGeometry';

// ============================================================================
// Types
// ============================================================================

interface GhostPreviewControlsProps {
  preview: GhostPreviewEntry;
  currentPositions: Map<string, Position>;
  canvasWidth: number;
  canvasHeight: number;
  onAccept: () => void;
  onReject: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getSourceIcon(source: GhostPreviewSource) {
  switch (source) {
    case 'prompt':
      return <Sparkles className="w-3 h-3" aria-hidden="true" />;
    case 'transition':
      return <GitBranch className="w-3 h-3" aria-hidden="true" />;
    case 'collision_fix':
      return <Shield className="w-3 h-3" aria-hidden="true" />;
    case 'mcp_tool':
      return <Terminal className="w-3 h-3" aria-hidden="true" />;
  }
}

function getSourceColor(source: GhostPreviewSource): string {
  switch (source) {
    case 'prompt':
      return 'text-blue-500';
    case 'transition':
      return 'text-purple-500';
    case 'collision_fix':
      return 'text-amber-500';
    case 'mcp_tool':
      return 'text-green-500';
  }
}

// ============================================================================
// Component
// ============================================================================

export function GhostPreviewControls({
  preview,
  currentPositions: _currentPositions,
  canvasWidth,
  canvasHeight,
  onAccept,
  onReject,
}: GhostPreviewControlsProps) {
  // Calculate centroid of affected performers in pixel space
  const position = useMemo(() => {
    const centroid = calculateCentroid(
      preview.proposedPositions,
      preview.affectedPerformerIds,
    );
    return {
      x: (centroid.x / 100) * canvasWidth,
      y: (centroid.y / 100) * canvasHeight,
    };
  }, [preview, canvasWidth, canvasHeight]);

  // Offset the controls bar above the centroid
  const style = useMemo(() => {
    // Clamp to keep within canvas bounds
    const barWidth = 240;
    const barHeight = 36;
    const offsetY = 40;

    let left = position.x - barWidth / 2;
    let top = position.y - offsetY - barHeight;

    // Clamp horizontal
    left = Math.max(8, Math.min(canvasWidth - barWidth - 8, left));
    // If too close to top, place below centroid
    if (top < 8) {
      top = position.y + offsetY;
    }

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 25,
    };
  }, [position, canvasWidth, canvasHeight]);

  const sourceColor = getSourceColor(preview.source);

  return (
    <div
      style={style}
      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
      role="toolbar"
      aria-label="Ghost preview controls"
    >
      {/* Source icon + label */}
      <div className={`flex items-center gap-1 ${sourceColor} flex-shrink-0`}>
        {getSourceIcon(preview.source)}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[120px]" title={preview.sourceLabel}>
        {preview.sourceLabel}
      </span>

      {/* Affected count */}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
        {preview.affectedPerformerIds.length}
      </span>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

      {/* Reject */}
      <button
        onClick={onReject}
        className="flex items-center justify-center w-6 h-6 rounded-md bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
        aria-label="Reject proposed changes"
        title="Reject (Esc)"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {/* Accept */}
      <button
        onClick={onAccept}
        className="flex items-center justify-center w-6 h-6 rounded-md bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 transition-colors focus-visible:ring-2 focus-visible:ring-green-500 outline-none"
        aria-label="Accept proposed changes"
        title="Accept (Enter)"
      >
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default GhostPreviewControls;
