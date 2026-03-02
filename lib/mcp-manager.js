/**
 * MCP Manager
 * Model Context Protocol Manager for Flux Studio
 *
 * Features:
 * - Connect to multiple MCP servers (PostgreSQL, Figma, etc.)
 * - Natural language query interface
 * - Tool discovery and invocation
 * - Error handling with fallback to direct SQL
 * - Query caching for performance
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const mcpConfig = require('../config/mcp-config');
const { query: directQuery } = require('../database/config');
const { createLogger } = require('./logger');
const log = createLogger('MCPManager');

class MCPManager {
  constructor() {
    this.clients = new Map();
    this.tools = new Map();
    this.cache = new Map(); // Simple in-memory cache
    this.connecting = new Map(); // Track connection promises
    this.initialized = false;
  }

  /**
   * Initialize MCP Manager and connect to enabled servers
   */
  async initialize() {
    if (this.initialized) {
      log.warn('MCP Manager already initialized');
      return;
    }

    log.info('Initializing MCP Manager...');

    const enabledServers = Object.entries(mcpConfig.servers)
      .filter(([_, config]) => config.enabled)
      .map(([name, _]) => name);

    if (enabledServers.length === 0) {
      log.warn('No MCP servers enabled in configuration');
      this.initialized = true;
      return;
    }

    log.info(`Connecting to ${enabledServers.length} MCP server(s): ${enabledServers.join(', ')}`);

    // Connect to all enabled servers
    const connectionPromises = enabledServers.map(serverName =>
      this.connectToServer(serverName).catch(error => {
        log.error(`Failed to connect to ${serverName} MCP server`, error);
        return null;
      })
    );

    await Promise.all(connectionPromises);

    this.initialized = true;
    log.info(`MCP Manager initialized with ${this.clients.size} active connection(s)`);
  }

  /**
   * Connect to a specific MCP server
   * @param {string} serverName - Server name from config
   */
  async connectToServer(serverName) {
    // Return existing connection promise if already connecting
    if (this.connecting.has(serverName)) {
      return this.connecting.get(serverName);
    }

    // Return existing client if already connected
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName);
    }

    const config = mcpConfig.servers[serverName];
    if (!config || !config.enabled) {
      throw new Error(`Server ${serverName} not enabled in configuration`);
    }

    const connectionPromise = this._doConnect(serverName, config);
    this.connecting.set(serverName, connectionPromise);

    try {
      const client = await connectionPromise;
      this.clients.set(serverName, client);
      return client;
    } finally {
      this.connecting.delete(serverName);
    }
  }

  /**
   * Internal connection method
   */
  async _doConnect(serverName, config) {
    log.info(`Connecting to ${serverName} MCP server...`);

    try {
      // Spawn MCP server process
      const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle process errors
      serverProcess.on('error', (error) => {
        log.error(`${serverName} MCP server process error`, error);
        this.clients.delete(serverName);
      });

      serverProcess.stderr.on('data', (data) => {
        if (mcpConfig.settings.logQueries) {
          log.error(`${serverName} MCP stderr: ${data.toString()}`);
        }
      });

      // Create transport and client
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...config.env }
      });

      const client = new Client({
        name: `flux-studio-${serverName}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Connect client to transport
      await client.connect(transport);

      // Discover available tools
      const { tools } = await client.listTools();
      this.tools.set(serverName, tools);

      log.info(`Connected to ${serverName} MCP server (${tools.length} tools available)`);

      return client;
    } catch (error) {
      log.error(`Failed to connect to ${serverName} MCP server`, error);
      throw error;
    }
  }

  /**
   * Execute natural language query using PostgreSQL MCP
   * @param {string} naturalLanguageQuery - Natural language query
   * @param {string} userId - User ID (for security/logging)
   * @returns {Promise<Object>} Query results
   */
  async queryDatabase(naturalLanguageQuery, userId) {
    // Security check: Validate query doesn't contain forbidden operations
    const forbiddenOps = mcpConfig.security.forbiddenOperations;
    const upperQuery = naturalLanguageQuery.toUpperCase();

    for (const op of forbiddenOps) {
      if (upperQuery.includes(op)) {
        throw new Error(`Forbidden operation detected: ${op}`);
      }
    }

    // Check cache first
    const cacheKey = `query:${naturalLanguageQuery}`;
    if (mcpConfig.settings.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < mcpConfig.settings.cacheTTL * 1000) {
        log.info('Returning cached MCP query result');
        return { ...cached.data, cached: true };
      }
    }

    // Get PostgreSQL MCP client
    const client = this.clients.get('postgres');
    if (!client) {
      log.warn('PostgreSQL MCP not available, falling back to direct SQL');
      return this.fallbackDirectQuery(naturalLanguageQuery, userId);
    }

    try {
      // Use MCP query tool
      const result = await client.callTool({
        name: 'query',
        arguments: {
          query: naturalLanguageQuery,
          user_id: userId
        }
      });

      // Parse result
      const data = {
        query: naturalLanguageQuery,
        results: result.content,
        executedAt: new Date().toISOString(),
        source: 'mcp'
      };

      // Cache result
      if (mcpConfig.settings.enableCaching) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      if (mcpConfig.settings.logQueries) {
        log.info('MCP Query:', { query: naturalLanguageQuery });
        log.info('Results:', { results: data.results });
      }

      return data;
    } catch (error) {
      log.error('MCP query error', error);
      log.warn('Falling back to direct SQL query');
      return this.fallbackDirectQuery(naturalLanguageQuery, userId);
    }
  }

  /**
   * Fallback to direct SQL query (when MCP fails or unavailable)
   * Converts common natural language queries to SQL
   */
  async fallbackDirectQuery(naturalLanguageQuery, userId) {
    log.info('Attempting to convert natural language to SQL', { query: naturalLanguageQuery });

    // Simple pattern matching for common queries
    let sqlQuery = null;

    // Pattern: "show me users who joined in the last X days"
    if (naturalLanguageQuery.match(/users? who joined in the last (\d+) days?/i)) {
      const days = naturalLanguageQuery.match(/(\d+)/)[1];
      sqlQuery = `
        SELECT id, email, name, user_type, created_at
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `;
    }

    // Pattern: "most active projects"
    else if (naturalLanguageQuery.match(/most active projects?/i)) {
      sqlQuery = `
        SELECT p.id, p.name, p.status, COUNT(DISTINCT pm.user_id) as member_count,
               p.created_at, p.updated_at
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        GROUP BY p.id
        ORDER BY p.updated_at DESC, member_count DESC
        LIMIT 10
      `;
    }

    // Pattern: "projects with more than X members"
    else if (naturalLanguageQuery.match(/projects? with more than (\d+) members?/i)) {
      const count = naturalLanguageQuery.match(/(\d+)/)[1];
      sqlQuery = `
        SELECT p.id, p.name, p.status, COUNT(pm.user_id) as member_count
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        GROUP BY p.id
        HAVING COUNT(pm.user_id) > ${count}
        ORDER BY member_count DESC
      `;
    }

    // Pattern: "total users" or "user count"
    else if (naturalLanguageQuery.match(/total users?|user count|how many users?/i)) {
      sqlQuery = `
        SELECT COUNT(*) as total_users,
               COUNT(CASE WHEN user_type = 'client' THEN 1 END) as clients,
               COUNT(CASE WHEN user_type = 'designer' THEN 1 END) as designers,
               COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admins
        FROM users
        WHERE is_active = true
      `;
    }

    // Pattern: "recent projects"
    else if (naturalLanguageQuery.match(/recent projects?/i)) {
      sqlQuery = `
        SELECT id, name, description, status, created_at
        FROM projects
        ORDER BY created_at DESC
        LIMIT 10
      `;
    }

    // If no pattern matched, return error
    if (!sqlQuery) {
      throw new Error(`Unable to convert natural language query to SQL: "${naturalLanguageQuery}". Please try a more specific query or use direct SQL.`);
    }

    // Execute SQL query
    try {
      const result = await directQuery(sqlQuery);

      return {
        query: naturalLanguageQuery,
        sql: sqlQuery,
        results: result.rows,
        executedAt: new Date().toISOString(),
        source: 'fallback-sql'
      };
    } catch (error) {
      log.error('Fallback SQL query error', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Call a specific MCP tool
   * @param {string} serverName - Server name
   * @param {string} toolName - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<any>} Tool result
   */
  async callTool(serverName, toolName, args = {}) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server ${serverName} not connected`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      if (mcpConfig.settings.logQueries) {
        log.info(`MCP Tool Call: ${serverName}.${toolName}`, { args });
        log.info('Result', { result });
      }

      return result;
    } catch (error) {
      log.error(`MCP tool call error (${serverName}.${toolName})`, error);
      throw error;
    }
  }

  /**
   * List all available tools across all connected servers
   * @returns {Object} Map of server -> tools
   */
  listTools() {
    const toolsList = {};

    for (const [serverName, tools] of this.tools.entries()) {
      toolsList[serverName] = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    }

    return toolsList;
  }

  /**
   * Disconnect all MCP clients
   */
  async disconnect() {
    log.info('Disconnecting MCP Manager...');

    for (const [serverName, client] of this.clients.entries()) {
      try {
        await client.close();
        log.info(`Disconnected from ${serverName} MCP server`);
      } catch (error) {
        log.error(`Error disconnecting from ${serverName}`, error);
      }
    }

    this.clients.clear();
    this.tools.clear();
    this.cache.clear();
    this.initialized = false;

    log.info('MCP Manager disconnected');
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.cache.clear();
    log.info('MCP query cache cleared');
  }
}

// Singleton instance
const mcpManager = new MCPManager();

module.exports = mcpManager;
