# Sprint 12: Server Refactoring Execution Plan

## Executive Summary

**Objective**: Refactor monolithic server files and context providers to improve maintainability, reduce complexity, and enable safer deployments while maintaining 100% backward compatibility.

**Current State**:
- `server-auth.js`: 1,177 lines (target: ~400 lines, 66% reduction)
- `server-messaging.js`: 934 lines (target: ~350 lines, 63% reduction)
- `MessagingContext.tsx`: 457 lines (target: ~250 lines, 45% reduction)
- `WorkspaceContext.tsx`: 474 lines (target: ~250 lines, 47% reduction)

**Total Impact**: Reduce ~3,042 lines to ~1,250 lines (59% reduction)

**Timeline**: 10 days (2 weeks)
**Risk Level**: Medium (mitigated by incremental approach)
**Success Criteria**:
- Zero regressions in production
- All tests passing
- Cyclomatic complexity reduced by 30%+
- Code coverage maintained or improved

---

## Refactoring Principles

### 1. Incremental Migration Strategy
- Never remove old code until new code is proven in production
- Run old and new code in parallel with feature flags
- Gradual rollout with monitoring at each step
- Easy rollback mechanism at every stage

### 2. Testing Requirements
- Unit tests for every extracted module
- Integration tests for API contracts
- End-to-end tests for critical user flows
- Performance benchmarks before/after

### 3. Deployment Safety
- Feature flags for all major refactorings
- Canary deployments (10% → 50% → 100%)
- Real-time monitoring and alerting
- Automated rollback triggers

---

## Phase 1: Storage Abstraction (Days 1-2)

**Impact**: Eliminates 200+ lines of duplicated file/database hybrid code across both servers

### Current Problem
Both `server-auth.js` and `server-messaging.js` contain identical patterns:
```javascript
async function getUsers() {
  if (authAdapter) {
    return await authAdapter.getUsers();
  }
  // Fallback to file-based storage
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data).users;
}
```

This pattern is repeated 15+ times per file, creating:
- Code duplication (DRY violation)
- Inconsistent error handling
- Mixed concerns (storage logic in route handlers)
- Testing difficulty

### Solution: StorageAdapter Interface

#### Step 1.1: Create Storage Adapter Interface (Day 1, Morning)

**File**: `/Users/kentino/FluxStudio/lib/storage/StorageAdapter.js`

```javascript
/**
 * StorageAdapter - Unified interface for data persistence
 * Supports both file-based and database backends with transparent fallback
 */

class StorageAdapter {
  constructor(config = {}) {
    this.useDatabase = config.USE_DATABASE === 'true';
    this.databaseAdapter = null;
    this.fileStorage = null;
    this.performanceMonitor = config.performanceMonitor;

    if (this.useDatabase && config.databaseAdapter) {
      this.databaseAdapter = config.databaseAdapter;
      console.log('✅ Database adapter initialized');
    } else {
      this.fileStorage = new FileStorageAdapter(config.dataDir);
      console.log('📁 File storage adapter initialized');
    }
  }

  /**
   * Generic data retrieval with automatic fallback
   * @param {string} collection - Collection/file name (e.g., 'users', 'messages')
   * @param {Object} query - Query parameters (optional)
   * @returns {Promise<Array>} Data array
   */
  async getAll(collection, query = {}) {
    const operation = `get${collection}`;

    if (this.databaseAdapter) {
      return await this._withMonitoring(
        operation,
        () => this.databaseAdapter.getAll(collection, query)
      );
    }

    return await this.fileStorage.getAll(collection, query);
  }

  /**
   * Get single item by ID with caching support
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @param {Object} options - Options (cache, ttl, etc.)
   * @returns {Promise<Object|null>} Item or null
   */
  async getById(collection, id, options = {}) {
    // Cache lookup if enabled
    if (options.cache && this.cache) {
      const cacheKey = `${collection}:${id}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const operation = `get${collection}ById`;
    let item;

    if (this.databaseAdapter) {
      item = await this._withMonitoring(
        operation,
        () => this.databaseAdapter.getById(collection, id)
      );
    } else {
      item = await this.fileStorage.getById(collection, id);
    }

    // Cache result if enabled
    if (item && options.cache && this.cache) {
      const cacheKey = `${collection}:${id}`;
      await this.cache.set(cacheKey, item, options.ttl || 300);
    }

    return item;
  }

  /**
   * Create new item
   * @param {string} collection - Collection name
   * @param {Object} data - Item data
   * @returns {Promise<Object>} Created item with ID
   */
  async create(collection, data) {
    const operation = `create${collection}`;
    let newItem;

    if (this.databaseAdapter) {
      newItem = await this._withMonitoring(
        operation,
        () => this.databaseAdapter.create(collection, data)
      );
    } else {
      newItem = await this.fileStorage.create(collection, data);
    }

    // Invalidate relevant caches
    if (this.cache) {
      await this.cache.invalidatePattern(`${collection}:*`);
    }

    return newItem;
  }

  /**
   * Update existing item
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @param {Object} updates - Partial updates
   * @returns {Promise<Object|null>} Updated item or null
   */
  async update(collection, id, updates) {
    const operation = `update${collection}`;
    let updatedItem;

    if (this.databaseAdapter) {
      updatedItem = await this._withMonitoring(
        operation,
        () => this.databaseAdapter.update(collection, id, updates)
      );
    } else {
      updatedItem = await this.fileStorage.update(collection, id, updates);
    }

    // Invalidate cache for this item
    if (this.cache) {
      await this.cache.del(`${collection}:${id}`);
    }

    return updatedItem;
  }

  /**
   * Delete item
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(collection, id) {
    const operation = `delete${collection}`;
    let result;

    if (this.databaseAdapter) {
      result = await this._withMonitoring(
        operation,
        () => this.databaseAdapter.delete(collection, id)
      );
    } else {
      result = await this.fileStorage.delete(collection, id);
    }

    // Invalidate cache
    if (this.cache) {
      await this.cache.del(`${collection}:${id}`);
    }

    return result;
  }

  /**
   * Query with filters
   * @param {string} collection - Collection name
   * @param {Object} filters - Filter object
   * @param {Object} options - Options (limit, offset, sort)
   * @returns {Promise<Array>} Filtered items
   */
  async query(collection, filters = {}, options = {}) {
    const operation = `query${collection}`;

    if (this.databaseAdapter) {
      return await this._withMonitoring(
        operation,
        () => this.databaseAdapter.query(collection, filters, options)
      );
    }

    return await this.fileStorage.query(collection, filters, options);
  }

  /**
   * Attach cache layer
   * @param {Object} cache - Cache instance
   */
  setCache(cache) {
    this.cache = cache;
  }

  /**
   * Performance monitoring wrapper
   * @private
   */
  async _withMonitoring(operation, fn) {
    if (this.performanceMonitor) {
      return await this.performanceMonitor.monitorDatabaseQuery(operation, fn);
    }
    return await fn();
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    if (this.databaseAdapter) {
      return await this.databaseAdapter.healthCheck();
    }
    return { status: 'healthy', backend: 'file' };
  }
}

module.exports = { StorageAdapter };
```

#### Step 1.2: Create File Storage Implementation (Day 1, Morning)

**File**: `/Users/kentino/FluxStudio/lib/storage/FileStorageAdapter.js`

```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileStorageAdapter {
  constructor(dataDir = __dirname) {
    this.dataDir = dataDir;
    this.collections = new Map();
  }

  /**
   * Get file path for collection
   * @private
   */
  _getFilePath(collection) {
    return path.join(this.dataDir, `${collection}.json`);
  }

  /**
   * Read collection from file
   * @private
   */
  async _readCollection(collection) {
    const filePath = this._getFilePath(collection);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed[collection] || [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Write collection to file
   * @private
   */
  async _writeCollection(collection, items) {
    const filePath = this._getFilePath(collection);
    const data = { [collection]: items };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async getAll(collection, query = {}) {
    const items = await this._readCollection(collection);

    // Apply simple query filters
    if (Object.keys(query).length === 0) {
      return items;
    }

    return items.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }

  async getById(collection, id) {
    const items = await this._readCollection(collection);
    return items.find(item => item.id === id) || null;
  }

  async create(collection, data) {
    const items = await this._readCollection(collection);

    const newItem = {
      id: this._generateId(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    items.push(newItem);
    await this._writeCollection(collection, items);

    return newItem;
  }

  async update(collection, id, updates) {
    const items = await this._readCollection(collection);
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      return null;
    }

    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this._writeCollection(collection, items);
    return items[index];
  }

  async delete(collection, id) {
    const items = await this._readCollection(collection);
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    items.splice(index, 1);
    await this._writeCollection(collection, items);

    return true;
  }

  async query(collection, filters = {}, options = {}) {
    let items = await this._readCollection(collection);

    // Apply filters
    if (Object.keys(filters).length > 0) {
      items = items.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          // Support simple comparisons and regex
          if (value instanceof RegExp) {
            return value.test(item[key]);
          }
          return item[key] === value;
        });
      });
    }

    // Apply sorting
    if (options.sort) {
      const [field, order] = Object.entries(options.sort)[0];
      items.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return order === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || items.length;

    return items.slice(offset, offset + limit);
  }

  _generateId() {
    return crypto.randomUUID();
  }
}

module.exports = { FileStorageAdapter };
```

#### Step 1.3: Write Tests (Day 1, Afternoon)

**File**: `/Users/kentino/FluxStudio/tests/lib/storage/StorageAdapter.test.js`

```javascript
const { StorageAdapter } = require('../../../lib/storage/StorageAdapter');
const { FileStorageAdapter } = require('../../../lib/storage/FileStorageAdapter');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('StorageAdapter', () => {
  let tempDir;
  let storage;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));

    storage = new StorageAdapter({
      USE_DATABASE: 'false',
      dataDir: tempDir,
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('CRUD Operations', () => {
    test('should create item', async () => {
      const user = await storage.create('users', {
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(user).toHaveProperty('id');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user).toHaveProperty('createdAt');
    });

    test('should retrieve item by ID', async () => {
      const created = await storage.create('users', {
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      const retrieved = await storage.getById('users', created.id);
      expect(retrieved).toEqual(created);
    });

    test('should return null for non-existent ID', async () => {
      const result = await storage.getById('users', 'non-existent-id');
      expect(result).toBeNull();
    });

    test('should update item', async () => {
      const user = await storage.create('users', {
        name: 'John Doe',
        email: 'john@example.com',
      });

      const updated = await storage.update('users', user.id, {
        name: 'John Updated',
      });

      expect(updated.name).toBe('John Updated');
      expect(updated.email).toBe('john@example.com');
      expect(updated).toHaveProperty('updatedAt');
    });

    test('should delete item', async () => {
      const user = await storage.create('users', {
        name: 'John Doe',
        email: 'john@example.com',
      });

      const deleted = await storage.delete('users', user.id);
      expect(deleted).toBe(true);

      const retrieved = await storage.getById('users', user.id);
      expect(retrieved).toBeNull();
    });

    test('should return false when deleting non-existent item', async () => {
      const deleted = await storage.delete('users', 'non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data
      await storage.create('users', { name: 'Alice', age: 25, role: 'admin' });
      await storage.create('users', { name: 'Bob', age: 30, role: 'user' });
      await storage.create('users', { name: 'Charlie', age: 35, role: 'user' });
    });

    test('should get all items', async () => {
      const users = await storage.getAll('users');
      expect(users).toHaveLength(3);
    });

    test('should filter by single field', async () => {
      const users = await storage.query('users', { role: 'user' });
      expect(users).toHaveLength(2);
      expect(users.every(u => u.role === 'user')).toBe(true);
    });

    test('should apply limit', async () => {
      const users = await storage.query('users', {}, { limit: 2 });
      expect(users).toHaveLength(2);
    });

    test('should apply offset', async () => {
      const users = await storage.query('users', {}, { offset: 1, limit: 2 });
      expect(users).toHaveLength(2);
    });

    test('should sort results', async () => {
      const users = await storage.query('users', {}, {
        sort: { age: 'desc' }
      });
      expect(users[0].name).toBe('Charlie');
      expect(users[2].name).toBe('Alice');
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted JSON file', async () => {
      const filePath = path.join(tempDir, 'corrupted.json');
      await fs.writeFile(filePath, 'invalid json{]');

      await expect(storage.getAll('corrupted')).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    test('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create 100 items
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(storage.create('items', { value: i }));
      }
      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);

      const items = await storage.getAll('items');
      expect(items).toHaveLength(100);
    });
  });
});
```

#### Step 1.4: Integrate Storage Adapter (Day 1, Evening)

**Changes to `server-auth.js`**:

```javascript
// BEFORE (Lines 162-289 - 127 lines)
async function getUsers() {
  if (authAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getUsers', () => authAdapter.getUsers());
  }
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data).users;
}

async function getUserByEmail(email) {
  // ... 20+ lines
}

async function getUserById(id) {
  // ... 20+ lines
}

// ... 10 more similar functions

// AFTER (Lines 162-180 - 18 lines)
const { StorageAdapter } = require('./lib/storage/StorageAdapter');
const storage = new StorageAdapter({
  USE_DATABASE: process.env.USE_DATABASE,
  databaseAdapter: authAdapter,
  dataDir: __dirname,
  performanceMonitor,
});

// Enable caching
if (cacheInitialized) {
  storage.setCache(cache);
}

// Replace all storage functions with storage adapter calls
const getUsers = () => storage.getAll('users');
const getUserByEmail = (email) => storage.getById('users', email, { cache: true });
const getUserById = (id) => storage.getById('users', id, { cache: true });
const createUser = (data) => storage.create('users', data);
const updateUser = (id, updates) => storage.update('users', id, updates);
const getFiles = () => storage.getAll('files');
const saveFiles = (files) => storage.bulkUpdate('files', files);
const getTeams = () => storage.getAll('teams');
const saveTeams = (teams) => storage.bulkUpdate('teams', teams);
```

**Lines Saved**: ~110 lines in `server-auth.js`

#### Step 1.5: Feature Flag Implementation (Day 2, Morning)

**File**: `/Users/kentino/FluxStudio/config/feature-flags.js`

```javascript
/**
 * Feature Flags for Sprint 12 Refactoring
 * Enables gradual rollout and easy rollback
 */

class FeatureFlags {
  constructor() {
    this.flags = {
      // Storage Abstraction
      USE_STORAGE_ADAPTER: process.env.FEATURE_STORAGE_ADAPTER === 'true',

      // Server Refactoring
      USE_MODULAR_AUTH_ROUTES: process.env.FEATURE_MODULAR_AUTH === 'true',
      USE_MODULAR_MESSAGING_ROUTES: process.env.FEATURE_MODULAR_MESSAGING === 'true',

      // Context Refactoring
      USE_MESSAGING_HOOKS: process.env.FEATURE_MESSAGING_HOOKS === 'true',
      USE_WORKSPACE_HOOKS: process.env.FEATURE_WORKSPACE_HOOKS === 'true',
    };
  }

  isEnabled(flagName) {
    return this.flags[flagName] || false;
  }

  enableForPercentage(flagName, percentage) {
    // For canary deployments - enable for X% of traffic
    if (!this.isEnabled(flagName)) {
      const random = Math.random() * 100;
      return random < percentage;
    }
    return true;
  }

  getAllFlags() {
    return { ...this.flags };
  }
}

module.exports = new FeatureFlags();
```

**Integration in `server-auth.js`**:

```javascript
const featureFlags = require('./config/feature-flags');

// Use new storage adapter if flag is enabled, otherwise use old code
if (featureFlags.isEnabled('USE_STORAGE_ADAPTER')) {
  // New implementation
  const { StorageAdapter } = require('./lib/storage/StorageAdapter');
  const storage = new StorageAdapter({ /* ... */ });

  getUsers = () => storage.getAll('users');
  // ...
} else {
  // Old implementation (keep until proven)
  getUsers = async function() {
    if (authAdapter) {
      return await performanceMonitor.monitorDatabaseQuery('getUsers', () => authAdapter.getUsers());
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data).users;
  };
  // ...
}
```

#### Step 1.6: Testing & Rollout (Day 2, Afternoon)

**Testing Checklist**:
- [ ] All unit tests pass
- [ ] Integration tests with file storage
- [ ] Integration tests with database adapter
- [ ] Performance benchmarks (should be ±5% of baseline)
- [ ] Error handling for corrupted files
- [ ] Cache invalidation works correctly
- [ ] Concurrent operations handle correctly

**Rollout Plan**:
1. Deploy with flag OFF to staging
2. Run full test suite
3. Enable flag for 10% of requests (canary)
4. Monitor for 24 hours:
   - Error rates
   - Response times
   - Database query counts
5. If metrics are good, increase to 50%
6. Monitor for 24 hours
7. If metrics are good, enable 100%
8. After 1 week of stable operation, remove old code

**Rollback Procedure**:
```bash
# Immediate rollback if issues detected
export FEATURE_STORAGE_ADAPTER=false
pm2 restart auth-service
pm2 restart messaging-service
```

**Success Metrics**:
- Lines of code reduced: ~110 lines per server (220 total)
- Code duplication eliminated: 15+ duplicate functions removed
- Test coverage: >90% for storage adapter
- Performance: No degradation (±5% baseline)
- Zero production incidents

---

## Phase 2: Server-Auth Decomposition (Days 3-5)

**Impact**: Reduce `server-auth.js` from 1,177 lines to ~400 lines

### Current Structure Analysis

The `server-auth.js` file contains:
- 40+ route handlers (lines 363-1178)
- Authentication logic (50 lines)
- File management (90 lines)
- Team management (250 lines)
- Organization management (70 lines)
- OAuth handlers (80 lines)
- Health checks (30 lines)

### Decomposition Strategy: Extract Route Groups

#### Step 2.1: Create Controllers Directory Structure (Day 3, Morning)

```
/Users/kentino/FluxStudio/controllers/
├── auth/
│   ├── AuthController.js       # Login, signup, logout
│   ├── OAuthController.js      # Google, Apple OAuth
│   └── SessionController.js    # Token management, /me endpoint
├── files/
│   └── FileController.js       # Upload, list, delete files
├── teams/
│   └── TeamController.js       # Create, invite, manage teams
├── organizations/
│   └── OrganizationController.js
└── index.js                    # Controller registry
```

#### Step 2.2: Extract Authentication Controller (Day 3, Morning-Afternoon)

**File**: `/Users/kentino/FluxStudio/controllers/auth/AuthController.js`

```javascript
/**
 * AuthController - Handles user authentication
 * Extracted from server-auth.js lines 363-476
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../../config/environment');

class AuthController {
  constructor({ storage, performanceMonitor }) {
    this.storage = storage;
    this.performanceMonitor = performanceMonitor;
    this.jwtSecret = config.JWT_SECRET;
  }

  /**
   * User signup
   * POST /api/auth/signup
   */
  async signup(req, res) {
    try {
      const { email, password, name, userType = 'client' } = req.body;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const validUserTypes = ['client', 'designer', 'admin'];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ message: 'Invalid user type' });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message: 'Password must be at least 8 characters'
        });
      }

      // Check if user exists
      const existingUser = await this.storage.query('users', { email });
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await this.storage.create('users', {
        email,
        name,
        userType,
        password: hashedPassword,
      });

      // Generate token
      const token = this._generateToken(newUser);

      // Track metric
      if (this.performanceMonitor) {
        this.performanceMonitor.incrementCounter('user_signups');
      }

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.json({
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Server error during signup' });
    }
  }

  /**
   * User login
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const users = await this.storage.query('users', { email });
      const user = users[0];

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = this._generateToken(user);

      // Track metric
      if (this.performanceMonitor) {
        this.performanceMonitor.incrementCounter('user_logins');
      }

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async getCurrentUser(req, res) {
    try {
      const user = await this.storage.getById('users', req.user.id, { cache: true });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Logout
   * POST /api/auth/logout
   */
  async logout(req, res) {
    // In a real app, invalidate the token server-side
    // For now, client-side token removal is sufficient
    res.json({ message: 'Logged out successfully' });
  }

  /**
   * Generate JWT token
   * @private
   */
  _generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }
}

module.exports = { AuthController };
```

#### Step 2.3: Create Route Definitions (Day 3, Afternoon)

**File**: `/Users/kentino/FluxStudio/routes/auth.routes.js`

```javascript
/**
 * Authentication Routes
 * Clean separation of routes from business logic
 */

const express = require('express');
const { AuthController } = require('../controllers/auth/AuthController');
const { validateInput, authRateLimit } = require('../middleware/security');

function createAuthRoutes({ storage, performanceMonitor }) {
  const router = express.Router();
  const authController = new AuthController({ storage, performanceMonitor });

  // Apply rate limiting to all auth routes
  router.use(authRateLimit);

  // Signup
  router.post(
    '/signup',
    validateInput.email,
    validateInput.password,
    validateInput.sanitizeInput,
    (req, res) => authController.signup(req, res)
  );

  // Login
  router.post(
    '/login',
    validateInput.email,
    validateInput.sanitizeInput,
    (req, res) => authController.login(req, res)
  );

  // Get current user
  router.get('/me', (req, res) => authController.getCurrentUser(req, res));

  // Logout
  router.post('/logout', (req, res) => authController.logout(req, res));

  return router;
}

module.exports = { createAuthRoutes };
```

#### Step 2.4: Integration with Existing Server (Day 3, Evening)

**Modified `server-auth.js`**:

```javascript
const featureFlags = require('./config/feature-flags');
const { createAuthRoutes } = require('./routes/auth.routes');

// ... existing setup code ...

// Choose routing strategy based on feature flag
if (featureFlags.isEnabled('USE_MODULAR_AUTH_ROUTES')) {
  // New modular routes
  console.log('✨ Using modular auth routes');
  const authRoutes = createAuthRoutes({ storage, performanceMonitor });
  app.use('/api/auth', authRoutes);
} else {
  // Old inline routes (keep until proven)
  console.log('📝 Using legacy auth routes');

  app.post('/api/auth/signup', authRateLimit, validateInput.email, /* ... old code ... */);
  app.post('/api/auth/login', authRateLimit, validateInput.email, /* ... old code ... */);
  // ... etc ...
}
```

#### Step 2.5: Extract OAuth Controller (Day 4, Morning)

**File**: `/Users/kentino/FluxStudio/controllers/auth/OAuthController.js`

```javascript
/**
 * OAuthController - Handles OAuth authentication (Google, Apple)
 * Extracted from server-auth.js lines 478-557
 */

const { OAuth2Client } = require('google-auth-library');
const { config } = require('../../config/environment');

class OAuthController {
  constructor({ storage, authController }) {
    this.storage = storage;
    this.authController = authController;
    this.googleClient = config.GOOGLE_CLIENT_ID
      ? new OAuth2Client(config.GOOGLE_CLIENT_ID)
      : null;
  }

  /**
   * Google OAuth sign-in
   * POST /api/auth/google
   */
  async googleAuth(req, res) {
    try {
      if (!this.googleClient) {
        return res.status(503).json({
          message: 'Google OAuth not configured'
        });
      }

      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          message: 'Google credential is required'
        });
      }

      // Verify the Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: config.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, name, email_verified } = payload;

      if (!email_verified) {
        return res.status(400).json({
          message: 'Google email not verified'
        });
      }

      // Find or create user
      let user = await this._findOrCreateGoogleUser(googleId, email, name);

      // Generate JWT token
      const token = this.authController._generateToken(user);

      // Return user data (without sensitive info)
      const { password, googleId: _, ...userWithoutSensitiveData } = user;
      res.json({
        token,
        user: userWithoutSensitiveData,
      });

    } catch (error) {
      console.error('Google OAuth error:', error);
      res.status(500).json({
        message: 'Google authentication error',
        error: error.message
      });
    }
  }

  /**
   * Apple OAuth sign-in
   * POST /api/auth/apple
   */
  async appleAuth(req, res) {
    // TODO: Implement Apple Sign In
    res.status(501).json({
      message: 'Apple Sign In integration is in development',
      error: 'OAuth not yet implemented',
    });
  }

  /**
   * Find existing user or create new one for Google OAuth
   * @private
   */
  async _findOrCreateGoogleUser(googleId, email, name) {
    // Check if user exists by email
    const existingUsers = await this.storage.query('users', { email });
    let user = existingUsers[0];

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user = await this.storage.update('users', user.id, { googleId });
      }
    } else {
      // Create new user
      user = await this.storage.create('users', {
        email,
        name,
        googleId,
        userType: 'client', // Default for OAuth users
      });
    }

    return user;
  }
}

module.exports = { OAuthController };
```

#### Step 2.6: Extract File Management Controller (Day 4, Afternoon)

**File**: `/Users/kentino/FluxStudio/controllers/files/FileController.js`

```javascript
/**
 * FileController - Handles file uploads and management
 * Extracted from server-auth.js lines 559-689
 */

const fs = require('fs').promises;

class FileController {
  constructor({ storage, uploadsDir }) {
    this.storage = storage;
    this.uploadsDir = uploadsDir;
  }

  /**
   * Upload file(s)
   * POST /api/files/upload
   */
  async uploadFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const fileMetadata = {
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          url: `/uploads/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype,
          uploadedBy: req.user.id,
          tags: [],
          description: '',
          isPublic: false,
        };

        const savedFile = await this.storage.create('files', fileMetadata);
        uploadedFiles.push(savedFile);
      }

      res.json({
        message: 'Files uploaded successfully',
        files: uploadedFiles,
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Error uploading files' });
    }
  }

  /**
   * Get user's files
   * GET /api/files
   */
  async getUserFiles(req, res) {
    try {
      const userFiles = await this.storage.query('files', {
        uploadedBy: req.user.id,
      });

      res.json({ files: userFiles });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({ message: 'Error retrieving files' });
    }
  }

  /**
   * Get file by ID
   * GET /api/files/:id
   */
  async getFileById(req, res) {
    try {
      const file = await this.storage.getById('files', req.params.id);

      if (!file || file.uploadedBy !== req.user.id) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json(file);
    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({ message: 'Error retrieving file' });
    }
  }

  /**
   * Update file metadata
   * PUT /api/files/:id
   */
  async updateFile(req, res) {
    try {
      const file = await this.storage.getById('files', req.params.id);

      if (!file || file.uploadedBy !== req.user.id) {
        return res.status(404).json({ message: 'File not found' });
      }

      const { description, tags, isPublic } = req.body;

      const updatedFile = await this.storage.update('files', req.params.id, {
        description: description !== undefined ? description : file.description,
        tags: tags !== undefined ? tags : file.tags,
        isPublic: isPublic !== undefined ? isPublic : file.isPublic,
      });

      res.json(updatedFile);
    } catch (error) {
      console.error('Update file error:', error);
      res.status(500).json({ message: 'Error updating file' });
    }
  }

  /**
   * Delete file
   * DELETE /api/files/:id
   */
  async deleteFile(req, res) {
    try {
      const file = await this.storage.getById('files', req.params.id);

      if (!file || file.uploadedBy !== req.user.id) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete physical file
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.warn('Could not delete physical file:', err.message);
      }

      // Remove from database
      await this.storage.delete('files', req.params.id);

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({ message: 'Error deleting file' });
    }
  }
}

module.exports = { FileController };
```

#### Step 2.7: Extract Team Management Controller (Day 5)

**File**: `/Users/kentino/FluxStudio/controllers/teams/TeamController.js`

```javascript
/**
 * TeamController - Handles team management
 * Extracted from server-auth.js lines 691-996 (305 lines)
 */

class TeamController {
  constructor({ storage }) {
    this.storage = storage;
  }

  /**
   * Create team
   * POST /api/teams
   */
  async createTeam(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Team name is required' });
      }

      const newTeam = await this.storage.create('teams', {
        name,
        description: description || '',
        createdBy: req.user.id,
        members: [
          {
            userId: req.user.id,
            role: 'owner',
            joinedAt: new Date().toISOString(),
          },
        ],
        invites: [],
      });

      res.json({
        message: 'Team created successfully',
        team: newTeam,
      });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ message: 'Error creating team' });
    }
  }

  /**
   * Get user's teams
   * GET /api/teams
   */
  async getUserTeams(req, res) {
    try {
      const allTeams = await this.storage.getAll('teams');
      const userTeams = allTeams.filter(team =>
        team.members.some(member => member.userId === req.user.id)
      );

      res.json({ teams: userTeams });
    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({ message: 'Error retrieving teams' });
    }
  }

  /**
   * Get team by ID
   * GET /api/teams/:id
   */
  async getTeamById(req, res) {
    try {
      const team = await this.storage.getById('teams', req.params.id);

      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Check if user is a member
      const isMember = team.members.some(
        member => member.userId === req.user.id
      );

      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(team);
    } catch (error) {
      console.error('Get team error:', error);
      res.status(500).json({ message: 'Error retrieving team' });
    }
  }

  /**
   * Update team
   * PUT /api/teams/:id
   */
  async updateTeam(req, res) {
    try {
      const team = await this.storage.getById('teams', req.params.id);

      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Check if user is owner or admin
      const member = team.members.find(m => m.userId === req.user.id);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return res.status(403).json({ message: 'Permission denied' });
      }

      const { name, description } = req.body;

      const updatedTeam = await this.storage.update('teams', req.params.id, {
        name: name !== undefined ? name : team.name,
        description: description !== undefined ? description : team.description,
      });

      res.json(updatedTeam);
    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json({ message: 'Error updating team' });
    }
  }

  /**
   * Invite member to team
   * POST /api/teams/:id/invite
   */
  async inviteMember(req, res) {
    try {
      const { email, role = 'member' } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const team = await this.storage.getById('teams', req.params.id);

      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Check if user has permission to invite
      const member = team.members.find(m => m.userId === req.user.id);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return res.status(403).json({ message: 'Permission denied' });
      }

      // Check if user is already a member
      const existingUsers = await this.storage.query('users', { email });
      const invitedUser = existingUsers[0];

      if (invitedUser) {
        const existingMember = team.members.find(
          m => m.userId === invitedUser.id
        );
        if (existingMember) {
          return res.status(400).json({
            message: 'User is already a team member'
          });
        }
      }

      // Create invitation
      const invite = {
        id: this._generateId(),
        email,
        role,
        invitedBy: req.user.id,
        invitedAt: new Date().toISOString(),
        status: 'pending',
      };

      const invites = team.invites || [];
      invites.push(invite);

      await this.storage.update('teams', req.params.id, { invites });

      res.json({
        message: 'Invitation sent successfully',
        invite,
      });
    } catch (error) {
      console.error('Invite member error:', error);
      res.status(500).json({ message: 'Error sending invitation' });
    }
  }

  /**
   * Accept team invitation
   * POST /api/teams/:id/accept-invite
   */
  async acceptInvite(req, res) {
    try {
      const team = await this.storage.getById('teams', req.params.id);

      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Find invitation for user's email
      const user = await this.storage.getById('users', req.user.id);
      const inviteIndex = (team.invites || []).findIndex(
        i => i.email === user.email && i.status === 'pending'
      );

      if (inviteIndex === -1) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      const invite = team.invites[inviteIndex];

      // Add user as member
      const members = team.members || [];
      members.push({
        userId: req.user.id,
        role: invite.role,
        joinedAt: new Date().toISOString(),
      });

      // Update invitation status
      team.invites[inviteIndex].status = 'accepted';

      await this.storage.update('teams', req.params.id, {
        members,
        invites: team.invites,
      });

      res.json({
        message: 'Successfully joined the team',
        team,
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ message: 'Error accepting invitation' });
    }
  }

  /**
   * Remove member from team
   * DELETE /api/teams/:id/members/:userId
   */
  async removeMember(req, res) {
    try {
      const team = await this.storage.getById('teams', req.params.id);

      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Check if user has permission to remove members
      const member = team.members.find(m => m.userId === req.user.id);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        // Allow users to remove themselves
        if (req.params.userId !== req.user.id) {
          return res.status(403).json({ message: 'Permission denied' });
        }
      }

      // Cannot remove the owner
      const targetMember = team.members.find(
        m => m.userId === req.params.userId
      );
      if (targetMember?.role === 'owner' && req.params.userId !== req.user.id) {
        return res.status(400).json({ message: 'Cannot remove team owner' });
      }

      // Remove member
      const updatedMembers = team.members.filter(
        m => m.userId !== req.params.userId
      );

      await this.storage.update('teams', req.params.id, {
        members: updatedMembers,
      });

      res.json({
        message: 'Member removed successfully',
      });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ message: 'Error removing member' });
    }
  }

  /**
   * Update member role
   * PUT /api/teams/:id/members/:userId
   */
  async updateMemberRole(req, res) {
    try {
      const { role } = req.body;
      const validRoles = ['owner', 'admin', 'member'];

      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: 'Valid role is required' });
      }

      const team = await this.storage.getById('teams', req.params.id);

      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Check if user has permission
      const member = team.members.find(m => m.userId === req.user.id);
      if (!member || member.role !== 'owner') {
        return res.status(403).json({
          message: 'Only team owner can change roles'
        });
      }

      // Find target member
      const targetMemberIndex = team.members.findIndex(
        m => m.userId === req.params.userId
      );

      if (targetMemberIndex === -1) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // Update role
      team.members[targetMemberIndex].role = role;

      await this.storage.update('teams', req.params.id, {
        members: team.members,
      });

      res.json({
        message: 'Member role updated successfully',
        member: team.members[targetMemberIndex],
      });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({ message: 'Error updating member role' });
    }
  }

  _generateId() {
    return require('crypto').randomUUID();
  }
}

module.exports = { TeamController };
```

#### Step 2.8: Final Server-Auth Integration (Day 5, Afternoon)

**Refactored `server-auth.js`** (new structure):

```javascript
// Dependencies and configuration (lines 1-60)
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { config } = require('./config/environment');
const { StorageAdapter } = require('./lib/storage/StorageAdapter');
const featureFlags = require('./config/feature-flags');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const PORT = config.AUTH_PORT;

// Initialize storage (lines 61-80)
const storage = new StorageAdapter({
  USE_DATABASE: process.env.USE_DATABASE,
  databaseAdapter: authAdapter,
  dataDir: __dirname,
  performanceMonitor,
});

// Apply middleware (lines 81-160)
app.use(helmet);
app.use(cors);
app.use(express.json());
// ... other middleware

// Mount routes (lines 161-200)
if (featureFlags.isEnabled('USE_MODULAR_AUTH_ROUTES')) {
  // Modular routes
  const { createAuthRoutes } = require('./routes/auth.routes');
  const { createOAuthRoutes } = require('./routes/oauth.routes');
  const { createFileRoutes } = require('./routes/file.routes');
  const { createTeamRoutes } = require('./routes/team.routes');
  const { createOrganizationRoutes } = require('./routes/organization.routes');

  app.use('/api/auth', createAuthRoutes({ storage, performanceMonitor }));
  app.use('/api/auth', createOAuthRoutes({ storage, performanceMonitor }));
  app.use('/api/files', createFileRoutes({ storage, uploadsDir: UPLOADS_DIR }));
  app.use('/api/teams', createTeamRoutes({ storage }));
  app.use('/api/organizations', createOrganizationRoutes({ storage }));
} else {
  // Legacy routes (kept for safety)
  // ... old route handlers ...
}

// Health checks and monitoring (lines 201-250)
app.use(createHealthCheck({ /* ... */ }));
app.use('/api/monitoring', createMonitoringRouter());

// Error handling (lines 251-280)
app.use(securityErrorHandler);
app.use((err, req, res, next) => {
  // Global error handler
});

// Start server (lines 281-400)
httpServer.listen(PORT, () => {
  console.log(`🚀 Auth server running on port ${PORT}`);
});
```

**Lines After Refactor**: ~400 lines (down from 1,177 lines)

**Breakdown**:
- Server setup and middleware: ~160 lines
- Route mounting: ~40 lines
- Health checks: ~50 lines
- Error handling: ~30 lines
- Server startup: ~120 lines

**Lines Saved**: 777 lines (66% reduction)

#### Step 2.9: Testing Strategy (Day 5, Evening)

**Test File**: `/Users/kentino/FluxStudio/tests/controllers/auth/AuthController.test.js`

```javascript
const { AuthController } = require('../../../controllers/auth/AuthController');
const { StorageAdapter } = require('../../../lib/storage/StorageAdapter');
const bcrypt = require('bcryptjs');

describe('AuthController', () => {
  let authController;
  let mockStorage;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      query: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
    };

    // Mock request/response
    mockReq = {
      body: {},
      user: { id: 'test-user-id' },
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    authController = new AuthController({
      storage: mockStorage,
      performanceMonitor: null,
    });
  });

  describe('signup', () => {
    it('should create new user with valid data', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        userType: 'client',
      };

      mockStorage.query.mockResolvedValue([]); // No existing user
      mockStorage.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com',
        name: 'Test User',
        userType: 'client',
      });

      await authController.signup(mockReq, mockRes);

      expect(mockStorage.create).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should reject signup with existing email', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockStorage.query.mockResolvedValue([
        { id: '1', email: 'existing@example.com' },
      ]);

      await authController.signup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Email already registered',
      });
    });

    it('should reject short password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
      };

      await authController.signup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Password must be at least 8 characters',
      });
    });

    it('should reject invalid user type', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        userType: 'invalid',
      };

      await authController.signup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid user type',
      });
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockStorage.query.mockResolvedValue([
        {
          id: 'user-id',
          email: 'test@example.com',
          password: hashedPassword,
          userType: 'client',
        },
      ]);

      await authController.login(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should reject invalid email', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockStorage.query.mockResolvedValue([]);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid email or password',
      });
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockStorage.query.mockResolvedValue([
        {
          id: 'user-id',
          email: 'test@example.com',
          password: hashedPassword,
        },
      ]);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      mockStorage.getById.mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
      });

      await authController.getCurrentUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        // password should not be included
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockStorage.getById.mockResolvedValue(null);

      await authController.getCurrentUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
```

**Integration Tests**: `/Users/kentino/FluxStudio/tests/integration/auth-routes.test.js`

```javascript
const request = require('supertest');
const express = require('express');
const { createAuthRoutes } = require('../../routes/auth.routes');
const { StorageAdapter } = require('../../lib/storage/StorageAdapter');

describe('Auth Routes Integration', () => {
  let app;
  let storage;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());

    storage = new StorageAdapter({
      USE_DATABASE: 'false',
      dataDir: '/tmp/test-storage',
    });

    const authRoutes = createAuthRoutes({ storage });
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/signup', () => {
    it('should create new user and return token', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          userType: 'client',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'newuser@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      // First signup
      await request(app).post('/api/auth/signup').send({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'User One',
      });

      // Second signup with same email
      const response = await request(app).post('/api/auth/signup').send({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'User Two',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app).post('/api/auth/signup').send({
        email: 'logintest@example.com',
        password: 'password123',
        name: 'Login Test',
      });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'logintest@example.com',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'logintest@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
    });
  });
});
```

#### Step 2.10: Rollout & Monitoring (Day 5)

**Rollout Checklist**:
- [ ] All unit tests pass (100+ tests)
- [ ] Integration tests pass
- [ ] Performance benchmarks match baseline
- [ ] Security scan passes
- [ ] Code review approved
- [ ] Documentation updated

**Monitoring Dashboard**:
```javascript
// Add custom metrics for refactored routes
performanceMonitor.incrementCounter('modular_routes_used');
performanceMonitor.recordTiming('auth_controller_signup', duration);
```

**Success Metrics**:
- Lines reduced: 777 lines (66%)
- Controllers created: 5 (Auth, OAuth, File, Team, Organization)
- Test coverage: >90%
- Response time: ±5% of baseline
- Zero regressions

---

## Phase 3: Server-Messaging Decomposition (Days 6-7)

**Impact**: Reduce `server-messaging.js` from 934 lines to ~350 lines

### Current Structure Analysis

The `server-messaging.js` file contains:
- WebSocket handlers (400+ lines)
- REST API endpoints (200+ lines)
- File upload handling (50 lines)
- Message operations (150 lines)
- Channel management (100 lines)

### Decomposition Strategy

#### Step 3.1: Separate WebSocket from REST (Day 6, Morning)

**File**: `/Users/kentino/FluxStudio/websockets/messaging.socket.js`

```javascript
/**
 * Messaging WebSocket Handlers
 * Real-time communication for messaging system
 */

class MessagingSocketHandler {
  constructor({ io, storage, performanceMonitor }) {
    this.io = io;
    this.storage = storage;
    this.performanceMonitor = performanceMonitor;
    this.activeUsers = new Map();
    this._setupHandlers();
  }

  _setupHandlers() {
    this.io.on('connection', (socket) => this._handleConnection(socket));
  }

  async _handleConnection(socket) {
    console.log(`User connected: ${socket.userId}`);

    // Track connection
    this.activeUsers.set(socket.userId, {
      socketId: socket.id,
      email: socket.userEmail,
      status: 'online',
      lastSeen: new Date().toISOString(),
    });

    // Emit user online status
    this.io.emit('user:status', {
      userId: socket.userId,
      status: 'online',
    });

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Setup event handlers
    this._setupSocketEvents(socket);
  }

  _setupSocketEvents(socket) {
    // Channel events
    socket.on('channel:join', (channelId) =>
      this._handleChannelJoin(socket, channelId)
    );
    socket.on('channel:leave', (channelId) =>
      this._handleChannelLeave(socket, channelId)
    );

    // Message events
    socket.on('message:send', (data) =>
      this._handleMessageSend(socket, data)
    );
    socket.on('message:edit', (data) =>
      this._handleMessageEdit(socket, data)
    );
    socket.on('message:delete', (messageId) =>
      this._handleMessageDelete(socket, messageId)
    );
    socket.on('message:react', (data) =>
      this._handleMessageReact(socket, data)
    );

    // Typing indicators
    socket.on('typing:start', (channelId) =>
      this._handleTypingStart(socket, channelId)
    );
    socket.on('typing:stop', (channelId) =>
      this._handleTypingStop(socket, channelId)
    );

    // Direct messages
    socket.on('dm:send', (data) =>
      this._handleDirectMessage(socket, data)
    );

    // Disconnect
    socket.on('disconnect', () =>
      this._handleDisconnect(socket)
    );
  }

  async _handleChannelJoin(socket, channelId) {
    socket.join(`channel:${channelId}`);
    console.log(`User ${socket.userId} joined channel ${channelId}`);

    try {
      // Load recent messages
      const messages = await this.storage.query('messages', {
        channelId,
      }, { limit: 50, sort: { createdAt: 'desc' } });

      socket.emit('channel:messages', messages);
    } catch (error) {
      console.error('Error loading channel messages:', error);
      socket.emit('error', { message: 'Failed to load messages' });
    }
  }

  _handleChannelLeave(socket, channelId) {
    socket.leave(`channel:${channelId}`);
    console.log(`User ${socket.userId} left channel ${channelId}`);
  }

  async _handleMessageSend(socket, data) {
    const { channelId, text, replyTo, file } = data;

    if (!channelId || (!text && !file)) {
      socket.emit('error', {
        message: 'Channel ID and either text or file are required'
      });
      return;
    }

    try {
      const messageData = {
        conversationId: channelId,
        authorId: socket.userId,
        content: text || '',
        messageType: file ? 'file' : 'text',
        replyToId: replyTo || null,
        attachments: file ? [file] : [],
        metadata: {
          userEmail: socket.userEmail,
        },
      };

      const newMessage = await this.storage.create('messages', messageData);

      // Emit to all users in the channel
      this.io.to(`channel:${channelId}`).emit('message:new', newMessage);

      // Track metric
      if (this.performanceMonitor) {
        this.performanceMonitor.incrementCounter('messages_sent');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async _handleMessageEdit(socket, data) {
    const { messageId, text } = data;

    try {
      const message = await this.storage.getById('messages', messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Authorization check
      if (message.authorId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const updatedMessage = await this.storage.update('messages', messageId, {
        content: text,
        edited: true,
      });

      // Emit to all users in the channel
      this.io.to(`channel:${message.conversationId}`).emit(
        'message:updated',
        updatedMessage
      );
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  }

  async _handleMessageDelete(socket, messageId) {
    try {
      const message = await this.storage.getById('messages', messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Authorization check
      if (message.authorId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      await this.storage.delete('messages', messageId);

      // Emit to all users in the channel
      this.io.to(`channel:${message.conversationId}`).emit(
        'message:deleted',
        messageId
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }

  _handleTypingStart(socket, channelId) {
    socket.to(`channel:${channelId}`).emit('user:typing', {
      userId: socket.userId,
      userEmail: socket.userEmail,
      channelId,
    });
  }

  _handleTypingStop(socket, channelId) {
    socket.to(`channel:${channelId}`).emit('user:stopped-typing', {
      userId: socket.userId,
      channelId,
    });
  }

  async _handleDirectMessage(socket, data) {
    const { recipientId, text } = data;

    if (!recipientId || !text) {
      socket.emit('error', {
        message: 'Recipient and text are required'
      });
      return;
    }

    try {
      const messageData = {
        authorId: socket.userId,
        content: text,
        messageType: 'dm',
        metadata: {
          recipientId,
          senderEmail: socket.userEmail,
          read: false,
        },
      };

      const newMessage = await this.storage.create('messages', messageData);

      // Send to recipient if online
      this.io.to(`user:${recipientId}`).emit('dm:new', newMessage);

      // Send back to sender for confirmation
      socket.emit('dm:sent', newMessage);
    } catch (error) {
      console.error('Error sending DM:', error);
      socket.emit('error', { message: 'Failed to send direct message' });
    }
  }

  async _handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.userId}`);

    // Update user status
    const userData = this.activeUsers.get(socket.userId);
    if (userData) {
      userData.status = 'offline';
      userData.lastSeen = new Date().toISOString();
    }

    // Remove from active users after delay (for reconnection)
    setTimeout(() => {
      if (this.activeUsers.get(socket.userId)?.status === 'offline') {
        this.activeUsers.delete(socket.userId);
      }
    }, 5000);

    // Broadcast user status
    this.io.emit('user:status', {
      userId: socket.userId,
      status: 'offline',
    });
  }

  getActiveUsers() {
    return Array.from(this.activeUsers.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    }));
  }
}

module.exports = { MessagingSocketHandler };
```

#### Step 3.2: Extract REST Controllers (Day 6, Afternoon)

**File**: `/Users/kentino/FluxStudio/controllers/messaging/MessageController.js`

```javascript
/**
 * MessageController - REST API for messages
 */

class MessageController {
  constructor({ storage }) {
    this.storage = storage;
  }

  /**
   * Search messages
   * GET /api/search/messages
   */
  async searchMessages(req, res) {
    try {
      const { q: searchTerm, conversation_id, limit = 20, offset = 0 } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          message: 'Search term must be at least 2 characters long',
        });
      }

      // Simple search implementation (can be enhanced with full-text search)
      const messages = await this.storage.query('messages', {
        content: new RegExp(searchTerm, 'i'),
        ...(conversation_id && { conversationId: conversation_id }),
      }, {
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.json({
        success: true,
        results: messages,
        query: searchTerm,
        total: messages.length,
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  }

  /**
   * Get message thread
   * GET /api/messages/:messageId/thread
   */
  async getMessageThread(req, res) {
    try {
      const { messageId } = req.params;
      const { limit = 50 } = req.query;

      // Get all messages that reply to this message
      const threadMessages = await this.storage.query('messages', {
        replyToId: messageId,
      }, {
        limit: parseInt(limit),
        sort: { createdAt: 'asc' },
      });

      res.json({
        success: true,
        thread: threadMessages,
        parentMessageId: messageId,
      });
    } catch (error) {
      console.error('Thread fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch thread' });
    }
  }

  /**
   * Get conversation messages
   * GET /api/conversations/:conversationId/messages
   */
  async getConversationMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const messages = await this.storage.query('messages', {
        conversationId: parseInt(conversationId),
      }, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sort: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        messages,
        conversationId,
        total: messages.length,
      });
    } catch (error) {
      console.error('Messages fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  }
}

module.exports = { MessageController };
```

**File**: `/Users/kentino/FluxStudio/controllers/messaging/ConversationController.js`

```javascript
/**
 * ConversationController - REST API for conversations/channels
 */

class ConversationController {
  constructor({ storage }) {
    this.storage = storage;
  }

  /**
   * Get conversations
   * GET /api/conversations
   */
  async getConversations(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const conversations = await this.storage.query('channels', {}, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sort: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        conversations,
        total: conversations.length,
      });
    } catch (error) {
      console.error('Conversations fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  }

  /**
   * Create conversation/channel
   * POST /api/channels
   */
  async createChannel(req, res) {
    try {
      const { name, teamId, description } = req.body;

      if (!name || !teamId) {
        return res.status(400).json({
          message: 'Name and team ID are required'
        });
      }

      const newChannel = await this.storage.create('channels', {
        name,
        teamId,
        description: description || '',
        createdBy: req.user.id,
      });

      res.json(newChannel);
    } catch (error) {
      console.error('Create channel error:', error);
      res.status(500).json({ message: 'Failed to create channel' });
    }
  }

  /**
   * Get channels for team
   * GET /api/channels/:teamId
   */
  async getTeamChannels(req, res) {
    try {
      const channels = await this.storage.query('channels', {
        teamId: req.params.teamId,
      });

      res.json(channels);
    } catch (error) {
      console.error('Get team channels error:', error);
      res.status(500).json({ message: 'Failed to get channels' });
    }
  }

  /**
   * Get conversation threads
   * GET /api/conversations/:conversationId/threads
   */
  async getConversationThreads(req, res) {
    try {
      const { conversationId } = req.params;
      const { limit = 20 } = req.query;

      // Get messages that have replies (threads)
      const allMessages = await this.storage.query('messages', {
        conversationId: parseInt(conversationId),
      });

      // Find messages with replies
      const threadsMap = new Map();

      allMessages.forEach(message => {
        if (message.replyToId) {
          if (!threadsMap.has(message.replyToId)) {
            threadsMap.set(message.replyToId, []);
          }
          threadsMap.get(message.replyToId).push(message);
        }
      });

      const threads = Array.from(threadsMap.entries())
        .map(([parentId, replies]) => ({
          parentMessageId: parentId,
          replyCount: replies.length,
          latestReply: replies[replies.length - 1],
        }))
        .slice(0, parseInt(limit));

      res.json({
        success: true,
        threads,
        conversationId,
      });
    } catch (error) {
      console.error('Threads fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch threads' });
    }
  }
}

module.exports = { ConversationController };
```

#### Step 3.3: Refactored Server-Messaging (Day 7)

**Final `server-messaging.js`** (simplified):

```javascript
// Dependencies (lines 1-30)
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { config } = require('./config/environment');
const { StorageAdapter } = require('./lib/storage/StorageAdapter');
const { MessagingSocketHandler } = require('./websockets/messaging.socket');
const featureFlags = require('./config/feature-flags');

// Initialize app (lines 31-70)
const app = express();
const httpServer = createServer(app);
const PORT = config.MESSAGING_PORT;

// Initialize storage
const storage = new StorageAdapter({
  USE_DATABASE: process.env.USE_DATABASE,
  databaseAdapter: messagingAdapter,
  dataDir: __dirname,
  performanceMonitor,
});

// Apply middleware (lines 71-120)
app.use(helmet);
app.use(cors);
app.use(express.json());
app.use(performanceMonitor.createExpressMiddleware('messaging-service'));

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize WebSocket (lines 121-140)
const io = new Server(httpServer, {
  cors: {
    origin: config.CORS_ORIGINS,
    credentials: true,
  },
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Setup WebSocket handlers
const socketHandler = new MessagingSocketHandler({
  io,
  storage,
  performanceMonitor,
});

// Mount REST routes (lines 141-180)
if (featureFlags.isEnabled('USE_MODULAR_MESSAGING_ROUTES')) {
  const { createMessageRoutes } = require('./routes/message.routes');
  const { createConversationRoutes } = require('./routes/conversation.routes');
  const { createUploadRoutes } = require('./routes/upload.routes');

  app.use('/api/messages', createMessageRoutes({ storage }));
  app.use('/api/conversations', createConversationRoutes({ storage }));
  app.use('/api', createUploadRoutes({ storage, uploadsDir: UPLOADS_DIR }));
} else {
  // Legacy routes
  // ... old implementation ...
}

// Health checks (lines 181-220)
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'messaging-service',
    port: PORT,
    activeUsers: socketHandler.getActiveUsers().length,
    timestamp: new Date().toISOString(),
  });
});

app.use(createHealthCheck({ serviceName: 'messaging-service', port: PORT }));
app.use('/api/monitoring', createMonitoringRouter());

// Error handling (lines 221-240)
app.use(securityErrorHandler);
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: config.isDevelopment ? err.message : 'Internal server error',
  });
});

// Start server (lines 241-350)
httpServer.listen(PORT, () => {
  console.log(`🚀 Messaging Service running on port ${PORT}`);
  console.log(`🌐 WebSocket available on ws://localhost:${PORT}`);
});
```

**Lines After Refactor**: ~350 lines (down from 934 lines)

**Lines Saved**: 584 lines (62% reduction)

---

## Phase 4: Context Provider Simplification (Days 8-9)

**Impact**: Simplify context providers with custom hooks

### Current Problem

Both `MessagingContext.tsx` and `WorkspaceContext.tsx` are monolithic providers that:
- Mix state management with business logic
- Contain tightly coupled actions
- Have large reducer functions (100+ lines)
- Difficult to test in isolation

### Solution: Extract Custom Hooks

#### Step 4.1: Split MessagingContext into Hooks (Day 8)

**File**: `/Users/kentino/FluxStudio/src/hooks/useConversations.ts`

```typescript
/**
 * useConversations - Manage conversations state
 * Extracted from MessagingContext
 */

import { useState, useCallback } from 'react';
import { Conversation } from '../types/messaging';
import { messagingService } from '../services/messagingService';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (data: any) => {
    const newConversation = await messagingService.createConversation(data);
    setConversations(prev => [newConversation, ...prev]);
    return newConversation;
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);

    // Mark as read
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  }, []);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === id ? { ...conv, ...updates } : conv
      )
    );
  }, []);

  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  return {
    conversations,
    activeConversationId,
    activeConversation,
    loading,
    unreadCount,
    loadConversations,
    createConversation,
    selectConversation,
    updateConversation,
  };
}
```

**File**: `/Users/kentino/FluxStudio/src/hooks/useMessages.ts`

```typescript
/**
 * useMessages - Manage messages state
 * Extracted from MessagingContext
 */

import { useState, useCallback, useEffect } from 'react';
import { Message } from '../types/messaging';
import { messagingService } from '../services/messagingService';

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(false);

  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true);
    try {
      const data = await messagingService.getMessages(convId);
      setMessages(prev => ({
        ...prev,
        [convId]: data,
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (data: any) => {
    await messagingService.sendMessage(data);
    // Message will be added via real-time listener
  }, []);

  const addMessage = useCallback((message: Message) => {
    const convId = message.conversationId;
    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), message],
    }));
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      Object.keys(newMessages).forEach(convId => {
        newMessages[convId] = newMessages[convId].map(msg =>
          msg.id === id ? { ...msg, ...updates } : msg
        );
      });
      return newMessages;
    });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      Object.keys(newMessages).forEach(convId => {
        newMessages[convId] = newMessages[convId].filter(msg => msg.id !== id);
      });
      return newMessages;
    });
  }, []);

  // Auto-load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);

  const currentMessages = conversationId ? (messages[conversationId] || []) : [];

  return {
    messages,
    currentMessages,
    loading,
    loadMessages,
    sendMessage,
    addMessage,
    updateMessage,
    deleteMessage,
  };
}
```

**File**: `/Users/kentino/FluxStudio/src/hooks/usePresence.ts`

```typescript
/**
 * usePresence - Manage user presence and typing indicators
 * Extracted from MessagingContext
 */

import { useState, useCallback } from 'react';
import { UserPresence } from '../types/messaging';
import { messagingService } from '../services/messagingService';

export function usePresence() {
  const [userPresence, setUserPresence] = useState<Record<string, UserPresence>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const updatePresence = useCallback((presence: UserPresence) => {
    setUserPresence(prev => ({
      ...prev,
      [presence.userId]: presence,
    }));
  }, []);

  const addTypingUser = useCallback((conversationId: string, userId: string) => {
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), userId].filter(
        (id, index, arr) => arr.indexOf(id) === index // Deduplicate
      ),
    }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeTypingUser(conversationId, userId);
    }, 5000);
  }, []);

  const removeTypingUser = useCallback((conversationId: string, userId: string) => {
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).filter(id => id !== userId),
    }));
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    messagingService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    messagingService.stopTyping(conversationId);
  }, []);

  const getTypingUsers = useCallback((conversationId: string) => {
    return typingUsers[conversationId] || [];
  }, [typingUsers]);

  const getUserPresence = useCallback((userId: string) => {
    return userPresence[userId] || null;
  }, [userPresence]);

  return {
    userPresence,
    typingUsers,
    updatePresence,
    addTypingUser,
    removeTypingUser,
    startTyping,
    stopTyping,
    getTypingUsers,
    getUserPresence,
  };
}
```

#### Step 4.2: Simplified MessagingContext (Day 8, Afternoon)

**Refactored `/Users/kentino/FluxStudio/src/contexts/MessagingContext.tsx`**:

```typescript
/**
 * Simplified Messaging Context
 * Uses custom hooks for state management
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { usePresence } from '../hooks/usePresence';
import { useNotifications } from '../hooks/useNotifications';
import { MessageUser } from '../types/messaging';
import { messagingService } from '../services/messagingService';

interface MessagingContextType {
  // Conversations
  conversations: ReturnType<typeof useConversations>['conversations'];
  activeConversationId: string | null;
  activeConversation: ReturnType<typeof useConversations>['activeConversation'];
  unreadCount: number;
  loadConversations: ReturnType<typeof useConversations>['loadConversations'];
  createConversation: ReturnType<typeof useConversations>['createConversation'];
  selectConversation: ReturnType<typeof useConversations>['selectConversation'];

  // Messages
  currentMessages: ReturnType<typeof useMessages>['currentMessages'];
  sendMessage: ReturnType<typeof useMessages>['sendMessage'];

  // Presence
  typingUsers: ReturnType<typeof usePresence>['typingUsers'];
  startTyping: ReturnType<typeof usePresence>['startTyping'];
  stopTyping: ReturnType<typeof usePresence>['stopTyping'];

  // Notifications
  notifications: ReturnType<typeof useNotifications>['notifications'];
  unreadNotifications: number;
  markNotificationAsRead: ReturnType<typeof useNotifications>['markAsRead'];
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: ReactNode;
  currentUser: MessageUser;
}

export function MessagingProvider({ children, currentUser }: MessagingProviderProps) {
  const conversationsHook = useConversations();
  const messagesHook = useMessages(conversationsHook.activeConversationId);
  const presenceHook = usePresence();
  const notificationsHook = useNotifications();

  // Initialize real-time listeners
  useEffect(() => {
    messagingService.setCurrentUser(currentUser);

    // Message events
    const handleMessageReceived = (message: any) => {
      messagesHook.addMessage(message);
    };

    // Typing events
    const handleTypingStarted = (data: any) => {
      presenceHook.addTypingUser(data.conversationId, data.userId);
    };

    const handleTypingStopped = (data: any) => {
      presenceHook.removeTypingUser(data.conversationId, data.userId);
    };

    // Presence events
    const handleUserOnline = (user: any) => {
      presenceHook.updatePresence(user);
    };

    const handleUserOffline = (user: any) => {
      presenceHook.updatePresence(user);
    };

    // Notification events
    const handleMentionReceived = (notification: any) => {
      notificationsHook.add(notification);
    };

    // Setup listeners
    messagingService.onMessageReceived(handleMessageReceived);
    messagingService.onTypingStarted(handleTypingStarted);
    messagingService.onTypingStopped(handleTypingStopped);
    messagingService.onUserOnline(handleUserOnline);
    messagingService.onUserOffline(handleUserOffline);
    messagingService.onMentionReceived(handleMentionReceived);

    return () => {
      // Cleanup
      messagingService.off('message:received', handleMessageReceived);
      messagingService.off('typing:started', handleTypingStarted);
      messagingService.off('typing:stopped', handleTypingStopped);
      messagingService.off('user:online', handleUserOnline);
      messagingService.off('user:offline', handleUserOffline);
      messagingService.off('notification:mention', handleMentionReceived);
    };
  }, [currentUser]);

  const value: MessagingContextType = {
    // Conversations
    conversations: conversationsHook.conversations,
    activeConversationId: conversationsHook.activeConversationId,
    activeConversation: conversationsHook.activeConversation,
    unreadCount: conversationsHook.unreadCount,
    loadConversations: conversationsHook.loadConversations,
    createConversation: conversationsHook.createConversation,
    selectConversation: conversationsHook.selectConversation,

    // Messages
    currentMessages: messagesHook.currentMessages,
    sendMessage: messagesHook.sendMessage,

    // Presence
    typingUsers: presenceHook.typingUsers,
    startTyping: presenceHook.startTyping,
    stopTyping: presenceHook.stopTyping,

    // Notifications
    notifications: notificationsHook.notifications,
    unreadNotifications: notificationsHook.unreadCount,
    markNotificationAsRead: notificationsHook.markAsRead,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}

export default MessagingContext;
```

**Lines After Refactor**: ~150 lines (down from 457 lines)

**Lines Saved**: 307 lines (67% reduction)

#### Step 4.3: Simplify WorkspaceContext (Day 9)

**Similar approach**: Extract hooks for:
- `useWorkspaceState` - Active entities and context
- `useWorkspaceActivity` - Activity tracking
- `useWorkspaceSuggestions` - Contextual suggestions
- `useWorkspaceNavigation` - Breadcrumbs and navigation

**Expected Reduction**: ~250 lines (down from 474 lines)

---

## Phase 5: Testing, Deployment & Rollback (Day 10)

### Comprehensive Testing Strategy

#### Unit Tests
- [ ] Storage adapter (100+ tests)
- [ ] Controllers (200+ tests)
- [ ] WebSocket handlers (50+ tests)
- [ ] Custom hooks (100+ tests)
- **Total**: 450+ unit tests

#### Integration Tests
- [ ] Auth routes end-to-end
- [ ] Messaging WebSocket flow
- [ ] File upload/download
- [ ] Team management workflow
- **Total**: 50+ integration tests

#### Performance Tests
```javascript
// Benchmark script
const autocannon = require('autocannon');

async function runBenchmarks() {
  console.log('Running performance benchmarks...');

  // Test auth endpoint
  const authResult = await autocannon({
    url: 'http://localhost:3001/api/auth/login',
    connections: 50,
    duration: 30,
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('Auth endpoint results:');
  console.log(`  Requests/sec: ${authResult.requests.average}`);
  console.log(`  Latency (avg): ${authResult.latency.mean}ms`);

  // Compare with baseline
  const baseline = {
    requestsPerSec: 500,
    latency: 50,
  };

  const performanceDelta = {
    requests: ((authResult.requests.average - baseline.requestsPerSec) / baseline.requestsPerSec) * 100,
    latency: ((authResult.latency.mean - baseline.latency) / baseline.latency) * 100,
  };

  console.log('\nPerformance vs Baseline:');
  console.log(`  Requests/sec: ${performanceDelta.requests.toFixed(2)}%`);
  console.log(`  Latency: ${performanceDelta.latency.toFixed(2)}%`);

  // Fail if performance degrades more than 10%
  if (performanceDelta.requests < -10 || performanceDelta.latency > 10) {
    throw new Error('Performance degradation detected!');
  }
}

runBenchmarks();
```

### Deployment Process

#### Day 10 Schedule

**Morning (9am-12pm)**:
1. Final code review
2. Run full test suite
3. Performance benchmarks
4. Security scan
5. Build production artifacts

**Afternoon (12pm-3pm)**:
1. Deploy to staging with flags OFF
2. Run smoke tests
3. Enable feature flags 10% (canary)
4. Monitor metrics for 2 hours

**Evening (3pm-6pm)**:
1. Review canary metrics
2. If good: increase to 50%
3. Monitor for 2 hours
4. If good: enable 100%
5. Document results

### Rollback Procedures

**Immediate Rollback** (if critical issues):
```bash
# 1. Disable feature flags
export FEATURE_STORAGE_ADAPTER=false
export FEATURE_MODULAR_AUTH_ROUTES=false
export FEATURE_MODULAR_MESSAGING_ROUTES=false

# 2. Restart services
pm2 restart auth-service
pm2 restart messaging-service

# 3. Verify services are healthy
curl http://localhost:3001/health
curl http://localhost:3002/health

# 4. Check error logs
pm2 logs --err --lines 100
```

**Gradual Rollback** (if non-critical issues):
```bash
# Reduce canary percentage
export FEATURE_CANARY_PERCENTAGE=10

# Monitor for improvement
# If issues persist, do immediate rollback
```

### Monitoring Checklist

**Metrics to Watch**:
- [ ] Error rate (should be <0.1%)
- [ ] Response time (should be ±5% of baseline)
- [ ] Request throughput (should not decrease)
- [ ] WebSocket connections (should remain stable)
- [ ] Database query performance
- [ ] Memory usage
- [ ] CPU usage

**Alerts**:
- Critical: Error rate >1%
- Warning: Response time >10% baseline
- Warning: Memory usage >80%

---

## Success Metrics & KPIs

### Code Quality Metrics

| Metric | Before | Target | Improvement |
|--------|--------|--------|-------------|
| Total Lines | 3,042 | 1,250 | 59% reduction |
| server-auth.js | 1,177 | 400 | 66% reduction |
| server-messaging.js | 934 | 350 | 63% reduction |
| MessagingContext | 457 | 150 | 67% reduction |
| WorkspaceContext | 474 | 250 | 47% reduction |
| Cyclomatic Complexity | 15-20 | <10 | 40-50% reduction |
| Function Length (avg) | 40 lines | 20 lines | 50% reduction |
| Test Coverage | 65% | 90% | +25% |

### Performance Metrics

| Metric | Baseline | After Refactor | Tolerance |
|--------|----------|----------------|-----------|
| Auth Login | 45ms | 47ms | ±5% |
| Message Send | 30ms | 31ms | ±5% |
| File Upload | 120ms | 118ms | ±5% |
| WebSocket Latency | 15ms | 14ms | ±5% |
| Memory Usage | 250MB | 245MB | ±10% |

### Development Velocity

- **Onboarding Time**: Reduced from 2 weeks to 1 week (new developers)
- **Feature Development**: 30% faster (smaller, focused modules)
- **Bug Fix Time**: 40% faster (easier to locate issues)
- **Code Review Time**: 50% faster (smaller PRs, clearer logic)

---

## Risk Mitigation

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data loss during migration | Low | Critical | - Backup before deployment<br>- Run parallel (old + new)<br>- Extensive testing |
| Performance degradation | Medium | High | - Continuous benchmarking<br>- Feature flags<br>- Quick rollback |
| Breaking API contracts | Low | High | - Integration tests<br>- API versioning<br>- Gradual rollout |
| WebSocket disconnections | Medium | Medium | - Reconnection logic<br>- State recovery<br>- Monitoring |
| Cache invalidation issues | Medium | Medium | - Conservative TTLs<br>- Manual invalidation<br>- Testing |

### Contingency Plans

**If performance degrades >10%**:
1. Immediately rollback to 10% canary
2. Profile bottlenecks
3. Optimize specific issues
4. Retry deployment

**If data consistency issues**:
1. Immediate rollback
2. Review storage adapter logic
3. Add additional validation
4. Retry with enhanced testing

**If WebSocket issues**:
1. Rollback messaging features only
2. Keep auth refactoring (independent)
3. Debug WebSocket handler
4. Retry messaging separately

---

## Daily Execution Checklist

### Day 1: Storage Abstraction Setup
- [ ] Create StorageAdapter interface
- [ ] Implement FileStorageAdapter
- [ ] Write comprehensive tests (50+ tests)
- [ ] Document API

### Day 2: Storage Integration
- [ ] Feature flag implementation
- [ ] Integrate storage adapter in both servers
- [ ] Run tests
- [ ] Deploy with flag OFF
- [ ] Enable 10% canary
- [ ] Monitor 24 hours

### Day 3: Auth Controllers
- [ ] Extract AuthController
- [ ] Extract OAuthController
- [ ] Create route definitions
- [ ] Write tests (50+ tests)
- [ ] Integration with feature flags

### Day 4: File & Team Controllers
- [ ] Extract FileController
- [ ] Extract TeamController
- [ ] Create route definitions
- [ ] Write tests (70+ tests)
- [ ] Integration testing

### Day 5: Auth Deployment
- [ ] Final server-auth integration
- [ ] Full test suite
- [ ] Performance benchmarks
- [ ] Deploy to staging
- [ ] Canary deployment (10% → 50% → 100%)
- [ ] Monitor

### Day 6: Messaging Decomposition
- [ ] Extract WebSocket handler
- [ ] Create MessageController
- [ ] Create ConversationController
- [ ] Write tests (60+ tests)

### Day 7: Messaging Deployment
- [ ] Final server-messaging integration
- [ ] Full test suite
- [ ] Performance benchmarks
- [ ] Deploy to staging
- [ ] Canary deployment
- [ ] Monitor

### Day 8: Context Hooks
- [ ] Extract useConversations
- [ ] Extract useMessages
- [ ] Extract usePresence
- [ ] Extract useNotifications
- [ ] Simplify MessagingContext
- [ ] Write tests (80+ tests)

### Day 9: Workspace Simplification
- [ ] Extract workspace hooks
- [ ] Simplify WorkspaceContext
- [ ] Write tests (60+ tests)
- [ ] Integration testing
- [ ] Deploy to staging

### Day 10: Final Deployment
- [ ] Full regression testing
- [ ] Performance validation
- [ ] Security audit
- [ ] Production deployment
- [ ] Monitor all metrics
- [ ] Remove old code (after 1 week stable)
- [ ] Update documentation
- [ ] Sprint retrospective

---

## Post-Refactoring Maintenance

### Week 1 After Deployment
- Monitor all metrics daily
- Quick response to any issues
- Keep old code in repository (commented/flagged)

### Week 2-4
- Continue monitoring
- Gather team feedback
- Identify any new issues

### After 1 Month
- If stable: remove old code entirely
- Update team documentation
- Share learnings in team meeting
- Plan next refactoring phase

---

## Documentation Updates

### Files to Update
- [ ] README.md - Architecture section
- [ ] CONTRIBUTING.md - New module structure
- [ ] API_DOCS.md - Updated endpoints
- [ ] ARCHITECTURE.md - New diagrams
- [ ] TESTING.md - New test structure

### Code Comments
- [ ] Add JSDoc to all controllers
- [ ] Add JSDoc to storage adapter
- [ ] Add inline comments for complex logic
- [ ] Update route documentation

---

## Conclusion

This refactoring plan reduces complexity by 59% (from 3,042 to 1,250 lines) while maintaining 100% backward compatibility and zero downtime. The incremental approach with feature flags, comprehensive testing, and gradual rollout ensures safety at every step.

**Key Success Factors**:
1. Feature flags for safe rollback
2. Parallel running (old + new code)
3. Comprehensive testing (450+ tests)
4. Continuous monitoring
5. Gradual rollout (10% → 50% → 100%)

**Expected Benefits**:
- 59% reduction in codebase size
- 30-40% reduction in complexity
- 50% faster code reviews
- 30% faster feature development
- Improved onboarding for new developers
- Better maintainability and testability

Sprint 12 will establish a foundation for continued improvement, making FluxStudio's codebase more maintainable, scalable, and developer-friendly while maintaining the stability and security required for production.
