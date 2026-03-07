/**
 * useFormationTempoMap - Central resolution hook for formation tempo maps
 *
 * Picks the right TempoMap for a formation:
 * 1. If MetMap song is linked and useConstantTempo is false, use the song's tempo map
 * 2. Otherwise, build a constant-BPM tempo map from drillSettings
 *
 * Consumed by every component needing count/time conversion.
 */

import { useMemo } from 'react';
import type { Formation } from '../services/formationTypes';
import type { Section } from '../contexts/metmap/types';
import type { TempoMap } from '../services/tempoMap';
import { buildTempoMapFromSections, buildConstantTempoMap } from '../services/tempoMap';
import { getTotalCounts } from '../services/drillSetService';

export function useFormationTempoMap(
  formation: Formation | null,
  linkedSongSections?: Section[],
): TempoMap {
  return useMemo(() => {
    if (!formation) {
      return buildConstantTempoMap(120, 0);
    }

    // If linked to MetMap song and not overriding with constant tempo
    if (
      formation.metmapSongId &&
      !formation.useConstantTempo &&
      linkedSongSections &&
      linkedSongSections.length > 0
    ) {
      return buildTempoMapFromSections(linkedSongSections);
    }

    // If formation already has a precomputed tempo map
    if (
      formation.tempoMap &&
      !formation.useConstantTempo &&
      formation.tempoMap.segments.length > 0
    ) {
      return formation.tempoMap;
    }

    // Fallback: constant BPM from drill settings
    const bpm = formation.drillSettings?.bpm ?? 120;
    const countsPerPhrase = formation.drillSettings?.countsPerPhrase ?? 8;
    const totalCounts = formation.sets ? getTotalCounts(formation.sets) : 0;

    return buildConstantTempoMap(bpm, Math.max(totalCounts, countsPerPhrase), countsPerPhrase);
  }, [
    formation?.metmapSongId,
    formation?.useConstantTempo,
    formation?.tempoMap,
    formation?.drillSettings?.bpm,
    formation?.drillSettings?.countsPerPhrase,
    formation?.sets,
    linkedSongSections,
  ]);
}
