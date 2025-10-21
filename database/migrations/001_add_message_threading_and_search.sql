-- Migration: Add message threading and full-text search functionality
-- Created: 2025-10-12
-- Sprint 8: Database Optimization & Advanced Messaging

-- Add message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(200),
    security_scan_status VARCHAR(50) DEFAULT 'pending',
    security_scan_result JSONB,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for message attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_file_type ON message_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_message_attachments_security_status ON message_attachments(security_scan_status);

-- Add conversation participants table (if not exists)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'left', 'removed'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Add indexes for conversation participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_status ON conversation_participants(status);

-- Add user presence table for read receipts and last activity
CREATE TABLE IF NOT EXISTS user_presence (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    typing_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, conversation_id)
);

-- Add indexes for user presence
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_conversation_id ON user_presence(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON user_presence(last_active_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_typing ON user_presence(is_typing) WHERE is_typing = TRUE;

-- Add thread metadata table for optimized thread operations
CREATE TABLE IF NOT EXISTS message_threads (
    id SERIAL PRIMARY KEY,
    root_message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    thread_title VARCHAR(500),
    participant_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(root_message_id)
);

-- Add indexes for message threads
CREATE INDEX IF NOT EXISTS idx_message_threads_conversation_id ON message_threads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_activity ON message_threads(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_message_threads_message_count ON message_threads(message_count);

-- Add full-text search indexes on messages content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING gin(to_tsvector('english', content));

-- Add optimized indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author_created ON messages(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Add optimized indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Add trigger to update message thread statistics
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread statistics when messages are inserted/updated/deleted
    IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
        -- Get the root message of the thread
        WITH root_message AS (
            SELECT
                CASE
                    WHEN (SELECT reply_to_id FROM messages WHERE id = NEW.reply_to_id) IS NULL
                    THEN NEW.reply_to_id
                    ELSE (
                        WITH RECURSIVE thread_root AS (
                            SELECT id, reply_to_id FROM messages WHERE id = NEW.reply_to_id
                            UNION ALL
                            SELECT m.id, m.reply_to_id
                            FROM messages m
                            INNER JOIN thread_root tr ON m.id = tr.reply_to_id
                            WHERE tr.reply_to_id IS NOT NULL
                        )
                        SELECT id FROM thread_root WHERE reply_to_id IS NULL LIMIT 1
                    )
                END as root_id
        )
        INSERT INTO message_threads (root_message_id, conversation_id, message_count, last_activity_at)
        SELECT root_id, NEW.conversation_id, 1, NEW.created_at
        FROM root_message
        ON CONFLICT (root_message_id)
        DO UPDATE SET
            message_count = message_threads.message_count + 1,
            last_activity_at = NEW.created_at;
    END IF;

    IF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL THEN
        -- Decrease thread count
        UPDATE message_threads
        SET
            message_count = GREATEST(message_count - 1, 0),
            last_activity_at = NOW()
        WHERE root_message_id = OLD.reply_to_id
           OR root_message_id = (
               WITH RECURSIVE thread_root AS (
                   SELECT id, reply_to_id FROM messages WHERE id = OLD.reply_to_id
                   UNION ALL
                   SELECT m.id, m.reply_to_id
                   FROM messages m
                   INNER JOIN thread_root tr ON m.id = tr.reply_to_id
                   WHERE tr.reply_to_id IS NOT NULL
               )
               SELECT id FROM thread_root WHERE reply_to_id IS NULL LIMIT 1
           );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thread stats
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON messages;
CREATE TRIGGER trigger_update_thread_stats
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_thread_stats();

-- Add trigger to update conversation last_activity
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = COALESCE(NEW.created_at, OLD.created_at, NOW())
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversation activity
DROP TRIGGER IF EXISTS trigger_update_conversation_activity ON messages;
CREATE TRIGGER trigger_update_conversation_activity
    AFTER INSERT OR UPDATE OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();

-- Add file security scanning status enum (if using enums)
DO $$ BEGIN
    CREATE TYPE security_scan_status AS ENUM ('pending', 'scanning', 'clean', 'threat_detected', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add file type categorization function
CREATE OR REPLACE FUNCTION categorize_file_type(mime_type TEXT, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Categorize files for better organization
    CASE
        WHEN mime_type LIKE 'image/%' THEN RETURN 'image';
        WHEN mime_type LIKE 'video/%' THEN RETURN 'video';
        WHEN mime_type LIKE 'audio/%' THEN RETURN 'audio';
        WHEN mime_type IN ('application/pdf') THEN RETURN 'document';
        WHEN mime_type LIKE 'text/%' THEN RETURN 'text';
        WHEN filename LIKE '%.zip' OR filename LIKE '%.rar' OR filename LIKE '%.7z' THEN RETURN 'archive';
        ELSE RETURN 'other';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Add performance optimization views
CREATE OR REPLACE VIEW conversation_summary AS
SELECT
    c.id,
    c.name,
    c.description,
    c.type,
    c.created_at,
    c.created_by,
    COUNT(DISTINCT cp.user_id) as participant_count,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT mt.id) as thread_count,
    MAX(m.created_at) as last_message_at,
    MAX(cp.last_active_at) as last_activity_at
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN message_threads mt ON c.id = mt.conversation_id
GROUP BY c.id, c.name, c.description, c.type, c.created_at, c.created_by;

-- Add search helper function
CREATE OR REPLACE FUNCTION search_messages_advanced(
    search_term TEXT,
    user_id TEXT DEFAULT NULL,
    conversation_id INTEGER DEFAULT NULL,
    date_from TIMESTAMP DEFAULT NULL,
    date_to TIMESTAMP DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id INTEGER,
    content TEXT,
    highlighted_content TEXT,
    author_name TEXT,
    conversation_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        ts_headline('english', m.content, plainto_tsquery('english', search_term)) as highlighted_content,
        u.name as author_name,
        c.name as conversation_name,
        m.created_at,
        ts_rank_cd(to_tsvector('english', m.content), plainto_tsquery('english', search_term)) as search_rank
    FROM messages m
    LEFT JOIN users u ON m.author_id = u.id
    LEFT JOIN conversations c ON m.conversation_id = c.id
    LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE
        to_tsvector('english', m.content) @@ plainto_tsquery('english', search_term)
        AND (user_id IS NULL OR cp.user_id = $2)
        AND (conversation_id IS NULL OR m.conversation_id = $3)
        AND (date_from IS NULL OR m.created_at >= $4)
        AND (date_to IS NULL OR m.created_at <= $5)
        AND (user_id IS NULL OR cp.status = 'active')
    ORDER BY search_rank DESC, m.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust user as needed)
-- GRANT USAGE ON SCHEMA public TO fluxstudio_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fluxstudio_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fluxstudio_app;

-- Add helpful comment
COMMENT ON TABLE message_attachments IS 'File attachments for messages with security scanning';
COMMENT ON TABLE message_threads IS 'Thread metadata for optimized thread operations';
COMMENT ON TABLE user_presence IS 'User presence and read receipt tracking';
COMMENT ON INDEX idx_messages_content_fts IS 'Full-text search index for message content';