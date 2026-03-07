/**
 * Drill Analysis Engine - FluxStudio
 *
 * Provides collision detection, stride analysis, and direction change analysis
 * for drill safety and quality review (Virtual Clinic equivalent).
 */

import type { Position, Formation, DrillSet, StepInfo, FieldConfig } from './formationTypes';
import type { TempoMap } from './tempoMap';
import { countToTimeMs, getTempoAtCount, getSegmentAtCount } from './tempoMap';

// ============================================================================
// TYPES
// ============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface DrillIssue {
  id: string;
  severity: IssueSeverity;
  type: 'collision' | 'stride' | 'direction_change' | 'tempo_aware_stride' | 'music_alignment' | 'tempo_change_transition';
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
    musicalFlowScore?: number;
    tempoAwareStrideIssues?: number;
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
// TEMPO-AWARE STRIDE ANALYSIS
// ============================================================================

/**
 * Tempo-aware stride analysis. Uses variable tempo to compute actual
 * travel time per transition, checking yards/second against physical limits.
 */
export function analyzeTempoAwareStrides(
  formation: Formation,
  sets: DrillSet[],
  tempoMap: TempoMap,
  fieldConfig: FieldConfig,
  config?: AnalysisConfig,
): DrillIssue[] {
  const issues: DrillIssue[] = [];
  const { keyframes, performers } = formation;
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  // Track cumulative counts to map sets to absolute count positions
  let cumulativeCount = 1;
  const setStartCounts: Map<string, number> = new Map();
  for (const set of sortedSets) {
    setStartCounts.set(set.id, cumulativeCount);
    cumulativeCount += set.counts;
  }

  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const nextSet = sortedSets[si + 1];
    const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
    const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);
    if (!currentKf || !nextKf) continue;

    // Calculate actual time for this transition using the tempo map
    const startCount = setStartCounts.get(currentSet.id) ?? 1;
    const endCount = startCount + currentSet.counts;
    const startTimeMs = countToTimeMs(startCount, tempoMap);
    const endTimeMs = countToTimeMs(endCount, tempoMap);
    const transitionTimeMs = endTimeMs - startTimeMs;

    if (transitionTimeMs <= 0) continue;

    const transitionTimeSec = transitionTimeMs / 1000;

    for (const performer of performers) {
      const fromPos = currentKf.positions.get(performer.id);
      const toPos = nextKf.positions.get(performer.id);
      if (!fromPos || !toPos) continue;

      // Calculate distance in yards using field config dimensions
      const dx = ((toPos.x - fromPos.x) / 100) * fieldConfig.width;
      const dy = ((toPos.y - fromPos.y) / 100) * fieldConfig.height;
      const distYards = Math.sqrt(dx * dx + dy * dy);

      if (distYards < 0.1) continue; // Stationary

      const yardsPerSecond = distYards / transitionTimeSec;

      if (yardsPerSecond > 5) {
        issues.push({
          id: `tempo-stride-${currentSet.id}-${performer.id}`,
          severity: 'error',
          type: 'tempo_aware_stride',
          message: `${performer.name}: ${yardsPerSecond.toFixed(1)} yards/sec from ${currentSet.name} to ${nextSet.name} exceeds physical limit (${distYards.toFixed(1)} yards in ${transitionTimeSec.toFixed(2)}s)`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [performer.id],
          performerNames: [performer.name],
          positions: [fromPos, toPos],
        });
      } else if (yardsPerSecond > 3.5) {
        issues.push({
          id: `tempo-stride-${currentSet.id}-${performer.id}`,
          severity: 'warning',
          type: 'tempo_aware_stride',
          message: `${performer.name}: ${yardsPerSecond.toFixed(1)} yards/sec from ${currentSet.name} to ${nextSet.name} is a fast transition (${distYards.toFixed(1)} yards in ${transitionTimeSec.toFixed(2)}s)`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [performer.id],
          performerNames: [performer.name],
          positions: [fromPos, toPos],
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// MUSIC ALIGNMENT ANALYSIS
// ============================================================================

/**
 * Scores how well set boundaries align with phrase/section boundaries.
 */
export function analyzeMusicAlignment(
  sets: DrillSet[],
  tempoMap: TempoMap,
): DrillIssue[] {
  const issues: DrillIssue[] = [];
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sortedSets.length === 0 || tempoMap.segments.length === 0) return [];

  let cumulativeCount = 1;
  let alignedCount = 0;

  for (const set of sortedSets) {
    const startCount = cumulativeCount;
    const segment = getSegmentAtCount(startCount, tempoMap);

    if (segment) {
      // Check if this count falls on a section boundary
      const isSectionBoundary = startCount === segment.startCount;

      // Check if this count falls on a phrase boundary (start of a bar)
      const offsetInSegment = startCount - segment.startCount;
      const isPhraseBoundary = offsetInSegment % segment.beatsPerBar === 0;

      if (isSectionBoundary || isPhraseBoundary) {
        alignedCount++;
      } else {
        const beatInBar = (offsetInSegment % segment.beatsPerBar) + 1;
        issues.push({
          id: `music-align-${set.id}`,
          severity: isSectionBoundary ? 'info' : 'warning',
          type: 'music_alignment',
          message: `${set.name} starts mid-phrase (beat ${beatInBar} of ${segment.beatsPerBar}${segment.sectionName ? ` in "${segment.sectionName}"` : ''})`,
          setId: set.id,
          setName: set.name,
          performerIds: [],
          performerNames: [],
        });
      }
    }

    cumulativeCount += set.counts;
  }

  // Calculate overall alignment score
  const alignmentScore = sortedSets.length > 0
    ? Math.round((alignedCount / sortedSets.length) * 100)
    : 100;

  // Add an info issue with the overall alignment score
  if (sortedSets.length > 0) {
    issues.push({
      id: 'music-align-score',
      severity: alignmentScore >= 80 ? 'info' : alignmentScore >= 50 ? 'warning' : 'error',
      type: 'music_alignment',
      message: `Musical alignment score: ${alignmentScore}% (${alignedCount}/${sortedSets.length} sets aligned to phrase boundaries)`,
      performerIds: [],
      performerNames: [],
    });
  }

  return issues;
}

// ============================================================================
// TEMPO CHANGE TRANSITION DETECTION
// ============================================================================

/**
 * Flags transitions that span tempo changes.
 */
export function detectTempoChangeTransitions(
  sets: DrillSet[],
  tempoMap: TempoMap,
): DrillIssue[] {
  const issues: DrillIssue[] = [];
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sortedSets.length < 2 || tempoMap.segments.length < 2) return [];

  let cumulativeCount = 1;

  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const startCount = cumulativeCount;
    const endCount = startCount + currentSet.counts;

    // Find segments at start and end of this transition
    const startSegment = getSegmentAtCount(startCount, tempoMap);
    const endSegment = getSegmentAtCount(endCount, tempoMap);

    if (startSegment && endSegment && startSegment !== endSegment) {
      // This transition crosses a segment boundary
      const tempoAtStart = getTempoAtCount(startCount, tempoMap);
      const tempoAtEnd = getTempoAtCount(endCount, tempoMap);
      const tempoDiff = Math.abs(tempoAtEnd - tempoAtStart);

      if (tempoDiff > 10) {
        const nextSet = sortedSets[si + 1];
        issues.push({
          id: `tempo-change-${currentSet.id}`,
          severity: 'warning',
          type: 'tempo_change_transition',
          message: `Transition from ${currentSet.name} to ${nextSet.name} spans a tempo change (${Math.round(tempoAtStart)} to ${Math.round(tempoAtEnd)} BPM, ${Math.round(tempoDiff)} BPM difference)`,
          setId: currentSet.id,
          setName: currentSet.name,
          performerIds: [],
          performerNames: [],
        });
      }
    }

    cumulativeCount += currentSet.counts;
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
  tempoMap?: TempoMap,
): AnalysisResult {
  const collisions = detectCollisions(formation, sets, config.collision);
  const strides = analyzeStrides(formation, sets, undefined, undefined, config.stride);
  const directions = analyzeDirectionChanges(formation, sets, config.direction);

  const allIssues = [...collisions, ...strides, ...directions];

  // Run tempo-aware analyses when tempoMap is provided
  let musicalFlowScore: number | undefined;
  let tempoAwareStrideIssues: number | undefined;

  if (tempoMap) {
    const fieldConfig = formation.fieldConfig ?? {
      type: 'ncaa_football' as const,
      name: 'NCAA Football Field',
      width: 120,
      height: 53.33,
      yardLineInterval: 5,
      hashMarks: { front: 20, back: 33.33 },
      endZoneDepth: 10,
      unit: 'yards' as const,
    };

    const tempoStrides = analyzeTempoAwareStrides(formation, sets, tempoMap, fieldConfig, config);
    const musicAlignment = analyzeMusicAlignment(sets, tempoMap);
    const tempoTransitions = detectTempoChangeTransitions(sets, tempoMap);

    allIssues.push(...tempoStrides, ...musicAlignment, ...tempoTransitions);
    tempoAwareStrideIssues = tempoStrides.length;

    // Extract musicalFlowScore from the alignment score issue
    const scoreIssue = musicAlignment.find((i) => i.id === 'music-align-score');
    if (scoreIssue) {
      const scoreMatch = scoreIssue.message.match(/alignment score: (\d+)%/);
      musicalFlowScore = scoreMatch ? parseInt(scoreMatch[1], 10) : undefined;
    }
  }

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
      musicalFlowScore,
      tempoAwareStrideIssues,
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
