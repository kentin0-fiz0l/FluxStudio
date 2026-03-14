-- Phase 5: Add missing indexes for query performance
-- Priority 9: Database indexes for plan_id lookups, project member checks, and analytics

-- Index on users.plan_id — queried on every authenticated request for feature gating
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);

-- Composite index on project_members — queried on every project access check
CREATE INDEX IF NOT EXISTS idx_project_members_project_user ON project_members(project_id, user_id);

-- Compound index on analytics_events for funnel queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event ON analytics_events(user_id, event_name, created_at DESC);

-- Update table statistics for the query planner
ANALYZE users;
ANALYZE project_members;
ANALYZE analytics_events;
