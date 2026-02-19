# Sprint 27: Keyframe Editor + Undo/Redo + Video Export

> Status: PLANNED | Depends on: Sprint 26 (Audio Foundation)

## Current State (Post Sprint 26)

Sprint 26 delivered the audio foundation: upload, waveform visualization (wavesurfer.js), beat detection, canvas timeline, snap-to-beat, and playback sync. The MetMap now supports attaching audio to songs, but all "animation" is still implicit (tempo ramps between `tempoStart`/`tempoEnd`).

| Component | Status | Notes |
|-----------|--------|-------|
| Audio upload + waveform | **Done** (S26) | wavesurfer.js, canvas timeline, beat markers |
| Beat detection + snap | **Done** (S26) | Pure JS onset detection, snap-to-beat utility |
| Playback sync | **Done** (S26) | Dual-source (metronome/audio/both) |
| Canvas timeline | **Done** (S26) | 2D canvas with DPR, zoom, RAF cursor |
| Keyframe system | **Missing** | No property animation over time |
| Undo/Redo | **Missing** | No history stack in MetMap contexts |
| Video export | **Missing** | Only JSON/clipboard export exists |
| Chord drag interactions | **Missing** | Click-to-place only, no drag-to-move |

### Existing Patterns to Reuse

1. **Keyframe model** — `src/store/slices/timelineSlice.ts` already defines `Keyframe { id, time, value, easing, bezierHandles }` and `Animation { id, property, keyframes[], enabled }`. Adapt this shape for MetMap.
2. **Undo/Redo snapshot** — `timelineSlice.ts` uses `past[]/future[]` deep-clone approach (not command pattern). Cap at 50 entries. Reuse this pattern.
3. **Video export** — `src/services/formationExport.ts` uses `canvas.captureStream()` + `MediaRecorder` for WebM output. No FFmpeg needed. Reuse this approach with `TimelineCanvas.draw()`.
4. **Easing curves** — `src/tokens/animations.ts` has cubic-bezier presets (ease, bounce, elastic, spring). Import these for keyframe interpolation.

---

## Strategy

Sprint 27 adds the **creative expression layer** on top of Sprint 26's audio foundation:

1. **Keyframes** let users animate properties (tempo, volume, effects) with easing curves over the timeline
2. **Undo/Redo** gives users confidence to experiment without fear of losing work
3. **Video export** turns MetMap sessions into shareable media
4. **Chord drag** makes the chord grid feel like a real editor instead of a form

### Sprint 27 Scope
- Keyframe data model + interpolation engine
- Keyframe editor UI on the canvas timeline
- Undo/Redo history stack for all MetMap edits
- Video export (WebM) via canvas capture
- Chord drag-to-reposition on the grid

### Deferred to Sprint 28+
- Multi-track audio layering
- Bezier handle editing for custom easing curves
- GIF export / frame-by-frame PNG sequence
- Collaborative undo (CRDT-based)

---

## Tasks

### T1: Keyframe Data Model + Interpolation Engine

**Goal:** Define keyframe types and an interpolation function that evaluates any animated property at any point in time.

**Files:**
- `src/contexts/metmap/types.ts` — Add `Keyframe`, `Animation`, `AnimatableProperty` types
- `src/services/keyframeEngine.ts` — New file: interpolation and evaluation

**Types:**
```ts
type AnimatableProperty = 'tempo' | 'volume' | 'pan' | 'emphasis';
type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'step';

interface Keyframe {
  id: string;
  time: number;           // seconds
  value: number;
  easing: EasingType;
}

interface Animation {
  id: string;
  property: AnimatableProperty;
  keyframes: Keyframe[];
  enabled: boolean;
}
```

**Interpolation engine:**
- `evaluateAt(animation, timeSeconds)` — returns interpolated value at time `t`
- `getKeyframeRange(animation, time)` — finds surrounding keyframes
- `interpolate(from, to, progress, easing)` — applies easing curve to `[0,1]` progress
- Import easing functions from `src/tokens/animations.ts` (cubic-bezier presets)

**Integration with Section model:**
- Add `animations?: Animation[]` to `Section` interface
- Sections already have `tempoStart`/`tempoEnd`/`tempoCurve` — keyframes generalize this pattern to any property
- Existing tempo ramps become the "implicit" keyframe behavior; explicit keyframes override

**Acceptance:**
- `evaluateAt()` correctly interpolates between keyframes with all easing types
- Step easing holds value until next keyframe
- Values clamp to first/last keyframe outside range
- Tempo keyframes produce the same result as the existing `tempoStart/tempoEnd/tempoCurve` system

---

### T2: Keyframe Editor UI on Canvas Timeline

**Goal:** Users can add, move, and delete keyframes directly on the timeline canvas.

**Files:**
- `src/components/metmap/TimelineCanvas.tsx` — Add keyframe rendering layer
- `src/components/metmap/KeyframeEditor.tsx` — New component: keyframe interaction overlay
- `src/pages/ToolsMetMap/index.tsx` — Wire keyframe editor

**Rendering (in TimelineCanvas.draw()):**
- New layer between tempo curves and playback cursor
- Keyframe dots: 6px circles at `(time, value)` position, color-coded by property
- Connecting lines between keyframes with easing curve visualization
- Active/selected keyframe highlighted with a larger ring

**Interaction (KeyframeEditor overlay):**
- **Add keyframe:** Double-click on timeline at property track → insert keyframe at that time/value
- **Move keyframe:** Click-drag a keyframe dot horizontally (time) and vertically (value)
- **Delete keyframe:** Right-click → context menu → Delete, or select + `Delete` key
- **Select keyframe:** Click to select, shows easing dropdown in a small popover
- **Property tracks:** Collapsible rows below the main timeline, one per animated property

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Section bars + tempo curve + playback      │  ← TimelineCanvas (existing)
├─────────────────────────────────────────────┤
│  ♦───♦─────────♦    Tempo keyframes         │  ← Keyframe track
│  ♦──────♦──────♦    Volume keyframes        │  ← Keyframe track
├─────────────────────────────────────────────┤
│  Waveform + beat markers                    │  ← WaveformTimeline (existing)
└─────────────────────────────────────────────┘
```

**Acceptance:**
- Keyframe dots render on the canvas timeline
- Double-click adds a keyframe at clicked position
- Drag moves keyframes smoothly
- Delete key removes selected keyframe
- Easing type selectable per keyframe
- Property tracks toggle on/off

---

### T3: Undo/Redo History Stack

**Goal:** All MetMap edits (sections, chords, keyframes, audio operations) are undoable.

**Files:**
- `src/hooks/useMetMapHistory.ts` — New hook: undo/redo state management
- `src/contexts/metmap/types.ts` — Add history types and actions
- `src/contexts/metmap/SectionEditorContext.tsx` — Integrate snapshot calls
- `src/pages/ToolsMetMap/index.tsx` — Wire Ctrl+Z / Ctrl+Shift+Z

**Pattern (matching timelineSlice):**
```ts
interface MetMapHistory {
  past: MetMapSnapshot[];
  future: MetMapSnapshot[];
}

interface MetMapSnapshot {
  sections: Section[];
  // Only snapshot what changes — not audio buffers or playback state
}
```

**Implementation:**
1. `useMetMapHistory(sections)` hook:
   - `saveSnapshot()` — deep-clone current sections, push to `past`, clear `future`
   - `undo()` — pop from `past`, push current to `future`, restore
   - `redo()` — shift from `future`, push current to `past`, restore
   - `canUndo` / `canRedo` booleans
   - Max 50 snapshots (drop oldest when exceeded)
2. Call `saveSnapshot()` before every mutation:
   - `addSection`, `removeSection`, `reorderSections`
   - `updateSection` (debounced — don't snapshot every keystroke)
   - `updateSectionChords`
   - Keyframe add/move/delete
3. Keyboard shortcuts:
   - `Ctrl+Z` / `Cmd+Z` → undo
   - `Ctrl+Shift+Z` / `Cmd+Shift+Z` → redo
4. UI: Undo/Redo buttons in the toolbar with disabled state

**Acceptance:**
- Ctrl+Z undoes the last section/chord/keyframe edit
- Ctrl+Shift+Z redoes
- Undo/Redo buttons show correct disabled state
- 50-entry history cap works (oldest dropped)
- Audio upload/remove are NOT undoable (only structural edits)
- No performance degradation with deep cloning (sections are small)

---

### T4: Video Export via Canvas Capture

**Goal:** Export a MetMap playback session as a WebM video file.

**Files:**
- `src/services/metmapExport.ts` — New file: video export service
- `src/components/metmap/ExportImport.tsx` — Add "Export Video" option
- `src/pages/ToolsMetMap/index.tsx` — Wire export handler

**Implementation (following formationExport.ts pattern):**
1. Create an offscreen canvas matching TimelineCanvas dimensions
2. For each frame (target 30fps):
   - Advance playback time by `1/fps` seconds
   - Call `TimelineCanvas.draw()` equivalent on the offscreen canvas
   - If audio waveform exists, composite waveform frame
   - Draw beat markers, section labels, tempo curve
   - Draw playback cursor at current position
3. Use `canvas.captureStream(30)` + `MediaRecorder` for WebM output
4. Progress callback for UI (percentage complete)
5. Download resulting Blob as `.webm` file

**Export options:**
- Duration: full song or selected section range
- Resolution: 1280x720 (default) or match current viewport
- Include: section labels, tempo curve, beat markers (toggle each)
- Audio: mux in the audio track if available (MediaRecorder supports audio tracks)

**UI:**
- "Export Video" button in ExportImport dropdown
- Modal with options (duration, resolution, toggles)
- Progress bar during rendering
- Download link when complete

**Acceptance:**
- Exports a playable WebM video of the timeline playback
- Playback cursor animates correctly in the video
- Section colors, tempo curves, and beat markers visible
- Audio track included when song has audio
- Progress indicator shows during export
- Works for songs up to 10 minutes without crashing

---

### T5: Chord Drag-to-Reposition

**Goal:** Chords on the grid can be dragged to different bar/beat positions.

**Files:**
- `src/pages/ToolsMetMap/MetMapComponents.tsx` — Add drag handlers to ChordGrid
- `src/services/snapToBeat.ts` — Reuse for drag snap feedback
- `src/contexts/metmap/SectionEditorContext.tsx` — Add `moveChord` method

**Implementation:**
1. Each chord cell becomes a draggable element (`onPointerDown` / `onPointerMove` / `onPointerUp`)
2. On drag start:
   - Store original bar/beat
   - Show ghost element following pointer
   - Highlight valid drop targets (other empty cells)
3. During drag:
   - Calculate target bar/beat from pointer position
   - If beat detection exists, snap to nearest beat (reuse `snapToNearestBeat`)
   - Show snap indicator when snapping
4. On drop:
   - Move chord to new bar/beat position
   - Call `saveSnapshot()` for undo support
   - Update chords array via `updateSectionChords`
5. Hold `Alt` during drag to bypass snap (free placement)
6. Drag between sections: if chord dragged past section boundary, move to adjacent section

**Acceptance:**
- Drag a chord cell to reposition it within the grid
- Ghost element follows pointer during drag
- Snap-to-beat feedback visible when near a detected beat
- Alt+drag bypasses snap
- Undo restores chord to original position
- Cannot drop on an occupied cell (show invalid indicator)

---

## Database Migration

```sql
-- Add animations column to sections
ALTER TABLE metmap_sections
ADD COLUMN animations JSONB DEFAULT '[]';
```

**File:** `database/migrations/108_metmap_keyframe_animations.sql`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/keyframeEngine.ts` | Interpolation engine for keyframe evaluation |
| `src/components/metmap/KeyframeEditor.tsx` | Keyframe interaction overlay on timeline |
| `src/hooks/useMetMapHistory.ts` | Undo/Redo history stack hook |
| `src/services/metmapExport.ts` | Video export via canvas capture + MediaRecorder |
| `database/migrations/108_metmap_keyframe_animations.sql` | Add animations column |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/metmap/types.ts` | Add `Keyframe`, `Animation`, `AnimatableProperty`, `MetMapHistory` types; add `animations` to Section |
| `src/components/metmap/TimelineCanvas.tsx` | Add keyframe dot/line rendering layer in draw() |
| `src/components/metmap/ExportImport.tsx` | Add "Export Video" option with modal |
| `src/pages/ToolsMetMap/MetMapComponents.tsx` | Add pointer-event drag handlers to ChordGrid |
| `src/contexts/metmap/SectionEditorContext.tsx` | Integrate undo snapshot calls, add `moveChord` |
| `src/pages/ToolsMetMap/index.tsx` | Wire keyframe editor, undo/redo shortcuts, video export |
| `src/hooks/useMetMapKeyboardShortcuts.ts` | Add undo/redo shortcuts |
| `database/metmap-adapter.js` | Handle `animations` field in section CRUD |

---

## Verification

1. **Keyframes:** Add tempo keyframe → value interpolates during playback → easing visible on curve
2. **Keyframe editing:** Double-click to add → drag to move → Delete to remove → easing dropdown works
3. **Undo/Redo:** Edit section → Ctrl+Z undoes → Ctrl+Shift+Z redoes → 50-entry cap
4. **Video export:** Export Video → progress bar → downloads WebM → plays correctly with audio
5. **Chord drag:** Drag chord to new cell → snaps to beat → Alt bypasses → undo restores
6. **Regression:** All Sprint 26 features still work (audio upload, beat detection, waveform, canvas timeline)
7. `pnpm run typecheck` — no errors
8. `pnpm run lint` — clean
