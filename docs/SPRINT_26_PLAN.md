# Sprint 26: Visual Timeline Editor — Foundation

> Status: PLANNED | Target: Phase 2.1 of Roadmap

## Current State

MetMap is a chord-focused musical timeline editor. It currently handles song structure (sections, chords, tempo curves) with a timer-based playback engine and CSS-rendered timeline.

| Component | Status | Notes |
|-----------|--------|-------|
| `PlaybackContext` | Exists | Timer-based tick engine with variable tempo per section, `getTempoAtBeat()` supports linear/exponential/step curves |
| `VisualTimeline` | Exists | CSS bar graph showing section tempo ramps, current bar indicator, loop regions — **100% HTML/Tailwind, no canvas** |
| `MetMapContext` | Exists | Full CRUD for songs, sections, chords via REST API |
| Audio Engine | **Metronome only** | Web Audio API generates click sounds — no audio file loading, no waveform, no beat detection |
| Canvas/WebGL | **None** | Entire UI is HTML/CSS — will not scale for waveforms, keyframes, or drag operations |
| Waveform Viz | **Missing** | No wavesurfer.js, no canvas drawing, no audio buffer analysis |
| Beat Detection | **Missing** | No onset detection, no tempo extraction from audio files |
| Keyframe System | **Missing** | No animation keyframes, no easing curves, no interpolation |
| Video Export | **Missing** | Only JSON import/export exists |
| Undo/Redo | **Missing** | No command history pattern |

### Key Gaps for Phase 2.1

1. **No audio file support** — can't load, decode, or visualize audio files
2. **CSS rendering won't scale** — need canvas for waveforms, keyframe curves, and smooth scrubbing
3. **No beat detection** — can't snap chords/events to audio beats
4. **No keyframe abstraction** — no way to animate properties over time
5. **Playback engine is metronome-only** — needs audio file synchronization

---

## Strategy

Sprint 26 focuses on the **audio foundation layer** — getting audio files loaded, visualized, and synced with the existing playback engine. This is the prerequisite for everything else in Phase 2.1.

Keyframe transitions and video export are deferred to Sprint 27-28. You can't build keyframes without a working timeline, and you can't export video without keyframes.

### Sprint 26 Scope
- Audio file upload + Web Audio API decoding
- Waveform visualization (wavesurfer.js)
- Beat detection from audio (onset detection)
- Playback engine upgrade: sync audio + metronome
- Canvas-based timeline replacing CSS bars
- Snap-to-beat for chord placement

### Deferred to Sprint 27+
- Keyframe system (property animation over time)
- Easing curves and interpolation engine
- Video export (canvas capture + ffmpeg.wasm)
- Multi-track audio layering

---

## Dependencies to Install

```bash
pnpm add wavesurfer.js            # Waveform visualization (v7+, canvas-based)
pnpm add aubiojs                   # Beat/onset detection via Aubio WASM
```

**wavesurfer.js v7** is a complete rewrite — lightweight, canvas-based, plugin architecture. No jQuery dependency.

**aubiojs** provides WASM-compiled Aubio for tempo and onset detection in the browser. Alternative: `web-audio-beat-detector` (pure JS, less accurate but zero WASM).

---

## Tasks

### T1: Audio File Upload + Decode

**Goal:** Users can attach an audio file to a song and decode it to an AudioBuffer.

**Files:**
- `src/contexts/metmap/types.ts` — Add `audioFileUrl?: string` and `audioBuffer?: AudioBuffer` to Song type
- `src/contexts/metmap/MetMapContext.tsx` — Add `loadAudioFile(songId, file)` and `decodeAudio(url)` methods
- `src/services/apiService.ts` — Add `uploadSongAudio(songId, file)` endpoint call
- `routes/metmap.js` — Add `POST /api/metmap/songs/:id/audio` route (multer upload to S3)
- `database/migrations/` — Add `audio_file_url` column to `metmap_songs` table

**Implementation:**
1. Frontend: File input accepts `.mp3, .wav, .ogg, .flac, .m4a`
2. Upload via multipart form to backend, store in S3/Spaces
3. Backend returns URL, saved to `metmap_songs.audio_file_url`
4. Frontend creates `AudioContext`, fetches URL, calls `decodeAudioData()`
5. Store resulting `AudioBuffer` in React state (not Zustand — too large for serialization)

**Acceptance:**
- Can upload an audio file from the song settings panel
- AudioBuffer is decoded and available for waveform rendering
- Loading state shown during upload + decode
- Error handling for unsupported formats and decode failures

---

### T2: Waveform Visualization with wavesurfer.js

**Goal:** Render the song's audio waveform in the timeline area.

**Files:**
- `src/components/metmap/WaveformTimeline.tsx` — New component wrapping wavesurfer.js
- `src/components/metmap/VisualTimeline.tsx` — Integrate waveform behind existing section bars

**Implementation:**
1. Create `WaveformTimeline` component:
   ```tsx
   const ws = WaveSurfer.create({
     container: containerRef.current,
     waveColor: 'rgba(99, 102, 241, 0.4)',
     progressColor: 'rgba(99, 102, 241, 0.8)',
     cursorColor: '#f59e0b',
     height: 128,
     normalize: true,
     interact: true,   // click-to-seek
     backend: 'WebAudio',
   });
   ws.loadBlob(audioFile);  // or ws.load(audioUrl)
   ```
2. Sync wavesurfer playback position with `PlaybackContext` tick engine
3. Layer waveform behind the existing section color bars (absolute positioning)
4. Handle zoom: wavesurfer `minPxPerSec` maps to timeline zoom level
5. Click-to-seek updates both wavesurfer and PlaybackContext position

**Acceptance:**
- Waveform renders when a song has an audio file
- Playback scrubber syncs with existing metronome playback
- Click anywhere on waveform to seek
- Zoom in/out adjusts waveform detail
- Falls back to existing CSS timeline when no audio file is attached

---

### T3: Playback Engine Upgrade — Audio Sync

**Goal:** Synchronize audio file playback with the existing timer-based metronome engine.

**Files:**
- `src/contexts/metmap/PlaybackContext.tsx` — Major refactor to dual-source playback

**Implementation:**
1. When a song has audio: use wavesurfer as the **primary clock source**
   - wavesurfer's `audioprocess` event fires ~60fps with current time
   - Convert wall-clock time to beat position using tempo map
   - Feed beat position to existing `onTick` callbacks for metronome clicks
2. When no audio: keep existing `setTimeout`-based tick engine (unchanged)
3. Add `PlaybackMode` enum: `'metronome' | 'audio' | 'both'`
   - `metronome`: existing behavior, click sounds only
   - `audio`: audio file plays, no clicks
   - `both`: audio + click overlay (practice mode)
4. Tempo changes in sections still work — audio playback rate stays at 1x, metronome adapts
5. Loop regions: wavesurfer `setRegion()` for audio, existing loop logic for metronome

**Key challenge:** The existing engine calculates beat position from elapsed time using `getTempoAtBeat()`. With audio sync, we invert this: get wall-clock time from wavesurfer → calculate beat position → fire metronome at that beat.

**Acceptance:**
- Audio plays in sync with metronome clicks
- Seek on waveform updates beat position
- Play/pause/stop controls work for both audio and metronome
- Loop regions respect audio boundaries
- Mode toggle (metronome only / audio only / both)

---

### T4: Beat Detection + Onset Markers

**Goal:** Analyze audio files to detect beats and display them as markers on the timeline.

**Files:**
- `src/services/beatDetection.ts` — New service wrapping aubiojs
- `src/components/metmap/BeatMarkers.tsx` — New component rendering beat lines on timeline
- `src/contexts/metmap/types.ts` — Add `BeatMap` type

**Implementation:**
1. Beat detection service:
   ```ts
   interface BeatMap {
     bpm: number;
     beats: number[];      // timestamps in seconds
     onsets: number[];      // onset timestamps
     confidence: number;    // 0-1 detection confidence
   }

   async function detectBeats(audioBuffer: AudioBuffer): Promise<BeatMap>
   ```
2. Use aubiojs `Tempo` detector on the decoded AudioBuffer
3. Run detection in a Web Worker to avoid blocking UI
4. Cache results in IndexedDB (keyed by audio file hash) to avoid re-analyzing
5. Render beat markers as thin vertical lines on the waveform
6. Show detected BPM vs song's set BPM — offer to align

**Acceptance:**
- Beat detection runs after audio decode, shows progress indicator
- Beat markers visible on timeline as subtle vertical lines
- Detected BPM displayed alongside song's configured BPM
- Results cached — re-opening a song doesn't re-analyze
- Works in Web Worker, no UI freeze on long audio files

---

### T5: Snap-to-Beat for Chord Placement

**Goal:** When adding or moving chords, snap to detected beats.

**Files:**
- `src/components/metmap/ChordBlock.tsx` — Add snap behavior to drag handlers
- `src/contexts/metmap/MetMapContext.tsx` — Add `nearestBeat(timeInSeconds)` utility
- `src/components/metmap/VisualTimeline.tsx` — Visual snap guides

**Implementation:**
1. `nearestBeat(time, beatMap, threshold)` — returns closest beat timestamp within threshold (default 50ms)
2. When dragging a chord block, if within snap threshold of a detected beat:
   - Visual: chord block "snaps" to beat line with a subtle highlight
   - Audio: optional snap click sound
3. When placing a new chord via click on timeline:
   - If beat markers exist, default to nearest beat
   - Hold `Alt` to override snap (free placement)
4. Convert snapped time position back to bar/beat coordinates using tempo map
5. Show snap guides as highlighted beat lines during drag

**Acceptance:**
- Chords snap to nearest detected beat during drag
- Visual indicator shows snap target
- Alt+drag bypasses snap for free placement
- Snapping works correctly across tempo changes between sections
- Chord bar/beat values update correctly after snap

---

### T6: Canvas-Based Timeline Renderer

**Goal:** Replace CSS bar graph with a canvas renderer for smooth zoom, pan, and future keyframe overlays.

**Files:**
- `src/components/metmap/TimelineCanvas.tsx` — New canvas-based timeline renderer
- `src/components/metmap/VisualTimeline.tsx` — Refactor to use canvas renderer

**Implementation:**
1. Create `TimelineCanvas` using `<canvas>` with 2D context:
   - Section color regions (replacing CSS divs)
   - Tempo curve visualization (lines between tempoStart → tempoEnd)
   - Bar/beat grid lines
   - Current playback position cursor
   - Loop region highlight
   - Beat detection markers (from T4)
2. Layering order (bottom to top):
   - Background grid (bars, beats)
   - Section color regions
   - Waveform (wavesurfer renders in its own canvas, positioned behind)
   - Beat markers
   - Chord blocks (remain as HTML overlays for interaction — canvas underneath)
   - Playback cursor
3. Zoom: adjust pixels-per-beat ratio, redraw
4. Pan: horizontal scroll offset, redraw
5. Use `requestAnimationFrame` for playback cursor animation
6. Handle DPR (device pixel ratio) for crisp rendering on Retina

**Acceptance:**
- Timeline renders identically to current CSS version
- Zoom in/out works smoothly (mousewheel + pinch)
- Horizontal pan via scroll or drag
- Playback cursor animates smoothly at 60fps
- Section colors, tempo curves, and grid lines all render correctly
- Performance: no jank on songs with 100+ sections

---

### T7: Integration + Song Settings UI

**Goal:** Wire everything together with a clean UI for audio management.

**Files:**
- `src/components/metmap/SongSettings.tsx` — Add audio file section
- `src/components/metmap/PlaybackControls.tsx` — Add mode toggle
- `src/components/metmap/MetMapEditor.tsx` — Wire up new components

**Implementation:**
1. Song Settings panel additions:
   - "Audio Track" section with file upload dropzone
   - Audio file info display (name, duration, size)
   - Remove audio button
   - Beat detection status and detected BPM display
   - "Align song BPM to detected BPM" button
2. Playback Controls additions:
   - Mode toggle: Metronome / Audio / Both (segmented control)
   - Visual indicator of current mode
3. MetMap Editor layout:
   - WaveformTimeline positioned behind TimelineCanvas
   - BeatMarkers overlay
   - Existing chord blocks on top

**Acceptance:**
- Complete workflow: upload audio → see waveform → detect beats → place chords → play back
- Settings panel is clean and non-intrusive
- Mode toggle is intuitive
- All existing MetMap functionality still works without audio

---

## Database Migration

```sql
ALTER TABLE metmap_songs
ADD COLUMN audio_file_url TEXT,
ADD COLUMN audio_duration_seconds NUMERIC(10,3),
ADD COLUMN detected_bpm NUMERIC(6,2),
ADD COLUMN beat_map JSONB;
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/metmap/WaveformTimeline.tsx` | wavesurfer.js wrapper |
| `src/components/metmap/BeatMarkers.tsx` | Beat detection overlay |
| `src/components/metmap/TimelineCanvas.tsx` | Canvas-based timeline renderer |
| `src/services/beatDetection.ts` | Audio analysis service |
| `src/workers/beatDetectionWorker.ts` | Web Worker for offline analysis |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/metmap/types.ts` | Add audio/beat types to Song |
| `src/contexts/metmap/PlaybackContext.tsx` | Dual-source playback (audio + metronome) |
| `src/contexts/metmap/MetMapContext.tsx` | Audio upload, beat detection integration |
| `src/components/metmap/VisualTimeline.tsx` | Layer canvas + waveform underneath |
| `src/components/metmap/ChordBlock.tsx` | Snap-to-beat during drag |
| `src/components/metmap/SongSettings.tsx` | Audio file management UI |
| `src/components/metmap/PlaybackControls.tsx` | Mode toggle |
| `src/components/metmap/MetMapEditor.tsx` | Wire new components |
| `routes/metmap.js` | Audio upload endpoint |
| `src/services/apiService.ts` | Audio upload API call |

## Verification

1. **Upload flow:** Upload `.mp3` → waveform renders → beat markers appear
2. **Playback sync:** Play button → audio + metronome in sync → seek works
3. **Snap-to-beat:** Drag chord → snaps to beat marker → Alt bypasses
4. **Canvas timeline:** Zoom/pan smooth → sections render → cursor animates at 60fps
5. **No audio fallback:** Songs without audio → existing CSS timeline + metronome work unchanged
6. **Performance:** Load a 5-minute audio file → decode < 3s → beat detection < 10s
7. `pnpm run typecheck` — no errors
8. `pnpm run lint` — clean
