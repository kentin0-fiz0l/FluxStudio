/**
 * Formation Analysis - Standalone analysis functions for drill formations.
 *
 * Works on plain objects (no Yjs dependency). Computes step sizes,
 * spacing violations, collision detection, and direction changes.
 */
import type {
  FormationPosition,
  FormationPerformer,
  FormationKeyframe,
  FormationDrillSet,
  FormationState,
} from './formationBridge.js';

// ============================================================================
// Constants - NCAA Football Field
// ============================================================================

const FIELD = {
  WIDTH_YARDS: 120,       // 100 + 2x10 end zones
  HEIGHT_YARDS: 53.33,
  HASH_FRONT_YD: 20,      // Front hash from sideline
  HASH_BACK_YD: 20,       // Back hash from sideline
  MIN_PERFORMER_DISTANCE: 1.5, // Normalized 0-100 units
} as const;

// ============================================================================
// Types
// ============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface AnalysisIssue {
  id: string;
  severity: IssueSeverity;
  type: 'collision' | 'stride' | 'direction_change' | 'spacing';
  message: string;
  setId?: string;
  setName?: string;
  performerIds: string[];
  performerNames: string[];
  positions?: FormationPosition[];
  stepSize?: number;
  distance?: number;
  angle?: number;
}

export interface StepSizeInfo {
  performerId: string;
  performerName: string;
  fromSetId: string;
  fromSetName: string;
  toSetId: string;
  toSetName: string;
  distanceNormalized: number;
  distanceYards: number;
  counts: number;
  stepSize: number; // N-to-5 notation
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  stepSizes: StepSizeInfo[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    collisionCount: number;
    spacingViolations: number;
    strideIssues: number;
    directionChangeIssues: number;
    worstStride: { performerName: string; stepSize: number; setName: string } | null;
    performersWithIssues: number;
  };
  analyzedAt: number;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizedToYards(dx: number, dy: number): { dxYd: number; dyYd: number; distYd: number } {
  const dxYd = (dx / 100) * FIELD.WIDTH_YARDS;
  const dyYd = (dy / 100) * FIELD.HEIGHT_YARDS;
  const distYd = Math.sqrt(dxYd * dxYd + dyYd * dyYd);
  return { dxYd, dyYd, distYd };
}

function dist(a: FormationPosition, b: FormationPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Build a name lookup from performers list */
function nameMap(performers: FormationPerformer[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of performers) {
    m.set(p.id, p.name);
  }
  return m;
}

// ============================================================================
// Collision Detection
// ============================================================================

function detectCollisions(
  keyframes: FormationKeyframe[],
  sets: FormationDrillSet[],
  names: Map<string, string>,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const minDist = FIELD.MIN_PERFORMER_DISTANCE;

  for (const set of sets) {
    const kf = keyframes.find((k) => k.id === set.keyframeId);
    if (!kf) continue;

    const performerIds = Object.keys(kf.positions);
    for (let i = 0; i < performerIds.length; i++) {
      for (let j = i + 1; j < performerIds.length; j++) {
        const posA = kf.positions[performerIds[i]];
        const posB = kf.positions[performerIds[j]];
        if (!posA || !posB) continue;

        const d = dist(posA, posB);
        if (d < minDist) {
          const nameA = names.get(performerIds[i]) ?? performerIds[i];
          const nameB = names.get(performerIds[j]) ?? performerIds[j];
          issues.push({
            id: `collision-${set.id}-${performerIds[i]}-${performerIds[j]}`,
            severity: d < minDist * 0.5 ? 'error' : 'warning',
            type: 'collision',
            message: `${nameA} and ${nameB} are too close (${d.toFixed(1)} units) at ${set.name}`,
            setId: set.id,
            setName: set.name,
            performerIds: [performerIds[i], performerIds[j]],
            performerNames: [nameA, nameB],
            positions: [posA, posB],
            distance: d,
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// Spacing Violations
// ============================================================================

function detectSpacingViolations(
  keyframes: FormationKeyframe[],
  sets: FormationDrillSet[],
  names: Map<string, string>,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const minDist = FIELD.MIN_PERFORMER_DISTANCE;

  // Check during transitions by interpolating positions
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const nextSet = sortedSets[si + 1];
    const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
    const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);
    if (!currentKf || !nextKf) continue;

    const counts = currentSet.counts;
    // Sample at every count
    for (let c = 1; c < counts; c++) {
      const t = c / counts;
      const interpolated: Record<string, FormationPosition> = {};

      for (const pid of Object.keys(currentKf.positions)) {
        const from = currentKf.positions[pid];
        const to = nextKf.positions[pid];
        if (from && to) {
          interpolated[pid] = {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          };
        }
      }

      const pids = Object.keys(interpolated);
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) {
          const d = dist(interpolated[pids[i]], interpolated[pids[j]]);
          if (d < minDist) {
            const existingId = `spacing-${currentSet.id}-${pids[i]}-${pids[j]}`;
            if (!issues.some((iss) => iss.id === existingId)) {
              const nameA = names.get(pids[i]) ?? pids[i];
              const nameB = names.get(pids[j]) ?? pids[j];
              issues.push({
                id: existingId,
                severity: 'warning',
                type: 'spacing',
                message: `${nameA} and ${nameB} cross paths between ${currentSet.name} and ${nextSet.name} (count ${c})`,
                setId: currentSet.id,
                setName: currentSet.name,
                performerIds: [pids[i], pids[j]],
                performerNames: [nameA, nameB],
                distance: d,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// Step Size Analysis
// ============================================================================

function analyzeStepSizes(
  keyframes: FormationKeyframe[],
  sets: FormationDrillSet[],
  names: Map<string, string>,
): { issues: AnalysisIssue[]; stepSizes: StepSizeInfo[] } {
  const issues: AnalysisIssue[] = [];
  const stepSizes: StepSizeInfo[] = [];
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const nextSet = sortedSets[si + 1];
    const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
    const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);
    if (!currentKf || !nextKf) continue;

    for (const pid of Object.keys(currentKf.positions)) {
      const from = currentKf.positions[pid];
      const to = nextKf.positions[pid];
      if (!from || !to) continue;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const { distYd } = normalizedToYards(dx, dy);
      const distNorm = Math.sqrt(dx * dx + dy * dy);

      if (distYd < 0.1) continue; // Stationary

      // Step size in N-to-5 notation: counts * 5 / yards
      const stepSize = (currentSet.counts * 5) / distYd;
      const performerName = names.get(pid) ?? pid;

      stepSizes.push({
        performerId: pid,
        performerName,
        fromSetId: currentSet.id,
        fromSetName: currentSet.name,
        toSetId: nextSet.id,
        toSetName: nextSet.name,
        distanceNormalized: distNorm,
        distanceYards: distYd,
        counts: currentSet.counts,
        stepSize,
      });

      // Flag issues: <4 = error, <6 = warning
      if (stepSize < 4) {
        issues.push({
          id: `stride-${currentSet.id}-${pid}`,
          severity: 'error',
          type: 'stride',
          message: `${performerName}: ${stepSize.toFixed(1)}-to-5 steps from ${currentSet.name} to ${nextSet.name} (${distYd.toFixed(1)} yards in ${currentSet.counts} counts)`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [pid],
          performerNames: [performerName],
          positions: [from, to],
          stepSize,
        });
      } else if (stepSize < 6) {
        issues.push({
          id: `stride-${currentSet.id}-${pid}`,
          severity: 'warning',
          type: 'stride',
          message: `${performerName}: ${stepSize.toFixed(1)}-to-5 steps from ${currentSet.name} to ${nextSet.name}`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [pid],
          performerNames: [performerName],
          positions: [from, to],
          stepSize,
        });
      }
    }
  }

  return { issues, stepSizes };
}

// ============================================================================
// Direction Change Detection
// ============================================================================

function analyzeDirectionChanges(
  keyframes: FormationKeyframe[],
  sets: FormationDrillSet[],
  names: Map<string, string>,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const maxAngle = 135;

  if (sortedSets.length < 3) return [];

  // Collect all performer IDs across keyframes
  const allPerformerIds = new Set<string>();
  for (const kf of keyframes) {
    for (const pid of Object.keys(kf.positions)) {
      allPerformerIds.add(pid);
    }
  }

  for (const pid of allPerformerIds) {
    for (let si = 0; si < sortedSets.length - 2; si++) {
      const setA = sortedSets[si];
      const setB = sortedSets[si + 1];
      const setC = sortedSets[si + 2];

      const kfA = keyframes.find((k) => k.id === setA.keyframeId);
      const kfB = keyframes.find((k) => k.id === setB.keyframeId);
      const kfC = keyframes.find((k) => k.id === setC.keyframeId);
      if (!kfA || !kfB || !kfC) continue;

      const posA = kfA.positions[pid];
      const posB = kfB.positions[pid];
      const posC = kfC.positions[pid];
      if (!posA || !posB || !posC) continue;

      const distAB = dist(posA, posB);
      const distBC = dist(posB, posC);
      if (distAB < 0.5 || distBC < 0.5) continue;

      const dirAB = Math.atan2(posB.y - posA.y, posB.x - posA.x);
      const dirBC = Math.atan2(posC.y - posB.y, posC.x - posB.x);

      let angleDiff = Math.abs(dirBC - dirAB) * (180 / Math.PI);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      if (angleDiff > maxAngle) {
        const performerName = names.get(pid) ?? pid;
        issues.push({
          id: `direction-${setB.id}-${pid}`,
          severity: angleDiff > 160 ? 'error' : 'warning',
          type: 'direction_change',
          message: `${performerName}: ${Math.round(angleDiff)}deg direction change at ${setB.name}`,
          setId: setB.id,
          setName: setB.name,
          performerIds: [pid],
          performerNames: [performerName],
          positions: [posA, posB, posC],
          angle: angleDiff,
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// Full Analysis
// ============================================================================

/**
 * Run all formation analyses and return combined results.
 */
export function analyzeFormation(state: FormationState): AnalysisResult {
  const names = nameMap(state.performers);
  const { keyframes, sets } = state;

  const collisions = detectCollisions(keyframes, sets, names);
  const spacing = detectSpacingViolations(keyframes, sets, names);
  const { issues: strideIssues, stepSizes } = analyzeStepSizes(keyframes, sets, names);
  const directionChanges = analyzeDirectionChanges(keyframes, sets, names);

  const allIssues = [...collisions, ...spacing, ...strideIssues, ...directionChanges];

  let worstStride: AnalysisResult['summary']['worstStride'] = null;
  for (const issue of strideIssues) {
    if (issue.stepSize !== undefined) {
      if (!worstStride || issue.stepSize < worstStride.stepSize) {
        worstStride = {
          performerName: issue.performerNames[0],
          stepSize: issue.stepSize,
          setName: issue.setName ?? '',
        };
      }
    }
  }

  const performersWithIssues = new Set(allIssues.flatMap((i) => i.performerIds)).size;

  return {
    issues: allIssues,
    stepSizes,
    summary: {
      totalIssues: allIssues.length,
      errors: allIssues.filter((i) => i.severity === 'error').length,
      warnings: allIssues.filter((i) => i.severity === 'warning').length,
      info: allIssues.filter((i) => i.severity === 'info').length,
      collisionCount: collisions.length,
      spacingViolations: spacing.length,
      strideIssues: strideIssues.length,
      directionChangeIssues: directionChanges.length,
      worstStride,
      performersWithIssues,
    },
    analyzedAt: Date.now(),
  };
}
