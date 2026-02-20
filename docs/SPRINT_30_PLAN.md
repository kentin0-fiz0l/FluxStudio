# Sprint 30: Multi-Track Audio UI & Yjs Foundation

**Phase:** 2.2 — Collaborative Canvas (first sprint)
**Depends on:** Sprint 29 (multi-track backend, Yjs architecture spike, GIF export, keyboard keyframes)
**Duration:** 5 tasks

## Summary

Sprint 30 kicks off Phase 2.2 by building the multi-track audio mixer UI (on top of Sprint 29's backend) and laying the real-time collaboration foundation with a working Yjs sync layer. After this sprint, users can manage multiple audio tracks per song and two users can open the same song with basic state synchronization.

### Goals
- Multi-track audio mixer UI (track list, volume/pan/mute/solo, waveform per track)
- y-socket.io provider for Yjs sync over existing Socket.IO infrastructure
- Server-side Yjs relay namespace with document persistence
- Basic 2-user sync (open same song, see each other's section edits)
- Audio track waveform visualization per track

### Deferred to Sprint 31+
- Presence/cursors (colored borders, avatar chips, ghost cursors)
- Y.UndoManager migration (replace snapshot undo)
- Conflict notifications
- Offline queuing and reconnection handling
- AI-powered section suggestions (Phase 3)

---

## Tasks

### T1: Multi-Track Audio Mixer UI

**Goal:** Replace the single-track `AudioTrackPanel` with a multi-track mixer that lets users add, remove, and control multiple audio tracks per song.

**Files:**
- `src/components/metmap/AudioTrackMixer.tsx` — New: multi-track mixer component
- `src/components/metmap/AudioTrackPanel.tsx` — Refactor: single track row within the mixer
- `src/pages/ToolsMetMap/index.tsx` — Wire up mixer to replace single AudioTrackPanel
- `src/hooks/useAudioTracks.ts` — New: TanStack Query hooks for track CRUD
- `src/services/metmapApi.ts` — Add track API client functions

**UI design:**
```
┌──────────────────────────────────────────────────────────┐
│  Audio Tracks                                    [+ Add] │
│ ─────────────────────────────────────────────────────── │
│  🔊 Track 1 - Drums    ████████░░░  [M] [S] 🔈━━━●━━━  │
│  🔊 Track 2 - Bass     ██████████░  [M] [S] 🔈━━━━━●━  │
│  🔊 Track 3 - Guitar   ███████░░░░  [M] [S] 🔈━●━━━━━  │
│ ─────────────────────────────────────────────────────── │
│  Playback: [Metronome] [Audio] [Both]                    │
└──────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Create `useAudioTracks(songId)` hook with TanStack Query:
   - `useQuery` for fetching tracks (`GET /api/metmap/songs/:songId/tracks`)
   - `useMutation` for create, update, delete, reorder
   - Optimistic updates for volume/pan/mute/solo changes
2. Create `AudioTrackMixer` component:
   - Track list with drag-to-reorder (use existing drag pattern from chord editor)
   - "Add Track" button → file picker → upload + create track
   - Per-track controls: name (editable), volume slider, pan knob, mute/solo buttons
   - Master playback mode toggle (metronome / audio / both)
3. Refactor `AudioTrackPanel` into a single track row:
   - Volume slider (0-1)
   - Pan slider (-1 to +1)
   - Mute toggle (M button)
   - Solo toggle (S button, highlighted when active)
   - Remove button
   - Inline rename
4. Wire into `ToolsMetMap/index.tsx`:
   - Replace single `AudioTrackPanel` with `AudioTrackMixer`
   - Maintain backward compatibility (songs with single audio still work)

**Acceptance:**
- Can add multiple audio tracks to a song
- Each track has volume, pan, mute, solo controls
- Changes persist to database via API
- Removing a track deletes audio from S3
- Drag to reorder tracks
- Existing single-audio songs work without migration
- Playback mode toggle still works

---

### T2: Per-Track Waveform Visualization

**Goal:** Show a waveform visualization for each audio track in the mixer, reusing the existing Web Worker beat detection infrastructure.

**Files:**
- `src/components/metmap/TrackWaveform.tsx` — New: canvas waveform for a single track
- `src/components/metmap/AudioTrackPanel.tsx` — Integrate waveform into track row
- `src/hooks/useAudioTracks.ts` — Add audio buffer loading per track

**Implementation:**
1. Create `TrackWaveform` component:
   - Canvas-based, matches the compact height of a mixer track row (~32px)
   - Draws amplitude peaks from AudioBuffer data
   - Color-coded per track (use track index for hue)
   - Shows beat markers if beat detection has been run on the track
2. Load AudioBuffer per track:
   - Fetch audio URL → decode with Web Audio API
   - Extract peak data (downsample to ~800 points for the canvas width)
   - Cache in React state (not re-fetched on re-render)
3. Beat detection per track:
   - Reuse existing Web Worker from Sprint 28
   - "Detect Beats" button per track row
   - Store results via `PUT /api/metmap/tracks/:trackId/beat-map`
4. Waveform click → seek to position (for playback integration in future sprint)

**Acceptance:**
- Each track shows a waveform visualization
- Waveforms render at 60fps (canvas, not DOM)
- Beat markers overlay on waveform when detected
- Loading state while audio decodes
- Waveforms resize with container

---

### T3: y-socket.io Provider

**Goal:** Create a custom Yjs provider that syncs documents over the existing Socket.IO connection, following the architecture from `docs/COLLABORATIVE_METMAP_ARCHITECTURE.md`.

**Files:**
- `src/services/ySocketIOProvider.ts` — New: Yjs provider over Socket.IO
- `src/services/metmapCollaboration.ts` — Update: wire real Y.Doc instead of mock interfaces

**Implementation:**
1. Create `YSocketIOProvider` class:
   ```ts
   class YSocketIOProvider {
     constructor(socket: Socket, roomName: string, ydoc: Y.Doc, options?: ProviderOptions)
     connect(): void
     disconnect(): void
     destroy(): void
     get synced(): boolean
     on(event: 'sync' | 'status', callback): void
   }
   ```
2. Sync protocol:
   - On connect: emit `yjs:sync-request` with `Y.encodeStateVector(doc)`
   - Server responds with `yjs:sync-response` containing full state
   - On local change: emit `yjs:update` with `Y.encodeStateAsUpdate(doc, stateVector)`
   - On remote `yjs:update`: `Y.applyUpdate(doc, update)`
3. Awareness protocol (basic):
   - Wrap `awarenessProtocol.Awareness` from `y-protocols`
   - Emit `yjs:awareness-update` on local awareness change
   - Apply remote awareness updates
4. Connection lifecycle:
   - Auto-reconnect on Socket.IO reconnection
   - Re-sync state after reconnect (request full state)
   - Emit `status` events for UI feedback

**Dependencies to add:**
- `yjs` — move from devDependency to production dependency
- `y-protocols` — awareness protocol helpers

**Acceptance:**
- Provider connects to Socket.IO and syncs Y.Doc
- Two browser tabs with same room see each other's changes
- State persists after page refresh (via server)
- Clean disconnect/reconnect handling
- TypeScript types for all public API

---

### T4: Server-Side Yjs Relay + Persistence

**Goal:** Add a Socket.IO namespace on the server that relays Yjs updates between clients and persists document state to PostgreSQL.

**Files:**
- `sockets/metmap-collab-socket.js` — New: Socket.IO namespace for Yjs relay
- `database/migrations/111_metmap_yjs_state.sql` — New: Yjs state column
- `database/metmap-adapter.js` — Add Yjs state persistence methods
- `server-unified.js` — Register the new namespace

**Database change:**
```sql
ALTER TABLE metmap_songs ADD COLUMN IF NOT EXISTS yjs_state BYTEA;
```

**Implementation:**
1. Create `/metmap-collab` Socket.IO namespace:
   - Authentication middleware (reuse existing JWT auth)
   - Room per song: `song:{songId}`
   - On `yjs:sync-request`: send stored Yjs state from DB (or empty if new)
   - On `yjs:update`: broadcast to other room members, debounce persist to DB
   - On `yjs:awareness-update`: broadcast to other room members (don't persist)
2. In-memory document cache:
   - Keep recently-used Y.Doc instances in memory (LRU, max 50)
   - Apply updates to in-memory doc for fast sync
   - Flush to DB on disconnect or every 30 seconds
3. Persistence:
   - `getYjsState(songId)` — returns BYTEA from `metmap_songs`
   - `saveYjsState(songId, state)` — upserts BYTEA column
   - Use `Y.encodeStateAsUpdate(doc)` for the binary representation
4. Register namespace in `server-unified.js`

**Acceptance:**
- Two clients connecting to same song room receive consistent state
- Updates relay in < 100ms between clients
- State persists to DB and survives server restart
- In-memory cache prevents excessive DB reads
- Authentication required for namespace access
- Room cleanup when last client disconnects

---

### T5: Basic 2-User Sync Integration

**Goal:** Wire the Yjs provider into the MetMap page so two users opening the same song see each other's section edits in real time.

**Files:**
- `src/hooks/useMetMapCollaboration.ts` — New: React hook for Yjs collaboration
- `src/pages/ToolsMetMap/index.tsx` — Integrate collaboration hook
- `src/services/metmapCollaboration.ts` — Update to use real Y.Doc
- `src/contexts/metmap/types.ts` — Add collaboration status types

**Implementation:**
1. Create `useMetMapCollaboration(songId, socket)` hook:
   - Creates Y.Doc and YSocketIOProvider
   - Initializes MetMapCollaborationAPI from Sprint 29 PoC
   - Returns: `{ connected, synced, peerCount, collaboration }`
   - On remote section change → dispatch to MetMap state
   - On local section change → push to Y.Doc
   - Cleanup on unmount
2. Add collaboration status indicator to ToolsMetMap:
   - Small badge: "Solo" / "2 editing" / "Syncing..."
   - Green dot when connected, yellow when syncing, gray when offline
3. Update `metmapCollaboration.ts`:
   - Replace `YDocLike` interfaces with real `Y.Doc` imports
   - Use actual `Y.Map` and `Y.Array` instead of mock types
4. Bidirectional sync:
   - Local edits (add/remove/update section) → Y.Doc → server → peers
   - Remote edits → Y.Doc observer → dispatch to React state
   - Debounce React state updates (100ms) to avoid re-render storms

**Acceptance:**
- Open same song in two browser tabs → both show same sections
- Edit section name in Tab A → appears in Tab B within 500ms
- Add section in Tab A → appears in Tab B
- Delete section in Tab A → disappears from Tab B
- Connection status indicator shows correct state
- Works with existing solo editing (collaboration is additive)
- No performance regression in solo mode

---

## Database Changes

| Migration | Purpose |
|-----------|---------|
| `database/migrations/111_metmap_yjs_state.sql` | Add `yjs_state BYTEA` column to `metmap_songs` |

No changes to the `metmap_audio_tracks` table (created in Sprint 29).

---

## Dependencies to Add

| Package | Version | Purpose | Bundle Impact |
|---------|---------|---------|---------------|
| `yjs` | ^13.x | CRDT library for collaborative editing | ~50KB gzipped |
| `y-protocols` | ^1.x | Yjs sync and awareness protocols | ~5KB gzipped |

Move `yjs` from devDependencies to dependencies. Add `y-protocols` as new dependency.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/metmap/AudioTrackMixer.tsx` | Multi-track mixer container |
| `src/components/metmap/TrackWaveform.tsx` | Per-track canvas waveform |
| `src/hooks/useAudioTracks.ts` | TanStack Query hooks for track CRUD |
| `src/services/ySocketIOProvider.ts` | Yjs ↔ Socket.IO provider |
| `src/hooks/useMetMapCollaboration.ts` | React hook for Yjs collaboration |
| `sockets/metmap-collab-socket.js` | Server-side Yjs relay namespace |
| `database/migrations/111_metmap_yjs_state.sql` | Yjs state persistence column |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/metmap/AudioTrackPanel.tsx` | Refactor into single track row, add waveform |
| `src/pages/ToolsMetMap/index.tsx` | Replace AudioTrackPanel with AudioTrackMixer, add collaboration hook |
| `src/services/metmapCollaboration.ts` | Replace mock interfaces with real Y.Doc |
| `src/services/metmapApi.ts` | Add track API client functions |
| `src/contexts/metmap/types.ts` | Add collaboration status types |
| `database/metmap-adapter.js` | Add Yjs state persistence methods |
| `server-unified.js` | Register metmap-collab namespace |
| `package.json` | Move yjs to dependencies, add y-protocols |

---

## Verification

1. **Multi-track mixer:** Create song → Add 3 audio tracks → Adjust volume/pan → Mute/solo → Reorder → Remove one → All changes persist after refresh
2. **Track waveforms:** Upload audio to track → Waveform renders within 2s → Detect beats → Beat markers appear on waveform → Resize browser → Waveform adapts
3. **y-socket.io provider:** Unit test: two Y.Docs connected via provider → edit one → other receives update → verify sync
4. **Server relay:** Start server → Connect two clients to same song room → Client A sends update → Client B receives it → Restart server → Client C connects → Receives persisted state
5. **2-user sync:** Open same song in two tabs → Edit section name in Tab A → Tab B updates → Add section in Tab B → Tab A updates → Status indicator shows "2 editing"
6. **Regression:** All Sprint 29 features still work (GIF export, keyboard keyframes, practice tracking, beat detection)
