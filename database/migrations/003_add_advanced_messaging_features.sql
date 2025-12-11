-- Migration: Add advanced messaging features for modern mobile chat
-- Created: 2025-12-11
-- Features: Pinned messages, link previews, mute settings, voice messages, delivery receipts

-- Pinned messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    pinned_by VARCHAR(255) NOT NULL,
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, conversation_id)
);

-- Link previews table for URL metadata caching
CREATE TABLE IF NOT EXISTS link_previews (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title VARCHAR(500),
    description TEXT,
    image_url TEXT,
    site_name VARCHAR(255),
    favicon_url TEXT,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message link previews junction table (message can have multiple links)
CREATE TABLE IF NOT EXISTS message_link_previews (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    link_preview_id TEXT NOT NULL,
    position INTEGER DEFAULT 0, -- order of link in message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, link_preview_id)
);

-- Voice messages metadata
CREATE TABLE IF NOT EXISTS voice_messages (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    duration_seconds INTEGER NOT NULL,
    waveform JSONB, -- array of amplitude values for visualization
    transcription TEXT, -- optional speech-to-text
    transcription_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message delivery receipts (who has seen the message)
CREATE TABLE IF NOT EXISTS message_receipts (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'delivered', -- delivered, read
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Add mute settings to conversation_participants if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_participants' AND column_name = 'is_muted'
    ) THEN
        ALTER TABLE conversation_participants ADD COLUMN is_muted BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_participants' AND column_name = 'muted_until'
    ) THEN
        ALTER TABLE conversation_participants ADD COLUMN muted_until TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_participants' AND column_name = 'notification_preference'
    ) THEN
        ALTER TABLE conversation_participants ADD COLUMN notification_preference VARCHAR(50) DEFAULT 'all'; -- all, mentions, none
    END IF;
END $$;

-- Add is_edited and edit_history to messages if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'is_edited'
    ) THEN
        ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'edit_history'
    ) THEN
        ALTER TABLE messages ADD COLUMN edit_history JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'forwarded_from'
    ) THEN
        ALTER TABLE messages ADD COLUMN forwarded_from TEXT; -- original message id if forwarded
    END IF;
END $$;

-- Add reaction counts cache to messages for performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'reaction_counts'
    ) THEN
        ALTER TABLE messages ADD COLUMN reaction_counts JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conversation ON pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_pinned_at ON pinned_messages(pinned_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_previews_url ON link_previews(url);
CREATE INDEX IF NOT EXISTS idx_link_previews_expires ON link_previews(expires_at);

CREATE INDEX IF NOT EXISTS idx_message_link_previews_message ON message_link_previews(message_id);

CREATE INDEX IF NOT EXISTS idx_voice_messages_message ON voice_messages(message_id);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message ON message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_user ON message_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_status ON message_receipts(status);

-- Index for muted conversations
CREATE INDEX IF NOT EXISTS idx_participants_muted ON conversation_participants(is_muted) WHERE is_muted = TRUE;

-- Trigger to update reaction_counts on message_reactions changes
CREATE OR REPLACE FUNCTION update_message_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE messages
        SET reaction_counts = (
            SELECT COALESCE(jsonb_object_agg(reaction, count), '{}'::jsonb)
            FROM (
                SELECT reaction, COUNT(*) as count
                FROM message_reactions
                WHERE message_id = NEW.message_id
                GROUP BY reaction
            ) counts
        )
        WHERE id = NEW.message_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE messages
        SET reaction_counts = (
            SELECT COALESCE(jsonb_object_agg(reaction, count), '{}'::jsonb)
            FROM (
                SELECT reaction, COUNT(*) as count
                FROM message_reactions
                WHERE message_id = OLD.message_id
                GROUP BY reaction
            ) counts
        )
        WHERE id = OLD.message_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reaction_counts ON message_reactions;
CREATE TRIGGER trigger_update_reaction_counts
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW EXECUTE FUNCTION update_message_reaction_counts();

-- Function to extract URLs from message content
CREATE OR REPLACE FUNCTION extract_urls(content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    url_pattern TEXT := 'https?://[^\s<>"{}|\\^`\[\]]+';
    urls TEXT[];
BEGIN
    SELECT ARRAY(
        SELECT (regexp_matches(content, url_pattern, 'gi'))[1]
    ) INTO urls;
    RETURN urls;
END;
$$ LANGUAGE plpgsql;

-- View for conversation with unread count per user
CREATE OR REPLACE VIEW conversation_unread_counts AS
SELECT
    cp.conversation_id,
    cp.user_id,
    COALESCE(
        COUNT(m.id) FILTER (
            WHERE m.created_at > COALESCE(up.last_read_at, '1970-01-01'::timestamp)
            AND m.author_id != cp.user_id
        ),
        0
    ) as unread_count
FROM conversation_participants cp
LEFT JOIN user_presence up ON cp.conversation_id = up.conversation_id AND cp.user_id = up.user_id
LEFT JOIN messages m ON cp.conversation_id = m.conversation_id
WHERE cp.status = 'active'
GROUP BY cp.conversation_id, cp.user_id, up.last_read_at;

-- Comments
COMMENT ON TABLE pinned_messages IS 'Messages pinned by users in conversations for quick access';
COMMENT ON TABLE link_previews IS 'Cached URL metadata for rich link previews';
COMMENT ON TABLE voice_messages IS 'Voice message metadata with waveform and transcription';
COMMENT ON TABLE message_receipts IS 'Delivery and read receipts per user per message';
