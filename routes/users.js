/**
 * Users Routes - User Management API
 *
 * Provides endpoints for:
 * - Listing users (for starting conversations)
 * - Getting user profiles
 *
 * Extracted from server-unified.js during Sprint 18 decomposition.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { zodValidate } = require('../middleware/zodValidate');
const { updateUserSchema } = require('../lib/schemas/users');
const { createLogger } = require('../lib/logger');
const log = createLogger('Users');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all users (for starting new conversations and admin user management)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { search, limit = 50, excludeSelf = true, status, role, page } = req.query;

  let users = [];
  let total = 0;
  const parsedLimit = parseInt(limit);
  const parsedPage = page ? parseInt(page) : null;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;
  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  if (USE_DATABASE) {
    const filterParams = [];
    const conditions = [];

    if (excludeSelf === 'true' || excludeSelf === true) {
      conditions.push(`id != $${filterParams.length + 1}`);
      filterParams.push(req.user.id);
    }

    if (search) {
      conditions.push(`(name ILIKE $${filterParams.length + 1} OR email ILIKE $${filterParams.length + 1})`);
      filterParams.push(`%${search}%`);
    }

    if (status && status !== 'all') {
      conditions.push(`status = $${filterParams.length + 1}`);
      filterParams.push(status);
    }

    if (role && role !== 'all') {
      conditions.push(`role = $${filterParams.length + 1}`);
      filterParams.push(role);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Get total count for pagination
    if (parsedPage) {
      const countSql = 'SELECT COUNT(*) as total FROM users' + whereClause;
      const countResult = await query(countSql, filterParams);
      total = parseInt(countResult.rows[0].total);
    }

    const queryParams = [...filterParams];
    let sql = 'SELECT id, name, email, avatar, status, role, created_at FROM users' + whereClause;
    sql += ` ORDER BY name LIMIT $${queryParams.length + 1}`;
    queryParams.push(parsedLimit);

    if (parsedPage) {
      sql += ` OFFSET $${queryParams.length + 1}`;
      queryParams.push(offset);
    }

    const result = await query(sql, queryParams);
    users = result.rows;
    if (!parsedPage) total = users.length;
  } else {
    const fs = require('fs');
    const path = require('path');
    const USERS_FILE = path.join(__dirname, '..', 'users.json');
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    let allUsers = JSON.parse(data).users;

    if (excludeSelf === 'true' || excludeSelf === true) {
      allUsers = allUsers.filter(u => u.id !== req.user.id);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower))
      );
    }

    if (status && status !== 'all') {
      allUsers = allUsers.filter(u => (u.status || 'offline') === status);
    }

    if (role && role !== 'all') {
      allUsers = allUsers.filter(u => (u.userType || u.role) === role);
    }

    total = allUsers.length;

    const sliceStart = parsedPage ? offset : 0;
    const sliceEnd = parsedPage ? offset + parsedLimit : parsedLimit;

    users = allUsers.slice(sliceStart, sliceEnd).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      status: u.status || 'offline',
      role: u.userType || u.role,
      createdAt: u.createdAt
    }));
  }

  res.json({ users, total, page: parsedPage || 1, limit: parsedLimit });
}));

// Get user by ID
router.get('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  let user = null;

  if (USE_DATABASE) {
    const result = await query(
      'SELECT id, name, email, avatar, status, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    user = result.rows[0] || null;
  } else {
    const fs = require('fs');
    const path = require('path');
    const USERS_FILE = path.join(__dirname, '..', 'users.json');
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const allUsers = JSON.parse(data).users;
    const found = allUsers.find(u => u.id === userId);
    if (found) {
      user = {
        id: found.id,
        name: found.name,
        email: found.email,
        avatar: found.avatar,
        status: found.status || 'offline',
        role: found.userType || found.role,
        createdAt: found.createdAt
      };
    }
  }

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  res.json({ user });
}));

// Update user (admin only)
router.patch('/:id', authenticateToken, zodValidate(updateUserSchema), asyncHandler(async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required', code: 'USER_ADMIN_REQUIRED' });
  }

  const { id } = req.params;
  const { status, role, name } = req.body;
  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  if (USE_DATABASE) {
    const setClauses = [];
    const params = [];

    if (status !== undefined) {
      setClauses.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (role !== undefined) {
      setClauses.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    if (name !== undefined) {
      setClauses.push(`name = $${params.length + 1}`);
      params.push(name);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update', code: 'USER_NO_FIELDS' });
    }

    params.push(id);
    const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING id, name, email, avatar, status, role`;
    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    res.json({ user: result.rows[0] });
  } else {
    const fs = require('fs');
    const path = require('path');
    const USERS_FILE = path.join(__dirname, '..', 'users.json');
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const userIndex = parsed.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (status !== undefined) parsed.users[userIndex].status = status;
    if (role !== undefined) parsed.users[userIndex].userType = role;
    if (name !== undefined) parsed.users[userIndex].name = name;

    fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2));

    const u = parsed.users[userIndex];
    res.json({ user: { id: u.id, name: u.name, email: u.email, avatar: u.avatar, status: u.status || 'offline', role: u.userType || u.role } });
  }
}));

// Delete user (admin only)
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required', code: 'USER_ADMIN_REQUIRED' });
  }

  const { id } = req.params;
  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  if (USE_DATABASE) {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } else {
    const fs = require('fs');
    const path = require('path');
    const USERS_FILE = path.join(__dirname, '..', 'users.json');
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const userIndex = parsed.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    parsed.users.splice(userIndex, 1);
    fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2));

    res.json({ success: true, message: 'User deleted successfully' });
  }
}));

module.exports = router;
