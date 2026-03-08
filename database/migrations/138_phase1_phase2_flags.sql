-- Phase 1 & Phase 2 & Growth: Register missing feature flags
-- Only 3 of 9 flags (ai-collaborative, wcag_aa_forms, presentation-mode) have
-- migration files. This migration adds the remaining 6 so useFeatureFlag()
-- can read them from the database instead of always returning false.

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'onboarding_v2_disabled',
  'Phase 1.1: Disable V2 onboarding flow',
  false,
  100,
  '{"phase": "1.1", "epic": "Onboarding Redesign"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'ai_design_real',
  'Phase 1.2: Enable real AI design feedback instead of placeholder analysis',
  false,
  100,
  '{"phase": "1.2", "epic": "AI Design Feedback"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'yjs-messaging',
  'Phase 2.1: Enable Yjs-backed real-time messaging (replaces Socket.IO messaging)',
  false,
  100,
  '{"phase": "2.1", "epic": "Yjs Collaboration"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'yjs-documents',
  'Phase 2.2: Enable Yjs-backed collaborative document editing via Tiptap',
  false,
  100,
  '{"phase": "2.2", "epic": "Yjs Collaboration"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'ai_search',
  'Phase 2.3: Enable AI-powered semantic search across projects and assets',
  false,
  100,
  '{"phase": "2.3", "epic": "AI Search"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'try-cta-variant',
  'Growth: A/B test CTA copy variant on TryEditor landing page',
  false,
  100,
  '{"phase": "growth", "epic": "Conversion Optimization"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
