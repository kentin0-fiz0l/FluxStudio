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

const router = express.Router();

// Get all users (for starting new conversations)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, limit = 50, excludeSelf = true } = req.query;

    let users = [];
    const USE_DATABASE = process.env.USE_DATABASE === 'true';

    if (USE_DATABASE) {
      let sql = 'SELECT id, name, email, avatar, status, role FROM users';
      const params = [];
      const conditions = [];

      if (excludeSelf === 'true' || excludeSelf === true) {
        conditions.push(`id != $${params.length + 1}`);
        params.push(req.user.id);
      }

      if (search) {
        conditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ` ORDER BY name LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const result = await query(sql, params);
      users = result.rows;
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

      users = allUsers.slice(0, parseInt(limit)).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        status: u.status || 'offline',
        role: u.userType || u.role
      }));
    }

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
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
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;
