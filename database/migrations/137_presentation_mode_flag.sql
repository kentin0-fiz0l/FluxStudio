-- Phase 3.3: Client Presentation Mode — presentation-mode feature flag
-- Inserts the flag disabled by default so it can be toggled via admin UI.

INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'presentation-mode',
  'Phase 3.3: Client Presentation Mode — fullscreen slideshow with auto-advance, AI narration notes, pointer highlights on shared and embedded formations',
  false,
  100,
  '{"phase": "3.3", "epic": "Client Presentation Mode"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
