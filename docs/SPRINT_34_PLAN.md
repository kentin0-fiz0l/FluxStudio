# Sprint 34: AI Creative Co-Pilot — Song Analysis & Suggestions

**Phase:** 3.1 — AI Creative Co-Pilot (first sprint)
**Depends on:** Sprint 33 (Phase 2.2 complete), existing Anthropic SDK integration
**Duration:** 4 tasks

## Summary

Sprint 34 kicks off Phase 3 by connecting Claude to the MetMap data model. The existing AI infrastructure (streaming SSE, rate limiting, auth) is reused — we add MetMap-specific analysis endpoints and a contextual sidebar panel. Users can ask Claude to analyze their song structure, suggest chord progressions, get arrangement feedback, and receive practice insights — all grounded in their actual composition data.

### Goals
- Song analysis endpoint: feed full song context to Claude for structural/harmonic feedback
- Chord suggestion endpoint: context-aware chord substitutions and extensions
- Practice insights endpoint: analyze practice history for improvement recommendations
- MetMap AI Panel: sidebar UI for interacting with the co-pilot from within the timeline editor

### Architecture Decisions
- **Reuse existing `/api/ai` route pattern** — new endpoints under `/api/ai/metmap/*`
- **Streaming responses** — SSE for analysis (reuse `streamChat` pattern from `routes/ai.js`)
- **Context serialization** — helper function that converts MetMap state to a structured prompt
- **No new AI provider** — uses same `@anthropic-ai/sdk` instance and model config
- **Rate limited** — 15 requests/minute for analysis endpoints (between chat's 30 and design-review's 10)

---

## Tasks

### T1: MetMap Context Serializer

**Goal:** Create a utility that converts a song's full state (sections, chords, keyframes, practice history, audio analysis) into a structured text representation suitable for Claude prompts.

**Files:**
- `src/services/metmapAIContext.ts` — New: context serialization
- `lib/metmap-ai-context.js` — New: server-side context builder (for API routes)

**Implementation:**

1. Create `lib/metmap-ai-context.js` — server-side context builder:
   ```js
   function buildMetMapContext(song, sections, chords, practiceHistory, options = {}) {
     // Returns structured text block for Claude system prompt
   }
   ```
   - Song header: title, BPM, time signature, total bars, section count
   - Section breakdown: name, bars, tempo (with ramp if present), time signature
   - Chord progression: formatted per-section (`| Cmaj7 . | G7 . | Am7 . | Dm7 G7 |`)
   - Keyframe summary: animation properties and ranges (if `options.includeAnimations`)
   - Audio analysis: detected BPM, confidence, beat count (if available)
   - Practice summary: session count, total minutes, avg tempo, most practiced sections (if `options.includePractice`)
   - Keep under ~2000 tokens for typical songs — summarize long progressions

2. Create `src/services/metmapAIContext.ts` — client-side context builder:
   ```ts
   export function serializeMetMapContext(
     song: Song,
     sections: Section[],
     options?: { includePractice?: boolean; includeAnimations?: boolean }
   ): string
   ```
   - Mirror of server-side logic but works with frontend types
   - Used for display and for sending context with chat messages

3. Chord formatting helper:
   ```
   Section: Verse 1 (8 bars, 120 BPM, 4/4)
   | Cmaj7 . . . | Am7 . . . | Fmaj7 . . . | G7 . . . |
   | Cmaj7 . . . | Am7 . . . | Dm7 . G7 . | Cmaj7 . . . |
   ```
   - One chord per cell, dots for held beats
   - Bar lines as `|` separators
   - Empty bars shown as `| . . . . |`

**Acceptance:**
- Context string accurately represents the song's structure
- Chord grid is human-readable and machine-parseable
- Output stays under ~2000 tokens for songs up to 100 bars
- Works for songs with no chords, no audio, no practice history (graceful fallbacks)

---

### T2: AI Analysis API Endpoints

**Goal:** Add three MetMap-specific AI endpoints that accept song context and return streaming analysis via SSE.

**Files:**
- `routes/ai-metmap.js` — New: MetMap AI routes
- `server-unified.js` — Mount new route file

**Endpoints:**

#### `POST /api/ai/metmap/analyze-song`
Comprehensive song analysis — structure, harmony, arrangement feedback.

**Request:**
```json
{
  "songId": "uuid",
  "focus": "structure" | "harmony" | "arrangement" | "all"
}
```

**Server logic:**
1. Load song + sections + chords from DB via `metmapAdapter`
2. Build context with `buildMetMapContext(song, sections, chords)`
3. Stream Claude response with system prompt:
   ```
   You are a music theory and arrangement expert integrated into FluxStudio's MetMap timeline editor.
   Analyze the following song and provide actionable feedback.

   Focus area: {focus}

   {metmapContext}

   Provide your analysis with:
   - Key observations about the current structure
   - Specific suggestions with bar/section references
   - Music theory reasoning (keep accessible to intermediate musicians)
   - Formatting: use **bold** for section names, `code` for chord symbols
   ```
4. SSE streaming response (reuse pattern from `/api/ai/chat`)

#### `POST /api/ai/metmap/suggest-chords`
Context-aware chord suggestions for a specific section.

**Request:**
```json
{
  "songId": "uuid",
  "sectionId": "uuid",
  "style": "jazz" | "pop" | "rock" | "classical" | "r&b" | "latin" | null,
  "request": "optional user prompt, e.g. 'make the bridge more dramatic'"
}
```

**Server logic:**
1. Load full song context (all sections + chords)
2. Highlight the target section in the context
3. Stream Claude response with system prompt:
   ```
   You are a chord progression specialist. Given the song context below,
   suggest chord changes for the highlighted section.

   {metmapContext}

   TARGET SECTION: {sectionName} (bars {startBar}-{endBar})
   Current chords: {currentChords}
   Style preference: {style || "match existing style"}
   User request: {request || "Suggest improvements or variations"}

   Respond with:
   1. 2-3 chord progression alternatives formatted as bar grids
   2. Brief explanation of the harmonic logic
   3. How each option connects to surrounding sections

   Format chord grids as: | Cmaj7 . | Am7 . | Dm7 G7 | Cmaj7 . |
   ```

#### `POST /api/ai/metmap/practice-insights`
Analyze practice history and suggest improvements.

**Request:**
```json
{
  "songId": "uuid"
}
```

**Server logic:**
1. Load song + sections + practice history from DB
2. Build context with `includePractice: true`
3. Stream Claude response with system prompt:
   ```
   You are a practice coach integrated into FluxStudio.
   Analyze this musician's practice data and provide encouragement + actionable advice.

   {metmapContext}

   Practice History:
   {practiceData}

   Provide:
   - Practice pattern observations (consistency, frequency, duration)
   - Sections that need more attention (based on practice frequency)
   - Tempo progression recommendations
   - Encouragement based on progress
   - Specific practice strategies for challenging sections
   ```

**Shared implementation:**
- All three endpoints use `authenticateToken` middleware
- Rate limit: 15 requests/minute per user via `rateLimit` middleware
- SSE streaming using same pattern as `/api/ai/chat` (lines 91-170 of `routes/ai.js`)
- Error handling: return JSON error if Anthropic API fails

**Acceptance:**
- All three endpoints stream responses via SSE
- Responses reference specific sections/bars/chords from the actual song
- Rate limiting works (429 on exceeded)
- Auth required (401 without token)
- Graceful fallback if song has no chords or no practice history

---

### T3: MetMap AI Panel Component

**Goal:** Add a collapsible sidebar panel to the MetMap editor that provides AI analysis and suggestions inline.

**Files:**
- `src/components/metmap/MetMapAIPanel.tsx` — New: AI sidebar panel
- `src/services/metmapAIService.ts` — New: client-side API calls for MetMap AI endpoints
- `src/pages/ToolsMetMap/index.tsx` — Wire panel into editor

**Implementation:**

1. Create `src/services/metmapAIService.ts`:
   ```ts
   export function streamSongAnalysis(
     songId: string, token: string, focus: string,
     callbacks: { onChunk: (text: string) => void; onDone: () => void; onError: (err: Error) => void }
   ): AbortController

   export function streamChordSuggestions(
     songId: string, sectionId: string, token: string,
     options: { style?: string; request?: string },
     callbacks: { ... }
   ): AbortController

   export function streamPracticeInsights(
     songId: string, token: string,
     callbacks: { ... }
   ): AbortController
   ```
   - All return `AbortController` for cancellation
   - SSE parsing with EventSource or fetch + ReadableStream
   - Token passed via Authorization header

2. Create `src/components/metmap/MetMapAIPanel.tsx`:
   ```
   ┌─ AI Co-Pilot ─────────────────────────────┐
   │ ┌─────────┬──────────┬────────────┐       │
   │ │ Analyze │ Chords ▾ │ Practice   │       │
   │ └─────────┴──────────┴────────────┘       │
   │                                            │
   │ ┌── Analysis ─────────────────────────────┐│
   │ │ Your song "Summer Vibes" has a strong   ││
   │ │ verse-chorus structure with **8-bar**   ││
   │ │ sections...                              ││
   │ │                                          ││
   │ │ **Harmony:** The progression in         ││
   │ │ **Verse 1** uses a classic I-vi-IV-V    ││
   │ │ pattern. Consider adding a `Dm7` passing││
   │ │ chord at bar 7 for smoother voice       ││
   │ │ leading into the **Chorus**...          ││
   │ └─────────────────────────────────────────┘│
   │                                            │
   │ [🔄 Re-analyze]                [Stop ■]   │
   └────────────────────────────────────────────┘
   ```

   **Tabs:**
   - **Analyze** — Full song analysis (structure/harmony/arrangement)
   - **Chords** — Section-specific chord suggestions (dropdown to pick section + optional style filter)
   - **Practice** — Practice insights based on history

   **Features:**
   - Streaming text display with markdown rendering (reuse approach from AIChatPanel)
   - Stop button to abort in-progress analysis
   - Re-analyze button to refresh
   - Section picker dropdown for chord suggestions
   - Style filter for chord suggestions (jazz/pop/rock/etc.)
   - Optional free-text input for chord requests ("make it jazzier")
   - Loading state with animated dots
   - Error state with retry button
   - Collapsed by default, toggle button in song header

3. Markdown rendering:
   - Use simple regex-based renderer (bold, code, headers, lists)
   - Or import `react-markdown` if already in bundle (check package.json)
   - Highlight chord symbols in `code` backticks
   - Highlight section names in **bold**

4. Wire into `ToolsMetMap/index.tsx`:
   - Add `showAIPanel` state (boolean, default false)
   - Add toggle button in song header (sparkles icon)
   - Render `MetMapAIPanel` conditionally in the right sidebar area
   - Pass `songId`, `sections`, `sectionId` (for chord tab context)

**Acceptance:**
- Toggle AI panel from song header
- Click "Analyze" → streaming response appears with song-specific feedback
- Click "Chords" → select section → streaming chord suggestions
- Click "Practice" → streaming practice insights
- Stop button cancels in-progress stream
- Markdown formatting renders correctly (bold, code, lists)
- Panel closes cleanly, abort controllers cleaned up on unmount
- Works when song has no chords (analysis still works, chord tab shows message)
- Works when song has no practice history (practice tab shows message)

---

### T4: Inline Chord Suggestions (Apply Button)

**Goal:** When the AI suggests chord progressions, add an "Apply" button that inserts the suggested chords directly into the timeline.

**Files:**
- `src/components/metmap/MetMapAIPanel.tsx` — Add apply button to chord suggestions
- `src/services/metmapAIService.ts` — Add chord parsing utility
- `src/pages/ToolsMetMap/index.tsx` — Wire chord apply callback

**Implementation:**

1. Add chord grid parser to `metmapAIService.ts`:
   ```ts
   export interface ParsedChordGrid {
     label: string;           // "Option 1", "Jazz variation", etc.
     chords: { bar: number; beat: number; symbol: string; durationBeats: number }[];
   }

   export function parseChordGridsFromResponse(text: string): ParsedChordGrid[]
   ```
   - Parse the `| Cmaj7 . | Am7 . | Dm7 G7 | ...` format from Claude's response
   - Handle common chord symbols: major, minor, 7th, maj7, dim, aug, sus, add, slash chords
   - Return structured array of chord objects ready for `upsertChords`
   - If no parseable grids found, return empty array

2. Add "Apply" button to chord suggestion response:
   - After streaming completes, scan response for chord grids
   - Show "Apply" button next to each parsed option
   - Click "Apply" → confirmation toast → insert chords into section
   - Replace existing chords in that section (with undo support via snapshot)

3. Wire in `ToolsMetMap/index.tsx`:
   ```tsx
   <MetMapAIPanel
     songId={currentSong.id}
     sections={editedSections}
     onApplyChords={(sectionIndex, chords) => {
       snapshotHistory.saveSnapshot(editedSections);
       snapshotAndUpdateChords(sectionIndex, chords);
       showNotification({ type: 'success', message: 'Chords applied' });
     }}
   />
   ```

**Acceptance:**
- AI suggests chord progressions → "Apply" button appears next to each option
- Click "Apply" → chords inserted into the target section
- Existing chords replaced (not appended)
- Undo works (snapshot saved before apply)
- If response has no parseable chord grids, no "Apply" button shown
- Works with various chord symbol formats (C, Cm, C7, Cmaj7, C#m7b5, Db/F, etc.)

---

## Files to Create

| File | Purpose |
|------|---------|
| `lib/metmap-ai-context.js` | Server-side song context serializer for Claude prompts |
| `routes/ai-metmap.js` | MetMap-specific AI analysis endpoints |
| `src/services/metmapAIContext.ts` | Client-side song context serializer |
| `src/services/metmapAIService.ts` | Client-side API calls for MetMap AI endpoints |
| `src/components/metmap/MetMapAIPanel.tsx` | AI sidebar panel with tabs |

## Files to Modify

| File | Changes |
|------|---------|
| `server-unified.js` | Mount `routes/ai-metmap.js` at `/api/ai/metmap` |
| `src/pages/ToolsMetMap/index.tsx` | Add AI panel toggle + wire panel component |

---

## Verification

1. **Context serializer:** Feed a song with 6 sections, mixed chords, practice data → output is readable, under 2000 tokens, accurate
2. **Song analysis:** POST to `/api/ai/metmap/analyze-song` → streaming response references actual section names and chord symbols
3. **Chord suggestions:** POST with target section → response includes formatted chord grids that match the section's bar count
4. **Practice insights:** POST with practice history → response mentions specific sessions, tempo progression, encouragement
5. **AI Panel:** Toggle open → click Analyze → streaming text → click Chords → pick section → suggestions → click Apply → chords appear in timeline
6. **Abort:** Start analysis → click Stop → stream stops cleanly
7. **Rate limiting:** Send 16 requests in 1 minute → 16th returns 429
8. **Auth:** Send without token → 401
9. **Edge cases:** Song with no chords → analyze still works, chord tab shows guidance; song with no practice → practice tab shows message
10. **Regression:** All Sprint 30-33 features still work (collaboration, presence, comments, threads, reactions, snapshots, branches)
