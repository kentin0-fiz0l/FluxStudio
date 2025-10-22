/**
 * PostgreSQL Database Configuration for FluxStudio
 * Provides connection pooling, query helpers, and migration utilities
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Enhanced database configuration with production optimization
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fluxstudio_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: false, // DigitalOcean uses self-signed certs
        sslmode: 'require'
      }
    : false,

  // Enhanced connection pool configuration
  max: process.env.NODE_ENV === 'production' ? 30 : 20, // Maximum number of clients in the pool
  min: process.env.NODE_ENV === 'production' ? 5 : 2,   // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  acquireTimeoutMillis: 60000, // Maximum time to wait for connection acquisition
  createTimeoutMillis: 30000, // Maximum time to wait for connection creation
  destroyTimeoutMillis: 5000, // Maximum time to wait for connection destruction
  reapIntervalMillis: 1000, // How often to check for idle connections to reap
  createRetryIntervalMillis: 200, // How long to wait before retrying connection creation

  // Advanced pool options
  propagateCreateError: false, // Don't crash on connection creation errors
  allowExitOnIdle: false, // Don't allow process to exit if pool is idle

  // Statement timeout (30 seconds)
  statement_timeout: 30000,
  query_timeout: 30000,

  // Application name for monitoring
  application_name: `fluxstudio-${process.env.NODE_ENV || 'development'}`
};

// Create connection pool
const pool = new Pool(dbConfig);

// Enhanced connection pool monitoring and error handling
pool.on('error', (err, client) => {
  console.error('🔴 Unexpected error on idle database client:', {
    error: err.message,
    code: err.code,
    timestamp: new Date().toISOString(),
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });

  // Don't exit the process in production, log and monitor instead
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

pool.on('connect', (client) => {
  console.log('🟢 New database client connected:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    timestamp: new Date().toISOString()
  });
});

pool.on('acquire', (client) => {
  console.log('🔵 Database client acquired from pool:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  console.log('🟡 Database client removed from pool:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Database connection test
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

// Enhanced query helper function with performance monitoring
async function query(text, params = [], options = {}) {
  const start = process.hrtime.bigint();
  const queryId = Math.random().toString(36).substr(2, 9);
  const isSlowQueryLogging = options.logSlowQueries !== false;
  const slowQueryThreshold = options.slowQueryThreshold || 1000; // 1 second

  try {
    // Log query start for slow query detection
    const startTime = Date.now();

    const res = await pool.query(text, params);

    const endTime = Date.now();
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
    const durationMs = Math.round(duration * 100) / 100;

    // Enhanced logging with performance metrics
    const queryInfo = {
      queryId,
      duration: durationMs,
      rows: res.rowCount,
      command: res.command,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      timestamp: new Date().toISOString()
    };

    // Log slow queries with more detail
    if (isSlowQueryLogging && durationMs > slowQueryThreshold) {
      console.warn('🐌 Slow query detected:', {
        ...queryInfo,
        query: text.replace(/\s+/g, ' ').substring(0, 200) + (text.length > 200 ? '...' : ''),
        params: params?.length > 0 ? `${params.length} params` : 'no params'
      });
    }

    // Log all queries in development with shorter format
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query [${queryId}] ${durationMs}ms - ${res.rowCount} rows`);
    }

    return res;
  } catch (err) {
    const duration = Number(process.hrtime.bigint() - start) / 1000000;

    console.error('❌ Database query error:', {
      queryId,
      error: err.message,
      code: err.code,
      duration: Math.round(duration * 100) / 100,
      query: text.replace(/\s+/g, ' ').substring(0, 100) + '...',
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      timestamp: new Date().toISOString()
    });

    throw err;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Schema initialization
async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔄 Initializing database schema...');
    await query(schema);
    console.log('✅ Database schema initialized successfully');

    return true;
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  }
}

// Migration utilities
async function runMigrations() {
  const migrationsPath = path.join(__dirname, 'migrations');

  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migration files
    if (!fs.existsSync(migrationsPath)) {
      console.log('📂 No migrations directory found');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('📄 No migration files found');
      return;
    }

    // Get executed migrations
    const executedResult = await query('SELECT filename FROM migrations');
    const executedMigrations = executedResult.rows.map(row => row.filename);

    // Run pending migrations
    for (const migrationFile of migrationFiles) {
      if (!executedMigrations.includes(migrationFile)) {
        console.log(`🔄 Running migration: ${migrationFile}`);

        const migrationPath = path.join(migrationsPath, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await transaction(async (client) => {
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [migrationFile]
          );
        });

        console.log(`✅ Migration completed: ${migrationFile}`);
      }
    }

    console.log('✅ All migrations completed');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  }
}

// Backup utilities
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `fluxstudio-backup-${timestamp}.sql`;
  const backupPath = path.join(__dirname, 'backups', backupFile);

  try {
    // Ensure backups directory exists
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Create backup using pg_dump (requires pg_dump to be available)
    const { spawn } = require('child_process');
    const pgDump = spawn('pg_dump', [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '--no-password',
      '-f', backupPath
    ], {
      env: { ...process.env, PGPASSWORD: dbConfig.password }
    });

    return new Promise((resolve, reject) => {
      pgDump.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Database backup created: ${backupFile}`);
          resolve(backupPath);
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', (err) => {
        console.error('❌ Backup error:', err.message);
        reject(err);
      });
    });
  } catch (err) {
    console.error('❌ Backup creation failed:', err.message);
    throw err;
  }
}

// User management helpers
const userQueries = {
  // Whitelist of allowed columns for user updates (prevents SQL injection)
  ALLOWED_UPDATE_COLUMNS: [
    'email', 'name', 'password_hash', 'user_type',
    'oauth_provider', 'oauth_id', 'profile_picture',
    'phone', 'last_login', 'is_active', 'updated_at'
  ],

  findByEmail: (email) => query('SELECT * FROM users WHERE email = $1', [email]),
  findById: (id) => query('SELECT * FROM users WHERE id = $1', [id]),
  create: (userData) => query(
    `INSERT INTO users (email, name, password_hash, user_type, oauth_provider, oauth_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userData.email, userData.name, userData.password_hash, userData.user_type, userData.oauth_provider, userData.oauth_id]
  ),
  update: (id, updates) => {
    // Validate and filter columns against whitelist
    const allowedUpdates = {};
    const invalidColumns = [];

    for (const [key, value] of Object.entries(updates)) {
      if (userQueries.ALLOWED_UPDATE_COLUMNS.includes(key)) {
        allowedUpdates[key] = value;
      } else {
        invalidColumns.push(key);
      }
    }

    // Throw error if invalid columns were provided
    if (invalidColumns.length > 0) {
      throw new Error(`Invalid columns for user update: ${invalidColumns.join(', ')}. Allowed columns: ${userQueries.ALLOWED_UPDATE_COLUMNS.join(', ')}`);
    }

    // Check if there are any valid columns to update
    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('No valid columns provided for update');
    }

    // Build parameterized query with whitelisted columns
    const fields = Object.keys(allowedUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(allowedUpdates)];

    return query(`UPDATE users SET ${fields} WHERE id = $1 RETURNING *`, values);
  }
};

// Project management helpers
const projectQueries = {
  findByOrganization: (orgId) => query('SELECT * FROM projects WHERE organization_id = $1', [orgId]),
  findById: (id) => query('SELECT * FROM projects WHERE id = $1', [id]),
  create: (projectData) => query(
    `INSERT INTO projects (name, description, slug, organization_id, manager_id, client_id, project_type, service_category, ensemble_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [projectData.name, projectData.description, projectData.slug, projectData.organization_id,
     projectData.manager_id, projectData.client_id, projectData.project_type,
     projectData.service_category, projectData.ensemble_type]
  ),
  updateStatus: (id, status) => query('UPDATE projects SET status = $2 WHERE id = $1 RETURNING *', [id, status])
};

// Organization helpers
const organizationQueries = {
  findBySlug: (slug) => query('SELECT * FROM organizations WHERE slug = $1', [slug]),
  findById: (id) => query('SELECT * FROM organizations WHERE id = $1', [id]),
  create: (orgData) => query(
    `INSERT INTO organizations (name, slug, description, type, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [orgData.name, orgData.slug, orgData.description, orgData.type, orgData.created_by]
  )
};

// Enhanced messaging queries with optimization
const messagingQueries = {
  // Optimized message retrieval with pagination
  getMessages: async (conversationId, limit = 50, offset = 0, userId = null) => {
    const baseQuery = `
      SELECT
        m.id,
        m.content,
        m.message_type,
        m.created_at,
        m.updated_at,
        m.reply_to_id,
        m.author_id,
        u.name as author_name,
        u.email as author_email,
        COALESCE(
          JSON_AGG(
            CASE WHEN a.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id', a.id,
                'filename', a.filename,
                'url', a.url,
                'file_type', a.file_type,
                'file_size', a.file_size
              )
            END
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) as attachments,
        ts_rank_cd(
          to_tsvector('english', m.content),
          plainto_tsquery('english', COALESCE($4, ''))
        ) as search_rank
      FROM messages m
      LEFT JOIN users u ON m.author_id = u.id
      LEFT JOIN message_attachments a ON m.id = a.message_id
      WHERE m.conversation_id = $1
      ${userId ? 'AND m.author_id = $5' : ''}
      GROUP BY m.id, u.name, u.email
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const params = [conversationId, limit, offset, ''];
    if (userId) params.push(userId);

    return await query(baseQuery, params, { slowQueryThreshold: 500 });
  },

  // Search messages with full-text search
  searchMessages: async (searchTerm, conversationId = null, limit = 20, offset = 0) => {
    const searchQuery = `
      SELECT
        m.id,
        m.content,
        m.message_type,
        m.created_at,
        m.conversation_id,
        u.name as author_name,
        u.email as author_email,
        c.name as conversation_name,
        ts_rank_cd(
          to_tsvector('english', m.content),
          plainto_tsquery('english', $1)
        ) as search_rank,
        ts_headline('english', m.content, plainto_tsquery('english', $1)) as highlighted_content
      FROM messages m
      LEFT JOIN users u ON m.author_id = u.id
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
      ${conversationId ? 'AND m.conversation_id = $5' : ''}
      ORDER BY search_rank DESC, m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const params = [searchTerm, limit, offset];
    if (conversationId) params.push(conversationId);

    return await query(searchQuery, params, { slowQueryThreshold: 800 });
  },

  // Get conversation list with latest message
  getConversationsWithLatestMessage: async (userId, limit = 20, offset = 0) => {
    const conversationsQuery = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (conversation_id)
          conversation_id,
          content as latest_content,
          created_at as latest_message_time,
          author_id as latest_author_id
        FROM messages
        ORDER BY conversation_id, created_at DESC
      )
      SELECT
        c.id,
        c.name,
        c.description,
        c.type,
        c.created_at,
        c.created_by,
        lm.latest_content,
        lm.latest_message_time,
        lm.latest_author_id,
        u.name as latest_author_name,
        COUNT(m.id) as message_count,
        COUNT(CASE WHEN m.created_at > up.last_read_at THEN 1 END) as unread_count
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN latest_messages lm ON c.id = lm.conversation_id
      LEFT JOIN users u ON lm.latest_author_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      LEFT JOIN user_presence up ON c.id = up.conversation_id AND up.user_id = $1
      WHERE cp.user_id = $1 AND cp.status = 'active'
      GROUP BY c.id, c.name, c.description, c.type, c.created_at, c.created_by,
               lm.latest_content, lm.latest_message_time, lm.latest_author_id,
               u.name, up.last_read_at
      ORDER BY lm.latest_message_time DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    return await query(conversationsQuery, [userId, limit, offset], { slowQueryThreshold: 600 });
  },

  // Get message thread (replies)
  getMessageThread: async (parentMessageId, limit = 50) => {
    const threadQuery = `
      WITH RECURSIVE message_thread AS (
        -- Base case: the parent message
        SELECT id, content, author_id, reply_to_id, created_at, 0 as depth
        FROM messages
        WHERE id = $1

        UNION ALL

        -- Recursive case: replies to messages in the thread
        SELECT m.id, m.content, m.author_id, m.reply_to_id, m.created_at, mt.depth + 1
        FROM messages m
        INNER JOIN message_thread mt ON m.reply_to_id = mt.id
        WHERE mt.depth < 10  -- Prevent infinite recursion
      )
      SELECT
        mt.*,
        u.name as author_name,
        u.email as author_email
      FROM message_thread mt
      LEFT JOIN users u ON mt.author_id = u.id
      ORDER BY mt.created_at ASC
      LIMIT $2
    `;

    return await query(threadQuery, [parentMessageId, limit], { slowQueryThreshold: 400 });
  }
};

// Database performance monitoring
async function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    config: {
      max: pool.options.max,
      min: pool.options.min,
      idleTimeoutMillis: pool.options.idleTimeoutMillis,
      connectionTimeoutMillis: pool.options.connectionTimeoutMillis
    },
    timestamp: new Date().toISOString()
  };
}

// Connection health check with detailed metrics
async function healthCheck() {
  try {
    const start = process.hrtime.bigint();
    const result = await pool.query('SELECT NOW() as server_time, version() as server_version');
    const duration = Number(process.hrtime.bigint() - start) / 1000000;

    const poolStats = await getPoolStats();

    return {
      status: 'healthy',
      serverTime: result.rows[0].server_time,
      serverVersion: result.rows[0].server_version,
      responseTime: Math.round(duration * 100) / 100,
      pool: poolStats,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message,
      code: err.code,
      pool: await getPoolStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Cleanup function
async function closePool() {
  try {
    await pool.end();
    console.log('📪 Database pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  initializeDatabase,
  runMigrations,
  createBackup,
  userQueries,
  projectQueries,
  organizationQueries,
  messagingQueries,
  getPoolStats,
  healthCheck,
  closePool
};