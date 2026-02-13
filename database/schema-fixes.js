/**
 * Database Schema Fixes
 * Extracted from server-unified.js - fixes table schema mismatches
 * that must run before database migrations.
 *
 * These fixes handle UUID-to-TEXT column type conversions and
 * missing column additions across multiple tables.
 */

const SCHEMA_FIX_SQL = `
  DO $$
  BEGIN
    -- =============================================
    -- FIX refresh_tokens TABLE
    -- =============================================

    -- Drop FK constraints that might block changes
    ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
    ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_user;

    -- Fix 1: Convert user_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'refresh_tokens'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE refresh_tokens ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      RAISE NOTICE 'Fixed: refresh_tokens.user_id converted from UUID to TEXT';
    END IF;

    -- Fix 2: Add 'token' column if it doesn't exist (code expects 'token', table has 'token_hash')
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'refresh_tokens'
      AND column_name = 'token'
    ) THEN
      -- If token_hash exists, rename it to token
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'refresh_tokens'
        AND column_name = 'token_hash'
      ) THEN
        ALTER TABLE refresh_tokens RENAME COLUMN token_hash TO token;
        RAISE NOTICE 'Fixed: refresh_tokens.token_hash renamed to token';
      ELSE
        -- Otherwise add token column
        ALTER TABLE refresh_tokens ADD COLUMN token TEXT;
        RAISE NOTICE 'Fixed: refresh_tokens.token column added';
      END IF;
    END IF;

    -- Fix 3: Add device_name column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'refresh_tokens'
      AND column_name = 'device_name'
    ) THEN
      ALTER TABLE refresh_tokens ADD COLUMN device_name VARCHAR(255);
      RAISE NOTICE 'Fixed: refresh_tokens.device_name column added';
    END IF;

    -- Fix 4: Add last_used_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'refresh_tokens'
      AND column_name = 'last_used_at'
    ) THEN
      ALTER TABLE refresh_tokens ADD COLUMN last_used_at TIMESTAMP DEFAULT NOW();
      RAISE NOTICE 'Fixed: refresh_tokens.last_used_at column added';
    END IF;

    -- Fix 5: Add revoked_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'refresh_tokens'
      AND column_name = 'revoked_at'
    ) THEN
      ALTER TABLE refresh_tokens ADD COLUMN revoked_at TIMESTAMP;
      RAISE NOTICE 'Fixed: refresh_tokens.revoked_at column added';
    END IF;

    -- =============================================
    -- FIX security_events TABLE
    -- =============================================

    -- Drop FK constraints
    ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
    ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_user_id;

    -- Convert security_events.user_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'security_events'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE security_events ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      RAISE NOTICE 'Fixed: security_events.user_id converted from UUID to TEXT';
    END IF;

    -- =============================================
    -- FIX organizations TABLE
    -- =============================================

    -- Drop FK constraints that reference organizations.id (only if tables exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
      ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;
      ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_organization_members_org_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
      ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_organization_id_fkey;
      ALTER TABLE teams DROP CONSTRAINT IF EXISTS fk_teams_organization_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_organization_id_fkey;
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_organization_id;
    END IF;

    -- Convert organizations.id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name = 'id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE organizations ALTER COLUMN id TYPE TEXT USING id::TEXT;
      RAISE NOTICE 'Fixed: organizations.id converted from UUID to TEXT';
    END IF;

    -- Convert organizations.owner_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name = 'owner_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE organizations ALTER COLUMN owner_id TYPE TEXT USING owner_id::TEXT;
      RAISE NOTICE 'Fixed: organizations.owner_id converted from UUID to TEXT';
    END IF;

    -- =============================================
    -- FIX organization_members TABLE (if exists)
    -- =============================================

    -- Convert organization_members.organization_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organization_members'
      AND column_name = 'organization_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE organization_members ALTER COLUMN organization_id TYPE TEXT USING organization_id::TEXT;
      RAISE NOTICE 'Fixed: organization_members.organization_id converted from UUID to TEXT';
    END IF;

    -- Convert organization_members.user_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organization_members'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE organization_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      RAISE NOTICE 'Fixed: organization_members.user_id converted from UUID to TEXT';
    END IF;

    -- =============================================
    -- FIX teams TABLE (if exists)
    -- =============================================

    -- Drop FK constraints (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
      ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
      ALTER TABLE team_members DROP CONSTRAINT IF EXISTS fk_team_members_team_id;
    END IF;

    -- Convert teams.id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'teams'
      AND column_name = 'id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE teams ALTER COLUMN id TYPE TEXT USING id::TEXT;
      RAISE NOTICE 'Fixed: teams.id converted from UUID to TEXT';
    END IF;

    -- Convert teams.organization_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'teams'
      AND column_name = 'organization_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE teams ALTER COLUMN organization_id TYPE TEXT USING organization_id::TEXT;
      RAISE NOTICE 'Fixed: teams.organization_id converted from UUID to TEXT';
    END IF;

    -- =============================================
    -- FIX team_members TABLE (if exists)
    -- =============================================

    -- Convert team_members.team_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'team_members'
      AND column_name = 'team_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE team_members ALTER COLUMN team_id TYPE TEXT USING team_id::TEXT;
      RAISE NOTICE 'Fixed: team_members.team_id converted from UUID to TEXT';
    END IF;

    -- Convert team_members.user_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'team_members'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE team_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      RAISE NOTICE 'Fixed: team_members.user_id converted from UUID to TEXT';
    END IF;

    -- =============================================
    -- FIX projects TABLE
    -- =============================================

    -- Convert projects.id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name = 'id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE projects ALTER COLUMN id TYPE TEXT USING id::TEXT;
      RAISE NOTICE 'Fixed: projects.id converted from UUID to TEXT';
    END IF;

    -- Convert projects.organization_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name = 'organization_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE projects ALTER COLUMN organization_id TYPE TEXT USING organization_id::TEXT;
      RAISE NOTICE 'Fixed: projects.organization_id converted from UUID to TEXT';
    END IF;

    -- Convert projects.team_id from UUID to TEXT if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name = 'team_id'
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE projects ALTER COLUMN team_id TYPE TEXT USING team_id::TEXT;
      RAISE NOTICE 'Fixed: projects.team_id converted from UUID to TEXT';
    END IF;

  END $$;
`;

/**
 * Run schema fixes to correct table schema mismatches.
 * Must run before database migrations.
 * @param {Function} queryFn - The database query function from database/config
 */
async function runSchemaFixes(queryFn) {
  console.log('🔧 Fixing database table schemas...');
  await queryFn(SCHEMA_FIX_SQL);
  console.log('✅ Database schema fixes complete');
}

module.exports = { runSchemaFixes };
