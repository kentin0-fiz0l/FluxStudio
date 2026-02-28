/**
 * Search Routes - Unified Full-Text Search API
 *
 * Provides a single endpoint for searching across projects, files, tasks, and messages
 * using PostgreSQL full-text search with ts_vector/ts_rank.
 *
 * GET /api/search?q=...&types=...&limit=...&offset=...&sortBy=...&sortOrder=...
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/config');
const { authenticateToken } = require('../lib/auth/middleware');
const { createLogger } = require('../lib/logger');
const log = createLogger('Search');

/**
 * GET /api/search
 * Full-text search across projects, files, tasks, messages
 * Query params: q (required), types (comma-separated), limit, offset, sortBy, sortOrder
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q, types, limit = 20, offset = 0, sortBy = 'relevance', sortOrder = 'desc' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const maxLimit = Math.min(parseInt(limit) || 20, 100);
    const searchOffset = parseInt(offset) || 0;
    const userId = req.user.id;

    // Parse requested types
    const requestedTypes = types ? types.split(',').map(t => t.trim()) : ['project', 'file', 'task', 'message'];

    const results = [];
    const facets = { types: { project: 0, file: 0, task: 0, message: 0 }, projects: [] };

    // Search projects using PostgreSQL full-text search
    if (requestedTypes.includes('project')) {
      try {
        const projectResults = await query(`
          SELECT id, name, description, status, created_at, updated_at,
            ts_rank(
              setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
              setweight(to_tsvector('english', coalesce(description, '')), 'B'),
              plainto_tsquery('english', $1)
            ) AS rank
          FROM projects
          WHERE (
            to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
            @@ plainto_tsquery('english', $1)
            OR name ILIKE $2
          )
          AND (owner_id = $3 OR id IN (
            SELECT project_id FROM project_members WHERE user_id = $3
          ))
          ORDER BY rank DESC
          LIMIT $4
        `, [searchQuery, `%${searchQuery}%`, userId, maxLimit]);

        for (const row of projectResults.rows || []) {
          results.push({
            id: row.id,
            type: 'project',
            title: row.name,
            description: row.description,
            score: parseFloat(row.rank) || 0,
            metadata: {
              status: row.status,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            },
            url: `/projects/${row.id}`,
          });
          facets.types.project++;
        }
      } catch (e) {
        log.warn('Project search failed', e);
      }
    }

    // Search files
    if (requestedTypes.includes('file')) {
      try {
        const fileResults = await query(`
          SELECT f.id, f.name, f.description, f.project_id, f.mime_type, f.created_at,
            p.name as project_name,
            ts_rank(
              to_tsvector('english', coalesce(f.name, '') || ' ' || coalesce(f.description, '')),
              plainto_tsquery('english', $1)
            ) AS rank
          FROM files f
          LEFT JOIN projects p ON f.project_id = p.id
          WHERE (
            to_tsvector('english', coalesce(f.name, '') || ' ' || coalesce(f.description, ''))
            @@ plainto_tsquery('english', $1)
            OR f.name ILIKE $2
          )
          AND f.project_id IN (
            SELECT id FROM projects WHERE owner_id = $3
            UNION SELECT project_id FROM project_members WHERE user_id = $3
          )
          ORDER BY rank DESC
          LIMIT $4
        `, [searchQuery, `%${searchQuery}%`, userId, maxLimit]);

        for (const row of fileResults.rows || []) {
          results.push({
            id: row.id,
            type: 'file',
            title: row.name,
            description: row.description,
            score: parseFloat(row.rank) || 0,
            metadata: {
              projectId: row.project_id,
              projectName: row.project_name,
              fileType: row.mime_type,
              createdAt: row.created_at,
            },
            url: `/projects/${row.project_id}/files/${row.id}`,
          });
          facets.types.file++;
        }
      } catch (e) {
        log.warn('File search failed', e);
      }
    }

    // Search tasks
    if (requestedTypes.includes('task')) {
      try {
        const taskResults = await query(`
          SELECT t.id, t.title, t.description, t.project_id, t.status, t.priority, t.created_at,
            p.name as project_name,
            ts_rank(
              setweight(to_tsvector('english', coalesce(t.title, '')), 'A') ||
              setweight(to_tsvector('english', coalesce(t.description, '')), 'B'),
              plainto_tsquery('english', $1)
            ) AS rank
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          WHERE (
            to_tsvector('english', coalesce(t.title, '') || ' ' || coalesce(t.description, ''))
            @@ plainto_tsquery('english', $1)
            OR t.title ILIKE $2
          )
          AND t.project_id IN (
            SELECT id FROM projects WHERE owner_id = $3
            UNION SELECT project_id FROM project_members WHERE user_id = $3
          )
          ORDER BY rank DESC
          LIMIT $4
        `, [searchQuery, `%${searchQuery}%`, userId, maxLimit]);

        for (const row of taskResults.rows || []) {
          results.push({
            id: row.id,
            type: 'task',
            title: row.title,
            description: row.description,
            score: parseFloat(row.rank) || 0,
            metadata: {
              projectId: row.project_id,
              projectName: row.project_name,
              status: row.status,
              priority: row.priority,
              createdAt: row.created_at,
            },
            url: `/projects/${row.project_id}/tasks/${row.id}`,
          });
          facets.types.task++;
        }
      } catch (e) {
        log.warn('Task search failed', e);
      }
    }

    // Search messages
    if (requestedTypes.includes('message')) {
      try {
        const messageResults = await query(`
          SELECT m.id, m.text, m.conversation_id, m.user_id, m.created_at,
            c.name as conversation_name,
            u.name as user_name,
            ts_rank(
              to_tsvector('english', coalesce(m.text, '')),
              plainto_tsquery('english', $1)
            ) AS rank
          FROM messages m
          LEFT JOIN conversations c ON m.conversation_id = c.id
          LEFT JOIN users u ON m.user_id = u.id
          WHERE to_tsvector('english', coalesce(m.text, ''))
            @@ plainto_tsquery('english', $1)
          AND m.conversation_id IN (
            SELECT conversation_id FROM conversation_members WHERE user_id = $2
          )
          ORDER BY rank DESC
          LIMIT $3
        `, [searchQuery, userId, maxLimit]);

        for (const row of messageResults.rows || []) {
          results.push({
            id: row.id,
            type: 'message',
            title: row.user_name || 'Message',
            description: row.text,
            score: parseFloat(row.rank) || 0,
            metadata: {
              conversationId: row.conversation_id,
              conversationName: row.conversation_name,
              createdAt: row.created_at,
              author: { id: row.user_id, name: row.user_name || 'Unknown' },
            },
            url: `/messages/${row.conversation_id}?highlight=${row.id}`,
          });
          facets.types.message++;
        }
      } catch (e) {
        log.warn('Message search failed', e);
      }
    }

    // Sort combined results
    results.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.metadata.createdAt || 0).getTime();
        const dateB = new Date(b.metadata.createdAt || 0).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    });

    // Paginate
    const total = results.length;
    const paginatedResults = results.slice(searchOffset, searchOffset + maxLimit);

    res.json({
      success: true,
      results: paginatedResults,
      total,
      hasMore: searchOffset + maxLimit < total,
      facets,
      searchTime: Date.now(),
    });
  } catch (error) {
    log.error('Search error', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

module.exports = router;
