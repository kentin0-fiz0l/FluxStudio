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

import { useState, useCallback, useMemo } from 'react';
import type {
  Formation,
  Position,
  Performer,
  DrillSet,
} from '../../services/formationTypes';
import {
  generateFormationFromDescription,
  type FormationFromDescriptionResult,
} from '../../services/drillAiService';
import { buildApiUrl } from '../../config/environment';

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

export type AIStatus = 'idle' | 'generating' | 'error';

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

  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [useClaudeForGeneration, setUseClaudeForGeneration] = useState(true);

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

  // Apply a text description to generate positions (with Claude API fallback)
  const applyDescription = useCallback(
    async (description: string): Promise<FormationFromDescriptionResult | null> => {
      if (!formation || performers.length === 0) return null;

      const targetPerformers = selectedPerformerIds.size > 0
        ? performers.filter((p) => selectedPerformerIds.has(p.id))
        : performers;

      // Try Claude API first when enabled
      if (useClaudeForGeneration) {
        setAiStatus('generating');
        try {
          const contextSummary = formationContext ? buildFormationContextSummary(formationContext) : '';
          const performerList = targetPerformers.map(p => `${p.id}: ${p.name}${p.section ? ` (${p.section})` : ''}`).join(', ');

          const drillPrompt = `You are a marching band drill designer. ${contextSummary}\n\nPerformers: ${performerList}\n\nUser request: "${description}"\n\nGenerate positions (x,y coordinates, 0-100 normalized) for each performer. Respond with ONLY valid JSON:\n{"positions":{"performerId":{"x":number,"y":number}},"description":"brief description"}`;

          const res = await fetch(buildApiUrl('/ai/chat/sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: drillPrompt }),
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            const content: string = data.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.positions && typeof parsed.positions === 'object') {
                const newPositions = new Map(currentPositions);
                for (const [id, pos] of Object.entries(parsed.positions)) {
                  const p = pos as { x: number; y: number };
                  if (typeof p.x === 'number' && typeof p.y === 'number') {
                    newPositions.set(id, { x: p.x, y: p.y });
                  }
                }
                onApplyPositions?.(newPositions);
                setAiStatus('idle');
                return {
                  sets: [{ name: 'Set 1', counts: 8, positions: newPositions, notes: parsed.description }],
                  description: parsed.description || `AI-generated: ${description}`,
                };
              }
            }
          }
          // If API call failed or response couldn't be parsed, fall through to local
        } catch {
          // Fall through to local heuristic
        }
        setAiStatus('idle');
      }

      // Fallback: local heuristic generation
      const result = generateFormationFromDescription({
        description,
        performers: targetPerformers,
      });

      if (result.sets.length > 0 && onApplyPositions) {
        const newPositions = new Map(currentPositions);
        for (const [id, pos] of result.sets[0].positions) {
          newPositions.set(id, pos);
        }
        onApplyPositions(newPositions);
      }

      return result;
    },
    [formation, performers, selectedPerformerIds, currentPositions, onApplyPositions, useClaudeForGeneration, formationContext],
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
    /** AI generation status */
    aiStatus,
    /** Whether to use Claude API for generation (vs local heuristics) */
    useClaudeForGeneration,
    /** Toggle Claude API usage */
    setUseClaudeForGeneration,
  };
}
