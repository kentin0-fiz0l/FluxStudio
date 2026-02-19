-- Add animations (keyframes) column to metmap_sections
ALTER TABLE metmap_sections
ADD COLUMN IF NOT EXISTS animations JSONB DEFAULT '[]';
