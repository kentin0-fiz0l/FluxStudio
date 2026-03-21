/**
 * BatchingManager - Batches rapid Y.Doc position updates using requestAnimationFrame.
 *
 * Queues position updates and flushes them in a single Y.Doc.transact() call
 * on the next animation frame (or when the queue exceeds a threshold).
 *
 * Dynamic batch window scales with collaborator count:
 *   - <5 collaborators: 16ms (single rAF)
 *   - 5-10 collaborators: 50ms
 *   - 10+ collaborators: 100ms
 */

import * as Y from 'yjs';
import { FORMATION_YJS_TYPES, type YjsPosition } from './formationYjsTypes';

/** Queued position update */
interface PositionUpdate {
  keyframeId: string;
  performerId: string;
  position: { x: number; y: number; rotation: number };
}

/** Batch window thresholds based on collaborator count */
const BATCH_WINDOW_LOW = 16;   // <5 collaborators (single rAF)
const BATCH_WINDOW_MID = 50;   // 5-10 collaborators
const BATCH_WINDOW_HIGH = 100; // 10+ collaborators

/** Maximum queue size before forcing a flush */
const QUEUE_FLUSH_THRESHOLD = 50;

/**
 * Manages batched position updates for a Y.Doc.
 *
 * @example
 * ```ts
 * const batcher = createBatchingManager(doc);
 * batcher.enqueue('kf-1', 'p-1', { x: 10, y: 20, rotation: 0 });
 * batcher.enqueue('kf-1', 'p-2', { x: 30, y: 40, rotation: 0 });
 * // Both updates flush in a single transact() on next rAF
 * ```
 */
export class BatchingManager {
  private doc: Y.Doc;
  private queue: PositionUpdate[] = [];
  private rafId: number | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private collaboratorCount = 0;
  private destroyed = false;

  constructor(doc: Y.Doc) {
    this.doc = doc;
  }

  /**
   * Set the current collaborator count to adjust batch window dynamically.
   */
  setCollaboratorCount(count: number): void {
    this.collaboratorCount = count;
  }

  /**
   * Get the current batch window in milliseconds based on collaborator count.
   */
  getBatchWindowMs(): number {
    if (this.collaboratorCount >= 10) return BATCH_WINDOW_HIGH;
    if (this.collaboratorCount >= 5) return BATCH_WINDOW_MID;
    return BATCH_WINDOW_LOW;
  }

  /**
   * Enqueue a position update. The update will be flushed on the next
   * animation frame or when the queue exceeds the threshold.
   */
  enqueue(keyframeId: string, performerId: string, position: { x: number; y: number; rotation: number }): void {
    if (this.destroyed) return;

    // Deduplicate: if the same keyframe+performer is already queued, replace it
    const existingIndex = this.queue.findIndex(
      (u) => u.keyframeId === keyframeId && u.performerId === performerId
    );
    if (existingIndex !== -1) {
      this.queue[existingIndex] = { keyframeId, performerId, position };
    } else {
      this.queue.push({ keyframeId, performerId, position });
    }

    // Force flush if queue is large
    if (this.queue.length >= QUEUE_FLUSH_THRESHOLD) {
      this.flush();
      return;
    }

    // Schedule flush
    this.scheduleFlush();
  }

  /**
   * Enqueue multiple position updates for the same keyframe.
   */
  enqueueBatch(keyframeId: string, positions: Map<string, { x: number; y: number; rotation: number }>): void {
    if (this.destroyed) return;

    positions.forEach((position, performerId) => {
      const existingIndex = this.queue.findIndex(
        (u) => u.keyframeId === keyframeId && u.performerId === performerId
      );
      if (existingIndex !== -1) {
        this.queue[existingIndex] = { keyframeId, performerId, position };
      } else {
        this.queue.push({ keyframeId, performerId, position });
      }
    });

    if (this.queue.length >= QUEUE_FLUSH_THRESHOLD) {
      this.flush();
      return;
    }

    this.scheduleFlush();
  }

  /**
   * Immediately flush all queued updates in a single Y.Doc transaction.
   */
  flush(): void {
    if (this.queue.length === 0) return;

    this.cancelScheduled();

    const updates = this.queue.splice(0);
    const keyframes = this.doc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    this.doc.transact(() => {
      // Group updates by keyframe for efficiency
      const byKeyframe = new Map<string, PositionUpdate[]>();
      for (const update of updates) {
        const existing = byKeyframe.get(update.keyframeId);
        if (existing) {
          existing.push(update);
        } else {
          byKeyframe.set(update.keyframeId, [update]);
        }
      }

      // Apply each group
      for (const [keyframeId, posUpdates] of byKeyframe) {
        for (let i = 0; i < keyframes.length; i++) {
          const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
          if (yKeyframe.get('id') === keyframeId) {
            const yPositions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
            if (yPositions) {
              for (const u of posUpdates) {
                yPositions.set(u.performerId, u.position);
              }
            }
            break;
          }
        }
      }
    });
  }

  /**
   * Clean up all pending timers and animation frames.
   */
  destroy(): void {
    this.destroyed = true;
    this.cancelScheduled();
    // Flush remaining queue before destroying
    if (this.queue.length > 0) {
      this.flush();
    }
  }

  private scheduleFlush(): void {
    // Already scheduled
    if (this.rafId !== null || this.timerHandle !== null) return;

    const windowMs = this.getBatchWindowMs();

    if (windowMs <= 16) {
      // Use rAF for low-latency batching
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.flush();
      });
    } else {
      // Use setTimeout for higher-latency batching
      this.timerHandle = setTimeout(() => {
        this.timerHandle = null;
        this.flush();
      }, windowMs);
    }
  }

  private cancelScheduled(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timerHandle !== null) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }
}

/**
 * Factory function to create a BatchingManager for a Y.Doc.
 *
 * @param doc - The Yjs document to batch updates for
 * @returns A new BatchingManager instance
 */
export function createBatchingManager(doc: Y.Doc): BatchingManager {
  return new BatchingManager(doc);
}
