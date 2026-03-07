/**
 * MusicDrillMapper - Music structure analysis for drill set placement
 *
 * Phase 5: Auto-Set Generation from Music
 *
 * Analyzes MetMap sections and tempo map data to suggest optimal
 * drill set boundaries based on musical structure, phrase lengths,
 * and tempo changes.
 */

import type { Section } from '../contexts/metmap/types';
import type { TempoMap } from './tempoMap';
import { getTempoAtCount, getSegmentAtCount } from './tempoMap';

// ============================================================================
// TYPES
// ============================================================================

export interface SetSuggestion {
  startCount: number;
  endCount: number;
  counts: number;
  sectionId?: string;
  sectionName?: string;
  reason: string;
  confidence: number; // 0-1
}

export interface SuggestOptions {
  minCounts?: number;          // minimum counts per set (default 8)
  maxCounts?: number;          // maximum counts per set (default 64)
  preferPhraseLength?: number; // default 8
  splitOnTempoChange?: boolean; // default true
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_MIN_COUNTS = 8;
const DEFAULT_MAX_COUNTS = 64;
const DEFAULT_PHRASE_LENGTH = 8;
const TEMPO_CHANGE_THRESHOLD_BPM = 5;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Suggest drill set placements based on musical structure.
 *
 * Logic:
 * 1. Section boundaries are STRONG set candidates (confidence 0.9)
 * 2. Within long sections, subdivide at phrase boundaries (every
 *    preferPhraseLength counts) with confidence 0.7
 * 3. If splitOnTempoChange is true, tempo changes > 5 BPM difference
 *    suggest set splits with confidence 0.85
 * 4. No suggestion has fewer than minCounts or more than maxCounts
 * 5. Results sorted by startCount
 */
export function suggestSetsFromMusic(
  sections: Section[],
  tempoMap: TempoMap,
  options?: SuggestOptions,
): SetSuggestion[] {
  const minCounts = options?.minCounts ?? DEFAULT_MIN_COUNTS;
  const maxCounts = options?.maxCounts ?? DEFAULT_MAX_COUNTS;
  const phraseLength = options?.preferPhraseLength ?? DEFAULT_PHRASE_LENGTH;
  const splitOnTempo = options?.splitOnTempoChange ?? true;

  if (sections.length === 0 || tempoMap.segments.length === 0) {
    return [];
  }

  // Step 1: Build raw split points from section boundaries
  const rawSuggestions: SetSuggestion[] = [];

  for (const segment of tempoMap.segments) {
    const sectionCounts = segment.endCount - segment.startCount + 1;

    if (sectionCounts <= 0) continue;

    // Each section boundary is a strong candidate
    if (sectionCounts <= maxCounts && sectionCounts >= minCounts) {
      // Section fits within constraints — one set per section
      rawSuggestions.push({
        startCount: segment.startCount,
        endCount: segment.endCount,
        counts: sectionCounts,
        sectionId: segment.sectionId,
        sectionName: segment.sectionName,
        reason: `Section boundary: ${segment.sectionName || 'unnamed'}`,
        confidence: 0.9,
      });
    } else if (sectionCounts > maxCounts) {
      // Section is too long — subdivide at phrase boundaries
      const subdivisions = subdivideLongSection(
        segment.startCount,
        segment.endCount,
        sectionCounts,
        phraseLength,
        minCounts,
        maxCounts,
        segment.sectionId,
        segment.sectionName,
      );
      rawSuggestions.push(...subdivisions);
    } else if (sectionCounts < minCounts) {
      // Section is too short — still include it but it may be merged later
      rawSuggestions.push({
        startCount: segment.startCount,
        endCount: segment.endCount,
        counts: sectionCounts,
        sectionId: segment.sectionId,
        sectionName: segment.sectionName,
        reason: `Short section: ${segment.sectionName || 'unnamed'}`,
        confidence: 0.9,
      });
    }
  }

  // Step 2: Merge short sections that are below minCounts
  const merged = mergeShortSuggestions(rawSuggestions, minCounts, maxCounts);

  // Step 3: Split on tempo changes within existing suggestions
  let finalSuggestions: SetSuggestion[];
  if (splitOnTempo) {
    finalSuggestions = splitOnTempoChanges(merged, tempoMap, minCounts, maxCounts);
  } else {
    finalSuggestions = merged;
  }

  // Step 4: Sort by startCount
  finalSuggestions.sort((a, b) => a.startCount - b.startCount);

  return finalSuggestions;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Subdivide a long section into phrase-length chunks.
 */
function subdivideLongSection(
  startCount: number,
  endCount: number,
  totalCounts: number,
  phraseLength: number,
  minCounts: number,
  maxCounts: number,
  sectionId?: string,
  sectionName?: string,
): SetSuggestion[] {
  const suggestions: SetSuggestion[] = [];
  let current = startCount;

  while (current <= endCount) {
    const remaining = endCount - current + 1;

    if (remaining <= 0) break;

    // Determine chunk size
    let chunkSize: number;
    if (remaining <= maxCounts && remaining >= minCounts) {
      // Remaining fits as a single set
      chunkSize = remaining;
    } else if (remaining < minCounts) {
      // Remaining is too short — take it all (will be merged later)
      chunkSize = remaining;
    } else {
      // Use phrase length, but ensure the remainder is also valid
      chunkSize = phraseLength;
      const afterChunk = remaining - chunkSize;
      if (afterChunk > 0 && afterChunk < minCounts) {
        // Splitting at phraseLength would leave a too-short remainder.
        // Instead, split evenly.
        const numChunks = Math.ceil(remaining / phraseLength);
        chunkSize = Math.ceil(remaining / numChunks);
      }
    }

    const chunkEnd = Math.min(current + chunkSize - 1, endCount);
    const actualCounts = chunkEnd - current + 1;
    const isFirstChunk = current === startCount;

    suggestions.push({
      startCount: current,
      endCount: chunkEnd,
      counts: actualCounts,
      sectionId,
      sectionName,
      reason: isFirstChunk
        ? `Section start: ${sectionName || 'unnamed'}`
        : `Phrase boundary within ${sectionName || 'unnamed'}`,
      confidence: isFirstChunk ? 0.9 : 0.7,
    });

    current = chunkEnd + 1;
  }

  return suggestions;
}

/**
 * Merge adjacent suggestions that are below minCounts threshold.
 */
function mergeShortSuggestions(
  suggestions: SetSuggestion[],
  minCounts: number,
  maxCounts: number,
): SetSuggestion[] {
  if (suggestions.length <= 1) return suggestions;

  const result: SetSuggestion[] = [];

  for (let i = 0; i < suggestions.length; i++) {
    const current = suggestions[i];

    if (current.counts >= minCounts) {
      result.push(current);
      continue;
    }

    // Try to merge with the next suggestion
    if (i + 1 < suggestions.length) {
      const next = suggestions[i + 1];
      const mergedCounts = current.counts + next.counts;

      if (mergedCounts <= maxCounts) {
        // Merge into next
        result.push({
          startCount: current.startCount,
          endCount: next.endCount,
          counts: mergedCounts,
          sectionId: current.sectionId,
          sectionName: current.sectionName
            ? `${current.sectionName} + ${next.sectionName || ''}`
            : next.sectionName,
          reason: `Merged short sections`,
          confidence: Math.min(current.confidence, next.confidence),
        });
        i++; // skip next since we merged it
        continue;
      }
    }

    // Try to merge with the previous result
    if (result.length > 0) {
      const prev = result[result.length - 1];
      const mergedCounts = prev.counts + current.counts;

      if (mergedCounts <= maxCounts) {
        result[result.length - 1] = {
          ...prev,
          endCount: current.endCount,
          counts: mergedCounts,
          reason: `Merged short sections`,
          confidence: Math.min(prev.confidence, current.confidence),
        };
        continue;
      }
    }

    // Cannot merge — keep as-is
    result.push(current);
  }

  return result;
}

/**
 * Split existing suggestions at points where the tempo changes
 * by more than the threshold (5 BPM).
 */
function splitOnTempoChanges(
  suggestions: SetSuggestion[],
  tempoMap: TempoMap,
  minCounts: number,
  maxCounts: number,
): SetSuggestion[] {
  const result: SetSuggestion[] = [];

  for (const suggestion of suggestions) {
    const splitPoints = findTempoChangePoints(
      suggestion.startCount,
      suggestion.endCount,
      tempoMap,
    );

    if (splitPoints.length === 0) {
      result.push(suggestion);
      continue;
    }

    // Build sub-suggestions from split points
    let current = suggestion.startCount;
    for (const splitCount of splitPoints) {
      const beforeCounts = splitCount - current;
      const afterCounts = suggestion.endCount - splitCount + 1;

      // Only split if both halves meet minCounts
      if (beforeCounts >= minCounts && afterCounts >= minCounts) {
        result.push({
          startCount: current,
          endCount: splitCount - 1,
          counts: beforeCounts,
          sectionId: suggestion.sectionId,
          sectionName: suggestion.sectionName,
          reason: `Tempo change at count ${splitCount}`,
          confidence: 0.85,
        });
        current = splitCount;
      }
    }

    // Add the remaining portion
    const remainingCounts = suggestion.endCount - current + 1;
    if (remainingCounts > 0) {
      result.push({
        startCount: current,
        endCount: suggestion.endCount,
        counts: remainingCounts,
        sectionId: suggestion.sectionId,
        sectionName: suggestion.sectionName,
        reason: current === suggestion.startCount
          ? suggestion.reason
          : `After tempo change`,
        confidence: current === suggestion.startCount
          ? suggestion.confidence
          : 0.85,
      });
    }
  }

  return result;
}

/**
 * Find count positions where the tempo changes by more than the threshold.
 * Returns sorted list of count positions where splits should occur.
 */
function findTempoChangePoints(
  startCount: number,
  endCount: number,
  tempoMap: TempoMap,
): number[] {
  const points: number[] = [];
  let prevTempo = getTempoAtCount(startCount, tempoMap);

  for (let count = startCount + 1; count <= endCount; count++) {
    const tempo = getTempoAtCount(count, tempoMap);
    const diff = Math.abs(tempo - prevTempo);

    if (diff > TEMPO_CHANGE_THRESHOLD_BPM) {
      // Check that this is a segment boundary (not a gradual ramp)
      const prevSeg = getSegmentAtCount(count - 1, tempoMap);
      const currSeg = getSegmentAtCount(count, tempoMap);

      if (prevSeg !== currSeg) {
        // Actual segment boundary with tempo change
        points.push(count);
      }
    }

    prevTempo = tempo;
  }

  return points;
}
