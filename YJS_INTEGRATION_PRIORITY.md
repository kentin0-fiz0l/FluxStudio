# Yjs Integration Priority
## Closing the Real-Time Collaboration Gap

**Created:** December 31, 2025
**Priority:** P0 - Critical
**Timeline:** Q1 2026 (Sprints 17-22)
**Status:** Not Started (Architecture Designed, Zero Implementation)

---

## Current State Assessment

### What Exists:
- Yjs packages installed in `package.json`
- Comprehensive architecture documentation (`YJS_IMPLEMENTATION_GUIDE.md`)
- WebSocket collaboration server skeleton (`server-collaboration.js`)
- Socket.IO-based presence indicators

### What's Missing:
- **Zero Yjs code in React components**
- No Y.Doc initialization in any workspace/editor
- No Awareness API usage for real cursor tracking
- WebSocket server not authenticated or integrated with frontend
- Collaboration components use simulation/random data

### Vision Impact:
The core promise of "collaborative creation where art, design, and code flow as one process" **cannot be delivered** without this integration. This is the #1 technical gap blocking vision alignment.

---

## Implementation Priority Order

### Phase 1: MetMap Integration (Weeks 1-4)
**Goal:** Two users can simultaneously edit a MetMap song

**Why MetMap First:**
- Simpler data model (linear song structure)
- Already functional as standalone tool
- Lower risk for proving Yjs integration
- High visibility for stakeholders

**Deliverables:**

| Week | Deliverable | Success Criteria |
|------|-------------|------------------|
| 1 | useYjsProvider hook | Connection to collab server |
| 1 | Authentication handshake | JWT validated on WebSocket |
| 2 | MetMap Y.Doc binding | Song data syncs between tabs |
| 2 | Cursor awareness | See other user's cursor position |
| 3 | Section editing sync | Two users edit sections simultaneously |
| 3 | Conflict testing | No data loss in rapid concurrent edits |
| 4 | Offline sync | Changes queue when offline, sync when online |
| 4 | Performance testing | < 100ms latency at 10 concurrent users |

### Phase 2: Drill Writer Integration (Weeks 5-8)
**Goal:** Multiple users can collaboratively edit formations

**Why Drill Writer Second:**
- More complex data model (2D positions, keyframes)
- Requires canvas performance optimization
- Higher risk, but proven pattern from Phase 1

**Deliverables:**

| Week | Deliverable | Success Criteria |
|------|-------------|------------------|
| 5 | Formation Y.Doc schema | Positions sync between clients |
| 5 | Canvas cursor presence | See collaborator cursors on canvas |
| 6 | Selection awareness | Know what others are selecting |
| 6 | Real-time position updates | Performer moves visible in < 100ms |
| 7 | Undo/redo with Y.UndoManager | Undo own actions, not collaborators' |
| 7 | History panel integration | See who made what changes |
| 8 | Load testing | 10 concurrent editors, 200 performers |
| 8 | Polish and edge cases | Reconnection, conflict resolution |

### Phase 3: Cross-Tool Integration (Weeks 9-12)
**Goal:** Changes in one tool reflect in others

**Deliverables:**
- MetMap tempo changes reflect in Drill Writer timeline
- Formation selections highlight in 3D Preview
- Unified undo/redo across tools
- Collaborative annotations that span tools

---

## Technical Implementation Details

### 1. Core Infrastructure Files to Create

```
src/
├── hooks/
│   ├── useYjsProvider.ts       # Main Yjs provider hook
│   ├── useYjsAwareness.ts      # Awareness/cursor hook
│   ├── useYjsUndo.ts           # Undo manager hook
│   └── useYjsDocument.ts       # Document subscription hook
├── contexts/
│   └── YjsContext.tsx          # Provider context
├── lib/
│   └── yjs/
│       ├── schemas/
│       │   ├── metmapSchema.ts # MetMap Y.Doc schema
│       │   └── formationSchema.ts # Formation Y.Doc schema
│       ├── providers.ts        # Provider factory
│       └── awareness.ts        # Awareness utilities
└── components/
    └── collaboration/
        ├── CursorOverlay.tsx   # Real cursor rendering
        ├── PresenceIndicator.tsx # User presence
        └── SelectionHighlight.tsx # Selection awareness
```

### 2. Server Updates Required

```javascript
// server-collaboration.js updates

// Add JWT authentication
wss.on('connection', async (ws, req) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }

  try {
    const user = await verifyJwt(token);
    ws.userId = user.id;
    ws.userName = user.name;

    // Continue with Yjs setup
    setupDoc(ws, req);
  } catch (error) {
    ws.close(1008, 'Invalid token');
  }
});

// Add room access control
async function hasRoomAccess(userId, roomName) {
  // roomName format: "project-{projectId}"
  const projectId = roomName.replace('project-', '');

  // Check user is member of project
  const membership = await db.query(
    'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  return membership.rows.length > 0;
}
```

### 3. MetMap Y.Doc Schema

```typescript
// src/lib/yjs/schemas/metmapSchema.ts
import * as Y from 'yjs';

export interface MetMapYDoc {
  meta: Y.Map<any>;         // Song metadata
  sections: Y.Array<any>;   // Sections list
  tempoMap: Y.Array<any>;   // Tempo changes
  markers: Y.Array<any>;    // Practice markers
  annotations: Y.Map<any>;  // User annotations
}

export function createMetMapDoc(ydoc: Y.Doc): MetMapYDoc {
  return {
    meta: ydoc.getMap('meta'),
    sections: ydoc.getArray('sections'),
    tempoMap: ydoc.getArray('tempoMap'),
    markers: ydoc.getArray('markers'),
    annotations: ydoc.getMap('annotations'),
  };
}

export function initializeMetMapDoc(
  schema: MetMapYDoc,
  initialData: any
): void {
  ydoc.transact(() => {
    schema.meta.set('title', initialData.title);
    schema.meta.set('bpm', initialData.bpm);
    schema.meta.set('timeSignature', initialData.timeSignature);

    initialData.sections.forEach((section: any) => {
      schema.sections.push([section]);
    });
  });
}
```

### 4. Formation Y.Doc Schema

```typescript
// src/lib/yjs/schemas/formationSchema.ts
import * as Y from 'yjs';

export interface FormationYDoc {
  meta: Y.Map<any>;              // Formation metadata
  performers: Y.Map<Y.Map<any>>; // Performer positions by ID
  keyframes: Y.Array<any>;       // Animation keyframes
  selections: Y.Map<any>;        // Current selections by user
}

export function createFormationDoc(ydoc: Y.Doc): FormationYDoc {
  return {
    meta: ydoc.getMap('meta'),
    performers: ydoc.getMap('performers'),
    keyframes: ydoc.getArray('keyframes'),
    selections: ydoc.getMap('selections'),
  };
}

// Example: Move performer
export function movePerformer(
  schema: FormationYDoc,
  performerId: string,
  position: { x: number; y: number }
): void {
  const performer = schema.performers.get(performerId);
  if (performer) {
    performer.set('x', position.x);
    performer.set('y', position.y);
    performer.set('updatedAt', Date.now());
  }
}
```

---

## Risk Mitigation

### Risk 1: WebSocket Stability
**Mitigation:**
- Implement exponential backoff reconnection
- Use y-indexeddb for offline resilience
- Add connection status UI indicator

### Risk 2: Performance at Scale
**Mitigation:**
- Limit concurrent editors per document (10 max initially)
- Use Y.Doc subdocuments for large formations
- Implement update batching for rapid changes

### Risk 3: Conflict Resolution Edge Cases
**Mitigation:**
- Extensive testing with simulated network conditions
- Implement change attribution for debugging
- Add telemetry for conflict events

### Risk 4: Authentication Token Expiry
**Mitigation:**
- Implement token refresh in WebSocket connection
- Use sliding window for active sessions
- Graceful reconnection after token refresh

---

## Success Criteria

### Phase 1 (MetMap) Complete When:
- [ ] Two users can see each other's cursors in MetMap
- [ ] Section edits appear on both screens within 100ms
- [ ] Offline edits sync correctly when connection restored
- [ ] No data loss in 1000 rapid concurrent edit test
- [ ] 10 concurrent users perform acceptably (< 200ms latency)

### Phase 2 (Drill Writer) Complete When:
- [ ] Formation canvas shows collaborator cursors
- [ ] Performer position changes sync in real-time
- [ ] Selection states visible across clients
- [ ] Undo/redo works correctly per-user
- [ ] 200 performers with 10 editors performs acceptably

### Phase 3 (Cross-Tool) Complete When:
- [ ] MetMap tempo change reflects in Drill Writer
- [ ] Formation selection highlights in 3D Preview
- [ ] Unified activity feed shows all tool changes
- [ ] Single undo stack spans tool boundaries (optional)

---

## Dependencies

### Required Before Starting:
- [ ] WebSocket server authentication fixed
- [ ] JWT token refresh mechanism implemented
- [ ] Collaboration server deployment verified
- [ ] Staging environment for testing

### Required During Development:
- [ ] Access to 5+ test accounts for collaboration testing
- [ ] Network condition simulation tools (throttling, latency)
- [ ] Real device testing (not just localhost)

---

## Resource Requirements

### Engineering:
- 2 full-stack engineers for 8 weeks
- 0.5 QA engineer for testing

### Infrastructure:
- Collaboration server scaling (handle 100 concurrent connections)
- Redis for room state (optional, for horizontal scaling)
- WebSocket monitoring (connection counts, message rates)

---

## Blockers

The following must be resolved before starting:

| Blocker | Owner | Target Resolution |
|---------|-------|-------------------|
| WebSocket authentication missing | Backend | Week 0 |
| JWT refresh not implemented | Backend | Week 0 |
| Collaboration server not deployed | DevOps | Week 0 |
| Test accounts for collaboration | Product | Week 1 |

---

## Reference Documents

- `YJS_IMPLEMENTATION_GUIDE.md` - Detailed implementation guide
- `REALTIME_COLLABORATION_ARCHITECTURE.md` - Architecture decisions
- `FLOW_STATE_VISION_BRIEF.md` - Vision alignment context
- [Yjs Documentation](https://docs.yjs.dev/)
- [y-websocket GitHub](https://github.com/yjs/y-websocket)

---

**This integration is the single most important technical work for Q1 2026. It transforms FluxStudio from a solo tool into a collaborative creative platform.**

---

*"Real-time collaboration is not a feature. It's the foundation of collaborative creation."*
