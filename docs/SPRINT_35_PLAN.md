# Sprint 35: Predictive Analytics — Phase 3.2

## Goal
Add project health scoring, team workload balancing, bottleneck detection, and deadline risk assessment. Leverage existing SQL views (`project_task_stats`, `user_task_stats`), the widget infrastructure, and recharts.

---

## T1: Analytics API + Scoring Engine

**New files:** `routes/analytics.js`, `lib/analytics-scoring.js`, `database/migrations/114_analytics_cache.sql`

### Migration (114_analytics_cache.sql)
```sql
CREATE TABLE project_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  health_score INT NOT NULL,            -- 0-100 composite
  completion_score INT NOT NULL,        -- task completion %
  velocity_score INT NOT NULL,          -- est vs actual accuracy
  momentum_score INT NOT NULL,          -- recent activity trend
  overdue_score INT NOT NULL,           -- inverse of overdue ratio
  breakdown JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_health_snapshots_project ON project_health_snapshots(project_id, captured_at DESC);
```

### Scoring Engine (lib/analytics-scoring.js)
Follow the `teamAlignment.ts` weighted-score pattern:

**Project Health Score (0-100)**:
| Weight | Component | Source |
|--------|-----------|--------|
| 30% | Completion Rate | `project_task_stats.completion_percentage` |
| 25% | Velocity Accuracy | `tasks.estimated_hours` vs `actual_hours` |
| 25% | Momentum | Activity count in last 7d vs previous 7d |
| 20% | Overdue Ratio (inverted) | Tasks past `due_date` / total tasks |

**Team Workload Index** (per member):
- Active task count
- Total estimated hours remaining
- Overdue task count
- Status: `balanced` / `overloaded` / `idle`

**Velocity Calculator**:
- Completed tasks per week (last 4 weeks)
- Average cycle time (started_at → completed_at)
- Estimation accuracy (estimated_hours / actual_hours ratio)

### API Routes (routes/analytics.js)
```
GET /api/analytics/project/:projectId/health     → health score + breakdown
GET /api/analytics/project/:projectId/burndown    → daily task completion trend (last 30d)
GET /api/analytics/project/:projectId/velocity    → weekly velocity + estimation accuracy
GET /api/analytics/team/:teamId/workload          → per-member workload distribution
GET /api/analytics/project/:projectId/risks       → overdue + at-risk tasks with forecast
```

All endpoints use `authenticateToken` + check project/team membership.

---

## T2: Project Health Dashboard

**New file:** `src/components/analytics/ProjectHealthDashboard.tsx`

A recharts-based dashboard component that can be embedded in ProjectDetail or used standalone.

### Sub-components:
1. **HealthScoreGauge** — Radial progress (recharts RadialBarChart) with color coding:
   - 80-100 green, 60-79 yellow, 40-59 orange, 0-39 red
2. **ScoreBreakdown** — 4 mini cards showing completion/velocity/momentum/overdue scores
3. **BurndownChart** — Area chart showing tasks remaining over time (recharts AreaChart)
4. **VelocityChart** — Bar chart showing weekly completed tasks + line for cycle time

### Data hook:
**New file:** `src/hooks/useProjectAnalytics.ts`
- TanStack Query hook fetching from `/api/analytics/project/:projectId/*`
- Returns: `healthScore`, `burndownData`, `velocityData`, loading states
- Refetch interval: 60s

---

## T3: Team Workload & Bottleneck Detection

**New file:** `src/components/analytics/TeamWorkloadPanel.tsx`

### Sub-components:
1. **WorkloadHeatmap** — Horizontal bar chart per team member:
   - Bar segments colored by task priority (critical=red, high=orange, medium=blue, low=gray)
   - Overloaded members highlighted with warning badge
2. **BottleneckList** — Tasks with status `blocked` or overdue, sorted by impact:
   - Shows blocking reason, assigned member, days overdue
   - Links to task detail

### Data hook:
**New file:** `src/hooks/useTeamAnalytics.ts`
- TanStack Query hook fetching from `/api/analytics/team/:teamId/workload`
- Returns: `members` (with workload stats), `bottlenecks`, loading states

---

## T4: Deadline Risk Assessment

**New file:** `src/components/analytics/DeadlineRiskPanel.tsx`

### Logic:
Using velocity data, forecast whether the project will meet its `due_date`:
- **Remaining work**: Sum of `estimated_hours` for incomplete tasks
- **Current velocity**: Average hours completed per week (last 4 weeks)
- **Projected completion**: `remaining_work / velocity` → weeks remaining
- **Risk level**: Compare projected completion date to `project.due_date`
  - `on-track` (>2 weeks buffer), `at-risk` (<2 weeks buffer), `behind` (projected after due date)

### Sub-components:
1. **RiskIndicator** — Large badge with projected date vs due date
2. **AtRiskTasks** — List of tasks most likely to cause delay (overdue + high estimated hours)
3. **CompletionForecast** — Simple line projection on the burndown chart (dashed line extending trend)

### Wiring:
Add a "Health" or "Analytics" tab to `src/pages/ProjectDetail.tsx` that renders:
- `ProjectHealthDashboard`
- `TeamWorkloadPanel`
- `DeadlineRiskPanel`

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `database/migrations/114_analytics_cache.sql` | Create | Health snapshot table |
| `lib/analytics-scoring.js` | Create | Scoring engine functions |
| `routes/analytics.js` | Create | 5 API endpoints |
| `server-unified.js` | Modify | Mount analytics routes |
| `src/hooks/useProjectAnalytics.ts` | Create | TanStack Query for project analytics |
| `src/hooks/useTeamAnalytics.ts` | Create | TanStack Query for team workload |
| `src/components/analytics/ProjectHealthDashboard.tsx` | Create | Health gauge + burndown + velocity |
| `src/components/analytics/TeamWorkloadPanel.tsx` | Create | Workload heatmap + bottleneck list |
| `src/components/analytics/DeadlineRiskPanel.tsx` | Create | Risk assessment + forecast |
| `src/pages/ProjectDetail.tsx` | Modify | Add Analytics tab |

## Dependencies
- recharts (already installed)
- Existing SQL views: `project_task_stats`, `user_task_stats`
- Existing auth middleware

## Verification
1. `npm run typecheck` — zero new errors
2. Navigate to any project → Analytics tab shows health score, burndown, velocity
3. Team workload shows per-member distribution
4. Deadline risk shows projected completion vs due date
5. Projects with no tasks show graceful empty states
