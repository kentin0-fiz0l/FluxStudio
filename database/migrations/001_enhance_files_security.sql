-- Enhanced File Security Migration
-- Created: 2025-10-12
-- Sprint 9: Enhanced File Security and Progress Tracking

-- Add security and status columns to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS security_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE files ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE files ADD COLUMN IF NOT EXISTS quarantine_path TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

-- Add indexes for security queries
CREATE INDEX IF NOT EXISTS idx_files_security_status ON files(security_status);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);

-- Create file_upload_sessions table for tracking uploads
CREATE TABLE IF NOT EXISTS file_upload_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id INTEGER,
    organization_id INTEGER,
    filename VARCHAR(500) NOT NULL,
    filesize BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    stage VARCHAR(50) DEFAULT 'initializing',
    security_status VARCHAR(20) DEFAULT 'pending',
    errors JSONB DEFAULT '[]',
    file_id VARCHAR(255),
    socket_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_security_scans table for detailed scan results
CREATE TABLE IF NOT EXISTS file_security_scans (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    scan_type VARCHAR(50) NOT NULL, -- 'clamav', 'custom', 'entropy'
    scan_status VARCHAR(20) NOT NULL, -- 'clean', 'infected', 'suspicious', 'error'
    threats_detected JSONB DEFAULT '[]',
    scan_duration INTEGER, -- milliseconds
    scan_metadata JSONB DEFAULT '{}',
    scanner_version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Create security_quarantine table for quarantined files
CREATE TABLE IF NOT EXISTS security_quarantine (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    original_path TEXT NOT NULL,
    quarantine_path TEXT NOT NULL,
    quarantine_reason TEXT NOT NULL,
    detected_threats JSONB DEFAULT '[]',
    quarantine_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by VARCHAR(255),
    review_date TIMESTAMP WITH TIME ZONE,
    review_action VARCHAR(50), -- 'release', 'delete', 'keep_quarantined'
    review_notes TEXT,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON file_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON file_upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_security_scans_file ON file_security_scans(file_id);
CREATE INDEX IF NOT EXISTS idx_security_scans_status ON file_security_scans(scan_status);
CREATE INDEX IF NOT EXISTS idx_quarantine_file ON security_quarantine(file_id);
CREATE INDEX IF NOT EXISTS idx_quarantine_date ON security_quarantine(quarantine_date);

-- Add comments for documentation
COMMENT ON TABLE file_upload_sessions IS 'Track file upload progress and status in real-time';
COMMENT ON TABLE file_security_scans IS 'Store detailed results from security scans';
COMMENT ON TABLE security_quarantine IS 'Manage quarantined files and review process';

COMMENT ON COLUMN files.security_status IS 'Overall security status: pending, clean, suspicious, infected, error';
COMMENT ON COLUMN files.status IS 'File status: active, quarantined, deleted';
COMMENT ON COLUMN files.file_hash IS 'SHA-256 hash for file integrity and deduplication';

-- Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_file_upload_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS trigger_update_file_upload_session_timestamp ON file_upload_sessions;
CREATE TRIGGER trigger_update_file_upload_session_timestamp
    BEFORE UPDATE ON file_upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_file_upload_session_timestamp();

-- Create view for file security overview
CREATE OR REPLACE VIEW file_security_overview AS
SELECT
    f.id,
    f.name,
    f.original_name,
    f.mime_type,
    f.file_size,
    f.security_status,
    f.status,
    f.file_hash,
    f.uploaded_by,
    f.organization_id,
    f.project_id,
    f.created_at,
    COALESCE(scan_summary.total_scans, 0) as total_scans,
    COALESCE(scan_summary.clean_scans, 0) as clean_scans,
    COALESCE(scan_summary.threat_scans, 0) as threat_scans,
    scan_summary.last_scan_date,
    q.quarantine_reason,
    q.quarantine_date
FROM files f
LEFT JOIN (
    SELECT
        file_id,
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE scan_status = 'clean') as clean_scans,
        COUNT(*) FILTER (WHERE scan_status IN ('infected', 'suspicious')) as threat_scans,
        MAX(created_at) as last_scan_date
    FROM file_security_scans
    GROUP BY file_id
) scan_summary ON f.id = scan_summary.file_id
LEFT JOIN security_quarantine q ON f.id = q.file_id AND q.review_action IS NULL
ORDER BY f.created_at DESC;

COMMENT ON VIEW file_security_overview IS 'Comprehensive view of file security status and scan history';