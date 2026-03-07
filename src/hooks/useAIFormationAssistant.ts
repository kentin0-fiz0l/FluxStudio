/**
 * useAIFormationAssistant - Connects AI chat to formation context
 *
 * Provides the AI with awareness of the current formation state:
 * - Selected set/keyframe
 * - Performer list with sections
 * - Current positions
 * - Music structure (if linked)
 *
 * Enables natural language drill commands like:
 * "Make trumpets wider in set 3"
 * "Rotate color guard 45 degrees"
 * "Create a company front on the 40"
 */

import { useCallback, useMemo } from 'react';
import type {
  Formation,
  Position,
  Performer,
  DrillSet,
} from '../services/formationTypes';
import {
  generateFormationFromDescription,
  type FormationFromDescriptionResult,
} from '../services/drillAiService';

export interface FormationAIContext {
  /** Current formation name and dimensions */
  formation: {
    name: string;
    stageWidth: number;
    stageHeight: number;
    performerCount: number;
  };
  /** Currently selected set/keyframe info */
  currentSet?: {
    name: string;
    counts: number;
    index: number;
  };
  /** Performer sections summary */
  sections: Array<{
    name: string;
    count: number;
    instruments: string[];
  }>;
  /** Selected performer IDs */
  selectedPerformerIds: string[];
  /** Music link info */
  musicLinked: boolean;
  musicBpm?: number;
}

interface UseAIFormationAssistantOptions {
  formation: Formation | null;
  performers: Performer[];
  currentPositions: Map<string, Position>;
  selectedKeyframeId: string;
  selectedPerformerIds: Set<string>;
  sets?: DrillSet[];
  onApplyPositions?: (positions: Map<string, Position>) => void;
}

/**
 * Build a context summary string for the AI about the current formation state.
 */
function buildFormationContextSummary(ctx: FormationAIContext): string {
  const parts: string[] = [];

  parts.push(`Formation "${ctx.formation.name}" with ${ctx.formation.performerCount} performers.`);
  parts.push(`Field: ${ctx.formation.stageWidth}x${ctx.formation.stageHeight}.`);

  if (ctx.currentSet) {
    parts.push(`Current set: "${ctx.currentSet.name}" (${ctx.currentSet.counts} counts, set ${ctx.currentSet.index + 1}).`);
  }

  if (ctx.sections.length > 0) {
    const sectionSummary = ctx.sections
      .map((s) => `${s.name} (${s.count})`)
      .join(', ');
    parts.push(`Sections: ${sectionSummary}.`);
  }

  if (ctx.selectedPerformerIds.length > 0) {
    parts.push(`${ctx.selectedPerformerIds.length} performer(s) selected.`);
  }

  if (ctx.musicLinked) {
    parts.push(`Music linked${ctx.musicBpm ? ` at ${ctx.musicBpm} BPM` : ''}.`);
  }

  return parts.join(' ');
}

export function useAIFormationAssistant(options: UseAIFormationAssistantOptions) {
  const {
    formation,
    performers,
    currentPositions,
    selectedKeyframeId,
    selectedPerformerIds,
    sets,
    onApplyPositions,
  } = options;

  // Build formation context for AI
  const formationContext = useMemo((): FormationAIContext | null => {
    if (!formation) return null;

    // Group performers by section
    const sectionMap = new Map<string, { count: number; instruments: Set<string> }>();
    for (const p of performers) {
      const section = p.section || 'Unassigned';
      const entry = sectionMap.get(section) || { count: 0, instruments: new Set<string>() };
      entry.count++;
      if (p.instrument) entry.instruments.add(p.instrument);
      sectionMap.set(section, entry);
    }

    const sections = Array.from(sectionMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      instruments: Array.from(data.instruments),
    }));

    // Find current set
    let currentSet: FormationAIContext['currentSet'];
    if (sets && selectedKeyframeId) {
      const setIndex = sets.findIndex((s) => s.keyframeId === selectedKeyframeId);
      if (setIndex >= 0) {
        currentSet = {
          name: sets[setIndex].name,
          counts: sets[setIndex].counts,
          index: setIndex,
        };
      }
    }

    return {
      formation: {
        name: formation.name,
        stageWidth: formation.stageWidth,
        stageHeight: formation.stageHeight,
        performerCount: performers.length,
      },
      currentSet,
      sections,
      selectedPerformerIds: Array.from(selectedPerformerIds),
      musicLinked: !!(formation.metmapSongId || formation.audioTrack),
      musicBpm: formation.drillSettings?.bpm,
    };
  }, [formation, performers, selectedKeyframeId, selectedPerformerIds, sets]);

  // Get context summary string for AI
  const getContextSummary = useCallback((): string => {
    if (!formationContext) return 'No formation loaded.';
    return buildFormationContextSummary(formationContext);
  }, [formationContext]);

  // Apply a text description to generate positions
  const applyDescription = useCallback(
    (description: string): FormationFromDescriptionResult | null => {
      if (!formation || performers.length === 0) return null;

      // Determine target performers (selected or all)
      const targetPerformers = selectedPerformerIds.size > 0
        ? performers.filter((p) => selectedPerformerIds.has(p.id))
        : performers;

      const result = generateFormationFromDescription({
        description,
        performers: targetPerformers,
      });

      // Apply the first set's positions
      if (result.sets.length > 0 && onApplyPositions) {
        const newPositions = new Map(currentPositions);
        for (const [id, pos] of result.sets[0].positions) {
          newPositions.set(id, pos);
        }
        onApplyPositions(newPositions);
      }

      return result;
    },
    [formation, performers, selectedPerformerIds, currentPositions, onApplyPositions],
  );

  return {
    /** Current formation context for AI */
    formationContext,
    /** Context summary string for AI prompts */
    getContextSummary,
    /** Apply a text description to generate/update positions */
    applyDescription,
    /** Whether formation context is available */
    isAvailable: !!formationContext,
  };
}
