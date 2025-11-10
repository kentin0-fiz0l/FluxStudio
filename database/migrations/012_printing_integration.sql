-- Migration 012: FluxPrint Integration - 3D Printing Support
-- Adds print job tracking and project linking for FluxPrint microservice integration
-- Phase 1: Microservice Integration with Proxy Layer

-- Print Jobs table - Links FluxStudio projects to FluxPrint print queue
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FluxStudio project linkage
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE SET NULL,

  -- FluxPrint queue reference
  fluxprint_queue_id INTEGER,

  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT,

  -- Job status tracking
  status VARCHAR(50) DEFAULT 'queued',
  -- Status: queued, printing, completed, failed, canceled
  progress DECIMAL(5,2) DEFAULT 0.00,  -- 0.00 to 100.00

  -- Timing information
  queued_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  canceled_at TIMESTAMP,

  -- Time estimates and actuals (in seconds)
  estimated_time INTEGER,  -- Estimated print time from slicer
  actual_time INTEGER,     -- Actual print time

  -- Printer information
  printer_name VARCHAR(100),
  printer_status TEXT,

  -- Print settings (stored as JSONB for flexibility)
  print_settings JSONB,
  -- Example: {"layer_height": 0.2, "infill": 20, "temperature": 210, "bed_temp": 60}

  -- Material information
  material_type VARCHAR(50),
  material_color VARCHAR(50),
  material_used DECIMAL(10,2),  -- Grams or meters used

  -- Error tracking
  error_message TEXT,
  error_timestamp TIMESTAMP,

  -- Metadata
  metadata JSONB,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_print_jobs_project
ON print_jobs(project_id);

CREATE INDEX IF NOT EXISTS idx_print_jobs_file
ON print_jobs(file_id);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status
ON print_jobs(status)
WHERE status IN ('queued', 'printing');

CREATE INDEX IF NOT EXISTS idx_print_jobs_fluxprint_queue
ON print_jobs(fluxprint_queue_id)
WHERE fluxprint_queue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_print_jobs_created
ON print_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_print_jobs_completed
ON print_jobs(completed_at DESC)
WHERE completed_at IS NOT NULL;

-- View for active print jobs
CREATE OR REPLACE VIEW active_print_jobs AS
SELECT
  pj.id,
  pj.project_id,
  pj.file_name,
  pj.status,
  pj.progress,
  pj.printer_name,
  pj.estimated_time,
  pj.started_at,
  pj.queued_at,
  EXTRACT(EPOCH FROM (NOW() - pj.started_at))::INTEGER as elapsed_seconds,
  p.name as project_name,
  f.name as file_original_name,
  u.email as project_owner_email
FROM print_jobs pj
LEFT JOIN projects p ON pj.project_id = p.id
LEFT JOIN files f ON pj.file_id = f.id
LEFT JOIN users u ON p.user_id = u.id
WHERE pj.status IN ('queued', 'printing')
ORDER BY pj.queued_at ASC;

-- View for print job history
CREATE OR REPLACE VIEW print_job_history AS
SELECT
  pj.id,
  pj.project_id,
  pj.file_name,
  pj.status,
  pj.progress,
  pj.printer_name,
  pj.material_type,
  pj.material_used,
  pj.estimated_time,
  pj.actual_time,
  pj.queued_at,
  pj.started_at,
  pj.completed_at,
  EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at))::INTEGER as duration_seconds,
  p.name as project_name,
  u.email as project_owner_email
FROM print_jobs pj
LEFT JOIN projects p ON pj.project_id = p.id
LEFT JOIN users u ON p.user_id = u.id
WHERE pj.completed_at IS NOT NULL
  OR pj.status IN ('failed', 'canceled')
ORDER BY COALESCE(pj.completed_at, pj.canceled_at, pj.created_at) DESC
LIMIT 100;

-- View for print job statistics by project
CREATE OR REPLACE VIEW print_job_stats_by_project AS
SELECT
  p.id as project_id,
  p.name as project_name,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE pj.status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE pj.status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE pj.status = 'canceled') as canceled_jobs,
  COUNT(*) FILTER (WHERE pj.status IN ('queued', 'printing')) as active_jobs,
  SUM(pj.material_used) FILTER (WHERE pj.status = 'completed') as total_material_used,
  AVG(pj.actual_time) FILTER (WHERE pj.status = 'completed' AND pj.actual_time IS NOT NULL)::INTEGER as avg_print_time,
  MAX(pj.completed_at) as last_print_completed
FROM projects p
LEFT JOIN print_jobs pj ON p.id = pj.project_id
GROUP BY p.id, p.name;

-- Function to update print job status
CREATE OR REPLACE FUNCTION update_print_job_status(
  job_id UUID,
  new_status VARCHAR(50),
  new_progress DECIMAL(5,2) DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE print_jobs
  SET
    status = new_status,
    progress = COALESCE(new_progress, progress),
    error_message = COALESCE(error_msg, error_message),
    error_timestamp = CASE WHEN error_msg IS NOT NULL THEN NOW() ELSE error_timestamp END,
    started_at = CASE WHEN new_status = 'printing' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE completed_at END,
    canceled_at = CASE WHEN new_status = 'canceled' THEN NOW() ELSE canceled_at END,
    updated_at = NOW()
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate actual print time
CREATE OR REPLACE FUNCTION calculate_print_time(job_id UUID)
RETURNS INTEGER AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTEGER;
BEGIN
  SELECT started_at, completed_at INTO start_time, end_time
  FROM print_jobs
  WHERE id = job_id;

  IF start_time IS NULL OR end_time IS NULL THEN
    RETURN NULL;
  END IF;

  duration := EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER;

  UPDATE print_jobs
  SET actual_time = duration
  WHERE id = job_id;

  RETURN duration;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old print jobs (housekeeping)
CREATE OR REPLACE FUNCTION cleanup_old_print_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed/failed/canceled jobs older than 90 days
  DELETE FROM print_jobs
  WHERE status IN ('completed', 'failed', 'canceled')
    AND COALESCE(completed_at, canceled_at, created_at) < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_print_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_print_job_timestamp
BEFORE UPDATE ON print_jobs
FOR EACH ROW
EXECUTE FUNCTION update_print_job_timestamp();

-- Comments for documentation
COMMENT ON TABLE print_jobs IS 'Tracks 3D print jobs from FluxStudio projects integrated with FluxPrint microservice';
COMMENT ON COLUMN print_jobs.fluxprint_queue_id IS 'Reference to job ID in FluxPrint queue system';
COMMENT ON COLUMN print_jobs.status IS 'Job status: queued, printing, completed, failed, canceled';
COMMENT ON COLUMN print_jobs.progress IS 'Print progress percentage (0.00 to 100.00)';
COMMENT ON COLUMN print_jobs.print_settings IS 'JSON object containing slicer settings used for this print';
COMMENT ON COLUMN print_jobs.metadata IS 'JSON object for additional print metadata and custom fields';
COMMENT ON VIEW active_print_jobs IS 'Shows currently active print jobs for monitoring';
COMMENT ON VIEW print_job_history IS 'Shows recent completed/failed/canceled print jobs';
COMMENT ON VIEW print_job_stats_by_project IS 'Aggregates print job statistics grouped by project';

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON print_jobs TO fluxstudio_app;
-- GRANT SELECT ON active_print_jobs TO fluxstudio_app;
-- GRANT SELECT ON print_job_history TO fluxstudio_app;
-- GRANT SELECT ON print_job_stats_by_project TO fluxstudio_app;
-- GRANT EXECUTE ON FUNCTION update_print_job_status TO fluxstudio_app;
-- GRANT EXECUTE ON FUNCTION calculate_print_time TO fluxstudio_app;

-- Example: Schedule automatic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-print-jobs', '0 3 * * 0', 'SELECT cleanup_old_print_jobs()');
