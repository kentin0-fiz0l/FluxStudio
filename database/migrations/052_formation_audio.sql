-- Migration: Add audio support to formations
-- Description: Adds audio track fields for syncing music with formation animations

-- Add audio track columns to formations table
ALTER TABLE formations
ADD COLUMN IF NOT EXISTS audio_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS audio_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS audio_duration INTEGER; -- Duration in milliseconds

-- Add index for audio lookups
CREATE INDEX IF NOT EXISTS idx_formations_audio_id ON formations(audio_id) WHERE audio_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN formations.audio_id IS 'Unique identifier for the audio track';
COMMENT ON COLUMN formations.audio_url IS 'URL to the audio file (S3/storage)';
COMMENT ON COLUMN formations.audio_filename IS 'Original filename of the uploaded audio';
COMMENT ON COLUMN formations.audio_duration IS 'Duration of the audio in milliseconds';
