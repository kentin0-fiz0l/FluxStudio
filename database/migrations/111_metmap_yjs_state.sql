-- Sprint 30: Add Yjs CRDT state persistence column to metmap_songs
-- Stores binary Yjs document state for collaborative editing
ALTER TABLE metmap_songs ADD COLUMN IF NOT EXISTS yjs_state BYTEA;

-- Comment for documentation
COMMENT ON COLUMN metmap_songs.yjs_state IS 'Binary Yjs document state for real-time collaborative editing (CRDT)';
