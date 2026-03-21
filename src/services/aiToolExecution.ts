/**
 * AI Tool Execution Service
 *
 * Maps AI tool_use response blocks from the streaming chat endpoint
 * to frontend formation mutations via the ghost preview pipeline.
 */

import type { Position } from './formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface AIToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolExecutionResult {
  proposedPositions?: Map<string, Position>;
  affectedPerformerIds: string[];
  description: string;
  /** Metadata for non-position tools (transitions, sets) */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tool Executors
// ============================================================================

function executeMovePerformers(
  input: Record<string, unknown>,
  currentPositions: Map<string, Position>,
): ToolExecutionResult {
  const ids = (input.performer_ids as string[]) || [];
  const to = input.to as { x: number; y: number } | undefined;
  const dx = (input.dx as number) || 0;
  const dy = (input.dy as number) || 0;

  const proposed = new Map(currentPositions);
  const affected: string[] = [];

  for (const id of ids) {
    const current = currentPositions.get(id);
    if (!current) continue;

    if (to) {
      proposed.set(id, { x: to.x, y: to.y, rotation: current.rotation });
    } else {
      proposed.set(id, { x: current.x + dx, y: current.y + dy, rotation: current.rotation });
    }
    affected.push(id);
  }

  const desc = to
    ? `Move ${affected.length} performer(s) to (${to.x}, ${to.y})`
    : `Move ${affected.length} performer(s) by (${dx}, ${dy})`;

  return { proposedPositions: proposed, affectedPerformerIds: affected, description: desc };
}

function executeCreateFormation(
  input: Record<string, unknown>,
): ToolExecutionResult {
  const template = input.template as string;
  const ids = (input.performer_ids as string[]) || [];

  return {
    affectedPerformerIds: ids,
    description: `Create "${template}" formation for ${ids.length} performers`,
    metadata: { action: 'create_formation', template, performer_ids: ids },
  };
}

function executeAdjustSpacing(
  input: Record<string, unknown>,
  currentPositions: Map<string, Position>,
): ToolExecutionResult {
  const ids = (input.performer_ids as string[]) || [];
  const spacingType = input.spacing_type as string;
  const amount = (input.amount as number) || 2;

  // Simple spacing computation for preview
  const positions = ids.map(id => currentPositions.get(id)).filter(Boolean) as Position[];
  if (positions.length < 2) {
    return { affectedPerformerIds: ids, description: 'Not enough performers to adjust spacing' };
  }

  const centroid = {
    x: positions.reduce((s, p) => s + p.x, 0) / positions.length,
    y: positions.reduce((s, p) => s + p.y, 0) / positions.length,
  };

  const factor = spacingType === 'expand' ? 1 + amount / 10
    : spacingType === 'compress' ? 1 - amount / 10
    : 1; // 'equal' is more complex, approximate by normalizing distances

  const proposed = new Map(currentPositions);
  for (const id of ids) {
    const current = currentPositions.get(id);
    if (!current) continue;
    proposed.set(id, {
      x: centroid.x + (current.x - centroid.x) * factor,
      y: centroid.y + (current.y - centroid.y) * factor,
      rotation: current.rotation,
    });
  }

  return {
    proposedPositions: proposed,
    affectedPerformerIds: ids,
    description: `${spacingType.charAt(0).toUpperCase() + spacingType.slice(1)} spacing for ${ids.length} performers`,
  };
}

function executeSetTransition(
  input: Record<string, unknown>,
): ToolExecutionResult {
  return {
    affectedPerformerIds: [],
    description: `Set ${input.type} transition from ${input.from_keyframe} to ${input.to_keyframe}`,
    metadata: { action: 'set_transition', ...input },
  };
}

function executeAddSet(
  input: Record<string, unknown>,
): ToolExecutionResult {
  return {
    affectedPerformerIds: [],
    description: `Add set "${input.name}" (${input.counts} counts)${input.after_set ? ` after ${input.after_set}` : ''}`,
    metadata: { action: 'add_set', ...input },
  };
}

// ============================================================================
// Main Dispatcher
// ============================================================================

/**
 * Execute an AI tool call and return proposed changes for preview.
 */
export function executeAIToolCall(
  toolCall: AIToolCall,
  currentPositions: Map<string, Position>,
): ToolExecutionResult {
  switch (toolCall.name) {
    case 'move_performers':
      return executeMovePerformers(toolCall.input, currentPositions);
    case 'create_formation':
      return executeCreateFormation(toolCall.input);
    case 'adjust_spacing':
      return executeAdjustSpacing(toolCall.input, currentPositions);
    case 'set_transition':
      return executeSetTransition(toolCall.input);
    case 'add_set':
      return executeAddSet(toolCall.input);
    default:
      return { affectedPerformerIds: [], description: `Unknown tool: ${toolCall.name}` };
  }
}

/**
 * Generate a human-readable summary for a tool call.
 */
export function describeToolCall(toolCall: AIToolCall): string {
  const count = (toolCall.input.performer_ids as string[])?.length || 0;
  switch (toolCall.name) {
    case 'move_performers':
      return `Move ${count} performer(s)`;
    case 'create_formation':
      return `Create "${toolCall.input.template}" formation`;
    case 'adjust_spacing':
      return `${toolCall.input.spacing_type} spacing for ${count} performer(s)`;
    case 'set_transition':
      return `Set ${toolCall.input.type} transition`;
    case 'add_set':
      return `Add set "${toolCall.input.name}"`;
    default:
      return toolCall.name;
  }
}
