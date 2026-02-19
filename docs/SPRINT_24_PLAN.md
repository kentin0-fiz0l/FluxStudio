# Sprint 24: Zustand Migration — Complete Context Elimination

> Status: COMPLETE | Completed: 2026-02-19

## Current State (Post Sprint 23)

| Metric | Value | Target |
|--------|-------|--------|
| Provider nesting depth | 4 levels | 1 level (QueryClientProvider only) |
| Zustand slices | 13 | 17 (+4 new) |
| Active Context providers | 5 (+ 2 keep-as-is) | 0 active reducers |
| Context files with useReducer | 4 | 0 |
| Components importing old hooks | ~30 files | 0 |
| feature-dashboard chunk | Eliminated (S23) | Maintained |

### Migration Status

| Context | Lines | Consumers | Zustand Slice | Status |
|---------|-------|-----------|---------------|--------|
| AuthContext | 50 | 220 | `authSlice` | Wrapper only (done) |
| NotificationContext | 108 | 32 | `notificationSlice` | Wrapper only (done) |
| OrganizationContext | 34 | 29 | `orgSlice` | Wrapper only (done) |
| ThemeContext | 80 | 18 | `uiSlice` | Wrapper only (done) |
| SessionContext | 35 | — | — | Empty wrapper (done) |
| SocketContext | 379 | 7 | — | **Keep** (WebSocket singleton) |
| MetMapContext | 867 | low | — | **Keep** (lazy-loaded, tool-specific) |
| **MessagingContext** | **480→139** | **40** | `messagingSlice` | **DONE** (socket bridge + deprecated wrappers) |
| **ProjectContext** | **391→113** | **23** | `projectSlice` | **DONE** (deprecated wrappers) |
| **WorkspaceContext** | **479→128** | **15** | `uiSlice` | **DONE** (deprecated wrappers) |
| **FilesContext** | **609→174** | **13** | `assetSlice` | **DONE** (deprecated wrappers) |

---

## Strategy

**Wrapper-then-delete pattern** (proven in sprints 20-22):

1. Expand the Zustand slice to hold all state + actions from the Context
2. Rewrite the Context provider to be a thin wrapper that bridges side effects (socket listeners, URL sync) to the Zustand store — no more `useReducer`
3. Update the `useXxx()` hook to read from Zustand instead of Context
4. Verify all consumers still work
5. Once stable, remove the wrapper provider entirely and have components import directly from the store

This approach lets us migrate incrementally — no big-bang rewrite, always working software.

---

## Tasks

### T1: Migrate MessagingContext → messagingSlice (Priority: Highest)

**Why first:** 40 consumers, largest reducer (252 lines), biggest re-render source. The `messagingSlice` already exists with basic state shape — it needs expansion.

**Current gap between MessagingContext and messagingSlice:**

| Feature | MessagingContext | messagingSlice |
|---------|-----------------|----------------|
| Conversations CRUD | Yes | Yes |
| Messages CRUD | Yes | Yes |
| Typing indicators | Yes (per-conversation map) | Yes (flat array) |
| User presence | Yes (userId → presence map) | No |
| Notifications | Yes (in messaging) | No (separate notificationSlice) |
| Unread counts | Yes (computed) | Partial |
| Connection status | Yes | No |
| Loading states | Yes (keyed map) | Yes (single boolean) |
| Socket event listeners | Yes (in useEffect) | No |
| messagingService integration | Yes | No (raw fetch) |

**Steps:**

1. **Expand `messagingSlice.ts`:**
   - Add `userPresence: Record<string, UserPresence>` state
   - Add `connectionStatus: boolean` state
   - Add `loadingStates: Record<string, boolean>` (replace single `isLoading`)
   - Add `unreadCounts: { messages: number; notifications: number }` computed state
   - Add actions: `setUserPresence`, `updateUserPresence`, `setConnectionStatus`, `setLoadingState`
   - Add `updateConversation(id, updates)` action
   - Switch `fetchConversations`/`fetchMessages`/`sendMessage` to use `messagingService` instead of raw fetch
   - Add `createConversation`, `loadNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` actions

2. **Rewrite `MessagingContext.tsx` as socket bridge:**
   - Remove `useReducer` and all reducer logic
   - Keep only the `useEffect` that sets up socket listeners (`onMessageReceived`, `onTypingStarted`, etc.)
   - Socket handlers call `useStore.getState().messaging.addMessage(...)` etc.
   - Export `MessagingSocketBridge` component (no children wrapper needed, just a side-effect component)
   - Mount in `RootProviders.tsx` alongside `RealtimeNotifications`

3. **Update `useMessaging` hook:**
   - File: `src/hooks/useMessaging.ts`
   - Return Zustand store state + actions instead of Context
   - Maintain same return shape for backwards compatibility
   - Keep `useMessagingOptional` as a non-throwing variant

4. **Update consumers (est. 30 files):**
   - Most will work automatically if hook return shape is preserved
   - Check: components that destructure `{ state, dispatch, actions }` pattern need updating to flat shape

**Files to modify:**
- `src/store/slices/messagingSlice.ts` — expand state + actions
- `src/contexts/MessagingContext.tsx` — rewrite as socket bridge
- `src/hooks/useMessaging.ts` — point at Zustand
- `src/components/providers/RootProviders.tsx` — replace `MessagingProvider` wrapper with bridge component
- ~30 consumer files — update destructuring if needed

**Verification:**
- Messages page loads conversations and messages
- Real-time message delivery works (send + receive)
- Typing indicators appear and clear
- Unread counts update correctly
- No `useReducer` in MessagingContext

---

### T2: Migrate ProjectContext → projectSlice (Priority: High)

**Why second:** 23 consumers, manages URL sync which is tricky. The `projectSlice` already has basic project state.

**Current gap:**

| Feature | ProjectContext | projectSlice |
|---------|---------------|-------------|
| Current project | Yes (full object) | Yes (ID only) |
| Projects list | Yes (fetched) | Yes (array) |
| URL sync (searchParams) | Yes | No |
| localStorage persistence | Yes | Yes (via store persist) |
| Loading/error/ready states | Yes | No |
| switchProject with URL update | Yes | No |
| clearProject | Yes | No |
| Custom events (project:changed) | Yes | No |

**Steps:**

1. **Expand `projectSlice.ts`:**
   - Add full `ProjectSummary` type (currently just ID)
   - Add `currentProject: ProjectSummary | null` (full object, not just ID)
   - Add `isLoading`, `error`, `isReady` states
   - Add `fetchProjects`, `switchProject`, `clearProject`, `getProject` actions
   - Add localStorage sync in `switchProject`/`clearProject`

2. **Create URL sync hook:**
   - New file: `src/hooks/useProjectURLSync.ts`
   - Subscribes to `projectSlice.currentProject` changes via `useStore.subscribe`
   - Updates `searchParams` when project changes on scoped paths
   - Reads URL on mount to initialize project (replaces the Context's useEffect logic)
   - Mount this hook in `DashboardLayout` or `App.tsx`

3. **Rewrite `ProjectContext.tsx` as re-export wrapper:**
   - `useProjectContext()` returns Zustand state
   - `useCurrentProjectId()` returns `useStore(s => s.projects.activeProjectId)`
   - Keep same API surface

4. **Update consumers (est. 23 files):**
   - Most use `useProjectContext()` — hook shape stays the same
   - `ProjectSwitcher.tsx` — verify switchProject works with URL sync

**Files to modify:**
- `src/store/slices/projectSlice.ts` — expand with full project state
- `src/hooks/useProjectURLSync.ts` — new file for URL ↔ store sync
- `src/contexts/ProjectContext.tsx` — thin wrapper over Zustand
- `src/components/providers/RootProviders.tsx` — remove ProjectProvider if present
- ~23 consumer files — verify compatibility

**Verification:**
- `/messages?projectId=xxx` loads correct project
- Project switcher updates URL and store
- localStorage persists across reloads
- `project:changed` custom event still fires

---

### T3: Migrate WorkspaceContext → uiSlice (Priority: Medium)

**Why third:** 15 consumers, complex Maps state but mostly UI state that overlaps with existing `uiSlice`.

**Current gap:**

| Feature | WorkspaceContext | uiSlice |
|---------|-----------------|---------|
| currentContext / currentMode | Yes | No |
| Active entities (org/team/project/conv) | Yes (synced from other contexts) | Partial |
| Project-conversation linking (Maps) | Yes | No |
| Recent activity | Yes (array, max 50) | No (timelineSlice has this) |
| Contextual suggestions | Yes | No |
| Sidebar collapsed | Yes | Yes |
| Command palette open | Yes | Yes |
| Current workflow | Yes | No |
| Breadcrumbs (computed) | Yes | No |
| Loading states (Map) | Yes | No |

**Steps:**

1. **Expand `uiSlice.ts`:**
   - Add `workspace` sub-object: `{ currentContext, currentMode, commandPaletteOpen, currentWorkflow }`
   - Add `projectConversationLinks: Record<string, string[]>` (projectId → conversationIds)
   - Add `conversationProjectLinks: Record<string, string>` (conversationId → projectId)
   - Add contextual suggestions state
   - Add actions: `setWorkspaceContext`, `linkProjectConversation`, `addSuggestion`, `startWorkflow`, `completeWorkflow`
   - Breadcrumbs become a selector, not stored state

2. **Remove WorkspaceContext.tsx entirely:**
   - It syncs org/team/project from other contexts — redundant once those are in Zustand
   - Activity tracking → already in `timelineSlice`
   - Sidebar/command palette → already in `uiSlice`
   - Move breadcrumb logic to a `useBreadcrumbs()` hook that reads from store

3. **Create `useBreadcrumbs.ts` hook:**
   - Reads `activeProject`, `activeOrganization`, `activeTeam` from respective slices
   - Returns computed breadcrumb array
   - Replaces `actions.getCurrentBreadcrumbs()`

4. **Update consumers (est. 15 files):**
   - Replace `useWorkspace()` with direct store selectors
   - `state.sidebarCollapsed` → `useStore(s => s.ui.sidebarCollapsed)`
   - `actions.toggleSidebar()` → `useStore(s => s.ui.toggleSidebar)()`

**Files to modify:**
- `src/store/slices/uiSlice.ts` — expand workspace state
- `src/contexts/WorkspaceContext.tsx` — delete (or keep as re-export shim)
- `src/hooks/useBreadcrumbs.ts` — new computed hook
- ~15 consumer files

**Verification:**
- Sidebar toggle works
- Command palette opens/closes
- Breadcrumbs render correctly on all pages
- No WorkspaceContext import remains

---

### T4: Migrate FilesContext → filesSlice (Priority: Medium)

**Why fourth:** 13 consumers, 609 lines, handles XHR uploads with progress tracking.

**Steps:**

1. **Create `src/store/slices/filesSlice.ts`:**
   - Port full `FilesState` type (files, filters, pagination, selectedFile, uploadProgress, stats)
   - Port all actions: refreshFiles, uploadFiles, renameFile, deleteFile, linkFileToProject, etc.
   - Use immer for immutable updates (simpler than spread-based reducer)
   - Keep XHR upload logic for progress tracking

2. **Rewrite `FilesContext.tsx` as thin wrapper:**
   - `useFiles()` returns Zustand state + actions
   - Remove `useReducer` and all reducer logic
   - Keep `useEffect` for auto-fetch on filter/page change (or move to a `useFilesAutoFetch` hook)

3. **Update consumers (est. 13 files):**
   - Most use `useFiles()` — maintain same API shape

**Files to modify:**
- `src/store/slices/filesSlice.ts` — new slice
- `src/store/store.ts` — register filesSlice
- `src/contexts/FilesContext.tsx` — thin wrapper or delete
- ~13 consumer files

**Verification:**
- File listing with filters works
- Upload with progress tracking works
- Rename, delete, link/unlink work
- Pagination works

---

### T5: Cleanup — Remove dead context code

After T1-T4, clean up:

1. **Delete empty/wrapper context files** that are no longer needed:
   - `src/contexts/WorkspaceContext.tsx` (if fully replaced)
   - `src/contexts/ActiveProjectContext.tsx` (already dead)
   - `src/contexts/WorkingContext.tsx` (already dead)

2. **Simplify RootProviders.tsx:**
   - Remove any remaining wrapper providers
   - Should be: `AuthProvider` → `SocketProvider` → `NotificationProvider` → children
   - Socket bridge components mounted as siblings, not wrappers

3. **Update store exports:**
   - `src/store/index.ts` — export convenience hooks for all slices
   - Ensure all `useXxx()` hooks point at Zustand

4. **Verify no Context imports remain:**
   - `grep -r "useReducer" src/contexts/` should return 0 results
   - `grep -r "createContext" src/contexts/` should only return Socket, MetMap, and test files

**Verification:**
- `npm run build` — no errors
- `npx tsc --noEmit` — no new type errors
- `npm run test` — all tests pass
- Provider nesting: `AuthProvider > SocketProvider > NotificationProvider > children` (3 levels, all side-effect-only)

---

### T6: Add convenience selectors and devtools

Polish the Zustand store for developer experience:

1. **Add granular selectors to `src/store/store.ts`:**
   ```typescript
   export const useActiveProject = () => useStore(s => s.projects.currentProject);
   export const useConversations = () => useStore(s => s.messaging.conversations);
   export const useUnreadCount = () => useStore(s => s.messaging.unreadCounts);
   export const useFilesList = () => useStore(s => s.files.files);
   ```

2. **Add computed selectors (derived state):**
   ```typescript
   export const useActiveConversationMessages = () => {
     const id = useStore(s => s.messaging.activeConversationId);
     return useStore(s => id ? s.messaging.messages[id] ?? [] : []);
   };
   ```

3. **Verify Zustand devtools:**
   - All 17 slices visible in Redux DevTools
   - Actions are properly named
   - Time-travel debugging works

---

## Execution Strategy

**Sequential, not parallel** — each migration touches shared provider hierarchy.

| Day | Task | Risk |
|-----|------|------|
| 1 | T1: MessagingContext migration | High (socket events, 40 consumers) |
| 2 | T2: ProjectContext migration | Medium (URL sync complexity) |
| 3 | T3: WorkspaceContext migration | Low (mostly redundant state) |
| 3 | T4: FilesContext migration | Low (self-contained, 13 consumers) |
| 4 | T5: Cleanup dead code | Low |
| 4 | T6: Selectors and devtools | Low |

## Verification Checklist

- [ ] `npm run build` — no errors, no new chunks > 500 KB
- [ ] `npx tsc --noEmit` — 0 new type errors
- [ ] `npm run test` — all tests pass
- [ ] `grep -r "useReducer" src/contexts/` — 0 results (excluding tests)
- [ ] Provider nesting depth: ≤ 3 (Auth → Socket → Notification)
- [ ] All 17 Zustand slices visible in devtools
- [ ] Messages: send, receive, typing indicators, presence all work
- [ ] Projects: URL sync, switcher, persistence all work
- [ ] Files: list, upload, filter, paginate all work
- [ ] Sidebar, command palette, breadcrumbs all work
- [ ] Dark mode and mobile responsive unaffected

## Risk Mitigation

1. **Socket event race conditions:** MessagingContext socket listeners use `dispatch` synchronously. Zustand's `setState` is also synchronous, so this should be a clean swap. Test thoroughly with rapid message sends.

2. **URL sync timing:** ProjectContext reads `searchParams` on mount. The Zustand version needs to initialize before the first render that reads project state. Use `subscribeWithSelector` to ensure URL sync happens before component mounts.

3. **Stale closures:** Context actions captured in `useMemo(() => ..., [])` always have fresh state via `dispatch`. Zustand actions get fresh state via `get()` — ensure all async actions use `get()` not closed-over state.

4. **Test breakage:** Context tests mount `<XxxProvider>`. After migration, these tests need updating to either use the Zustand store directly or mock it. Budget time for test updates.
