# Technical Debt Tickets - FluxStudio

Generated: 2024-12-16
Total Tickets: 25
Codebase Health Score: 5.2/10

---

## 🔴 P0 - Critical (Fix This Week)

### DEBT-001: Remove eval() Code Injection Vulnerability
**Priority:** P0 - Critical
**Category:** Security
**Effort:** 2-4 hours
**File:** `src/services/workflowEngine.ts:480`

**Description:**
The workflow engine uses `eval()` to execute arbitrary expressions from workflow conditions, creating a critical code injection vulnerability.

**Current Code:**
```typescript
const expression = condition.replace(/(\w+)/g, (match) => {
  return variables[match] !== undefined ? variables[match] : match;
});
return eval(expression);  // CRITICAL SECURITY RISK
```

**Acceptance Criteria:**
- [ ] Replace `eval()` with safe expression parser (jexl, expr-eval, or math-expression-evaluator)
- [ ] Add input validation for workflow conditions
- [ ] Add unit tests for expression evaluation
- [ ] Security review sign-off

**Labels:** `security`, `critical`, `tech-debt`

---

### DEBT-002: Update Vulnerable Dependencies
**Priority:** P0 - Critical
**Category:** Security
**Effort:** 2-4 hours

**Description:**
Multiple npm dependencies have known security vulnerabilities.

**Affected Packages:**
| Package | Vulnerability | Severity |
|---------|--------------|----------|
| `@modelcontextprotocol/sdk` | DNS rebinding protection disabled | HIGH |
| `glob` | Command injection via `-c/--cmd` with `shell:true` | HIGH |
| `jws` | HMAC signature verification bypass | HIGH |
| `validator` | URL validation bypass in `isURL()` | HIGH |

**Acceptance Criteria:**
- [ ] Run `npm audit` and document all vulnerabilities
- [ ] Update or replace affected packages
- [ ] Test authentication flows after `jws` update
- [ ] Test file operations after `glob` update
- [ ] Verify no breaking changes in dependent code

**Labels:** `security`, `critical`, `dependencies`

---

### DEBT-003: Add Input Validation to API Service
**Priority:** P0 - Critical
**Category:** Security
**Effort:** 4-8 hours
**File:** `src/services/apiService.ts`

**Description:**
Multiple API methods accept `any` type parameters without validation, allowing potentially malicious data to reach the backend.

**Affected Methods:**
- `createOrganization(data: any)` - line 260
- `updateProject(id: string, data: any)` - line 327
- `quickPrint(filename: string, projectId: string, config: any)` - line 445
- Multiple other endpoints

**Acceptance Criteria:**
- [ ] Create Zod schemas for all API request bodies
- [ ] Add runtime validation before API calls
- [ ] Return typed errors for validation failures
- [ ] Add validation unit tests

**Labels:** `security`, `critical`, `types`

---

## 🟠 P1 - High Priority (Fix This Sprint)

### DEBT-004: Eliminate 520 `any` Type Usages
**Priority:** P1 - High
**Category:** Type Safety
**Effort:** 16-24 hours

**Description:**
There are 520 occurrences of `any` type across 163 files, eliminating TypeScript's type checking benefits.

**Top Offenders:**
| File | Count |
|------|-------|
| `src/services/slackService.ts` | 22 |
| `src/services/GoogleOAuthManager.ts` | 21 |
| `src/services/performanceMonitoringService.ts` | 13 |
| `src/services/apiService.ts` | 12 |
| `src/services/workflowEngine.ts` | 9 |

**Acceptance Criteria:**
- [ ] Enable `noImplicitAny` in tsconfig.json
- [ ] Create type definitions for all external API responses
- [ ] Replace `any` with proper types or `unknown`
- [ ] Reduce count to <50 with documented exceptions

**Labels:** `tech-debt`, `types`, `high-priority`

---

### DEBT-005: Consolidate Duplicate Real-time Collaboration Services
**Priority:** P1 - High
**Category:** Architecture
**Effort:** 8-12 hours
**Files:**
- `src/services/realtimeCollaboration.ts` (521 LOC)
- `src/services/realtimeCollaborationService.ts` (324 LOC)

**Description:**
Two services implement overlapping real-time collaboration functionality, causing maintenance burden and potential inconsistencies.

**Acceptance Criteria:**
- [ ] Audit both files for unique functionality
- [ ] Create single consolidated service
- [ ] Update all imports to use consolidated service
- [ ] Delete deprecated file
- [ ] Add integration tests

**Labels:** `tech-debt`, `architecture`, `refactor`

---

### DEBT-006: Consolidate Duplicate Performance Monitoring Services
**Priority:** P1 - High
**Category:** Architecture
**Effort:** 8-12 hours
**Files:**
- `src/services/performanceMonitoring.ts` (575 LOC)
- `src/services/performanceMonitoringService.ts` (555 LOC)

**Description:**
Two performance monitoring services with significant overlap create confusion and maintenance burden.

**Acceptance Criteria:**
- [ ] Merge unique functionality into single service
- [ ] Integrate with existing logging/Sentry setup
- [ ] Update all imports
- [ ] Delete deprecated file
- [ ] Document performance monitoring API

**Labels:** `tech-debt`, `architecture`, `refactor`

---

### DEBT-007: Establish Minimum Test Coverage (30%)
**Priority:** P1 - High
**Category:** Testing
**Effort:** 40+ hours

**Description:**
Current test coverage is only 1.7% (9 test files for 523 source files). Critical business logic is untested.

**Current State:**
- Total TS files: 523
- Test files: 9
- Coverage: ~1.7%

**Priority Test Targets:**
1. `src/services/apiService.ts`
2. `src/services/authService.ts`
3. `src/store/slices/*.ts`
4. `src/services/workflowEngine.ts`
5. `src/hooks/useOfflineSync.ts`

**Acceptance Criteria:**
- [ ] Set up Jest coverage reporting in CI
- [ ] Add unit tests for all Zustand store slices
- [ ] Add integration tests for API service
- [ ] Add E2E tests for auth flow (Playwright/Cypress)
- [ ] Achieve 30% line coverage

**Labels:** `tech-debt`, `testing`, `high-priority`

---

### DEBT-008: Consolidate Fragmented Socket Services
**Priority:** P1 - High
**Category:** Architecture
**Effort:** 12-16 hours
**Files:**
- `src/services/socketService.ts`
- `src/services/messagingSocketService.ts`
- `src/services/designBoardsSocketService.ts`
- `src/services/taskSocketService.ts`

**Description:**
Socket functionality is fragmented across 4+ services with duplicated connection logic.

**Acceptance Criteria:**
- [ ] Create unified socket manager with namespace support
- [ ] Implement connection pooling
- [ ] Add automatic reconnection logic
- [ ] Migrate all socket consumers
- [ ] Add socket connection health monitoring

**Labels:** `tech-debt`, `architecture`, `sockets`

---

## 🟡 P2 - Medium Priority (Fix This Month)

### DEBT-009: Refactor RealtimeImageAnnotation Component
**Priority:** P2 - Medium
**Category:** Code Quality
**Effort:** 8-12 hours
**File:** `src/components/*/RealtimeImageAnnotation.tsx` (1,205 LOC)

**Description:**
Component exceeds 1,200 lines with multiple responsibilities mixed together.

**Acceptance Criteria:**
- [ ] Extract annotation tools into separate components
- [ ] Extract canvas rendering logic into custom hook
- [ ] Extract collaboration sync into separate module
- [ ] Target: <300 LOC per component
- [ ] Add component tests

**Labels:** `tech-debt`, `refactor`, `components`

---

### DEBT-010: Refactor PortfolioShowcase Component
**Priority:** P2 - Medium
**Category:** Code Quality
**Effort:** 6-8 hours
**File:** `src/components/*/PortfolioShowcase.tsx` (1,171 LOC)

**Description:**
Large monolithic component handling gallery, filtering, and presentation logic.

**Acceptance Criteria:**
- [ ] Extract gallery grid into separate component
- [ ] Extract filter controls
- [ ] Extract portfolio item card
- [ ] Add lazy loading for images
- [ ] Target: <300 LOC per component

**Labels:** `tech-debt`, `refactor`, `components`

---

### DEBT-011: Refactor TaskListView Component
**Priority:** P2 - Medium
**Category:** Code Quality
**Effort:** 6-8 hours
**File:** `src/components/tasks/TaskListView.tsx` (1,064 LOC)

**Description:**
Task list component handles filtering, sorting, grouping, and rendering in single file.

**Acceptance Criteria:**
- [ ] Extract task filters into component
- [ ] Extract task grouping logic into hook
- [ ] Extract task item renderer
- [ ] Add virtualization for large lists
- [ ] Target: <300 LOC per component

**Labels:** `tech-debt`, `refactor`, `components`

---

### DEBT-012: Remove Console Statements from Production
**Priority:** P2 - Medium
**Category:** Code Quality
**Effort:** 4-6 hours

**Description:**
710 console statements scattered throughout production code affect performance and leak information.

**Distribution:**
- `console.log`: ~400
- `console.warn`: ~150
- `console.error`: ~160

**Acceptance Criteria:**
- [ ] Create centralized logging service
- [ ] Replace console.error with Sentry integration
- [ ] Replace console.warn with logging service
- [ ] Remove or replace console.log statements
- [ ] Add ESLint rule to prevent new console statements
- [ ] Configure build to strip remaining in production

**Labels:** `tech-debt`, `logging`, `cleanup`

---

### DEBT-013: Fix Array Index Key Anti-pattern
**Priority:** P2 - Medium
**Category:** Code Quality
**Effort:** 4-6 hours

**Description:**
151 instances of using array index as React key, which can cause rendering bugs.

**Examples:**
- `AIDesignFeedbackPanel.tsx:356`
- `ActivityFeed.tsx:336`
- `ConversationList.tsx:299`

**Acceptance Criteria:**
- [ ] Audit all `.map()` calls with `key={index}`
- [ ] Replace with unique identifiers (item.id, item.uuid)
- [ ] Generate IDs where none exist
- [ ] Add ESLint rule: `react/no-array-index-key`

**Labels:** `tech-debt`, `react`, `cleanup`

---

### DEBT-014: Optimize Vendor Bundle Size
**Priority:** P2 - Medium
**Category:** Performance
**Effort:** 8-12 hours

**Description:**
Vendor bundle is 1.1MB, significantly impacting initial load time.

**Current State:**
- vendor.js: 1,071 KB (337 KB gzipped)
- AdaptiveDashboard: 201 KB
- ProjectDetail: 144 KB

**Acceptance Criteria:**
- [ ] Analyze bundle with `vite-bundle-analyzer`
- [ ] Implement route-based code splitting
- [ ] Lazy load heavy components (Three.js, charts)
- [ ] Review and remove unused dependencies
- [ ] Target: <800KB vendor bundle

**Labels:** `tech-debt`, `performance`, `bundle`

---

### DEBT-015: Migrate Contexts to Zustand Store
**Priority:** P2 - Medium
**Category:** Architecture
**Effort:** 16-24 hours

**Description:**
16 React Context providers create provider pyramid despite Zustand store being available.

**Contexts to Migrate:**
- [ ] AssetsContext → assetsSlice
- [ ] FilesContext → filesSlice
- [ ] MessagingContext → messagingSlice
- [ ] NotificationContext → (use existing toast)
- [ ] WorkingContext → uiSlice
- [ ] WorkspaceContext → workspaceSlice

**Keep as Context:**
- ThemeContext (CSS variable injection)
- AuthContext (security boundary)

**Acceptance Criteria:**
- [ ] Create new Zustand slices for remaining domains
- [ ] Migrate consumers to use store hooks
- [ ] Remove deprecated contexts
- [ ] Document migration pattern

**Labels:** `tech-debt`, `architecture`, `state-management`

---

### DEBT-016: Adopt React Query for Data Fetching
**Priority:** P2 - Medium
**Category:** Architecture
**Effort:** 16-24 hours

**Description:**
React Query is installed but only used in 31 places. Manual data fetching creates cache inconsistencies.

**Benefits:**
- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Request pooling

**Priority Migrations:**
1. Project list/detail fetching
2. User profile fetching
3. Asset library queries
4. Message thread loading

**Acceptance Criteria:**
- [ ] Create query key factory
- [ ] Migrate project queries
- [ ] Migrate user/auth queries
- [ ] Configure stale times appropriately
- [ ] Add query devtools

**Labels:** `tech-debt`, `data-fetching`, `react-query`

---

### DEBT-017: Centralize localStorage Access
**Priority:** P2 - Medium
**Category:** Architecture
**Effort:** 6-8 hours

**Description:**
263 direct localStorage calls scattered throughout codebase without size limits or error handling.

**Issues:**
- No storage quota management
- No error handling for quota exceeded
- Inconsistent key naming
- No data migration support

**Acceptance Criteria:**
- [ ] Extend `offlineStorage.ts` for all storage needs
- [ ] Add storage quota monitoring
- [ ] Implement key namespacing
- [ ] Add data versioning/migration
- [ ] Replace direct localStorage calls

**Labels:** `tech-debt`, `storage`, `architecture`

---

### DEBT-018: Add Missing Memoization
**Priority:** P2 - Medium
**Category:** Performance
**Effort:** 8-12 hours

**Description:**
Only 538 useMemo/useCallback for 2,001+ useState hooks - potential re-render issues.

**Priority Components:**
- RealtimeImageAnnotation (1,205 LOC)
- PortfolioShowcase (1,171 LOC)
- WorkflowOrchestrator (1,008 LOC)
- Large list renderers

**Acceptance Criteria:**
- [ ] Profile render performance with React DevTools
- [ ] Add useMemo for expensive computations
- [ ] Add useCallback for event handlers passed to children
- [ ] Add React.memo for pure child components
- [ ] Verify improvements with profiler

**Labels:** `tech-debt`, `performance`, `react`

---

### DEBT-019: Implement Consistent Error Handling
**Priority:** P2 - Medium
**Category:** Error Handling
**Effort:** 8-12 hours

**Description:**
94 try-catch blocks with inconsistent handling - some silent, some logging, some throwing.

**Issues:**
- Silent error swallowing
- Inconsistent error propagation
- Missing error context
- No user-facing error messages

**Acceptance Criteria:**
- [ ] Create error handling utility
- [ ] Define error categories (network, validation, auth, etc.)
- [ ] Implement error boundary for React components
- [ ] Add Sentry breadcrumbs for debugging
- [ ] Create user-friendly error messages

**Labels:** `tech-debt`, `error-handling`, `ux`

---

### DEBT-020: Refactor Messaging Service
**Priority:** P2 - Medium
**Category:** Architecture
**Effort:** 12-16 hours
**File:** `src/services/messagingService.ts` (962 LOC)

**Description:**
Monolithic messaging service handling too many responsibilities.

**Current Responsibilities:**
- Message CRUD
- Thread management
- Real-time sync
- Typing indicators
- Read receipts
- Search

**Acceptance Criteria:**
- [ ] Extract MessageRepository for CRUD
- [ ] Extract ThreadManager for thread logic
- [ ] Extract RealtimeSync for socket operations
- [ ] Create MessagingFacade for public API
- [ ] Target: <300 LOC per module

**Labels:** `tech-debt`, `refactor`, `messaging`

---

## 🟢 P3 - Low Priority (Backlog)

### DEBT-021: Address Open TODO Comments
**Priority:** P3 - Low
**Category:** Maintenance
**Effort:** 4-6 hours

**Description:**
16 TODO comments indicate incomplete features or known issues.

**Examples:**
- `App.tsx:77`: "These components need wrapper components"
- `NotificationContext.tsx:67`: "Project context for project-scoped notifications"
- `pages/ProjectsNew.tsx:248`: "Implement edit functionality"

**Acceptance Criteria:**
- [ ] Audit all TODO comments
- [ ] Create tickets for valid TODOs
- [ ] Remove stale/invalid TODOs
- [ ] Add TODO-to-issue automation

**Labels:** `tech-debt`, `cleanup`, `documentation`

---

### DEBT-022: Update Outdated Dependencies
**Priority:** P3 - Low
**Category:** Dependencies
**Effort:** 4-8 hours

**Description:**
Several dependencies are outdated or using problematic versioning.

**Issues:**
| Package | Issue |
|---------|-------|
| `three` | Using `*` wildcard version |
| `aws-sdk` | Using v2 (deprecated, use @aws-sdk v3) |
| `express` | v5.1.0 very new, may have breaking changes |

**Acceptance Criteria:**
- [ ] Pin `three` to specific version
- [ ] Migrate from aws-sdk v2 to @aws-sdk v3
- [ ] Review express 5.x breaking changes
- [ ] Update package-lock.json
- [ ] Run full test suite after updates

**Labels:** `tech-debt`, `dependencies`, `maintenance`

---

### DEBT-023: Improve Accessibility Coverage
**Priority:** P3 - Low
**Category:** Accessibility
**Effort:** 8-12 hours

**Description:**
While 483 ARIA attributes exist, full accessibility audit needed.

**Areas to Review:**
- Keyboard navigation in modals
- Focus management in dialogs
- Screen reader announcements
- Color contrast ratios
- Form label associations

**Acceptance Criteria:**
- [ ] Run axe-core audit
- [ ] Fix all critical a11y violations
- [ ] Add keyboard navigation tests
- [ ] Document a11y patterns
- [ ] Add a11y CI check

**Labels:** `tech-debt`, `accessibility`, `a11y`

---

### DEBT-024: Add API Response Type Definitions
**Priority:** P3 - Low
**Category:** Type Safety
**Effort:** 8-12 hours

**Description:**
API responses use generic `ApiResponse<T = any>`, losing type safety at boundaries.

**Acceptance Criteria:**
- [ ] Define response types for all API endpoints
- [ ] Create OpenAPI/Swagger spec
- [ ] Generate types from spec
- [ ] Add runtime validation with Zod

**Labels:** `tech-debt`, `types`, `api`

---

### DEBT-025: Document Architecture Decisions
**Priority:** P3 - Low
**Category:** Documentation
**Effort:** 8-12 hours

**Description:**
Missing architecture decision records (ADRs) for key technical choices.

**Topics to Document:**
- Zustand vs Redux decision
- Offline-first architecture
- Real-time collaboration approach
- Plugin system design
- AI integration patterns

**Acceptance Criteria:**
- [ ] Create ADR template
- [ ] Document 5+ key decisions
- [ ] Add architecture diagrams
- [ ] Link from README

**Labels:** `tech-debt`, `documentation`, `architecture`

---

## Summary

| Priority | Count | Total Effort |
|----------|-------|--------------|
| P0 - Critical | 3 | 8-16 hours |
| P1 - High | 5 | 84-116 hours |
| P2 - Medium | 12 | 104-152 hours |
| P3 - Low | 5 | 32-50 hours |
| **Total** | **25** | **228-334 hours** |

---

## Quick Wins (< 4 hours each)

1. **DEBT-001**: Remove eval() - 2-4 hours
2. **DEBT-002**: Update vulnerable deps - 2-4 hours
3. **DEBT-013**: Fix array index keys - 4-6 hours
4. **DEBT-021**: Address TODOs - 4-6 hours

## High Impact Items

1. **DEBT-007**: Test coverage - prevents regressions
2. **DEBT-004**: Type safety - catches bugs at compile time
3. **DEBT-014**: Bundle size - improves user experience
4. **DEBT-015**: Context migration - simplifies state management
