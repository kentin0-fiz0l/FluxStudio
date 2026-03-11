/**
 * Show Critic Service - FluxStudio
 *
 * AI-powered full-show analysis that evaluates design quality,
 * visual impact, and pacing across all sets and transitions.
 */

import type { Formation } from './formationTypes';
import { rateFormation, type DifficultyScore } from './difficultyRating';
import { fullDrillAnalysis, type AnalysisResult } from './drillAnalysis';

// ============================================================================
// TYPES
// ============================================================================

export interface ShowCritique {
  overallScore: number; // 1-10
  strengths: string[];
  improvements: string[];
  perSetNotes: Array<{
    setIndex: number;
    setName: string;
    note: string;
    score: number;
  }>;
  summary: string;
}

// ============================================================================
// MAIN CRITIQUE FUNCTION
// ============================================================================

export async function critiqueShow(
  formation: Formation,
  _options?: { apiKey?: string },
): Promise<ShowCritique> {
  const sets = formation.sets ?? [];

  // Gather analysis data
  const analysis: AnalysisResult = fullDrillAnalysis(formation, sets);
  const difficultyScores: DifficultyScore[] = [];

  // Rate each transition
  for (let i = 0; i < formation.keyframes.length - 1; i++) {
    const score = rateFormation(analysis, formation, sets);
    difficultyScores.push(score);
  }

  // Build show summary for the critic
  const performerCount = formation.performers.length;
  const setCount = formation.keyframes.length;
  const avgDifficulty =
    difficultyScores.length > 0
      ? difficultyScores.reduce((sum, d) => sum + d.overall, 0) / difficultyScores.length
      : 5;
  const issueCount = analysis.issues.length;

  // Generate critique based on analysis data (local evaluation, no API call needed)
  const strengths: string[] = [];
  const improvements: string[] = [];
  const perSetNotes: Array<{ setIndex: number; setName: string; note: string; score: number }> = [];

  // Evaluate strengths
  if (performerCount >= 20) strengths.push('Large ensemble creates strong visual impact');
  if (avgDifficulty <= 4) strengths.push('Accessible difficulty level suitable for most skill levels');
  if (avgDifficulty >= 6 && avgDifficulty <= 8)
    strengths.push('Good balance of challenge and achievability');
  if (issueCount === 0) strengths.push('Clean transitions with no detected issues');
  if (setCount >= 5) strengths.push('Good variety of formations provides visual interest');

  // Evaluate improvements
  if (avgDifficulty > 8)
    improvements.push('Consider reducing difficulty in some transitions to improve accuracy');
  if (issueCount > 5)
    improvements.push(
      `${issueCount} drill issues detected — review collision zones and stride lengths`,
    );
  if (setCount < 3) improvements.push('Adding more sets would increase visual variety');
  if (performerCount < 8) improvements.push('More performers would create fuller formations');

  // Per-set notes
  for (let i = 0; i < formation.keyframes.length; i++) {
    const setName = sets[i]?.name ?? `Set ${i + 1}`;
    const score = difficultyScores[i]?.overall ?? 5;
    let note = '';
    if (score <= 3) note = 'Simple transition, good for pacing recovery';
    else if (score <= 6) note = 'Moderate complexity, well-balanced';
    else if (score <= 8) note = 'Challenging transition, ensure adequate rehearsal time';
    else note = 'Very demanding — consider simplifying or adding intermediate sets';

    perSetNotes.push({ setIndex: i, setName, note, score });
  }

  // Overall score
  const overallScore = Math.round(
    Math.max(
      1,
      Math.min(
        10,
        7 -
          issueCount * 0.3 +
          (setCount >= 4 ? 1 : 0) +
          (performerCount >= 10 ? 1 : 0) -
          (avgDifficulty > 8 ? 1 : 0),
      ),
    ),
  );

  const summary = `Show features ${performerCount} performers across ${setCount} sets with an average difficulty of ${avgDifficulty.toFixed(1)}/10. ${strengths.length > 0 ? strengths[0] + '.' : ''} ${improvements.length > 0 ? 'Key area for improvement: ' + improvements[0].toLowerCase() + '.' : 'No major issues detected.'}`;

  return {
    overallScore,
    strengths: strengths.length > 0 ? strengths : ['Show has a solid foundation'],
    improvements: improvements.length > 0 ? improvements : ['No major improvements needed'],
    perSetNotes,
    summary,
  };
}
