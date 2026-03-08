-- Phase 3.1: AI Co-Pilot Upgrade — ai_collaborative feature flag
-- Inserts the flag disabled by default so it can be toggled via admin UI.

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'ai-collaborative',
  'Phase 3.1: AI Co-Pilot collaborative features — shared AI context via Yjs, conflict detection, and Generate from Music toolbar button',
  false,
  100,
  '{"phase": "3.1", "epic": "AI Co-Pilot Upgrade"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
