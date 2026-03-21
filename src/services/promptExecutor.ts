/**
 * Prompt Executor - Executes parsed prompt commands using existing geometry functions
 *
 * Takes a ParsedCommand and returns proposedPositions suitable for the ghost preview.
 * Bridges promptParser output → drillGeometry/drillAiService → GhostPreviewEntry.
 */

import type { Performer, Position, FieldConfig } from './formationTypes';
import type { ParsedCommand } from './promptParser';
import { resolvePerformerFilter } from './promptParser';
import {
  generateLinePositions,
  generateArcPositions,
  generateBlockPositions,
} from '../utils/drillGeometry';
import { generateFormationFromDescription } from './drillAiService';

// ============================================================================
// Types
// ============================================================================

export interface PromptExecutionResult {
  proposedPositions: Map<string, Position>;
  affectedPerformerIds: string[];
  description: string;
}

// ============================================================================
// Circle Generation (not in drillGeometry, derived from arc with full 2π)
// ============================================================================

function generateCirclePositions(
  center: { x: number; y: number },
  radius: number,
  count: number,
): Position[] {
  return generateArcPositions(
    center,
    radius,
    -Math.PI / 2, // Start at top
    -Math.PI / 2 + Math.PI * 2 * ((count - 1) / count), // Distribute evenly, don't overlap last with first
    count,
  );
}

// ============================================================================
// Shape Distribution
// ============================================================================

function executeDistribute(
  command: Extract<ParsedCommand, { type: 'distribute' }>,
  performers: Performer[],
  currentPositions: Map<string, Position>,
): PromptExecutionResult {
  const affectedIds = resolvePerformerFilter(command.performerFilter, performers);
  if (affectedIds.length === 0) {
    return { proposedPositions: new Map(), affectedPerformerIds: [], description: 'No performers matched filter' };
  }

  const { shape, params } = command;
  let positions: Position[];

  switch (shape) {
    case 'line': {
      const start = params.start ?? { x: 10, y: 50 };
      const end = params.end ?? { x: 90, y: 50 };
      positions = generateLinePositions(start, end, affectedIds.length);
      break;
    }
    case 'arc': {
      const center = params.center ?? { x: 50, y: 50 };
      const radius = params.radius ?? 30;
      const startAngle = params.startAngle ?? -Math.PI * 0.75;
      const endAngle = params.endAngle ?? -Math.PI * 0.25;
      positions = generateArcPositions(center, radius, startAngle, endAngle, affectedIds.length);
      break;
    }
    case 'circle': {
      const center = params.center ?? { x: 50, y: 50 };
      const radius = params.radius ?? 30;
      positions = generateCirclePositions(center, radius, affectedIds.length);
      break;
    }
    case 'grid': {
      const topLeft = params.start ?? { x: 15, y: 20 };
      const bottomRight = params.end ?? { x: 85, y: 80 };
      positions = generateBlockPositions(topLeft, bottomRight, affectedIds.length);
      break;
    }
  }

  // Build proposed positions map (keep unaffected performers at current positions)
  const proposedPositions = new Map(currentPositions);
  affectedIds.forEach((id, i) => {
    if (positions[i]) {
      proposedPositions.set(id, positions[i]);
    }
  });

  return {
    proposedPositions,
    affectedPerformerIds: affectedIds,
    description: `Distribute ${affectedIds.length} performer(s) in ${shape}`,
  };
}

// ============================================================================
// Relative Move (4F)
// ============================================================================

function executeRelativeMove(
  command: Extract<ParsedCommand, { type: 'relative-move' }>,
  performers: Performer[],
  currentPositions: Map<string, Position>,
): PromptExecutionResult {
  const affectedIds = resolvePerformerFilter(command.performerFilter, performers);
  if (affectedIds.length === 0) {
    return { proposedPositions: new Map(), affectedPerformerIds: [], description: 'No performers matched filter' };
  }

  const { dx, dy, rotation } = command.params;
  const proposedPositions = new Map(currentPositions);

  for (const id of affectedIds) {
    const current = currentPositions.get(id);
    if (!current) continue;

    proposedPositions.set(id, {
      x: Math.max(0, Math.min(100, current.x + dx)),
      y: Math.max(0, Math.min(100, current.y + dy)),
      rotation: rotation !== undefined ? (current.rotation || 0) + rotation : current.rotation,
    });
  }

  const parts: string[] = [];
  if (dx !== 0) parts.push(`${Math.abs(dx / 1.25).toFixed(0)} steps ${dx > 0 ? 'right' : 'left'}`);
  if (dy !== 0) parts.push(`${Math.abs(dy / 1.25).toFixed(0)} steps ${dy > 0 ? 'back' : 'forward'}`);
  if (rotation !== undefined) parts.push(`rotate ${rotation} degrees`);

  return {
    proposedPositions,
    affectedPerformerIds: affectedIds,
    description: `Move ${affectedIds.length} performer(s): ${parts.join(', ')}`,
  };
}

// ============================================================================
// Morph
// ============================================================================

function executeMorph(
  command: Extract<ParsedCommand, { type: 'morph' }>,
  performers: Performer[],
  currentPositions: Map<string, Position>,
): PromptExecutionResult {
  const affectedIds = resolvePerformerFilter(command.performerFilter, performers);
  if (affectedIds.length === 0) {
    return { proposedPositions: new Map(), affectedPerformerIds: [], description: 'No performers matched filter' };
  }

  // Generate target shape positions using the basic formation generator
  const targetResult = generateFormationFromDescription({
    description: command.targetShape,
    performers: performers.filter(p => affectedIds.includes(p.id)),
  });

  if (targetResult.sets.length === 0) {
    return { proposedPositions: currentPositions, affectedPerformerIds: affectedIds, description: 'Could not generate target shape' };
  }

  const targetPositions = targetResult.sets[0].positions;
  const factor = command.morphFactor;

  // Interpolate between current and target
  const proposedPositions = new Map(currentPositions);
  for (const id of affectedIds) {
    const current = currentPositions.get(id);
    const target = targetPositions.get(id);
    if (current && target) {
      proposedPositions.set(id, {
        x: current.x + (target.x - current.x) * factor,
        y: current.y + (target.y - current.y) * factor,
        rotation: current.rotation,
      });
    }
  }

  return {
    proposedPositions,
    affectedPerformerIds: affectedIds,
    description: `Morph ${Math.round(factor * 100)}% toward ${command.targetShape}`,
  };
}

// ============================================================================
// Basic Formation (fallback)
// ============================================================================

function executeBasicFormation(
  command: Extract<ParsedCommand, { type: 'basic_formation' }>,
  performers: Performer[],
  currentPositions: Map<string, Position>,
  fieldConfig?: FieldConfig,
): PromptExecutionResult {
  const affectedIds = resolvePerformerFilter(command.performerFilter, performers);
  const targetPerformers = affectedIds.length < performers.length
    ? performers.filter(p => affectedIds.includes(p.id))
    : performers;

  const result = generateFormationFromDescription({
    description: command.description,
    performers: targetPerformers,
    fieldConfig,
  });

  if (result.sets.length === 0) {
    return { proposedPositions: currentPositions, affectedPerformerIds: affectedIds, description: 'Generation failed' };
  }

  // Merge generated positions with current (unaffected stay in place)
  const proposedPositions = new Map(currentPositions);
  for (const [id, pos] of result.sets[0].positions) {
    proposedPositions.set(id, pos);
  }

  return {
    proposedPositions,
    affectedPerformerIds: affectedIds,
    description: result.description,
  };
}

// ============================================================================
// Main Executor
// ============================================================================

export function executePromptCommand(
  command: ParsedCommand,
  performers: Performer[],
  currentPositions: Map<string, Position>,
  fieldConfig?: FieldConfig,
): PromptExecutionResult {
  switch (command.type) {
    case 'distribute':
      return executeDistribute(command, performers, currentPositions);
    case 'template':
      // Templates route through basic_formation with the template name as description
      return executeBasicFormation(
        { type: 'basic_formation', description: command.templateName, performerFilter: command.performerFilter },
        performers,
        currentPositions,
        fieldConfig,
      );
    case 'morph':
      return executeMorph(command, performers, currentPositions);
    case 'relative-move':
      return executeRelativeMove(command, performers, currentPositions);
    case 'basic_formation':
      return executeBasicFormation(command, performers, currentPositions, fieldConfig);
  }
}
