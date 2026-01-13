-- Migration 005: Extend documents table for project-level collaborative documents
-- Date: 2026-01-13
-- Purpose: Add project linking, ownership, version history for collaborative editing

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to existing documents table
-- Note: Using DO block to handle column additions safely
DO $$
BEGIN
    -- Add project_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'project_id') THEN
        ALTER TABLE documents ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    END IF;

    -- Add owner_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'owner_id') THEN
        ALTER TABLE documents ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add title column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title') THEN
        ALTER TABLE documents ADD COLUMN title VARCHAR(255) DEFAULT 'Untitled Document';
    END IF;

    -- Add document_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_type') THEN
        ALTER TABLE documents ADD COLUMN document_type VARCHAR(50) DEFAULT 'rich-text' CHECK (document_type IN ('rich-text', 'markdown', 'code', 'canvas'));
    END IF;

    -- Add is_archived column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_archived') THEN
        ALTER TABLE documents ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add last_edited_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_edited_by') THEN
        ALTER TABLE documents ADD COLUMN last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add last_edited_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_edited_at') THEN
        ALTER TABLE documents ADD COLUMN last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create document_versions table for version history
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot BYTEA,
    diff BYTEA,
    is_full_snapshot BOOLEAN DEFAULT FALSE,
    change_description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint to ensure one version number per document
    CONSTRAINT document_versions_unique_version UNIQUE (document_id, version_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_archived ON documents(project_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_last_edited ON documents(last_edited_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN documents.project_id IS 'Link to project - documents are project-scoped';
COMMENT ON COLUMN documents.owner_id IS 'User who created the document';
COMMENT ON COLUMN documents.title IS 'Document title (user-editable)';
COMMENT ON COLUMN documents.document_type IS 'Type of document: rich-text, markdown, code, canvas';
COMMENT ON COLUMN documents.is_archived IS 'Soft delete flag';
COMMENT ON COLUMN documents.last_edited_by IS 'Last user to edit the document';
COMMENT ON COLUMN documents.last_edited_at IS 'Timestamp of last edit';

COMMENT ON TABLE document_versions IS 'Version history for collaborative documents';
COMMENT ON COLUMN document_versions.version_number IS 'Sequential version number (1, 2, 3, ...)';
COMMENT ON COLUMN document_versions.snapshot IS 'Full Yjs snapshot (stored every 10 versions)';
COMMENT ON COLUMN document_versions.diff IS 'Incremental diff from previous version';
COMMENT ON COLUMN document_versions.is_full_snapshot IS 'True if this is a full snapshot, false if diff only';
COMMENT ON COLUMN document_versions.change_description IS 'Optional description of changes';

-- Update trigger for last_edited_at
CREATE OR REPLACE FUNCTION update_document_last_edited()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create it
DROP TRIGGER IF EXISTS update_document_last_edited_timestamp ON documents;
CREATE TRIGGER update_document_last_edited_timestamp
    BEFORE UPDATE OF snapshot ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_last_edited();

-- Grant permissions (uncomment and adjust as needed for your deployment)
-- GRANT SELECT, INSERT, UPDATE ON documents TO fluxstudio_app;
-- GRANT SELECT, INSERT, UPDATE ON document_versions TO fluxstudio_app;
-- GRANT USAGE, SELECT ON SEQUENCE documents_id_seq TO fluxstudio_app;

-- Verify migration
DO $$
BEGIN
    -- Check that all columns exist
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'project_id'), 'project_id column not created';
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'owner_id'), 'owner_id column not created';
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title'), 'title column not created';

    -- Check that document_versions table exists
    ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions'), 'document_versions table not created';

    RAISE NOTICE '✅ Migration 005: Collaborative documents schema created successfully';
END $$;
