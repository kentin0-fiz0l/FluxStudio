# Sprint 23: Bundle Optimization & Test Coverage

> Status: PLANNED | Target Start: 2026-02-14

## Current State (Post Sprint 22)

| Metric | Value | Target |
|--------|-------|--------|
| server-unified.js | 667 lines | Maintained |
| `:any` in production | 9 | Maintained |
| Type errors | 0 | 0 |
| Messaging components | 23 files | Maintained |
| React Query hooks | 30 files | Maintained |
| feature-dashboard chunk | **1,050 KB** | **< 500 KB** |
| Page test coverage | 4/38 (10.5%) | 14/38 (37%) |
| Integration test coverage | 7/26 routes | 14/26 routes |
| Components > 600 lines | 20 files | < 12 |
| TODOs/FIXMEs | 4 | 0 |

## Priority Analysis

### P0 — CI Blocker
The **feature-dashboard** chunk (1,050 KB) is **2x over the 500 KB CI warning limit**. This is the single biggest build quality issue. It contains all dashboard + widget components loaded as one giant chunk.

### P1 — Low Test Coverage
Only **4 of 38 pages** and **7 of 26 routes** have tests. Critical paths like messaging, settings, organization, and projects pages are untested. The messaging subsystem has 23 components but only 1 test file.

### P2 — Oversized Components
**20 components exceed 600 lines**. Top offenders: sidebar.tsx (835), TaskComments.tsx (801), ActivityFeed.tsx (794), UserTestPanel.tsx (777), TaskDetailModal.tsx (776).

---

## Tasks

### T1: Split feature-dashboard chunk (1,050 KB → < 500 KB)

The `feature-dashboard` chunk in `vite.config.ts` bundles everything from `src/components/dashboard/` and `src/components/widgets/` into one chunk. Split into smaller lazy-loaded pieces:

- Separate `feature-widgets` chunk for `src/components/widgets/`
- Lazy-load `AdaptiveDashboard.tsx` (589 lines) as its own route chunk
- Split heavy dashboard widgets (NotificationCenter 692 lines, DesignReviewWidget 630 lines, ContentInsights 611 lines) into individual dynamic imports
- Verify chunk sizes in build output are all < 500 KB

### T2: Add page-level tests for 10 critical pages

Target the most important untested pages:

- [ ] `src/pages/MessagesNew.tsx` — messaging page
- [ ] `src/pages/ProjectOverview/index.tsx` — project detail
- [ ] `src/pages/Settings/index.tsx` — settings
- [ ] `src/pages/Dashboard.tsx` — main dashboard
- [ ] `src/pages/OrganizationDashboard.tsx` — org management
- [ ] `src/pages/TeamDashboard.tsx` — team view
- [ ] `src/pages/FileNew.tsx` — file management
- [ ] `src/pages/Profile.tsx` — user profile
- [ ] `src/pages/ProjectsHub.tsx` — projects list
- [ ] `src/pages/Tools.tsx` — tools page

Each test should cover: renders without crash, key UI elements present, navigation works, error states handled.

### T3: Add integration tests for 7 untested routes

Priority routes by traffic/importance:

- [ ] `routes/notifications.js` — push notifications
- [ ] `routes/documents.js` — collaborative docs
- [ ] `routes/channels.js` — messaging channels
- [ ] `routes/connectors.js` — third-party connectors
- [ ] `routes/formations.js` — formation editor
- [ ] `routes/users.js` — user management
- [ ] `routes/media.js` — media upload/streaming

### T4: Add messaging component tests

The messaging subsystem has 23 components but only 1 test file (`MessageHelpers.test.tsx`). Add tests for the 5 most critical:

- [ ] `ChatPanel.tsx` — main chat view
- [ ] `ConversationSidebar.tsx` — conversation list
- [ ] `MessageComposer.tsx` — message input
- [ ] `NewConversationDialog.tsx` — create conversation
- [ ] `ChatMessageList.tsx` — message rendering

### T5: Decompose 4 largest components (> 750 lines)

| Component | Lines | Extraction Plan |
|-----------|-------|----------------|
| `sidebar.tsx` | 835 | Extract SidebarNav, SidebarFooter, SidebarProjectSelector |
| `TaskComments.tsx` | 801 | Extract CommentThread, CommentInput, CommentActions |
| `ActivityFeed.tsx` | 794 | Extract ActivityItem, ActivityFilters, ActivityTimeline |
| `UserTestPanel.tsx` | 777 | Extract TestScenarioList, TestResultsView, TestControls |

### T6: Resolve remaining TODOs and tech debt

- [ ] Fix `WorkspaceContext.tsx` TODO — look up actual Project object instead of storing action payload
- [ ] Fix `FileBrowser.tsx` TODO — add adapter for printing.FileList vs DOM FileList mismatch
- [ ] Clean up test fixture TODOs (2 test files referencing TODO in mock messages)

---

## Verification

- `npm run build` — all chunks < 500 KB (no warnings)
- `npx tsc --noEmit` — 0 type errors
- `npm run test` — all new tests pass
- Page test count: `find src/pages/__tests__ -name '*.test.*' | wc -l` → 14+
- Integration test count: `find tests/integration -name '*.test.*' | wc -l` → 14+
- Messaging test count: `find src/components/messaging/__tests__ -name '*.test.*' | wc -l` → 6+
- No component > 750 lines (verify with find + wc -l)

## Execution Strategy

Use agent teams for parallel execution:
- **Team A (bundle-optimizer):** T1 — vite config + dynamic imports
- **Team B (page-tester):** T2 — page-level tests
- **Team C (integration-tester):** T3 + T4 — route + messaging tests
- **Team D (decomposer):** T5 + T6 — component splits + TODO fixes
