-- Migration: 129_browser_jobs
-- Create browser_jobs table for the browser worker service

CREATE TABLE IF NOT EXISTS browser_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  input JSONB NOT NULL,
  output JSONB,
  error TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_browser_jobs_status ON browser_jobs(status, created_at);
