# Sprint 33: Comment Threading, Reactions & Design Branching

**Phase:** 2.2 — Collaborative Canvas (fourth and final sprint)
**Depends on:** Sprint 32 (ghost cursors, conflict toasts, canvas comments, fast cursor)
**Duration:** 4 tasks

## Summary

Sprint 33 closes out Phase 2.2 by completing the async collaboration story (comment threads + reactions) and adding non-destructive experimentation via design branching. Users can create named checkpoints of their song, fork branches to try ideas, and merge back — all built on top of the existing Yjs CRDT + BYTEA persistence.

### Goals
- Comment threading: replies nested under parent comments
- Comment reactions: lightweight emoji responses
- Named snapshots / checkpoints: save and restore Y.Doc state at any point
- Design branches: fork from a snapshot, work independently, switch between branches

### Phase 2.2 Completion Checklist
After Sprint 33, all Phase 2.2 items will be done:
- ✅ Multi-cursor real-time collaboration (Sprint 30-31)
- ✅ CRDT-based conflict resolution (Sprint 30-31)
- ✅ Live presence with cursors (Sprint 31-32)
- ✅ Canvas comments (Sprint 32-33)
- ✅ Design branching and history (Sprint 33)
- ⏳ Voice/video presence (deferred — Phase 3+ or standalone sprint)

---

## Tasks

### T1: Comment Threading

**Goal:** Extend the flat `CanvasComment` model with `parentId` to support reply chains. Replies show nested under the parent comment in the popover.

**Files:**
- `src/hooks/useMetMapComments.ts` — Add `parentId` field, `replyToComment` method
- `src/components/metmap/CanvasCommentLayer.tsx` — Render reply threads in popover

**Data model change:**
```ts
interface CanvasComment {
  // ... existing fields
  parentId: string | null;  // NEW: null for top-level, comment ID for replies
}
```

**Implementation:**

1. Extend `CanvasComment` interface with `parentId: string | null`:
   - Update `commentToYMap` to set `parentId`
   - Update `yMapToComment` to read `parentId` (default `null` for backward compat)

2. Add `replyToComment` method to `useMetMapComments`:
   ```ts
   replyToComment: (parentId: string, barStart: number, text: string,
                     userId: string, username: string, color: string) => void
   ```
   - Same as `addComment` but sets `parentId` field
   - Inherits `barStart` from parent comment

3. Update `CanvasCommentLayer` popover:
   - Group comments: top-level (parentId === null) + their replies
   - Show reply count badge on pin: `💬 3`
   - Expand popover to show reply thread:
     ```
     ┌─────────────────────────────┐
     │ Alex · 2m ago           [x] │
     │ "Fix timing at bar 5"       │
     │ ────────────────────────     │
     │   Kent · 1m ago             │
     │   "Agreed, shifted +0.5 bar"│
     │ ────────────────────────     │
     │   Alex · 30s ago            │
     │   "Looks good now"          │
     │ ────────────────────────     │
     │ [Reply...           ] [Post]│
     │ [Resolve] [Delete]          │
     └─────────────────────────────┘
     ```
   - Add inline reply textarea at bottom of thread
   - Max thread depth: 1 level (replies can't have replies — keeps it simple)

4. Pin rendering on canvas:
   - Show reply count as small badge next to pin circle
   - Pin color uses the top-level comment's color (not reply colors)

**Acceptance:**
- Click pin → see parent comment + all replies in chronological order
- Type in reply box → press Cmd+Enter → reply appears in both tabs
- Reply count badge updates on pin
- Resolving a parent comment hides the entire thread
- Backward compatible: existing comments without `parentId` render as top-level

---

### T2: Comment Reactions

**Goal:** Add lightweight emoji reactions to comments (thumbs up, check, eyes, heart). Reactions are stored in the Y.Map alongside each comment.

**Files:**
- `src/hooks/useMetMapComments.ts` — Add `reactions` field, `toggleReaction` method
- `src/components/metmap/CanvasCommentLayer.tsx` — Render reaction chips in popover

**Data model change:**
```ts
interface CanvasComment {
  // ... existing fields
  reactions: Record<string, string[]>;  // NEW: emoji → [userId, ...]
}
```

**Implementation:**

1. Add `reactions` to `CanvasComment`:
   - Stored as JSON string in Y.Map (simple — reactions don't need CRDT granularity)
   - Default: `{}` for no reactions

2. Add `toggleReaction(commentId, emoji, userId)` to `useMetMapComments`:
   ```ts
   toggleReaction: (commentId: string, emoji: string, userId: string) => void
   ```
   - If userId already in `reactions[emoji]`, remove them (toggle off)
   - If not, add them (toggle on)
   - Update the Y.Map via `yMap.set('reactions', JSON.stringify(reactions))`

3. Render reaction chips in the comment popover:
   ```
   👍 2  ✅ 1  👀 3
   [+ Add reaction]
   ```
   - Show count next to each emoji
   - Highlight if current user has reacted (blue background)
   - Click to toggle own reaction
   - "Add reaction" button shows emoji picker (4 options: 👍 ✅ 👀 ❤️)

4. Available reactions (keep it minimal):
   - `👍` — agree
   - `✅` — done / fixed
   - `👀` — looking into it
   - `❤️` — love it

**Acceptance:**
- Click 👍 on a comment → reaction appears in both tabs
- Click 👍 again → reaction removed (toggle)
- Multiple users can react → count increases
- Own reactions highlighted with blue background
- Reactions survive page refresh (persisted in Yjs doc)

---

### T3: Named Snapshots / Checkpoints

**Goal:** Let users save named checkpoints of the current Y.Doc state. Snapshots are stored in a new DB table alongside the song and can be restored at any time.

**Files:**
- `database/migrations/112_metmap_snapshots.sql` — New: snapshot table
- `database/metmap-adapter.js` — Add snapshot CRUD functions
- `routes/metmap.js` — Add snapshot API endpoints
- `src/hooks/useMetMapSnapshots.ts` — New: snapshot CRUD hook
- `src/components/metmap/SnapshotPanel.tsx` — New: snapshot list + create/restore UI
- `src/pages/ToolsMetMap/index.tsx` — Wire snapshot panel
- `sockets/metmap-collab-socket.js` — Add `yjs:snapshot` event for creating snapshots from current doc state

**Database schema:**
```sql
CREATE TABLE metmap_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id TEXT NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  yjs_state BYTEA NOT NULL,          -- Full Y.Doc binary at checkpoint
  section_count INTEGER DEFAULT 0,
  total_bars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metmap_snapshots_song ON metmap_snapshots(song_id);
```

**API endpoints:**
```
GET    /api/metmap/songs/:songId/snapshots         → List snapshots
POST   /api/metmap/songs/:songId/snapshots         → Create snapshot
DELETE /api/metmap/songs/:songId/snapshots/:id      → Delete snapshot
POST   /api/metmap/songs/:songId/snapshots/:id/restore → Restore snapshot
```

**Implementation:**

1. Migration `112_metmap_snapshots.sql`:
   - Create table with foreign key to `metmap_songs`
   - Index on `song_id` for fast lookups

2. Adapter functions in `metmap-adapter.js`:
   ```js
   getSnapshotsForSong(songId, userId)
   createSnapshot(songId, userId, { name, description, yjsState, sectionCount, totalBars })
   deleteSnapshot(snapshotId, userId)
   getSnapshot(snapshotId, userId)  // Returns full BYTEA for restore
   ```

3. API routes in `routes/metmap.js`:
   - All protected by auth middleware
   - `POST /snapshots` — captures current `yjs_state` from the song
   - `POST /snapshots/:id/restore` — replaces song's `yjs_state` with snapshot, then broadcasts to all connected clients via socket

4. Socket event `yjs:create-snapshot`:
   - Client sends `{ room, name, description }`
   - Server reads current Y.Doc from memory, encodes to BYTEA
   - Saves to snapshots table
   - Broadcasts `yjs:snapshot-created` to room for UI refresh

5. Socket event `yjs:restore-snapshot`:
   - Client sends `{ room, snapshotId }`
   - Server loads snapshot BYTEA from DB
   - Creates new Y.Doc, applies snapshot state
   - Replaces in-memory doc in the LRU cache
   - Encodes full state update and broadcasts to all clients
   - All clients receive new state via `yjs:sync-response`

6. Create `useMetMapSnapshots(songId, token)` hook:
   - Uses TanStack Query for fetching snapshot list
   - `createSnapshot(name, description)` mutation
   - `deleteSnapshot(id)` mutation
   - `restoreSnapshot(id)` mutation

7. Create `SnapshotPanel` component:
   ```
   ┌─ Snapshots ──────────────────────────────┐
   │ [📸 Save Checkpoint]                      │
   │                                           │
   │ ┌─ "Before bridge rewrite" ─────────────┐│
   │ │ Kent · 10m ago · 8 sections · 52 bars ││
   │ │ [Restore] [Delete]                     ││
   │ └───────────────────────────────────────┘│
   │ ┌─ "Initial arrangement" ───────────────┐│
   │ │ Alex · 2h ago · 6 sections · 36 bars  ││
   │ │ [Restore] [Delete]                     ││
   │ └───────────────────────────────────────┘│
   └───────────────────────────────────────────┘
   ```
   - Collapsible panel below the timeline
   - "Save Checkpoint" button with name input
   - List of snapshots with metadata
   - Restore button with confirmation dialog
   - Delete button (own snapshots only)

**Acceptance:**
- Click "Save Checkpoint" → enter name → snapshot saved → appears in list
- Click "Restore" → confirmation dialog → all clients see restored state
- Snapshot captures full Y.Doc state including sections, chords, animations, comments
- Restore replaces current state for all connected clients
- Delete removes snapshot from DB
- Snapshots survive server restart (persisted in DB)

---

### T4: Design Branches

**Goal:** Let users fork a branch from a snapshot (or current state) to experiment independently without affecting the main timeline. Branches are separate Y.Doc rooms that can be switched between.

**Files:**
- `database/migrations/113_metmap_branches.sql` — New: branch table
- `database/metmap-adapter.js` — Add branch CRUD functions
- `routes/metmap.js` — Add branch API endpoints
- `src/hooks/useMetMapBranches.ts` — New: branch management hook
- `src/components/metmap/BranchSwitcher.tsx` — New: branch picker dropdown
- `src/hooks/useMetMapCollaboration.ts` — Support switching room to a branch
- `src/pages/ToolsMetMap/index.tsx` — Wire branch switcher
- `sockets/metmap-collab-socket.js` — Handle branch rooms

**Database schema:**
```sql
CREATE TABLE metmap_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id TEXT NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_snapshot_id UUID REFERENCES metmap_snapshots(id) ON DELETE SET NULL,
  yjs_state BYTEA,                    -- Branch's own Y.Doc state
  is_main BOOLEAN DEFAULT FALSE,      -- The "main" branch (always one per song)
  merged_at TIMESTAMPTZ,              -- NULL if not merged
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metmap_branches_song ON metmap_branches(song_id);
```

**Implementation:**

1. Migration `113_metmap_branches.sql`:
   - Create branch table
   - Every song implicitly has a "main" branch (the existing `yjs_state` on `metmap_songs`)
   - Additional branches are separate Y.Doc states

2. Branch room naming:
   - Main branch: `metmap:{songId}` (unchanged — backward compatible)
   - Feature branch: `metmap:{songId}:branch:{branchId}`
   - Server handles both room patterns identically (same Yjs sync logic)

3. Adapter functions:
   ```js
   getBranchesForSong(songId, userId)
   createBranch(songId, userId, { name, description, sourceSnapshotId })
   deleteBranch(branchId, userId)
   getBranch(branchId, userId)
   mergeBranch(branchId, userId)  // Copies branch yjs_state to song's main yjs_state
   ```

4. API routes:
   ```
   GET    /api/metmap/songs/:songId/branches         → List branches
   POST   /api/metmap/songs/:songId/branches         → Create branch
   DELETE /api/metmap/songs/:songId/branches/:id      → Delete branch
   POST   /api/metmap/songs/:songId/branches/:id/merge → Merge branch to main
   ```

5. Create branch flow:
   - User clicks "Create Branch" → enters name
   - Client sends POST with optional `sourceSnapshotId`
   - Server creates branch record, copies snapshot's `yjs_state` (or current main state)
   - Client switches collaboration room to the branch room

6. Merge flow:
   - User clicks "Merge to Main" on a branch
   - Server copies branch's `yjs_state` to song's main `yjs_state`
   - Server replaces the main branch's in-memory Y.Doc
   - Broadcasts full state update to all clients on the main room
   - Marks branch as `merged_at = NOW()`

7. Update `useMetMapCollaboration` to accept a `roomSuffix`:
   ```ts
   const { ... } = useMetMapCollaboration(
     currentSong?.id,
     handleRemoteSectionsChange,
     { branchId: activeBranchId }  // NEW: optional branch routing
   );
   ```
   - When `branchId` is set, connect to `metmap:{songId}:branch:{branchId}`
   - When null, connect to `metmap:{songId}` (main)

8. Create `BranchSwitcher` component:
   ```
   ┌──────────────────────────────┐
   │ 🌿 main ▾                    │
   │ ┌──────────────────────────┐ │
   │ │ ● main (current)         │ │
   │ │ ○ bridge-experiment      │ │
   │ │ ○ alex-tempo-variation   │ │
   │ │ ─────────────────────── │ │
   │ │ [+ New Branch]           │ │
   │ └──────────────────────────┘ │
   └──────────────────────────────┘
   ```
   - Dropdown in the song header area
   - Shows current branch with green indicator
   - Switch between branches (disconnects from current room, connects to new)
   - "New Branch" opens a dialog with name + optional source snapshot
   - "Merge to Main" button on non-main branches

**Acceptance:**
- Create branch "bridge-experiment" → switches to branch room → edit independently
- Switch back to "main" → original state intact
- Other collaborator on "main" doesn't see branch edits
- "Merge to Main" → main state replaced with branch state → all main clients see update
- Delete branch → removed from DB → can't switch to it
- Branch list shows metadata: creator, created date, source snapshot name
- Backward compatible: songs without explicit branches work on implicit "main"

---

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/112_metmap_snapshots.sql` | Snapshot table |
| `database/migrations/113_metmap_branches.sql` | Branch table |
| `src/hooks/useMetMapSnapshots.ts` | Snapshot CRUD hook (TanStack Query) |
| `src/hooks/useMetMapBranches.ts` | Branch management hook |
| `src/components/metmap/SnapshotPanel.tsx` | Snapshot list + create/restore UI |
| `src/components/metmap/BranchSwitcher.tsx` | Branch picker dropdown |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useMetMapComments.ts` | Add `parentId`, `reactions`, `replyToComment`, `toggleReaction` |
| `src/components/metmap/CanvasCommentLayer.tsx` | Render threads, reactions, reply input |
| `database/metmap-adapter.js` | Snapshot + branch CRUD functions |
| `routes/metmap.js` | Snapshot + branch API endpoints |
| `sockets/metmap-collab-socket.js` | Snapshot/restore events, branch room handling |
| `src/hooks/useMetMapCollaboration.ts` | Branch room routing support |
| `src/pages/ToolsMetMap/index.tsx` | Wire snapshots, branches, thread UI |

---

## Verification

1. **Threading:** Post comment → reply → reply shows nested → resolve hides thread → backward compat with existing comments
2. **Reactions:** Click 👍 → count updates in both tabs → toggle off → count decreases → reactions persist after refresh
3. **Snapshots:** Save "v1" → edit sections → save "v2" → restore "v1" → all clients see restored state → delete "v2"
4. **Branches:** Create "experiment" → edit on branch → switch to main → main unchanged → merge branch → main updated → all clients synced
5. **Regression:** All Sprint 30-32 features still work (presence, ghost cursors, conflict toasts, canvas comments, undo, multi-track audio)
