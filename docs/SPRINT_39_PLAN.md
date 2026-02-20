# Sprint 39: Mobile-First UX

**Phase:** 5.2 Mobile-First UX
**Goal:** Make every authenticated page usable and polished on phones and tablets, with touch-optimized interactions and adaptive loading.

## Current State

FluxStudio has a solid mobile foundation but inconsistent application:

| Component | Status | Notes |
|-----------|--------|-------|
| Breakpoint hooks (`useBreakpoint`, `useIsMobile`) | Complete | xs/sm/md/lg/xl/2xl + touch detection |
| MobileBottomNav (4-item) | Complete | Projects, Messages, Search, Menu — wired in DashboardLayout |
| Mobile sidebar drawer | Complete | Slide-in from left, body scroll lock, auto-close on resize |
| Touch target utilities | Complete | `.touch-target` (44px min), used in nav/buttons |
| PWA manifest + meta tags | Complete | Standalone display, shortcuts, share target, install prompt |
| Sheet/Drawer primitives | Complete | `vaul` library bottom drawer + Radix Sheet |
| Responsive grid patterns | Partial | Most pages use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| MetMap timeline | Desktop-only | Zero responsive classes, hardcoded sidebar |
| Formation editor | Desktop-only | Canvas-based, no responsive handling |
| Messages page | Basic | Binary mobile/desktop split at `md:`, no tablet |
| Dialog component | Gap | Fixed `max-w-lg`, can overflow on small screens |
| DnD interactions | Gap | @dnd-kit used but no `TouchSensor` configured |
| Service worker | Disabled | Commented out in index.html |

**Strategy:** Focus on the 3 highest-impact areas: (1) responsive dialogs/sheets for all pages, (2) MetMap mobile layout, (3) touch interaction polish. Skip formation editor canvas (too complex for one sprint, defer to 5.2b).

---

## T1: Dialog & Sheet Responsive Fix

**Files:** `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`

### 1a: Dialog mobile responsiveness
- Change `DialogContent` max-width from fixed `max-w-lg` to responsive: `w-[calc(100%-2rem)] sm:max-w-lg`
- Add `max-h-[85vh] overflow-y-auto` for tall content on small screens
- Ensure padding is comfortable: `p-4 sm:p-6`

### 1b: Sheet mobile edge padding
- Verify `SheetContent` uses `w-[85%] sm:max-w-sm` (already close, confirm)
- Add safe-area-inset padding for bottom sheets on notched phones

---

## T2: MetMap Mobile Layout

**Files:** `src/pages/ToolsMetMap/index.tsx`, `src/components/metmap/MobilePlaybackControls.tsx`

### 2a: Collapsible sidebar on mobile
- Wrap the song list sidebar in a bottom drawer on mobile (`lg:hidden` trigger button)
- On desktop keep current sidebar layout (`hidden lg:block`)
- Use the existing `Drawer` component from `src/components/ui/drawer.tsx`

### 2b: Timeline horizontal scroll container
- Wrap the timeline canvas in a horizontally scrollable container on mobile
- Add touch-scroll momentum: `overflow-x-auto -webkit-overflow-scrolling: touch`
- Show a "scroll to navigate" hint on first visit (small text below timeline)

### 2c: Mobile playback controls always visible
- `MobilePlaybackControls` already exists — ensure it renders `lg:hidden` at bottom of MetMap page
- Desktop controls stay in the header area (`hidden lg:flex`)
- Verify touch targets are 44px+ on all controls

### 2d: Section panel as bottom sheet
- The section templates/editing panel becomes a bottom sheet on mobile
- Trigger via a floating action button: "+" icon, fixed bottom-right (above MobileBottomNav)

---

## T3: Touch Interaction Polish

**Files:** `src/components/tasks/KanbanBoard.tsx`, `src/components/dashboard/CustomizableWidgets.tsx`, various

### 3a: Add TouchSensor to @dnd-kit
- Import `TouchSensor` and `MouseSensor` from `@dnd-kit/core`
- Configure `useSensors()` with both: `MouseSensor` (distance: 5) + `TouchSensor` (delay: 250, tolerance: 5)
- Apply to KanbanBoard and CustomizableWidgets

### 3b: Swipe-to-go-back on mobile
- Add `useSwipeBack()` hook: detect right-swipe from left 20px edge → navigate(-1)
- Wire into DashboardLayout for all authenticated pages
- Only active when `isMobile` (from useBreakpoint)

### 3c: Pull-to-refresh on project list
- Add `usePullToRefresh()` hook: detect pull-down gesture at top of scroll container
- Wire into ProjectsHub to trigger `refetch()`
- Show a small spinner indicator during refresh

---

## T4: Responsive Page Audit

**Files:** Multiple pages — targeted fixes only

### 4a: Messages tablet layout
- Add intermediate breakpoint: sidebar 280px + chat on `md:` (currently hidden)
- Remove the binary toggle — show both panes side-by-side on tablet
- Keep mobile behavior (show one at a time) for `< md:`

### 4b: Billing page mobile
- `src/pages/Billing.tsx` uses hardcoded `bg-black text-white` and `max-w-4xl`
- Wrap in DashboardLayout for consistent mobile nav (bottom nav, sidebar)
- Reduce padding on mobile: `px-4 sm:px-6`

### 4c: Pricing page mobile
- `src/pages/Pricing.tsx` — ensure plan cards stack vertically on mobile (already uses `md:grid-cols-3`)
- Verify toggle switch is reachable (centered, large enough target)
- FAQ accordions should be full-width on mobile

### 4d: Settings/Profile form inputs
- Ensure all form inputs are at least 44px tall on mobile
- Select dropdowns should use native mobile selectors (already default on mobile browsers)
- Test that date pickers work on iOS/Android

---

## T5: Adaptive Loading & Performance

**Files:** `src/components/templates/DashboardLayout.tsx`, `src/hooks/useAdaptiveLoading.ts` (new)

### 5a: Connection-aware loading
- Create `useAdaptiveLoading()` hook using `navigator.connection` API
- Returns `{ isSlowConnection, effectiveType }` (2g/3g = slow, 4g/wifi = fast)
- On slow connections: disable Framer Motion animations, reduce image quality

### 5b: Reduced motion support
- Check `prefers-reduced-motion` media query
- When active: skip all Framer Motion `initial`/`animate` props
- Add to DashboardLayout as a context value or CSS class on `<html>`

### 5c: Mobile-specific image loading
- For project thumbnails: serve smaller variants on mobile (if available)
- Add `loading="lazy"` to all images below the fold
- Use `srcset` with breakpoint-appropriate sizes where applicable

---

## Verification

1. **Chrome DevTools responsive mode** — test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px (iPad Pro landscape)
2. MetMap timeline: songs accessible via drawer, timeline scrollable, playback controls visible
3. Dialog/modals: no horizontal overflow on 375px screens
4. KanbanBoard: drag tasks with touch (hold 250ms to activate)
5. Messages: sidebar + chat visible on 768px+, single-pane on mobile
6. Billing/Pricing pages: no horizontal scroll, text readable
7. `npm run typecheck` — zero new errors
8. `npm run lint` — clean

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/components/ui/dialog.tsx` | Modify | Responsive max-width, max-height, padding |
| `src/pages/ToolsMetMap/index.tsx` | Modify | Collapsible sidebar, mobile timeline scroll, FAB |
| `src/components/metmap/MobilePlaybackControls.tsx` | Modify | Ensure visibility, touch targets |
| `src/components/tasks/KanbanBoard.tsx` | Modify | Add TouchSensor to dnd-kit |
| `src/components/dashboard/CustomizableWidgets.tsx` | Modify | Add TouchSensor to dnd-kit |
| `src/hooks/useSwipeBack.ts` | Create | Swipe-from-edge navigation |
| `src/hooks/usePullToRefresh.ts` | Create | Pull-down refresh gesture |
| `src/hooks/useAdaptiveLoading.ts` | Create | Connection-aware loading |
| `src/components/templates/DashboardLayout.tsx` | Modify | Wire swipe-back, reduced motion |
| `src/pages/MessagesNew.tsx` | Modify | Tablet layout breakpoint |
| `src/pages/Billing.tsx` | Modify | DashboardLayout wrapper, mobile padding |
| `src/pages/Pricing.tsx` | Modify | Mobile verification/tweaks |
