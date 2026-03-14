/**
 * Show Critic Service - FluxStudio
 *
 * Full-show analysis that evaluates design quality, visual impact,
 * and pacing across all sets and transitions. Includes both heuristic
 * analysis (free tier) and AI-powered critique via Claude API (Pro tier).
 */

import type { Formation } from './formationTypes';
import { rateFormation, type DifficultyScore } from './difficultyRating';
import { fullDrillAnalysis, type AnalysisResult } from './drillAnalysis';
import { apiService } from '@/services/apiService';

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

// ============================================================================
// AI-POWERED CRITIQUE (Pro tier)
// ============================================================================

/**
 * Generate an AI-powered critique using the Claude API.
 * Sends drill analysis data to the backend `/api/ai/critique` endpoint
 * and returns structured feedback.
 *
 * This is a Pro-tier feature; free users should use `critiqueShow()` instead.
 */
export async function generateAICritique(
  formation: Formation,
): Promise<ShowCritique> {
  const sets = formation.sets ?? [];

  // Gather analysis data
  const analysis: AnalysisResult = fullDrillAnalysis(formation, sets);
  const difficultyScores: DifficultyScore[] = [];

  for (let i = 0; i < formation.keyframes.length - 1; i++) {
    const score = rateFormation(analysis, formation, sets);
    difficultyScores.push(score);
  }

  const performerCount = formation.performers.length;
  const setCount = formation.keyframes.length;
  const avgDifficulty =
    difficultyScores.length > 0
      ? difficultyScores.reduce((sum, d) => sum + d.overall, 0) / difficultyScores.length
      : 5;

  // Build issue details (up to 20 for context without bloating the prompt)
  const issueDetails = analysis.issues.slice(0, 20).map((issue) => ({
    type: issue.type,
    severity: issue.severity,
    message: issue.message,
  }));

  const response = await apiService.post<{ data: ShowCritique }>(
    '/api/ai/critique',
    {
      analysisData: {
        totalIssues: analysis.summary.totalIssues,
        errors: analysis.summary.errors,
        warnings: analysis.summary.warnings,
        info: analysis.summary.info,
        collisionCount: analysis.summary.collisionCount,
        performersWithIssues: analysis.summary.performersWithIssues,
        worstStride: analysis.summary.worstStride,
        musicalFlowScore: analysis.summary.musicalFlowScore,
        tempoAwareStrideIssues: analysis.summary.tempoAwareStrideIssues,
      },
      formationData: {
        performerCount,
        setCount,
        avgDifficulty,
        issueDetails,
      },
    },
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || 'AI critique failed');
  }

  // The API wraps the result in { data: ... }
  const critique = (response.data as { data: ShowCritique }).data ?? response.data;

  return {
    overallScore: critique.overallScore,
    strengths: critique.strengths,
    improvements: critique.improvements,
    perSetNotes: critique.perSetNotes ?? [],
    summary: critique.summary,
  };
}
