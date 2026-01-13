/**
 * Redis Caching Layer for FluxStudio
 * Provides intelligent caching for database queries and API responses
 * Sprint 11 - Performance Optimization
 */

const redis = require('redis');

// Parse REDIS_URL if provided, otherwise use individual components
function getRedisConfig() {
  if (process.env.REDIS_URL) {
    // Use REDIS_URL connection string
    return {
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis max retries reached, giving up');
            return new Error('Max retries reached');
          }
          return Math.min(retries * 50, 3000);
        },
        tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined
      },
      enableOfflineQueue: true,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('❌ Redis max retries reached, giving up');
          return new Error('Max retries reached');
        }
        return Math.min(retries * 50, 3000);
      }
    },
    enableOfflineQueue: true,
    enableAutoPipelining: true,
    maxRetriesPerRequest: 3
  };
}

const CACHE_CONFIG = getRedisConfig();

// Cache TTL (Time To Live) settings in seconds
const TTL = {
  SHORT: 60,                    // 1 minute - frequently changing data
  MEDIUM: 300,                  // 5 minutes - moderate change frequency
  LONG: 1800,                   // 30 minutes - rarely changing data
  VERY_LONG: 3600,              // 1 hour - very stable data
  DAY: 86400,                   // 24 hours - static/configuration data
  WEEK: 604800                  // 7 days - immutable data
};

// Create Redis client
let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
async function initializeCache() {
  try {
    // Skip if already connected
    if (redisClient && isConnected) {
      console.log('✅ Redis cache already connected');
      return redisClient;
    }

    console.log('🔄 Connecting to Redis cache...');

    redisClient = redis.createClient(CACHE_CONFIG);

    // Event handlers
    redisClient.on('connect', () => {
      console.log('🟢 Redis client connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      console.log('✅ Redis cache connected and ready');
    });

    redisClient.on('error', (err) => {
      console.error('🔴 Redis error:', err.message);
      isConnected = false;
    });

    redisClient.on('end', () => {
      console.log('🔴 Redis connection closed');
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('🟡 Redis reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (err) {
    console.error('❌ Redis initialization failed:', err.message);
    console.warn('⚠️  Continuing without cache (degraded performance)');
    isConnected = false;
    return null;
  }
}

/**
 * Check if cache is available
 */
function isCacheAvailable() {
  return isConnected && redisClient && redisClient.isReady;
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
async function get(key) {
  if (!isCacheAvailable()) {
    return null;
  }

  try {
    const value = await redisClient.get(key);

    if (value) {
      // Parse JSON if it's an object
      try {
        return JSON.parse(value);
      } catch (e) {
        // Return as string if not JSON
        return value;
      }
    }

    return null;
  } catch (err) {
    console.error(`❌ Cache GET error for key "${key}":`, err.message);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: MEDIUM)
 * @returns {Promise<boolean>} - Success status
 */
async function set(key, value, ttl = TTL.MEDIUM) {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    // Serialize objects to JSON
    const serializedValue = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

    await redisClient.setEx(key, ttl, serializedValue);
    return true;
  } catch (err) {
    console.error(`❌ Cache SET error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
async function del(key) {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.error(`❌ Cache DEL error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., "user:*")
 * @returns {Promise<number>} - Number of keys deleted
 */
async function deletePattern(pattern) {
  if (!isCacheAvailable()) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    await redisClient.del(keys);
    return keys.length;
  } catch (err) {
    console.error(`❌ Cache DELETE PATTERN error for pattern "${pattern}":`, err.message);
    return 0;
  }
}

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (err) {
    console.error(`❌ Cache EXISTS error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Increment counter
 * @param {string} key - Counter key
 * @param {number} increment - Amount to increment (default: 1)
 * @returns {Promise<number>} - New value
 */
async function incr(key, increment = 1) {
  if (!isCacheAvailable()) {
    return 0;
  }

  try {
    return await redisClient.incrBy(key, increment);
  } catch (err) {
    console.error(`❌ Cache INCR error for key "${key}":`, err.message);
    return 0;
  }
}

/**
 * Set expiration on existing key
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>}
 */
async function expire(key, ttl) {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    await redisClient.expire(key, ttl);
    return true;
  } catch (err) {
    console.error(`❌ Cache EXPIRE error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Get or set pattern - fetch from cache or execute function and cache result
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>}
 */
async function getOrSet(key, fetchFn, ttl = TTL.MEDIUM) {
  // Try to get from cache first
  const cached = await get(key);

  if (cached !== null) {
    return cached;
  }

  // If not in cache, fetch the data
  try {
    const data = await fetchFn();

    // Cache the result
    await set(key, data, ttl);

    return data;
  } catch (err) {
    console.error(`❌ Cache getOrSet error for key "${key}":`, err.message);
    throw err;
  }
}

/**
 * Cache key builders for common patterns
 */
const buildKey = {
  user: (userId) => `user:${userId}`,
  userByEmail: (email) => `user:email:${email}`,
  userProjects: (userId) => `user:${userId}:projects`,
  userOrganizations: (userId) => `user:${userId}:organizations`,
  userTeams: (userId) => `user:${userId}:teams`,

  organization: (orgId) => `org:${orgId}`,
  organizationProjects: (orgId) => `org:${orgId}:projects`,
  organizationMembers: (orgId) => `org:${orgId}:members`,

  project: (projectId) => `project:${projectId}`,
  projectMembers: (projectId) => `project:${projectId}:members`,
  projectFiles: (projectId) => `project:${projectId}:files`,
  projectMilestones: (projectId) => `project:${projectId}:milestones`,

  file: (fileId) => `file:${fileId}`,
  fileVersions: (fileId) => `file:${fileId}:versions`,

  conversation: (convId) => `conv:${convId}`,
  conversationMessages: (convId, page = 1) => `conv:${convId}:messages:page:${page}`,
  conversationParticipants: (convId) => `conv:${convId}:participants`,

  userConversations: (userId) => `user:${userId}:conversations`,
  unreadCount: (userId, convId) => `user:${userId}:unread:${convId}`,

  analytics: {
    userActivity: (userId, date) => `analytics:user:${userId}:activity:${date}`,
    projectStats: (projectId) => `analytics:project:${projectId}:stats`,
    orgDashboard: (orgId) => `analytics:org:${orgId}:dashboard`,
  },

  session: (sessionId) => `session:${sessionId}`,
  token: (token) => `token:${token}`,

  rateLimit: (ip, endpoint) => `ratelimit:${ip}:${endpoint}`,
};

/**
 * Invalidation helpers
 */
const invalidate = {
  user: async (userId) => {
    return await deletePattern(`user:${userId}*`);
  },

  organization: async (orgId) => {
    return await deletePattern(`org:${orgId}*`);
  },

  project: async (projectId) => {
    return await deletePattern(`project:${projectId}*`);
  },

  file: async (fileId) => {
    return await deletePattern(`file:${fileId}*`);
  },

  conversation: async (convId) => {
    return await deletePattern(`conv:${convId}*`);
  },
};

/**
 * Cache statistics
 */
async function getStats() {
  if (!isCacheAvailable()) {
    return {
      connected: false,
      error: 'Cache not available'
    };
  }

  try {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbSize();

    return {
      connected: true,
      dbSize,
      info: info,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message
    };
  }
}

/**
 * Flush all cache (use with caution!)
 */
async function flushAll() {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    await redisClient.flushDb();
    console.log('⚠️  Cache flushed (all keys deleted)');
    return true;
  } catch (err) {
    console.error('❌ Cache flush error:', err.message);
    return false;
  }
}

/**
 * Close Redis connection
 */
async function closeCache() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('📪 Redis cache connection closed');
      isConnected = false;
    } catch (err) {
      console.error('Error closing Redis connection:', err.message);
    }
  }
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    if (!isCacheAvailable()) {
      return {
        status: 'unhealthy',
        connected: false,
        message: 'Redis not connected'
      };
    }

    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    const stats = await getStats();

    return {
      status: 'healthy',
      connected: true,
      latency: `${latency}ms`,
      dbSize: stats.dbSize,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      connected: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get all keys matching a pattern using SCAN (safe for production)
 * @param {string} pattern - Key pattern (e.g., "ip_reputation:*")
 * @returns {Promise<Array>} - Array of matching keys
 */
async function getAllKeys(pattern) {
  if (!isCacheAvailable()) {
    return [];
  }

  try {
    const keys = [];
    let cursor = '0';

    // Use SCAN instead of KEYS for production safety
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });

      cursor = reply.cursor;
      keys.push(...reply.keys);
    } while (cursor !== '0');

    return keys;
  } catch (err) {
    console.error(`❌ Cache getAllKeys error for pattern "${pattern}":`, err.message);
    return [];
  }
}

module.exports = {
  // Core functions
  initializeCache,
  isCacheAvailable,
  get,
  set,
  del,
  deletePattern,
  exists,
  incr,
  expire,
  getOrSet,
  getAllKeys,

  // Key builders
  buildKey,

  // Invalidation
  invalidate,

  // Utilities
  getStats,
  flushAll,
  closeCache,
  healthCheck,

  // Constants
  TTL,
};
