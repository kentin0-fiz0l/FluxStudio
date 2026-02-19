-- Migration 107: Add Audio Support to MetMap Songs
-- Date: 2026-02-19
-- Description: Adds columns for audio file attachment, duration, beat detection results

ALTER TABLE metmap_songs
ADD COLUMN IF NOT EXISTS audio_file_url TEXT;

ALTER TABLE metmap_songs
ADD COLUMN IF NOT EXISTS audio_duration_seconds NUMERIC(10,3);

ALTER TABLE metmap_songs
ADD COLUMN IF NOT EXISTS detected_bpm NUMERIC(6,2);

ALTER TABLE metmap_songs
ADD COLUMN IF NOT EXISTS beat_map JSONB;
