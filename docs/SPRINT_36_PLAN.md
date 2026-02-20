# Sprint 36: Plugin System — Sandboxed Runtime & API Implementation

## Context

FluxStudio already has plugin infrastructure scaffolding:
- **Types** (`src/services/plugins/types.ts`) — complete manifest, permissions, contributions, API surface
- **Registry** (`src/services/plugins/PluginRegistry.ts`) — lifecycle management, events, storage, settings — but `loadPluginModule()` returns a no-op and `createPluginAPI()` returns stubs
- **Marketplace** (`src/services/plugins/PluginMarketplace.ts`) — search/discovery with simulated data
- **UI** (`src/components/plugins/PluginManager.tsx`) — install/activate/deactivate/uninstall cards, marketplace browser — but not routed or accessible

Sprint 36 activates this system: real plugin loading, sandboxed execution, working API surface, backend plugin gateway, and a route to access PluginManager.

---

## T1: Plugin Sandbox — Web Worker Runtime

Implement `loadPluginModule()` with a Web Worker sandbox so plugins run in an isolated thread and communicate via message passing.

### Files
- **Create** `src/services/plugins/PluginSandbox.ts`
  - `PluginSandbox` class wrapping a Web Worker
  - `load(code: string)` — creates a Blob URL worker from plugin JS
  - `call(method: string, args: unknown[])` — sends RPC message, returns Promise
  - `dispose()` — terminates worker, cleans up
  - Timeout enforcement (30s max per call)
  - Error boundary — catches worker errors, surfaces to registry
- **Create** `src/services/plugins/plugin-worker-runtime.ts`
  - Worker-side entry point that receives RPC messages
  - Exposes `activate(context, api)` and `deactivate()` to plugin code
  - Proxied API — all `api.*` calls post messages back to main thread
  - `importScripts()` or dynamic `import()` for loading plugin bundles

### Update
- **Modify** `src/services/plugins/PluginRegistry.ts`
  - Replace no-op `loadPluginModule()` with `PluginSandbox.load()`
  - On `deactivate()`, call `sandbox.dispose()`
  - Track sandbox instances per plugin in `activeSandboxes: Map<string, PluginSandbox>`

---

## T2: Implement FluxStudioAPI (Real API Surface)

Wire the stub `createPluginAPI()` to real application services, gated by the plugin's declared permissions.

### Files
- **Create** `src/services/plugins/PluginAPIFactory.ts`
  - `createPluginAPI(plugin: PluginInstance): FluxStudioAPI`
  - Permission-gated: each method checks `plugin.manifest.permissions` before executing
  - **commands** — global command registry (Map<string, callback>), available to command palette
  - **ui.showNotification** — wired to `toast` from `@/lib/toast`
  - **ui.registerPanel** — stores panel registration, emits event for UI layer to pick up
  - **projects** — delegates to `useProjects` patterns (fetch from `/api/projects`)
  - **events** — scoped EventEmitter per plugin, plus global bus for cross-plugin events
  - **workspace.getConfiguration / updateConfiguration** — reads/writes plugin settings via registry

### Update
- **Modify** `src/services/plugins/PluginRegistry.ts`
  - Import and use `createPluginAPI` from PluginAPIFactory instead of inline stub

---

## T3: Backend Plugin API Gateway

Backend endpoints for plugin CRUD, marketplace proxy, and plugin-contributed API routes.

### Files
- **Create** `routes/plugins.js`
  - `GET /api/plugins` — list installed plugins for current user (from DB)
  - `POST /api/plugins/install` — install plugin (validate manifest, store to DB, return instance)
  - `POST /api/plugins/:pluginId/activate` — mark active
  - `POST /api/plugins/:pluginId/deactivate` — mark inactive
  - `DELETE /api/plugins/:pluginId` — uninstall
  - `GET /api/plugins/:pluginId/settings` — get plugin settings
  - `PUT /api/plugins/:pluginId/settings` — update plugin settings
  - `GET /api/plugins/marketplace` — proxy to marketplace search (or return built-in catalog)
  - All endpoints behind `authenticateToken`

- **Create** `database/migrations/115_user_plugins.sql`
  - `user_plugins` table: id, user_id, plugin_id, manifest (JSONB), state, settings (JSONB), installed_at, updated_at
  - Index on (user_id, plugin_id) unique
  - Foreign key to users(id) ON DELETE CASCADE

- **Modify** `server-unified.js` — mount `/plugins` and `/api/plugins`

---

## T4: Wire PluginManager into App + Permission Prompt

Make plugins accessible and add a permission consent dialog on install.

### Files
- **Create** `src/components/plugins/PluginPermissionDialog.tsx`
  - Modal shown before install — lists requested permissions with icons/descriptions
  - User must explicitly approve or deny
  - Returns approved permissions list

- **Modify** `src/components/plugins/PluginManager.tsx`
  - Replace `gray-*` classes with `neutral-*` for dark mode consistency
  - Add PluginPermissionDialog before install flow
  - Add plugin settings panel (slide-out or modal) using `PluginSettingsSchema`
  - Connect to backend API (`/api/plugins/*`) instead of only localStorage

- **Modify** navigation/routing to add Plugins page:
  - Add `/plugins` route in router
  - Add "Plugins" nav item in sidebar (Package icon)

---

## Verification

1. `npx tsc --noEmit` — zero new errors
2. Navigate to `/plugins` — see PluginManager with marketplace
3. Install a sample plugin from marketplace — permission dialog appears
4. Activate plugin — sandbox loads, API calls work (verify via console logs)
5. Deactivate plugin — worker terminated, state reset
6. Plugin settings — modify and persist
7. Backend: `GET /api/plugins` returns user's installed plugins

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/plugins/PluginSandbox.ts` | Create | Web Worker sandbox for isolated plugin execution |
| `src/services/plugins/plugin-worker-runtime.ts` | Create | Worker-side runtime that receives RPC calls |
| `src/services/plugins/PluginAPIFactory.ts` | Create | Real FluxStudioAPI implementation, permission-gated |
| `src/services/plugins/PluginRegistry.ts` | Modify | Wire sandbox + real API factory |
| `routes/plugins.js` | Create | Backend plugin CRUD + marketplace proxy |
| `database/migrations/115_user_plugins.sql` | Create | User plugins table |
| `server-unified.js` | Modify | Mount plugin routes |
| `src/components/plugins/PluginPermissionDialog.tsx` | Create | Install-time permission consent UI |
| `src/components/plugins/PluginManager.tsx` | Modify | Backend integration, settings panel, design tokens |
| Router + NavigationSidebar | Modify | Add /plugins route + nav item |
