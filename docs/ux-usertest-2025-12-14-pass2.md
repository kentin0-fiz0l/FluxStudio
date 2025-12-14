# FluxStudio UX Usertest - Pass 2

**Date:** 2025-12-14
**Tester:** Claude (automated)
**Focus:** New findings + brainstorm improvements (NOT re-implementing fixed items)

---

## Phase 1: UX Findings (New or Notable Only)

### Project-First Framing Gaps

| Route | Finding | Severity |
|-------|---------|----------|
| `/messages` | **Conversations show no project context** — ConversationItem displays title but not which project it belongs to | HIGH |
| `/messages` | Empty state mentions projects but "Start a conversation" UI doesn't guide to project first | MED |
| `/settings` | No "Back to Projects" link — feels disconnected from main workflow | LOW |
| `/notifications` | Notification items show type but not project context when relevant | MED |

### Navigation Clarity

| Route | Finding | Severity |
|-------|---------|----------|
| `/profile` | No breadcrumb or context bar — feels like standalone page | LOW |
| `/tools/metmap` | Song list doesn't visually indicate which project a song belongs to | MED |

### Empty & Loading States

| Route | Finding | Severity |
|-------|---------|----------|
| `/tools/assets` | Loading shows generic "Loading..." text, not skeleton | LOW |
| `/tools/files` | Loading shows generic "Loading..." text, not skeleton | LOW |
| `/messages` | Conversation list loading shows generic spinner | MED |

### Messaging & Notifications UX

| Route | Finding | Severity |
|-------|---------|----------|
| `/messages` | Thread reply count badge exists but no visual hierarchy showing parent → child | MED |
| `/messages` | No keyboard shortcut hint in empty state for power users | LOW |
| `/notifications` | Group headers (Mentions, Replies, etc.) could show count in badge | LOW |

### Visual Hierarchy

| Route | Finding | Severity |
|-------|---------|----------|
| `/tools` | Tool cards are same visual weight — MetMap could be visually promoted as "flagship" | LOW |
| `/projects/:id` | Tab bar could show count badges (e.g., "Tasks (5)", "Files (12)") | MED |

### Mobile Sanity Check

| Route | Finding | Severity |
|-------|---------|----------|
| `/tools/metmap` | Song list sidebar is collapsible on mobile — good | PASS |
| `/messages` | Conversation list responsive — good | PASS |

### Accessibility

| Route | Finding | Severity |
|-------|---------|----------|
| All routes | Focus states generally visible | PASS |
| `/notifications` | Keyboard shortcut hint exists at bottom — good | PASS |

---

## Phase 2: Brainstormed Improvements (10-20 Ideas)

### Category A: Project-First Framing

| # | Improvement | Description |
|---|-------------|-------------|
| A1 | **Conversation project badge** | Show small project name badge on conversation cards in the list |
| A2 | **MetMap song project indicator** | Show project name next to song title in song list |
| A3 | **Notification project context** | Add project name to notification items for project-related events |
| A4 | **"Start from Project" empty state** | In Messages empty state, primary CTA opens project selector or links to /projects |

### Category B: Navigation Clarity

| # | Improvement | Description |
|---|-------------|-------------|
| B1 | **Settings "Back to Projects" link** | Add breadcrumb link like Files/Assets pages |
| B2 | **Profile "Back to Projects" link** | Add breadcrumb link for consistency |
| B3 | **Global project context bar** | Lightweight bar showing current project context when inside project-scoped pages |

### Category C: Loading & Empty States

| # | Improvement | Description |
|---|-------------|-------------|
| C1 | **Assets loading skeleton** | Replace "Loading..." with card skeleton grid |
| C2 | **Files loading skeleton** | Replace "Loading..." with file card skeleton |
| C3 | **Conversation list skeleton** | Show conversation item skeletons while loading |

### Category D: Messaging UX

| # | Improvement | Description |
|---|-------------|-------------|
| D1 | **Thread hierarchy visual indicator** | Indent or style threaded replies differently from top-level messages |
| D2 | **Keyboard shortcuts badge** | Show "Ctrl+Enter to send" hint in message input |
| D3 | **Unread conversation separator** | Visual divider between unread and read conversations |

### Category E: Notifications UX

| # | Improvement | Description |
|---|-------------|-------------|
| E1 | **Group count badges** | Show notification count in group headers (e.g., "Mentions (3)") |
| E2 | **Project filter dropdown** | Filter notifications by project |

### Category F: Tools & MetMap

| # | Improvement | Description |
|---|-------------|-------------|
| F1 | **MetMap flagship visual treatment** | Slightly larger card or "Featured" badge on Tools page |
| F2 | **Song empty state with Quick Start** | When no songs, show a one-click "Quick Start" template |

### Category G: Project Detail

| # | Improvement | Description |
|---|-------------|-------------|
| G1 | **Tab count badges** | Show counts on tab labels (e.g., "Tasks (5)") |
| G2 | **Recent activity micro-feed** | Small activity indicator on project card in list |

---

## Phase 3: Ranked Improvements (Impact × Effort)

| Rank | ID | Improvement | Impact (1-5) | Effort (1-5) | Score | Action |
|------|-----|-------------|--------------|--------------|-------|--------|
| 1 | E1 | Notification group count badges | 4 | 1 | 20 | **Implement** |
| 2 | B1 | Settings "Back to Projects" link | 3 | 1 | 15 | **Implement** |
| 3 | B2 | Profile "Back to Projects" link | 3 | 1 | 15 | **Implement** |
| 4 | D2 | Keyboard shortcuts hint in message input | 3 | 1 | 15 | **Implement** |
| 5 | F1 | MetMap flagship visual treatment | 3 | 2 | 7.5 | **Implement** |
| 6 | A1 | Conversation project badge | 4 | 3 | 6.7 | Defer |
| 7 | G1 | Tab count badges on ProjectDetail | 4 | 3 | 6.7 | Defer |
| 8 | A2 | MetMap song project indicator | 3 | 2 | 7.5 | Defer |
| 9 | C1 | Assets loading skeleton | 3 | 3 | 5 | Defer |
| 10 | C2 | Files loading skeleton | 3 | 3 | 5 | Defer |
| 11 | C3 | Conversation list skeleton | 3 | 3 | 5 | Defer |
| 12 | D1 | Thread hierarchy visual indicator | 4 | 4 | 5 | Defer |
| 13 | D3 | Unread conversation separator | 3 | 2 | 7.5 | Defer |
| 14 | A3 | Notification project context | 4 | 3 | 6.7 | Defer |
| 15 | A4 | "Start from Project" empty state | 3 | 2 | 7.5 | Defer |
| 16 | E2 | Project filter in notifications | 3 | 4 | 3.75 | Defer |
| 17 | F2 | Song empty state Quick Start | 2 | 2 | 5 | Defer |
| 18 | G2 | Recent activity micro-feed | 3 | 4 | 3.75 | Defer |
| 19 | B3 | Global project context bar | 4 | 5 | 4 | Defer (complex) |

---

## Top 5 Improvements to Implement

### 1. E1: Notification Group Count Badges
- **Status:** ALREADY EXISTS (lines 458-460)
- **Finding:** Badge component already shows count in group headers

### 2. B1: Settings "Back to Projects" Link **IMPLEMENTED**
- **What:** Add breadcrumb link at top of Settings page
- **File:** `src/pages/Settings.tsx:72-77`
- **Why:** Consistency with Files/Assets/MetMap pages

### 3. B2: Profile "Back to Projects" Link **IMPLEMENTED**
- **What:** Add breadcrumb link at top of Profile page
- **File:** `src/pages/Profile.tsx:47-52`
- **Why:** Consistency with other pages

### 4. D2: Keyboard Shortcuts Hint in Message Input
- **Status:** ALREADY EXISTS (lines 1505-1508)
- **Finding:** Enter/Shift+Enter hints already shown below input

### 5. F1: MetMap Flagship Visual Treatment **IMPLEMENTED**
- **What:** Add "Featured" badge + ring highlight for MetMap card
- **File:** `src/pages/Tools.tsx:162-179`
- **Why:** MetMap is a flagship tool, should be visually promoted

---

## Intentional Follow-ups (Not Implemented)

| ID | Improvement | Rationale for Deferral |
|----|-------------|------------------------|
| A1 | Conversation project badge | Requires backend to return projectId with conversations |
| G1 | Tab count badges | Requires prop drilling or context for counts |
| D1 | Thread hierarchy visual | Complex layout change, needs design review |
| C1-C3 | Loading skeletons | Medium effort, UX polish rather than clarity fix |
| B3 | Global project context bar | Complex state management, needs design system work |

---

## Notes

- All improvements are front-end only
- No backend/schema changes required for top 5
- Dark mode compatibility maintained
- Uses existing components (Badge, Link, etc.)
