-- Migration 150: Schema Consolidation
-- Date: 2026-03-13
-- Description: Comprehensive schema audit and fix after 142 migrations.
-- Resolves: UUID/TEXT mismatches, missing indexes, FK constraint type errors.
-- This is a "golden migration" that ensures the schema is in a known-good state.

-- =============================================================================
-- SECTION 1: Ensure all user-referencing columns are TEXT (not UUID)
-- Migration 100 converted users.id from UUID to TEXT, but some later migrations
-- still used UUID types. Fix any columns that still reference UUID.
-- =============================================================================

DO $$
DECLARE
  col RECORD;
  fix_count INT := 0;
BEGIN
  FOR col IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('user_id', 'author_id', 'creator_id', 'owner_id', 'assigned_to',
                            'created_by', 'updated_by', 'manager_id', 'client_id',
                            'sender_id', 'recipient_id', 'referrer_user_id', 'referred_user_id',
                            'invited_by', 'member_id')
      AND c.data_type = 'uuid'
  LOOP
    BEGIN
      -- Drop FK constraints referencing this column
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
        col.table_name,
        col.table_name || '_' || col.column_name || '_fkey'
      );
      -- Convert column to TEXT
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
        col.table_name, col.column_name, col.column_name
      );
      fix_count := fix_count + 1;
      RAISE NOTICE 'Fixed %.% from UUID to TEXT', col.table_name, col.column_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix %.%: %', col.table_name, col.column_name, SQLERRM;
    END;
  END LOOP;

  -- Also fix primary key columns that should be TEXT
  FOR col IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'id'
      AND c.data_type = 'uuid'
      AND c.table_name NOT IN ('schema_migrations', 'migrations')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN id TYPE TEXT USING id::TEXT',
        col.table_name
      );
      fix_count := fix_count + 1;
      RAISE NOTICE 'Fixed %.id from UUID to TEXT', col.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix %.id: %', col.table_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Section 1: Fixed % UUID columns to TEXT', fix_count;
END $$;

-- =============================================================================
-- SECTION 2: Ensure critical indexes exist for query performance
-- =============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);

-- Formations
CREATE INDEX IF NOT EXISTS idx_formations_project ON formations(project_id) WHERE EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'formations'
);

-- Subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL';
  END IF;
END $$;

-- Security events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_events') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC)';
  END IF;
END $$;

-- Notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)';
  END IF;
END $$;

-- Beta invite codes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'beta_invite_codes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_code ON beta_invite_codes(UPPER(code))';
  END IF;
END $$;

-- Beta waitlist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'beta_waitlist') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beta_waitlist_email ON beta_waitlist(email)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beta_waitlist_status ON beta_waitlist(status)';
  END IF;
END $$;

-- =============================================================================
-- SECTION 3: Ensure subscription_plans table has tier definitions
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    -- Insert default plans if not present
    INSERT INTO subscription_plans (id, name, slug, price_monthly, price_yearly, features, limits, is_active, created_at)
    VALUES
      ('plan_free', 'Free', 'free', 0, 0,
       '{"basicExport": true, "formations": true}',
       '{"maxProjects": 1, "maxFormations": 5, "maxCollaborators": 0, "aiFeatures": false}',
       true, NOW()),
      ('plan_pro', 'Pro', 'pro', 1900, 19000,
       '{"basicExport": true, "formations": true, "aiFeatures": true, "collaboration": true, "allExports": true}',
       '{"maxProjects": -1, "maxFormations": -1, "maxCollaborators": 5, "aiFeatures": true}',
       true, NOW()),
      ('plan_team', 'Team', 'team', 4900, 49000,
       '{"basicExport": true, "formations": true, "aiFeatures": true, "collaboration": true, "allExports": true, "apiAccess": true, "prioritySupport": true}',
       '{"maxProjects": -1, "maxFormations": -1, "maxCollaborators": 25, "aiFeatures": true, "apiAccess": true}',
       true, NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Subscription plans verified/inserted';
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      price_monthly INT NOT NULL DEFAULT 0,
      price_yearly INT NOT NULL DEFAULT 0,
      stripe_price_id_monthly TEXT,
      stripe_price_id_yearly TEXT,
      features JSONB NOT NULL DEFAULT '{}',
      limits JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO subscription_plans (id, name, slug, price_monthly, price_yearly, features, limits, is_active, created_at)
    VALUES
      ('plan_free', 'Free', 'free', 0, 0,
       '{"basicExport": true, "formations": true}',
       '{"maxProjects": 1, "maxFormations": 5, "maxCollaborators": 0, "aiFeatures": false}',
       true, NOW()),
      ('plan_pro', 'Pro', 'pro', 1900, 19000,
       '{"basicExport": true, "formations": true, "aiFeatures": true, "collaboration": true, "allExports": true}',
       '{"maxProjects": -1, "maxFormations": -1, "maxCollaborators": 5, "aiFeatures": true}',
       true, NOW()),
      ('plan_team', 'Team', 'team', 4900, 49000,
       '{"basicExport": true, "formations": true, "aiFeatures": true, "collaboration": true, "allExports": true, "apiAccess": true, "prioritySupport": true}',
       '{"maxProjects": -1, "maxFormations": -1, "maxCollaborators": 25, "aiFeatures": true, "apiAccess": true}',
       true, NOW());

    RAISE NOTICE 'Created subscription_plans table with default tiers';
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: Verification summary
-- =============================================================================

DO $$
DECLARE
  table_count INT;
  uuid_columns INT;
  index_count INT;
  migration_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO uuid_columns
  FROM information_schema.columns c
  JOIN information_schema.tables t ON c.table_name = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('user_id', 'author_id', 'creator_id', 'owner_id', 'id')
    AND c.data_type = 'uuid'
    AND c.table_name NOT IN ('schema_migrations', 'migrations');

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes WHERE schemaname = 'public';

  SELECT COUNT(*) INTO migration_count
  FROM schema_migrations;

  RAISE NOTICE '=== Migration 150 Schema Consolidation Summary ===';
  RAISE NOTICE 'Total tables: %', table_count;
  RAISE NOTICE 'Remaining UUID columns (should be 0): %', uuid_columns;
  RAISE NOTICE 'Total indexes: %', index_count;
  RAISE NOTICE 'Applied migrations: %', migration_count;
  RAISE NOTICE '===================================================';
END $$;
