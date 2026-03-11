/**
 * Rehearsal Plan Generator - FluxStudio
 *
 * Generates a prioritized rehearsal schedule based on difficulty analysis.
 * Analyzes section-specific transitions and produces time-boxed practice blocks
 * sorted by difficulty.
 */

import type { Formation, Performer } from './formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface RehearsalBlock {
  id: string;
  section: string;
  sets: string[];        // set names to practice
  estimatedMinutes: number;
  focusAreas: string[];
  priority: 'high' | 'medium' | 'low';
  difficultyScore: number;
}

export interface RehearsalPlan {
  totalMinutes: number;
  blocks: RehearsalBlock[];
  summary: string;
}

// ============================================================================
// Generator
// ============================================================================

export function generateRehearsalPlan(
  formation: Formation,
  availableMinutes: number = 60,
  targetSections?: string[],
): RehearsalPlan {
  const sets = formation.sets ?? [];
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  // Group performers by section
  const sectionMap = new Map<string, Performer[]>();
  for (const p of formation.performers) {
    const section = p.section ?? 'All';
    if (!sectionMap.has(section)) sectionMap.set(section, []);
    sectionMap.get(section)!.push(p);
  }

  const sections = targetSections ?? Array.from(sectionMap.keys());

  // Build rehearsal blocks
  const blocks: RehearsalBlock[] = [];
  let blockId = 0;

  for (const section of sections) {
    const performers = sectionMap.get(section) ?? [];
    if (performers.length === 0) continue;

    // Analyze each set transition for this section
    for (let i = 0; i < sortedSets.length - 1; i++) {
      const setName = sortedSets[i].name;
      const nextSetName = sortedSets[i + 1].name;

      const currentKf = formation.keyframes.find((k) => k.id === sortedSets[i].keyframeId);
      const nextKf = formation.keyframes.find((k) => k.id === sortedSets[i + 1].keyframeId);
      if (!currentKf || !nextKf) continue;

      // Calculate section-specific difficulty
      let maxStride = 0;
      let hasDirectionChange = false;
      const focusAreas: string[] = [];

      for (const performer of performers) {
        const startPos = currentKf.positions.get(performer.id);
        const endPos = nextKf.positions.get(performer.id);
        if (startPos && endPos) {
          const dx = endPos.x - startPos.x;
          const dy = endPos.y - startPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > maxStride) maxStride = distance;
          if (Math.abs(dx) > 5 && Math.abs(dy) > 5) hasDirectionChange = true;
        }
      }

      if (maxStride > 20) focusAreas.push('Long stride — practice at tempo');
      if (hasDirectionChange) focusAreas.push('Direction changes — mark time during turns');
      if (performers.length > 10) focusAreas.push('Large section — align dress and cover');

      const difficulty = Math.min(10, Math.round(maxStride / 5 + (hasDirectionChange ? 2 : 0)));
      const priority = difficulty >= 7 ? 'high' : difficulty >= 4 ? 'medium' : 'low';
      const estimatedMinutes = priority === 'high' ? 8 : priority === 'medium' ? 5 : 3;

      if (focusAreas.length === 0) focusAreas.push('Standard run-through');

      blocks.push({
        id: `block-${blockId++}`,
        section,
        sets: [`${setName} → ${nextSetName}`],
        estimatedMinutes,
        focusAreas,
        priority,
        difficultyScore: difficulty,
      });
    }
  }

  // Sort by priority (high first) then by difficulty (descending)
  blocks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.difficultyScore - a.difficultyScore;
  });

  // Trim to available time
  let totalMinutes = 0;
  const fittingBlocks: RehearsalBlock[] = [];
  for (const block of blocks) {
    if (totalMinutes + block.estimatedMinutes <= availableMinutes) {
      fittingBlocks.push(block);
      totalMinutes += block.estimatedMinutes;
    }
  }

  const highCount = fittingBlocks.filter((b) => b.priority === 'high').length;
  const summary = `Rehearsal plan: ${fittingBlocks.length} blocks in ${totalMinutes} minutes. ${highCount} high-priority transitions to focus on.`;

  return {
    totalMinutes,
    blocks: fittingBlocks,
    summary,
  };
}
