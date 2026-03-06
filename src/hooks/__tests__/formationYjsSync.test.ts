/**
 * Formation Yjs Sync Integration Tests
 *
 * Tests real Yjs CRDT synchronization between two Y.Doc instances
 * using Y.applyUpdate to simulate WebSocket transport. No mocks —
 * these verify the actual merge behavior the collab server relies on.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  FORMATION_YJS_TYPES,
  getFormationRoomName,
  yMapToPerformer,
  yMapToKeyframe,
  yMapToFormationMeta,
  performerToYMapEntries,
  keyframeToYMapEntries,
} from '@/services/formation/yjs/formationYjsTypes';
import type { Performer, Position, Keyframe } from '@/services/formationService';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Connect two Y.Docs so updates propagate bidirectionally,
 * simulating what y-websocket does over the network.
 */
function connectDocs(docA: Y.Doc, docB: Y.Doc): () => void {
  const handleA = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') {
      Y.applyUpdate(docB, update, 'remote');
    }
  };
  const handleB = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') {
      Y.applyUpdate(docA, update, 'remote');
    }
  };

  docA.on('update', handleA);
  docB.on('update', handleB);

  // Sync existing state
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA), 'remote');
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB), 'remote');

  return () => {
    docA.off('update', handleA);
    docB.off('update', handleB);
  };
}

/** Seed a Y.Doc with formation metadata and performers. */
function seedFormation(doc: Y.Doc, opts?: {
  id?: string;
  name?: string;
  performers?: Performer[];
  keyframes?: Array<{ id: string; timestamp: number; positions: Map<string, Position> }>;
}) {
  const {
    id = 'formation-1',
    name = 'Test Formation',
    performers = [
      { id: 'p1', name: 'Alice', label: 'A', color: '#FF0000' },
      { id: 'p2', name: 'Bob', label: 'B', color: '#00FF00' },
    ],
    keyframes = [{
      id: 'kf1',
      timestamp: 0,
      positions: new Map<string, Position>([
        ['p1', { x: 10, y: 20, rotation: 0 }],
        ['p2', { x: 30, y: 40, rotation: 0 }],
      ]),
    }],
  } = opts ?? {};

  doc.transact(() => {
    const meta = doc.getMap(FORMATION_YJS_TYPES.META);
    meta.set('id', id);
    meta.set('name', name);
    meta.set('projectId', 'project-1');
    meta.set('stageWidth', 40);
    meta.set('stageHeight', 30);
    meta.set('gridSize', 5);

    const perfMap = doc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    performers.forEach((p) => {
      const yp = new Y.Map();
      performerToYMapEntries(p).forEach(([k, v]) => yp.set(k, v));
      perfMap.set(p.id, yp);
    });

    const kfArray = doc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
    keyframes.forEach((kf) => {
      const ykf = new Y.Map();
      ykf.set('id', kf.id);
      ykf.set('timestamp', kf.timestamp);
      ykf.set('transition', 'linear');
      ykf.set('duration', 500);
      const ypos = new Y.Map();
      kf.positions.forEach((pos, pid) => {
        ypos.set(pid, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
      });
      ykf.set(FORMATION_YJS_TYPES.POSITIONS, ypos);
      kfArray.push([ykf]);
    });
  });
}

/** Read all performers from a Y.Doc */
function readPerformers(doc: Y.Doc): Performer[] {
  const perfMap = doc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
  const result: Performer[] = [];
  perfMap.forEach((val) => {
    result.push(yMapToPerformer(val as Y.Map<unknown>));
  });
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

/** Read all keyframes from a Y.Doc */
function readKeyframes(doc: Y.Doc): Keyframe[] {
  const kfArray = doc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
  const result: Keyframe[] = [];
  for (let i = 0; i < kfArray.length; i++) {
    result.push(yMapToKeyframe(kfArray.get(i) as Y.Map<unknown>));
  }
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

// ============================================================================
// Tests
// ============================================================================

describe('Formation Yjs Sync (real CRDT)', () => {
  let docA: Y.Doc;
  let docB: Y.Doc;
  let disconnect: () => void;

  beforeEach(() => {
    docA = new Y.Doc();
    docB = new Y.Doc();
  });

  afterEach(() => {
    disconnect?.();
    docA.destroy();
    docB.destroy();
  });

  // --------------------------------------------------------------------------
  // 1. Performer sync
  // --------------------------------------------------------------------------

  describe('Performer sync between two docs', () => {
    it('should sync performer addition from doc A to doc B', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Both should start with 2 performers
      expect(readPerformers(docA)).toHaveLength(2);
      expect(readPerformers(docB)).toHaveLength(2);

      // Add performer in doc A
      docA.transact(() => {
        const perfMap = docA.getMap(FORMATION_YJS_TYPES.PERFORMERS);
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'p3', name: 'Charlie', label: 'C', color: '#0000FF' })
          .forEach(([k, v]) => yp.set(k, v));
        perfMap.set('p3', yp);
      });

      // Doc B should now have 3 performers
      const bPerformers = readPerformers(docB);
      expect(bPerformers).toHaveLength(3);
      expect(bPerformers.find(p => p.id === 'p3')?.name).toBe('Charlie');
    });

    it('should sync performer removal from doc B to doc A', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      expect(readPerformers(docA)).toHaveLength(2);

      // Remove performer in doc B
      docB.transact(() => {
        const perfMap = docB.getMap(FORMATION_YJS_TYPES.PERFORMERS);
        perfMap.delete('p1');
      });

      // Doc A should now have 1 performer
      const aPerformers = readPerformers(docA);
      expect(aPerformers).toHaveLength(1);
      expect(aPerformers[0].id).toBe('p2');
    });

    it('should handle concurrent additions from both docs', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Both add performers simultaneously
      docA.transact(() => {
        const perfMap = docA.getMap(FORMATION_YJS_TYPES.PERFORMERS);
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'p3', name: 'From-A', label: 'A+', color: '#111' })
          .forEach(([k, v]) => yp.set(k, v));
        perfMap.set('p3', yp);
      });

      docB.transact(() => {
        const perfMap = docB.getMap(FORMATION_YJS_TYPES.PERFORMERS);
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'p4', name: 'From-B', label: 'B+', color: '#222' })
          .forEach(([k, v]) => yp.set(k, v));
        perfMap.set('p4', yp);
      });

      // Both docs should have 4 performers
      expect(readPerformers(docA)).toHaveLength(4);
      expect(readPerformers(docB)).toHaveLength(4);

      // Same performer IDs in both
      const idsA = readPerformers(docA).map(p => p.id).sort();
      const idsB = readPerformers(docB).map(p => p.id).sort();
      expect(idsA).toEqual(idsB);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Position sync
  // --------------------------------------------------------------------------

  describe('Position sync between two docs', () => {
    it('should sync position updates on different performers', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Doc A moves p1, Doc B moves p2
      docA.transact(() => {
        const kfArray = docA.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
        const kf = kfArray.get(0) as Y.Map<unknown>;
        const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<unknown>;
        positions.set('p1', { x: 99, y: 99, rotation: 0 });
      });

      docB.transact(() => {
        const kfArray = docB.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
        const kf = kfArray.get(0) as Y.Map<unknown>;
        const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<unknown>;
        positions.set('p2', { x: 11, y: 11, rotation: 45 });
      });

      // Both docs should see both position changes
      const kfA = readKeyframes(docA)[0];
      const kfB = readKeyframes(docB)[0];

      expect(kfA.positions.get('p1')).toEqual({ x: 99, y: 99, rotation: 0 });
      expect(kfA.positions.get('p2')).toEqual({ x: 11, y: 11, rotation: 45 });
      expect(kfB.positions.get('p1')).toEqual({ x: 99, y: 99, rotation: 0 });
      expect(kfB.positions.get('p2')).toEqual({ x: 11, y: 11, rotation: 45 });
    });

    it('should resolve concurrent position updates on the SAME performer (last-write-wins per field)', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Both docs update p1 position — Yjs Y.Map uses last-write-wins
      // Because the entire position object is stored as a single value in
      // the positions map, one of the two updates will win.
      docA.transact(() => {
        const kfArray = docA.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
        const kf = kfArray.get(0) as Y.Map<unknown>;
        const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<unknown>;
        positions.set('p1', { x: 100, y: 100, rotation: 0 });
      });

      docB.transact(() => {
        const kfArray = docB.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
        const kf = kfArray.get(0) as Y.Map<unknown>;
        const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<unknown>;
        positions.set('p1', { x: 200, y: 200, rotation: 0 });
      });

      // Both docs should converge to the same value
      const posA = readKeyframes(docA)[0].positions.get('p1');
      const posB = readKeyframes(docB)[0].positions.get('p1');
      expect(posA).toEqual(posB);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Keyframe sync
  // --------------------------------------------------------------------------

  describe('Keyframe sync between two docs', () => {
    it('should sync keyframe addition from doc A to doc B', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Add keyframe in doc A
      docA.transact(() => {
        const kfArray = docA.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
        const ykf = new Y.Map();
        ykf.set('id', 'kf2');
        ykf.set('timestamp', 1000);
        ykf.set('transition', 'ease');
        ykf.set('duration', 800);
        const ypos = new Y.Map();
        ypos.set('p1', { x: 50, y: 50, rotation: 0 });
        ypos.set('p2', { x: 60, y: 60, rotation: 0 });
        ykf.set(FORMATION_YJS_TYPES.POSITIONS, ypos);
        kfArray.push([ykf]);
      });

      // Doc B should have 2 keyframes
      const kfB = readKeyframes(docB);
      expect(kfB).toHaveLength(2);
      expect(kfB[1].id).toBe('kf2');
      expect(kfB[1].positions.get('p1')).toEqual({ x: 50, y: 50, rotation: 0 });
    });

    it('should sync keyframe removal from doc B to doc A', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      expect(readKeyframes(docA)).toHaveLength(1);

      // Remove keyframe in doc B
      docB.transact(() => {
        const kfArray = docB.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
        kfArray.delete(0, 1);
      });

      expect(readKeyframes(docA)).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Undo/redo isolation
  // --------------------------------------------------------------------------

  describe('Undo/redo isolation between users', () => {
    it('should undo only local changes, not remote changes', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Create undo managers scoped to each doc
      const perfA = docA.getMap(FORMATION_YJS_TYPES.PERFORMERS);
      const perfB = docB.getMap(FORMATION_YJS_TYPES.PERFORMERS);

      const undoA = new Y.UndoManager([perfA], { trackedOrigins: new Set([null]) });
      const undoB = new Y.UndoManager([perfB], { trackedOrigins: new Set([null]) });

      // User A adds a performer
      docA.transact(() => {
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'pA', name: 'From-A', label: 'XA', color: '#AAA' })
          .forEach(([k, v]) => yp.set(k, v));
        perfA.set('pA', yp);
      });

      // User B adds a performer
      docB.transact(() => {
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'pB', name: 'From-B', label: 'XB', color: '#BBB' })
          .forEach(([k, v]) => yp.set(k, v));
        perfB.set('pB', yp);
      });

      // Both docs should have 4 performers (2 original + 2 new)
      expect(readPerformers(docA)).toHaveLength(4);
      expect(readPerformers(docB)).toHaveLength(4);

      // User A undoes — should only remove pA, not pB
      undoA.undo();

      const afterUndo = readPerformers(docA);
      expect(afterUndo).toHaveLength(3);
      expect(afterUndo.find(p => p.id === 'pA')).toBeUndefined();
      expect(afterUndo.find(p => p.id === 'pB')).toBeDefined();

      // Same view in doc B
      expect(readPerformers(docB)).toHaveLength(3);

      undoA.destroy();
      undoB.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Offline reconnection
  // --------------------------------------------------------------------------

  describe('Offline reconnection', () => {
    it('should merge changes made while disconnected', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      // Verify initial sync
      expect(readPerformers(docB)).toHaveLength(2);

      // Disconnect
      disconnect();

      // Both make changes while offline
      docA.transact(() => {
        const perfMap = docA.getMap(FORMATION_YJS_TYPES.PERFORMERS);
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'pOfflineA', name: 'Offline-A', label: 'OA', color: '#AAA' })
          .forEach(([k, v]) => yp.set(k, v));
        perfMap.set('pOfflineA', yp);
      });

      docB.transact(() => {
        const perfMap = docB.getMap(FORMATION_YJS_TYPES.PERFORMERS);
        const yp = new Y.Map();
        performerToYMapEntries({ id: 'pOfflineB', name: 'Offline-B', label: 'OB', color: '#BBB' })
          .forEach(([k, v]) => yp.set(k, v));
        perfMap.set('pOfflineB', yp);
      });

      // Doc A has 3 (2 + pOfflineA), Doc B has 3 (2 + pOfflineB)
      expect(readPerformers(docA)).toHaveLength(3);
      expect(readPerformers(docB)).toHaveLength(3);

      // Reconnect — merge offline changes
      disconnect = connectDocs(docA, docB);

      // Both should have 4 (2 original + both offline additions)
      expect(readPerformers(docA)).toHaveLength(4);
      expect(readPerformers(docB)).toHaveLength(4);

      const idsA = readPerformers(docA).map(p => p.id).sort();
      const idsB = readPerformers(docB).map(p => p.id).sort();
      expect(idsA).toEqual(idsB);
      expect(idsA).toContain('pOfflineA');
      expect(idsA).toContain('pOfflineB');
    });

    it('should preserve state through simulated page reload via state encoding', () => {
      seedFormation(docA);

      // Encode state (simulates IndexedDB save)
      const savedState = Y.encodeStateAsUpdate(docA);

      // Create a fresh doc (simulates page reload)
      const docReloaded = new Y.Doc();
      Y.applyUpdate(docReloaded, savedState);

      // Should have same data
      const performers = readPerformers(docReloaded);
      expect(performers).toHaveLength(2);
      expect(performers.map(p => p.id).sort()).toEqual(['p1', 'p2']);

      const keyframes = readKeyframes(docReloaded);
      expect(keyframes).toHaveLength(1);
      expect(keyframes[0].positions.get('p1')).toEqual({ x: 10, y: 20, rotation: 0 });

      docReloaded.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Metadata sync
  // --------------------------------------------------------------------------

  describe('Metadata sync', () => {
    it('should sync formation name change', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      docA.transact(() => {
        const meta = docA.getMap(FORMATION_YJS_TYPES.META);
        meta.set('name', 'Renamed Formation');
      });

      const metaB = yMapToFormationMeta(docB.getMap(FORMATION_YJS_TYPES.META));
      expect(metaB.name).toBe('Renamed Formation');
    });

    it('should sync stage dimension changes', () => {
      seedFormation(docA);
      disconnect = connectDocs(docA, docB);

      docB.transact(() => {
        const meta = docB.getMap(FORMATION_YJS_TYPES.META);
        meta.set('stageWidth', 80);
        meta.set('stageHeight', 60);
      });

      const metaA = yMapToFormationMeta(docA.getMap(FORMATION_YJS_TYPES.META));
      expect(metaA.stageWidth).toBe(80);
      expect(metaA.stageHeight).toBe(60);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Type conversion roundtrip
  // --------------------------------------------------------------------------

  describe('Type conversion roundtrip', () => {
    it('should roundtrip performer through Yjs and back', () => {
      const original: Performer = { id: 'px', name: 'Test', label: 'T', color: '#ABCDEF', group: 'brass' };

      const doc = new Y.Doc();
      doc.transact(() => {
        const perfMap = doc.getMap('test-performers');
        const yMap = new Y.Map();
        performerToYMapEntries(original).forEach(([k, v]) => yMap.set(k, v));
        perfMap.set('px', yMap);
      });

      const yMap = doc.getMap('test-performers').get('px') as Y.Map<unknown>;
      const restored = yMapToPerformer(yMap);
      expect(restored).toEqual(original);
      doc.destroy();
    });

    it('should roundtrip keyframe with positions through Yjs and back', () => {
      const doc = new Y.Doc();
      const positions = new Map<string, Position>([
        ['p1', { x: 10, y: 20, rotation: 45 }],
        ['p2', { x: 30, y: 40, rotation: 0 }],
      ]);

      doc.transact(() => {
        const yKeyframe = new Y.Map();
        keyframeToYMapEntries({
          id: 'kfx',
          timestamp: 5000,
          transition: 'ease-in-out',
          duration: 800,
          positions,
        }).forEach(([k, v]) => yKeyframe.set(k, v));

        const yPositions = new Y.Map();
        positions.forEach((pos, pid) => {
          yPositions.set(pid, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
        });
        yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

        const kfArray = doc.getArray('test-kf');
        kfArray.push([yKeyframe]);
      });

      const restored = yMapToKeyframe(doc.getArray('test-kf').get(0) as Y.Map<unknown>);
      expect(restored.id).toBe('kfx');
      expect(restored.timestamp).toBe(5000);
      expect(restored.transition).toBe('ease-in-out');
      expect(restored.duration).toBe(800);
      expect(restored.positions.get('p1')).toEqual({ x: 10, y: 20, rotation: 45 });
      expect(restored.positions.get('p2')).toEqual({ x: 30, y: 40, rotation: 0 });

      doc.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 8. Room name utilities
  // --------------------------------------------------------------------------

  describe('Room name utilities', () => {
    it('should generate correct room name', () => {
      expect(getFormationRoomName('proj-1', 'form-1')).toBe('project-proj-1-formation-form-1');
    });
  });
});
