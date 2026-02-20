# Sprint 37: Smart Templates — AI-Powered Project Scaffolding

**Phase:** 4.2 Smart Templates (final roadmap item)
**Goal:** Connect existing template infrastructure to real AI generation and wire it into the project creation flow.

## Current State

FluxStudio already has significant template scaffolding:

| Component | Status | Gap |
|-----------|--------|-----|
| `src/services/templates/types.ts` | Complete | None — full type system |
| `src/services/templates/TemplateService.ts` | 90% complete | `generateTemplate()` uses simulated AI (setTimeout + hardcoded logic); `createFromTemplate()` doesn't call backend |
| `src/components/templates/TemplateSelector.tsx` | Complete | Not used in any page or route |
| `src/components/projects/AIProjectCreator.tsx` | Complete UI | Calls `/api/ai/generate-project-structure` which doesn't exist |
| `routes/ai.js` | Has chat/design endpoints | No `generate-project-structure` endpoint |
| `routes/projects.js` | Full CRUD | No template-based creation; `is_template` and `template_id` columns exist but unused |

**Strategy:** Activate what exists — real AI generation, backend wiring, and UI integration.

---

## T1: AI Project Structure Generation Endpoint

**Files:** `routes/ai.js`

Add `POST /api/ai/generate-project-structure` endpoint that:
- Takes `{ description: string, category?: string, complexity?: string }`
- Calls Anthropic API with a structured prompt to generate:
  - Suggested project name
  - Folder structure (paths + descriptions)
  - Initial tasks with week assignments
  - Recommended team roles
  - Suggested tags
- Returns `AISuggestion` shape matching what `AIProjectCreator.tsx` expects
- Falls back to local heuristic generation if AI call fails (reuse TemplateService logic)

---

## T2: Template-Based Project Creation Backend

**Files:** `routes/projects.js`, `routes/templates.js` (new)

### 2a: Template API routes (`routes/templates.js`)
- `GET /api/templates` — List built-in + user custom templates (delegates to TemplateService catalog)
- `GET /api/templates/:id` — Get single template with full structure
- `POST /api/templates/generate` — AI-generate a template from description (calls Anthropic)
- `POST /api/templates/custom` — Save a user's custom template to database
- `DELETE /api/templates/custom/:id` — Delete custom template

### 2b: Template-based project creation (`routes/projects.js`)
- Extend `POST /api/projects` to accept optional `templateId` and `templateVariables`
- When `templateId` is present:
  - Fetch template definition
  - Interpolate variables into folder/file/entity structure
  - Create project with `template_id` reference
  - Auto-create folders, initial tasks, and entities from template structure
  - Return the created project with populated structure

### 2c: Database migration (`database/migrations/116_project_templates.sql`)
- `project_templates` table: id, name, description, category, complexity, structure (JSONB), variables (JSONB), author_id, is_official, is_featured, downloads, rating, created_at, updated_at
- `user_custom_templates` table: id, user_id, name, description, category, structure (JSONB), variables (JSONB), source_project_id, created_at, updated_at

---

## T3: Wire TemplateService to Real AI

**Files:** `src/services/templates/TemplateService.ts`

Replace simulated AI methods with real API calls:
- `generateTemplate()` → Call `POST /api/templates/generate` instead of setTimeout + hardcoded logic
- `createFromTemplate()` → Call `POST /api/projects` with `templateId` + `templateVariables` instead of local-only simulation
- `createCustomTemplate()` → Call `POST /api/templates/custom` to persist to database instead of localStorage
- `deleteCustomTemplate()` → Call `DELETE /api/templates/custom/:id`
- `search()` → Hybrid: merge local built-ins with `GET /api/templates` results
- Keep localStorage as offline cache, but primary source of truth moves to backend

---

## T4: UI Integration — Template Gallery & AI Creator in Project Flow

**Files:** `src/pages/Projects.tsx`, `src/components/projects/AIProjectCreator.tsx`, `src/components/templates/TemplateSelector.tsx`

### 4a: Add template entry points to Projects page
- Add "Create from Template" button alongside existing "New Project" button
- Opens TemplateSelector in a dialog/drawer
- Add "AI Create" button that opens AIProjectCreator dialog
- Both lead to actual project creation via the wired backend

### 4b: Fix AIProjectCreator endpoint integration
- Currently calls `/api/ai/generate-project-structure` — this will now work (T1)
- Verify suggestion application flow creates real projects
- Add error handling for AI generation failures with fallback UI

### 4c: Wire TemplateSelector to real creation
- On template select → show variable customization form
- On "Create Project" → call `templateService.createFromTemplate()` (now wired to backend via T3)
- Navigate to new project after creation
- Add "Save as Template" option in project settings (create custom template from existing project)

---

## Verification

1. `npm run dev` + `npm run dev:unified` — start both servers
2. Navigate to `/projects`:
   - "Create from Template" button visible
   - "AI Create" button visible
3. Template flow: Browse → Select → Customize variables → Create → Redirects to new project
4. AI flow: Describe project → AI generates suggestions → Apply → Create → Redirects to new project
5. Custom template: Open existing project → Settings → "Save as Template" → Appears in template gallery
6. `npm run typecheck` — zero new TypeScript errors
7. `npm run lint` — no linting errors

---

## Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `routes/ai.js` | Modify | Add `generate-project-structure` endpoint |
| `routes/templates.js` | Create | Template CRUD + AI generation routes |
| `routes/projects.js` | Modify | Accept `templateId`/`templateVariables` in creation |
| `server-unified.js` | Modify | Mount template routes |
| `database/migrations/116_project_templates.sql` | Create | Template tables |
| `src/services/templates/TemplateService.ts` | Modify | Replace simulated AI with real API calls |
| `src/components/projects/AIProjectCreator.tsx` | Modify | Verify/fix endpoint integration |
| `src/components/templates/TemplateSelector.tsx` | Modify | Wire to real creation flow |
| `src/pages/Projects.tsx` | Modify | Add template/AI creation entry points |
