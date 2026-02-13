# FluxStudio Development Cycle Plan — Post Sprint 17

> Generated: 2026-02-13 | Based on 4-agent parallel codebase audit

## Current State Summary

| Metric | Value |
|--------|-------|
| Frontend source files | 785 (216K lines) |
| Backend source files | ~84 files (54K lines) |
| Components | 380 across 47 subdirectories |
| Test files | 126 (16.5% test ratio) |
| TypeScript errors | 22 (mostly cosmetic) |
| Bundle: vendor-common | 187 KB (down from 765 KB) |
| Bundle: total JS | 4.6 MB uncompressed |
| Lazy-loaded routes | 44/44 (100%) |
| Vulnerabilities | 0 high, 1 moderate (dev), 2 low |
| Languages (i18n) | 8 (Arabic ~83% complete) |

### Sprint 17 Completed
- 4 critical + 2 high security issues fixed
- 100 dead files purged, 9 unused packages removed
- 76% vendor-common bundle reduction
- CI pipeline hardened, lint rules tightened

---

## Key Problems Identified

### P0 — Critical
1. **server-unified.js is 8,979 lines** — monolith with no separation of concerns
2. **adminAuth.js logs full JWT tokens** (lines 342-345) — production security risk
3. **Zero payment/Stripe tests** — critical revenue path completely untested
4. **Auth slice type mismatch** in store.ts — runtime risk from interface drift

### P1 — High
5. **3 competing state patterns** — Zustand (36 files), Context (29 files), React Query (6 files) with unclear boundaries
6. **75 messaging components** — largest subsystem, likely significant overlap (Hub vs EnhancedHub, multiple dialogs)
7. **16 of 19 backend routes untested** — projects, files, ai, formations, teams, payments, etc.
8. **50 of 51 pages have no tests** — Login, Signup, Checkout, all admin pages
9. **server.js (5,981 lines) appears dead** — incomplete migration to server-unified.js

### P2 — Medium
10. **8 components over 800 lines** need decomposition (MessagesNew 909, ChatPanel 858, etc.)
11. **232 `: any` occurrences** across 92 files
12. **feature-dashboard chunk at 320 KB** — oversized app code chunk
13. **Middleware fragmented** across `middleware/` and `lib/middleware/`
14. **messages.js vs messaging.js** route overlap
15. **dual-write-service.js** suggests incomplete JSON-to-Postgres migration
16. **AI design services partially stubbed** — template responses instead of real API calls
17. **Arabic translations ~83% complete** (common namespace has gaps)
18. **E2E tests silently ignored** — `continue-on-error: true` in CI

---

## Sprint Plan

### Sprint 18: Architecture Consolidation (2 weeks)

**Goal:** Unify state management, begin server decomposition, fix remaining security issues.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix adminAuth.js JWT token logging (P0 security) | S | Critical |
| 2 | Fix auth slice type mismatch in store.ts | S | Critical |
| 3 | Delete server.js (5,981 lines) if confirmed dead | M | High |
| 4 | Migrate 10 highest-traffic hooks from useState+fetch to TanStack Query | L | High |
| 5 | Consolidate auth: remove duplicate AuthContext vs Zustand auth slice | M | High |
| 6 | Extract routes from server-unified.js into route files (Phase 1: first 3K lines) | L | High |
| 7 | Merge `middleware/` and `lib/middleware/` into single directory | S | Medium |
| 8 | Merge `messages.js` and `messaging.js` routes | M | Medium |

**Success criteria:**
- server-unified.js under 6K lines
- React Query used in 20+ files (up from 6)
- Zero auth state duplication between Context and Zustand
- Zero security logging of tokens

---

### Sprint 19: Test Coverage & Critical Path Testing (2 weeks)

**Goal:** Cover critical revenue and auth paths. Raise coverage thresholds.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Write integration tests for payments.js route (Stripe flows) | L | Critical |
| 2 | Write page tests for Login, Signup, Checkout, CheckoutSuccess | L | Critical |
| 3 | Write integration tests for projects.js, files.js, teams.js routes | L | High |
| 4 | Write context tests for ProjectContext, MessagingContext, OrganizationContext | M | High |
| 5 | Remove `continue-on-error: true` from E2E step in CI | S | High |
| 6 | Write E2E test for critical user flow: login -> create project -> invite team | L | High |
| 7 | Raise coverage thresholds to branches: 50%, functions: 60%, lines: 50% | S | Medium |
| 8 | Fix ErrorBoundary.test.tsx (15 TS errors) | S | Low |

**Success criteria:**
- Payment flows have integration + E2E tests
- 10+ backend routes tested (up from 3)
- 10+ pages tested (up from 1)
- Coverage thresholds at 50% lines
- E2E failures block CI

---

### Sprint 20: Messaging Consolidation & Component Health (2 weeks)

**Goal:** Reduce messaging subsystem from 75 to ~40 files. Decompose oversized components.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Audit messaging: identify dead/overlapping components (Hub vs EnhancedHub, etc.) | M | High |
| 2 | Consolidate messaging components — target 40 files | XL | High |
| 3 | Decompose MessagesNew.tsx (909 lines) into sub-components | M | Medium |
| 4 | Decompose ChatPanel.tsx (858 lines) | M | Medium |
| 5 | Decompose UserDirectory.tsx (848 lines) — move to proper subdirectory | M | Medium |
| 6 | Decompose sidebar.tsx (835 lines) into composable parts | M | Medium |
| 7 | Split feature-dashboard chunk (320 KB) via widget lazy loading | M | Medium |
| 8 | Clean up 232 `: any` occurrences (target: under 80) | L | Medium |

**Success criteria:**
- Messaging directory under 45 files
- No component file over 600 lines
- feature-dashboard chunk under 200 KB
- `: any` count under 80

---

### Sprint 21: Server Decomposition & Feature Polish (2 weeks)

**Goal:** Complete server-unified.js decomposition. Ship AI design features. Complete i18n.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Extract remaining routes from server-unified.js (Phase 2) | L | High |
| 2 | Delete dual-write-service.js if Postgres migration is complete, or finish migration | M | High |
| 3 | Consolidate storage: merge `storage/`, `lib/storage.js`, `lib/enhanced-storage.js` | M | Medium |
| 4 | Wire up AI design feedback service to real Claude Vision API (remove stubs) | M | Medium |
| 5 | Wire up AI content generation service to real API | M | Medium |
| 6 | Complete Arabic translations (common namespace ~52% gap) | S | Medium |
| 7 | Fix duplicate manifest files (public/manifest.json vs Vite-generated) | S | Low |
| 8 | Delete 2 stub messaging DB adapters (22 lines each) or implement them | S | Low |

**Success criteria:**
- server-unified.js under 3K lines (middleware, app setup, server start only)
- AI design feedback returns real analysis (not templates)
- Arabic translations at 100%
- Single canonical manifest file

---

## 8-Week Roadmap

```
Week 1-2:  Sprint 18 — Architecture Consolidation
Week 3-4:  Sprint 19 — Test Coverage & Critical Paths
Week 5-6:  Sprint 20 — Messaging Consolidation & Component Health
Week 7-8:  Sprint 21 — Server Decomposition & Feature Polish
```

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| server.js deletion breaks deploy | Medium | High | Grep all refs, check scripts, test deploy locally |
| Messaging consolidation breaks real-time | Medium | High | E2E messaging tests before and after |
| TanStack Query migration cache issues | Low | Medium | Migrate one hook at a time, keep Zustand fallback |
| Server decomposition breaks API contracts | Medium | High | Integration tests for all routes before extraction |
| AI service wiring reveals cost concerns | Low | Medium | Rate limiting in place, add cost tracking |

## Metrics to Track

| Metric | Current | S18 | S19 | S20 | S21 |
|--------|---------|-----|-----|-----|-----|
| server-unified.js lines | 8,979 | <6,000 | <6,000 | <6,000 | <3,000 |
| Test file ratio | 16.5% | 18% | 30% | 32% | 35% |
| Backend routes tested | 3/19 | 3/19 | 12/19 | 12/19 | 16/19 |
| Pages tested | 1/51 | 1/51 | 12/51 | 15/51 | 18/51 |
| Messaging components | 75 | 75 | 75 | <45 | <45 |
| React Query hooks | 6 | 20+ | 25+ | 30+ | 35+ |
| `: any` count | 232 | 200 | 180 | <80 | <50 |
| High vulnerabilities | 0 | 0 | 0 | 0 | 0 |
| Coverage (lines) | ~30% | ~35% | 50% | 55% | 60% |
| feature-dashboard | 320 KB | 320 KB | 320 KB | <200 KB | <200 KB |
