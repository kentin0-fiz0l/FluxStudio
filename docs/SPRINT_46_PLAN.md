# Sprint 46: Formation Editor Polish & Collaboration

**Phase: Creative Canvas (Q1 2026)** — Harden the formation editor for real users and enable multi-user collaborative editing.

## Why This Sprint

The Drill Writer / Formation Editor is the flagship creative tool. Canvas, 3D view, templates, and timeline are built — but the experience has rough edges that block adoption:

| Area | What's Built | What's Missing |
|------|-------------|----------------|
| Formation Canvas | 44KB full editor, performer drag, templates, shape tools | No multi-select rubber-band, no snap-to-grid, no copy/paste |
| 3D Preview | Three.js scene, performer instances, field mesh, orbit | No animation playback between keyframes |
| Yjs Integration | Hooks (`useFormationYjs`), provider, types, presence panel | Not wired to live collaboration — edits don't sync |
| Timeline | Keyframe list, playback controls, timeline scrub | No interpolation preview, no audio binding |
| Export | PDF/image export dialog | No animated GIF / video export |

## Tasks

### T1: Rubber-Band Multi-Select & Snap-to-Grid
**Files:** `src/components/formation/FormationCanvas/index.tsx`, `ShapeToolOverlay.tsx`

- Implement rubber-band (marquee) selection by click-dragging on empty canvas area
- Show translucent blue rectangle during drag, select all enclosed performers on mouse-up
- Add snap-to-grid toggle (8-step grid aligned to yard lines) — performers snap to nearest grid point during drag
- Add `Shift+Click` to toggle individual performers in/out of selection
- Keyboard: `Ctrl/Cmd+C` → copy selected positions, `Ctrl/Cmd+V` → paste as new performers offset by 1 grid step

### T2: Yjs Live Collaboration Wiring
**Files:** `src/hooks/useFormationYjs.ts`, `src/services/ySocketIOProvider.ts`, `src/components/formation/FormationCursorOverlay.tsx`

- Wire `useFormationYjs` hook into the main FormationCanvas so edits (add/move/delete performer) write to Y.Map
- Connect `ySocketIOProvider` to the collaboration server with room = `formation-{formationId}`
- Enable `FormationCursorOverlay` to show live cursor positions from Yjs Awareness API
- Show collaborator avatars in `FormationPresencePanel`
- Add Y.UndoManager binding so undo/redo is per-user

### T3: Keyframe Interpolation & 3D Animation
**Files:** `src/components/formation/Timeline.tsx`, `Formation3DView/Formation3DView.tsx`

- Interpolate performer positions between keyframes using linear lerp (with option for ease-in-out)
- Add playback animation in 3D view: performers smoothly move between formation keyframes
- Timeline scrubbing shows interpolated positions in real-time on both 2D and 3D views
- Add count/beat markers to timeline ruler

### T4: Share & Embed Improvements
**Files:** `routes/formations.js`, `src/pages/SharedFormation.tsx`

- Add "Embed" option to share dialog — generates `<iframe>` snippet for read-only formation viewer
- Embed endpoint: `/embed/:formationId` renders lightweight canvas (no toolbar, no auth) with playback controls
- Share page shows formation name, creator, performer count, and animated preview (auto-play keyframes)
- Add "Duplicate to my account" button for signed-in users viewing shared formations

## Implementation Order

T1 → T2 → T3 → T4

T1 makes the canvas feel professional. T2 enables the collaboration story. T3 brings the timeline to life. T4 drives viral growth through sharing.

## Success Metrics

- Multi-select: rubber-band selects 50+ performers in <100ms
- Yjs sync: two users see each other's edits within 200ms
- Animation: smooth 60fps interpolation between keyframes in 3D view
- Share embeds: functional `<iframe>` embed with auto-play

## Verification

```bash
npx tsc --noEmit
npx vite build

# Manual checks:
# - Drag rubber-band on canvas → selects enclosed performers
# - Toggle snap-to-grid → performers align to grid
# - Open formation in two browser tabs → edits sync in real-time
# - Scrub timeline → 2D and 3D views show interpolated positions
# - Copy share embed code → paste in HTML → renders formation
```
