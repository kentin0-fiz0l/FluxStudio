/**
 * Formation MCP Tool Definitions and Handlers
 *
 * Implements read and write tools for drill formation management
 * via the Model Context Protocol.
 */
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  GetStateInputSchema,
  GetPerformersInputSchema,
  GetAnalysisInputSchema,
  SetPositionsInputSchema,
  AddKeyframeInputSchema,
  DistributeEvenlyInputSchema,
  GenerateTransitionInputSchema,
  ApplyTemplateInputSchema,
  MorphInputSchema,
} from './formationSchemas.js';
import {
  getFormationState,
  getPerformersAtKeyframe,
  setPositions as bridgeSetPositions,
  addKeyframe as bridgeAddKeyframe,
} from './formationBridge.js';
import type { FormationPosition } from './formationBridge.js';
import { analyzeFormation } from './formationAnalysis.js';

// ============================================================================
// Types
// ============================================================================

interface PendingAction {
  id: string;
  sessionId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
  preview: string;
  status: 'pending';
  createdAt: string;
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

// ============================================================================
// Tool Definitions (for ListTools)
// ============================================================================

export const formationToolDefinitions = [
  // ---- Read Tools ----
  {
    name: 'formation.getState',
    description: 'Get the full formation state: metadata, performers, keyframes with positions, drill sets, and field config.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID in format: project-{projectId}-formation-{formationId}',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'formation.getPerformers',
    description: 'Get all performers with their positions at a given keyframe.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID in format: project-{projectId}-formation-{formationId}',
        },
        keyframeId: {
          type: 'string',
          description: 'Keyframe ID to get positions at (defaults to first keyframe)',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'formation.getAnalysis',
    description: 'Run drill analysis: step sizes, spacing violations, collisions, and direction changes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID in format: project-{projectId}-formation-{formationId}',
        },
      },
      required: ['roomId'],
    },
  },
  // ---- Write Tools ----
  {
    name: 'formation.setPositions',
    description: 'Move performers to new positions at a keyframe. Applies changes live via Yjs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID in format: project-{projectId}-formation-{formationId}',
        },
        keyframeId: {
          type: 'string',
          description: 'Keyframe ID to set positions at',
        },
        positions: {
          type: 'object',
          description: 'Map of performerId to {x, y} positions (0-100 normalized)',
          additionalProperties: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
        },
      },
      required: ['roomId', 'keyframeId', 'positions'],
    },
  },
  {
    name: 'formation.addKeyframe',
    description: 'Create a new keyframe and drill set.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID in format: project-{projectId}-formation-{formationId}',
        },
        name: { type: 'string', description: 'Name for the new set' },
        counts: { type: 'number', description: 'Number of counts for the set' },
        afterKeyframeId: {
          type: 'string',
          description: 'Insert after this keyframe (appends to end if omitted)',
        },
      },
      required: ['roomId', 'name', 'counts'],
    },
  },
  {
    name: 'formation.distributeEvenly',
    description: 'Spread performers along a geometric shape (line, arc, grid, or circle).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        keyframeId: { type: 'string', description: 'Keyframe ID' },
        performerIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Performer IDs to distribute',
        },
        shape: {
          type: 'string',
          enum: ['line', 'arc', 'grid', 'circle'],
          description: 'Shape to distribute along',
        },
        params: {
          type: 'object',
          description: 'Shape parameters (start/end for line, center/radius for circle, etc.)',
        },
      },
      required: ['roomId', 'keyframeId', 'performerIds', 'shape', 'params'],
    },
  },
  {
    name: 'formation.generateTransition',
    description: 'Suggest interpolated positions between two keyframes with a given transition style.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        fromKeyframeId: { type: 'string', description: 'Source keyframe ID' },
        toKeyframeId: { type: 'string', description: 'Target keyframe ID' },
        style: {
          type: 'string',
          enum: ['smooth', 'direct', 'sweeping'],
          description: 'Transition style',
        },
      },
      required: ['roomId', 'fromKeyframeId', 'toKeyframeId', 'style'],
    },
  },
  {
    name: 'formation.applyTemplate',
    description: 'Apply a named formation template (company_front, block, wedge, circle, scatter, diagonal).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        keyframeId: { type: 'string', description: 'Keyframe ID to apply template at' },
        templateName: {
          type: 'string',
          enum: ['company_front', 'block', 'wedge', 'circle', 'scatter', 'diagonal'],
          description: 'Template name',
        },
        performerIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific performers (defaults to all)',
        },
        params: {
          type: 'object',
          description: 'Template parameters (center, scale, rotation, spacing)',
        },
      },
      required: ['roomId', 'keyframeId', 'templateName'],
    },
  },
  {
    name: 'formation.morph',
    description: 'Morph current formation toward a target shape by a factor (0=current, 1=fully target shape).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        keyframeId: { type: 'string', description: 'Keyframe ID to morph' },
        targetShape: {
          type: 'string',
          enum: ['line', 'arc', 'grid', 'circle', 'wedge', 'block'],
          description: 'Target shape',
        },
        morphFactor: {
          type: 'number',
          description: 'Morph amount: 0 = current, 1 = fully target shape',
          minimum: 0,
          maximum: 1,
        },
        params: {
          type: 'object',
          description: 'Target shape parameters',
        },
      },
      required: ['roomId', 'keyframeId', 'targetShape', 'morphFactor'],
    },
  },
];

// ============================================================================
// Helpers
// ============================================================================

function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function makePendingAction(
  actionType: string,
  formationId: string,
  payload: Record<string, unknown>,
  preview: string,
): PendingAction {
  return {
    id: crypto.randomUUID(),
    sessionId: 'mcp-formation',
    actionType,
    targetType: 'formation',
    targetId: formationId,
    payload,
    preview,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

function parseRoomId(roomId: string): { projectId: string; formationId: string } {
  const match = roomId.match(/^project-(.+)-formation-(.+)$/);
  if (!match) throw new McpError(ErrorCode.InvalidParams, `Invalid roomId format: ${roomId}`);
  return { projectId: match[1], formationId: match[2] };
}

// ============================================================================
// Shape Generators
// ============================================================================

function generateLinePositions(
  performerIds: string[],
  start: { x: number; y: number },
  end: { x: number; y: number },
): Record<string, FormationPosition> {
  const positions: Record<string, FormationPosition> = {};
  const n = performerIds.length;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    positions[performerIds[i]] = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
  }
  return positions;
}

function generateCirclePositions(
  performerIds: string[],
  center: { x: number; y: number },
  radius: number,
  startAngle: number = 0,
): Record<string, FormationPosition> {
  const positions: Record<string, FormationPosition> = {};
  const n = performerIds.length;
  for (let i = 0; i < n; i++) {
    const angle = (startAngle + (360 / n) * i) * (Math.PI / 180);
    positions[performerIds[i]] = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  }
  return positions;
}

function generateArcPositions(
  performerIds: string[],
  center: { x: number; y: number },
  radius: number,
  startAngle: number,
  endAngle: number,
): Record<string, FormationPosition> {
  const positions: Record<string, FormationPosition> = {};
  const n = performerIds.length;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angle = (startAngle + (endAngle - startAngle) * t) * (Math.PI / 180);
    positions[performerIds[i]] = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  }
  return positions;
}

function generateGridPositions(
  performerIds: string[],
  center: { x: number; y: number },
  columns: number,
  spacing: number,
): Record<string, FormationPosition> {
  const positions: Record<string, FormationPosition> = {};
  const n = performerIds.length;
  const rows = Math.ceil(n / columns);
  const totalWidth = (columns - 1) * spacing;
  const totalHeight = (rows - 1) * spacing;
  const startX = center.x - totalWidth / 2;
  const startY = center.y - totalHeight / 2;

  for (let i = 0; i < n; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions[performerIds[i]] = {
      x: startX + col * spacing,
      y: startY + row * spacing,
    };
  }
  return positions;
}

// ============================================================================
// Template Generators
// ============================================================================

function generateTemplatePositions(
  templateName: string,
  performerIds: string[],
  center: { x: number; y: number },
  scale: number,
  spacing: number,
): Record<string, FormationPosition> {
  const n = performerIds.length;

  switch (templateName) {
    case 'company_front':
      return generateLinePositions(
        performerIds,
        { x: center.x - (n - 1) * spacing * scale / 2, y: center.y },
        { x: center.x + (n - 1) * spacing * scale / 2, y: center.y },
      );

    case 'block': {
      const cols = Math.ceil(Math.sqrt(n));
      return generateGridPositions(performerIds, center, cols, spacing * scale);
    }

    case 'wedge': {
      const positions: Record<string, FormationPosition> = {};
      let idx = 0;
      let row = 0;
      while (idx < n) {
        const rowCount = row + 1;
        const rowWidth = (rowCount - 1) * spacing * scale;
        for (let c = 0; c < rowCount && idx < n; c++) {
          const x = center.x - rowWidth / 2 + c * spacing * scale;
          const y = center.y + row * spacing * scale;
          positions[performerIds[idx]] = { x, y };
          idx++;
        }
        row++;
      }
      return positions;
    }

    case 'circle':
      return generateCirclePositions(performerIds, center, spacing * scale * Math.max(1, n / 6));

    case 'scatter': {
      // Deterministic scatter using performer index as seed
      const positions: Record<string, FormationPosition> = {};
      const radius = spacing * scale * Math.max(1, n / 6);
      for (let i = 0; i < n; i++) {
        // Golden angle distribution for even scatter
        const angle = i * 137.508 * (Math.PI / 180);
        const r = radius * Math.sqrt(i / n);
        positions[performerIds[i]] = {
          x: center.x + r * Math.cos(angle),
          y: center.y + r * Math.sin(angle),
        };
      }
      return positions;
    }

    case 'diagonal':
      return generateLinePositions(
        performerIds,
        { x: center.x - (n - 1) * spacing * scale / 2, y: center.y - (n - 1) * spacing * scale / 2 },
        { x: center.x + (n - 1) * spacing * scale / 2, y: center.y + (n - 1) * spacing * scale / 2 },
      );

    default:
      throw new McpError(ErrorCode.InvalidParams, `Unknown template: ${templateName}`);
  }
}

// ============================================================================
// Tool Handler
// ============================================================================

/**
 * Handle a formation tool call. Returns the MCP tool result.
 */
export async function handleFormationTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      // ==== Read Tools ====

      case 'formation.getState': {
        const { roomId } = GetStateInputSchema.parse(args);
        console.log(`[MCP:Formation] getState for room: ${roomId}`);
        const state = await getFormationState(roomId);
        return jsonResult(state);
      }

      case 'formation.getPerformers': {
        const { roomId, keyframeId } = GetPerformersInputSchema.parse(args);
        console.log(`[MCP:Formation] getPerformers for room: ${roomId}, keyframe: ${keyframeId ?? '(first)'}`);
        const result = await getPerformersAtKeyframe(roomId, keyframeId);
        return jsonResult(result);
      }

      case 'formation.getAnalysis': {
        const { roomId } = GetAnalysisInputSchema.parse(args);
        console.log(`[MCP:Formation] getAnalysis for room: ${roomId}`);
        const state = await getFormationState(roomId);
        const analysis = analyzeFormation(state);
        return jsonResult(analysis);
      }

      // ==== Write Tools ====

      case 'formation.setPositions': {
        const validated = SetPositionsInputSchema.parse(args);
        const { roomId, keyframeId, positions } = validated;
        const { formationId } = parseRoomId(roomId);
        console.log(`[MCP:Formation] setPositions at keyframe: ${keyframeId}, ${Object.keys(positions).length} performers`);

        await bridgeSetPositions(roomId, keyframeId, positions);

        const pendingAction = makePendingAction(
          'formation.setPositions',
          formationId,
          { keyframeId, positions },
          `Moved ${Object.keys(positions).length} performer(s) to new positions at keyframe ${keyframeId}`,
        );

        return jsonResult({
          success: true,
          preview: pendingAction.preview,
          performersMoved: Object.keys(positions).length,
          pendingAction,
        });
      }

      case 'formation.addKeyframe': {
        const validated = AddKeyframeInputSchema.parse(args);
        const { roomId, name: setName, counts, afterKeyframeId } = validated;
        const { formationId } = parseRoomId(roomId);
        console.log(`[MCP:Formation] addKeyframe: "${setName}" (${counts} counts)`);

        const keyframeId = crypto.randomUUID();
        const setId = crypto.randomUUID();

        await bridgeAddKeyframe(roomId, keyframeId, setName, counts, setId, afterKeyframeId);

        const pendingAction = makePendingAction(
          'formation.addKeyframe',
          formationId,
          { keyframeId, setId, name: setName, counts, afterKeyframeId },
          `Added new set "${setName}" with ${counts} counts`,
        );

        return jsonResult({
          success: true,
          keyframeId,
          setId,
          preview: pendingAction.preview,
          pendingAction,
        });
      }

      case 'formation.distributeEvenly': {
        const validated = DistributeEvenlyInputSchema.parse(args);
        const { roomId, keyframeId, performerIds, shape, params } = validated;
        const { formationId } = parseRoomId(roomId);
        console.log(`[MCP:Formation] distributeEvenly: ${shape}, ${performerIds.length} performers`);

        let positions: Record<string, FormationPosition>;

        switch (shape) {
          case 'line':
            positions = generateLinePositions(
              performerIds,
              params.start ?? { x: 20, y: 50 },
              params.end ?? { x: 80, y: 50 },
            );
            break;
          case 'circle':
            positions = generateCirclePositions(
              performerIds,
              params.center ?? { x: 50, y: 50 },
              params.radius ?? 20,
            );
            break;
          case 'arc':
            positions = generateArcPositions(
              performerIds,
              params.center ?? { x: 50, y: 50 },
              params.radius ?? 20,
              params.startAngle ?? -90,
              params.endAngle ?? 90,
            );
            break;
          case 'grid':
            positions = generateGridPositions(
              performerIds,
              params.center ?? { x: 50, y: 50 },
              params.columns ?? Math.ceil(Math.sqrt(performerIds.length)),
              params.spacing ?? 5,
            );
            break;
          default:
            throw new McpError(ErrorCode.InvalidParams, `Unknown shape: ${shape}`);
        }

        await bridgeSetPositions(roomId, keyframeId, positions);

        const pendingAction = makePendingAction(
          'formation.distributeEvenly',
          formationId,
          { keyframeId, performerIds, shape, params, positions },
          `Distributed ${performerIds.length} performers in a ${shape} at keyframe ${keyframeId}`,
        );

        return jsonResult({
          success: true,
          positions,
          preview: pendingAction.preview,
          pendingAction,
        });
      }

      case 'formation.generateTransition': {
        const validated = GenerateTransitionInputSchema.parse(args);
        const { roomId, fromKeyframeId, toKeyframeId, style } = validated;
        const { formationId } = parseRoomId(roomId);
        console.log(`[MCP:Formation] generateTransition: ${fromKeyframeId} -> ${toKeyframeId} (${style})`);

        const state = await getFormationState(roomId);
        const fromKf = state.keyframes.find((kf) => kf.id === fromKeyframeId);
        const toKf = state.keyframes.find((kf) => kf.id === toKeyframeId);

        if (!fromKf) throw new McpError(ErrorCode.InvalidParams, `From keyframe not found: ${fromKeyframeId}`);
        if (!toKf) throw new McpError(ErrorCode.InvalidParams, `To keyframe not found: ${toKeyframeId}`);

        // Generate suggested midpoint based on style
        const midpoints: Record<string, FormationPosition> = {};
        for (const [pid, fromPos] of Object.entries(fromKf.positions)) {
          const toPos = toKf.positions[pid];
          if (!fromPos || !toPos) continue;

          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;

          switch (style) {
            case 'direct':
              midpoints[pid] = { x: midX, y: midY };
              break;
            case 'smooth': {
              // Slight curve offset perpendicular to path
              const dx = toPos.x - fromPos.x;
              const dy = toPos.y - fromPos.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const offset = len * 0.15;
              midpoints[pid] = {
                x: midX + (-dy / len) * offset,
                y: midY + (dx / len) * offset,
              };
              break;
            }
            case 'sweeping': {
              // Larger curve offset
              const dx2 = toPos.x - fromPos.x;
              const dy2 = toPos.y - fromPos.y;
              const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              const offset2 = len2 * 0.35;
              midpoints[pid] = {
                x: midX + (-dy2 / len2) * offset2,
                y: midY + (dx2 / len2) * offset2,
              };
              break;
            }
          }
        }

        const pendingAction = makePendingAction(
          'formation.generateTransition',
          formationId,
          { fromKeyframeId, toKeyframeId, style, midpoints },
          `Generated ${style} transition from ${fromKeyframeId} to ${toKeyframeId} for ${Object.keys(midpoints).length} performers`,
        );

        return jsonResult({
          success: true,
          style,
          midpoints,
          performerCount: Object.keys(midpoints).length,
          preview: pendingAction.preview,
          pendingAction,
        });
      }

      case 'formation.applyTemplate': {
        const validated = ApplyTemplateInputSchema.parse(args);
        const { roomId, keyframeId, templateName, params } = validated;
        const { formationId } = parseRoomId(roomId);
        console.log(`[MCP:Formation] applyTemplate: ${templateName} at keyframe ${keyframeId}`);

        const state = await getFormationState(roomId);
        const targetPerformerIds = validated.performerIds ?? state.performers.map((p) => p.id);

        const center = params?.center ?? { x: 50, y: 50 };
        const scale = params?.scale ?? 1.0;
        const spacing = params?.spacing ?? 5;

        const positions = generateTemplatePositions(templateName, targetPerformerIds, center, scale, spacing);

        // Apply rotation if specified
        if (params?.rotation) {
          const rad = params.rotation * (Math.PI / 180);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          for (const pid of Object.keys(positions)) {
            const p = positions[pid];
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            positions[pid] = {
              x: center.x + dx * cos - dy * sin,
              y: center.y + dx * sin + dy * cos,
            };
          }
        }

        await bridgeSetPositions(roomId, keyframeId, positions);

        const pendingAction = makePendingAction(
          'formation.applyTemplate',
          formationId,
          { keyframeId, templateName, performerIds: targetPerformerIds, params, positions },
          `Applied "${templateName}" template to ${targetPerformerIds.length} performers at keyframe ${keyframeId}`,
        );

        return jsonResult({
          success: true,
          positions,
          preview: pendingAction.preview,
          pendingAction,
        });
      }

      case 'formation.morph': {
        const validated = MorphInputSchema.parse(args);
        const { roomId, keyframeId, targetShape, morphFactor, params } = validated;
        const { formationId } = parseRoomId(roomId);
        console.log(`[MCP:Formation] morph: ${targetShape} x${morphFactor} at keyframe ${keyframeId}`);

        const state = await getFormationState(roomId);
        const kf = state.keyframes.find((k) => k.id === keyframeId);
        if (!kf) throw new McpError(ErrorCode.InvalidParams, `Keyframe not found: ${keyframeId}`);

        const performerIds = Object.keys(kf.positions);
        const center = params?.center ?? { x: 50, y: 50 };
        const spacing = params?.spacing ?? 5;

        // Generate target positions using the template generator
        const targetPositions = generateTemplatePositions(
          targetShape,
          performerIds,
          center,
          1.0,
          spacing,
        );

        // Interpolate between current and target by morphFactor
        const morphedPositions: Record<string, FormationPosition> = {};
        for (const pid of performerIds) {
          const current = kf.positions[pid];
          const target = targetPositions[pid];
          if (!current || !target) continue;
          morphedPositions[pid] = {
            x: current.x + (target.x - current.x) * morphFactor,
            y: current.y + (target.y - current.y) * morphFactor,
          };
        }

        await bridgeSetPositions(roomId, keyframeId, morphedPositions);

        const pendingAction = makePendingAction(
          'formation.morph',
          formationId,
          { keyframeId, targetShape, morphFactor, positions: morphedPositions },
          `Morphed ${performerIds.length} performers ${Math.round(morphFactor * 100)}% toward ${targetShape}`,
        );

        return jsonResult({
          success: true,
          positions: morphedPositions,
          preview: pendingAction.preview,
          pendingAction,
        });
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown formation tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;

    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[MCP:Formation] Tool error (${name}):`, msg);
    throw new McpError(ErrorCode.InternalError, `Formation tool failed: ${msg}`);
  }
}
