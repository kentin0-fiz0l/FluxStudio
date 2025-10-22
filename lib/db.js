/**
 * Database Query Wrapper
 *
 * Provides a unified query interface for database operations.
 * Part of: Week 1 Security Sprint - JWT Refresh Tokens
 * Date: 2025-10-15
 */

const { Pool } = require('pg');

// Parse DATABASE_URL and add SSL configuration
const connectionConfig = (() => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const config = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  // In production, override SSL configuration to accept self-signed certs
  if (process.env.NODE_ENV === 'production') {
    // Remove any SSL parameters from the connection string
    config.connectionString = config.connectionString.replace(/[?&]sslmode=[^&]+/g, '');

    // Explicitly set SSL configuration
    config.ssl = {
      rejectUnauthorized: false,
      // DigitalOcean uses self-signed certificates
    };
  }

  return config;
})();

// Create connection pool with SSL configuration
const pool = new Pool(connectionConfig);

// Log SSL configuration in production
if (process.env.NODE_ENV === 'production') {
  console.log('✅ Database pool created with SSL configuration (rejectUnauthorized: false)');
}

/**
 * Execute a SQL query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (>1000ms)
    if (duration > 1000) {
      console.warn('Slow query detected:', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error('Database query error:', { text, error: error.message });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Close the database pool
 */
async function end() {
  await pool.end();
}

module.exports = {
  query,
  getClient,
  end,
  pool
};
