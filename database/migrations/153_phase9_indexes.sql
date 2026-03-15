-- Phase 9: Add missing indexes for query performance
-- Targets hot query paths identified from database adapter analysis

-- =============================================================================
-- SECTION 1: Formation system indexes
-- =============================================================================

-- formations.updated_at — listFormationsForProject sorts by updated_at DESC
CREATE INDEX IF NOT EXISTS idx_formations_updated_at ON formations(updated_at DESC);

-- formations.created_at — chronological sorting and filtering
CREATE INDEX IF NOT EXISTS idx_formations_created_at ON formations(created_at DESC);

-- Composite: formations project + archived + updated — covers the listFormationsForProject WHERE + ORDER BY
CREATE INDEX IF NOT EXISTS idx_formations_project_active ON formations(project_id, is_archived, updated_at DESC);

-- formation_scene_objects.formation_id + layer — listByFormation orders by layer
-- (idx_fso_formation exists but is single-column; this composite covers ORDER BY layer)
CREATE INDEX IF NOT EXISTS idx_fso_formation_layer ON formation_scene_objects(formation_id, layer);

-- =============================================================================
-- SECTION 2: Project access and membership indexes
-- =============================================================================

-- Composite: project_members active lookup — used in every permission check (documents, files)
-- (idx_project_members_project_user from migration 152 covers project_id+user_id but
--  access checks also filter on is_active)
CREATE INDEX IF NOT EXISTS idx_project_members_active_lookup
  ON project_members(project_id, user_id)
  WHERE is_active = true;

-- =============================================================================
-- SECTION 3: Document system indexes
-- =============================================================================

-- documents.project_id + is_archived + last_edited_at — getProjectDocuments query pattern
CREATE INDEX IF NOT EXISTS idx_documents_project_active_edited
  ON documents(project_id, is_archived, last_edited_at DESC);

-- document_versions.document_id + version_number — getDocumentVersions and getVersionSnapshot
-- (idx_document_versions_version_number from 005 covers this but restate for safety)
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_version
  ON document_versions(document_id, version_number DESC);

-- =============================================================================
-- SECTION 4: Files system indexes
-- =============================================================================

-- files.uploaded_by with soft-delete filter — getFileStats, listFiles owner filter
CREATE INDEX IF NOT EXISTS idx_files_uploader_active
  ON files(uploaded_by, created_at DESC)
  WHERE deleted_at IS NULL;

-- files.project_id with soft-delete filter — listFiles project filter, getProjectFiles
CREATE INDEX IF NOT EXISTS idx_files_project_active
  ON files(project_id, created_at DESC)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;

-- files.connector_file_id — getFileByConnectorFileId
CREATE INDEX IF NOT EXISTS idx_files_connector_file_active
  ON files(connector_file_id)
  WHERE deleted_at IS NULL AND connector_file_id IS NOT NULL;

-- =============================================================================
-- SECTION 5: Conversation system indexes
-- =============================================================================

-- conversations.project_id + type — getOrCreateProjectConversation filters by both
CREATE INDEX IF NOT EXISTS idx_conversations_project_type
  ON conversations(project_id, type)
  WHERE project_id IS NOT NULL;

-- message_read_receipts composite — getProjectUnreadCount joins on message_id + user_id
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_user
  ON message_read_receipts(message_id, user_id);

-- =============================================================================
-- SECTION 6: Update table statistics for the query planner
-- =============================================================================

ANALYZE formations;
ANALYZE formation_scene_objects;
ANALYZE project_members;
ANALYZE documents;
ANALYZE document_versions;
ANALYZE files;
ANALYZE conversations;
ANALYZE message_read_receipts;
