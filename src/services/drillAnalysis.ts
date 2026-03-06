/**
 * Drill Analysis Engine - FluxStudio
 *
 * Provides collision detection, stride analysis, and direction change analysis
 * for drill safety and quality review (Virtual Clinic equivalent).
 */

import type { Position, Formation, DrillSet, StepInfo } from './formationTypes';

// ============================================================================
// TYPES
// ============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface DrillIssue {
  id: string;
  severity: IssueSeverity;
  type: 'collision' | 'stride' | 'direction_change';
  message: string;
  /** Set where the issue occurs */
  setId?: string;
  setName?: string;
  /** Performers involved */
  performerIds: string[];
  performerNames: string[];
  /** Position data for visualization */
  positions?: Position[];
  /** For stride issues: the step info */
  stepInfo?: StepInfo;
  /** Count within transition where issue occurs (for collision during movement) */
  atCount?: number;
}

export interface CollisionConfig {
  /** Minimum allowed distance between performers (in normalized 0-100 units). Default: 1.5 */
  minDistance: number;
  /** Sample interval during transitions (in counts). Default: 1 */
  sampleInterval: number;
}

export interface StrideConfig {
  /** Maximum comfortable step size (in 8-to-5 notation). Default: 4 (i.e., 4-to-5 = very large steps) */
  maxStepSize: number;
  /** Warning threshold step size. Default: 6 */
  warningStepSize: number;
}

export interface DirectionConfig {
  /** Maximum comfortable direction change angle in degrees. Default: 135 */
  maxAngle: number;
}

export interface AnalysisConfig {
  collision: CollisionConfig;
  stride: StrideConfig;
  direction: DirectionConfig;
}

export interface AnalysisResult {
  issues: DrillIssue[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    collisionCount: number;
    worstStride: { performerName: string; stepSize: number; setName: string } | null;
    performersWithIssues: number;
  };
  analyzedAt: number;
}

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  collision: {
    minDistance: 1.5,
    sampleInterval: 1,
  },
  stride: {
    maxStepSize: 4,
    warningStepSize: 6,
  },
  direction: {
    maxAngle: 135,
  },
};

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/**
 * Detect collisions between all performer pairs at all sets
 * and sampled transition points.
 */
export function detectCollisions(
  formation: Formation,
  sets: DrillSet[],
  config: CollisionConfig = DEFAULT_ANALYSIS_CONFIG.collision,
): DrillIssue[] {
  const issues: DrillIssue[] = [];
  const { keyframes, performers } = formation;
  const minDist = config.minDistance;

  if (performers.length < 2 || keyframes.length === 0) return [];

  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  // Check at each keyframe (set position)
  for (const set of sortedSets) {
    const kf = keyframes.find((k) => k.id === set.keyframeId);
    if (!kf) continue;

    // Check all pairs
    for (let i = 0; i < performers.length; i++) {
      for (let j = i + 1; j < performers.length; j++) {
        const posA = kf.positions.get(performers[i].id);
        const posB = kf.positions.get(performers[j].id);
        if (!posA || !posB) continue;

        const dist = Math.sqrt(
          (posA.x - posB.x) ** 2 + (posA.y - posB.y) ** 2,
        );

        if (dist < minDist) {
          issues.push({
            id: `collision-${set.id}-${performers[i].id}-${performers[j].id}`,
            severity: dist < minDist * 0.5 ? 'error' : 'warning',
            type: 'collision',
            message: `${performers[i].name} and ${performers[j].name} are too close (${dist.toFixed(1)} units) at ${set.name}`,
            setId: set.id,
            setName: set.name,
            performerIds: [performers[i].id, performers[j].id],
            performerNames: [performers[i].name, performers[j].name],
            positions: [posA, posB],
          });
        }
      }
    }
  }

  // Check during transitions (sample at count intervals)
  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const nextSet = sortedSets[si + 1];
    const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
    const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);
    if (!currentKf || !nextKf) continue;

    const counts = currentSet.counts;
    for (let c = 1; c < counts; c += config.sampleInterval) {
      const t = c / counts;

      // Interpolate all performer positions at this count
      const interpolated = new Map<string, Position>();
      for (const performer of performers) {
        const fromPos = currentKf.positions.get(performer.id);
        const toPos = nextKf.positions.get(performer.id);
        if (fromPos && toPos) {
          interpolated.set(performer.id, {
            x: fromPos.x + (toPos.x - fromPos.x) * t,
            y: fromPos.y + (toPos.y - fromPos.y) * t,
          });
        }
      }

      // Check pairs at this interpolated time
      for (let i = 0; i < performers.length; i++) {
        for (let j = i + 1; j < performers.length; j++) {
          const posA = interpolated.get(performers[i].id);
          const posB = interpolated.get(performers[j].id);
          if (!posA || !posB) continue;

          const dist = Math.sqrt(
            (posA.x - posB.x) ** 2 + (posA.y - posB.y) ** 2,
          );

          if (dist < minDist) {
            // Check if we already reported this pair for this transition
            const existingId = `collision-transition-${currentSet.id}-${performers[i].id}-${performers[j].id}`;
            if (!issues.some((iss) => iss.id === existingId)) {
              issues.push({
                id: existingId,
                severity: 'warning',
                type: 'collision',
                message: `${performers[i].name} and ${performers[j].name} cross paths between ${currentSet.name} and ${nextSet.name} (count ${c})`,
                setId: currentSet.id,
                setName: currentSet.name,
                performerIds: [performers[i].id, performers[j].id],
                performerNames: [performers[i].name, performers[j].name],
                positions: [posA, posB],
                atCount: c,
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
// STRIDE ANALYSIS
// ============================================================================

/**
 * Analyze step sizes between consecutive sets for all performers.
 * Flags transitions that exceed comfortable stride thresholds.
 */
export function analyzeStrides(
  formation: Formation,
  sets: DrillSet[],
  fieldWidth: number = 120,
  fieldHeight: number = 53.33,
  config: StrideConfig = DEFAULT_ANALYSIS_CONFIG.stride,
): DrillIssue[] {
  const issues: DrillIssue[] = [];
  const { keyframes, performers } = formation;
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const nextSet = sortedSets[si + 1];
    const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
    const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);
    if (!currentKf || !nextKf) continue;

    for (const performer of performers) {
      const fromPos = currentKf.positions.get(performer.id);
      const toPos = nextKf.positions.get(performer.id);
      if (!fromPos || !toPos) continue;

      // Calculate distance in yards
      const dx = ((toPos.x - fromPos.x) / 100) * fieldWidth;
      const dy = ((toPos.y - fromPos.y) / 100) * fieldHeight;
      const distYards = Math.sqrt(dx * dx + dy * dy);

      if (distYards < 0.1) continue; // Stationary, skip

      // Step size: counts * 5 / distance_in_yards
      const stepSize = (currentSet.counts * 5) / distYards;

      if (stepSize < config.maxStepSize) {
        issues.push({
          id: `stride-${currentSet.id}-${performer.id}`,
          severity: 'error',
          type: 'stride',
          message: `${performer.name}: ${stepSize.toFixed(1)}-to-5 steps from ${currentSet.name} to ${nextSet.name} (${distYards.toFixed(1)} yards in ${currentSet.counts} counts)`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [performer.id],
          performerNames: [performer.name],
          positions: [fromPos, toPos],
          stepInfo: {
            distance: Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2),
            distanceYards: distYards,
            stepSize,
            stepSizeLabel: `${stepSize.toFixed(1)} to 5`,
            direction: (Math.atan2(dy, dx) * 180) / Math.PI,
            directionLabel: getDirectionLabel((Math.atan2(dy, dx) * 180) / Math.PI),
            difficulty: 'hard',
            counts: currentSet.counts,
          },
        });
      } else if (stepSize < config.warningStepSize) {
        issues.push({
          id: `stride-${currentSet.id}-${performer.id}`,
          severity: 'warning',
          type: 'stride',
          message: `${performer.name}: ${stepSize.toFixed(1)}-to-5 steps from ${currentSet.name} to ${nextSet.name}`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [performer.id],
          performerNames: [performer.name],
          stepInfo: {
            distance: Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2),
            distanceYards: distYards,
            stepSize,
            stepSizeLabel: `${stepSize.toFixed(1)} to 5`,
            direction: (Math.atan2(dy, dx) * 180) / Math.PI,
            directionLabel: getDirectionLabel((Math.atan2(dy, dx) * 180) / Math.PI),
            difficulty: 'moderate',
            counts: currentSet.counts,
          },
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// DIRECTION CHANGE ANALYSIS
// ============================================================================

/**
 * Detect sudden direction reversals between consecutive transitions.
 */
export function analyzeDirectionChanges(
  formation: Formation,
  sets: DrillSet[],
  config: DirectionConfig = DEFAULT_ANALYSIS_CONFIG.direction,
): DrillIssue[] {
  const issues: DrillIssue[] = [];
  const { keyframes, performers } = formation;
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sortedSets.length < 3) return [];

  for (const performer of performers) {
    for (let si = 0; si < sortedSets.length - 2; si++) {
      const setA = sortedSets[si];
      const setB = sortedSets[si + 1];
      const setC = sortedSets[si + 2];

      const kfA = keyframes.find((k) => k.id === setA.keyframeId);
      const kfB = keyframes.find((k) => k.id === setB.keyframeId);
      const kfC = keyframes.find((k) => k.id === setC.keyframeId);
      if (!kfA || !kfB || !kfC) continue;

      const posA = kfA.positions.get(performer.id);
      const posB = kfB.positions.get(performer.id);
      const posC = kfC.positions.get(performer.id);
      if (!posA || !posB || !posC) continue;

      // Direction from A to B
      const dirAB = Math.atan2(posB.y - posA.y, posB.x - posA.x);
      // Direction from B to C
      const dirBC = Math.atan2(posC.y - posB.y, posC.x - posB.x);

      // Angle difference
      let angleDiff = Math.abs(dirBC - dirAB) * (180 / Math.PI);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      // Check if either segment is essentially stationary (< 0.5 units)
      const distAB = Math.sqrt((posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2);
      const distBC = Math.sqrt((posC.x - posB.x) ** 2 + (posC.y - posB.y) ** 2);
      if (distAB < 0.5 || distBC < 0.5) continue;

      if (angleDiff > config.maxAngle) {
        issues.push({
          id: `direction-${setB.id}-${performer.id}`,
          severity: angleDiff > 160 ? 'error' : 'warning',
          type: 'direction_change',
          message: `${performer.name}: ${Math.round(angleDiff)}° direction change at ${setB.name}`,
          setId: setB.id,
          setName: setB.name,
          performerIds: [performer.id],
          performerNames: [performer.name],
          positions: [posA, posB, posC],
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// FULL ANALYSIS
// ============================================================================

/**
 * Run all drill analyses and return combined results.
 */
export function fullDrillAnalysis(
  formation: Formation,
  sets: DrillSet[],
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
): AnalysisResult {
  const collisions = detectCollisions(formation, sets, config.collision);
  const strides = analyzeStrides(formation, sets, undefined, undefined, config.stride);
  const directions = analyzeDirectionChanges(formation, sets, config.direction);

  const allIssues = [...collisions, ...strides, ...directions];

  // Find worst stride
  let worstStride: AnalysisResult['summary']['worstStride'] = null;
  for (const issue of strides) {
    if (issue.stepInfo) {
      if (!worstStride || issue.stepInfo.stepSize < worstStride.stepSize) {
        worstStride = {
          performerName: issue.performerNames[0],
          stepSize: issue.stepInfo.stepSize,
          setName: issue.setName ?? '',
        };
      }
    }
  }

  // Count unique performers with issues
  const performersWithIssues = new Set(allIssues.flatMap((i) => i.performerIds)).size;

  return {
    issues: allIssues,
    summary: {
      totalIssues: allIssues.length,
      errors: allIssues.filter((i) => i.severity === 'error').length,
      warnings: allIssues.filter((i) => i.severity === 'warning').length,
      info: allIssues.filter((i) => i.severity === 'info').length,
      collisionCount: collisions.length,
      worstStride,
      performersWithIssues,
    },
    analyzedAt: Date.now(),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getDirectionLabel(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'to the right';
  if (normalized >= 22.5 && normalized < 67.5) return 'downfield-right';
  if (normalized >= 67.5 && normalized < 112.5) return 'downfield';
  if (normalized >= 112.5 && normalized < 157.5) return 'downfield-left';
  if (normalized >= 157.5 && normalized < 202.5) return 'to the left';
  if (normalized >= 202.5 && normalized < 247.5) return 'upfield-left';
  if (normalized >= 247.5 && normalized < 292.5) return 'upfield';
  return 'upfield-right';
}
