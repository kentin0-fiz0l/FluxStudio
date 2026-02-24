-- Migration: 128_fulltext_search_indexes
-- Add GIN indexes for PostgreSQL full-text search across projects, files, tasks, and messages

CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_files_search ON files USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(to_tsvector('english', coalesce(text, '')));
