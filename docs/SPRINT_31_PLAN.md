# Sprint 31: Presence, Cursors & Collaborative Undo

**Phase:** 2.2 — Collaborative Canvas (second sprint)
**Depends on:** Sprint 30 (multi-track audio mixer, Yjs sync layer, basic 2-user sync)
**Duration:** 5 tasks

## Summary

Sprint 31 transforms the basic 2-user sync from Sprint 30 into a polished collaborative experience. Users will see who else is editing (avatar chips, colored section borders), get proper Yjs-native undo/redo that works correctly with multiple editors, and benefit from a server-side Yjs instance that properly merges updates instead of concatenating bytes.

### Goals
- Live presence indicators (avatar chips, colored section borders, "who's editing what")
- Server-side Yjs for proper document merging and state encoding
- Y.UndoManager replacing the snapshot-based undo system
- Reconnection resilience (offline queue, state reconciliation)
- Granular chord/animation collaboration (Y.Array instead of JSON strings)

### Deferred to Sprint 32+
- Ghost cursors on timeline canvas (requires canvas hit-testing)
- Voice/video presence (Phase 2.2 late)
- Design branching and history (Phase 2.2 late)
- Canvas comments (Phase 2.2 late)
- Conflict notifications toast system

---

## Tasks

### T1: Live Presence Indicators

**Goal:** Show which users are connected and what they're editing, using the Yjs Awareness protocol already wired in Sprint 30.

**Files:**
- `src/hooks/useMetMapPresence.ts` — New: hook for awareness state management
- `src/components/metmap/PresenceAvatars.tsx` — New: avatar chip strip showing connected users
- `src/components/metmap/SectionCard.tsx` — Modify: add colored border when another user is editing
- `src/pages/ToolsMetMap/index.tsx` — Wire presence into the page
- `src/hooks/useMetMapCollaboration.ts` — Expose awareness from the provider

**Presence data model (via Yjs Awareness):**
```ts
interface MetMapPresence {
  userId: string;
  username: string;
  color: string;        // assigned from palette on join
  avatar?: string;      // profile picture URL
  editingSection: string | null;  // section ID being edited
  selectedKeyframe: string | null;
  cursorBar: number | null;
  lastActive: number;   // timestamp for idle detection
}
```

**UI design:**
```
┌──────────────────────────────────────────────────────────────┐
│  Song: "My Song"   [🟢 2 editing]   [👤 You] [👤 Alex]     │
│ ──────────────────────────────────────────────────────────── │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ Intro          4 bars   │  │ Verse 1        8 bars   │   │
│  │ 🎵 120 BPM    4/4      │  │ 🎵 120 BPM    4/4      │   │
│  │                         │  │ ┌─ Alex is editing ──┐  │   │
│  └─────────────────────────┘  └─┤ blue left border  ├──┘   │
│                                  └────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Create `useMetMapPresence(provider, user)` hook:
   - Set local awareness state on mount (`userId`, `username`, `color`, `avatar`)
   - Assign color from 8-color palette based on clientID modulo
   - Update `editingSection` when user clicks/focuses a section card
   - Update `lastActive` on any interaction (throttled to 5s)
   - Return `{ peers: MetMapPresence[], setEditingSection, setSelectedKeyframe }`
   - Listen to awareness changes and map `awareness.getStates()` to typed array
2. Create `PresenceAvatars` component:
   - Horizontal strip of avatar chips (max 5 visible, +N overflow)
   - Each chip: colored ring + avatar/initial + name tooltip
   - "You" chip always first
   - Idle users (>60s no activity) shown dimmed
3. Add colored border to section cards:
   - When `peer.editingSection === section.id`, show 2px left border in peer's color
   - Small name label below the border: "Alex"
   - Animate border in/out with CSS transition
4. Expose awareness from `useMetMapCollaboration`:
   - Add `provider` ref to the return value
   - Or return `awareness` object directly for the presence hook

**Acceptance:**
- Open same song in two tabs → see both users' avatars
- Click a section in Tab A → colored border appears in Tab B
- User avatar shows colored ring matching their edit indicator
- Idle detection dims avatar after 60s of inactivity
- Clean up on disconnect (avatar disappears immediately)

---

### T2: Server-Side Yjs Document Merging

**Goal:** Replace the naive byte-concatenation in `sockets/metmap-collab-socket.js` with a proper Yjs instance on the server for correct document state management.

**Files:**
- `sockets/metmap-collab-socket.js` — Rewrite: use real Y.Doc instances in LRU cache
- `package.json` — Add `yjs` to server dependencies (currently only in frontend)

**Current problem (Sprint 30):**
The server concatenates raw Uint8Arrays, which corrupts state after multiple updates. The sync protocol masks this on reconnect, but it causes growing memory usage and eventual desync.

**Implementation:**
1. Import `yjs` in the server socket handler:
   ```js
   const Y = require('yjs');
   ```
2. Replace `LRUCache` value type from `Uint8Array` to `Y.Doc`:
   - On first connection to a room: create `new Y.Doc()`, apply stored BYTEA from DB
   - On `yjs:update`: `Y.applyUpdate(doc, update)` to the in-memory doc
   - On `yjs:sync-request`: `Y.encodeStateAsUpdate(doc, stateVector)` for efficient diff
3. Update persistence:
   - `flushRoomState`: `Y.encodeStateAsUpdate(doc)` → save to DB
   - On cache eviction: flush to DB before discarding
4. Remove `mergeUpdates` concatenation function
5. Update `yjs:sync-response` to send proper diff:
   ```js
   const stateVector = new Uint8Array(data.stateVector);
   const update = Y.encodeStateAsUpdate(doc, stateVector);
   socket.emit('yjs:sync-response', { update: Array.from(update) });
   ```

**Acceptance:**
- Three clients join same room → all see consistent state
- Client disconnects, reconnects → receives minimal diff (not full doc)
- Server restart → load from DB → clients resync correctly
- Memory usage stable (no unbounded byte accumulation)
- `mergeUpdates` concatenation function removed

---

### T3: Y.UndoManager Integration

**Goal:** Replace the snapshot-based `useMetMapHistory` with Yjs-native `Y.UndoManager`, which correctly handles undo/redo in collaborative contexts (only undoes *your* changes, not other users').

**Files:**
- `src/hooks/useMetMapUndo.ts` — New: Y.UndoManager-based undo/redo hook
- `src/hooks/useMetMapHistory.ts` — Deprecate (keep for non-collab fallback)
- `src/hooks/useMetMapCollaboration.ts` — Expose Y.Doc ref for UndoManager binding
- `src/pages/ToolsMetMap/index.tsx` — Switch from `useMetMapHistory` to `useMetMapUndo`
- `src/hooks/useMetMapKeyboardShortcuts.tsx` — Update Ctrl+Z / Ctrl+Shift+Z bindings

**Key difference from snapshot undo:**
- Snapshot: stores full state copies, undoes *all* changes regardless of author
- Y.UndoManager: tracks *local* operations only, undoes only the current user's changes
- In collaborative mode, User A pressing Ctrl+Z won't undo User B's edits

**Implementation:**
1. Create `useMetMapUndo(doc, ySections)` hook:
   ```ts
   function useMetMapUndo(
     doc: Y.Doc | null,
     options?: { captureTimeout?: number }
   ): { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
   ```
   - Create `Y.UndoManager` scoped to the `sections` Y.Array
   - `captureTimeout`: 500ms (groups rapid edits into one undo step)
   - Listen to `'stack-item-added'` and `'stack-item-popped'` events to update `canUndo`/`canRedo`
   - Clean up on unmount
2. Expose `docRef` from `useMetMapCollaboration`:
   - Return `doc: Y.Doc | null` alongside existing return values
   - The undo hook needs access to the same Y.Doc instance
3. Update `ToolsMetMap/index.tsx`:
   - When collaboration is active: use `useMetMapUndo(doc)`
   - When solo (no collab): keep existing `useMetMapHistory` as fallback
   - Keyboard shortcuts call the active undo system
4. Update keyboard shortcuts:
   - `Ctrl+Z` → calls `undo()` from active system
   - `Ctrl+Shift+Z` / `Ctrl+Y` → calls `redo()` from active system

**Acceptance:**
- User A edits section name → User B's undo stack is unaffected
- User A presses Ctrl+Z → only User A's last edit is undone
- Rapid edits within 500ms group into single undo step
- Undo/redo buttons enable/disable correctly
- Falls back to snapshot undo when collaboration is disabled
- Keyboard shortcuts work with both undo systems

---

### T4: Reconnection Resilience

**Goal:** Handle network interruptions gracefully — queue local changes while offline and reconcile state on reconnect.

**Files:**
- `src/services/ySocketIOProvider.ts` — Add offline queue and reconnection state machine
- `src/hooks/useMetMapCollaboration.ts` — Add connection quality indicator
- `src/components/metmap/ConnectionStatus.tsx` — New: connection banner component
- `sockets/metmap-collab-socket.js` — Handle stale client cleanup

**Connection states:**
```
connected ──→ reconnecting ──→ connected (synced)
    │              │
    └──→ offline ──┘
```

**Implementation:**
1. Enhance `YSocketIOProvider` with offline queue:
   - When socket disconnects: buffer local Y.Doc updates in an array
   - On reconnect: emit `yjs:join`, then `yjs:sync-request`, then flush queued updates
   - Yjs's CRDT merge handles any conflicts automatically
   - Add `'connection-error'` event for UI feedback
2. Add exponential backoff awareness:
   - Track consecutive reconnect attempts
   - After 3 failures: show "Connection lost" banner
   - After 10 failures: show "Working offline" with manual retry button
3. Create `ConnectionStatus` component:
   - Thin banner below the song header
   - States: hidden (connected), yellow "Reconnecting..." (reconnecting), red "Offline — changes saved locally" (offline)
   - "Retry now" button in offline state
   - Auto-dismiss on successful reconnect
4. Server-side stale cleanup:
   - On `yjs:join`, check if socket already has a room membership (re-join case)
   - Clean up duplicate room memberships
   - Send full awareness state on rejoin so presence is accurate

**Acceptance:**
- Disconnect WiFi → continue editing → reconnect → changes merge correctly
- Yellow banner during reconnection, red after extended failure
- Manual retry button works
- Peer count updates correctly after reconnect
- No duplicate awareness entries after reconnect
- Other users see "reconnecting" state for the disconnected user

---

### T5: Granular Chord & Animation Collaboration

**Goal:** Replace JSON-stringified chords and animations with proper Y.Array/Y.Map structures so that editing a single chord doesn't overwrite the entire chord array.

**Files:**
- `src/services/metmapCollaboration.ts` — Upgrade chords/animations to Y.Array<Y.Map>
- `src/contexts/metmap/types.ts` — Verify Chord and Animation types are compatible
- `sockets/metmap-collab-socket.js` — No changes (Yjs handles granular sync)

**Current problem (Sprint 30):**
```ts
yMap.set('chords', JSON.stringify(section.chords || []));
```
Two users editing different chords in the same section will overwrite each other because the entire JSON string is replaced atomically.

**Implementation:**
1. Replace `chords` and `animations` JSON strings with Y.Arrays:
   ```ts
   // Before (Sprint 30)
   yMap.set('chords', JSON.stringify(section.chords || []));

   // After (Sprint 31)
   const yChords = new Y.Array();
   for (const chord of section.chords) {
     const yChord = new Y.Map();
     yChord.set('id', chord.id);
     yChord.set('name', chord.name);
     yChord.set('position', chord.position);
     yChord.set('duration', chord.duration);
     // ... other chord fields
     yChords.push([yChord]);
   }
   yMap.set('chords', yChords);
   ```
2. Update `yMapToSection` converter:
   - Check if `chords` is a Y.Array (new format) or string (legacy)
   - Support both formats for backward compatibility during migration
   ```ts
   const rawChords = yMap.get('chords');
   if (rawChords instanceof Y.Array) {
     section.chords = rawChords.toArray().map(yc => yc.toJSON());
   } else if (typeof rawChords === 'string') {
     section.chords = JSON.parse(rawChords);
   }
   ```
3. Update `updateSection` to handle granular chord edits:
   - Instead of replacing the entire chords array, diff and apply changes
   - Add `updateChord(sectionIndex, chordIndex, chord)` method to `MetMapCollaborationAPI`
   - Add `addChord(sectionIndex, chord)` and `removeChord(sectionIndex, chordIndex)` methods
4. Same pattern for animations:
   - `updateAnimation`, `addAnimation`, `removeAnimation`

**Acceptance:**
- User A edits Chord 1, User B edits Chord 3 → both changes merge without conflict
- Backward compatible: songs with JSON-string chords still load correctly
- Adding a chord in one tab appears in the other without replacing existing chords
- Removing a chord in one tab removes only that chord in the other
- Animation keyframe edits are similarly granular

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useMetMapPresence.ts` | Awareness state management hook |
| `src/hooks/useMetMapUndo.ts` | Y.UndoManager-based undo/redo |
| `src/components/metmap/PresenceAvatars.tsx` | Avatar chip strip |
| `src/components/metmap/ConnectionStatus.tsx` | Reconnection status banner |

## Files to Modify

| File | Changes |
|------|---------|
| `sockets/metmap-collab-socket.js` | Server-side Y.Doc instances, proper merging, stale cleanup |
| `src/services/ySocketIOProvider.ts` | Offline queue, reconnection state machine |
| `src/services/metmapCollaboration.ts` | Granular chord/animation Y.Arrays, new CRUD methods |
| `src/hooks/useMetMapCollaboration.ts` | Expose awareness + doc ref, connection quality |
| `src/pages/ToolsMetMap/index.tsx` | Wire presence, undo switch, connection banner |
| `src/hooks/useMetMapKeyboardShortcuts.tsx` | Update undo/redo bindings |
| `package.json` | Add `yjs` to server/root dependencies |

---

## Verification

1. **Presence:** Open same song in two browser profiles → see both avatars → click section in Tab A → colored border in Tab B → idle 60s → avatar dims
2. **Server Yjs:** Restart server → reconnect → state is consistent → memory stable after 100+ updates
3. **Undo:** Tab A edits name → Tab B edits tempo → Tab A presses Ctrl+Z → only name reverts, tempo unchanged
4. **Reconnection:** Disconnect network → edit sections → reconnect → changes merge → banner transitions correctly
5. **Granular chords:** Tab A drags Chord 1 → Tab B edits Chord 3 → both changes preserved → no overwrite
6. **Regression:** All Sprint 30 features still work (multi-track mixer, waveforms, basic sync, status indicator)
