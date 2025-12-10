-- Migration: Add message threading and full-text search functionality
-- Created: 2025-10-12
-- Sprint 8: Database Optimization & Advanced Messaging
-- Updated: Use TEXT ids for MetMap CUID compatibility

-- Add message attachments table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
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

-- Add conversation participants table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'left', 'removed'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Add user presence table for read receipts and last activity (TEXT ids)
CREATE TABLE IF NOT EXISTS user_presence (
    id TEXT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id TEXT NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    typing_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, conversation_id)
);

-- Add thread metadata table for optimized thread operations (TEXT ids)
CREATE TABLE IF NOT EXISTS message_threads (
    id TEXT PRIMARY KEY,
    root_message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    thread_title VARCHAR(500),
    participant_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(root_message_id)
);

-- Add indexes conditionally (only if columns exist)
DO $$
BEGIN
  -- Message attachments indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_attachments' AND column_name = 'message_id') THEN
    CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_attachments' AND column_name = 'file_type') THEN
    CREATE INDEX IF NOT EXISTS idx_message_attachments_file_type ON message_attachments(file_type);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_attachments' AND column_name = 'security_scan_status') THEN
    CREATE INDEX IF NOT EXISTS idx_message_attachments_security_status ON message_attachments(security_scan_status);
  END IF;

  -- Conversation participants indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_participants' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_status ON conversation_participants(status);
  END IF;

  -- User presence indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_presence_conversation_id ON user_presence(conversation_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'last_active_at') THEN
    CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON user_presence(last_active_at);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_presence' AND column_name = 'is_typing') THEN
    CREATE INDEX IF NOT EXISTS idx_user_presence_typing ON user_presence(is_typing) WHERE is_typing = TRUE;
  END IF;

  -- Message threads indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_threads' AND column_name = 'conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_message_threads_conversation_id ON message_threads(conversation_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_threads' AND column_name = 'last_activity_at') THEN
    CREATE INDEX IF NOT EXISTS idx_message_threads_last_activity ON message_threads(last_activity_at);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_threads' AND column_name = 'message_count') THEN
    CREATE INDEX IF NOT EXISTS idx_message_threads_message_count ON message_threads(message_count);
  END IF;

  -- Messages full-text search and optimized indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING gin(to_tsvector('english', content));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'author_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_author_created ON messages(author_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to_id') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
  END IF;

  -- Conversations indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'type') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Index creation warning: %', SQLERRM;
END $$;

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

-- Add triggers conditionally (only if tables exist)
DO $$
BEGIN
  -- Add trigger to update message thread statistics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN

    CREATE OR REPLACE FUNCTION update_thread_stats()
    RETURNS TRIGGER AS $func$
    BEGIN
        -- Update thread statistics when messages are inserted/deleted
        IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
            INSERT INTO message_threads (id, root_message_id, conversation_id, message_count, last_activity_at)
            VALUES (
                'thread-' || NEW.reply_to_id,
                NEW.reply_to_id,
                NEW.conversation_id,
                1,
                NEW.created_at
            )
            ON CONFLICT (root_message_id)
            DO UPDATE SET
                message_count = message_threads.message_count + 1,
                last_activity_at = NEW.created_at;
        END IF;

        IF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL THEN
            UPDATE message_threads
            SET
                message_count = GREATEST(message_count - 1, 0),
                last_activity_at = NOW()
            WHERE root_message_id = OLD.reply_to_id;
        END IF;

        RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_thread_stats ON messages;
    CREATE TRIGGER trigger_update_thread_stats
        AFTER INSERT OR DELETE ON messages
        FOR EACH ROW EXECUTE FUNCTION update_thread_stats();

    RAISE NOTICE 'Thread stats trigger created';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create thread stats trigger: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Add trigger to update conversation last_activity
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN

    CREATE OR REPLACE FUNCTION update_conversation_activity()
    RETURNS TRIGGER AS $func$
    BEGIN
        UPDATE conversations
        SET updated_at = COALESCE(NEW.created_at, OLD.created_at, NOW())
        WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);

        RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_conversation_activity ON messages;
    CREATE TRIGGER trigger_update_conversation_activity
        AFTER INSERT OR UPDATE OR DELETE ON messages
        FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();

    RAISE NOTICE 'Conversation activity trigger created';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create conversation activity trigger: %', SQLERRM;
END $$;

-- Add performance optimization views conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN

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
        MAX(m.created_at) as last_message_at
    FROM conversations c
    LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
    LEFT JOIN messages m ON c.id = m.conversation_id
    LEFT JOIN message_threads mt ON c.id = mt.conversation_id
    GROUP BY c.id, c.name, c.description, c.type, c.created_at, c.created_by;

    RAISE NOTICE 'conversation_summary view created';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create conversation_summary view: %', SQLERRM;
END $$;

-- Add search helper function conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN

    CREATE OR REPLACE FUNCTION search_messages_advanced(
        search_term TEXT,
        p_user_id TEXT DEFAULT NULL,
        p_conversation_id TEXT DEFAULT NULL,
        date_from TIMESTAMP DEFAULT NULL,
        date_to TIMESTAMP DEFAULT NULL,
        limit_count INTEGER DEFAULT 20,
        offset_count INTEGER DEFAULT 0
    )
    RETURNS TABLE (
        message_id TEXT,
        content TEXT,
        highlighted_content TEXT,
        author_name TEXT,
        conversation_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE,
        search_rank REAL
    ) AS $func$
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
            AND (p_user_id IS NULL OR cp.user_id = p_user_id)
            AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
            AND (date_from IS NULL OR m.created_at >= date_from)
            AND (date_to IS NULL OR m.created_at <= date_to)
            AND (p_user_id IS NULL OR cp.status = 'active')
        ORDER BY search_rank DESC, m.created_at DESC
        LIMIT limit_count OFFSET offset_count;
    END;
    $func$ LANGUAGE plpgsql;

    RAISE NOTICE 'search_messages_advanced function created';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create search_messages_advanced function: %', SQLERRM;
END $$;

-- Add helpful comments conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_attachments') THEN
    COMMENT ON TABLE message_attachments IS 'File attachments for messages with security scanning';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN
    COMMENT ON TABLE message_threads IS 'Thread metadata for optimized thread operations';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
    COMMENT ON TABLE user_presence IS 'User presence and read receipt tracking';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add table comments: %', SQLERRM;
END $$;
