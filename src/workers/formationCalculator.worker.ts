/// <reference lib="webworker" />

/**
 * Formation Calculator Web Worker
 *
 * Offloads generic formation position calculations to a background thread.
 * Complements formationWorker.ts (marching-band-specific step sizes and
 * coordinate-sheet logic) with:
 *
 * - Constraint-based position adjustment (collision avoidance + bounds clamping)
 * - Lightweight collision detection with per-performer radius support
 * - Ease-in-out transition path generation
 *
 * Uses Vite-native worker pattern: import with `?worker` suffix.
 */

// ============================================================================
// Request Types
// ============================================================================

export interface CalculatePositionsRequest {
  type: 'calculatePositions';
  id: string;
  data: {
    performers: Array<{ id: string; x: number; y: number; radius?: number }>;
    targetPositions?: Array<{ id: string; x: number; y: number }>;
    constraints?: {
      minSpacing?: number;
      bounds?: { width: number; height: number };
      avoidCollisions?: boolean;
    };
  };
}

export interface CollisionDetectRequest {
  type: 'detectCollisions';
  id: string;
  data: {
    performers: Array<{ id: string; x: number; y: number; radius?: number }>;
    minSpacing: number;
  };
}

export interface TransitionPathRequest {
  type: 'calculateTransitionPaths';
  id: string;
  data: {
    startPositions: Array<{ id: string; x: number; y: number }>;
    endPositions: Array<{ id: string; x: number; y: number }>;
    steps: number;
  };
}

type WorkerRequest =
  | CalculatePositionsRequest
  | CollisionDetectRequest
  | TransitionPathRequest;

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { type, id, data } = event.data;

  switch (type) {
    case 'calculatePositions': {
      const result = calculatePositions(data);
      self.postMessage({ type: 'result', id, data: result });
      break;
    }
    case 'detectCollisions': {
      const collisions = detectCollisions(data.performers, data.minSpacing);
      self.postMessage({ type: 'result', id, data: { collisions } });
      break;
    }
    case 'calculateTransitionPaths': {
      const paths = calculateTransitionPaths(data);
      self.postMessage({ type: 'result', id, data: { paths } });
      break;
    }
  }
});

// ============================================================================
// Position Calculation (iterative relaxation)
// ============================================================================

function calculatePositions(data: CalculatePositionsRequest['data']) {
  const { performers, constraints } = data;
  const minSpacing = constraints?.minSpacing ?? 2;
  const bounds = constraints?.bounds;

  const adjusted = performers.map((p) => ({ ...p }));

  if (constraints?.avoidCollisions) {
    // Iterative relaxation to push overlapping performers apart
    for (let iter = 0; iter < 50; iter++) {
      let moved = false;
      for (let i = 0; i < adjusted.length; i++) {
        for (let j = i + 1; j < adjusted.length; j++) {
          const dx = adjusted[j].x - adjusted[i].x;
          const dy = adjusted[j].y - adjusted[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minSpacing && dist > 0) {
            const overlap = (minSpacing - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            adjusted[i].x -= nx * overlap;
            adjusted[i].y -= ny * overlap;
            adjusted[j].x += nx * overlap;
            adjusted[j].y += ny * overlap;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }

    // Clamp to bounds
    if (bounds) {
      for (const p of adjusted) {
        p.x = Math.max(0, Math.min(bounds.width, p.x));
        p.y = Math.max(0, Math.min(bounds.height, p.y));
      }
    }
  }

  return { positions: adjusted };
}

// ============================================================================
// Collision Detection (radius-aware)
// ============================================================================

function detectCollisions(
  performers: Array<{ id: string; x: number; y: number; radius?: number }>,
  minSpacing: number,
) {
  const collisions: Array<{ a: string; b: string; distance: number }> = [];

  for (let i = 0; i < performers.length; i++) {
    for (let j = i + 1; j < performers.length; j++) {
      const dx = performers[j].x - performers[i].x;
      const dy = performers[j].y - performers[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const requiredDist =
        minSpacing + (performers[i].radius || 0) + (performers[j].radius || 0);

      if (dist < requiredDist) {
        collisions.push({
          a: performers[i].id,
          b: performers[j].id,
          distance: dist,
        });
      }
    }
  }

  return collisions;
}

// ============================================================================
// Transition Path Generation (ease-in-out)
// ============================================================================

function calculateTransitionPaths(data: TransitionPathRequest['data']) {
  const { startPositions, endPositions, steps } = data;
  const paths: Record<string, Array<{ x: number; y: number }>> = {};

  for (const start of startPositions) {
    const end = endPositions.find((e) => e.id === start.id);
    if (!end) continue;

    const path: Array<{ x: number; y: number }> = [];
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      // Ease-in-out cubic interpolation
      const eased =
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      path.push({
        x: start.x + (end.x - start.x) * eased,
        y: start.y + (end.y - start.y) * eased,
      });
    }
    paths[start.id] = path;
  }

  return paths;
}
