# Sprint 32: Ghost Cursors, Conflict Toasts & Canvas Comments

**Phase:** 2.2 — Collaborative Canvas (third sprint)
**Depends on:** Sprint 31 (presence, server Yjs, Y.UndoManager, reconnection, granular chords)
**Duration:** 4 tasks

## Summary

Sprint 32 completes the core collaborative editing loop. Ghost cursors show where peers are on the timeline canvas in real-time, conflict toasts alert users when edits overlap, and canvas comments enable async discussion anchored to specific bars/sections. Together these three features — plus a mouse-move presence upgrade — make MetMap collaboration feel alive and communicative.

### Goals
- Ghost cursors on the HTML5 Canvas timeline (vertical lines + name labels in peer colors)
- Mouse-move presence broadcasting via Awareness (throttled, canvas-only)
- Conflict detection toasts when two peers edit the same section simultaneously
- Canvas comments anchored to bar ranges, synced via Yjs

### Deferred to Sprint 33+
- Voice/video presence (WebRTC — Phase 2.2 late)
- Design branching and history (Phase 2.2 late)
- Comment threading / reply chains
- Comment reactions
- Comment resolution workflow

---

## Tasks

### T1: Ghost Cursors on Timeline Canvas

**Goal:** Render semi-transparent vertical cursor lines for each remote peer on the `TimelineCanvas`, using the `cursorBar` field already in `MetMapPresence`.

**Files:**
- `src/components/metmap/TimelineCanvas.tsx` — Add ghost cursor rendering layer + mouse-move handler
- `src/hooks/useMetMapPresence.ts` — Add `setCursorBar` to mouse-move broadcasts
- `src/pages/ToolsMetMap/index.tsx` — Pass `remotePeers` into `TimelineCanvas`

**Current state:**
- `TimelineCanvas` renders via HTML5 Canvas 2D context (354 lines)
- `MetMapPresence` already has `cursorBar: number | null` field
- `useMetMapPresence` already exports `setCursorBar()` method
- Playback cursor renders as amber vertical line at line 280-298

**Implementation:**

1. Add `remotePeers` prop to `TimelineCanvasProps`:
   ```ts
   interface TimelineCanvasProps {
     // ... existing props
     remotePeers?: MetMapPresence[];
   }
   ```

2. Render ghost cursors in the `draw()` function, after the playback cursor (line 298) and before the closing of the function:
   ```ts
   // --- Ghost cursors (remote peers) ---
   if (remotePeers && remotePeers.length > 0) {
     for (const peer of remotePeers) {
       if (peer.cursorBar == null || peer.cursorBar < 1) continue;
       const ghostX = (peer.cursorBar - 1) * pixelsPerBar;

       // Semi-transparent vertical line
       ctx.strokeStyle = peer.color;
       ctx.lineWidth = 1.5;
       ctx.globalAlpha = 0.5;
       ctx.beginPath();
       ctx.moveTo(ghostX, 0);
       ctx.lineTo(ghostX, height);
       ctx.stroke();
       ctx.globalAlpha = 1;

       // Name label pill
       const label = peer.username.split(' ')[0]; // First name only
       ctx.font = '9px system-ui, sans-serif';
       const textWidth = ctx.measureText(label).width;
       const pillX = ghostX - textWidth / 2 - 4;
       const pillY = height - 16;

       ctx.fillStyle = peer.color;
       ctx.globalAlpha = 0.8;
       roundRect(ctx, pillX, pillY, textWidth + 8, 14, 3);
       ctx.fill();
       ctx.globalAlpha = 1;

       ctx.fillStyle = '#fff';
       ctx.textAlign = 'center';
       ctx.fillText(label, ghostX, height - 6);
       ctx.textAlign = 'left'; // Reset
     }
   }
   ```

3. Add `onMouseMove` handler to track local cursor position:
   ```ts
   const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const rect = canvas.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const bar = Math.floor(x / pixelsPerBar) + 1;
     onCursorMove?.(bar);
   }, [pixelsPerBar]);
   ```
   - Add `onCursorMove?: (bar: number) => void` to props
   - Throttle in the parent (ToolsMetMap) via `setCursorBar` which already throttles at 5s in useMetMapPresence
   - Reduce cursor throttle to ~100ms for smooth movement (new `setCursorBarImmediate` with shorter throttle)

4. Add `onMouseLeave` to clear cursor:
   ```ts
   const handleMouseLeave = useCallback(() => {
     onCursorMove?.(0); // Clears cursorBar
   }, []);
   ```

5. Wire in `ToolsMetMap/index.tsx`:
   ```tsx
   <TimelineCanvas
     // ... existing props
     remotePeers={remotePeers}
     onCursorMove={(bar) => setCursorBar(bar)}
   />
   ```

6. Add a fast cursor throttle path to `useMetMapPresence`:
   - Current activity throttle is 5s (fine for `editingSection`, `lastActive`)
   - Add a separate 100ms throttle for `cursorBar` updates only
   - Use `requestAnimationFrame` debounce to avoid flooding awareness

**Helper — `roundRect` for canvas:**
```ts
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
```

**Acceptance:**
- Mouse over canvas in Tab A → ghost cursor appears in Tab B at the same bar
- Ghost cursor uses peer's assigned color with 50% opacity
- Name label pill floats at the bottom of the cursor line
- Mouse leaves canvas → ghost cursor disappears in other tabs
- Playback cursor (amber) renders on top of ghost cursors
- No jitter or flooding — cursor updates throttled to ~100ms
- Canvas performance stays smooth (no extra `requestAnimationFrame` loop needed — redraws happen on awareness change)

---

### T2: Conflict Detection Toasts

**Goal:** Alert users when two peers are editing the same section simultaneously, using the existing Sonner toast library.

**Files:**
- `src/hooks/useConflictDetection.ts` — New: detect overlapping edits
- `src/pages/ToolsMetMap/index.tsx` — Wire conflict detection
- (Uses existing `sonner` toast library, already installed and mounted via `ToastContainer`)

**Conflict scenarios:**
1. **Same-section editing** — Two users have `editingSection` pointing to the same section ID
2. **Same-keyframe editing** — Two users have `selectedKeyframe` pointing to the same keyframe ID

**Implementation:**

1. Create `useConflictDetection(localPresence, remotePeers)` hook:
   ```ts
   interface ConflictEvent {
     type: 'section' | 'keyframe';
     peerId: string;
     peerName: string;
     peerColor: string;
     targetId: string;
     targetName?: string;
   }

   function useConflictDetection(
     localEditingSection: string | null,
     localSelectedKeyframe: string | null,
     remotePeers: MetMapPresence[],
     sections: Section[]
   ): void
   ```

2. Use `useEffect` to detect overlaps when `localEditingSection` or `remotePeers` change:
   ```ts
   useEffect(() => {
     if (!localEditingSection) return;
     const conflicting = remotePeers.filter(
       p => p.editingSection === localEditingSection && !isPeerIdle(p)
     );
     for (const peer of conflicting) {
       // Deduplicate: only toast once per peer+section combo
       const key = `conflict-${peer.userId}-${localEditingSection}`;
       if (shownRef.current.has(key)) continue;
       shownRef.current.add(key);

       const sectionName = sections.find(s => s.id === localEditingSection)?.name || 'this section';
       toast.warning(`${peer.username} is also editing "${sectionName}"`, {
         id: key,
         duration: 5000,
         description: 'Your changes will merge automatically via Yjs.',
       });

       // Clear after 30s so it can re-trigger
       setTimeout(() => shownRef.current.delete(key), 30_000);
     }
   }, [localEditingSection, remotePeers, sections]);
   ```

3. Same pattern for keyframe conflicts (lower priority, shorter toast).

4. Wire in `ToolsMetMap/index.tsx`:
   ```ts
   useConflictDetection(
     currentEditingSection,
     currentSelectedKeyframe,
     remotePeers,
     editedSections
   );
   ```
   Where `currentEditingSection` comes from presence state.

**Design:**
- Yellow warning toast (Sonner's `toast.warning()`)
- Shows peer name + section name: `"Alex is also editing 'Verse 1'"`
- Subtitle: "Your changes will merge automatically via Yjs."
- Auto-dismisses after 5 seconds
- Deduplicates: same peer+section combo only toasts once per 30 seconds
- Does NOT block or prevent editing — purely informational

**Acceptance:**
- Tab A clicks "Verse 1" → Tab B clicks "Verse 1" → both tabs see warning toast
- Toast shows peer name and section name
- Toast auto-dismisses after 5 seconds
- Same conflict doesn't re-toast within 30 seconds
- No toast when editing different sections
- No toast for idle peers editing the same section

---

### T3: Canvas Comments (Yjs-Synced)

**Goal:** Allow users to add comments anchored to specific bar positions on the timeline. Comments are stored in the shared Yjs document and appear as pin markers on the canvas with a popover for reading/writing.

**Files:**
- `src/components/metmap/CanvasCommentLayer.tsx` — New: DOM overlay for comment pins + popovers
- `src/hooks/useMetMapComments.ts` — New: Yjs-backed comment CRUD
- `src/services/metmapCollaboration.ts` — Extend Y.Doc schema with `yComments` array
- `src/components/metmap/TimelineCanvas.tsx` — Render comment pin markers on canvas
- `src/pages/ToolsMetMap/index.tsx` — Wire comments into the page

**Comment data model (stored in Yjs Y.Array<Y.Map>):**
```ts
interface CanvasComment {
  id: string;
  userId: string;
  username: string;
  color: string;
  barStart: number;      // Anchor bar position
  barEnd?: number;        // Optional range (highlight a bar range)
  text: string;
  createdAt: number;      // Unix timestamp
  resolved: boolean;
}
```

**Implementation:**

1. Extend `metmapCollaboration.ts` with `yComments`:
   ```ts
   // In initializeDocument / syncSections:
   const yComments = doc.getArray('comments');

   // API methods:
   addComment(comment: Omit<CanvasComment, 'id' | 'createdAt'>): void
   updateComment(commentId: string, text: string): void
   resolveComment(commentId: string): void
   deleteComment(commentId: string): void
   getComments(): CanvasComment[]
   ```

2. Create `useMetMapComments(doc)` hook:
   ```ts
   function useMetMapComments(doc: Y.Doc | null): {
     comments: CanvasComment[];
     addComment: (barStart: number, text: string, barEnd?: number) => void;
     resolveComment: (id: string) => void;
     deleteComment: (id: string) => void;
   }
   ```
   - Observes `doc.getArray('comments')` for changes
   - Returns reactive comment array
   - Mutations wrapped in `doc.transact()` for undo grouping

3. Render comment pin markers on the canvas (in `TimelineCanvas.draw()`):
   ```ts
   // --- Comment pins ---
   if (comments && comments.length > 0) {
     for (const comment of comments) {
       if (comment.resolved) continue;
       const pinX = (comment.barStart - 1) * pixelsPerBar;

       // Pin icon (speech bubble shape)
       ctx.fillStyle = comment.color;
       ctx.globalAlpha = 0.9;
       ctx.beginPath();
       ctx.arc(pinX, 10, 5, 0, Math.PI * 2);
       ctx.fill();
       ctx.globalAlpha = 1;

       // Bar range highlight
       if (comment.barEnd && comment.barEnd > comment.barStart) {
         const rangeWidth = (comment.barEnd - comment.barStart) * pixelsPerBar;
         ctx.fillStyle = `${comment.color}15`;
         ctx.fillRect(pinX, 0, rangeWidth, height);
       }
     }
   }
   ```

4. Create `CanvasCommentLayer.tsx` — a positioned DOM overlay on top of the canvas:
   ```tsx
   // Absolute-positioned div matching canvas dimensions
   // Contains clickable pin targets at each comment's bar position
   // Click opens a Radix Popover with:
   //   - Comment text
   //   - Author name + timestamp
   //   - "Resolve" button (marks comment as resolved, hides pin)
   //   - "Delete" button (own comments only)
   // Double-click on empty canvas area → opens "Add comment" popover
   ```

   Layout:
   ```
   ┌─CanvasCommentLayer (position: absolute, pointer-events: none) ─┐
   │  ┌─pin (pointer-events: auto)──┐                                │
   │  │  💬                          │                                │
   │  │  ┌─ Popover ──────────────┐ │                                │
   │  │  │ "Fix timing here"      │ │                                │
   │  │  │ Alex · 2m ago          │ │                                │
   │  │  │ [Resolve] [Delete]     │ │                                │
   │  │  └────────────────────────┘ │                                │
   │  └─────────────────────────────┘                                │
   └─────────────────────────────────────────────────────────────────┘
   ```

5. Wire in `ToolsMetMap/index.tsx`:
   ```tsx
   const { comments, addComment, resolveComment, deleteComment } = useMetMapComments(collabDoc);

   // In the timeline area:
   <div className="relative">
     <TimelineCanvas
       // ... existing props
       comments={comments}
     />
     <CanvasCommentLayer
       comments={comments}
       pixelsPerBar={pixelsPerBar}
       onAddComment={addComment}
       onResolveComment={resolveComment}
       onDeleteComment={deleteComment}
       currentUserId={user?.id}
     />
   </div>
   ```

**Acceptance:**
- Double-click bar 5 on canvas → popover opens → type comment → press Enter → pin appears at bar 5 in both tabs
- Click pin → popover shows comment text, author, timestamp
- "Resolve" hides the pin (still in data, just filtered out of canvas render)
- Delete removes from Yjs array → disappears in all tabs
- Bar range comments highlight the range with semi-transparent color
- Comments survive page refresh (persisted in Yjs doc → flushed to DB by server)
- Y.UndoManager does NOT undo comment creation (comments scoped to separate Y.Array, outside undo scope)

---

### T4: Mouse-Move Presence (Fast Cursor Path)

**Goal:** Add a fast-path for cursor position updates that bypasses the 5-second activity throttle, enabling smooth ghost cursor movement.

**Files:**
- `src/hooks/useMetMapPresence.ts` — Add fast cursor update path
- `src/services/ySocketIOProvider.ts` — No changes (Awareness already handles rapid updates)

**Problem:**
The current `useMetMapPresence` throttles all awareness updates to 5 seconds (suitable for `editingSection`, `lastActive`). Ghost cursors need ~100ms updates to feel responsive.

**Implementation:**

1. Split awareness updates into two tiers in `useMetMapPresence`:
   - **Slow tier (5s):** `editingSection`, `selectedKeyframe`, `lastActive` — unchanged
   - **Fast tier (100ms):** `cursorBar` only

2. Add `setCursorBarFast` method:
   ```ts
   const cursorThrottleRef = useRef<number>(0);

   const setCursorBarFast = useCallback((bar: number | null) => {
     const now = Date.now();
     if (now - cursorThrottleRef.current < 100) return;
     cursorThrottleRef.current = now;

     awareness?.setLocalStateField('cursorBar', bar);
   }, [awareness]);
   ```

3. Return `setCursorBarFast` alongside existing `setCursorBar`:
   ```ts
   return {
     peers,
     remotePeers,
     setEditingSection,
     setSelectedKeyframe,
     setCursorBar,          // Slow (5s) — for programmatic use
     setCursorBarFast,      // Fast (100ms) — for mouse-move
   };
   ```

4. Awareness change handler already triggers re-render on state changes — ghost cursors will redraw on next `draw()` call triggered by the awareness observer.

5. Optimize canvas redraws:
   - Only call `draw()` when awareness changes if ghost cursors are actually visible
   - Skip redraw if cursor position didn't change (memoize previous remote cursor state)

**Acceptance:**
- Mouse movement on canvas in Tab A → smooth cursor tracking in Tab B (~100ms latency)
- No awareness flooding (100ms minimum between cursor updates)
- Other presence fields (editingSection, lastActive) still throttled at 5s
- Canvas FPS stays at 60fps during cursor movement
- Memory stable — no growing awareness state

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useConflictDetection.ts` | Overlap detection + toast notifications |
| `src/hooks/useMetMapComments.ts` | Yjs-backed comment CRUD hook |
| `src/components/metmap/CanvasCommentLayer.tsx` | DOM overlay for comment pins + popovers |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/metmap/TimelineCanvas.tsx` | Ghost cursor rendering, comment pins, mouse-move handler |
| `src/hooks/useMetMapPresence.ts` | Fast cursor throttle path (100ms) |
| `src/services/metmapCollaboration.ts` | Add `yComments` Y.Array, comment CRUD methods |
| `src/pages/ToolsMetMap/index.tsx` | Wire ghost cursors, conflict detection, comments |

---

## Verification

1. **Ghost cursors:** Open same song in two browser profiles → hover canvas in Tab A → see colored cursor + name in Tab B → move mouse → cursor follows smoothly → leave canvas → cursor disappears
2. **Conflict toasts:** Both tabs click same section → yellow warning toast appears in both → toast auto-dismisses after 5s → doesn't re-fire within 30s → no toast when editing different sections
3. **Canvas comments:** Double-click bar 5 → type comment → pin appears in both tabs → click pin → see popover → resolve → pin disappears → delete → removed from both tabs
4. **Performance:** Ghost cursor movement doesn't drop canvas FPS below 60 → awareness updates stay at ~100ms minimum interval → no memory growth
5. **Regression:** All Sprint 31 features still work (presence avatars, undo, reconnection, granular chords)
