# Sprint 47: Audio Sync & Performance Optimization

**Phase: Creative Canvas (Q1 2026)** — Bind formations to music and hit performance targets.

## Why This Sprint

The formation editor creates static formations — but marching bands, dance teams, and drum corps perform to music. Audio sync is the feature that makes FluxStudio indispensable:

| Need | Current State | Target |
|------|--------------|--------|
| Audio timeline | Audio upload exists, no binding | Formations sync to beat markers |
| BPM detection | Not implemented | Auto-detect tempo, snap keyframes to beats |
| Performance | ~650KB bundle, ~1.5s TTI | <500KB bundle, <1s TTI |
| Lighthouse | Untested | 90+ enforced |

## Tasks

### T1: Audio-to-Formation Timeline Binding
**Files:** `src/components/formation/AudioUpload.tsx`, `Timeline.tsx`, new `src/services/audioAnalysis.ts`

- Parse uploaded audio with Web Audio API → extract waveform data for visualization
- Implement BPM detection using autocorrelation on AudioBuffer
- Display beat markers on timeline ruler aligned with detected BPM
- Add "Snap keyframes to beat" toggle — when enabled, keyframes snap to nearest beat marker
- Bind formation keyframes to beat numbers (not absolute time) so tempo changes reflow

### T2: Synchronized Playback
**Files:** `Timeline.tsx`, `FormationCanvas/index.tsx`, `Formation3DView.tsx`

- Play audio and animate formations simultaneously
- Audio playhead drives timeline position — canvas and 3D view update in sync
- Transport controls: play, pause, stop, loop, tempo adjust (±10%)
- Scrubbing the timeline seeks audio to matching position
- Visual metronome indicator showing current beat

### T3: Bundle Size Reduction
**Files:** `vite.config.ts`, various imports

- Audit bundle with `npx vite-bundle-visualizer`
- Lazy-load Three.js (`React.lazy` for Formation3DView and all `@react-three/*` imports)
- Lazy-load Tiptap editor and collaboration components
- Tree-shake unused Radix UI components
- Move Sharp to server-only (verify it's not in frontend bundle)
- Target: main chunk <300KB, largest lazy chunk <200KB

### T4: Lighthouse CI & Web Vitals Pipeline
**Files:** `vite.config.ts`, `routes/analytics.js`, `database/migrations/124_web_vitals.sql`

- Add Web Vitals RUM pipeline (from Sprint 45 T1): `POST /api/analytics/vitals` endpoint
- Wire `PerformanceMonitoringService` to send vitals via `navigator.sendBeacon`
- Add `GET /api/analytics/vitals/summary` for admin dashboard
- Add Lighthouse CI config (`.lighthouserc.js`) with budgets: performance 90, a11y 90, best-practices 90
- Preload critical fonts, defer non-critical CSS

## Implementation Order

T1 → T2 → T3 → T4

T1-T2 deliver the audio sync feature. T3-T4 optimize performance for public launch.

## Success Metrics

- BPM detection accuracy: within ±2 BPM for 90-180 BPM range
- Audio-formation sync: <16ms drift between audio playhead and formation position
- Bundle size: main chunk <300KB (from ~650KB)
- Lighthouse: 90+ on performance, accessibility, best practices
- Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1

## Verification

```bash
npx tsc --noEmit
npx vite build
npx vite-bundle-visualizer  # Check chunk sizes

# Manual checks:
# - Upload MP3 → see waveform and beat markers on timeline
# - Play → formations animate in sync with music
# - Adjust tempo → keyframes reflow to new beat positions
# - Check bundle: no Three.js in main chunk
# - Run Lighthouse → scores 90+ across the board
```
