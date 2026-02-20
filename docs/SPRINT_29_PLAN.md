# Sprint 29: Phase 2.1 Wrap-Up & Collaboration Groundwork

**Phase:** 2.1 → 2.2 bridge sprint
**Depends on:** Sprint 28 (bezier keyframes, practice analytics, web worker, auto-ramp, chord drag polish)
**Duration:** 5 tasks

## Summary

Sprint 29 closes out Phase 2.1 by shipping the remaining deferred items (GIF export, multi-track audio backend), improving analytics accuracy, adding keyboard accessibility to the keyframe editor, and laying the architectural foundation for Phase 2.2 collaborative editing. After this sprint, Phase 2.1 is complete and Phase 2.2 development can begin.

### Goals
- GIF export from timeline (complements existing WebM video export)
- Multi-track audio database schema + API endpoints (backend only)
- Accurate per-section practice tracking in analytics
- Keyboard-accessible keyframe editing (arrow keys, Tab navigation)
- Yjs collaboration architecture spike + proof-of-concept

### Deferred to Sprint 30+
- Multi-track audio UI (mixer panel, waveform per track) — needs Sprint 29 backend first
- Full collaborative editing (Phase 2.2 proper)
- AI-powered section suggestions (Phase 3)
- Plugin system (Phase 4)

---

## Tasks

### T1: GIF Export from Timeline

**Goal:** Export the MetMap timeline as an animated GIF for sharing in chat, docs, or social media.

**Files:**
- `src/services/metmapExport.ts` — Add `exportMetMapGif()` alongside existing `exportMetMapVideo()`
- `src/components/metmap/ExportImport.tsx` — Add "Export GIF" button in dropdown

**Implementation:**
1. Add a lightweight GIF encoder — use the same offscreen canvas + pre-rendered `ImageData[]` approach from `exportMetMapVideo()`
2. Implement GIF encoding using a minimal LZW encoder (no external dependency):
   - Render frames to offscreen canvas (same `drawFrame` logic as video export)
   - Reduce frame rate for GIF (10 fps instead of 30) to keep file size reasonable
   - Quantize each frame to 256-color palette using median cut
   - Encode frames into GIF89a binary format with delay between frames
3. `exportMetMapGif(sections, beatMap?, audioDuration?, options?, onProgress?)` returns `Blob`
4. Add "Export GIF" button to ExportImport dropdown, below the video export option
5. Progress callback: rendering (0-60%), palette quantization (60-80%), encoding (80-100%)

**Size budget:** Target < 2MB for a 30-second timeline at 800x150px, 10fps

**Acceptance:**
- Clicking "Export GIF" produces an animated `.gif` file
- GIF shows section regions, tempo curves, and a moving playback cursor
- Progress indicator updates during export
- File size stays reasonable (< 2MB for typical songs)
- Existing video export still works unchanged

---

### T2: Multi-Track Audio Backend

**Goal:** Database schema and API endpoints for managing multiple audio tracks per song. This is the backend foundation — UI comes in Sprint 30.

**Files:**
- `database/migrations/110_metmap_audio_tracks.sql` — New: tracks table
- `database/metmap-adapter.js` — Add track CRUD methods
- `routes/metmap.js` — Add track API endpoints

**Database schema:**
```sql
CREATE TABLE IF NOT EXISTS metmap_audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL DEFAULT 'Track 1',
  audio_key VARCHAR(500),          -- S3 key for the audio file
  audio_url VARCHAR(1000),         -- Signed URL (ephemeral)
  audio_duration_seconds FLOAT,
  mime_type VARCHAR(50),
  file_size_bytes INTEGER,
  volume FLOAT DEFAULT 1.0,        -- 0.0 - 1.0
  pan FLOAT DEFAULT 0.0,           -- -1.0 (left) to 1.0 (right)
  muted BOOLEAN DEFAULT false,
  solo BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  beat_map JSONB,                   -- Per-track beat detection results
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metmap_audio_tracks_song ON metmap_audio_tracks(song_id);
```

**API endpoints:**
```
GET    /api/metmap/songs/:songId/tracks         — List all tracks for a song
POST   /api/metmap/songs/:songId/tracks         — Create track (with audio upload)
PUT    /api/metmap/tracks/:trackId              — Update track metadata (name, volume, pan, muted, solo)
DELETE /api/metmap/tracks/:trackId              — Delete track and S3 audio
PUT    /api/metmap/tracks/:trackId/reorder      — Change sort_order
PUT    /api/metmap/tracks/:trackId/beat-map     — Store beat detection for track
```

**Adapter methods:**
- `getTracksForSong(songId, userId)`
- `createTrack(songId, userId, trackData)`
- `updateTrack(trackId, userId, changes)`
- `deleteTrack(trackId, userId)`
- `reorderTrack(trackId, userId, newOrder)`
- `updateTrackBeatMap(trackId, userId, beatMap)`

**Acceptance:**
- Migration runs cleanly on dev database
- All 6 endpoints return correct responses
- Tracks cascade-delete when parent song is deleted
- Audio upload stores to S3 with correct key path
- Volume/pan/mute/solo updates persist
- Existing single-track audio endpoints still work (backwards compatible)

---

### T3: Per-Section Practice Tracking

**Goal:** Track which section was being practiced in each session so the analytics heatmap shows real data instead of estimates.

**Files:**
- `src/contexts/metmap/types.ts` — Add `loopedSectionName` to `PracticeSettings`
- `src/components/metmap/PracticeMode.tsx` — Pass looped section name when starting practice
- `src/components/metmap/PracticeAnalytics.tsx` — Use real section data in heatmap
- `src/pages/ToolsMetMap/index.tsx` — Pass section name to practice session start

**Data model extension:**
```ts
interface PracticeSettings {
  useClick?: boolean;
  subdivision?: number;
  countoffBars?: number;
  tempoOverride?: number;
  loopedSectionName?: string;   // new — which section was looped (null = all)
  autoRampEnabled?: boolean;    // new — was auto-ramp active
  startTempoPercent?: number;   // new — starting tempo %
  endTempoPercent?: number;     // new — ending tempo %
}
```

**Implementation:**
1. When practice mode starts, include `loopedSectionName` in the session settings
2. When practice mode ends, include `endTempoPercent` in session data
3. In `PracticeAnalytics.tsx`, update `SectionHeatmap`:
   - Read `session.settings.loopedSectionName` for each session
   - Count sessions per section name
   - Sessions without a `loopedSectionName` distribute evenly (backwards-compatible)
4. In `TempoChart`, use `startTempoPercent` and `endTempoPercent` for more accurate progression data
5. Update `SummaryCards` to show "Most practiced section" if data available

**Acceptance:**
- Starting practice with a looped section records the section name
- Analytics heatmap shows accurate per-section counts
- Old sessions without section data still display correctly
- Tempo chart uses start/end percentages when available
- Summary shows most-practiced section

---

### T4: Keyboard-Accessible Keyframe Editing

**Goal:** Make the keyframe editor fully operable via keyboard for accessibility compliance and power-user efficiency.

**Files:**
- `src/components/metmap/KeyframeEditor.tsx` — Add keyboard handlers
- `src/hooks/useMetMapKeyboardShortcuts.tsx` — Add keyframe shortcuts

**Keyboard controls:**
| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Cycle through keyframes on the active track |
| Arrow Left/Right | Nudge selected keyframe time by 0.05s (Shift: 0.5s) |
| Arrow Up/Down | Nudge selected keyframe value by 1 unit (Shift: 10 units) |
| Enter | Toggle easing type dropdown for selected keyframe |
| Delete / Backspace | Delete selected keyframe |
| A | Add keyframe at playback cursor position on the focused track |
| E | Cycle easing type: linear → easeIn → easeOut → easeInOut → bezier → step |

**Implementation:**
1. Make the keyframe track container `tabIndex={0}` and focusable
2. Add `onKeyDown` handler to the tracks container
3. When Tab is pressed within the editor, move selection to next/previous keyframe
4. Arrow keys adjust time (horizontal) and value (vertical) of the selected keyframe
5. Shift modifier increases step size (10x)
6. Add these shortcuts to the `METMAP_SHORTCUTS` array for the shortcuts help panel
7. Ensure focus ring is visible on the focused track and selected keyframe
8. Add `aria-label` attributes to keyframe dots with current value info

**Acceptance:**
- Tab cycles through keyframes in time order
- Arrow keys move the selected keyframe smoothly
- Shift+Arrow moves in larger increments
- Delete removes the selected keyframe
- 'A' adds a keyframe at the current track
- 'E' cycles easing type
- All actions work with screen readers
- Focus ring visible on keyframe dots and tracks
- Shortcuts appear in the shortcuts help panel

---

### T5: Yjs Collaboration Architecture Spike

**Goal:** Research and prototype Yjs integration for real-time collaborative MetMap editing. This is a spike — the output is documentation + a minimal proof-of-concept, not a production feature.

**Files:**
- `docs/COLLABORATIVE_METMAP_ARCHITECTURE.md` — New: architecture doc
- `src/services/metmapCollaboration.ts` — New: proof-of-concept Yjs binding (experimental)

**Research questions to answer:**
1. **State mapping:** How do MetMap types (Song, Section, Chord, Animation, Keyframe) map to Yjs shared types (Y.Map, Y.Array, Y.Text)?
2. **Granularity:** Should we sync at the section level (each section = Y.Map) or at the song level?
3. **Conflict resolution:** What happens when two users edit the same keyframe simultaneously? Same chord cell?
4. **Undo/redo:** How does Yjs UndoManager interact with our current snapshot-based undo?
5. **Transport:** Use existing Socket.IO or set up a separate y-websocket server?
6. **Performance:** How much overhead does Yjs add to the 60fps animation loop?

**Architecture document should cover:**
1. Proposed Yjs document structure for MetMap state
2. Sync strategy: which state goes through Yjs vs stays local
3. Cursor/presence implementation (show who's editing which section)
4. Undo/redo migration path (from snapshots → Yjs UndoManager)
5. Connection lifecycle and reconnection handling
6. Estimated effort for full implementation (Sprint 30-32 estimate)

**Proof-of-concept (`metmapCollaboration.ts`):**
```ts
// Minimal binding showing:
// 1. Creating a Yjs doc with sections as Y.Array<Y.Map>
// 2. Observing changes and dispatching to MetMap reducer
// 3. Applying local changes to Y.Map
// Not wired into the app — just a standalone module with clear API
```

**Acceptance:**
- Architecture doc covers all 6 research questions
- Doc includes a Yjs document structure diagram
- PoC module compiles and exports a clear API
- Doc includes estimated effort breakdown for Sprint 30-32
- No new runtime dependencies added to main bundle (Yjs is dev-only for now)

---

## Database Changes

| Migration | Purpose |
|-----------|---------|
| `database/migrations/110_metmap_audio_tracks.sql` | Multi-track audio table |

No changes to existing tables. `PracticeSettings` changes are JSON-level (no migration needed since settings is JSONB).

---

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/110_metmap_audio_tracks.sql` | Multi-track audio schema |
| `docs/COLLABORATIVE_METMAP_ARCHITECTURE.md` | Yjs integration architecture |
| `src/services/metmapCollaboration.ts` | Yjs proof-of-concept binding |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/metmapExport.ts` | Add GIF export function |
| `src/components/metmap/ExportImport.tsx` | Add "Export GIF" button |
| `src/contexts/metmap/types.ts` | Extend PracticeSettings with section tracking |
| `src/components/metmap/PracticeMode.tsx` | Pass section name to session |
| `src/components/metmap/PracticeAnalytics.tsx` | Use real section data in heatmap |
| `src/components/metmap/KeyframeEditor.tsx` | Keyboard navigation and editing |
| `src/hooks/useMetMapKeyboardShortcuts.tsx` | Add keyframe shortcuts |
| `src/pages/ToolsMetMap/index.tsx` | Wire section name to practice start |
| `database/metmap-adapter.js` | Add track CRUD methods |
| `routes/metmap.js` | Add track API endpoints |

---

## Verification

1. **GIF export:** Open song → Export dropdown → "Export GIF" → downloads animated .gif → plays correctly in browser/preview → file < 2MB
2. **Multi-track backend:** `curl` all 6 track endpoints → correct responses → cascade delete works → migration rollback works
3. **Practice tracking:** Start practice with section looped → end practice → open Stats → heatmap shows that section highlighted → old sessions still show
4. **Keyboard keyframes:** Focus keyframe editor → Tab to select keyframe → Arrow keys move it → Delete removes it → 'A' adds one → shortcuts help panel updated
5. **Yjs spike:** Read architecture doc → clear structure diagram → PoC compiles → effort estimates included
6. **Regression:** All Sprint 28 features still work (bezier handles, auto-ramp, web worker beat detection, chord snap)
