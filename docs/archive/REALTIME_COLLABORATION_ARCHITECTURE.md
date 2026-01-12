# Real-time Collaboration Architecture
## FluxStudio Sprint 11 - Task 3

**Date**: October 13, 2025
**Sprint**: Sprint 11, Week 1
**Priority**: P0 (Must Have)
**Status**: Architecture Design Complete

---

## Executive Summary

This document outlines the architecture for implementing real-time collaborative editing in FluxStudio. After comprehensive research into CRDT (Conflict-free Replicated Data Types) and Operational Transformation approaches, we recommend **Yjs CRDT** as the foundation for FluxStudio's collaboration features.

### Key Decision: Yjs CRDT

**Rationale**:
- Battle-tested in production (Apple Notes, Redis, Facebook Apollo)
- Network-agnostic architecture (works with WebSocket, WebRTC, or any transport)
- Excellent offline support (critical for creative workflows)
- Strong TypeScript support and React integrations
- Built-in Awareness API for presence/cursor tracking
- No central source of truth required (distributed-first design)
- Better suited for creative/design tools (vs OT's text-editor focus)

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                    FluxStudio Client (React)                     │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │ UI Components│  │ Yjs Provider │  │ Awareness (Presence)   │ │
│  │ (Canvas,     │◄─┤ (WebSocket)  │◄─┤ (Cursors, Selection,  │ │
│  │  Sidebar,    │  │              │  │  Active Users)         │ │
│  │  Properties) │  └─────┬────────┘  └────────────────────────┘ │
│  └──────────────┘        │                                       │
│          │               │                                       │
│          │               │                                       │
│          ▼               ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┤
│  │            Y.Doc (Shared CRDT Document)                      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  │ Y.Map    │  │ Y.Array  │  │ Y.Text   │  │ Y.Map    │   │
│  │  │(Project) │  │(Elements)│  │(Content) │  │(Metadata)│   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────┬──────────────────────┬──────────────────┘
                      │                      │
                      │  WebSocket Protocol  │
                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 FluxStudio Server (Node.js)                      │
│  ┌──────────────────────────────────────────────────────────────┤
│  │          Yjs WebSocket Server (y-websocket)                  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  │ Room Manager │  │ Persistence  │  │ Awareness    │      │
│  │  │ (Projects)   │  │ (Database)   │  │ Broadcast    │      │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │
│  └──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┤
│  │                 Redis Cache Layer                            │
│  │  - Active room state                                         │
│  │  - Connected users per room                                  │
│  │  - Recent document snapshots                                 │
│  └──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┤
│  │              PostgreSQL Database                             │
│  │  - Document history (snapshots)                              │
│  │  - Collaboration permissions                                 │
│  │  - User activity logs                                        │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Technology Stack

### Core Libraries

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| CRDT Library | **Yjs** | ^13.6.x | Conflict-free data synchronization |
| Network Provider | **y-websocket** | ^1.5.x | WebSocket-based sync protocol |
| React Binding | **y-react** | ^0.1.x | React hooks for Yjs integration |
| Awareness | **y-protocols** | ^1.0.x | Presence and cursor tracking |
| Persistence | **y-indexeddb** | ^9.0.x | Client-side offline storage |

### Supporting Infrastructure

- **WebSocket Server**: Socket.IO (already in FluxStudio)
- **State Management**: Zustand (already in FluxStudio)
- **Redis Cache**: For room state and presence
- **PostgreSQL**: For document snapshots and history

---

## 2. Shared Data Model

### Y.Doc Structure for FluxStudio Projects

```typescript
// Project Document Schema
interface FluxStudioYDoc {
  // Top-level project metadata
  project: Y.Map<{
    id: string;
    name: string;
    lastModified: number;
    version: number;
  }>;

  // Canvas elements (layers, shapes, text, images)
  elements: Y.Array<{
    id: string;
    type: 'rectangle' | 'circle' | 'text' | 'image' | 'group';
    properties: Y.Map<any>;
    children?: Y.Array<string>; // IDs for grouped elements
  }>;

  // Text content for text elements
  textContent: Y.Map<{ [elementId: string]: Y.Text }>;

  // Layer structure and ordering
  layers: Y.Array<{
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    elementIds: string[];
  }>;

  // Artboards/Pages
  artboards: Y.Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    elementIds: string[];
  }>;

  // Comments and annotations
  comments: Y.Array<{
    id: string;
    userId: string;
    elementId?: string;
    position: { x: number; y: number };
    text: Y.Text;
    resolved: boolean;
    createdAt: number;
  }>;

  // Design system (colors, typography, components)
  designSystem: Y.Map<{
    colors: Y.Array<{ name: string; value: string }>;
    typography: Y.Array<{ name: string; style: object }>;
    components: Y.Array<{ id: string; name: string; definition: Y.Map }>;
  }>;
}
```

### Shared Type Usage Patterns

#### 1. **Y.Map** - Key-value data
- Project metadata
- Element properties
- Design system definitions

#### 2. **Y.Array** - Ordered lists
- Canvas elements (z-index order matters)
- Layers stack
- Comments thread

#### 3. **Y.Text** - Rich text editing
- Text element content
- Comment text
- Descriptions

---

## 3. Network Architecture

### WebSocket Protocol

```
┌──────────┐                                    ┌──────────┐
│ Client A │                                    │ Client B │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ 1. Connect to /collab/:projectId             │
     │────────────────────┐                         │
     │                    ▼                         │
     │          ┌───────────────────┐               │
     │          │  WebSocket Server │               │
     │          │   (Room: P-123)   │               │
     │          └───────────────────┘               │
     │                    │                         │
     │ 2. Sync full state │                         │
     │◄───────────────────┤                         │
     │                    │                         │
     │ 3. Send update     │                         │
     ├───────────────────►│                         │
     │                    │ 4. Broadcast to room    │
     │                    ├────────────────────────►│
     │                    │                         │
     │                    │ 5. Client B updates     │
     │                    │◄────────────────────────┤
     │                    │                         │
     │ 6. Broadcast ack   │                         │
     │◄───────────────────┤                         │
     │                    │                         │
```

### Connection Flow

1. **Client connects**: `ws://fluxstudio.art/collab/:projectId`
2. **Authentication**: Verify user has access to project (JWT token)
3. **Initial Sync**: Server sends current Y.Doc state to client
4. **Awareness Setup**: Client broadcasts presence (cursor, name, color)
5. **Update Loop**:
   - Client makes local change → Yjs generates update
   - Update sent to server via WebSocket
   - Server broadcasts update to all connected clients in room
   - Other clients apply update to their Y.Doc

### Message Protocol

```typescript
// Yjs Update Message
{
  type: 'sync',
  room: 'project-123',
  data: Uint8Array // Yjs binary update
}

// Awareness Update (Presence)
{
  type: 'awareness',
  room: 'project-123',
  data: {
    userId: 'user-456',
    name: 'Alice',
    color: '#3B82F6',
    cursor: { x: 420, y: 350 },
    selection: ['element-789'],
    lastActive: 1728787200
  }
}

// Room Join
{
  type: 'join',
  room: 'project-123',
  userId: 'user-456',
  token: 'jwt-token...'
}

// Room Leave
{
  type: 'leave',
  room: 'project-123',
  userId: 'user-456'
}
```

---

## 4. Presence & Awareness System

### Awareness API

Yjs provides an Awareness CRDT for ephemeral collaboration state (doesn't need to be persisted).

```typescript
import { Awareness } from 'y-protocols/awareness';

const awareness = new Awareness(ydoc);

// Set local user state
awareness.setLocalState({
  user: {
    id: currentUser.id,
    name: currentUser.name,
    avatar: currentUser.avatar,
    color: assignUserColor(currentUser.id), // e.g., from palette
  },
  cursor: { x: 0, y: 0 },
  selection: [], // Selected element IDs
  viewport: { x: 0, y: 0, zoom: 1 }, // Current view
  activeElement: null, // Currently editing element
  tool: 'select', // Current tool (select, pen, text, etc.)
});

// Listen to other users' state changes
awareness.on('change', (changes) => {
  // changes.added: new users joined
  // changes.updated: existing users changed state
  // changes.removed: users left

  const states = Array.from(awareness.getStates().values());
  // Update UI to show all users' cursors, selections, etc.
});
```

### Cursor Tracking Implementation

#### Optimized Cursor Updates

To avoid overwhelming the network, cursor positions are throttled:

```typescript
import { throttle } from 'lodash';

const updateCursor = throttle((x: number, y: number) => {
  awareness.setLocalStateField('cursor', { x, y });
}, 50); // 50ms = ~20 updates/second

// React canvas mouse handler
const handleCanvasMouseMove = (e: React.MouseEvent) => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  updateCursor(x, y);
};
```

#### Cursor Rendering

```tsx
// CursorOverlay.tsx
const CursorOverlay: React.FC = () => {
  const awareness = useAwareness();
  const [cursors, setCursors] = useState<Map<number, AwarenessState>>(new Map());

  useEffect(() => {
    const updateCursors = () => {
      const states = awareness.getStates();
      setCursors(new Map(states));
    };

    awareness.on('change', updateCursors);
    return () => awareness.off('change', updateCursors);
  }, [awareness]);

  return (
    <div className="cursor-overlay">
      {Array.from(cursors.entries()).map(([clientId, state]) => {
        if (!state.cursor || clientId === awareness.clientID) return null;

        return (
          <Cursor
            key={clientId}
            x={state.cursor.x}
            y={state.cursor.y}
            color={state.user.color}
            name={state.user.name}
          />
        );
      })}
    </div>
  );
};
```

### Active User List

```tsx
const ActiveUsers: React.FC = () => {
  const awareness = useAwareness();
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    const updateUsers = () => {
      const states = Array.from(awareness.getStates().values());
      const activeUsers = states
        .filter((s) => s.user)
        .map((s) => s.user);
      setUsers(activeUsers);
    };

    awareness.on('change', updateUsers);
    return () => awareness.off('change', updateUsers);
  }, [awareness]);

  return (
    <div className="active-users">
      {users.map((user) => (
        <Avatar
          key={user.id}
          name={user.name}
          avatar={user.avatar}
          color={user.color}
          title={`${user.name} is viewing`}
        />
      ))}
    </div>
  );
};
```

---

## 5. Conflict Resolution Strategy

### CRDT Automatic Merging

Yjs CRDTs handle most conflicts automatically:

```typescript
// Example: Two users edit the same text element simultaneously

// User A types "Hello"
textElement.insert(0, 'Hello');

// User B types "World" (at the same position, before seeing A's edit)
textElement.insert(0, 'World');

// Result after Yjs merge: "WorldHello" or "HelloWorld"
// Order determined by Lamport timestamps + client IDs
// NO CONFLICTS - both edits preserved
```

### Intent Preservation

For complex operations, we add **intent metadata**:

```typescript
// Bad: Direct property mutation (loses intent)
element.properties.set('width', 500);

// Good: Operation with intent
const operation = {
  type: 'resize',
  elementId: element.id,
  intent: 'drag-handle', // vs 'constraint-adjust' vs 'numeric-input'
  oldValue: { width: 300, height: 200 },
  newValue: { width: 500, height: 333 }, // Maintains aspect ratio
  timestamp: Date.now(),
  userId: currentUser.id,
};

// Apply operation and log for undo/redo
applyOperation(ydoc, operation);
historyManager.push(operation);
```

### Last-Write-Wins for Specific Properties

Some properties use LWW (Last-Write-Wins) semantics:

```typescript
// Properties that should use LWW:
const LWW_PROPERTIES = [
  'name',           // Project/element name
  'visible',        // Layer visibility
  'locked',         // Layer lock state
  'resolved',       // Comment resolution
  'activeArtboard', // Current artboard view
];

// Implementation using Y.Map with timestamps
const setLWWProperty = (map: Y.Map, key: string, value: any) => {
  const current = map.get(key);
  const now = Date.now();

  if (!current || current.timestamp < now) {
    map.set(key, { value, timestamp: now });
  }
};
```

### Conflict UI Indicators

Visual feedback for simultaneous edits:

```tsx
const ElementWithConflictIndicator: React.FC<{ element: Element }> = ({ element }) => {
  const [isBeingEdited, setIsBeingEdited] = useState(false);
  const [editingUsers, setEditingUsers] = useState<string[]>([]);
  const awareness = useAwareness();

  useEffect(() => {
    const checkEditors = () => {
      const states = Array.from(awareness.getStates().values());
      const editors = states
        .filter((s) => s.activeElement === element.id)
        .map((s) => s.user.name);

      setEditingUsers(editors);
      setIsBeingEdited(editors.length > 0);
    };

    awareness.on('change', checkEditors);
    return () => awareness.off('change', checkEditors);
  }, [awareness, element.id]);

  return (
    <div className={`element ${isBeingEdited ? 'being-edited' : ''}`}>
      {/* Element content */}
      {isBeingEdited && (
        <div className="conflict-indicator">
          <span>{editingUsers.join(', ')} editing</span>
        </div>
      )}
    </div>
  );
};
```

---

## 6. Offline Support & Sync

### Client-side Persistence

```typescript
import { IndexeddbPersistence } from 'y-indexeddb';

// Store Y.Doc locally for offline editing
const indexeddbProvider = new IndexeddbPersistence('fluxstudio-project-123', ydoc);

indexeddbProvider.on('synced', () => {
  console.log('Local cache loaded');
});

// When back online, y-websocket will automatically sync changes
```

### Sync Strategy

1. **Always Local-First**: Changes apply to local Y.Doc immediately
2. **Background Sync**: Network sync happens asynchronously
3. **Offline Queue**: Updates queue when offline, send when reconnected
4. **Merge on Reconnect**: Yjs automatically merges offline changes with server state

### Connection State UI

```tsx
const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const provider = useYjsProvider();

  useEffect(() => {
    provider.on('status', (event: { status: string }) => {
      setStatus(event.status === 'connected' ? 'online' : 'offline');
    });

    provider.on('sync', (isSynced: boolean) => {
      setStatus(isSynced ? 'online' : 'syncing');
    });
  }, [provider]);

  return (
    <div className={`connection-status ${status}`}>
      {status === 'online' && '🟢 Connected'}
      {status === 'offline' && '🔴 Offline - changes will sync when reconnected'}
      {status === 'syncing' && '🟡 Syncing...'}
    </div>
  );
};
```

---

## 7. Performance Optimization

### Update Batching

```typescript
// Bad: Many small updates
elements.forEach((el) => {
  yElements.push([{ id: el.id, ... }]);
});

// Good: Single transaction
ydoc.transact(() => {
  elements.forEach((el) => {
    yElements.push([{ id: el.id, ... }]);
  });
});
// Result: One network message instead of N messages
```

### Selective Rendering

```tsx
// Only re-render when specific Y.Map keys change
const useYMapValue = <T,>(ymap: Y.Map<T>, key: string): T | undefined => {
  const [value, setValue] = useState(ymap.get(key));

  useEffect(() => {
    const observer = (event: Y.YMapEvent<T>) => {
      if (event.keysChanged.has(key)) {
        setValue(ymap.get(key));
      }
    };

    ymap.observe(observer);
    return () => ymap.unobserve(observer);
  }, [ymap, key]);

  return value;
};

// Usage: Only re-renders when 'name' changes, not other properties
const ElementName: React.FC<{ element: Y.Map }> = ({ element }) => {
  const name = useYMapValue(element, 'name');
  return <span>{name}</span>;
};
```

### Debounced Persistence

```typescript
import { debounce } from 'lodash';

// Save snapshots to database periodically, not on every change
const saveSnapshot = debounce(async (ydoc: Y.Doc) => {
  const state = Y.encodeStateAsUpdate(ydoc);
  await fetch('/api/projects/snapshot', {
    method: 'POST',
    body: state,
  });
}, 5000); // Save every 5 seconds max

ydoc.on('update', () => {
  saveSnapshot(ydoc);
});
```

---

## 8. Security & Permissions

### Access Control

```typescript
// Server-side: Verify user can access room
wsServer.on('connection', async (ws, req) => {
  const { projectId } = req.params;
  const token = req.headers.authorization;

  // Verify JWT and project access
  const user = await verifyToken(token);
  const hasAccess = await checkProjectAccess(user.id, projectId);

  if (!hasAccess) {
    ws.close(4403, 'Forbidden');
    return;
  }

  // Join room
  joinRoom(projectId, ws, user);
});
```

### Read-only Mode

```typescript
// Client-side: Disable editing for viewers
const useEditPermission = (projectId: string) => {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/permissions`)
      .then((res) => res.json())
      .then((perms) => setCanEdit(perms.canEdit));
  }, [projectId, user]);

  return canEdit;
};

// Disable Y.Doc updates if read-only
if (!canEdit) {
  ydoc.on('beforeAllTransactions', (transaction) => {
    if (transaction.origin !== 'remote') {
      throw new Error('Read-only mode');
    }
  });
}
```

### Rate Limiting

```typescript
// Prevent spam/abuse
const rateLimiter = new RateLimiter({
  points: 100, // 100 operations
  duration: 10, // per 10 seconds
});

ydoc.on('beforeTransaction', async (transaction) => {
  if (transaction.origin === 'local') {
    try {
      await rateLimiter.consume(currentUser.id);
    } catch (err) {
      throw new Error('Rate limit exceeded');
    }
  }
});
```

---

## 9. Monitoring & Analytics

### Collaboration Metrics

```typescript
// Track real-time collaboration usage
const trackCollaborationEvent = (event: {
  type: 'join' | 'leave' | 'edit' | 'cursor_move' | 'comment';
  projectId: string;
  userId: string;
  metadata?: object;
}) => {
  // Send to analytics (PostHog, Mixpanel, etc.)
  analytics.track('collaboration_event', {
    ...event,
    timestamp: Date.now(),
  });
};

// Metrics to track:
// - Concurrent users per project (peak, average)
// - Edit frequency (ops/minute)
// - Conflict resolution rate
// - Network latency (RTT for sync)
// - Offline edit sessions
```

### Health Checks

```typescript
// Server-side: Monitor WebSocket health
app.get('/api/collab/health', (req, res) => {
  const stats = {
    activeRooms: roomManager.getRoomCount(),
    connectedClients: wsServer.clients.size,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  };

  res.json(stats);
});

// Redis cache health
const cacheHealth = await cache.healthCheck();
```

---

## 10. Migration & Rollout Plan

### Phase 1: Infrastructure Setup (Week 1)

**Goals**:
- Install and configure Yjs packages
- Set up WebSocket server endpoint
- Create basic Y.Doc structure

**Tasks**:
1. Install dependencies:
   ```bash
   npm install yjs y-websocket y-indexeddb y-protocols
   ```

2. Create collaboration server (`server-collaboration.js`):
   ```javascript
   const { WebSocketServer } = require('ws');
   const { setupWSConnection } = require('y-websocket/bin/utils');

   const wss = new WebSocketServer({ port: 4000 });

   wss.on('connection', (ws, req) => {
     const docName = req.url.slice(1);
     setupWSConnection(ws, req, { docName });
   });
   ```

3. Deploy to production with PM2

**Success Criteria**:
- WebSocket server running and accepting connections
- Client can connect and sync basic Y.Doc
- Redis cache integration working

### Phase 2: Cursor Tracking Prototype (Week 1-2)

**Goals**:
- Implement awareness API
- Show real-time cursors on canvas
- Display active user list

**Tasks**:
1. Create `useAwareness` React hook
2. Build `CursorOverlay` component
3. Build `ActiveUsers` component
4. Throttle cursor updates (50ms)

**Success Criteria**:
- Multiple users can see each other's cursors in real-time
- Cursor position accurate on canvas
- User list updates when users join/leave

### Phase 3: Collaborative Editing (Week 2)

**Goals**:
- Sync canvas elements via Y.Array
- Enable simultaneous editing without conflicts
- Implement undo/redo with Yjs history

**Tasks**:
1. Migrate project state to Y.Doc schema
2. Replace Zustand state updates with Y.Doc transactions
3. Implement Y.UndoManager for undo/redo
4. Add optimistic UI updates

**Success Criteria**:
- Two users can edit same project simultaneously
- Changes sync in real-time (<100ms latency)
- No conflicts or data loss
- Undo/redo works across network sync

### Phase 4: Offline Support (Week 3)

**Goals**:
- Enable offline editing with local persistence
- Auto-sync when reconnected
- Show connection status to user

**Tasks**:
1. Implement IndexedDB persistence
2. Create connection status UI
3. Test offline → online → offline scenarios
4. Handle merge conflicts gracefully

**Success Criteria**:
- User can edit offline
- Changes persist locally
- Auto-sync when back online
- No data loss during offline periods

### Phase 5: Advanced Features (Week 3-4)

**Goals**:
- Commenting system
- Selection/highlighting of other users' work
- Real-time design system sync
- Collaboration analytics

**Tasks**:
1. Implement Y.Array for comments
2. Add selection awareness to cursors
3. Sync design system via Y.Map
4. Track collaboration metrics

**Success Criteria**:
- Users can leave comments on elements
- Users can see what others are selecting/editing
- Design system changes sync in real-time
- Analytics dashboard shows collaboration usage

---

## 11. Testing Strategy

### Unit Tests

```typescript
// test/yjs-integration.test.ts
import * as Y from 'yjs';

describe('Yjs CRDT behavior', () => {
  it('should merge concurrent text edits without conflicts', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const text1 = doc1.getText('shared');
    const text2 = doc2.getText('shared');

    // User 1 types "Hello"
    text1.insert(0, 'Hello');

    // User 2 types "World" (before seeing User 1's edit)
    text2.insert(0, 'World');

    // Sync docs
    const update1 = Y.encodeStateAsUpdate(doc1);
    const update2 = Y.encodeStateAsUpdate(doc2);
    Y.applyUpdate(doc2, update1);
    Y.applyUpdate(doc1, update2);

    // Both docs should converge to same state
    expect(text1.toString()).toBe(text2.toString());
  });
});
```

### Integration Tests

```typescript
// test/collaboration-e2e.test.ts
import { setupTestClients } from './helpers';

describe('Real-time collaboration', () => {
  it('should sync cursor positions between clients', async () => {
    const { client1, client2 } = await setupTestClients();

    // Client 1 moves cursor
    client1.awareness.setLocalStateField('cursor', { x: 100, y: 200 });

    // Wait for network sync
    await sleep(100);

    // Client 2 should see Client 1's cursor
    const states = client2.awareness.getStates();
    const client1State = Array.from(states.values())
      .find((s) => s.user.id === client1.userId);

    expect(client1State.cursor).toEqual({ x: 100, y: 200 });
  });

  it('should handle offline edits and merge on reconnect', async () => {
    const { client1, client2 } = await setupTestClients();

    // Disconnect client 2
    client2.disconnect();

    // Both clients edit
    client1.ydoc.getMap('project').set('name', 'Project A');
    client2.ydoc.getMap('project').set('name', 'Project B');

    // Reconnect client 2
    await client2.reconnect();
    await sleep(200);

    // Should merge (LWW: last writer wins)
    expect(client1.ydoc.getMap('project').get('name'))
      .toBe(client2.ydoc.getMap('project').get('name'));
  });
});
```

### Load Testing

```javascript
// test/load/collaboration-load-test.js
import { check } from 'k6';
import ws from 'k6/ws';

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // 10 concurrent users
    { duration: '3m', target: 50 },  // Ramp to 50
    { duration: '2m', target: 100 }, // Stress test with 100
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const url = 'ws://localhost:4000/project-test-123';

  ws.connect(url, (socket) => {
    socket.on('open', () => {
      // Simulate cursor movements
      setInterval(() => {
        const cursor = {
          x: Math.random() * 1920,
          y: Math.random() * 1080,
        };
        socket.send(JSON.stringify({ type: 'awareness', cursor }));
      }, 50);
    });

    socket.on('message', (data) => {
      check(data, {
        'received update': (d) => d.length > 0,
      });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 60000); // 1 minute per user
  });
}
```

---

## 12. Open Questions & Future Considerations

### Open Questions

1. **Scale**: How many concurrent users per project before performance degrades?
   - **Research Needed**: Load test with 10, 50, 100, 500 users
   - **Mitigation**: Implement room splitting if needed (e.g., artboard-based rooms)

2. **Storage**: How to efficiently store Y.Doc snapshots in PostgreSQL?
   - **Options**:
     - Store binary updates as BYTEA
     - Store snapshots periodically + incremental updates
     - Use external storage (S3) for large documents

3. **Version Control**: How to integrate with existing file version system?
   - **Approach**: Save Y.Doc snapshot as new version on manual save
   - **Conflict**: Auto-save vs manual save semantics

### Future Enhancements

1. **Voice/Video Chat**: Integrate WebRTC for voice during collaboration
2. **Co-editing Modes**: "Follow me" mode, presentation mode
3. **AI Assistant**: Shared AI suggestions visible to all users
4. **Time Travel**: Replay collaboration history
5. **Analytics Dashboard**: Collaboration heatmaps, contribution tracking
6. **Mobile Support**: Touch-optimized cursor/selection for iPad

---

## 13. Dependencies & Package Installation

### Required Packages

```json
{
  "dependencies": {
    "yjs": "^13.6.11",
    "y-websocket": "^1.5.3",
    "y-indexeddb": "^9.0.12",
    "y-protocols": "^1.0.6",
    "lib0": "^0.2.94"
  },
  "devDependencies": {
    "@types/yjs": "^13.6.0"
  }
}
```

### Installation Command

```bash
cd /Users/kentino/FluxStudio
npm install --legacy-peer-deps yjs y-websocket y-indexeddb y-protocols lib0
```

---

## 14. Success Metrics

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync Latency | <100ms p95 | Time from local edit to remote display |
| Cursor Update Rate | 20 updates/sec | Throttled to 50ms intervals |
| Reconnect Time | <2s | Time to re-sync after disconnect |
| Offline Sync | <5s | Time to merge offline changes |
| Memory Usage | <50MB per room | Server-side Y.Doc memory |
| Concurrent Users | 50+ per project | Before performance degradation |

### User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Awareness Accuracy | 100% | Cursor position reflects actual location |
| Conflict Rate | <1% of operations | Requiring manual resolution |
| Data Loss | 0% | No edits lost during offline/online transitions |
| User Adoption | 30%+ of projects | Percentage using collaboration |

---

## 15. Conclusion

This architecture provides a solid foundation for real-time collaborative editing in FluxStudio using Yjs CRDT technology. The phased rollout plan ensures incremental delivery with measurable success criteria at each stage.

### Key Takeaways

1. **Yjs CRDT** is the right choice for FluxStudio's creative collaboration needs
2. **WebSocket** provides low-latency real-time sync
3. **Awareness API** handles presence/cursor tracking out of the box
4. **Offline-first** design ensures great UX even with poor connectivity
5. **Incremental rollout** (4-week plan) minimizes risk

### Next Steps

1. ✅ Architecture design complete
2. ⏳ Get stakeholder approval
3. ⏳ Begin Phase 1 implementation (Week 1)
4. ⏳ Deploy cursor tracking prototype (Week 1-2)
5. ⏳ Full collaborative editing (Week 2-3)

---

**Document Status**: Complete
**Author**: Flux Studio Agent System
**Date**: October 13, 2025
**Sprint**: Sprint 11, Task 3
**Next Action**: Present to team and begin Phase 1 implementation
