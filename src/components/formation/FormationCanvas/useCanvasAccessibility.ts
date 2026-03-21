/**
 * useCanvasAccessibility - Accessibility support for FormationCanvas
 *
 * Provides:
 * - aria-live announcements for selection changes, tool switches, and navigation
 * - Position descriptions using drill coordinate notation (e.g., "4 steps outside R35")
 * - Keyboard navigation between performers (Tab/Shift+Tab, arrow keys without selection)
 * - Off-screen accessible data table synced with the visual canvas
 * - Focus management helpers
 *
 * Phase 10.3 - Formation Canvas Accessibility
 * Phase 3.2 - WCAG 2.1 AA Completion
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { positionToCoordinateDetails } from '../../../services/coordinateSheetGenerator';
import { NCAA_FOOTBALL_FIELD } from '../../../services/fieldConfigService';
import type { Formation, Position } from '../../../services/formationService';
import type { Tool } from './types';
import type { FieldConfig } from '../../../services/formationTypes';

interface UseCanvasAccessibilityProps {
  formation: Formation | null;
  selectedPerformerIds: Set<string>;
  currentPositions: Map<string, Position>;
  activeTool: Tool;
  zoom: number;
  fieldConfig?: FieldConfig;
}

export interface PerformerTableRow {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  coordinateDescription: string;
  isSelected: boolean;
}

interface AccessibilityState {
  /** Current announcement for the aria-live region */
  announcement: string;
  /** Ref to attach to the aria-live container */
  liveRegionRef: React.RefObject<HTMLDivElement>;
  /** Describe the currently focused/selected performer's position */
  getPerformerDescription: (performerId: string) => string;
  /** Navigate to next/previous performer with keyboard */
  navigatePerformer: (direction: 'next' | 'prev') => string | null;
  /** Get summary of current canvas state for screen readers */
  getCanvasSummary: () => string;
  /** Accessible table rows synced with canvas state */
  tableRows: PerformerTableRow[];
  /** Keyboard handlers for the accessible table */
  tableKeyboardHandlers: {
    onKeyDown: (e: React.KeyboardEvent, performerId: string) => void;
  };
  /** Ref for the accessible table container */
  accessibleTableRef: React.RefObject<HTMLTableElement>;
  /** Announce a change to screen readers */
  announceChange: (message: string) => void;
}

const TOOL_LABELS: Record<Tool, string> = {
  select: 'Select tool',
  pan: 'Pan tool',
  add: 'Add performer tool',
  line: 'Line shape tool',
  arc: 'Arc shape tool',
  block: 'Block shape tool',
  comment: 'Comment tool',
  curve: 'Curve edit tool',
};

export function useCanvasAccessibility({
  formation,
  selectedPerformerIds,
  currentPositions,
  activeTool,
  fieldConfig = NCAA_FOOTBALL_FIELD,
}: UseCanvasAccessibilityProps): AccessibilityState {
  const [announcement, setAnnouncement] = useState('');
  const liveRegionRef = useRef<HTMLDivElement>(null!);
  const accessibleTableRef = useRef<HTMLTableElement>(null!);
  const prevSelectedRef = useRef<Set<string>>(new Set());
  const prevToolRef = useRef<Tool>(activeTool);

  // Announce function that updates the aria-live region
  const announce = useCallback((message: string) => {
    // Clear then set to ensure repeated announcements are read
    setAnnouncement('');
    // Use setTimeout to ensure the clear and set happen in separate renders,
    // which forces screen readers to re-announce identical messages
    setTimeout(() => {
      setAnnouncement(message);
    }, 0);
  }, []);

  // Get human-readable position description for a performer
  const getPerformerDescription = useCallback(
    (performerId: string): string => {
      if (!formation) return '';

      const performer = formation.performers.find((p) => p.id === performerId);
      if (!performer) return '';

      const position = currentPositions.get(performerId);
      if (!position) return `${performer.name}, position unknown`;

      const coords = positionToCoordinateDetails(position, fieldConfig);
      return `${performer.name}: ${coords.sideToSide}, ${coords.frontToBack}`;
    },
    [formation, currentPositions, fieldConfig],
  );

  // Navigate to next/previous performer in the roster order
  const navigatePerformer = useCallback(
    (direction: 'next' | 'prev'): string | null => {
      if (!formation || formation.performers.length === 0) return null;

      const ids = formation.performers.map((p) => p.id);
      const currentId =
        selectedPerformerIds.size === 1
          ? Array.from(selectedPerformerIds)[0]
          : null;
      const currentIdx = currentId ? ids.indexOf(currentId) : -1;

      let nextIdx: number;
      if (direction === 'next') {
        nextIdx = currentIdx < ids.length - 1 ? currentIdx + 1 : 0;
      } else {
        nextIdx = currentIdx > 0 ? currentIdx - 1 : ids.length - 1;
      }

      return ids[nextIdx];
    },
    [formation, selectedPerformerIds],
  );

  // Get canvas summary for screen reader orientation
  const getCanvasSummary = useCallback((): string => {
    if (!formation) return 'No formation loaded';

    const performerCount = formation.performers.length;
    const keyframeCount = formation.keyframes.length;
    const selectedCount = selectedPerformerIds.size;

    const parts = [
      `Formation: ${formation.name || 'Untitled'}`,
      `${performerCount} performer${performerCount !== 1 ? 's' : ''}`,
      `${keyframeCount} set${keyframeCount !== 1 ? 's' : ''}`,
    ];

    if (selectedCount > 0) {
      parts.push(
        `${selectedCount} selected`,
      );
    }

    parts.push(`Active tool: ${TOOL_LABELS[activeTool]}`);

    return parts.join('. ');
  }, [formation, selectedPerformerIds, activeTool]);

  // Build accessible table rows synced with canvas state
  const tableRows: PerformerTableRow[] = useMemo(() => {
    if (!formation) return [];

    return formation.performers.map((performer) => {
      const position = currentPositions.get(performer.id);
      let coordinateDescription = 'Position unknown';
      if (position) {
        const coords = positionToCoordinateDetails(position, fieldConfig);
        coordinateDescription = `${coords.sideToSide}, ${coords.frontToBack}`;
      }
      return {
        id: performer.id,
        name: performer.name,
        label: performer.label || performer.name,
        x: position?.x ?? 0,
        y: position?.y ?? 0,
        coordinateDescription,
        isSelected: selectedPerformerIds.has(performer.id),
      };
    });
  }, [formation, currentPositions, selectedPerformerIds, fieldConfig]);

  // Keyboard handlers for the accessible table (arrow keys to navigate rows)
  const tableKeyboardHandlers = useMemo(() => ({
    onKeyDown: (e: React.KeyboardEvent, performerId: string) => {
      if (!formation) return;
      const ids = formation.performers.map((p) => p.id);
      const currentIdx = ids.indexOf(performerId);

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, ids.length - 1)
          : Math.max(currentIdx - 1, 0);
        // Focus the next row in the table
        const table = accessibleTableRef.current;
        if (table) {
          const rows = table.querySelectorAll<HTMLElement>('tr[data-performer-id]');
          rows[nextIdx]?.focus();
        }
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        announce(`Selected: ${getPerformerDescription(performerId)}`);
      }
    },
  }), [formation, announce, getPerformerDescription]);

  // Announce selection changes
  useEffect(() => {
    const prev = prevSelectedRef.current;
    const current = selectedPerformerIds;

    // Skip if no change
    if (
      prev.size === current.size &&
      Array.from(prev).every((id) => current.has(id))
    ) {
      return;
    }

    prevSelectedRef.current = new Set(current);

    if (current.size === 0 && prev.size > 0) {
      announce('Selection cleared');
      return;
    }

    if (current.size === 1) {
      const id = Array.from(current)[0];
      const description = getPerformerDescription(id);
      announce(`Selected: ${description}`);
      return;
    }

    if (current.size > 1) {
      announce(`${current.size} performers selected`);
    }
  }, [selectedPerformerIds, announce, getPerformerDescription]);

  // Announce tool changes
  useEffect(() => {
    if (activeTool !== prevToolRef.current) {
      prevToolRef.current = activeTool;
      announce(TOOL_LABELS[activeTool]);
    }
  }, [activeTool, announce]);

  return {
    announcement,
    liveRegionRef,
    getPerformerDescription,
    navigatePerformer,
    getCanvasSummary,
    tableRows,
    tableKeyboardHandlers,
    accessibleTableRef,
    announceChange: announce,
  };
}
