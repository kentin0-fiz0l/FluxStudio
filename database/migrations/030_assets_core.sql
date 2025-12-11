-- Migration: 030_assets_core.sql
-- Description: Creates the Assets system tables for versioning, metadata, and lineage tracking
-- This layer sits on top of the Files system to provide rich asset management

-- ==================== ASSETS TABLE ====================
-- Core asset entity that wraps files with versioning support

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name VARCHAR(500) NOT NULL,
    description TEXT,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'file', -- file, design, code, document, media, other

    -- Current version tracking
    current_version INTEGER NOT NULL DEFAULT 1,
    current_file_id UUID REFERENCES files(id) ON DELETE SET NULL,

    -- Ownership
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, archived, deleted
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for assets
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_current_file_id ON assets(current_file_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

-- ==================== ASSET VERSIONS TABLE ====================
-- Tracks all versions of an asset

CREATE TABLE IF NOT EXISTS asset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent asset
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

    -- Version info
    version_number INTEGER NOT NULL,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,

    -- Change tracking
    change_summary TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique version numbers per asset
    UNIQUE(asset_id, version_number)
);

-- Create indexes for asset_versions
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_id ON asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_file_id ON asset_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_created_by ON asset_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_asset_versions_created_at ON asset_versions(created_at DESC);

-- ==================== ASSET RELATIONS TABLE ====================
-- Tracks relationships between assets (lineage, dependencies, derivatives)

CREATE TABLE IF NOT EXISTS asset_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source and target assets
    source_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    target_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

    -- Relation type
    relation_type VARCHAR(50) NOT NULL, -- derived_from, depends_on, references, variant_of, composed_of

    -- Optional metadata about the relation
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Who created this relation
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate relations
    UNIQUE(source_asset_id, target_asset_id, relation_type),

    -- Prevent self-referential relations
    CHECK (source_asset_id != target_asset_id)
);

-- Create indexes for asset_relations
CREATE INDEX IF NOT EXISTS idx_asset_relations_source ON asset_relations(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_relations_target ON asset_relations(target_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_relations_type ON asset_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_asset_relations_created_by ON asset_relations(created_by);

-- ==================== ASSET METADATA TABLE ====================
-- Key-value metadata storage for assets

CREATE TABLE IF NOT EXISTS asset_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent asset
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

    -- Metadata key-value
    key VARCHAR(255) NOT NULL,
    value TEXT,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json, date

    -- Categorization
    category VARCHAR(100), -- technical, creative, legal, custom

    -- Who set this metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique keys per asset
    UNIQUE(asset_id, key)
);

-- Create indexes for asset_metadata
CREATE INDEX IF NOT EXISTS idx_asset_metadata_asset_id ON asset_metadata(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_key ON asset_metadata(key);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_category ON asset_metadata(category);

-- ==================== ASSET TAGS TABLE ====================
-- Tags for asset categorization and search

CREATE TABLE IF NOT EXISTS asset_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent asset
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

    -- Tag info
    tag VARCHAR(100) NOT NULL,

    -- Who added this tag
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique tags per asset
    UNIQUE(asset_id, tag)
);

-- Create indexes for asset_tags
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset_id ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag);

-- ==================== ASSET COMMENTS TABLE ====================
-- Comments and annotations on assets

CREATE TABLE IF NOT EXISTS asset_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent asset (and optionally specific version)
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version_id UUID REFERENCES asset_versions(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,

    -- Threading support
    parent_comment_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE,

    -- Author
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for asset_comments
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_version_id ON asset_comments(version_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_parent ON asset_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_by ON asset_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_at ON asset_comments(created_at DESC);

-- ==================== TRIGGERS ====================

-- Auto-update updated_at for assets
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assets_updated_at ON assets;
CREATE TRIGGER trigger_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();

-- Auto-update updated_at for asset_metadata
DROP TRIGGER IF EXISTS trigger_asset_metadata_updated_at ON asset_metadata;
CREATE TRIGGER trigger_asset_metadata_updated_at
    BEFORE UPDATE ON asset_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();

-- Auto-update updated_at for asset_comments
DROP TRIGGER IF EXISTS trigger_asset_comments_updated_at ON asset_comments;
CREATE TRIGGER trigger_asset_comments_updated_at
    BEFORE UPDATE ON asset_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();

-- ==================== HELPER FUNCTIONS ====================

-- Function to get asset with all its versions
CREATE OR REPLACE FUNCTION get_asset_with_versions(p_asset_id UUID)
RETURNS TABLE (
    asset_id UUID,
    asset_name VARCHAR(500),
    asset_type VARCHAR(50),
    current_version INTEGER,
    version_number INTEGER,
    version_file_id UUID,
    version_change_summary TEXT,
    version_created_at TIMESTAMPTZ,
    version_created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.name,
        a.asset_type,
        a.current_version,
        av.version_number,
        av.file_id,
        av.change_summary,
        av.created_at,
        av.created_by
    FROM assets a
    LEFT JOIN asset_versions av ON av.asset_id = a.id
    WHERE a.id = p_asset_id
    ORDER BY av.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get asset lineage (both ancestors and descendants)
CREATE OR REPLACE FUNCTION get_asset_lineage(p_asset_id UUID, p_direction VARCHAR DEFAULT 'both')
RETURNS TABLE (
    related_asset_id UUID,
    related_asset_name VARCHAR(500),
    relation_type VARCHAR(50),
    direction VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    -- Get ancestors (assets this one derives from)
    SELECT
        ar.target_asset_id,
        a.name,
        ar.relation_type,
        'ancestor'::VARCHAR(10)
    FROM asset_relations ar
    JOIN assets a ON a.id = ar.target_asset_id
    WHERE ar.source_asset_id = p_asset_id
      AND (p_direction = 'both' OR p_direction = 'ancestors')

    UNION ALL

    -- Get descendants (assets derived from this one)
    SELECT
        ar.source_asset_id,
        a.name,
        ar.relation_type,
        'descendant'::VARCHAR(10)
    FROM asset_relations ar
    JOIN assets a ON a.id = ar.source_asset_id
    WHERE ar.target_asset_id = p_asset_id
      AND (p_direction = 'both' OR p_direction = 'descendants');
END;
$$ LANGUAGE plpgsql;

-- ==================== COMMENTS ====================
--
-- Asset Types:
--   - file: Generic file asset
--   - design: Design files (Figma, Sketch, etc.)
--   - code: Code files
--   - document: Documents (Word, PDF, etc.)
--   - media: Images, videos, audio
--   - other: Uncategorized
--
-- Relation Types:
--   - derived_from: This asset was created from another (e.g., exported PNG from PSD)
--   - depends_on: This asset requires another to function
--   - references: This asset references another (soft link)
--   - variant_of: This asset is a variant/fork of another
--   - composed_of: This asset is composed of other assets
--
-- Metadata Categories:
--   - technical: File specs, dimensions, encoding, etc.
--   - creative: Color palette, style, mood, etc.
--   - legal: License, copyright, usage rights
--   - custom: User-defined metadata
