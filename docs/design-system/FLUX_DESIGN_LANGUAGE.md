# Flux Design Language

**Version 1.0.0** | **Last Updated: January 2025**

> The official design system for FluxStudio - empowering creative teams to build cohesive, accessible, and beautiful interfaces.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Design Principles](#design-principles)
3. [Design Tokens](#design-tokens)
4. [Color System](#color-system)
5. [Typography](#typography)
6. [Spacing & Layout](#spacing--layout)
7. [Elevation & Shadows](#elevation--shadows)
8. [Motion & Animation](#motion--animation)
9. [Component Library](#component-library)
10. [Accessibility](#accessibility)
11. [Usage Guidelines](#usage-guidelines)

---

## Introduction

The Flux Design Language is a comprehensive design system that ensures consistency, accessibility, and efficiency across the entire FluxStudio platform. It provides a unified visual language, reusable components, and clear guidelines for creating exceptional user experiences.

### Goals

- **Consistency**: Establish a unified visual language across all touchpoints
- **Efficiency**: Accelerate development with reusable patterns and components
- **Accessibility**: Ensure WCAG 2.1 AA compliance for all users
- **Scalability**: Support future growth and feature additions
- **Creativity**: Enable expressive, engaging interfaces for creative professionals

### Target Audience

- **Creative Directors**: Need powerful project management tools
- **Designers**: Require collaborative design workflows
- **Project Managers**: Demand clear visibility and organization
- **Clients**: Expect intuitive communication and review processes

---

## Design Principles

### 1. Clarity Over Cleverness

**Philosophy**: Prioritize clear, understandable interfaces over flashy effects.

- Use straightforward language and familiar patterns
- Provide clear visual hierarchies
- Make actions and consequences obvious
- Minimize cognitive load

**Examples**:
- ✅ Button labeled "Save Project"
- ❌ Button labeled "Commit Changes to Persistent Storage"

### 2. Purposeful Motion

**Philosophy**: Every animation should serve a purpose - guide attention, provide feedback, or establish spatial relationships.

- Use animation to explain state changes
- Respect reduced motion preferences
- Keep durations appropriate (100-400ms for most interactions)
- Follow natural physics and easing curves

**Examples**:
- ✅ Modal slides in from top (establishes spatial relationship)
- ❌ Random spin animation on button click (no purpose)

### 3. Progressive Disclosure

**Philosophy**: Show users what they need when they need it.

- Start with essential information
- Reveal complexity gradually
- Use expandable sections for advanced features
- Provide clear paths to dive deeper

**Examples**:
- ✅ Project card shows title/thumbnail by default, expandable details on hover
- ❌ Project card shows all metadata at once (overwhelming)

### 4. Spatial Consistency

**Philosophy**: Use consistent spacing, alignment, and layout patterns.

- Follow 4px base grid
- Use semantic spacing tokens
- Align related elements
- Create clear visual groupings

### 5. Accessible by Default

**Philosophy**: Accessibility is not optional - it's built into every component.

- All interactive elements keyboard accessible
- Color combinations meet WCAG AA contrast ratios
- ARIA labels and semantic HTML
- Screen reader friendly

---

## Design Tokens

Design tokens are the atomic building blocks of the design system. They ensure consistency across the entire platform and make it easy to update the design system globally.

### Token Structure

```
src/
└── tokens/
    ├── colors.ts        # Color palette
    ├── typography.ts    # Font families, sizes, weights
    ├── spacing.ts       # Spacing scale, border radius
    ├── shadows.ts       # Box shadows and elevation
    ├── animations.ts    # Timing, easing, keyframes
    └── index.ts         # Central export
```

### Usage in Code

```typescript
// Import all tokens
import { colors, typography, spacing, shadows, animations } from '@/tokens';

// Use individual tokens
const buttonStyle = {
  backgroundColor: colors.primary[600],
  padding: spacing.semantic.componentMd,
  boxShadow: shadows.component.button.rest,
  transition: animations.transition.normal.all,
};
```

### Usage in Tailwind

```tsx
// Flux Design Language tokens are automatically available in Tailwind
<button className="bg-primary-600 text-white px-4 py-2 shadow-button rounded-lg hover:shadow-button-hover transition-normal">
  Click Me
</button>
```

---

## Color System

### Brand Colors

#### Primary - Indigo
Our primary brand color represents creativity, innovation, and professionalism.

```
primary-50:  #EEF2FF (Backgrounds, subtle highlights)
primary-100: #E0E7FF
primary-200: #C7D2FE
primary-300: #A5B4FC
primary-400: #818CF8
primary-500: #6366F1
primary-600: #4F46E5 ★ Main brand color
primary-700: #4338CA
primary-800: #3730A3
primary-900: #312E81 (Text, strong emphasis)
```

**Usage**:
- Primary actions (Save, Submit, Confirm)
- Links and navigation
- Active/selected states
- Brand elements

#### Secondary - Purple
Complementary to primary, used for secondary actions and accents.

```
secondary-500: #A855F7 ★ Main secondary color
```

**Usage**:
- Secondary actions
- Complementary UI elements
- Feature highlights

#### Accent - Cyan
Vibrant accent for highlights and special features.

```
accent-500: #06B6D4 ★ Main accent color
```

**Usage**:
- Notifications
- New feature callouts
- Special highlights

### Semantic Colors

#### Success - Green
```
success-500: #22C55E
```
Used for: Success messages, completed tasks, positive confirmations

#### Warning - Amber
```
warning-500: #F59E0B
```
Used for: Warnings, caution messages, pending states

#### Error - Red
```
error-500: #EF4444
```
Used for: Error messages, destructive actions, validation failures

#### Info - Blue
```
info-500: #3B82F6
```
Used for: Informational messages, helpful tips, guidance

### Neutral/Gray Scale

```
neutral-50:  #FAFAFA (Lightest backgrounds)
neutral-100: #F5F5F5 (Background secondary)
neutral-200: #E5E5E5 (Borders, dividers)
neutral-300: #D4D4D4
neutral-400: #A3A3A3
neutral-500: #737373 (Body text secondary)
neutral-600: #525252
neutral-700: #404040
neutral-800: #262626 (Body text primary)
neutral-900: #171717 (Headings)
neutral-950: #0A0A0A (Maximum contrast)
```

### Color Usage Guidelines

#### Contrast Ratios (WCAG AA)

- **Text**: Minimum 4.5:1 for normal text, 3:1 for large text (18px+)
- **UI Components**: Minimum 3:1 for interactive elements
- **Focus Indicators**: Minimum 3:1 against background

#### Example Compliant Combinations

✅ **Approved Combinations**:
- `primary-600` text on `white` background (7.3:1)
- `neutral-900` text on `white` background (16.1:1)
- `white` text on `primary-600` background (7.3:1)
- `neutral-600` text on `neutral-50` background (5.2:1)

❌ **Avoid**:
- `primary-400` text on `white` background (2.9:1 - too low)
- `neutral-400` text on `white` background (2.8:1 - too low)

---

## Typography

### Font Families

#### Sans-serif (Default)
**Lexend** - Primary typeface for body text and UI elements

```css
font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Characteristics**:
- High legibility
- Clean, modern aesthetic
- Excellent for UI text
- Variable font support

#### Display
**Orbitron** - Used for headings and display text

```css
font-family: 'Orbitron', 'Lexend', sans-serif;
```

**Characteristics**:
- Bold, futuristic aesthetic
- Great for headings and titles
- Distinctive brand personality

#### Monospace
**SF Mono** (fallback to system mono) - Code and technical content

```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
```

### Type Scale

Our type scale is based on a modular scale with a 1.25 ratio for harmonious proportions.

```typescript
fontSize: {
  xs:   '0.75rem',   // 12px - Captions, helper text
  sm:   '0.875rem',  // 14px - Small body text, labels
  base: '1rem',      // 16px - Default body text
  lg:   '1.125rem',  // 18px - Large body text
  xl:   '1.25rem',   // 20px - Small headings
  2xl:  '1.5rem',    // 24px - H3
  3xl:  '1.875rem',  // 30px - H2
  4xl:  '2.25rem',   // 36px - H1
  5xl:  '3rem',      // 48px - Display small
  6xl:  '3.75rem',   // 60px - Display medium
  7xl:  '4.5rem',    // 72px - Display large
}
```

### Text Styles (Semantic)

Pre-configured text styles for common use cases:

```typescript
// Display Text
displayLarge:   72px, weight 700, line-height 1.1
displayMedium:  60px, weight 700, line-height 1.15
displaySmall:   48px, weight 700, line-height 1.2

// Headings
h1: 36px, weight 700, line-height 1.25
h2: 30px, weight 600, line-height 1.3
h3: 24px, weight 600, line-height 1.35
h4: 20px, weight 600, line-height 1.4
h5: 18px, weight 600, line-height 1.45
h6: 16px, weight 600, line-height 1.5

// Body Text
bodyLarge:  18px, weight 400, line-height 1.625
bodyMedium: 16px, weight 400, line-height 1.5
bodySmall:  14px, weight 400, line-height 1.5

// Labels
labelLarge:  14px, weight 500, line-height 1.5
labelMedium: 13px, weight 500, line-height 1.5
labelSmall:  12px, weight 500, line-height 1.5
```

### Usage Examples

```tsx
// Heading
<h1 className="text-4xl font-bold text-neutral-900 leading-tight">
  Project Dashboard
</h1>

// Body text
<p className="text-base font-normal text-neutral-700 leading-relaxed">
  Welcome to your creative workspace.
</p>

// Label
<label className="text-sm font-medium text-neutral-600">
  Project Name
</label>

// Caption
<span className="text-xs text-neutral-500">
  Last updated 5 minutes ago
</span>
```

---

## Spacing & Layout

### Base Grid

All spacing follows a **4px base grid** for pixel-perfect alignment and consistency.

```
4px (0.25rem) = 1 unit
```

### Spacing Scale

```typescript
spacing: {
  0:    '0',          // 0px
  px:   '1px',        // 1px
  0.5:  '0.125rem',   // 2px
  1:    '0.25rem',    // 4px
  2:    '0.5rem',     // 8px
  3:    '0.75rem',    // 12px
  4:    '1rem',       // 16px
  5:    '1.25rem',    // 20px
  6:    '1.5rem',     // 24px
  8:    '2rem',       // 32px
  10:   '2.5rem',     // 40px
  12:   '3rem',       // 48px
  16:   '4rem',       // 64px
  20:   '5rem',       // 80px
  24:   '6rem',       // 96px
}
```

### Semantic Spacing

Pre-defined spacing for common use cases:

```typescript
semantic: {
  // Component Internal Spacing
  componentXs: '4px',   // Tight spacing
  componentSm: '8px',   // Default internal
  componentMd: '12px',  // Medium internal
  componentLg: '16px',  // Larger internal
  componentXl: '24px',  // Extra large internal

  // Section Spacing
  sectionXs: '16px',    // Minimal section spacing
  sectionSm: '24px',    // Small section spacing
  sectionMd: '32px',    // Default section spacing
  sectionLg: '48px',    // Large section spacing
  sectionXl: '64px',    // Extra large section spacing

  // Layout Spacing
  layoutXs: '32px',     // Minimal layout spacing
  layoutSm: '48px',     // Small layout spacing
  layoutMd: '64px',     // Default layout spacing
  layoutLg: '96px',     // Large layout spacing
  layoutXl: '128px',    // Extra large layout spacing
}
```

### Container Max Widths

```typescript
maxWidth: {
  xs:  '320px',  // Mobile
  sm:  '384px',  // Small screens
  md:  '448px',  // Medium
  lg:  '512px',  // Large
  xl:  '576px',  // Extra large
  2xl: '672px',  // 2XL
  3xl: '768px',  // 3XL (tablets)
  4xl: '896px',  // 4XL
  5xl: '1024px', // 5XL (desktop)
  6xl: '1152px', // 6XL
  7xl: '1280px', // 7XL (large desktop)
}
```

### Layout Patterns

#### Dashboard Layout
```
┌─────────────────────────────────────┐
│         Top Bar (64px)              │
├─────┬───────────────────────────────┤
│     │                               │
│  S  │      Main Content Area        │
│  i  │      (max-width: 7xl)         │
│  d  │      (padding: 8)             │
│  e  │                               │
│  b  │                               │
│  a  │                               │
│  r  │                               │
│     │                               │
│ 240 │                               │
│ px  │                               │
└─────┴───────────────────────────────┘
```

---

## Elevation & Shadows

### Elevation Levels

Shadows create depth and hierarchy in the interface. Higher elevation = higher z-index.

```typescript
elevation: {
  0: 'none',                    // Flat, on surface
  1: '0 1px 2px rgba(...)',     // Subtle elevation (cards at rest)
  2: '0 1px 3px rgba(...)',     // Small elevation (dropdowns)
  3: '0 4px 6px rgba(...)',     // Medium elevation (cards on hover)
  4: '0 10px 15px rgba(...)',   // High elevation (menus)
  5: '0 20px 25px rgba(...)',   // Higher elevation (modals)
  6: '0 25px 50px rgba(...)',   // Highest elevation (overlays)
}
```

### Component-Specific Shadows

```typescript
component: {
  card: {
    rest:   'elevation-2',    // Cards at rest
    hover:  'elevation-4',    // Cards on hover
    active: 'elevation-1',    // Cards when pressed
  },

  button: {
    rest:   'elevation-1',    // Buttons at rest
    hover:  'elevation-3',    // Buttons on hover
    active: 'inner-sm',       // Buttons when pressed (inset)
  },

  modal:    'elevation-6',    // Modals
  dropdown: 'elevation-4',    // Dropdown menus
  tooltip:  'elevation-3',    // Tooltips
}
```

### Focus Shadows

For accessibility, interactive elements receive focus shadows:

```typescript
focus: {
  default: '0 0 0 3px rgba(99, 102, 241, 0.2)',  // Primary focus
  error:   '0 0 0 3px rgba(239, 68, 68, 0.2)',   // Error focus
  success: '0 0 0 3px rgba(34, 197, 94, 0.2)',   // Success focus
}
```

---

## Motion & Animation

### Animation Principles

1. **Purposeful**: Every animation serves a functional purpose
2. **Subtle**: Animations enhance rather than distract
3. **Fast**: Most animations complete in 100-300ms
4. **Respectful**: Honor prefers-reduced-motion

### Timing & Easing

```typescript
duration: {
  instant:  '0ms',
  fastest:  '75ms',   // Instant feedback
  fast:     '150ms',  // User-initiated actions
  normal:   '200ms',  // Default transitions
  moderate: '300ms',  // Complex state changes
  slow:     '400ms',  // Page transitions
}

easing: {
  standard:    'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Default
  decelerate:  'cubic-bezier(0.0, 0.0, 0.2, 1)',  // Entering
  accelerate:  'cubic-bezier(0.4, 0.0, 1, 1)',    // Exiting
  sharp:       'cubic-bezier(0.4, 0.0, 0.6, 1)',  // Quick changes
}
```

### Common Animations

```typescript
// Fade
fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } }
fadeOut: { from: { opacity: 1 }, to: { opacity: 0 } }

// Slide
slideInFromRight:  { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } }
slideInFromLeft:   { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } }

// Scale
scaleIn:  { from: { transform: 'scale(0.9)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } }
scaleOut: { from: { transform: 'scale(1)', opacity: 1 }, to: { transform: 'scale(0.9)', opacity: 0 } }
```

### Usage Guidelines

#### Modal Animations
```tsx
// Modal enters with fade + scale
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.2, ease: 'standard' }}
>
  {/* Modal content */}
</motion.div>
```

#### Hover States
```tsx
// Button with hover elevation
<button className="transition-all duration-200 hover:shadow-4 hover:-translate-y-0.5">
  Click Me
</button>
```

---

## Component Library

*(This section will be expanded as components are built in Sprint 1 and 2)*

### Atomic Design Structure

```
components/
├── ui/               # Atoms (primitives from Radix UI)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── Dialog.tsx
├── molecules/        # Combinations of atoms
│   ├── SearchBar.tsx
│   ├── UserCard.tsx
│   ├── FileCard.tsx
│   └── ProjectCard.tsx
├── organisms/        # Complex components
│   ├── NavigationSidebar.tsx
│   ├── TopBar.tsx
│   ├── ProjectList.tsx
│   └── FileExplorer.tsx
├── templates/        # Page layouts
│   ├── DashboardLayout.tsx
│   └── AuthLayout.tsx
└── pages/            # Full pages
    ├── Home.tsx
    ├── Projects.tsx
    └── Files.tsx
```

---

## Accessibility

### WCAG 2.1 AA Compliance

All components meet WCAG 2.1 Level AA standards:

#### Perceivable
- ✅ Color contrast ratios of 4.5:1 (text) and 3:1 (UI)
- ✅ Text resizes up to 200% without loss of functionality
- ✅ Content distinguishable from background

#### Operable
- ✅ Keyboard accessible (all interactive elements)
- ✅ Focus indicators visible and clear
- ✅ No keyboard traps
- ✅ Skip links for navigation

#### Understandable
- ✅ Clear, consistent navigation
- ✅ Predictable interface behavior
- ✅ Form validation and error messages
- ✅ Help and documentation available

#### Robust
- ✅ Semantic HTML5
- ✅ ARIA labels and roles
- ✅ Screen reader compatible
- ✅ Works across browsers and assistive technologies

### Keyboard Navigation

All interactive elements support keyboard navigation:

- `Tab` / `Shift+Tab` - Navigate between elements
- `Enter` / `Space` - Activate buttons
- `Escape` - Close modals/dropdowns
- `Arrow keys` - Navigate within menus/lists

### Screen Reader Support

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Provide ARIA labels for icon-only buttons
- Use ARIA live regions for dynamic content
- Ensure focus management in modals and dialogs

---

## Usage Guidelines

### Getting Started

1. **Import Design Tokens**
   ```typescript
   import { colors, typography, spacing, shadows, animations } from '@/tokens';
   ```

2. **Use Tailwind Classes**
   ```tsx
   <div className="bg-primary-600 text-white p-4 rounded-lg shadow-3">
     Content
   </div>
   ```

3. **Follow Component Patterns**
   - Use existing components from `/components/ui/`
   - Build molecules by combining atoms
   - Create organisms from molecules
   - Maintain consistent patterns

### Do's and Don'ts

#### ✅ Do
- Use design tokens for all styling
- Follow the spacing scale (4px grid)
- Maintain color contrast ratios
- Test with keyboard navigation
- Honor reduced motion preferences
- Use semantic HTML

#### ❌ Don't
- Hardcode colors, spacing, or shadows
- Use arbitrary spacing values (e.g., `ml-[13px]`)
- Create custom animations without purpose
- Ignore focus states
- Use color alone to convey information
- Create deeply nested component hierarchies

### Code Examples

#### Button Component
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md">
  Save Project
</Button>
```

#### Card Component
```tsx
import { Card } from '@/components/ui/Card';

<Card className="p-6 hover:shadow-4 transition-all">
  <h3 className="text-xl font-semibold">Project Title</h3>
  <p className="text-neutral-600">Description</p>
</Card>
```

---

## Versioning

**Current Version**: 1.0.0

### Changelog

#### Version 1.0.0 (January 2025)
- Initial release
- Design tokens (colors, typography, spacing, shadows, animations)
- Tailwind configuration integration
- Documentation structure

---

## Resources

### Design Files
- Figma: *[Coming Soon]*
- Sketch: *[Coming Soon]*

### Code
- GitHub: `/src/tokens/`
- Storybook: *[Coming Soon]*

### Support
- Design Team: design@fluxstudio.art
- Engineering Team: engineering@fluxstudio.art

---

**Built with ❤️ by the FluxStudio Team**
