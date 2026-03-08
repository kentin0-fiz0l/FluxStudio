/**
 * AI Collaboration Service
 *
 * Phase 3.1: AI Co-Pilot Upgrade — Context-Aware and Collaborative
 *
 * Detects editing conflicts between collaborators and generates
 * AI-powered improvement suggestions for formations.
 */

import type { FormationAwarenessState } from './formation/yjs/formationYjsTypes';
import type { Formation, Position } from './formationTypes';
import type { DrillSuggestion } from './drillAiService';

// ============================================================================
// Types
// ============================================================================

export interface EditingConflict {
  type: 'same-performer' | 'overlapping-area' | 'same-set';
  severity: 'warning' | 'info';
  message: string;
  userIds: string[];
  userNames: string[];
  /** Performer IDs involved in the conflict */
  performerIds?: string[];
  /** Set index if conflict is set-related */
  setIndex?: number;
}

export interface ImprovementSuggestion {
  type: 'spacing' | 'transition' | 'symmetry' | 'section-grouping';
  priority: 'high' | 'medium' | 'low';
  message: string;
  setIndex?: number;
  setName?: string;
  performerIds?: string[];
}

// ============================================================================
// Conflict Detection
// ============================================================================

/** Proximity threshold in normalized coordinates (0-100 space) */
const AREA_OVERLAP_THRESHOLD = 10;

/**
 * Detect editing conflicts between collaborators based on awareness state.
 *
 * Checks for:
 * - Two users selecting/dragging the same performer
 * - Two users editing overlapping areas of the canvas
 * - Two users editing the same set/keyframe simultaneously
 */
export function detectEditingConflicts(
  awarenessStates: FormationAwarenessState[],
  _formationState?: Formation,
): EditingConflict[] {
  const conflicts: EditingConflict[] = [];
  const activeUsers = awarenessStates.filter((s) => s.isActive);

  if (activeUsers.length < 2) return conflicts;

  // Check for same-performer conflicts (two users selecting or dragging the same performer)
  for (let i = 0; i < activeUsers.length; i++) {
    for (let j = i + 1; j < activeUsers.length; j++) {
      const userA = activeUsers[i];
      const userB = activeUsers[j];

      // Same performer being dragged
      if (userA.draggingPerformerId && userA.draggingPerformerId === userB.draggingPerformerId) {
        conflicts.push({
          type: 'same-performer',
          severity: 'warning',
          message: `${userA.user.name} and ${userB.user.name} are both moving the same performer`,
          userIds: [userA.user.id, userB.user.id],
          userNames: [userA.user.name, userB.user.name],
          performerIds: [userA.draggingPerformerId],
        });
      }

      // Overlapping selected performers
      if (userA.selectedPerformerIds?.length && userB.selectedPerformerIds?.length) {
        const overlap = userA.selectedPerformerIds.filter(
          (id) => userB.selectedPerformerIds?.includes(id),
        );
        if (overlap.length > 0) {
          conflicts.push({
            type: 'same-performer',
            severity: 'info',
            message: `${userA.user.name} and ${userB.user.name} have ${overlap.length} performer(s) selected in common`,
            userIds: [userA.user.id, userB.user.id],
            userNames: [userA.user.name, userB.user.name],
            performerIds: overlap,
          });
        }
      }

      // Overlapping cursor areas
      if (userA.cursor && userB.cursor) {
        const dx = userA.cursor.x - userB.cursor.x;
        const dy = userA.cursor.y - userB.cursor.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < AREA_OVERLAP_THRESHOLD) {
          conflicts.push({
            type: 'overlapping-area',
            severity: 'info',
            message: `${userA.user.name} and ${userB.user.name} are working in the same area`,
            userIds: [userA.user.id, userB.user.id],
            userNames: [userA.user.name, userB.user.name],
          });
        }
      }

      // Same set/keyframe being edited
      if (userA.activeKeyframeId && userA.activeKeyframeId === userB.activeKeyframeId) {
        conflicts.push({
          type: 'same-set',
          severity: 'info',
          message: `${userA.user.name} and ${userB.user.name} are both editing the same set`,
          userIds: [userA.user.id, userB.user.id],
          userNames: [userA.user.name, userB.user.name],
        });
      }
    }
  }

  return conflicts;
}

// ============================================================================
// Improvement Suggestions
// ============================================================================

/** Minimum distance between performers before flagging as too close */
const MIN_SPACING = 3;

/** Maximum distance between performers of the same section */
const MAX_SECTION_SPREAD = 40;

/**
 * Generate AI suggestions for improving a formation.
 *
 * Analyzes:
 * - Performer spacing (too close / too far)
 * - Transition feasibility between sets
 * - Section grouping (are sections clustered together?)
 */
export function suggestImprovements(
  formationState: Formation,
  _musicData?: { bpm?: number; sections?: string[] },
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];
  const { performers, keyframes, sets } = formationState;

  if (!keyframes.length || !performers.length) return suggestions;

  // Analyze each keyframe for spacing issues
  for (let kIdx = 0; kIdx < keyframes.length; kIdx++) {
    const keyframe = keyframes[kIdx];
    const setName = sets?.[kIdx]?.name || `Set ${kIdx + 1}`;

    // Check performer spacing
    const tooClose: string[] = [];
    const performerPositions = Array.from(keyframe.positions.entries());

    for (let i = 0; i < performerPositions.length; i++) {
      for (let j = i + 1; j < performerPositions.length; j++) {
        const [idA, posA] = performerPositions[i];
        const [idB, posB] = performerPositions[j];
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MIN_SPACING) {
          tooClose.push(idA, idB);
        }
      }
    }

    if (tooClose.length > 0) {
      const unique = [...new Set(tooClose)];
      suggestions.push({
        type: 'spacing',
        priority: 'high',
        message: `${unique.length} performers are too close together in ${setName}. Consider spreading them out for cleaner visuals.`,
        setIndex: kIdx,
        setName,
        performerIds: unique,
      });
    }

    // Check section grouping
    const sectionPositions = new Map<string, Position[]>();
    for (const [performerId, pos] of keyframe.positions) {
      const performer = performers.find((p) => p.id === performerId);
      if (performer?.section) {
        const positions = sectionPositions.get(performer.section) || [];
        positions.push(pos);
        sectionPositions.set(performer.section, positions);
      }
    }

    for (const [section, positions] of sectionPositions) {
      if (positions.length < 2) continue;

      // Calculate bounding box of section
      const xs = positions.map((p) => p.x);
      const ys = positions.map((p) => p.y);
      const spread = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );

      if (spread > MAX_SECTION_SPREAD) {
        suggestions.push({
          type: 'section-grouping',
          priority: 'medium',
          message: `${section} section is spread over a large area in ${setName}. Tighter grouping may improve visual cohesion.`,
          setIndex: kIdx,
          setName,
        });
      }
    }
  }

  // Check transitions between consecutive sets
  for (let kIdx = 0; kIdx < keyframes.length - 1; kIdx++) {
    const currentKf = keyframes[kIdx];
    const nextKf = keyframes[kIdx + 1];
    const counts = sets?.[kIdx]?.counts || 8;
    const setName = sets?.[kIdx]?.name || `Set ${kIdx + 1}`;

    let maxDistance = 0;
    let worstPerformerId: string | undefined;

    for (const [performerId, pos] of currentKf.positions) {
      const nextPos = nextKf.positions.get(performerId);
      if (!nextPos) continue;

      const dx = nextPos.x - pos.x;
      const dy = nextPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance) {
        maxDistance = distance;
        worstPerformerId = performerId;
      }
    }

    // If any performer has to travel more than ~4 units per count, flag it
    const distancePerCount = maxDistance / counts;
    if (distancePerCount > 4) {
      suggestions.push({
        type: 'transition',
        priority: distancePerCount > 6 ? 'high' : 'medium',
        message: `Transition from ${setName} requires a long run. Consider adding more counts or reducing the distance.`,
        setIndex: kIdx,
        setName,
        performerIds: worstPerformerId ? [worstPerformerId] : undefined,
      });
    }
  }

  return suggestions;
}

/**
 * Convert ImprovementSuggestions to DrillSuggestion format for compatibility
 * with the existing DrillCritiquePanel.
 */
export function toDrillSuggestions(improvements: ImprovementSuggestion[]): DrillSuggestion[] {
  return improvements.map((s) => ({
    type: s.priority === 'high' ? 'warning' as const : 'improvement' as const,
    setName: s.setName,
    performerIds: s.performerIds,
    message: s.message,
    priority: s.priority,
  }));
}
