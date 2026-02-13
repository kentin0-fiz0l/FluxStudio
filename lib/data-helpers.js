/**
 * Data Helper Functions
 * Extracted from server-unified.js - handles user CRUD, file/team/project persistence,
 * messaging, and auth token operations.
 *
 * Uses dependency injection via initialize() to access database adapters,
 * cache, performance monitoring, and other shared modules.
 */

// Dependencies injected via initialize()
let authAdapter = null;
let messagingAdapter = null;
let projectsAdapter = null;
let cache = null;
let performanceMonitor = null;
let config = null;
let query = null;
let fs = null;
let path = null;
let jwt = null;
let crypto = null;

// State
let cacheInitialized = false;

// File paths (set during initialization)
let USERS_FILE = null;
let FILES_FILE = null;
let TEAMS_FILE = null;
let PROJECTS_FILE = null;
let MESSAGES_FILE = null;
let CHANNELS_FILE = null;
let JWT_SECRET = null;

/**
 * Initialize the data helpers with required dependencies.
 * Must be called before using any helper functions.
 */
function initialize(deps) {
  authAdapter = deps.authAdapter || null;
  messagingAdapter = deps.messagingAdapter || null;
  projectsAdapter = deps.projectsAdapter || null;
  cache = deps.cache;
  performanceMonitor = deps.performanceMonitor;
  config = deps.config;
  query = deps.query;
  fs = deps.fs;
  path = deps.path;
  jwt = deps.jwt;
  crypto = deps.crypto;

  // Derive file paths from __dirname of the caller (project root)
  const baseDir = deps.baseDir || process.cwd();
  USERS_FILE = path.join(baseDir, 'users.json');
  FILES_FILE = path.join(baseDir, 'files.json');
  TEAMS_FILE = path.join(baseDir, 'teams.json');
  PROJECTS_FILE = path.join(baseDir, 'projects.json');
  MESSAGES_FILE = path.join(baseDir, 'messages.json');
  CHANNELS_FILE = path.join(baseDir, 'channels.json');
  JWT_SECRET = config.JWT_SECRET;
}

/**
 * Update the cache initialization state.
 * Called from server-unified.js after Redis cache connects.
 */
function setCacheInitialized(value) {
  cacheInitialized = value;
}

// Cryptographically secure UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

// =============================================================================
// User CRUD Operations
// =============================================================================

async function getUsers() {
  if (authAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getUsers', () => authAdapter.getUsers());
  }
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data).users;
}

async function getUserByEmail(email) {
  if (cacheInitialized) {
    const cached = await cache.get(cache.buildKey.userByEmail(email));
    if (cached) return cached;
  }

  let user;
  if (authAdapter) {
    user = await performanceMonitor.monitorDatabaseQuery('getUserByEmail', () => authAdapter.getUserByEmail(email));
  } else {
    const users = await getUsers();
    user = users.find(user => user.email === email);
  }

  if (user && cacheInitialized) {
    await cache.set(cache.buildKey.userByEmail(email), user, cache.TTL.MEDIUM);
    await cache.set(cache.buildKey.user(user.id), user, cache.TTL.MEDIUM);
  }

  return user;
}

async function getUserById(id) {
  if (cacheInitialized) {
    const cached = await cache.get(cache.buildKey.user(id));
    if (cached) return cached;
  }

  let user;
  if (authAdapter) {
    user = await performanceMonitor.monitorDatabaseQuery('getUserById', () => authAdapter.getUserById(id));
  } else {
    const users = await getUsers();
    user = users.find(user => user.id === id);
  }

  if (user && cacheInitialized) {
    await cache.set(cache.buildKey.user(id), user, cache.TTL.MEDIUM);
  }

  return user;
}

async function createUser(userData) {
  let newUser;
  if (authAdapter) {
    newUser = await performanceMonitor.monitorDatabaseQuery('createUser', () => authAdapter.createUser(userData));
  } else {
    const users = await getUsers();
    newUser = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
  }

  if (cacheInitialized && newUser) {
    await cache.set(cache.buildKey.user(newUser.id), newUser, cache.TTL.MEDIUM);
    if (newUser.email) {
      await cache.set(cache.buildKey.userByEmail(newUser.email), newUser, cache.TTL.MEDIUM);
    }
  }

  return newUser;
}

async function updateUser(id, updates) {
  let updatedUser;
  if (authAdapter) {
    updatedUser = await performanceMonitor.monitorDatabaseQuery('updateUser', () => authAdapter.updateUser(id, updates));
  } else {
    const users = await getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      await saveUsers(users);
      updatedUser = users[userIndex];
    } else {
      return null;
    }
  }

  if (cacheInitialized && updatedUser) {
    await cache.invalidate.user(id);
    if (updatedUser.email) {
      await cache.del(cache.buildKey.userByEmail(updatedUser.email));
    }
  }

  return updatedUser;
}

async function saveUsers(users) {
  if (authAdapter) {
    return await authAdapter.saveUsers(users);
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

// =============================================================================
// File Operations
// =============================================================================

async function getFiles() {
  if (authAdapter) {
    return await authAdapter.getFiles();
  }
  const data = fs.readFileSync(FILES_FILE, 'utf8');
  return JSON.parse(data).files;
}

async function saveFiles(files) {
  if (authAdapter) {
    return await authAdapter.saveFiles(files);
  }
  fs.writeFileSync(FILES_FILE, JSON.stringify({ files }, null, 2));
}

// =============================================================================
// Team Operations
// =============================================================================

async function getTeams() {
  if (authAdapter) {
    return await authAdapter.getTeams();
  }
  const data = fs.readFileSync(TEAMS_FILE, 'utf8');
  return JSON.parse(data).teams;
}

async function saveTeams(teams) {
  if (authAdapter) {
    return await authAdapter.saveTeams(teams);
  }
  fs.writeFileSync(TEAMS_FILE, JSON.stringify({ teams }, null, 2));
}

// =============================================================================
// Project Operations
// =============================================================================

async function getProjects() {
  // Use projectsAdapter for database-backed project retrieval
  // Note: This returns all projects without user scoping (legacy behavior)
  // For user-scoped projects, use projectsAdapter.getProjects(userId) directly
  if (projectsAdapter) {
    try {
      // First check if organization_id column exists to handle inconsistent schema
      const columnCheck = await query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'organization_id'
      `);
      const hasOrgColumn = columnCheck.rows.length > 0;

      let result;
      if (hasOrgColumn) {
        // Full query with organization join
        result = await query(`
          SELECT p.*,
                 o.name as organization_name,
                 o.slug as organization_slug,
                 u.name as manager_name,
                 u.email as manager_email,
                 t.name as team_name,
                 (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
                 (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id) as task_count,
                 (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status = 'completed') as completed_task_count
          FROM projects p
          LEFT JOIN organizations o ON p.organization_id = o.id
          LEFT JOIN users u ON p.manager_id = u.id
          LEFT JOIN teams t ON p.team_id = t.id
          WHERE p.status != 'cancelled'
          ORDER BY p.updated_at DESC
          LIMIT 100
        `);
      } else {
        // Simplified query without organization join
        result = await query(`
          SELECT p.*,
                 u.name as manager_name,
                 u.email as manager_email
          FROM projects p
          LEFT JOIN users u ON p.manager_id = u.id
          WHERE p.status IS NULL OR p.status != 'cancelled'
          ORDER BY p.updated_at DESC NULLS LAST
          LIMIT 100
        `);
      }

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        status: row.status || 'planning',
        priority: row.priority || 'medium',
        organizationId: row.organization_id || null,
        organizationName: row.organization_name || null,
        teamId: row.team_id || null,
        teamName: row.team_name || null,
        createdBy: row.manager_id || row.created_by,
        managerName: row.manager_name || null,
        startDate: row.start_date,
        dueDate: row.due_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error getting projects from database:', error);
      return [];
    }
  }
  const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
  return JSON.parse(data).projects;
}

async function saveProjects(projects) {
  // In database mode, individual project operations handle persistence
  // This function is only used for file-based fallback
  if (projectsAdapter) {
    console.warn('saveProjects() called in database mode - use individual project operations instead');
    return true;
  }
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2));
}

// =============================================================================
// Messaging Operations
// =============================================================================

async function getMessages(conversationId = null, limit = 100) {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getMessages', () => messagingAdapter.getMessages(conversationId, limit));
  }
  const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
  let messages = JSON.parse(data).messages;

  if (conversationId) {
    messages = messages.filter(msg => msg.channelId === conversationId);
  }

  return messages.slice(0, limit);
}

async function createMessage(messageData) {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('createMessage', () => messagingAdapter.createMessage(messageData));
  }
  const messages = await getMessages();
  const newMessage = {
    id: Date.now() + '-' + crypto.randomBytes(5).toString('hex'),
    ...messageData,
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages }, null, 2));
  return newMessage;
}

async function getChannels() {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getChannels', () => messagingAdapter.getConversations());
  }
  const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
  return JSON.parse(data).channels;
}

async function saveChannels(channels) {
  if (messagingAdapter) {
    return await messagingAdapter.saveChannels(channels);
  }
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ channels }, null, 2));
}

// =============================================================================
// Auth Token Operations
// =============================================================================

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType, type: 'access' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Simple auth response without database (fallback when USE_DATABASE=false)
function simpleAuthResponse(user) {
  const token = generateToken(user);
  const { password, googleId, ...userWithoutPassword } = user;
  return {
    token,
    accessToken: token,
    user: userWithoutPassword
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

module.exports = {
  initialize,
  setCacheInitialized,
  getUsers,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  saveUsers,
  getFiles,
  saveFiles,
  getTeams,
  saveTeams,
  getProjects,
  saveProjects,
  getMessages,
  createMessage,
  getChannels,
  saveChannels,
  generateToken,
  simpleAuthResponse,
  verifyToken,
  authenticateToken
};
