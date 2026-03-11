/**
 * Difficulty Rating Engine - FluxStudio
 *
 * Computes 1-10 difficulty scores per formation and per show,
 * based on stride issues, direction changes, collision density, and tempo alignment.
 */

import type { AnalysisResult } from './drillAnalysis';
import type { Formation, DrillSet } from './formationTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface DifficultyScore {
  /** Overall difficulty rating (1-10) */
  overall: number;
  /** Per-category breakdown (each 0-10) */
  breakdown: {
    stride: number;
    direction: number;
    collision: number;
    tempo: number;
  };
  /** Human-readable label */
  label: 'Easy' | 'Moderate' | 'Hard' | 'Expert';
}

export interface ShowDifficulty {
  /** Aggregate difficulty rating (1-10) */
  overall: number;
  /** Difficulty score per formation (difficulty curve) */
  curve: number[];
  /** Peak difficulty across all formations */
  peak: number;
  /** Human-readable label */
  label: 'Easy' | 'Moderate' | 'Hard' | 'Expert';
}

// ============================================================================
// WEIGHTS
// ============================================================================

const WEIGHT_STRIDE = 0.3;
const WEIGHT_DIRECTION = 0.25;
const WEIGHT_COLLISION = 0.25;
const WEIGHT_TEMPO = 0.2;

// ============================================================================
// HELPERS
// ============================================================================

function difficultyLabel(score: number): 'Easy' | 'Moderate' | 'Hard' | 'Expert' {
  if (score <= 3) return 'Easy';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Hard';
  return 'Expert';
}

/**
 * Normalize an issue count to a 0-10 scale based on a reference count.
 * Uses a logarithmic curve so a few issues quickly raise the score,
 * but many issues saturate toward 10.
 */
function normalizeScore(issueCount: number, referenceCount: number): number {
  if (referenceCount <= 0 || issueCount <= 0) return 0;
  const ratio = issueCount / referenceCount;
  // ln(1 + 3*ratio) / ln(4) maps ratio=1 to ~1.0, and grows sub-linearly
  const raw = (Math.log(1 + 3 * ratio) / Math.log(4)) * 10;
  return Math.min(10, Math.max(0, raw));
}

// ============================================================================
// RATE FORMATION
// ============================================================================

/**
 * Compute difficulty score for a single formation based on analysis results.
 */
export function rateFormation(
  analysisResult: AnalysisResult,
  formation: Formation,
  sets: DrillSet[],
): DifficultyScore {
  const performerCount = formation.performers.length;
  const setCount = sets.length;
  const referenceCount = Math.max(1, performerCount * Math.max(1, setCount - 1));

  // Count issues by type
  const strideIssues = analysisResult.issues.filter(
    (i) => i.type === 'stride' || i.type === 'tempo_aware_stride',
  ).length;
  const directionIssues = analysisResult.issues.filter(
    (i) => i.type === 'direction_change',
  ).length;
  const collisionIssues = analysisResult.issues.filter(
    (i) => i.type === 'collision',
  ).length;
  const tempoIssues = analysisResult.issues.filter(
    (i) => i.type === 'music_alignment' || i.type === 'tempo_change_transition',
  ).length;

  const stride = normalizeScore(strideIssues, referenceCount);
  const direction = normalizeScore(directionIssues, referenceCount);
  const collision = normalizeScore(collisionIssues, referenceCount);
  const tempo = normalizeScore(tempoIssues, Math.max(1, setCount));

  const overall = Math.round(
    Math.min(10, Math.max(1,
      stride * WEIGHT_STRIDE +
      direction * WEIGHT_DIRECTION +
      collision * WEIGHT_COLLISION +
      tempo * WEIGHT_TEMPO,
    )),
  );

  return {
    overall: overall === 0 ? 1 : overall,
    breakdown: {
      stride: Math.round(stride * 10) / 10,
      direction: Math.round(direction * 10) / 10,
      collision: Math.round(collision * 10) / 10,
      tempo: Math.round(tempo * 10) / 10,
    },
    label: difficultyLabel(overall),
  };
}

// ============================================================================
// RATE SHOW
// ============================================================================

/**
 * Aggregate difficulty scores across all formations into a show-level rating.
 */
export function rateShow(formationScores: DifficultyScore[]): ShowDifficulty {
  if (formationScores.length === 0) {
    return { overall: 1, curve: [], peak: 1, label: 'Easy' };
  }

  const curve = formationScores.map((s) => s.overall);
  const peak = Math.max(...curve);

  // Weighted average: 60% mean + 40% peak (hard sections disproportionately affect difficulty)
  const mean = curve.reduce((sum, v) => sum + v, 0) / curve.length;
  const overall = Math.round(Math.min(10, Math.max(1, mean * 0.6 + peak * 0.4)));

  return {
    overall,
    curve,
    peak,
    label: difficultyLabel(overall),
  };
}
