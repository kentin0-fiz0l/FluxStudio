-- Migration 022: File Previews Table
-- Stores generated previews/thumbnails for files

CREATE TABLE IF NOT EXISTS file_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,

  -- Preview type and storage
  preview_type VARCHAR(50) NOT NULL, -- 'thumbnail', 'pdf_page', 'text_snippet', 'waveform', 'poster'
  storage_key TEXT NOT NULL, -- Path/key in storage backend

  -- Dimensions (for image/video previews)
  width INTEGER,
  height INTEGER,

  -- Page number (for PDF/document previews)
  page_number INTEGER,

  -- Content (for text snippets)
  text_content TEXT,

  -- Metadata
  mime_type VARCHAR(255),
  size_bytes BIGINT,

  -- Generation status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_previews_file_id ON file_previews(file_id);
CREATE INDEX IF NOT EXISTS idx_file_previews_type ON file_previews(preview_type);
CREATE INDEX IF NOT EXISTS idx_file_previews_file_type ON file_previews(file_id, preview_type);
CREATE INDEX IF NOT EXISTS idx_file_previews_status ON file_previews(status);

-- Unique constraint for file + preview type + page
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_previews_unique
  ON file_previews(file_id, preview_type, COALESCE(page_number, 0));

-- Constraints
ALTER TABLE file_previews DROP CONSTRAINT IF EXISTS valid_preview_type;
ALTER TABLE file_previews ADD CONSTRAINT valid_preview_type CHECK (
  preview_type IN ('thumbnail', 'pdf_page', 'text_snippet', 'waveform', 'poster', 'medium', 'large')
);

ALTER TABLE file_previews DROP CONSTRAINT IF EXISTS valid_preview_status;
ALTER TABLE file_previews ADD CONSTRAINT valid_preview_status CHECK (
  status IN ('pending', 'processing', 'completed', 'failed')
);

-- Trigger for updated_at
CREATE TRIGGER update_file_previews_updated_at
  BEFORE UPDATE ON file_previews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE file_previews IS 'Stores generated previews and thumbnails for files';
COMMENT ON COLUMN file_previews.preview_type IS 'Type of preview: thumbnail, pdf_page, text_snippet, waveform, poster';
COMMENT ON COLUMN file_previews.storage_key IS 'Storage backend path/key for the preview file';
COMMENT ON COLUMN file_previews.page_number IS 'Page number for multi-page document previews';
COMMENT ON COLUMN file_previews.text_content IS 'Extracted text content for text_snippet previews';
