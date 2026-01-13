-- Migration: Create documents table for collaboration persistence
-- Date: 2026-01-13
-- Purpose: Store Y.Doc snapshots for collaborative editing sessions

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) UNIQUE NOT NULL,
  snapshot BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',

  -- Indexes for performance
  CONSTRAINT documents_room_id_key UNIQUE (room_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- Add comment
COMMENT ON TABLE documents IS 'Stores Yjs document snapshots for collaborative editing persistence';
COMMENT ON COLUMN documents.room_id IS 'Unique identifier for the collaboration room';
COMMENT ON COLUMN documents.snapshot IS 'Binary Yjs document snapshot';
COMMENT ON COLUMN documents.metadata IS 'Additional metadata (users, version info, etc.)';

-- Create a function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_documents_timestamp ON documents;
CREATE TRIGGER update_documents_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON documents TO fluxstudio_app;
-- GRANT USAGE, SELECT ON SEQUENCE documents_id_seq TO fluxstudio_app;
