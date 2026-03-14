/**
 * Formation Yjs Bridge - Connects to the collaboration server to read/write
 * formation data in Yjs CRDT documents.
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// ============================================================================
// Constants (mirror formationYjsTypes.ts without importing from main app)
// ============================================================================

const YJS_TYPES = {
  META: 'formation:meta',
  PERFORMERS: 'formation:performers',
  KEYFRAMES: 'formation:keyframes',
  SETS: 'formation:sets',
  POSITIONS: 'formation:positions',
} as const;

const COLLAB_SERVER_URL = process.env.COLLAB_SERVER_URL || 'ws://localhost:4000';

// ============================================================================
// Plain Object Types (standalone, no imports from main app)
// ============================================================================

export interface FormationPosition {
  x: number;
  y: number;
  rotation?: number;
}

export interface FormationPerformer {
  id: string;
  name: string;
  label: string;
  color: string;
  group?: string;
  instrument?: string;
  section?: string;
  drillNumber?: string;
}

export interface FormationKeyframe {
  id: string;
  timestamp: number;
  transition: string;
  duration: number;
  positions: Record<string, FormationPosition>;
}

export interface FormationMeta {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  stageWidth: number;
  stageHeight: number;
  gridSize: number;
}

export interface FormationDrillSet {
  id: string;
  name: string;
  label?: string;
  counts: number;
  keyframeId: string;
  notes?: string;
  rehearsalMark?: string;
  sortOrder: number;
}

export interface FormationState {
  meta: FormationMeta;
  performers: FormationPerformer[];
  keyframes: FormationKeyframe[];
  sets: FormationDrillSet[];
}

// ============================================================================
// Bridge Connection
// ============================================================================

interface BridgeConnection {
  doc: Y.Doc;
  provider: WebsocketProvider;
  roomId: string;
}

/** Pool of active connections keyed by roomId */
const connections = new Map<string, BridgeConnection>();

/**
 * Connect to a formation room and return the Yjs doc + provider.
 * Reuses existing connections for the same room.
 */
function getConnection(roomId: string): Promise<BridgeConnection> {
  const existing = connections.get(roomId);
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(COLLAB_SERVER_URL, roomId, doc);

    const timeout = setTimeout(() => {
      provider.destroy();
      doc.destroy();
      reject(new Error(`[MCP:Formation] Connection to room "${roomId}" timed out after 10s`));
    }, 10000);

    provider.on('sync', (synced: boolean) => {
      if (synced) {
        clearTimeout(timeout);

        // Set awareness state so the agent shows up as a collaborator
        provider.awareness.setLocalState({
          user: { id: 'flux-mcp-agent', name: 'FluxStudio AI', color: '#F59E0B' },
          isActive: true,
          lastActivity: Date.now(),
        });

        const conn: BridgeConnection = { doc, provider, roomId };
        connections.set(roomId, conn);
        console.log(`[MCP:Formation] Connected to room: ${roomId}`);
        resolve(conn);
      }
    });

    provider.on('connection-error', (event: Event) => {
      clearTimeout(timeout);
      provider.destroy();
      doc.destroy();
      reject(new Error(`[MCP:Formation] Connection error for room "${roomId}": ${event}`));
    });
  });
}

/**
 * Disconnect from a specific room.
 */
export function disconnect(roomId: string): void {
  const conn = connections.get(roomId);
  if (conn) {
    conn.provider.awareness.setLocalState(null);
    conn.provider.destroy();
    conn.doc.destroy();
    connections.delete(roomId);
    console.log(`[MCP:Formation] Disconnected from room: ${roomId}`);
  }
}

/**
 * Disconnect from all rooms.
 */
export function disconnectAll(): void {
  for (const roomId of connections.keys()) {
    disconnect(roomId);
  }
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Read the full formation state from a room.
 */
export async function getFormationState(roomId: string): Promise<FormationState> {
  const { doc } = await getConnection(roomId);

  const yMeta = doc.getMap(YJS_TYPES.META);
  const yPerformers = doc.getMap(YJS_TYPES.PERFORMERS);
  const yKeyframes = doc.getArray(YJS_TYPES.KEYFRAMES);
  const ySets = doc.getArray(YJS_TYPES.SETS);

  // Read meta
  const meta: FormationMeta = {
    id: (yMeta.get('id') as string) ?? '',
    name: (yMeta.get('name') as string) ?? '',
    projectId: (yMeta.get('projectId') as string) ?? '',
    description: yMeta.get('description') as string | undefined,
    stageWidth: (yMeta.get('stageWidth') as number) ?? 40,
    stageHeight: (yMeta.get('stageHeight') as number) ?? 30,
    gridSize: (yMeta.get('gridSize') as number) ?? 5,
  };

  // Read performers
  const performers: FormationPerformer[] = [];
  yPerformers.forEach((yPerf: unknown, _id: string) => {
    const pMap = yPerf as Y.Map<unknown>;
    performers.push({
      id: pMap.get('id') as string,
      name: pMap.get('name') as string,
      label: pMap.get('label') as string,
      color: pMap.get('color') as string,
      group: pMap.get('group') as string | undefined,
      instrument: pMap.get('instrument') as string | undefined,
      section: pMap.get('section') as string | undefined,
      drillNumber: pMap.get('drillNumber') as string | undefined,
    });
  });

  // Read keyframes
  const keyframes: FormationKeyframe[] = [];
  yKeyframes.forEach((yKf: unknown) => {
    const kfMap = yKf as Y.Map<unknown>;
    const positionsMap = kfMap.get(YJS_TYPES.POSITIONS) as Y.Map<unknown> | undefined;
    const positions: Record<string, FormationPosition> = {};

    if (positionsMap) {
      positionsMap.forEach((posData: unknown, performerId: string) => {
        const pos = posData as FormationPosition;
        positions[performerId] = { x: pos.x, y: pos.y, rotation: pos.rotation };
      });
    }

    keyframes.push({
      id: kfMap.get('id') as string,
      timestamp: kfMap.get('timestamp') as number,
      transition: (kfMap.get('transition') as string) ?? 'linear',
      duration: (kfMap.get('duration') as number) ?? 500,
      positions,
    });
  });

  // Read sets
  const sets: FormationDrillSet[] = [];
  ySets.forEach((ySet: unknown) => {
    const sMap = ySet as Y.Map<unknown>;
    sets.push({
      id: sMap.get('id') as string,
      name: sMap.get('name') as string,
      label: sMap.get('label') as string | undefined,
      counts: sMap.get('counts') as number,
      keyframeId: sMap.get('keyframeId') as string,
      notes: sMap.get('notes') as string | undefined,
      rehearsalMark: sMap.get('rehearsalMark') as string | undefined,
      sortOrder: sMap.get('sortOrder') as number,
    });
  });

  return { meta, performers, keyframes, sets };
}

/**
 * Get performers with positions at a specific keyframe.
 */
export async function getPerformersAtKeyframe(
  roomId: string,
  keyframeId?: string,
): Promise<{ performers: FormationPerformer[]; positions: Record<string, FormationPosition>; keyframeId: string }> {
  const state = await getFormationState(roomId);

  const targetKeyframe = keyframeId
    ? state.keyframes.find((kf) => kf.id === keyframeId)
    : state.keyframes[0];

  if (!targetKeyframe) {
    throw new Error(`Keyframe not found: ${keyframeId ?? '(first)'}`);
  }

  return {
    performers: state.performers,
    positions: targetKeyframe.positions,
    keyframeId: targetKeyframe.id,
  };
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Set performer positions at a specific keyframe.
 */
export async function setPositions(
  roomId: string,
  keyframeId: string,
  positions: Record<string, { x: number; y: number }>,
): Promise<void> {
  const { doc } = await getConnection(roomId);
  const yKeyframes = doc.getArray(YJS_TYPES.KEYFRAMES);

  doc.transact(() => {
    let found = false;
    yKeyframes.forEach((yKf: unknown) => {
      const kfMap = yKf as Y.Map<unknown>;
      if (kfMap.get('id') === keyframeId) {
        let positionsMap = kfMap.get(YJS_TYPES.POSITIONS) as Y.Map<unknown> | undefined;
        if (!positionsMap) {
          positionsMap = new Y.Map();
          kfMap.set(YJS_TYPES.POSITIONS, positionsMap);
        }
        for (const [performerId, pos] of Object.entries(positions)) {
          positionsMap.set(performerId, { x: pos.x, y: pos.y });
        }
        found = true;
      }
    });

    if (!found) {
      throw new Error(`Keyframe not found: ${keyframeId}`);
    }
  });
}

/**
 * Add a new keyframe and drill set.
 * Returns the ID of the new keyframe.
 */
export async function addKeyframe(
  roomId: string,
  keyframeId: string,
  name: string,
  counts: number,
  setId: string,
  afterKeyframeId?: string,
): Promise<void> {
  const { doc } = await getConnection(roomId);
  const yKeyframes = doc.getArray(YJS_TYPES.KEYFRAMES);
  const ySets = doc.getArray(YJS_TYPES.SETS);

  doc.transact(() => {
    // Determine timestamp and insert index for keyframe
    let insertIndex = yKeyframes.length;
    let timestamp = 0;

    if (afterKeyframeId) {
      yKeyframes.forEach((yKf: unknown, idx: number) => {
        const kfMap = yKf as Y.Map<unknown>;
        if (kfMap.get('id') === afterKeyframeId) {
          insertIndex = idx + 1;
          timestamp = (kfMap.get('timestamp') as number) + (kfMap.get('duration') as number || 500);
        }
      });
    } else if (yKeyframes.length > 0) {
      const lastKf = yKeyframes.get(yKeyframes.length - 1) as Y.Map<unknown>;
      timestamp = (lastKf.get('timestamp') as number) + (lastKf.get('duration') as number || 500);
    }

    // Create the keyframe Y.Map
    const newKf = new Y.Map();
    newKf.set('id', keyframeId);
    newKf.set('timestamp', timestamp);
    newKf.set('transition', 'linear');
    newKf.set('duration', 500);
    newKf.set(YJS_TYPES.POSITIONS, new Y.Map());
    yKeyframes.insert(insertIndex, [newKf]);

    // Create the associated drill set
    const newSet = new Y.Map();
    newSet.set('id', setId);
    newSet.set('name', name);
    newSet.set('counts', counts);
    newSet.set('keyframeId', keyframeId);
    newSet.set('sortOrder', insertIndex);
    ySets.push([newSet]);
  });
}
