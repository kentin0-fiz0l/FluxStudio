# Sprint 25: Offline-First Foundation

> Status: COMPLETE | Target: Phase 1.2 of Roadmap

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| `offlineSlice` (Zustand) | Exists | Pending queue, sync loop, conflict tracking — but no TQ integration, no optimistic updates |
| `offlineBridge.ts` | Exists | Bridges online/offline events to Zustand, hydrates pending actions from IDB |
| `useNetworkStatus` hook | Exists | Robust: effectiveType, downlink, rtt, saveData |
| Service Worker (`public/sw.js`) | Exists | Workbox v4, static caching, Background Sync stubs — skips all caching in dev |
| `services/offlineStorage.ts` | Exists | IndexedDB v2, 7 stores (pendingActions, cachedData, conflicts, userData, projects, conversations, messages) |
| `utils/offlineStorage.ts` | **Conflict** | IndexedDB v1, same DB name `fluxstudio-offline`, different schema (songs, sections) — will cause version conflicts |
| TanStack Query offline | **Missing** | `refetchOnReconnect: false`, no `networkMode`, no `persistQueryClient` |
| Optimistic updates | **Partial** | Only `useTasks.ts` has optimistic create/update/delete with rollback |
| Dexie.js | **Not installed** | Roadmap specifies Dexie but it's not a dependency yet |
| `@tanstack/react-query-persist-client` | **Not installed** | Needed for TQ cache persistence to IndexedDB |

### Key Gaps

1. **Two competing IndexedDB implementations** with the same DB name but different versions — opening either one will block the other
2. **TanStack Query ignores offline state** — queries fail silently when offline, mutations throw, no cache persistence across sessions
3. **No reusable optimistic update pattern** — useTasks copy-pastes 50+ lines per mutation; other hooks (useProjects, useFiles) have no optimistic updates
4. **Service Worker does nothing in dev** — makes offline testing impossible during development
5. **offlineSlice sync is raw fetch** — doesn't use the centralized `ApiService`, lacks CSRF tokens and proper error handling

---

## Strategy

**Bottom-up, infrastructure first** — build the storage + query layers before wiring them into UI.

1. Consolidate IndexedDB behind Dexie (single source of truth)
2. Enable TanStack Query offline mode + cache persistence
3. Create reusable mutation utilities with optimistic update + offline queue
4. Wire it all together: failed mutations → offlineSlice queue → sync on reconnect
5. Add offline UI indicators

---

## Tasks

### T1: Install Dexie and Consolidate IndexedDB (Priority: Highest)

**Why first:** Two conflicting IndexedDB implementations with the same DB name will cause version conflicts. Everything else depends on a single, reliable storage layer.

**Steps:**

1. **Install Dexie:**
   ```bash
   npm install dexie
   ```

2. **Create `src/services/db.ts` — single Dexie database:**
   ```typescript
   import Dexie, { Table } from 'dexie';

   export interface CachedResponse {
     key: string;        // queryKey serialized
     data: unknown;
     timestamp: number;
     expiresAt?: number;
     etag?: string;
   }

   export interface PendingMutation {
     id: string;
     type: string;
     endpoint: string;
     method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
     payload: unknown;
     timestamp: number;
     retryCount: number;
     maxRetries: number;
     queryKeysToInvalidate?: string[][];
   }

   export interface OfflineConflict {
     id: string;
     entityType: string;
     entityId: string;
     localData: unknown;
     serverData: unknown;
     timestamp: number;
     resolved: boolean;
   }

   export class FluxDB extends Dexie {
     cache!: Table<CachedResponse, string>;
     pendingMutations!: Table<PendingMutation, string>;
     conflicts!: Table<OfflineConflict, string>;
     projects!: Table<{ id: string; data: unknown; updatedAt: number }, string>;
     conversations!: Table<{ id: string; data: unknown; updatedAt: number }, string>;
     messages!: Table<{ id: string; conversationId: string; data: unknown; updatedAt: number }, string>;

     constructor() {
       super('fluxstudio-db');  // NEW name — avoids version conflict
       this.version(1).stores({
         cache: 'key, timestamp, expiresAt',
         pendingMutations: 'id, timestamp, type',
         conflicts: 'id, entityType, entityId, timestamp',
         projects: 'id, updatedAt',
         conversations: 'id, updatedAt',
         messages: 'id, conversationId, updatedAt',
       });
     }
   }

   export const db = new FluxDB();
   ```

3. **Migrate `offlineBridge.ts` to use Dexie:**
   - Replace `offlineStorage.pendingActions.getAll()` with `db.pendingMutations.toArray()`
   - Replace `offlineStorage.pendingActions.add()` with `db.pendingMutations.add()`
   - Replace `offlineStorage.pendingActions.clear()` with `db.pendingMutations.clear()`

4. **Delete `src/utils/offlineStorage.ts`** (v1 with songs/sections — legacy, no consumers)

5. **Deprecate `src/services/offlineStorage.ts`** — keep temporarily for reference but stop importing it

**Files to modify:**
- `package.json` — add `dexie`
- `src/services/db.ts` — new file
- `src/services/offlineBridge.ts` — switch to Dexie
- `src/utils/offlineStorage.ts` — delete
- `src/services/offlineStorage.ts` — deprecate (add @deprecated JSDoc, stop using)

**Verification:**
- `npm run build` — no errors
- App starts without IndexedDB version conflicts in console
- Pending action queue still persists across page reloads

---

### T2: Enable TanStack Query Offline Mode (Priority: Highest)

**Why second:** TanStack Query is the primary data-fetching layer. Making it offline-aware is the single highest-leverage change.

**Current config gaps in `src/lib/queryClient.ts`:**
- `refetchOnReconnect: false` — should be `'always'` so stale data refreshes when network returns
- No `networkMode` — should be `'offlineFirst'` so queries return cached data when offline
- No cache persistence — TQ cache is in-memory only, lost on reload

**Steps:**

1. **Install TQ persist client:**
   ```bash
   npm install @tanstack/react-query-persist-client
   ```

2. **Create `src/lib/queryPersister.ts` — Dexie-backed persister:**
   ```typescript
   import { createAsyncStoragePersister } from '@tanstack/react-query-persist-client';
   import { db } from '../services/db';

   export const queryPersister = createAsyncStoragePersister({
     storage: {
       getItem: async (key) => {
         const row = await db.cache.get(key);
         return row ? JSON.stringify(row.data) : null;
       },
       setItem: async (key, value) => {
         await db.cache.put({
           key,
           data: JSON.parse(value),
           timestamp: Date.now(),
         });
       },
       removeItem: async (key) => {
         await db.cache.delete(key);
       },
     },
     key: 'fluxstudio-query-cache',
   });
   ```

3. **Update `src/lib/queryClient.ts`:**
   ```diff
   queries: {
     staleTime: 1000 * 60 * 5,
     gcTime: 1000 * 60 * 30,
     refetchOnWindowFocus: true,
     refetchOnMount: false,
   - refetchOnReconnect: false,
   + refetchOnReconnect: 'always',
   + networkMode: 'offlineFirst',
     retry: 1,
     retryDelay: ...
   },
   mutations: {
   + networkMode: 'offlineFirst',
     retry: 1,
     retryDelay: ...
   },
   ```

4. **Wrap `QueryClientProvider` with `PersistQueryClientProvider`:**
   - File: `src/App.tsx` or wherever `QueryClientProvider` is mounted
   - Replace `<QueryClientProvider client={queryClient}>` with:
   ```tsx
   <PersistQueryClientProvider
     client={queryClient}
     persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}
   >
   ```

**Files to modify:**
- `package.json` — add `@tanstack/react-query-persist-client`
- `src/lib/queryPersister.ts` — new file
- `src/lib/queryClient.ts` — enable offline mode
- `src/App.tsx` (or provider file) — wrap with PersistQueryClientProvider

**Verification:**
- Queries return cached data when offline (no loading spinner, no error)
- Queries refetch automatically when network returns
- TQ cache survives page reload (check IndexedDB in DevTools)
- Stale data shows with background refetch indicator

---

### T3: Create Reusable Optimistic Mutation Utility (Priority: High)

**Why third:** useTasks has 50+ lines of optimistic update boilerplate per mutation. Every hook that needs offline mutations will need the same pattern. Extract once, reuse everywhere.

**Steps:**

1. **Create `src/lib/optimisticMutation.ts`:**

   Factory function that generates TanStack Query mutation config with:
   - Optimistic cache update (list + detail)
   - Automatic rollback on error
   - Toast notifications
   - Offline queue integration (when mutation fails due to network, queue to offlineSlice)

   ```typescript
   interface OptimisticMutationConfig<TData, TInput> {
     endpoint: (input: TInput) => string;
     method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
     listQueryKey: readonly unknown[];
     detailQueryKey?: (input: TInput) => readonly unknown[];
     optimisticUpdate: (current: TData[], input: TInput) => TData[];
     optimisticDetailUpdate?: (current: TData | undefined, input: TInput) => TData;
     successMessage?: (data: TData, input: TInput) => string;
     errorMessage?: string;
     invalidateKeys?: readonly unknown[][];
   }
   ```

2. **Create `src/lib/offlineMutationHandler.ts`:**

   Middleware that wraps mutation `onError`:
   - If error is a network error (fetch failed, no response), queue to `offlineSlice.queueAction()`
   - Keep optimistic update in place (don't rollback for network errors)
   - Show "Saved offline — will sync when back online" toast
   - When `offlineSlice.sync()` succeeds, invalidate the relevant query keys

3. **Refactor `useTasks.ts` to use the utility:**
   - `useCreateTaskMutation` → `createOptimisticMutation({ ... })`
   - `useUpdateTaskMutation` → `createOptimisticMutation({ ... })`
   - `useDeleteTaskMutation` → `createOptimisticMutation({ ... })`
   - Should reduce each mutation from ~50 lines to ~15 lines

**Files to modify:**
- `src/lib/optimisticMutation.ts` — new file
- `src/lib/offlineMutationHandler.ts` — new file
- `src/hooks/useTasks.ts` — refactor to use utility

**Verification:**
- useTasks still works identically (create, update, delete with optimistic UI)
- When offline: mutation queues, optimistic update stays, toast shows "saved offline"
- When back online: queued mutations sync, queries invalidate, data refreshes

---

### T4: Add Optimistic Mutations to Core Hooks (Priority: High)

**Why fourth:** With the utility from T3, adding offline support to other hooks is mechanical.

**Hooks to upgrade (in priority order):**

| Hook | File | Mutations | Impact |
|------|------|-----------|--------|
| `useProjects` | `src/hooks/useProjects.ts` | create, update, delete | High (most used) |
| `useFiles` | `src/hooks/useFiles.ts` | upload, rename, delete | Medium |
| `useMessages` | `src/hooks/useMessages.ts` or messaging slice | send, edit, delete | High (real-time) |
| `useMilestones` | `src/hooks/useMilestones.ts` | create, update, delete | Medium |

**Steps per hook:**

1. Import `createOptimisticMutation` from `src/lib/optimisticMutation.ts`
2. Replace raw `useMutation` calls with the factory
3. Add list + detail query key config
4. Define optimistic update function
5. Verify existing tests still pass

**Special case — messaging:**
- Messages are already in Zustand (messagingSlice) not TQ
- For offline: when `sendMessage` fails due to network, queue to offlineSlice
- Show message with "pending" indicator in UI
- Sync when back online, update message status

**Files to modify:**
- `src/hooks/useProjects.ts`
- `src/hooks/useFiles.ts`
- Messaging-related hooks or `src/store/slices/messagingSlice.ts`
- `src/hooks/useMilestones.ts` (if exists)

**Verification:**
- Create/update/delete project works optimistically
- File rename/delete works optimistically
- Send message queues when offline, syncs when online
- All rollbacks work when server returns an error

---

### T5: Upgrade offlineSlice Sync to Use ApiService (Priority: Medium)

**Why fifth:** The current `sync()` method uses raw `fetch` — it bypasses CSRF tokens, retry logic, and error standardization from the centralized `ApiService`.

**Steps:**

1. **Update `offlineSlice.sync()` to use `ApiService`:**
   - Import `apiService` from `src/services/api/base.ts`
   - Replace raw `fetch` with `apiService.request()`
   - Benefit: automatic CSRF, auth headers, timeout, retry, error normalization

2. **Add query invalidation after sync:**
   - Each `PendingAction` should store `queryKeysToInvalidate: string[][]`
   - After successful sync of an action, call `queryClient.invalidateQueries()` for each key
   - This ensures TQ cache refreshes with server-confirmed data

3. **Add exponential backoff to sync loop:**
   - Current: retries immediately on failure
   - New: 1s → 2s → 4s → 8s → 16s backoff between retries
   - Use `Math.min(1000 * 2 ** retryCount, 30000)` (matches TQ config)

4. **Persist sync status to Zustand persist:**
   - Add `offline.lastSyncedAt` and `offline.pendingActions.length` to persisted state
   - Shows correct pending count on app reload

**Files to modify:**
- `src/store/slices/offlineSlice.ts` — upgrade sync, add backoff, add invalidation
- `src/store/store.ts` — add offline to `partialize` for persistence

**Verification:**
- Queued actions sync using ApiService (check network tab for CSRF header)
- Exponential backoff visible in console during retries
- After sync, relevant TQ queries refresh automatically
- Pending count persists across page reloads

---

### T6: Offline UI Indicators (Priority: Medium)

**Why sixth:** Users need to know when they're offline and what's pending.

**Steps:**

1. **Create `src/components/OfflineIndicator.tsx`:**
   - Reads `useSyncStatus()` from offlineSlice
   - When offline: shows a slim banner at top of app — "You're offline. Changes will sync when you're back online."
   - When syncing: shows "Syncing N changes..." with progress
   - When sync error: shows "Some changes failed to sync" with retry button
   - Auto-dismisses 3 seconds after returning to synced state
   - Mount in `DashboardLayout` or `App.tsx`

2. **Add pending indicator to mutation results:**
   - When a mutation is queued offline, add a subtle "pending sync" icon next to the optimistically-rendered item
   - Pattern: check if item ID starts with `temp-` or if item exists in offlineSlice.pendingActions

3. **Add network quality indicator to header:**
   - File: `src/components/EnhancedHeader.tsx`
   - Show wifi icon with quality state (full/slow/offline)
   - Use `useNetworkStatus()` hook
   - Only show when not "online" (don't clutter UI when everything is fine)

**Files to modify:**
- `src/components/OfflineIndicator.tsx` — new file
- `src/components/layouts/DashboardLayout.tsx` — mount indicator
- `src/components/EnhancedHeader.tsx` — network quality icon

**Verification:**
- Toggle airplane mode → banner appears
- Create/edit items while offline → "pending" indicators show
- Come back online → banner shows "syncing", then auto-dismisses
- Slow network → subtle indicator in header

---

### T7: Service Worker Dev Mode + API Caching (Priority: Low)

**Why last:** Service Worker is already functional in production. This task improves the dev experience and adds smarter API caching.

**Steps:**

1. **Enable SW caching in development (with bypass flag):**
   - Currently `sw.js` skips all caching when `hostname === 'localhost'`
   - Add a `localStorage.getItem('sw-dev-cache')` check
   - When set: enable caching even in dev (for offline testing)
   - When not set: keep current behavior (no caching in dev)

2. **Add stale-while-revalidate for API responses:**
   - `GET /api/projects` — cache for 5 minutes, serve stale while revalidating
   - `GET /api/projects/:id` — cache for 5 minutes
   - `GET /api/organizations` — cache for 10 minutes (changes rarely)
   - Do NOT cache: `POST/PUT/DELETE`, auth endpoints, file uploads

3. **Add offline fallback page:**
   - Verify `public/offline.html` exists and is styled
   - SW serves this when both network and cache miss
   - Should show: "You're offline. Your recent data is still available." with a retry button

**Files to modify:**
- `public/sw.js` — dev mode toggle, API caching rules
- `public/offline.html` — verify/create styled fallback

**Verification:**
- `localStorage.setItem('sw-dev-cache', 'true')` in dev console → SW starts caching
- API responses served from SW cache when offline
- `offline.html` renders when navigating to uncached route while offline

---

## Execution Strategy

**Sequential with parallel where possible:**

| Day | Task | Risk | Dependencies |
|-----|------|------|--------------|
| 1 | T1: Dexie + consolidate IndexedDB | Medium (DB migration) | None |
| 1 | T2: TanStack Query offline mode | Low (config changes) | T1 (persister needs Dexie) |
| 2 | T3: Optimistic mutation utility | Medium (abstraction design) | T1, T2 |
| 3 | T4: Add optimistic mutations to core hooks | Low (mechanical) | T3 |
| 3 | T5: Upgrade offlineSlice sync | Low | T1 |
| 4 | T6: Offline UI indicators | Low | T1, T2 |
| 4 | T7: Service Worker dev mode | Low | None |

---

## Verification Checklist

- [ ] `npm run build` — no errors
- [ ] `npx tsc --noEmit` — 0 new type errors
- [ ] `npm run test` — all tests pass
- [ ] No IndexedDB version conflict warnings in console
- [ ] Two Dexie tables visible in DevTools: `fluxstudio-db`
- [ ] Old `fluxstudio-offline` DB can be safely deleted (no consumers)
- [ ] Toggle airplane mode → app still renders with cached data
- [ ] Create a task while offline → optimistic update shows immediately
- [ ] Come back online → task syncs to server, TQ cache refreshes
- [ ] Page reload while offline → TQ cache hydrates from IndexedDB
- [ ] Pending sync count shows in UI
- [ ] Network quality indicator works in header (slow/offline only)
- [ ] `useTasks` optimistic mutations still work identically
- [ ] Message send queues when offline, syncs on reconnect

---

## Risk Mitigation

1. **IndexedDB version conflict during migration:** Using a new DB name (`fluxstudio-db`) instead of migrating the old one. The old `fluxstudio-offline` DB will be orphaned but harmless. Can add a one-time cleanup script later.

2. **TQ persist hydration race:** `PersistQueryClientProvider` may hydrate stale data before fresh fetches complete. Use `onSuccess` option to mark hydration complete, and show a brief loading state during hydration.

3. **Optimistic update conflicts with real-time:** If a Socket.IO event delivers a server update while an optimistic update is pending, the socket update could overwrite the optimistic state. Solution: check if a pending mutation exists for the same entity before applying socket updates.

4. **Large IDB storage:** Unlike localStorage (5MB limit), IndexedDB has generous limits (50MB+ per origin). However, cache the TQ persist with a `maxAge` of 24 hours and implement periodic cleanup via `db.cache.where('timestamp').below(cutoff).delete()`.

5. **Service Worker update propagation:** Workbox's `skipWaiting()` + `clientsClaim()` is already in place. Verify that SW updates don't invalidate the Dexie cache (they shouldn't — IDB is independent of SW cache).

---

## Dependencies to Install

```bash
npm install dexie @tanstack/react-query-persist-client
```

## Architecture After Sprint 25

```
Browser
├── Service Worker (Workbox)
│   ├── Static asset cache (HTML, JS, CSS, images)
│   ├── API response cache (stale-while-revalidate)
│   └── Offline fallback page
│
├── IndexedDB (Dexie — fluxstudio-db)
│   ├── cache table (TanStack Query persist)
│   ├── pendingMutations table (offline queue)
│   ├── conflicts table
│   ├── projects table (entity cache)
│   ├── conversations table (entity cache)
│   └── messages table (entity cache)
│
├── TanStack Query
│   ├── networkMode: 'offlineFirst'
│   ├── refetchOnReconnect: 'always'
│   ├── PersistQueryClientProvider → Dexie cache table
│   └── Optimistic mutations with offline queue fallback
│
├── Zustand Store
│   ├── offlineSlice (sync queue, network status, conflicts)
│   ├── offlineBridge → Dexie pendingMutations table
│   └── Other slices (auth, projects, messaging, etc.)
│
└── UI
    ├── OfflineIndicator banner
    ├── Pending sync badges
    └── Network quality icon in header
```
