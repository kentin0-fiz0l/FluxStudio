# Sprint 22: Stability Fixes & Messaging Polish

> Status: COMPLETED | Started: 2026-02-13 | Completed: 2026-02-13

## Context

User testing of the messaging page revealed two critical app crashes preventing the UI from loading, plus several code quality and UX issues. The messaging feature itself (17 components, ~5,400 lines) renders well once crashes are fixed, with working responsive layout, theme switching, filters, search, and dialog interactions.

## Findings from User Testing

### Critical Crashes (Fixed during testing)
1. **Zustand persist shallow merge** — `persist` middleware's default shallow merge overwrote `offline` slice actions with `{ pendingActions: [] }`, causing `setNetworkStatus is not a function` crash at startup
2. **useShallow infinite loop** — `useWorkingContext()` and `useWorkspace()` selectors returned new object references every render, triggering React 18 `useSyncExternalStore` infinite loop in `MomentumCapture`

### Code Quality Issues
3. **ChatPanel.tsx at 858 lines** — Oversized component mixing header, message list, pinned panel, thread panel, and composer
4. **useMessagesPageState.ts at 648 lines** — Uses raw `fetch()` instead of `apiService`, duplicates auth token handling
5. **`:any` count at 92** across 30 files (22 in production code, 70 in tests)
6. **WebSocket reconnection spam** — Socket.IO retries every ~3s with no backend, flooding console with errors

### UX Issues
7. **Connection Error banner** — Shows raw HTTP status code ("Failed to load conversations: 500") instead of user-friendly message
8. **No dismiss on error banner** — Error banner persists with no way to dismiss except Retry
9. **Duplicate "New Message" buttons** — Both sidebar empty state AND main panel have "New Conversation" / "New Message" buttons that do the same thing
10. **Tips carousel in empty state** — Right panel shows rotating tips ("Pin important messages", "Create group chats", "@mentions") that cycle rapidly

## Tasks

### T1: Harden Zustand store selectors (already done)
- [x] Add `merge` function to persist config for deep merge
- [x] Wrap `useWorkingContext` and `useWorkspace` with `useShallow`

### T2: Improve error UX in messaging page
- [x] Replace raw status codes with user-friendly messages in connection error banner
- [x] Add dismiss button to error banner
- [x] Add auto-retry with exponential backoff (3 attempts max)
- [x] Show offline state gracefully when no backend

### T3: Refactor useMessagesPageState to use apiService
- [x] Replace all `fetch()` calls with `apiService.get()`/`apiService.post()`
- [x] Remove manual auth token handling (apiService handles it)
- [x] Add proper error typing

### T4: Decompose ChatPanel.tsx (858 → ~200 lines + 3 extractions)
- [x] Extract `ChatMessageList.tsx` — message rendering, date separators, scroll
- [x] Extract `PinnedMessagesPanel.tsx` — pinned messages overlay
- [x] Extract `ChatInputArea.tsx` — composer + attachments + typing indicator

### T5: Tame WebSocket reconnection when offline
- [x] Add connection state check before reconnection attempts
- [x] Increase backoff delay when backend is unreachable (30s max)
- [x] Suppress repetitive console errors after max retries

### T6: Fix remaining `:any` in production code
- [x] Target the 22 non-test `:any` annotations
- [x] Use proper types, `unknown` with narrowing, or typed interfaces

## Verification Results
- `npx tsc --noEmit` — 0 type errors
- `npm run build` — Success (7.05s)
- App loads without crashes on `http://localhost:5173`
- Messaging page navigable, no infinite loops
- Console: no flood of WebSocket errors after max retries
