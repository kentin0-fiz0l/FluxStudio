/**
 * Collaboration Stress Test
 *
 * Simulates 5+ concurrent Y.Doc peers editing the same formation
 * using REAL Y.Doc instances (not mocked) to validate actual CRDT merge behavior.
 *
 * Syncs docs via Y.applyUpdate() -- no WebSocket server needed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { FORMATION_YJS_TYPES } from '../../src/services/formation/yjs/formationYjsTypes';
import type { YjsPosition } from '../../src/services/formation/yjs/formationYjsTypes';

// ============================================================================
// Test Helpers
// ============================================================================

const PEER_COUNT = 5;

interface PeerContext {
  doc: Y.Doc;
  performers: Y.Map<Y.Map<unknown>>;
  keyframes: Y.Array<Y.Map<unknown>>;
  meta: Y.Map<unknown>;
  undoManager: Y.UndoManager;
}

/**
 * Create a peer with a fresh Y.Doc and references to the shared types.
 */
function createPeer(): PeerContext {
  const doc = new Y.Doc();
  const performers = doc.getMap<Y.Map<unknown>>(FORMATION_YJS_TYPES.PERFORMERS);
  const keyframes = doc.getArray<Y.Map<unknown>>(FORMATION_YJS_TYPES.KEYFRAMES);
  const meta = doc.getMap(FORMATION_YJS_TYPES.META);
  const undoManager = new Y.UndoManager([performers, keyframes], {
    trackedOrigins: new Set([null]),
  });
  return { doc, performers, keyframes, meta, undoManager };
}

/**
 * Origin marker for remote sync operations.
 * Used so that Y.UndoManager (which tracks null origin) does NOT track
 * updates applied from remote peers.
 */
const REMOTE_ORIGIN = 'remote-sync';

/**
 * Sync all peers by broadcasting each doc's state to all others.
 * Uses Y.encodeStateAsUpdate / Y.applyUpdate to simulate a sync round.
 * Applies updates with a 'remote-sync' origin so that per-user UndoManagers
 * only track locally-originated changes.
 */
function syncAllPeers(peers: PeerContext[]): void {
  // Full mesh sync: every peer sends its state to every other peer.
  // We repeat until convergence to handle transitive updates.
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < peers.length; i++) {
      const update = Y.encodeStateAsUpdate(peers[i].doc);
      for (let j = 0; j < peers.length; j++) {
        if (i !== j) {
          Y.applyUpdate(peers[j].doc, update, REMOTE_ORIGIN);
        }
      }
    }
  }
}

/**
 * Sync a single source peer to a single target peer.
 */
function syncPeerToTarget(source: PeerContext, target: PeerContext): void {
  const update = Y.encodeStateAsUpdate(source.doc);
  Y.applyUpdate(target.doc, update, REMOTE_ORIGIN);
}

/**
 * Add a performer to a peer's doc.
 */
function addPerformerToPeer(
  peer: PeerContext,
  id: string,
  name: string,
  color: string,
): void {
  peer.doc.transact(() => {
    const yPerformer = new Y.Map<unknown>();
    yPerformer.set('id', id);
    yPerformer.set('name', name);
    yPerformer.set('label', name.charAt(0));
    yPerformer.set('color', color);
    peer.performers.set(id, yPerformer);
  });
}

/**
 * Remove a performer from a peer's doc (including positions in all keyframes).
 */
function removePerformerFromPeer(peer: PeerContext, performerId: string): void {
  peer.doc.transact(() => {
    peer.performers.delete(performerId);
    for (let i = 0; i < peer.keyframes.length; i++) {
      const kf = peer.keyframes.get(i);
      const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition> | undefined;
      if (positions) {
        positions.delete(performerId);
      }
    }
  });
}

/**
 * Add a keyframe to a peer's doc.
 */
function addKeyframeToPeer(
  peer: PeerContext,
  id: string,
  timestamp: number,
  performerPositions: Array<{ performerId: string; x: number; y: number }>,
): void {
  peer.doc.transact(() => {
    const yKeyframe = new Y.Map<unknown>();
    yKeyframe.set('id', id);
    yKeyframe.set('timestamp', timestamp);
    yKeyframe.set('transition', 'linear');
    yKeyframe.set('duration', 500);

    const yPositions = new Y.Map<YjsPosition>();
    for (const p of performerPositions) {
      yPositions.set(p.performerId, { x: p.x, y: p.y, rotation: 0 });
    }
    yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

    peer.keyframes.push([yKeyframe]);
  });
}

/**
 * Move a performer within a keyframe on a specific peer.
 */
function movePerformerInKeyframe(
  peer: PeerContext,
  keyframeIndex: number,
  performerId: string,
  x: number,
  y: number,
): void {
  peer.doc.transact(() => {
    const kf = peer.keyframes.get(keyframeIndex);
    const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
    positions.set(performerId, { x, y, rotation: 0 });
  });
}

/**
 * Initialize a peer with formation metadata.
 */
function initializeMeta(peer: PeerContext, formationId: string): void {
  peer.doc.transact(() => {
    peer.meta.set('id', formationId);
    peer.meta.set('name', 'Test Formation');
    peer.meta.set('projectId', 'project-1');
    peer.meta.set('stageWidth', 40);
    peer.meta.set('stageHeight', 30);
    peer.meta.set('gridSize', 5);
    peer.meta.set('createdBy', 'test-user');
    peer.meta.set('createdAt', new Date().toISOString());
    peer.meta.set('updatedAt', new Date().toISOString());
  });
}

/**
 * Extract a snapshot of all performer IDs from a peer.
 */
function getPerformerIds(peer: PeerContext): string[] {
  const ids: string[] = [];
  peer.performers.forEach((_, key) => ids.push(key));
  return ids.sort();
}

/**
 * Extract a snapshot of all keyframe IDs from a peer.
 */
function getKeyframeIds(peer: PeerContext): string[] {
  const ids: string[] = [];
  for (let i = 0; i < peer.keyframes.length; i++) {
    const kf = peer.keyframes.get(i);
    ids.push(kf.get('id') as string);
  }
  return ids.sort();
}

/**
 * Extract all positions from a keyframe.
 */
function getPositionsFromKeyframe(
  peer: PeerContext,
  keyframeIndex: number,
): Map<string, YjsPosition> {
  const result = new Map<string, YjsPosition>();
  const kf = peer.keyframes.get(keyframeIndex);
  if (!kf) return result;
  const positions = kf.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition> | undefined;
  if (!positions) return result;
  positions.forEach((pos, key) => {
    result.set(key, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
  });
  return result;
}

// ============================================================================
// Tests
// ============================================================================

describe('Collaboration Stress Test - Real Y.Doc CRDT Merge', () => {
  let peers: PeerContext[];

  beforeEach(() => {
    peers = [];
    for (let i = 0; i < PEER_COUNT; i++) {
      peers.push(createPeer());
    }

    // Initialize the first peer with base formation data, then sync to all.
    initializeMeta(peers[0], 'formation-stress-test');

    // Add 5 performers via peer 0
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    for (let i = 0; i < 5; i++) {
      addPerformerToPeer(peers[0], `p${i}`, `Performer ${i}`, colors[i]);
    }

    // Add an initial keyframe with all performers at default positions
    addKeyframeToPeer(
      peers[0],
      'kf-initial',
      0,
      [0, 1, 2, 3, 4].map((i) => ({
        performerId: `p${i}`,
        x: 10 + i * 15,
        y: 50,
      })),
    );

    // Sync initial state to all peers
    syncAllPeers(peers);

    // Clear undo stacks so that the initial setup is not undoable.
    // This mirrors real-world usage where the undo manager is created
    // after the document is loaded from the server.
    for (const peer of peers) {
      peer.undoManager.clear();
    }
  });

  afterEach(() => {
    for (const peer of peers) {
      peer.undoManager.destroy();
      peer.doc.destroy();
    }
    peers = [];
  });

  // --------------------------------------------------------------------------
  // Test 1: Concurrent performer moves (5 users each moving a different performer)
  // --------------------------------------------------------------------------
  it('should converge when 5 peers each move a different performer concurrently', () => {
    // Each peer moves a different performer to a unique position (offline)
    for (let i = 0; i < PEER_COUNT; i++) {
      movePerformerInKeyframe(peers[i], 0, `p${i}`, 20 + i * 10, 30 + i * 5);
    }

    // Sync all peers
    syncAllPeers(peers);

    // All 5 docs should converge to the same positions
    const referencePositions = getPositionsFromKeyframe(peers[0], 0);
    expect(referencePositions.size).toBe(5);

    for (let i = 1; i < PEER_COUNT; i++) {
      const peerPositions = getPositionsFromKeyframe(peers[i], 0);
      expect(peerPositions.size).toBe(referencePositions.size);

      referencePositions.forEach((refPos, performerId) => {
        const peerPos = peerPositions.get(performerId);
        expect(peerPos).toBeDefined();
        expect(peerPos!.x).toBe(refPos.x);
        expect(peerPos!.y).toBe(refPos.y);
      });
    }

    // Verify each performer was moved to the expected position
    for (let i = 0; i < PEER_COUNT; i++) {
      const pos = referencePositions.get(`p${i}`);
      expect(pos).toBeDefined();
      expect(pos!.x).toBe(20 + i * 10);
      expect(pos!.y).toBe(30 + i * 5);
    }
  });

  // --------------------------------------------------------------------------
  // Test 2: Concurrent performer adds (3 users adding performers simultaneously)
  // --------------------------------------------------------------------------
  it('should merge when 3 peers add new performers concurrently', () => {
    // Each of 3 peers adds a new performer (offline)
    addPerformerToPeer(peers[0], 'p-new-A', 'Alice', '#AAA');
    addPerformerToPeer(peers[1], 'p-new-B', 'Bob', '#BBB');
    addPerformerToPeer(peers[2], 'p-new-C', 'Charlie', '#CCC');

    // Sync
    syncAllPeers(peers);

    // All peers should have 5 original + 3 new = 8 performers
    for (let i = 0; i < PEER_COUNT; i++) {
      const ids = getPerformerIds(peers[i]);
      expect(ids.length).toBe(8);
      expect(ids).toContain('p-new-A');
      expect(ids).toContain('p-new-B');
      expect(ids).toContain('p-new-C');
    }
  });

  // --------------------------------------------------------------------------
  // Test 3: Add + remove collision
  // --------------------------------------------------------------------------
  it('should handle add and remove collision for the same performer ID', () => {
    // Peer 0 adds a new performer
    addPerformerToPeer(peers[0], 'p-collision', 'Collision', '#FACE00');

    // Sync only peer 0 -> peer 1 so that peer 1 sees the performer
    syncPeerToTarget(peers[0], peers[1]);

    // Now peer 1 removes 'p-collision' while peer 0 is unaware
    removePerformerFromPeer(peers[1], 'p-collision');

    // Sync all
    syncAllPeers(peers);

    // After sync, CRDT semantics: the delete should win because it happened
    // after the add was observed. All peers should agree.
    const referenceIds = getPerformerIds(peers[0]);
    for (let i = 1; i < PEER_COUNT; i++) {
      expect(getPerformerIds(peers[i])).toEqual(referenceIds);
    }

    // The performer should be removed because the delete was applied after
    // the add was synced
    expect(referenceIds).not.toContain('p-collision');
  });

  // --------------------------------------------------------------------------
  // Test 4: Keyframe operations under concurrent editing
  // --------------------------------------------------------------------------
  it('should converge when peers concurrently add keyframes and update positions', () => {
    // Peer 0 adds a keyframe at t=1000
    addKeyframeToPeer(peers[0], 'kf-peer0', 1000, [
      { performerId: 'p0', x: 20, y: 20 },
      { performerId: 'p1', x: 40, y: 20 },
    ]);

    // Peer 1 adds a keyframe at t=2000
    addKeyframeToPeer(peers[1], 'kf-peer1', 2000, [
      { performerId: 'p2', x: 60, y: 60 },
      { performerId: 'p3', x: 80, y: 60 },
    ]);

    // Peer 2 updates position in the initial keyframe
    movePerformerInKeyframe(peers[2], 0, 'p4', 90, 90);

    // Peer 3 adds a keyframe at t=500
    addKeyframeToPeer(peers[3], 'kf-peer3', 500, [
      { performerId: 'p0', x: 15, y: 15 },
    ]);

    // Peer 4 also adds a keyframe at t=1500
    addKeyframeToPeer(peers[4], 'kf-peer4', 1500, [
      { performerId: 'p1', x: 55, y: 55 },
    ]);

    // Sync all
    syncAllPeers(peers);

    // All peers should have the same keyframe IDs
    const referenceKeyframeIds = getKeyframeIds(peers[0]);
    // Should have initial + 4 new = 5 keyframes
    expect(referenceKeyframeIds.length).toBe(5);
    expect(referenceKeyframeIds).toContain('kf-initial');
    expect(referenceKeyframeIds).toContain('kf-peer0');
    expect(referenceKeyframeIds).toContain('kf-peer1');
    expect(referenceKeyframeIds).toContain('kf-peer3');
    expect(referenceKeyframeIds).toContain('kf-peer4');

    for (let i = 1; i < PEER_COUNT; i++) {
      expect(getKeyframeIds(peers[i])).toEqual(referenceKeyframeIds);
    }

    // Verify p4 position was updated in the initial keyframe across all peers
    for (let i = 0; i < PEER_COUNT; i++) {
      // Find the initial keyframe (may be at different index due to array ordering)
      let initialKfIdx = -1;
      for (let k = 0; k < peers[i].keyframes.length; k++) {
        if (peers[i].keyframes.get(k).get('id') === 'kf-initial') {
          initialKfIdx = k;
          break;
        }
      }
      expect(initialKfIdx).toBeGreaterThanOrEqual(0);
      const positions = getPositionsFromKeyframe(peers[i], initialKfIdx);
      const p4Pos = positions.get('p4');
      expect(p4Pos).toBeDefined();
      expect(p4Pos!.x).toBe(90);
      expect(p4Pos!.y).toBe(90);
    }
  });

  // --------------------------------------------------------------------------
  // Test 5: Final state consistency across all 5 docs after sync
  // --------------------------------------------------------------------------
  it('should have identical state across all 5 docs after complex concurrent edits', () => {
    // Multiple concurrent operations
    // Peer 0: rename performer p0
    peers[0].doc.transact(() => {
      const p0 = peers[0].performers.get('p0');
      p0!.set('name', 'Lead');
    });

    // Peer 1: add a new performer and a new keyframe
    addPerformerToPeer(peers[1], 'p5', 'Performer 5', '#999');
    addKeyframeToPeer(peers[1], 'kf-extra', 3000, [
      { performerId: 'p5', x: 50, y: 50 },
    ]);

    // Peer 2: update position of p1 in initial keyframe
    movePerformerInKeyframe(peers[2], 0, 'p1', 77, 33);

    // Peer 3: update meta
    peers[3].doc.transact(() => {
      peers[3].meta.set('name', 'Renamed Formation');
    });

    // Peer 4: change performer p2 color
    peers[4].doc.transact(() => {
      const p2 = peers[4].performers.get('p2');
      p2!.set('color', '#AABBCC');
    });

    // Sync all
    syncAllPeers(peers);

    // Full state vector comparison: all peers should produce identical state
    const refState = Y.encodeStateAsUpdate(peers[0].doc);
    for (let i = 1; i < PEER_COUNT; i++) {
      // Apply reference state to peer i and peer i state to reference --
      // after this they must be identical
      Y.applyUpdate(peers[i].doc, refState);
      Y.applyUpdate(peers[0].doc, Y.encodeStateAsUpdate(peers[i].doc));
    }

    // Now verify structural equality
    const refPerformerIds = getPerformerIds(peers[0]);
    const refKeyframeIds = getKeyframeIds(peers[0]);

    for (let i = 1; i < PEER_COUNT; i++) {
      expect(getPerformerIds(peers[i])).toEqual(refPerformerIds);
      expect(getKeyframeIds(peers[i])).toEqual(refKeyframeIds);
    }

    // Verify specific values converged
    for (let i = 0; i < PEER_COUNT; i++) {
      // Performer p0 should be renamed to 'Lead'
      const p0 = peers[i].performers.get('p0');
      expect(p0!.get('name')).toBe('Lead');

      // Performer p2 should have updated color
      const p2 = peers[i].performers.get('p2');
      expect(p2!.get('color')).toBe('#AABBCC');

      // Formation name should be 'Renamed Formation'
      expect(peers[i].meta.get('name')).toBe('Renamed Formation');

      // New performer p5 should exist
      expect(peers[i].performers.has('p5')).toBe(true);
    }
  });

  // --------------------------------------------------------------------------
  // Test 6: No data corruption (all docs converge to same state)
  // --------------------------------------------------------------------------
  it('should produce identical state vectors across all peers after heavy concurrent writes', () => {
    // Each peer adds 3 performers and 2 keyframes simultaneously
    for (let peerIdx = 0; peerIdx < PEER_COUNT; peerIdx++) {
      for (let j = 0; j < 3; j++) {
        addPerformerToPeer(
          peers[peerIdx],
          `p-stress-${peerIdx}-${j}`,
          `Stress ${peerIdx}-${j}`,
          `#${peerIdx}${j}0000`,
        );
      }
      for (let j = 0; j < 2; j++) {
        addKeyframeToPeer(
          peers[peerIdx],
          `kf-stress-${peerIdx}-${j}`,
          (peerIdx + 1) * 1000 + j * 500,
          [
            {
              performerId: `p-stress-${peerIdx}-0`,
              x: peerIdx * 10,
              y: j * 20,
            },
          ],
        );
      }
    }

    // Sync
    syncAllPeers(peers);

    // Verify state vector equality by comparing encoded states after full sync
    // Use state vectors to verify convergence
    const sv0 = Y.encodeStateVector(peers[0].doc);
    for (let i = 1; i < PEER_COUNT; i++) {
      const svI = Y.encodeStateVector(peers[i].doc);
      // The diff from peer 0 to peer i should be empty (no missing updates)
      const diff0ToI = Y.encodeStateAsUpdate(peers[0].doc, svI);
      const diffITo0 = Y.encodeStateAsUpdate(peers[i].doc, sv0);

      // Apply any remaining diffs
      Y.applyUpdate(peers[i].doc, diff0ToI);
      Y.applyUpdate(peers[0].doc, diffITo0);
    }

    // After applying all diffs, verify structural equality
    const totalPerformers = 5 + PEER_COUNT * 3; // 5 original + 15 new
    const totalKeyframes = 1 + PEER_COUNT * 2; // 1 initial + 10 new

    for (let i = 0; i < PEER_COUNT; i++) {
      expect(getPerformerIds(peers[i]).length).toBe(totalPerformers);
      expect(getKeyframeIds(peers[i]).length).toBe(totalKeyframes);
    }

    // Cross-verify all peer states are identical
    const refIds = getPerformerIds(peers[0]);
    const refKfIds = getKeyframeIds(peers[0]);
    for (let i = 1; i < PEER_COUNT; i++) {
      expect(getPerformerIds(peers[i])).toEqual(refIds);
      expect(getKeyframeIds(peers[i])).toEqual(refKfIds);
    }
  });

  // --------------------------------------------------------------------------
  // Test 7: Undo isolation (one user's undo doesn't affect others)
  // --------------------------------------------------------------------------
  it('should isolate undo per-user so that one undo does not revert another user change', () => {
    // Peer 0 moves p0
    movePerformerInKeyframe(peers[0], 0, 'p0', 99, 99);

    // Peer 1 moves p1
    movePerformerInKeyframe(peers[1], 0, 'p1', 88, 88);

    // Sync so both peers see each other's changes
    syncAllPeers(peers);

    // Peer 0 undoes its own move of p0
    peers[0].undoManager.undo();

    // Sync again
    syncAllPeers(peers);

    // After undo and sync, p0 should be back at its original position,
    // but p1 should remain at (88, 88) -- peer 1's move should be unaffected
    for (let i = 0; i < PEER_COUNT; i++) {
      const positions = getPositionsFromKeyframe(peers[i], 0);

      // p0 should be reverted (back to original 10, 50)
      const p0Pos = positions.get('p0');
      expect(p0Pos).toBeDefined();
      expect(p0Pos!.x).toBe(10);
      expect(p0Pos!.y).toBe(50);

      // p1 should remain at peer 1's position (88, 88)
      const p1Pos = positions.get('p1');
      expect(p1Pos).toBeDefined();
      expect(p1Pos!.x).toBe(88);
      expect(p1Pos!.y).toBe(88);
    }
  });

  // --------------------------------------------------------------------------
  // Test 8: Presence/awareness state doesn't leak between users
  // --------------------------------------------------------------------------
  it('should keep awareness state isolated per Y.Doc instance', () => {
    // Yjs Awareness is tied to a Y.Doc clientID. Each Y.Doc has a unique
    // clientID. We verify that the clientIDs are distinct and that doc
    // state updates do not carry awareness metadata.
    const clientIds = new Set<number>();
    for (const peer of peers) {
      clientIds.add(peer.doc.clientID);
    }
    // All clientIDs should be unique
    expect(clientIds.size).toBe(PEER_COUNT);

    // Simulate setting "awareness-like" data on doc 0's meta as a custom field
    // (since real Awareness requires a Provider, we test isolation via
    // the Y.Doc shared types approach used in the hook)
    peers[0].doc.transact(() => {
      peers[0].meta.set('_awareness_user0', {
        cursor: { x: 10, y: 20 },
        selectedPerformerIds: ['p0'],
        draggingPerformerId: 'p0',
      });
    });

    peers[1].doc.transact(() => {
      peers[1].meta.set('_awareness_user1', {
        cursor: { x: 50, y: 60 },
        selectedPerformerIds: ['p1'],
        draggingPerformerId: null,
      });
    });

    // Sync
    syncAllPeers(peers);

    // Verify both awareness fields are present but contain distinct data
    for (const peer of peers) {
      const user0Awareness = peer.meta.get('_awareness_user0') as {
        cursor: { x: number; y: number };
        selectedPerformerIds: string[];
        draggingPerformerId: string | null;
      };
      const user1Awareness = peer.meta.get('_awareness_user1') as {
        cursor: { x: number; y: number };
        selectedPerformerIds: string[];
        draggingPerformerId: string | null;
      };

      // User 0 awareness
      expect(user0Awareness).toBeDefined();
      expect(user0Awareness.cursor.x).toBe(10);
      expect(user0Awareness.selectedPerformerIds).toEqual(['p0']);
      expect(user0Awareness.draggingPerformerId).toBe('p0');

      // User 1 awareness
      expect(user1Awareness).toBeDefined();
      expect(user1Awareness.cursor.x).toBe(50);
      expect(user1Awareness.selectedPerformerIds).toEqual(['p1']);
      expect(user1Awareness.draggingPerformerId).toBeNull();

      // Verify no cross-contamination: user0 cursor is NOT user1 cursor
      expect(user0Awareness.cursor.x).not.toBe(user1Awareness.cursor.x);
    }

    // Verify doc clientIDs are truly isolated -- modifying one doc's internal
    // state does not bleed into another doc via state vectors
    const sv0 = Y.encodeStateVector(peers[0].doc);
    const sv1 = Y.encodeStateVector(peers[1].doc);

    // After full sync, state vectors should be identical (same knowledge)
    // but clientIDs should differ
    expect(peers[0].doc.clientID).not.toBe(peers[1].doc.clientID);

    // State vectors encode which clientIDs have been seen. After full sync,
    // both should know about all 5 clients.
    // Decode state vectors to verify
    const decoded0 = Y.decodeStateVector(sv0);
    const decoded1 = Y.decodeStateVector(sv1);

    // Both should know about the same set of client IDs
    const keys0 = Array.from(decoded0.keys()).sort();
    const keys1 = Array.from(decoded1.keys()).sort();
    expect(keys0).toEqual(keys1);
  });

  // --------------------------------------------------------------------------
  // Test 9: Concurrent same-performer moves (conflict scenario)
  // --------------------------------------------------------------------------
  it('should converge when 2 peers move the same performer to different positions', () => {
    // Both peer 0 and peer 1 move p0 to different positions (offline)
    movePerformerInKeyframe(peers[0], 0, 'p0', 10, 10);
    movePerformerInKeyframe(peers[1], 0, 'p0', 90, 90);

    // Sync
    syncAllPeers(peers);

    // CRDT last-write-wins: all peers must agree, though which position
    // wins depends on internal Yjs ordering (based on clientID).
    // The key invariant is convergence, not which value wins.
    const refPos = getPositionsFromKeyframe(peers[0], 0).get('p0')!;
    expect(refPos).toBeDefined();

    for (let i = 1; i < PEER_COUNT; i++) {
      const peerPos = getPositionsFromKeyframe(peers[i], 0).get('p0')!;
      expect(peerPos.x).toBe(refPos.x);
      expect(peerPos.y).toBe(refPos.y);
    }
  });

  // --------------------------------------------------------------------------
  // Test 10: Large-scale stress -- 10 rounds of concurrent mutations
  // --------------------------------------------------------------------------
  it('should maintain consistency through 10 rounds of concurrent edits', () => {
    for (let round = 0; round < 10; round++) {
      // Each peer does something different each round
      const peerIdx = round % PEER_COUNT;
      const peer = peers[peerIdx];

      if (round % 3 === 0) {
        // Add a performer
        addPerformerToPeer(
          peer,
          `p-round-${round}`,
          `Round ${round}`,
          '#FFFFFF',
        );
      } else if (round % 3 === 1) {
        // Move a performer
        const performerToMove = `p${round % 5}`;
        movePerformerInKeyframe(peer, 0, performerToMove, round * 5, round * 3);
      } else {
        // Add a keyframe
        addKeyframeToPeer(peer, `kf-round-${round}`, round * 100, [
          { performerId: `p${round % 5}`, x: round * 2, y: round * 4 },
        ]);
      }

      // Sync after each round
      syncAllPeers(peers);
    }

    // Final convergence check
    const refPerformerIds = getPerformerIds(peers[0]);
    const refKeyframeIds = getKeyframeIds(peers[0]);

    for (let i = 1; i < PEER_COUNT; i++) {
      expect(getPerformerIds(peers[i])).toEqual(refPerformerIds);
      expect(getKeyframeIds(peers[i])).toEqual(refKeyframeIds);

      // Verify all positions match
      for (let k = 0; k < peers[i].keyframes.length; k++) {
        const refPositions = getPositionsFromKeyframe(peers[0], k);
        const peerPositions = getPositionsFromKeyframe(peers[i], k);
        expect(peerPositions.size).toBe(refPositions.size);
        refPositions.forEach((refPos, perfId) => {
          const peerPos = peerPositions.get(perfId);
          expect(peerPos).toBeDefined();
          expect(peerPos!.x).toBe(refPos.x);
          expect(peerPos!.y).toBe(refPos.y);
        });
      }
    }
  });

  // --------------------------------------------------------------------------
  // Test 11: Concurrent keyframe deletion and position update
  // --------------------------------------------------------------------------
  it('should handle concurrent keyframe deletion and position update', () => {
    // Add a second keyframe from peer 0 so we have something to delete
    addKeyframeToPeer(peers[0], 'kf-to-delete', 1000, [
      { performerId: 'p0', x: 50, y: 50 },
    ]);
    syncAllPeers(peers);

    // Now concurrently:
    // Peer 0 deletes the keyframe
    peers[0].doc.transact(() => {
      for (let i = 0; i < peers[0].keyframes.length; i++) {
        if (peers[0].keyframes.get(i).get('id') === 'kf-to-delete') {
          peers[0].keyframes.delete(i, 1);
          break;
        }
      }
    });

    // Peer 1 tries to update a position in that same keyframe
    // (peer 1 hasn't synced yet, so the keyframe still exists for it)
    for (let i = 0; i < peers[1].keyframes.length; i++) {
      if (peers[1].keyframes.get(i).get('id') === 'kf-to-delete') {
        const positions = peers[1].keyframes.get(i).get(
          FORMATION_YJS_TYPES.POSITIONS,
        ) as Y.Map<YjsPosition>;
        peers[1].doc.transact(() => {
          positions.set('p0', { x: 75, y: 75, rotation: 0 });
        });
        break;
      }
    }

    // Sync
    syncAllPeers(peers);

    // All peers should agree on the final state.
    // Yjs array delete removes the element; position updates on the deleted
    // element may still exist as tombstones but the keyframe array entry
    // should be deleted.
    const refKeyframeIds = getKeyframeIds(peers[0]);
    for (let i = 1; i < PEER_COUNT; i++) {
      expect(getKeyframeIds(peers[i])).toEqual(refKeyframeIds);
    }
  });
});
