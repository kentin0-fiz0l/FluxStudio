# Sprint 28: Practice Intelligence & Polish

**Phase:** 2.1 Visual Timeline Editor (final sprint)
**Depends on:** Sprint 27 (keyframes, undo/redo, video export, chord drag)
**Duration:** 5 tasks

## Summary

Sprint 28 wraps up Phase 2.1 by addressing deferred items from Sprint 27, adding a practice analytics dashboard, improving the keyframe editing experience with bezier curves, and hardening the audio playback pipeline with a Web Worker for beat detection. This sprint transitions MetMap from a capable editor to a smart practice tool.

### Goals
- Bezier handle editing for custom keyframe easing curves
- Practice analytics dashboard with progress tracking
- Web Worker for non-blocking beat detection
- Auto-tempo ramp in practice mode (gradual speed-up)
- Chord drag snap-to-beat integration + cross-section drag

### Deferred to Sprint 29+
- Multi-track audio layering (needs backend file management first)
- GIF export / PNG sequence
- Collaborative undo (CRDT-based)
- AI-powered section suggestions (Phase 3)

---

## Tasks

### T1: Bezier Keyframe Handles

**Goal:** Users can create custom easing curves by dragging bezier control handles on keyframes.

**Files:**
- `src/contexts/metmap/types.ts` — Add `bezierHandles` to `Keyframe` interface
- `src/services/keyframeEngine.ts` — Add cubic bezier interpolation
- `src/components/metmap/KeyframeEditor.tsx` — Render and drag bezier handles

**Data model extension:**
```ts
interface Keyframe {
  id: string;
  time: number;
  value: number;
  easing: EasingType;
  /** Optional bezier control points (only used when easing === 'bezier') */
  bezierHandles?: {
    cp1x: number; // 0-1 normalized time offset
    cp1y: number; // 0-1 normalized value offset
    cp2x: number;
    cp2y: number;
  };
}
```

**Implementation:**
1. Add `'bezier'` to `EasingType` union
2. Implement `cubicBezier(t, cp1x, cp1y, cp2x, cp2y)` in keyframeEngine
3. Update `applyEasing()` to handle bezier type using control points
4. In KeyframeEditor: when a keyframe is selected and easing is `bezier`, render two draggable handle dots connected by lines to the keyframe dot
5. Handle drag updates the `bezierHandles` values
6. Add "Bezier" option to the easing dropdown
7. Show a small curve preview in the easing dropdown when bezier is selected

**Acceptance:**
- Selecting "Bezier" easing shows two control handles
- Dragging handles updates the interpolation curve in real time
- Canvas timeline reflects the custom curve shape
- Undo/redo works for handle position changes
- Default bezier handles produce an ease-in-out curve (0.42, 0, 0.58, 1)

---

### T2: Practice Analytics Dashboard

**Goal:** Visualize practice progress with session history, tempo progression charts, and section difficulty heatmaps.

**Files:**
- `src/components/metmap/PracticeAnalytics.tsx` — New: analytics dashboard component
- `src/pages/ToolsMetMap/index.tsx` — Wire analytics panel into the Practice Mode section
- `database/metmap-adapter.js` — Add practice session query methods

**Data sources (already exist):**
- `MetMapStats { songCount, practiceCount, totalPracticeMinutes }`
- `PracticeSession { startedAt, endedAt, settings }` — per-session records
- `PlaybackState` — tracks current bar, beat, tempo during playback

**UI components:**
1. **Session History** — List of recent practice sessions with date, duration, tempo used
2. **Tempo Progress Chart** — Line chart showing max comfortable tempo over time (using canvas, no chart library dependency)
3. **Section Heatmap** — Grid showing which sections were practiced most (bar height = session count)
4. **Practice Streak** — Calendar-style dot grid showing practice days
5. **Summary Cards** — Total time, avg session length, sessions this week

**Implementation:**
1. Create `PracticeAnalytics` component with 4 panels (summary, chart, heatmap, history)
2. Canvas-based mini line chart for tempo progression (no external lib)
3. Query practice sessions from backend (add `GET /api/metmap/songs/:id/practice-sessions`)
4. Aggregate stats client-side for chart data
5. Add a "Stats" toggle button in the Practice Mode header
6. When expanded, show analytics below the loop/tempo controls

**Acceptance:**
- Stats panel shows session count, total time, avg duration
- Tempo chart renders with canvas (no flickering, handles zero data)
- Section heatmap shows relative practice frequency
- Recent sessions list with clickable entries
- Gracefully handles empty state (no sessions yet)

---

### T3: Web Worker Beat Detection

**Goal:** Move beat detection computation to a Web Worker so it doesn't block the main thread.

**Files:**
- `src/workers/beatDetection.worker.ts` — New: Web Worker for beat detection
- `src/services/beatDetection.ts` — Refactor to dispatch to worker
- `vite.config.ts` — Ensure worker bundling is configured (Vite handles `?worker` imports)

**Current problem:** `detectBeats()` processes audio on the main thread via loops over `Float32Array` data, which can freeze the UI for 1-3 seconds on large files.

**Implementation:**
1. Create `beatDetection.worker.ts` that:
   - Accepts `{ channelData: Float32Array, sampleRate: number }` via `postMessage`
   - Runs the existing onset detection algorithm
   - Posts back `{ beatMap: BeatMap }` or `{ error: string }`
2. Refactor `detectBeats()` in `beatDetection.ts` to:
   - Transfer `channelData` to the worker (using Transferable)
   - Return a Promise that resolves when worker posts result
   - Fall back to main-thread execution if Worker fails to load
3. Update `detectBeatsWithCache()` — no changes needed (it wraps `detectBeats`)
4. Vite config: workers with `?worker` suffix are bundled automatically

**Acceptance:**
- Beat detection no longer blocks the UI (progress indicator stays animated)
- Results are identical to main-thread version
- Falls back gracefully if Web Workers unavailable
- AudioBuffer `channelData` transferred (not copied) for performance
- Cache layer continues to work (IndexedDB hit avoids worker dispatch)

---

### T4: Auto-Tempo Ramp for Practice

**Goal:** In practice mode, automatically increase tempo after N successful repetitions — the classic "slow practice → performance tempo" workflow.

**Files:**
- `src/components/metmap/PracticeMode.tsx` — Add auto-ramp controls
- `src/pages/ToolsMetMap/index.tsx` — Wire auto-ramp state into playback

**Feature spec:**
- New toggle: "Auto-ramp" (off by default)
- When enabled, after every N loops (configurable: 2, 4, 8):
  - Increase tempo by a configurable step (5%, 10%, or custom BPM increment)
  - Until target tempo is reached (100% = song's default BPM)
  - Show a brief notification: "Tempo → 85% (102 BPM)"
  - Announce to screen reader
- Controls:
  - Start % (default: current tempoPercent)
  - Target % (default: 100%)
  - Step size (5% / 10% / custom)
  - Loops per step (2 / 4 / 8)
- Visual: small progress bar showing current tempo vs target
- Resets when practice mode is toggled off

**Implementation:**
1. Add `autoRamp` state object: `{ enabled, startPercent, targetPercent, stepPercent, loopsPerStep }`
2. In `index.tsx`, track loop count via `repetitionCount` (already exists)
3. When `repetitionCount % loopsPerStep === 0` and auto-ramp enabled:
   - Increment `tempoPercent` by `stepPercent`
   - Clamp to `targetPercent`
   - Show notification
4. Add compact auto-ramp controls to PracticeMode (collapsible row)
5. Persist auto-ramp settings to localStorage

**Acceptance:**
- Toggle auto-ramp on → tempo increases after configured loop count
- Tempo doesn't exceed target
- Visual indicator shows current vs target tempo
- Screen reader announces tempo changes
- Settings persist across page refreshes
- Turning off practice mode resets the ramp

---

### T5: Chord Drag Polish — Snap-to-Beat + Cross-Section

**Goal:** Enhance Sprint 27's chord drag with beat snap feedback and cross-section dragging.

**Files:**
- `src/pages/ToolsMetMap/MetMapComponents.tsx` — Enhance ChordGrid drag
- `src/services/snapToBeat.ts` — Already exists; integrate into drag

**Enhancements over Sprint 27 implementation:**

1. **Snap-to-beat during drag:**
   - When a song has beat detection data (`beatMap`), pass it to ChordGrid
   - During drag, compute nearest beat using `snapToBeat.nearestBeat()`
   - Show visual snap indicator (highlight cell with yellow ring when snapping)
   - Hold `Alt` key to bypass snap (free placement)

2. **Cross-section drag:**
   - If chord is dragged past the last beat of a section, move it to the adjacent section
   - Requires ChordGrid to receive `onCrossSectionMove` callback
   - Parent coordinates the move: remove from source section's chords, add to target section's chords

3. **Visual improvements:**
   - Ghost chord label follows cursor during drag (positioned via CSS transform)
   - Drop target cell shows the chord symbol in lighter text
   - Invalid drop targets (occupied cells) show red indicator
   - Drag cursor changes to `grabbing`

**Props changes to ChordGrid:**
```ts
interface ChordGridProps {
  section: Section;
  sectionIndex: number;
  chords: Chord[];
  onChordsChange: (chords: Chord[]) => void;
  beatMap?: BeatMap | null;            // new
  onCrossSectionDrop?: (chord: Chord, direction: 'prev' | 'next') => void; // new
}
```

**Acceptance:**
- Dragging near a detected beat shows yellow snap ring
- Alt+drag bypasses snap
- Dragging past section boundary triggers cross-section move
- Ghost label visible during drag
- Occupied target cells show red indicator (drop swaps or is blocked)
- Undo restores chord to original position (already works via snapshot wrappers)

---

## Database Changes

None for this sprint. Practice sessions already have a table; analytics queries use existing data.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/workers/beatDetection.worker.ts` | Web Worker for off-thread beat analysis |
| `src/components/metmap/PracticeAnalytics.tsx` | Practice analytics dashboard |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/metmap/types.ts` | Add `bezierHandles` to Keyframe, add `'bezier'` to EasingType |
| `src/services/keyframeEngine.ts` | Add cubic bezier interpolation |
| `src/components/metmap/KeyframeEditor.tsx` | Render + drag bezier handles |
| `src/components/metmap/TimelineCanvas.tsx` | Render bezier curves on canvas |
| `src/services/beatDetection.ts` | Refactor to use Web Worker |
| `src/components/metmap/PracticeMode.tsx` | Add auto-ramp UI |
| `src/pages/ToolsMetMap/index.tsx` | Wire analytics + auto-ramp + chord snap |
| `src/pages/ToolsMetMap/MetMapComponents.tsx` | Chord snap-to-beat + cross-section drag |
| `database/metmap-adapter.js` | Add practice session query (for analytics) |

---

## Verification

1. **Bezier handles:** Select keyframe → set easing to Bezier → drag handles → curve updates in real time → canvas renders smooth curve
2. **Practice analytics:** Open Practice Mode → click Stats → charts render with data → empty state works
3. **Web Worker:** Upload large audio file → beat detection runs → UI stays responsive → progress spinner animates throughout
4. **Auto-ramp:** Enable practice mode → set auto-ramp → loop plays → tempo increments after N loops → stops at target
5. **Chord snap:** Enable beat detection → drag chord → snaps to nearest beat → Alt bypasses → cross-section move works
6. **Regression:** All Sprint 27 features still work (keyframes, undo/redo, video export, basic chord drag)
