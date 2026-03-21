-- Register creator_onboarding feature flag
-- When enabled, /onboarding renders the new 3-step CreatorOnboarding wizard
-- instead of redirecting to settings.

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'creator_onboarding',
  'Enable 3-step creator onboarding wizard (Auth -> Template -> In-Tool Welcome)',
  false,
  100,
  '{"phase": "onboarding-redesign", "epic": "Creator Onboarding"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
