/**
 * MCP Configuration
 * Model Context Protocol Server Configuration
 *
 * Configures available MCP servers for Flux Studio
 */

require('dotenv').config();

module.exports = {
  servers: {
    /**
     * PostgreSQL MCP Server
     * Enables natural language queries against the PostgreSQL database
     */
    postgres: {
      enabled: process.env.MCP_POSTGRES_ENABLED !== 'false', // Enabled by default
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL],
      env: {
        // Pass through DATABASE_URL from environment
        DATABASE_URL: process.env.DATABASE_URL
      },
      description: 'PostgreSQL database access with natural language queries',
      tools: ['query', 'schema', 'tables', 'describe_table'],
      maxRetries: 3,
      timeout: 30000 // 30 seconds
    },

    /**
     * Figma MCP Server (Optional - can use direct API instead)
     * Enables access to Figma files, comments, and version history via MCP
     */
    figma: {
      enabled: process.env.MCP_FIGMA_ENABLED === 'true', // Disabled by default (use direct API)
      command: 'npx',
      args: ['-y', '@figma/mcp-server'],
      env: {
        FIGMA_ACCESS_TOKEN: process.env.FIGMA_ACCESS_TOKEN || '' // For non-OAuth access
      },
      description: 'Figma file access and manipulation',
      tools: ['get_file', 'get_comments', 'post_comment', 'get_team_projects'],
      maxRetries: 3,
      timeout: 30000
    },

    /**
     * File System MCP Server (Future Enhancement)
     * Provides secure file system access for uploads, exports, etc.
     */
    filesystem: {
      enabled: process.env.MCP_FILESYSTEM_ENABLED === 'true',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/var/www/fluxstudio/uploads'],
      env: {},
      description: 'Secure file system operations',
      tools: ['read_file', 'write_file', 'list_directory'],
      maxRetries: 2,
      timeout: 10000
    },

    /**
     * Git MCP Server (Future Enhancement)
     * For projects with Git integration
     */
    git: {
      enabled: process.env.MCP_GIT_ENABLED === 'true',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      env: {},
      description: 'Git repository operations',
      tools: ['git_status', 'git_diff', 'git_log', 'git_commit'],
      maxRetries: 2,
      timeout: 15000
    }
  },

  /**
   * Global MCP Settings
   */
  settings: {
    // Auto-connect to MCP servers on application startup
    autoConnect: process.env.MCP_AUTO_CONNECT !== 'false',

    // Enable MCP query caching (caches query results for 5 minutes)
    enableCaching: process.env.MCP_ENABLE_CACHING !== 'false',
    cacheTTL: 300, // 5 minutes

    // Log all MCP queries for debugging
    logQueries: process.env.NODE_ENV !== 'production',

    // Maximum concurrent MCP connections
    maxConcurrentConnections: 5,

    // Retry configuration
    retryDelay: 1000, // 1 second between retries
    exponentialBackoff: true
  },

  /**
   * Security Settings
   */
  security: {
    // Only allow MCP queries from authenticated users
    requireAuth: true,

    // Rate limiting for MCP queries
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 30 // 30 requests per minute
    },

    // Allowed tables for PostgreSQL MCP (empty = all tables allowed)
    allowedTables: [], // e.g., ['users', 'projects', 'tasks']

    // Forbidden tables (takes precedence over allowedTables)
    forbiddenTables: ['oauth_tokens', 'oauth_state_tokens', 'refresh_tokens'],

    // Forbidden operations
    forbiddenOperations: ['DROP', 'TRUNCATE', 'DELETE FROM', 'UPDATE']
  }
};
