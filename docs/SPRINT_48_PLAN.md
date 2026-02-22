# Sprint 48: Mobile Creative Experience & User Acquisition

**Phase: Creative Canvas → Growth** — Make the formation editor fully usable on tablets/phones and launch the first user acquisition campaign.

## Why This Sprint

FluxStudio's formation editor is desktop-only. Band directors and choreographers need to review and tweak formations on the field with a tablet. Meanwhile, the /try sandbox funnel is instrumented but not optimized:

| Area | Current State | Target |
|------|--------------|--------|
| Mobile formation editor | Not usable on touch | Full touch support on iPad/tablet |
| MetMap mobile | Desktop-only sidebar | Slide-out drawer, horizontal timeline |
| /try → signup conversion | Instrumented, no optimization | Optimized CTA, social proof, urgency |
| SEO | Basic meta tags | Programmatic pages, structured data |

## Tasks

### T1: Touch-Optimized Formation Canvas
**Files:** `FormationCanvas/index.tsx`, `CanvasToolbar.tsx`, `AlignmentToolbar.tsx`

- Replace mouse-based drag with unified pointer events (`onPointerDown/Move/Up`) for mouse + touch
- Add pinch-to-zoom and two-finger pan on canvas
- Implement touch-friendly performer selection (larger hit area, long-press for context menu)
- Collapse toolbar to icon-only mode on mobile with expandable drawer
- Add "finger mode" toggle: single-finger pans canvas vs. selects performers

### T2: MetMap Mobile Layout (Sprint 45 T4)
**Files:** `src/pages/ToolsMetMap/index.tsx`, `MetMapSidebar.tsx`

- Convert MetMap sidebar to slide-out drawer on mobile (`<md:` breakpoint)
- Horizontal timeline scroll with CSS scroll-snap on touch devices
- Sticky bottom transport bar (play/pause/tempo) on mobile
- Section list and chord grid usable at 375px width
- Swipe gestures: swipe-left to advance section, swipe-right to go back

### T3: /try Sandbox Conversion Optimization
**Files:** `src/pages/TryEditor.tsx`, `src/pages/landing/EditorialLanding.tsx`

- A/B test banner copy: "Sign up free" vs. "Save your work — create account"
- Add social proof to /try banner: "Join 50+ band directors using FluxStudio"
- Add formation count badge: "You've created {n} formations — sign up to keep them"
- Auto-save formations to localStorage; show "Unsaved work" warning on page leave
- Add exit-intent modal on /try for desktop users (mouseleave on document)

### T4: SEO & Programmatic Landing Pages
**Files:** `routes/formations.js`, `src/pages/landing/`, new template pages

- Create programmatic SEO pages: `/formations/marching-band`, `/formations/dance-team`, `/formations/drum-corps`
- Each page: H1 with keyword, template gallery filtered by category, "Try it free" CTA
- Add JSON-LD structured data (SoftwareApplication schema) to landing page
- Generate `sitemap.xml` dynamically from formation categories + shared formations
- Add `robots.txt` with proper crawl directives

### T5: Admin Metrics Dashboard (Sprint 45 T2)
**Files:** `routes/observability.js`, `src/pages/AdminMetrics.tsx`

- Wire `AdminMetrics.tsx` to real endpoints instead of stubs
- Add `GET /api/observability/metrics` returning latency, error rate, active connections
- Add `GET /api/observability/vitals` returning aggregated Web Vitals p75
- Cards: error rate, p95 latency, active WebSocket connections, signup funnel chart

## Implementation Order

T1 → T2 → T3 → T4 → T5

T1-T2 unlock mobile usage (critical for field-side editing). T3-T4 drive user acquisition. T5 gives visibility into system health.

## Success Metrics

- Touch canvas: pinch-to-zoom works on iPad Safari, performer drag is smooth
- MetMap mobile: fully usable at 375px width
- /try conversion: >5% banner click-through rate
- SEO pages: indexed by Google within 2 weeks
- Admin dashboard: real metrics, not stubs

## Verification

```bash
npx tsc --noEmit
npx vite build

# Manual checks:
# - Open FormationCanvas on iPad → pinch-to-zoom, drag performers with finger
# - Open MetMap on phone → sidebar is drawer, timeline scrolls horizontally
# - Visit /try → see social proof banner, create formation, leave page → exit intent modal
# - Visit /formations/marching-band → see filtered templates
# - Open /admin/metrics → see real latency and error data
```
