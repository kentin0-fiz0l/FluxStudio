/**
 * useFormationWorker - React hook for the formation Web Worker
 *
 * Manages the worker lifecycle and exposes Promise-based APIs for
 * offloading heavy computation (collision detection, step-size
 * calculation, path interpolation) from the main thread.
 *
 * Each hook instance creates one dedicated worker. The worker is
 * terminated on unmount to prevent leaks.
 *
 * Usage:
 *   const { requestCollisionCheck, requestBulkStepSizes } = useFormationWorker();
 *
 *   const collisions = await requestCollisionCheck(positions, 1.5);
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Position, FieldConfig } from '../../services/formationTypes';

// ============================================================================
// Response types (must match formationWorker.ts)
// ============================================================================

export interface CollisionPair {
  idA: string;
  idB: string;
  distance: number;
}

export interface StepSizeResult {
  performerId: string;
  distanceYards: number;
  stepSize: number;
  stepSizeLabel: string;
  difficulty: 'easy' | 'moderate' | 'hard';
}

export interface PathSample {
  performerId: string;
  points: { x: number; y: number }[];
}

// ============================================================================
// Internal helpers
// ============================================================================

let nextRequestId = 0;

function generateRequestId(): string {
  return `req-${++nextRequestId}-${Date.now()}`;
}

/**
 * Serialize a Map<string, Position> into an array of [id, x, y] tuples
 * that can be transferred to the worker via postMessage (Maps are not
 * structured-cloneable in all environments).
 */
function serializePositions(
  positions: Map<string, Position>,
): [string, number, number][] {
  const result: [string, number, number][] = [];
  for (const [id, pos] of positions) {
    result.push([id, pos.x, pos.y]);
  }
  return result;
}

// ============================================================================
// Hook
// ============================================================================

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export function useFormationWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const mountedRef = useRef(true);

  // Create worker on mount, terminate on unmount
  useEffect(() => {
    mountedRef.current = true;

    const worker = new Worker(
      new URL('../workers/formationWorker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent) => {
      const { requestId } = e.data;
      const pending = pendingRef.current.get(requestId);
      if (!pending) return;

      pendingRef.current.delete(requestId);

      if (e.data.type === 'error') {
        pending.reject(new Error(e.data.error));
      } else {
        pending.resolve(e.data);
      }
    };

    worker.onerror = (err) => {
      // Reject all pending requests on worker error
      for (const [, pending] of pendingRef.current) {
        pending.reject(new Error(err.message || 'Worker error'));
      }
      pendingRef.current.clear();
    };

    workerRef.current = worker;

    return () => {
      mountedRef.current = false;
      worker.terminate();
      workerRef.current = null;

      // Reject any still-pending requests
      for (const [, pending] of pendingRef.current) {
        pending.reject(new Error('Worker terminated'));
      }
      pendingRef.current.clear();
    };
  }, []);

  /**
   * Post a message to the worker and return a promise that resolves
   * when the worker responds with a matching requestId.
   */
  const postRequest = useCallback(
    <T>(message: Record<string, unknown>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error('Formation worker not initialized'));
          return;
        }

        const requestId = generateRequestId();
        pendingRef.current.set(requestId, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });

        worker.postMessage({ ...message, requestId });
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Detect collisions between all performer pairs.
   * Returns pairs that are closer than `minDistance` (in 0-100 normalized units).
   */
  const requestCollisionCheck = useCallback(
    (positions: Map<string, Position>, minDistance: number): Promise<CollisionPair[]> => {
      return postRequest<{ collisions: CollisionPair[] }>({
        type: 'collisionCheck',
        positions: serializePositions(positions),
        minDistance,
      }).then((res) => res.collisions);
    },
    [postRequest],
  );

  /**
   * Compute step sizes in bulk for all performers transitioning from
   * `positions` to `nextPositions` over `counts` beats.
   */
  const requestBulkStepSizes = useCallback(
    (
      positions: Map<string, Position>,
      nextPositions: Map<string, Position>,
      fieldConfig: FieldConfig,
      counts: number,
    ): Promise<StepSizeResult[]> => {
      return postRequest<{ results: StepSizeResult[] }>({
        type: 'bulkStepSizes',
        positions: serializePositions(positions),
        nextPositions: serializePositions(nextPositions),
        fieldConfig,
        counts,
      }).then((res) => res.results);
    },
    [postRequest],
  );

  /**
   * Calculate interpolated transition paths for all performers.
   * Returns `sampleCount + 1` points per performer along the linear path.
   */
  const requestPathCalculation = useCallback(
    (
      fromPositions: Map<string, Position>,
      toPositions: Map<string, Position>,
      sampleCount: number,
    ): Promise<PathSample[]> => {
      return postRequest<{ paths: PathSample[] }>({
        type: 'pathCalculation',
        fromPositions: serializePositions(fromPositions),
        toPositions: serializePositions(toPositions),
        sampleCount,
      }).then((res) => res.paths);
    },
    [postRequest],
  );

  return {
    requestCollisionCheck,
    requestBulkStepSizes,
    requestPathCalculation,
  };
}
