/**
 * CanvasRenderer Performance Benchmark
 *
 * Tests that the Canvas2D batch rendering path can handle 200+ performers
 * within the 50ms budget. This exercises batchRenderPerformers directly
 * (the hot path) as well as the position pre-computation that feeds it.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { batchRenderPerformers } from '../CanvasRenderer';

// ============================================================================
// Test Helpers
// ============================================================================

/** Generate N performer positions spread across the canvas */
function generatePerformers(count: number) {
  const performers: Array<{
    id: string;
    name: string;
    label: string;
    color: string;
    group?: string;
  }> = [];

  const positions = new Map<string, { x: number; y: number; rotation?: number }>();

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4',
  ];

  for (let i = 0; i < count; i++) {
    const id = `perf-${i}`;
    performers.push({
      id,
      name: `Performer ${i + 1}`,
      label: `${i + 1}`,
      color: colors[i % colors.length],
    });
    positions.set(id, {
      x: (i % 20) * 5 + Math.random() * 2,
      y: Math.floor(i / 20) * 8 + Math.random() * 2,
      rotation: Math.random() * 360,
    });
  }

  return { performers, positions };
}

/** Pre-compute batch data the same way PerformerCanvasLayer does */
function computeBatchData(
  performers: Array<{ id: string; name: string; label: string; color: string }>,
  positions: Map<string, { x: number; y: number }>,
  excludeIds: Set<string>,
  canvasWidth: number,
  canvasHeight: number,
) {
  const result: Array<{
    color: string;
    label: string;
    name: string;
    pixelX: number;
    pixelY: number;
  }> = [];

  for (const performer of performers) {
    if (excludeIds.has(performer.id)) continue;
    const pos = positions.get(performer.id);
    if (!pos) continue;
    result.push({
      color: performer.color,
      label: performer.label,
      name: performer.name,
      pixelX: (pos.x / 100) * canvasWidth,
      pixelY: (pos.y / 100) * canvasHeight,
    });
  }

  return result;
}

// ============================================================================
// Mock Canvas2D Context
// ============================================================================

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    beginPath: () => {},
    moveTo: () => {},
    arc: () => {},
    fill: () => {},
    fillText: () => {},
    clearRect: () => {},
    scale: () => {},
    save: () => {},
    restore: () => {},
    // Add remaining methods as no-ops to satisfy the type
  } as unknown as CanvasRenderingContext2D;
}

// ============================================================================
// Performance Tests
// ============================================================================

describe('CanvasRenderer Performance', () => {
  const PERFORMER_COUNT = 200;
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 900;
  const MARKER_RADIUS = 16;
  const TARGET_MS = 50;

  let testData: ReturnType<typeof generatePerformers>;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    testData = generatePerformers(PERFORMER_COUNT);
    mockCtx = createMockContext();
  });

  test(`batch renders ${PERFORMER_COUNT} performers under ${TARGET_MS}ms`, () => {
    const batchData = computeBatchData(
      testData.performers,
      testData.positions,
      new Set(),
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    expect(batchData).toHaveLength(PERFORMER_COUNT);

    // Warm up
    batchRenderPerformers(mockCtx, batchData, MARKER_RADIUS, true, 1);

    // Timed run - measure 10 iterations for stable timing
    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      batchRenderPerformers(mockCtx, batchData, MARKER_RADIUS, true, 1);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `batchRenderPerformers: ${PERFORMER_COUNT} performers, avg ${avgMs.toFixed(2)}ms/render (${iterations} iterations, total ${elapsed.toFixed(2)}ms)`,
    );

    expect(avgMs).toBeLessThan(TARGET_MS);
  });

  test(`position pre-computation for ${PERFORMER_COUNT} performers under ${TARGET_MS}ms`, () => {
    const excludeIds = new Set<string>();

    // Warm up
    computeBatchData(testData.performers, testData.positions, excludeIds, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Timed run
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      computeBatchData(testData.performers, testData.positions, excludeIds, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `computeBatchData: ${PERFORMER_COUNT} performers, avg ${avgMs.toFixed(3)}ms/call (${iterations} iterations)`,
    );

    expect(avgMs).toBeLessThan(TARGET_MS);
  });

  test(`batch render with labels disabled under ${TARGET_MS}ms`, () => {
    const batchData = computeBatchData(
      testData.performers,
      testData.positions,
      new Set(),
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    // Warm up
    batchRenderPerformers(mockCtx, batchData, MARKER_RADIUS, false, 1);

    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      batchRenderPerformers(mockCtx, batchData, MARKER_RADIUS, false, 1);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `batchRenderPerformers (no labels): avg ${avgMs.toFixed(2)}ms/render`,
    );

    expect(avgMs).toBeLessThan(TARGET_MS);
  });

  test(`handles 500 performers within ${TARGET_MS}ms`, () => {
    const largeData = generatePerformers(500);
    const batchData = computeBatchData(
      largeData.performers,
      largeData.positions,
      new Set(),
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    expect(batchData).toHaveLength(500);

    // Warm up
    batchRenderPerformers(mockCtx, batchData, MARKER_RADIUS, true, 1);

    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      batchRenderPerformers(mockCtx, batchData, MARKER_RADIUS, true, 1);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `batchRenderPerformers: 500 performers, avg ${avgMs.toFixed(2)}ms/render`,
    );

    expect(avgMs).toBeLessThan(TARGET_MS);
  });

  test('correctly excludes selected performers from batch', () => {
    const excludeIds = new Set(['perf-0', 'perf-5', 'perf-10']);
    const batchData = computeBatchData(
      testData.performers,
      testData.positions,
      excludeIds,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    expect(batchData).toHaveLength(PERFORMER_COUNT - 3);
    expect(batchData.every(p => !['1', '6', '11'].includes(p.label))).toBe(true);
  });

  test('empty performer list renders without error', () => {
    expect(() => {
      batchRenderPerformers(mockCtx, [], MARKER_RADIUS, true, 1);
    }).not.toThrow();
  });

  test('color batching groups performers by color', () => {
    // Track fillStyle changes and beginPath calls
    let fillStyleChanges = 0;
    let beginPathCalls = 0;
    let lastFillStyle = '';

    const trackingCtx = {
      ...mockCtx,
      set fillStyle(value: string) {
        if (value !== lastFillStyle) {
          fillStyleChanges++;
          lastFillStyle = value;
        }
      },
      get fillStyle() {
        return lastFillStyle;
      },
      beginPath() {
        beginPathCalls++;
      },
    } as unknown as CanvasRenderingContext2D;

    const batchData = computeBatchData(
      testData.performers,
      testData.positions,
      new Set(),
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    batchRenderPerformers(trackingCtx, batchData, MARKER_RADIUS, false, 1);

    // With 10 colors and 200 performers, we should have exactly 10 fill style changes
    // (one per color group) and 10 beginPath calls, NOT 200.
    expect(beginPathCalls).toBe(10);
    expect(fillStyleChanges).toBeLessThanOrEqual(10);
  });
});
