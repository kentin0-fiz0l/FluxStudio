-- Performance indexes for conversation access queries
-- Used by requireConversationAccess middleware and messaging routes

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv_user
  ON conversation_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conv_user
  ON conversation_members(conversation_id, user_id);
