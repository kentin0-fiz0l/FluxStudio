-- Migration 011: Add HLS Streaming Support (DigitalOcean Version)
-- Simplified schema for HLS adaptive streaming without DRM
-- This migration focuses on cost-effective video streaming using FFmpeg

-- Add HLS-related columns to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS hls_manifest_url TEXT,
ADD COLUMN IF NOT EXISTS transcoding_status VARCHAR(50) DEFAULT 'pending';

-- Create index on transcoding status for quick queries
CREATE INDEX IF NOT EXISTS idx_files_transcoding_status
ON files(transcoding_status)
WHERE transcoding_status IN ('pending', 'processing');

-- Transcoding Jobs table - tracks FFmpeg worker jobs
CREATE TABLE IF NOT EXISTS transcoding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  -- Status: pending, processing, completed, failed, canceled
  input_url TEXT NOT NULL,
  output_prefix VARCHAR(255),
  manifest_url TEXT,

  -- Job progress
  progress INTEGER DEFAULT 0,  -- 0-100
  error_message TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Settings (JSONB for flexibility)
  settings JSONB
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_transcoding_jobs_file
ON transcoding_jobs(file_id);

CREATE INDEX IF NOT EXISTS idx_transcoding_jobs_status
ON transcoding_jobs(status)
WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_transcoding_jobs_created
ON transcoding_jobs(created_at DESC);

-- View for active transcoding jobs
CREATE OR REPLACE VIEW active_transcoding_jobs AS
SELECT
  tj.id,
  tj.file_id,
  tj.status,
  tj.progress,
  tj.created_at,
  tj.started_at,
  f.name as file_name,
  f.mime_type,
  u.email as user_email
FROM transcoding_jobs tj
JOIN files f ON tj.file_id = f.id
LEFT JOIN users u ON f.uploaded_by = u.id
WHERE tj.status IN ('pending', 'processing')
ORDER BY tj.created_at ASC;

-- View for recent transcoding history
CREATE OR REPLACE VIEW transcoding_history AS
SELECT
  tj.id,
  tj.file_id,
  tj.status,
  tj.progress,
  tj.created_at,
  tj.completed_at,
  EXTRACT(EPOCH FROM (tj.completed_at - tj.created_at)) as duration_seconds,
  f.name as file_name,
  f.hls_manifest_url,
  u.email as user_email
FROM transcoding_jobs tj
JOIN files f ON tj.file_id = f.id
LEFT JOIN users u ON f.uploaded_by = u.id
WHERE tj.completed_at IS NOT NULL
ORDER BY tj.completed_at DESC
LIMIT 100;

-- Function to clean up old completed/failed jobs (optional housekeeping)
CREATE OR REPLACE FUNCTION cleanup_old_transcoding_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete jobs older than 30 days that are completed or failed
  DELETE FROM transcoding_jobs
  WHERE status IN ('completed', 'failed', 'canceled')
    AND completed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE transcoding_jobs IS 'Tracks FFmpeg HLS transcoding jobs processed by workers';
COMMENT ON COLUMN files.hls_manifest_url IS 'URL to HLS master manifest (m3u8) for adaptive streaming';
COMMENT ON COLUMN files.transcoding_status IS 'Status: pending, processing, completed, failed';
COMMENT ON VIEW active_transcoding_jobs IS 'Shows currently active transcoding jobs for monitoring';
COMMENT ON VIEW transcoding_history IS 'Shows recent completed transcoding jobs with performance metrics';

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE ON transcoding_jobs TO fluxstudio_app;
-- GRANT SELECT ON active_transcoding_jobs TO fluxstudio_app;
-- GRANT SELECT ON transcoding_history TO fluxstudio_app;

-- Example: Schedule automatic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-transcoding-jobs', '0 2 * * *', 'SELECT cleanup_old_transcoding_jobs()');
