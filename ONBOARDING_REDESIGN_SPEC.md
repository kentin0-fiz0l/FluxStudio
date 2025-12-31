# Onboarding Redesign Specification
## 30-Second Time-to-Creation

**Created:** December 31, 2025
**Priority:** P1 - High
**Sprint Target:** Q1 2026 (Sprint 21-22)
**Status:** Specification Complete, Implementation Pending

---

## Executive Summary

The current FluxStudio onboarding requires **5 steps with 27+ form fields** before users can create anything. This is antithetical to the vision of "effortless creation where tools disappear."

This specification defines a new onboarding flow achieving **< 30 seconds time-to-creation** through:
1. Separating creator onboarding from client intake
2. Minimal required fields (authentication only)
3. Template-based quick start
4. Progressive profile collection

---

## Current State Analysis

### Current Flow (ClientOnboarding.tsx):
```
Step 1: Organization Setup (~60 seconds)
├── organizationName
├── organizationType
├── location
├── contactEmail
├── contactPhone
└── website

Step 2: Project Details (~90 seconds)
├── projectName
├── projectDescription
├── serviceCategory
├── projectType
├── serviceTier
├── ensembleType
├── ensembleSize
└── ageGroup

Step 3: Timeline & Budget (~45 seconds)
├── startDate
├── deadline
├── timeline
├── budgetRange
└── isFlexibleBudget

Step 4: Requirements (~60 seconds)
├── specificRequirements
├── hasExistingDesigns
├── designReferences
├── communicationPreferences
├── additionalServices
└── paymentTiming

Step 5: Review & Agreement (~30 seconds)
├── Review all information
└── agreedToTerms
```

**Total Time:** 4-6 minutes
**Vision Alignment:** 2/10 (this is client intake, not creator onboarding)

### Problems Identified:
1. **Wrong audience** - This onboards clients, not creators
2. **Too much upfront** - 27 fields before seeing the product
3. **Business focus** - Budget, payment, terms before creativity
4. **High abandonment** - Estimated 50-70% drop-off
5. **No value preview** - Users commit before experiencing benefit

---

## Proposed Design

### Dual-Track Onboarding

**Track A: Creator Flow** (New - Primary Focus)
For designers, instructors, and creative team members.
- Goal: Start creating within 30 seconds
- No business/payment information
- Template-based immediate access

**Track B: Client Intake Flow** (Existing - Keep Separate)
For clients commissioning work from design studios.
- Keep existing 5-step flow
- Accessed via "Commission a Design" or studio invitation
- Not the default path

---

## Creator Flow Specification

### Flow Overview:
```
Authentication (10s) → Template Selection (15s) → Creating (5s)
Total: < 30 seconds
```

### Step 1: Smart Authentication (10 seconds)

**UI Components:**
```
┌─────────────────────────────────────────┐
│                                         │
│         Welcome to FluxStudio           │
│    Where marching arts come to life     │
│                                         │
│    ┌──────────────────────────────┐    │
│    │  Continue with Google        │    │
│    └──────────────────────────────┘    │
│    ┌──────────────────────────────┐    │
│    │  Continue with GitHub        │    │
│    └──────────────────────────────┘    │
│                                         │
│           ── or ──                      │
│                                         │
│    ┌──────────────────────────────┐    │
│    │  Email address               │    │
│    └──────────────────────────────┘    │
│    ┌──────────────────────────────┐    │
│    │  Continue                    │    │
│    └──────────────────────────────┘    │
│                                         │
│    Already have an account? Sign in     │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**
- OAuth buttons auto-populate name and email
- Email flow: Just email + password, nothing else
- No organization name, no role selection, no preferences
- Validation: Inline, non-blocking

**Code Pattern:**
```typescript
interface CreatorSignup {
  method: 'google' | 'github' | 'email';
  email?: string;
  password?: string;
  // That's it. No other fields.
}
```

### Step 2: Template Selection (15 seconds)

**UI Components:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   What are you creating today?                          │
│                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │    📝      │  │    🎵      │  │    🎨      │   │
│   │   Drill    │  │  Practice  │  │  Custom    │   │
│   │  Design    │  │   Chart    │  │  Project   │   │
│   └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
│   Popular Templates:                                    │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│   │ Opener  │ │ Ballad  │ │ Closer  │ │ Parade  │    │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                         │
│   ┌───────────────────────────────────────────────┐   │
│   │  Start with blank canvas                      │   │
│   └───────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Template Categories:**
| Category | Description | Opens In |
|----------|-------------|----------|
| Drill Design | Formation design for field shows | Drill Writer |
| Practice Chart | Section practice tracking | MetMap |
| Custom Project | Blank canvas, choose tools | Project Dashboard |

**Behavior:**
- Single click starts creation
- Template pre-populated with sample data (not empty)
- User can explore immediately, make changes
- No "project name" prompt - auto-generated ("Untitled Show 1")
- Name can be changed later inline

**Code Pattern:**
```typescript
interface TemplateSelection {
  category: 'drill' | 'practice' | 'custom';
  template?: string; // e.g., 'opener', 'ballad', 'closer'
}

// On selection, immediately redirect to tool
const handleTemplateSelect = async (selection: TemplateSelection) => {
  const project = await createProjectFromTemplate(selection);
  navigate(`/projects/${project.id}/${selection.category === 'drill' ? 'drill-writer' : 'metmap'}`);
};
```

### Step 3: In-Tool Welcome (5 seconds)

**First-Time Experience:**
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👋 Welcome! Here's a quick orientation:            ││
│ │                                                     ││
│ │  • Click anywhere on the field to add performers   ││
│ │  • Drag to move them around                        ││
│ │  • Press Space to play your formation              ││
│ │                                                     ││
│ │  [Got it, let's create!]    [Show me a tour]       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │              [Canvas with sample data]          │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Non-blocking overlay (user can click through)
- Dismisses on any interaction
- Optional guided tour (react-joyride)
- Sample data already visible - not empty canvas

---

## Progressive Profile Collection

### Philosophy:
Instead of collecting information upfront, collect it **when contextually relevant**.

### Collection Points:

| Data | When Collected | Context |
|------|----------------|---------|
| Name | After first save | "What should we call this project?" also asks "And your name?" |
| Organization | When inviting collaborators | "Create a team to invite others" |
| Role | When accessing team features | "What's your role? (helps us customize)" |
| Ensemble size | When creating formations | "How many performers in your ensemble?" |
| Contact info | When publishing/sharing | "How should collaborators reach you?" |

### Implementation Pattern:
```typescript
// Contextual profile collection
const ProfilePrompt: React.FC<{ field: string; context: string }> = ({ field, context }) => {
  if (user.profile[field]) return null; // Already collected

  return (
    <InlinePrompt>
      <Text>{context}</Text>
      <Input
        placeholder={getPlaceholder(field)}
        onSubmit={(value) => updateProfile(field, value)}
      />
      <Button variant="ghost" onClick={skip}>Skip</Button>
    </InlinePrompt>
  );
};
```

---

## Client Intake Flow (Track B)

### Access Points:
- "Commission a Design" link in footer
- Invitation from design studio
- Direct URL for studios to share with clients

### Flow:
Keep existing 5-step ClientOnboarding flow but:
1. Add clear context: "Tell us about your project"
2. Remove login requirement until final step
3. Allow partial save (can complete later)
4. Add visual progress indicator

### UI Update:
```
┌─────────────────────────────────────────┐
│                                         │
│  Commission a Design                    │
│                                         │
│  Tell us about your project and we'll   │
│  match you with the perfect designer.   │
│                                         │
│  [Continue to Project Brief]            │
│                                         │
│  ── or ──                               │
│                                         │
│  Are you a designer? [Start Creating]   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technical Implementation

### New Components:

```
src/components/onboarding/
├── CreatorOnboarding/
│   ├── CreatorOnboarding.tsx        # Main component
│   ├── AuthenticationStep.tsx       # Step 1
│   ├── TemplateSelection.tsx        # Step 2
│   ├── InToolWelcome.tsx            # Step 3
│   └── ProgressiveProfile.tsx       # Contextual collection
├── ClientOnboarding/
│   └── (existing files - keep as is)
└── shared/
    ├── OnboardingProgress.tsx
    └── TemplateCard.tsx
```

### Routes Update:

```typescript
// Current
<Route path="/onboarding" element={<ClientOnboarding />} />

// New
<Route path="/onboarding" element={<CreatorOnboarding />} />
<Route path="/commission" element={<ClientOnboarding />} />
<Route path="/client-intake" element={<ClientOnboarding />} />
```

### Template Data:

```typescript
interface Template {
  id: string;
  name: string;
  category: 'drill' | 'practice' | 'custom';
  description: string;
  thumbnail: string;
  sampleData: ProjectData;
  tools: ('drill-writer' | 'metmap' | 'audio-sync' | '3d-preview')[];
}

const templates: Template[] = [
  {
    id: 'opener',
    name: 'Competition Opener',
    category: 'drill',
    description: '16-count opener with company front',
    thumbnail: '/templates/opener.png',
    sampleData: {
      performers: generateSamplePerformers(48),
      keyframes: [
        { count: 0, formation: 'scatter' },
        { count: 8, formation: 'company-front' },
        { count: 16, formation: 'block' },
      ],
    },
    tools: ['drill-writer', 'audio-sync'],
  },
  // ... more templates
];
```

---

## Success Metrics

### Primary Metrics:
| Metric | Current | Target |
|--------|---------|--------|
| Time to First Creative Action | 5+ min | < 30 sec |
| Onboarding Completion Rate | ~30% (est) | > 95% |
| Template Selection Rate | N/A | > 80% |
| First Session Duration | Unknown | > 10 min |

### Secondary Metrics:
| Metric | Target |
|--------|--------|
| OAuth adoption | > 70% |
| Profile completion (7 days) | > 60% |
| Return visit rate (7 days) | > 50% |
| "Got it, let's create" click | > 80% |

### Anti-Metrics (Lower is Better):
| Metric | Target |
|--------|--------|
| Signup abandonment | < 5% |
| Template skip rate | < 20% |
| Help/docs access in first session | < 5% |
| "Start blank" selection | < 30% |

---

## A/B Test Plan

### Phase 1: 20% Traffic (2 weeks)
- New creator flow vs. current flow
- Primary metric: Time to first creation
- Secondary: Return visit rate

### Phase 2: 50% Traffic (2 weeks)
- If Phase 1 positive (> 10% improvement)
- Add template variants
- Monitor profile completion rates

### Phase 3: 100% Rollout
- If Phase 2 positive
- Deprecate old flow
- Move client intake to /commission

---

## Edge Cases

### User Types:
| User Type | Experience |
|-----------|------------|
| New creator | Full creator flow |
| Returning user | Skip to dashboard |
| Invited to project | Go directly to project |
| Client (via /commission) | Client intake flow |
| Studio member (invited) | Creator flow + org auto-join |

### Error States:
| State | Response |
|-------|----------|
| OAuth fails | Fallback to email signup |
| Template load fails | Blank canvas + error toast |
| No templates available | Direct to blank project |
| Network offline | Queue signup, offline-first |

---

## Migration Plan

### Week 1: Build & Internal Test
- Build new creator flow
- Internal testing with team
- Gather feedback

### Week 2: 20% A/B Test
- Route 20% traffic to new flow
- Monitor metrics
- Fix issues

### Week 3: 50% Rollout
- Expand to 50% if metrics positive
- Begin deprecation notices

### Week 4: Full Rollout
- 100% traffic to new flow
- Old flow accessible via /legacy-onboarding (30 days)
- Update all marketing links

---

## Dependencies

### Required:
- [ ] Template data created (sample projects)
- [ ] Drill Writer MVP functional
- [ ] MetMap template capability
- [ ] Auto-project creation API

### Nice to Have:
- [ ] react-joyride for optional tour
- [ ] Analytics events for funnel tracking
- [ ] Welcome email with getting started content

---

## Appendix: Field Removal Analysis

### Fields Removed from Initial Flow:

| Field | Why Removed | When Collected Instead |
|-------|-------------|----------------------|
| organizationName | Not needed for creation | When inviting others |
| organizationType | Internal analytics only | Profile settings (optional) |
| location | Not needed for creation | Profile settings (optional) |
| contactPhone | Not needed for creation | Profile settings (optional) |
| website | Not needed for creation | Profile settings (optional) |
| projectDescription | Can add later | Inline in project |
| serviceCategory | Studio-focused | N/A (removed) |
| projectType | Can infer from template | Automatic |
| serviceTier | Payment-focused | N/A (client flow only) |
| ensembleType | Contextual | When creating formation |
| ensembleSize | Contextual | When creating formation |
| ageGroup | Analytics only | Profile settings (optional) |
| startDate | Project management | Project settings |
| deadline | Project management | Project settings |
| timeline | Project management | Project settings |
| budgetRange | Client flow only | N/A |
| isFlexibleBudget | Client flow only | N/A |
| specificRequirements | Client flow only | N/A |
| hasExistingDesigns | Client flow only | N/A |
| designReferences | Client flow only | N/A |
| communicationPreferences | Settings | Profile settings |
| additionalServices | Client flow only | N/A |
| paymentTiming | Client flow only | N/A |
| agreedToTerms | Legal footer link | Account settings |

**Result:** 27 fields → 2 fields (email + password, or 0 with OAuth)

---

*"The best onboarding is no onboarding. Users should be creating before they realize they've signed up."*
