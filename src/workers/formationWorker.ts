/**
 * Formation Web Worker - FluxStudio
 *
 * Offloads heavy computation from the main thread to keep the canvas
 * responsive at 60fps with 200+ performers:
 *
 * - Collision detection between all performer pairs (O(n^2))
 * - Bulk step-size computation for coordinate sheets
 * - Path calculation for transition previews
 *
 * Communication uses structured messages with a `type` discriminator
 * and a `requestId` for correlating responses with promises on the
 * main thread.
 */

// ============================================================================
// Types (duplicated from main thread to keep worker self-contained)
// ============================================================================

interface Position {
  x: number;
  y: number;
  rotation?: number;
}

interface FieldConfig {
  type: string;
  name: string;
  width: number;
  height: number;
  yardLineInterval: number;
  hashMarks: { front: number; back: number };
  endZoneDepth: number;
  unit: string;
}

// --- Request types ---

interface CollisionCheckRequest {
  type: 'collisionCheck';
  requestId: string;
  /** Serialized as [id, x, y][] since Maps don't survive postMessage */
  positions: [string, number, number][];
  minDistance: number;
}

interface BulkStepSizeRequest {
  type: 'bulkStepSizes';
  requestId: string;
  /** Current positions: [id, x, y][] */
  positions: [string, number, number][];
  /** Next positions: [id, x, y][] */
  nextPositions: [string, number, number][];
  fieldConfig: FieldConfig;
  counts: number;
}

interface PathCalculationRequest {
  type: 'pathCalculation';
  requestId: string;
  /** Start positions: [id, x, y][] */
  fromPositions: [string, number, number][];
  /** End positions: [id, x, y][] */
  toPositions: [string, number, number][];
  /** Number of intermediate samples */
  sampleCount: number;
}

type WorkerRequest = CollisionCheckRequest | BulkStepSizeRequest | PathCalculationRequest;

// --- Response types ---

interface CollisionPair {
  idA: string;
  idB: string;
  distance: number;
}

interface StepSizeResult {
  performerId: string;
  distanceYards: number;
  stepSize: number;
  stepSizeLabel: string;
  difficulty: 'easy' | 'moderate' | 'hard';
}

interface PathSample {
  performerId: string;
  points: { x: number; y: number }[];
}

interface CollisionCheckResponse {
  type: 'collisionCheck';
  requestId: string;
  collisions: CollisionPair[];
}

interface BulkStepSizeResponse {
  type: 'bulkStepSizes';
  requestId: string;
  results: StepSizeResult[];
}

interface PathCalculationResponse {
  type: 'pathCalculation';
  requestId: string;
  paths: PathSample[];
}

interface ErrorResponse {
  type: 'error';
  requestId: string;
  error: string;
}

type WorkerResponse =
  | CollisionCheckResponse
  | BulkStepSizeResponse
  | PathCalculationResponse
  | ErrorResponse;

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * O(n^2) pairwise distance check. For 200 performers this is 19,900 pairs
 * which is fine off-thread but would cause jank on the main thread during
 * drag operations.
 */
function detectCollisions(
  positions: [string, number, number][],
  minDistance: number,
): CollisionPair[] {
  const collisions: CollisionPair[] = [];
  const minDistSq = minDistance * minDistance;

  for (let i = 0; i < positions.length; i++) {
    const [idA, ax, ay] = positions[i];
    for (let j = i + 1; j < positions.length; j++) {
      const [idB, bx, by] = positions[j];
      const dx = ax - bx;
      const dy = ay - by;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        collisions.push({
          idA,
          idB,
          distance: Math.sqrt(distSq),
        });
      }
    }
  }

  return collisions;
}

// ============================================================================
// Bulk Step-Size Computation
// ============================================================================

function formatStepSize(stepSize: number): string {
  if (stepSize < 0.1) return 'Mark Time';
  const rounded = Math.round(stepSize * 2) / 2;
  return `${rounded} to 5`;
}

function computeBulkStepSizes(
  positions: [string, number, number][],
  nextPositions: [string, number, number][],
  fieldConfig: FieldConfig,
  counts: number,
): StepSizeResult[] {
  // Build lookup for next positions
  const nextMap = new Map<string, [number, number]>();
  for (const [id, x, y] of nextPositions) {
    nextMap.set(id, [x, y]);
  }

  const results: StepSizeResult[] = [];

  for (const [id, fromX, fromY] of positions) {
    const next = nextMap.get(id);
    if (!next) continue;

    const [toX, toY] = next;
    const dxNorm = toX - fromX;
    const dyNorm = toY - fromY;

    // Convert to field units (yards/feet/meters)
    const dxField = (dxNorm / 100) * fieldConfig.width;
    const dyField = (dyNorm / 100) * fieldConfig.height;
    const distanceYards = Math.sqrt(dxField * dxField + dyField * dyField);

    let stepSize: number;
    let stepSizeLabel: string;

    if (distanceYards < 0.01) {
      stepSize = 0;
      stepSizeLabel = 'Mark Time';
    } else {
      stepSize = (counts * 5) / distanceYards;
      stepSizeLabel = formatStepSize(stepSize);
    }

    let difficulty: 'easy' | 'moderate' | 'hard';
    if (stepSize === 0) {
      difficulty = 'easy';
    } else if (stepSize >= 8) {
      difficulty = 'easy';
    } else if (stepSize >= 6) {
      difficulty = 'moderate';
    } else {
      difficulty = 'hard';
    }

    results.push({ performerId: id, distanceYards, stepSize, stepSizeLabel, difficulty });
  }

  return results;
}

// ============================================================================
// Path Calculation
// ============================================================================

function computePaths(
  fromPositions: [string, number, number][],
  toPositions: [string, number, number][],
  sampleCount: number,
): PathSample[] {
  const toMap = new Map<string, [number, number]>();
  for (const [id, x, y] of toPositions) {
    toMap.set(id, [x, y]);
  }

  const paths: PathSample[] = [];
  const clampedSamples = Math.max(2, Math.min(sampleCount, 100));

  for (const [id, fromX, fromY] of fromPositions) {
    const to = toMap.get(id);
    if (!to) continue;

    const [toX, toY] = to;
    const points: { x: number; y: number }[] = [];

    for (let s = 0; s <= clampedSamples; s++) {
      const t = s / clampedSamples;
      points.push({
        x: fromX + (toX - fromX) * t,
        y: fromY + (toY - fromY) * t,
      });
    }

    paths.push({ performerId: id, points });
  }

  return paths;
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  try {
    let response: WorkerResponse;

    switch (msg.type) {
      case 'collisionCheck': {
        const collisions = detectCollisions(msg.positions, msg.minDistance);
        response = { type: 'collisionCheck', requestId: msg.requestId, collisions };
        break;
      }
      case 'bulkStepSizes': {
        const results = computeBulkStepSizes(
          msg.positions,
          msg.nextPositions,
          msg.fieldConfig,
          msg.counts,
        );
        response = { type: 'bulkStepSizes', requestId: msg.requestId, results };
        break;
      }
      case 'pathCalculation': {
        const paths = computePaths(msg.fromPositions, msg.toPositions, msg.sampleCount);
        response = { type: 'pathCalculation', requestId: msg.requestId, paths };
        break;
      }
      default:
        response = {
          type: 'error',
          requestId: (msg as { requestId?: string }).requestId ?? 'unknown',
          error: `Unknown message type: ${(msg as { type: string }).type}`,
        };
    }

    self.postMessage(response);
  } catch (err) {
    const errorResponse: ErrorResponse = {
      type: 'error',
      requestId: msg.requestId ?? 'unknown',
      error: err instanceof Error ? err.message : 'Worker computation failed',
    };
    self.postMessage(errorResponse);
  }
};
