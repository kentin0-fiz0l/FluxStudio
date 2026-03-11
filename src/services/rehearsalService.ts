/**
 * Rehearsal Service - FluxStudio
 *
 * Generates rehearsal data and natural language movement instructions
 * for section-by-section drill practice.
 */

import type { Formation, DrillSet, Performer, Position } from './formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface PerformerInstruction {
  performerId: string;
  performerName: string;
  drillNumber?: string;
  instrument?: string;
  fromPosition: Position;
  toPosition: Position;
  distanceYards: number;
  stepSize: string;
  direction: string;
  instruction: string;
}

export interface RehearsalStep {
  setId: string;
  setName: string;
  rehearsalMark?: string;
  counts: number;
  performers: Map<string, PerformerInstruction>;
}

export interface RehearsalPlanSummary {
  totalSets: number;
  totalPerformers: number;
  avgStepSize: number;
  hardestMove: { performerName: string; distanceYards: number; setName: string } | null;
}

// ============================================================================
// Direction helpers
// ============================================================================

function getDirectionLabel(dx: number, dy: number): string {
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return 'hold';

  const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  const normalized = ((angle % 360) + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'to the right';
  if (normalized >= 22.5 && normalized < 67.5) return 'forward-right';
  if (normalized >= 67.5 && normalized < 112.5) return 'forward';
  if (normalized >= 112.5 && normalized < 157.5) return 'forward-left';
  if (normalized >= 157.5 && normalized < 202.5) return 'to the left';
  if (normalized >= 202.5 && normalized < 247.5) return 'backward-left';
  if (normalized >= 247.5 && normalized < 292.5) return 'backward';
  return 'backward-right';
}

function getCardinalDirection(value: number): string {
  if (value > 0.5) return 'right';
  if (value < -0.5) return 'left';
  return '';
}

function getVerticalDirection(value: number): string {
  // In field coordinates, positive Y is typically downfield (toward audience)
  if (value > 0.5) return 'backward';
  if (value < -0.5) return 'forward';
  return '';
}

// ============================================================================
// Core functions
// ============================================================================

/**
 * Generate movement instructions for a single performer between two positions.
 */
export function generatePerformerInstructions(
  performer: Performer,
  fromPosition: Position,
  toPosition: Position,
  counts: number,
  fieldWidth: number = 120,
  fieldHeight: number = 53.33,
): PerformerInstruction {
  // Calculate distance in yards
  const dxNorm = toPosition.x - fromPosition.x;
  const dyNorm = toPosition.y - fromPosition.y;
  const dxYards = (dxNorm / 100) * fieldWidth;
  const dyYards = (dyNorm / 100) * fieldHeight;
  const distanceYards = Math.sqrt(dxYards * dxYards + dyYards * dyYards);

  // Step size in 8-to-5 notation
  const stepsPerFiveYards = distanceYards > 0.1 ? (counts * 5) / distanceYards : 0;
  const stepSize = distanceYards < 0.1
    ? 'hold'
    : `${Math.round(stepsPerFiveYards * 10) / 10} to 5`;

  // Direction
  const direction = getDirectionLabel(dxYards, dyYards);

  // Build natural language instruction
  let instruction: string;
  if (distanceYards < 0.1) {
    instruction = `Hold position for ${counts} counts`;
  } else {
    // Check if movement is primarily along one axis
    const absDx = Math.abs(dxYards);
    const absDy = Math.abs(dyYards);

    if (absDx < 0.5 || absDy < 0.5) {
      // Single-axis movement
      const steps = counts;
      instruction = `Move ${steps} steps ${direction} in ${counts} counts`;
    } else {
      // Two-axis movement: break into components
      const xDir = getCardinalDirection(dxYards);
      const yDir = getVerticalDirection(dyYards);
      const xSteps = Math.round((absDx / distanceYards) * counts);
      const ySteps = counts - xSteps;

      if (xDir && yDir) {
        instruction = `Move ${xSteps} steps ${xDir}, then ${ySteps} steps ${yDir} (${counts} counts total)`;
      } else {
        instruction = `Move ${counts} steps ${direction} in ${counts} counts`;
      }
    }
  }

  return {
    performerId: performer.id,
    performerName: performer.name,
    drillNumber: performer.drillNumber,
    instrument: performer.instrument,
    fromPosition,
    toPosition,
    distanceYards: Math.round(distanceYards * 10) / 10,
    stepSize,
    direction,
    instruction,
  };
}

/**
 * Generate a full rehearsal plan from a formation and its drill sets.
 */
export function generateRehearsalPlan(
  formation: Formation,
  sets: DrillSet[],
  sectionFilter?: string,
): RehearsalStep[] {
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const steps: RehearsalStep[] = [];
  const { keyframes, performers } = formation;

  // Filter performers by section if specified
  const filteredPerformers = sectionFilter && sectionFilter !== 'All'
    ? performers.filter((p) => (p.section || 'Unassigned') === sectionFilter)
    : performers;

  const fieldWidth = formation.fieldConfig?.width ?? 120;
  const fieldHeight = formation.fieldConfig?.height ?? 53.33;

  for (let si = 0; si < sortedSets.length - 1; si++) {
    const currentSet = sortedSets[si];
    const nextSet = sortedSets[si + 1];
    const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
    const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);
    if (!currentKf || !nextKf) continue;

    const performerInstructions = new Map<string, PerformerInstruction>();

    for (const performer of filteredPerformers) {
      const fromPos = currentKf.positions.get(performer.id);
      const toPos = nextKf.positions.get(performer.id);
      if (!fromPos || !toPos) continue;

      const inst = generatePerformerInstructions(
        performer,
        fromPos,
        toPos,
        currentSet.counts,
        fieldWidth,
        fieldHeight,
      );
      performerInstructions.set(performer.id, inst);
    }

    steps.push({
      setId: currentSet.id,
      setName: `${currentSet.name} -> ${nextSet.name}`,
      rehearsalMark: currentSet.rehearsalMark,
      counts: currentSet.counts,
      performers: performerInstructions,
    });
  }

  return steps;
}

/**
 * Compute summary statistics for a rehearsal plan.
 */
export function getRehearsalSummary(steps: RehearsalStep[]): RehearsalPlanSummary {
  let totalPerformers = 0;
  let totalStepSize = 0;
  let stepSizeCount = 0;
  let hardestMove: RehearsalPlanSummary['hardestMove'] = null;

  for (const step of steps) {
    for (const [, inst] of step.performers) {
      totalPerformers++;
      if (inst.distanceYards > 0.1) {
        // Parse numeric step size
        const match = inst.stepSize.match(/^([\d.]+)/);
        if (match) {
          const sz = parseFloat(match[1]);
          totalStepSize += sz;
          stepSizeCount++;
        }
      }
      if (!hardestMove || inst.distanceYards > hardestMove.distanceYards) {
        hardestMove = {
          performerName: inst.performerName,
          distanceYards: inst.distanceYards,
          setName: step.setName,
        };
      }
    }
  }

  const uniquePerformers = new Set<string>();
  for (const step of steps) {
    for (const [id] of step.performers) {
      uniquePerformers.add(id);
    }
  }

  return {
    totalSets: steps.length,
    totalPerformers: uniquePerformers.size,
    avgStepSize: stepSizeCount > 0 ? Math.round((totalStepSize / stepSizeCount) * 10) / 10 : 0,
    hardestMove: hardestMove && hardestMove.distanceYards > 0.1 ? hardestMove : null,
  };
}

/**
 * Get unique section names from performers.
 */
export function getSections(performers: Performer[]): string[] {
  const sections = new Set<string>();
  for (const p of performers) {
    sections.add(p.section || 'Unassigned');
  }
  return ['All', ...Array.from(sections).sort()];
}
