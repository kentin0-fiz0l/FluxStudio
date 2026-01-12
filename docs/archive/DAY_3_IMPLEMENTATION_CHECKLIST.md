# Day 3 Implementation Checklist
**Design Token Consolidation - Phase 2, Week 3**

## Pre-Implementation

- [ ] **Backup current state**
  ```bash
  git checkout -b phase2-week3-token-consolidation
  git add .
  git commit -m "Checkpoint: Before token consolidation"
  ```

- [ ] **Take baseline screenshots**
  - [ ] Homepage (light + dark mode)
  - [ ] Dashboard
  - [ ] Project detail
  - [ ] Messaging interface
  - [ ] Settings page
  - [ ] Modal examples

- [ ] **Record baseline metrics**
  ```bash
  npm run build
  # Note: CSS bundle size (currently 140.63 kB)
  ```

---

## Priority 1: CSS File Consolidation (2 hours)

### Task 1.1: Merge globals.css into index.css
- [ ] Copy essential styles from `globals.css` to `index.css`
  - [ ] Keep: Gradient definitions (refactored to tokens)
  - [ ] Keep: Glassmorphic buttons (move to @layer components)
  - [ ] Remove: Duplicate CSS custom properties
  - [ ] Remove: 30+ 3D/ambient animations (unused)

### Task 1.2: Merge design-system.css into index.css
- [ ] Copy essential styles from `design-system.css`
  - [ ] Remove: Duplicate color definitions
  - [ ] Remove: Duplicate spacing definitions
  - [ ] Remove: Duplicate typography definitions
  - [ ] Keep: Grid system (if not in Tailwind)

### Task 1.3: Clean up index.css
- [ ] Remove duplicate CSS custom properties
- [ ] Remove conflicting font-family definitions
- [ ] Consolidate @keyframes (remove duplicates)
- [ ] Organize into Tailwind layers:
  ```css
  @layer base {
    /* Base resets, typography */
  }
  @layer components {
    /* Glassmorphic buttons, custom components */
  }
  @layer utilities {
    /* Custom utility classes */
  }
  ```

### Task 1.4: Delete old CSS files
- [ ] Delete `/src/styles/globals.css`
- [ ] Delete `/src/styles/design-system.css`
- [ ] Update imports in components (if any)

### Task 1.5: Test
- [ ] `npm run build` - verify no errors
- [ ] Visual check: Homepage, Dashboard
- [ ] Check glassmorphic buttons still work

**Expected Savings:** 8-12 kB

---

## Priority 2: Token System Streamlining (3 hours)

### Task 2.1: Colors - Reduce to 70 tokens (30 min)

**File:** `/src/tokens/colors.ts`

- [ ] **Remove shade 400 and 800** from:
  - [ ] Primary (10 → 8 shades)
  - [ ] Secondary (10 → 8 shades)
  - [ ] Accent (10 → 8 shades)
  - [ ] Success (10 → 6 shades: keep 100, 300, 500, 700, 900)
  - [ ] Warning (10 → 6 shades)
  - [ ] Error (10 → 6 shades)
  - [ ] Info (10 → 6 shades)

- [ ] **Remove special overlays:**
  - [ ] Keep: overlay, white, black, transparent
  - [ ] Remove: overlayLight, overlayHeavy (use opacity modifiers)

- [ ] **Grep for usage** before removing:
  ```bash
  grep -r "primary-400" src/
  grep -r "primary-800" src/
  # Repeat for all shades being removed
  ```

- [ ] **Replace usage** with nearest shade:
  - 400 → 500
  - 800 → 900

**Test:** Build + visual check

### Task 2.2: Typography - Unify & Reduce (45 min)

**File:** `/src/tokens/typography.ts`

- [ ] **Remove handwriting font:**
  ```typescript
  // Remove:
  handwriting: "'Swanky and Moo Moo', cursive",
  ```
  - [ ] Find 2 usages, replace with display font

- [ ] **Reduce font weights** (9 → 4):
  - [ ] Keep: normal (400), medium (500), semibold (600), bold (700)
  - [ ] Remove: thin, extralight, light, extrabold, black
  - [ ] Grep for removed weights, replace with nearest

- [ ] **Reduce line heights** (13 → 6):
  - [ ] Keep: tight, normal, relaxed, loose
  - [ ] Remove: none, snug, numeric variants (3-10)

- [ ] **Reduce text style presets** (34 → 12):
  - [ ] Remove: displayLarge, displayMedium, displaySmall
  - [ ] Remove: h5, h6
  - [ ] Remove: bodyLarge, labelLarge
  - [ ] Remove: buttonLarge, buttonSmall
  - [ ] Remove: codeLarge, codeSmall
  - [ ] Remove: overline
  - [ ] Grep for usage, replace with h1-h4 or size modifiers

**File:** `/src/index.css`

- [ ] Remove duplicate font-family definitions:
  ```css
  /* Remove from :root */
  --font-title: ...
  --font-body: ...
  --font-heading: ...
  ```

**Test:** Typography rendering, font loading

### Task 2.3: Spacing - 8-Point Grid (45 min)

**File:** `/src/tokens/spacing.ts`

- [ ] **Reduce base scale** (33 → 20):
  - [ ] Keep: 0, px, 1, 2, 3, 4, 6, 8, 10, 11, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
  - [ ] Remove: 0.5, 1.5, 2.5, 3.5, 5, 7, 9, 14, 28, 36, 44, 52, 56, 60, 72

- [ ] **Grep for removed values:**
  ```bash
  grep -r "space-\[0.5\]" src/
  # Replace with nearest 8px value
  ```

- [ ] **Reduce semantic spacing** (54 → 15):
  - [ ] Consolidate component/section/layout into `space` category
  - [ ] Keep specific: cardPadding, containerPadding, form tokens, grid gaps

- [ ] **Add accessibility tokens:**
  ```typescript
  accessibility: {
    touchTarget: '2.75rem',    // 44px WCAG minimum
    touchTargetLg: '3rem',     // 48px
  }
  ```

- [ ] **Update components** using arbitrary values:
  ```bash
  # Find: min-h-[44px]
  # Replace: min-h-11 (or use accessibility.touchTarget)
  ```

**Test:** Layout shifts, mobile responsive

### Task 2.4: Shadows - Simplify to 4 Levels (30 min)

**File:** `/src/tokens/shadows.ts`

- [ ] **Reduce elevation** (7 → 4):
  - [ ] Keep: 0 (none), 1 (sm), 3 (md), 5 (lg)
  - [ ] Remove: 2, 4, 6
  - [ ] Rename: 1→sm, 3→md, 5→lg

- [ ] **Remove colored shadows** (6):
  - [ ] Delete entire `colored` object
  - [ ] Replace usage with `shadow-md border-2 border-{color}`

- [ ] **Reduce inner shadows** (4 → 2):
  - [ ] Keep: sm, lg
  - [ ] Remove: base, md

- [ ] **Consolidate focus** (7 → 1):
  - [ ] Keep default focus style
  - [ ] Delete color variants (use modifiers)

- [ ] **Remove glow effects** (6):
  - [ ] Delete entire `glow` object
  - [ ] Replace with `filter drop-shadow()` if needed

- [ ] **Remove border shadows** (3):
  - [ ] Delete entire `border` object
  - [ ] Replace with border utilities

- [ ] **Reduce component shadows** (11 → 4):
  - [ ] Keep: card.rest, card.hover, input.focus, modal
  - [ ] Remove: button shadows (use elevation)
  - [ ] Remove: dropdown, tooltip, drawer, fab (use elevation)

**Test:** Shadow rendering, depth perception

### Task 2.5: Animations - Remove Specialty (30 min)

**File:** `/src/tokens/animations.ts`

- [ ] **Reduce easing** (13 → 6):
  - [ ] Keep: linear, ease, easeInOut, standard, bounce, spring
  - [ ] Remove: easeIn, easeOut, decelerate, accelerate, sharp, smooth, snappy

- [ ] **Reduce duration** (9 → 4):
  - [ ] Keep: fast (150ms), normal (200ms), moderate (300ms), slow (400ms)
  - [ ] Remove: instant, fastest, faster, slower, slowest

**File:** `/src/styles/globals.css` (if not already deleted)

- [ ] **Remove 30+ specialty animations:**
  - [ ] Grep for usage first (should be 0-2 uses)
  - [ ] Delete: float3d, orbit3d, wobble3d, spin3d, etc.
  - [ ] Delete: ambient-drift, breathe, eno-particle-drift, etc.
  - [ ] Delete: crystalline-rotation, molecular-orbit, quantum-pulse, etc.

**Test:** Remaining animations work (modal, dropdown, toast)

**Expected Savings:** 16 kB total for Priority 2

---

## Priority 3: Tailwind Config Integration (1 hour)

### Task 3.1: Import token files

**File:** `/Users/kentino/FluxStudio/tailwind.config.js`

- [ ] Add imports at top:
  ```javascript
  import { colors } from './src/tokens/colors.js';
  import { typography } from './src/tokens/typography.js';
  import { spacing } from './src/tokens/spacing.js';
  import { shadows } from './src/tokens/shadows.js';
  ```

- [ ] Convert token files to .js (or use ESM):
  ```bash
  # Option 1: Rename .ts → .js, remove TypeScript types
  # Option 2: Use ts-node in Tailwind config
  # Option 3: Build tokens to JSON, import JSON
  ```

### Task 3.2: Extend Tailwind theme

- [ ] Replace legacy colors with token imports:
  ```javascript
  colors: {
    ...colors,
    // Backward compatibility aliases
    gradient: {
      yellow: colors.warning[400],
      pink: colors.secondary[500],
      purple: colors.secondary[600],
      cyan: colors.accent[500],
      green: colors.success[500],
    }
  }
  ```

- [ ] Import typography:
  ```javascript
  fontFamily: typography.fontFamily,
  fontSize: typography.fontSize,
  ```

- [ ] Import spacing:
  ```javascript
  spacing: {
    ...spacing,
    // Flatten semantic spacing
    ...Object.fromEntries(
      Object.entries(spacing.semantic).map(([k, v]) =>
        [k.replace(/([A-Z])/g, '-$1').toLowerCase(), v]
      )
    ),
  }
  ```

- [ ] Import shadows:
  ```javascript
  boxShadow: {
    ...shadows.elevation,
    'card': shadows.component.card.rest,
    'card-hover': shadows.component.card.hover,
  }
  ```

### Task 3.3: Remove legacy definitions

- [ ] Remove old gradient colors
- [ ] Remove conflicting font definitions
- [ ] Remove duplicate sidebar spacing

### Task 3.4: Test build

- [ ] `npm run build`
- [ ] Check for Tailwind errors
- [ ] Verify token imports work

**Expected Savings:** 4 kB

---

## Priority 4: Anti-Pattern Cleanup (1.5 hours)

### Task 4.1: Convert static inline styles (106 occurrences)

- [ ] Find static inline styles:
  ```bash
  grep -r 'style={{ fontSize:' src/
  grep -r 'style={{ padding:' src/
  grep -r 'style={{ color:' src/
  ```

- [ ] Convert to Tailwind classes:
  ```jsx
  // Before:
  <div style={{ fontSize: '14px' }}>

  // After:
  <div className="text-sm">
  ```

- [ ] Keep dynamic styles (acceptable):
  ```jsx
  // Keep:
  <div style={{ width: `${progress}%` }}>
  <div style={{ opacity: isVisible ? 1 : 0 }}>
  ```

### Task 4.2: Replace arbitrary spacing (65 files)

- [ ] Add token aliases for common values:
  ```typescript
  // In spacing.ts
  accessibility: {
    touchTarget: '2.75rem',    // 44px
    touchTargetLg: '3rem',     // 48px
  }
  ```

- [ ] Find and replace:
  ```bash
  # Find: min-h-[44px]
  # Replace: min-h-11 or touch-target utility
  ```

### Task 4.3: Add missing icon size tokens

**File:** `/src/tokens/spacing.ts`

- [ ] Add icon sizes:
  ```typescript
  icon: {
    sm: '1rem',      // 16px
    md: '1.25rem',   // 20px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
  }
  ```

- [ ] Replace arbitrary icon sizes:
  ```bash
  # Find: h-[20px] w-[20px]
  # Replace: size-icon-md (if Tailwind supports, or h-icon-md w-icon-md)
  ```

**Expected Savings:** 4 kB

---

## Priority 5: Testing & Validation (1.5 hours)

### Task 5.1: Build validation

- [ ] Run production build:
  ```bash
  npm run build
  ```

- [ ] Check CSS bundle size:
  ```
  Target: <120 kB
  Expected: ~108 kB
  Actual: ___ kB
  ```

- [ ] Check gzip size:
  ```
  Target: <18 kB
  Expected: ~16 kB
  Actual: ___ kB
  ```

- [ ] Verify no build errors
- [ ] Check build time (<7s)

### Task 5.2: Visual regression testing

- [ ] **Homepage:**
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] Hero section
  - [ ] Glassmorphic buttons
  - [ ] Gradient text

- [ ] **Dashboard:**
  - [ ] Layout intact
  - [ ] Cards render correctly
  - [ ] Shadows appropriate
  - [ ] Spacing consistent

- [ ] **Project Detail:**
  - [ ] Typography hierarchy
  - [ ] Component spacing
  - [ ] Modal shadows

- [ ] **Messaging Interface:**
  - [ ] Chat bubbles
  - [ ] Animations smooth
  - [ ] Mobile responsive

- [ ] **Settings Page:**
  - [ ] Form inputs
  - [ ] Focus states visible
  - [ ] Touch targets adequate

- [ ] **Components:**
  - [ ] Modals
  - [ ] Dropdowns
  - [ ] Tooltips
  - [ ] Toast notifications

### Task 5.3: Accessibility testing

- [ ] **Touch targets:**
  - [ ] All buttons ≥44×44px on mobile
  - [ ] All interactive elements meet WCAG minimum

- [ ] **Focus indicators:**
  - [ ] Visible on all interactive elements
  - [ ] High contrast (visible on gradients)

- [ ] **Color contrast:**
  - [ ] Text meets WCAG AA (4.5:1)
  - [ ] UI components meet WCAG AA (3:1)

- [ ] **Reduced motion:**
  - [ ] Test with `prefers-reduced-motion`
  - [ ] Animations respect user preference

### Task 5.4: Performance testing

- [ ] Run Lighthouse:
  ```bash
  npm run lighthouse
  ```

- [ ] Target scores:
  - [ ] Performance: >90
  - [ ] Accessibility: 100
  - [ ] Best Practices: >95
  - [ ] SEO: >90

- [ ] Check Core Web Vitals:
  - [ ] LCP: <2.5s
  - [ ] FID: <100ms
  - [ ] CLS: <0.1

### Task 5.5: Cross-browser testing

- [ ] Chrome (desktop + mobile)
- [ ] Firefox
- [ ] Safari (desktop + iOS)
- [ ] Edge

### Task 5.6: Responsive testing

- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px)
- [ ] Large desktop (1920px)

---

## Post-Implementation

### Documentation

- [ ] Update design system documentation
- [ ] Create migration guide for team
- [ ] Document removed tokens (for reference)
- [ ] Update Storybook (if applicable)

### Git Workflow

- [ ] Review all changes:
  ```bash
  git status
  git diff
  ```

- [ ] Commit with descriptive message:
  ```bash
  git add .
  git commit -m "Phase 2 Week 3: Consolidate design token system

  - Reduce CSS bundle from 140.63 kB to 108.63 kB (22.7% reduction)
  - Consolidate 3 CSS files into 1
  - Streamline token system (89→70 colors, 87→45 spacing, 40→16 shadows)
  - Remove 30+ unused animations
  - Unify typography (Lexend + Orbitron)
  - Integrate tokens into Tailwind config
  - Clean up static inline styles and arbitrary values

  Bundle size: 108.63 kB (21.29 kB → ~16 kB gzipped)
  Build time: 7.15s → 6.2s

  Tested: Visual regression, accessibility, performance
  WCAG AA compliant, no breaking changes"
  ```

- [ ] Create pull request
- [ ] Request code review
- [ ] Merge after approval

### Metrics Tracking

- [ ] Record final bundle size
- [ ] Record build time
- [ ] Record Lighthouse scores
- [ ] Update Phase 2 Week 3 progress document

---

## Rollback Plan (If Needed)

If critical issues found:

```bash
# Rollback to checkpoint
git reset --hard HEAD~1

# Or checkout previous commit
git log
git checkout <commit-hash>

# Or create new branch from backup
git checkout -b rollback main
```

**Rollback triggers:**
- Bundle size >125 kB (missed target significantly)
- Visual regressions in critical paths
- Accessibility failures (WCAG violations)
- Build errors that can't be quickly fixed

---

## Success Criteria

**Must Have:**
- ✓ CSS bundle <120 kB
- ✓ No visual regressions
- ✓ No accessibility regressions
- ✓ All tests passing
- ✓ Build succeeds

**Should Have:**
- ✓ Bundle ≤108 kB (target)
- ✓ Build time ≤6.5s
- ✓ Lighthouse performance >90
- ✓ Code review approval

**Nice to Have:**
- ✓ Bundle <105 kB (exceeds target)
- ✓ Build time <6s
- ✓ Lighthouse performance >95
- ✓ Zero arbitrary values

---

## Time Tracking

| Priority | Estimated | Actual | Notes |
|----------|-----------|--------|-------|
| P1: CSS Consolidation | 2h | ___ | |
| P2: Token Streamlining | 3h | ___ | |
| P3: Tailwind Integration | 1h | ___ | |
| P4: Anti-Pattern Cleanup | 1.5h | ___ | |
| P5: Testing | 1.5h | ___ | |
| **Total** | **9h** | **___** | |

**Actual completion time:** ___ hours

**Notes:**

---

**Ready to begin Day 3 implementation!** ✓

Follow this checklist sequentially. Check off items as you complete them. Take breaks between priorities to test and verify changes.
