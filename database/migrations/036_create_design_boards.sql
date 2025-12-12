-- Migration 036: Add Design Boards System Tables
-- Date: 2025-12-12
-- Description: Creates design_boards, design_board_nodes, and design_board_events tables
--              Design boards are 2D collaborative surfaces for placing nodes (text, shapes, assets)

-- Design boards table - 2D collaborative surfaces attached to projects
CREATE TABLE IF NOT EXISTS design_boards (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  organization_id TEXT,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_asset_id TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for design_boards table
CREATE INDEX IF NOT EXISTS idx_design_boards_project ON design_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_design_boards_org_archived ON design_boards(organization_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_design_boards_owner ON design_boards(owner_id);

-- Design board nodes table - items placed on a board
CREATE TABLE IF NOT EXISTS design_board_nodes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES design_boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  asset_id TEXT,
  z_index INTEGER NOT NULL DEFAULT 0,
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC,
  height NUMERIC,
  rotation NUMERIC NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for design_board_nodes table
CREATE INDEX IF NOT EXISTS idx_design_board_nodes_board ON design_board_nodes(board_id);
CREATE INDEX IF NOT EXISTS idx_design_board_nodes_board_zindex ON design_board_nodes(board_id, z_index);
CREATE INDEX IF NOT EXISTS idx_design_board_nodes_asset ON design_board_nodes(asset_id);
CREATE INDEX IF NOT EXISTS idx_design_board_nodes_type ON design_board_nodes(type);

-- Design board events table - audit log for board changes
CREATE TABLE IF NOT EXISTS design_board_events (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES design_boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for design_board_events table
CREATE INDEX IF NOT EXISTS idx_design_board_events_board ON design_board_events(board_id);
CREATE INDEX IF NOT EXISTS idx_design_board_events_board_created ON design_board_events(board_id, created_at);
CREATE INDEX IF NOT EXISTS idx_design_board_events_user ON design_board_events(user_id);

-- Add comments
COMMENT ON TABLE design_boards IS '2D collaborative surfaces attached to projects for visual layouts';
COMMENT ON COLUMN design_boards.project_id IS 'The project this board belongs to';
COMMENT ON COLUMN design_boards.thumbnail_asset_id IS 'Optional asset to use as board thumbnail';
COMMENT ON COLUMN design_boards.is_archived IS 'Whether the board is archived (hidden but not deleted)';

COMMENT ON TABLE design_board_nodes IS 'Items placed on a design board (text, shapes, assets)';
COMMENT ON COLUMN design_board_nodes.type IS 'Node type: text, asset, shape';
COMMENT ON COLUMN design_board_nodes.asset_id IS 'Reference to asset if type is asset';
COMMENT ON COLUMN design_board_nodes.z_index IS 'Stacking order (higher = on top)';
COMMENT ON COLUMN design_board_nodes.x IS 'X position on the board';
COMMENT ON COLUMN design_board_nodes.y IS 'Y position on the board';
COMMENT ON COLUMN design_board_nodes.rotation IS 'Rotation in degrees';
COMMENT ON COLUMN design_board_nodes.locked IS 'Whether the node is locked from editing';
COMMENT ON COLUMN design_board_nodes.data IS 'Type-specific data (text content, colors, shape type, etc.)';

COMMENT ON TABLE design_board_events IS 'Audit log of board changes for collaboration and history';
COMMENT ON COLUMN design_board_events.event_type IS 'Event type: node_created, node_updated, node_deleted, board_updated';
COMMENT ON COLUMN design_board_events.payload IS 'Event-specific data (node id, changes, etc.)';
