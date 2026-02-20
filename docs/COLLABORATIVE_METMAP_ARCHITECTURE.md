# Collaborative MetMap Architecture (Yjs Integration)

**Sprint 29 Spike — Phase 2.2 Groundwork**

## Overview

This document describes the architecture for adding real-time collaborative editing to MetMap using Yjs, a CRDT (Conflict-free Replicated Data Type) library. Two or more users will be able to edit the same song simultaneously with automatic conflict resolution.

---

## 1. State Mapping: MetMap Types → Yjs Shared Types

### Proposed Yjs Document Structure

```
Y.Doc
├── meta (Y.Map)
│   ├── title: string
│   ├── bpmDefault: number
│   └── timeSignatureDefault: string
│
├── sections (Y.Array<Y.Map>)
│   ├── [0] Y.Map
│   │   ├── id: string
│   │   ├── name: string
│   │   ├── bars: number
│   │   ├── tempoStart: number
│   │   ├── tempoEnd: number
│   │   ├── tempoCurve: string
│   │   ├── timeSignature: string
│   │   ├── chords (Y.Array<Y.Map>)
│   │   │   └── [n] Y.Map { id, bar, beat, symbol, durationBeats }
│   │   └── animations (Y.Array<Y.Map>)
│   │       └── [n] Y.Map { id, property, enabled, keyframes: Y.Array }
│   └── [1] Y.Map ...
│
└── presence (Y.Map)
    └── [clientId] Y.Map { userId, username, color, editingSection, cursor }
```

### Rationale

- **Sections as Y.Array of Y.Maps**: Allows reordering, inserting, and deleting sections with automatic conflict resolution. Two users can add sections concurrently.
- **Chords as Y.Array within Section**: Keeps chord data scoped to its section. Moving a chord cross-section requires a delete + insert (handled atomically via Y.Doc transactions).
- **Animations/Keyframes as Y.Array**: Each keyframe is a Y.Map so individual value changes don't conflict with nearby keyframe edits.
- **Presence as Y.Map**: Ephemeral awareness data — who's editing what, cursor positions.

---

## 2. Sync Strategy: Yjs vs Local State

| State | Sync via Yjs? | Reason |
|-------|:---:|--------|
| Song metadata (title, BPM, time sig) | Yes | Shared, infrequent edits |
| Section list + properties | Yes | Core collaborative data |
| Chord progressions | Yes | Core collaborative data |
| Animations + keyframes | Yes | Core collaborative data |
| Practice mode state | No | Per-user, local only |
| Playback position/cursor | Presence | Ephemeral, awareness only |
| Audio file reference | Yes | Shared (one audio per song) |
| Beat map | Yes | Derived from shared audio |
| UI state (expanded panels, zoom) | No | Per-user preference |
| Selection (selected keyframe) | Presence | Other users see what you're editing |

---

## 3. Conflict Resolution

### Concurrent Section Edits
**Scenario**: User A edits Section 1's tempo while User B edits Section 1's name.
**Resolution**: Both are different keys on the same Y.Map → both changes apply. No conflict.

### Concurrent Keyframe Edits
**Scenario**: User A and B both move the same keyframe.
**Resolution**: Last-write-wins for the specific property (time or value). Yjs guarantees eventual consistency. The "loser" will see their change overwritten in ~200ms. Acceptable for keyframe positioning.

### Concurrent Chord Edits
**Scenario**: User A deletes a chord that User B is editing.
**Resolution**: B's edits become no-ops (the Y.Map is removed from the Y.Array). B sees the chord disappear. This matches standard collaborative document behavior.

### Section Reorder Conflict
**Scenario**: A moves Section 2 before Section 1 while B moves it after Section 3.
**Resolution**: Y.Array handles concurrent moves by applying both operations. The result is deterministic across all clients (same final order) but may not match either user's intent. A notification should alert users when sections were reordered by another user.

---

## 4. Undo/Redo Migration

### Current System
MetMap uses snapshot-based undo via `useMetMapHistory` — each action stores the full sections array and restores it on undo.

### Migration Path
1. **Phase 1 (Sprint 30)**: Keep snapshot undo for solo editing. When collaboration is active, disable local undo.
2. **Phase 2 (Sprint 31)**: Introduce `Y.UndoManager` scoped per user:
   ```ts
   const undoManager = new Y.UndoManager(ySections, {
     trackedOrigins: new Set([localClientOrigin]),
   });
   ```
   - Each user's undo stack only undoes their own changes
   - `trackedOrigins` ensures User A's undo doesn't undo User B's work
3. **Phase 3 (Sprint 32)**: Remove snapshot undo entirely, use Y.UndoManager universally

### Key Consideration
The snapshot approach stores full state, making undo instant. Y.UndoManager records operations, which may require more careful handling of complex multi-step operations (e.g., adding a section with default chords). Use `Y.Doc.transact()` to group these into single undo steps.

---

## 5. Transport: Socket.IO vs y-websocket

### Recommendation: Use existing Socket.IO with y-websocket adapter

FluxStudio already has Socket.IO infrastructure. Rather than spinning up a separate y-websocket server:

```
Client A                     Server                      Client B
   |                           |                            |
   |-- Yjs update (binary) --> |                            |
   |   via Socket.IO           |-- broadcast update ------> |
   |                           |   via Socket.IO            |
   |                           |                            |
   |   (awareness update) ---> |--- (awareness update) ---> |
```

**Implementation:**
1. Create a `y-socket.io` provider (custom, ~150 lines) that:
   - Sends Yjs binary updates via `socket.emit('yjs:update', binaryData)`
   - Receives updates via `socket.on('yjs:update', handler)`
   - Handles awareness protocol (cursor positions, user presence)
2. Server-side: New Socket.IO namespace `/metmap-collab`
   - Room per song: `song:{songId}`
   - Relay binary updates to other room members
   - Persist Yjs document state to PostgreSQL (as BYTEA column on metmap_songs)

**Why not standalone y-websocket?**
- FluxStudio already uses Socket.IO for messaging and presence
- Authentication middleware already exists
- No additional server process to deploy
- Simpler infrastructure

---

## 6. Performance: Yjs Overhead in 60fps Animation Loop

### Concern
The MetMap timeline renders at 60fps when playing back. Will Yjs observation callbacks disrupt the animation loop?

### Analysis
- **Yjs observation is event-driven**, not polling. Changes trigger callbacks only when a remote update arrives.
- **Remote updates arrive ~2-10 times per second** (typical collaborative editing pace), not 60fps.
- **The animation loop reads from React state**, which is already a snapshot of the Yjs doc. Yjs callbacks update React state; React batches re-renders.

### Mitigations
1. **Debounce Yjs → React state sync**: Instead of updating React state on every Y.Map change, batch updates every 100ms:
   ```ts
   ySections.observeDeep(debounce(() => {
     dispatch({ type: 'SET_SECTIONS', sections: yjsToSections(ySections) });
   }, 100));
   ```
2. **Keep animation values in a ref**: The playback cursor and real-time interpolated values should read from `useRef` (not state) to avoid React re-renders during playback.
3. **Measured overhead**: Yjs document operations (observe, apply update) take <1ms for typical MetMap documents (10-20 sections, 100-200 keyframes). Well within frame budget.

---

## 7. Cursor/Presence Implementation

```ts
interface MetMapPresence {
  userId: string;
  username: string;
  color: string;         // Assigned per-user color
  editingSection: number | null;  // Section index being edited
  selectedKeyframe: string | null; // Keyframe ID
  cursorBar: number | null;        // Playback cursor position
}
```

**Visual indicators:**
- Colored border around the section another user is editing
- Small avatar chip next to the section name
- Colored keyframe outline showing another user's selected keyframe
- Ghost cursor on the timeline showing other users' playback positions

---

## 8. Connection Lifecycle

```
1. User opens song
2. Connect to Socket.IO namespace /metmap-collab
3. Join room `song:{songId}`
4. Server sends current Yjs state (from DB or in-memory)
5. Client applies state to local Y.Doc
6. Y.Doc state → React state (sections, chords, animations)
7. User edits → local Y.Doc changes → broadcast to server → relay to peers
8. On disconnect:
   a. Awareness shows user as offline (grayed avatar)
   b. Server persists Y.Doc state snapshot to DB
9. On reconnect:
   a. Client requests diff from server
   b. Yjs sync protocol handles catch-up automatically
```

---

## 9. Effort Estimate

| Sprint | Tasks | Effort |
|--------|-------|--------|
| **Sprint 30** | y-socket.io provider, server relay namespace, DB persistence for Yjs state, basic 2-user sync | 3-4 days |
| **Sprint 31** | Presence/cursors, conflict notifications, undo migration to Y.UndoManager, UI for collaborators | 3-4 days |
| **Sprint 32** | Polish: reconnection handling, offline queuing, performance optimization, testing | 2-3 days |

**Total estimated: 8-11 development days across 3 sprints.**

### Dependencies
- `yjs` package (~50KB gzipped) — add as production dependency in Sprint 30
- No additional server infrastructure (reuses Socket.IO)
- Database: Add `yjs_state BYTEA` column to `metmap_songs`

---

## 10. Yjs Document Structure Diagram

```
┌──────────────────────────────────────────────┐
│                  Y.Doc                        │
│                                               │
│  ┌─────────────┐   ┌──────────────────────┐  │
│  │  meta        │   │  sections (Y.Array)  │  │
│  │  (Y.Map)     │   │                      │  │
│  │  .title      │   │  ┌─────────────────┐ │  │
│  │  .bpmDefault │   │  │ Section 0 (Map) │ │  │
│  │  .timeSig    │   │  │ .name .bars ... │ │  │
│  └─────────────┘   │  │ .chords (Array) │ │  │
│                      │  │ .animations     │ │  │
│  ┌─────────────┐   │  └─────────────────┘ │  │
│  │  presence    │   │  ┌─────────────────┐ │  │
│  │  (Y.Map)     │   │  │ Section 1 (Map) │ │  │
│  │  .user1 {}   │   │  │ ...             │ │  │
│  │  .user2 {}   │   │  └─────────────────┘ │  │
│  └─────────────┘   └──────────────────────┘  │
│                                               │
└──────────────────────────────────────────────┘
        │                       │
    Awareness              Sync Protocol
    (ephemeral)            (persistent)
        │                       │
   ┌────▼───────────────────────▼────┐
   │      Socket.IO Transport        │
   │    /metmap-collab namespace      │
   │    Room: song:{songId}           │
   └─────────────────────────────────┘
```
