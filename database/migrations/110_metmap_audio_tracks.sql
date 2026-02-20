-- Migration 110: Multi-track audio support for MetMap
-- Allows multiple audio tracks per song with individual volume, pan, mute, solo controls

CREATE TABLE IF NOT EXISTS metmap_audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL DEFAULT 'Track 1',
  audio_key VARCHAR(500),
  audio_url VARCHAR(1000),
  audio_duration_seconds FLOAT,
  mime_type VARCHAR(50),
  file_size_bytes INTEGER,
  volume FLOAT DEFAULT 1.0,
  pan FLOAT DEFAULT 0.0,
  muted BOOLEAN DEFAULT false,
  solo BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  beat_map JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metmap_audio_tracks_song ON metmap_audio_tracks(song_id);
CREATE INDEX IF NOT EXISTS idx_metmap_audio_tracks_user ON metmap_audio_tracks(user_id);
