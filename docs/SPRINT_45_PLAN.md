# Sprint 45: Production Polish — Observability Wiring, Mobile UX, Launch Readiness

**Phases 5.2 + 5.3 completion** — Wire collected metrics to backend, fix critical mobile UX gaps, and close the last monetization edge case.

## Why This Sprint

Sprint 44 added growth infrastructure. But three areas are half-finished:

| Area | What's built | What's missing |
|------|-------------|----------------|
| Observability (5.3) | Sentry, logger, Web Vitals collection, admin page | Vitals never reach backend; admin metrics endpoint is a stub |
| Mobile UX (5.2) | Breakpoint hooks, bottom nav, drawer primitives | Dialogs overflow <375px; MetMap is desktop-only; no touch drag |
| Monetization (5.1) | Full Stripe flow, pricing/billing/checkout pages | Trial eligibility not tracked — users can claim multiple trials |

## Tasks

### T1: Web Vitals RUM Pipeline
**Files:** `database/migrations/124_web_vitals.sql`, `routes/analytics.js`, `src/services/monitoring/PerformanceMonitoringService.ts`

- Create `web_vitals` table (metric_name, value, rating, page, connection_type, user_agent, created_at)
- Add `POST /api/analytics/vitals` endpoint to `routes/analytics.js`
- Wire `PerformanceMonitoringService` to export collected vitals via `navigator.sendBeacon` on visibility change
- Add `GET /api/analytics/vitals/summary` (admin) for aggregated p75 per metric

### T2: Admin Metrics API
**Files:** `routes/observability.js`, `src/pages/AdminMetrics.tsx`

- Add `GET /api/observability/metrics` endpoint exposing `performanceMetrics.getSummary()`
- Add `GET /api/observability/vitals` endpoint returning aggregated Web Vitals from DB
- Wire `AdminMetrics.tsx` to fetch from real endpoints instead of stubs
- Add error rate, p95 latency, and active connections cards

### T3: Responsive Dialog & Mobile Shell
**Files:** `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/MobileBottomNav.tsx`

- Fix Dialog content: add `w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto`
- Fix Sheet content: ensure safe-area-inset-bottom padding on iOS
- Add viewport meta `viewport-fit=cover` for notch handling
- Verify MobileBottomNav renders at correct z-index above dialogs

### T4: MetMap Mobile Layout
**Files:** `src/pages/ToolsMetMap/index.tsx`, `src/pages/ToolsMetMap/MetMapSidebar.tsx`

- Convert MetMap sidebar to a slide-out drawer on mobile (below `md:`)
- Add horizontal scroll to timeline on touch devices with `overflow-x-auto` and snap points
- Add mobile transport controls (play/pause/tempo) as a sticky bottom bar
- Ensure section list and chord grid are usable at 375px width

### T5: Trial Eligibility & Touch Polish
**Files:** `routes/payments.js`, `database/migrations/125_trial_tracking.sql`, `src/components/widgets/CustomizableWidgets.tsx`

- Add `trial_used_at` column to `subscriptions` table
- Check trial eligibility in `GET /api/payments/subscription` — `canTrial: !user.trial_used_at`
- Set `trial_used_at` when a trial subscription is created via webhook
- Add `TouchSensor` from `@dnd-kit/core` to KanbanBoard and widget grid for mobile drag-drop (300ms activation delay)

## Implementation Order

T1 → T2 → T3 → T4 → T5

T1 and T2 close the observability loop (data flows from browser → backend → admin dashboard).
T3 and T4 fix the worst mobile UX gaps.
T5 patches the trial loophole and adds touch polish.

## Verification

```bash
# TypeScript
npx tsc --noEmit

# Build
npx vite build

# Manual checks:
# - Open AdminMetrics → verify real latency/error data
# - Open any dialog on 375px viewport → no overflow
# - Open MetMap on mobile → sidebar is drawer, timeline scrolls
# - Start a trial → cancel → try again → should be blocked
# - Check Network tab → POST /api/analytics/vitals on tab switch
```
