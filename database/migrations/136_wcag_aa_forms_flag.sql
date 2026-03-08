-- Phase 3.2: WCAG 2.1 AA Completion
-- Register wcag_aa_forms feature flag for progressive rollout of
-- enhanced form accessibility (assertive live regions, improved validation announcements)

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'wcag_aa_forms',
  'WCAG 2.1 AA form accessibility enhancements including assertive live region announcements for validation errors',
  true,
  100,
  '{"phase": "3.2", "category": "accessibility"}'
)
ON CONFLICT (name) DO NOTHING;
