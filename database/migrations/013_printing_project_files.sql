-- Migration 013: Printing Project File Association
-- Phase 3D: Project Integration
-- Created: 2025-11-07
-- Purpose: Link G-code files to FluxStudio projects for organized printing workflow

-- Table to associate printing files with projects
CREATE TABLE IF NOT EXISTS printing_files (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  project_id TEXT NOT NULL,
  file_id TEXT,  -- FluxStudio file ID if uploaded through FluxStudio
  filename TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,  -- User ID who uploaded
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(filename)
);

CREATE INDEX IF NOT EXISTS idx_printing_files_project ON printing_files(project_id);
CREATE INDEX IF NOT EXISTS idx_printing_files_filename ON printing_files(filename);
CREATE INDEX IF NOT EXISTS idx_printing_files_uploaded_by ON printing_files(uploaded_by);

-- Enhanced view for project print statistics
CREATE OR REPLACE VIEW project_print_stats_detailed AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p.owner_id,
  COUNT(DISTINCT pj.id) as total_prints,
  COUNT(DISTINCT CASE WHEN pj.status = 'completed' THEN pj.id END) as successful_prints,
  COUNT(DISTINCT CASE WHEN pj.status = 'failed' THEN pj.id END) as failed_prints,
  COUNT(DISTINCT CASE WHEN pj.status = 'canceled' THEN pj.id END) as canceled_prints,
  COUNT(DISTINCT CASE WHEN pj.status IN ('queued', 'printing') THEN pj.id END) as active_prints,
  COALESCE(SUM(pj.material_used), 0) as total_material_grams,
  COALESCE(AVG(NULLIF(pj.duration_seconds, 0)), 0) as avg_print_time_seconds,
  COUNT(DISTINCT pf.filename) as unique_files_printed,
  COUNT(DISTINCT pf.id) as total_files_linked,
  MAX(pj.completed_at) as last_print_date,
  MIN(pj.queued_at) as first_print_date
FROM projects p
LEFT JOIN printing_files pf ON p.id = pf.project_id
LEFT JOIN print_jobs pj ON pf.filename = pj.file_name
GROUP BY p.id, p.name, p.owner_id;
