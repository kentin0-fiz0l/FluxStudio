/**
 * Comments API Module for Flux Studio Sprint 2
 *
 * This module provides complete comment management functionality including:
 * - Create, read, update, and delete comments
 * - @Mention support
 * - Real-time updates via Socket.IO
 * - File-based storage
 *
 * To integrate: Copy the helper functions and API endpoints into server-auth-production.js
 */

const path = require('path');
const fs = require('fs');

// ============================================================================
// STEP 1: Add to File-based storage paths section (around line 50)
// ============================================================================

const COMMENTS_DIR = path.join(__dirname, 'data', 'comments');

// Ensure comments directory exists (add to the directory initialization section)
if (!fs.existsSync(COMMENTS_DIR)) {
  fs.mkdirSync(COMMENTS_DIR, { recursive: true });
}

// ============================================================================
// STEP 2: Add Comment Helper Functions (after Activity Logging Helper Functions)
// ============================================================================

/**
 * Get comments file path for a specific task
 */
function getCommentsFilePath(projectId, taskId) {
  return path.join(COMMENTS_DIR, `${projectId}-${taskId}.json`);
}

/**
 * Load comments for a specific task
 */
async function getComments(projectId, taskId) {
  const filePath = getCommentsFilePath(projectId, taskId);

  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.comments || [];
  } catch (error) {
    console.error('Error reading comments:', error);
    return [];
  }
}

/**
 * Save comments for a specific task
 */
async function saveComments(projectId, taskId, comments) {
  const filePath = getCommentsFilePath(projectId, taskId);

  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ comments }, null, 2)
    );
  } catch (error) {
    console.error('Error saving comments:', error);
    throw error;
  }
}

// ============================================================================
// STEP 3: Add Comment API Endpoints (after Milestone Management API, before Activity Feed API or Organizations API)
// ============================================================================

// ============================================================================
// Comments Management API
// ============================================================================

/**
 * Get all comments for a task
 */
app.get('/api/projects/:projectId/tasks/:taskId/comments',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;

      // Check access
      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Load comments
      const comments = await getComments(projectId, taskId);

      res.json({ success: true, comments });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ success: false, error: 'Error fetching comments' });
    }
  }
);

/**
 * Create a new comment on a task
 */
app.post('/api/projects/:projectId/tasks/:taskId/comments',
  authenticateToken,
  simpleRateLimit(100, 15 * 60 * 1000), // 100 comments per 15 minutes
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const { content, mentions = [] } = req.body;

      // Validation
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Comment content required' });
      }
      if (content.length > 2000) {
        return res.status(400).json({ success: false, error: 'Comment too long (max 2000 chars)' });
      }

      // Check access
      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Check task exists
      const task = project.tasks?.find(t => t.id === taskId);
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      // Get user info
      const users = await getUsers();
      const user = users.find(u => u.id === req.user.id);

      const newComment = {
        id: uuidv4(),
        taskId,
        projectId,
        content: content.trim(),
        mentions: mentions || [],
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        author: {
          id: req.user.id,
          name: user?.name || req.user.name || 'Unknown User',
          email: user?.email || req.user.email || ''
        }
      };

      // Save comment
      const comments = await getComments(projectId, taskId);
      comments.push(newComment);
      await saveComments(projectId, taskId, comments);

      // Emit socket event for real-time update
      io.to(`project:${projectId}`).emit('comment:created', newComment);

      // Log activity
      await logActivity(projectId, {
        type: 'comment',
        userId: req.user.id,
        userName: newComment.author.name,
        userEmail: newComment.author.email,
        entityType: 'task',
        entityId: taskId,
        entityTitle: task.title,
        action: 'commented',
        metadata: {
          commentId: newComment.id,
          contentPreview: content.slice(0, 100)
        }
      });

      res.json({ success: true, comment: newComment });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ success: false, error: 'Error creating comment' });
    }
  }
);

/**
 * Update a comment (edit)
 */
app.put('/api/projects/:projectId/tasks/:taskId/comments/:commentId',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, taskId, commentId } = req.params;
      const { content, mentions = [] } = req.body;

      // Validation
      if (content && content.length > 2000) {
        return res.status(400).json({ success: false, error: 'Comment too long (max 2000 chars)' });
      }

      // Check access
      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Load comments
      const comments = await getComments(projectId, taskId);
      const commentIndex = comments.findIndex(c => c.id === commentId);

      if (commentIndex === -1) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      // Check ownership
      if (comments[commentIndex].createdBy !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Cannot edit others\' comments' });
      }

      // Update comment
      comments[commentIndex] = {
        ...comments[commentIndex],
        content: content?.trim() || comments[commentIndex].content,
        mentions: mentions || comments[commentIndex].mentions,
        updatedAt: new Date().toISOString()
      };

      await saveComments(projectId, taskId, comments);

      // Emit socket event
      io.to(`project:${projectId}`).emit('comment:updated', comments[commentIndex]);

      res.json({ success: true, comment: comments[commentIndex] });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ success: false, error: 'Error updating comment' });
    }
  }
);

/**
 * Delete a comment
 */
app.delete('/api/projects/:projectId/tasks/:taskId/comments/:commentId',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, taskId, commentId } = req.params;

      // Check access
      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Load comments
      const comments = await getComments(projectId, taskId);
      const commentIndex = comments.findIndex(c => c.id === commentId);

      if (commentIndex === -1) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      // Check ownership
      if (comments[commentIndex].createdBy !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Cannot delete others\' comments' });
      }

      // Remove comment
      comments.splice(commentIndex, 1);
      await saveComments(projectId, taskId, comments);

      // Emit socket event
      io.to(`project:${projectId}`).emit('comment:deleted', { commentId, taskId });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ success: false, error: 'Error deleting comment' });
    }
  }
);

// ============================================================================
// STEP 4: Update the server startup console.log section to include comment endpoints
// ============================================================================

// Add these lines to the console.log section at the end:
console.log('  GET  /api/projects/:projectId/tasks/:taskId/comments');
console.log('  POST /api/projects/:projectId/tasks/:taskId/comments');
console.log('  PUT  /api/projects/:projectId/tasks/:taskId/comments/:commentId');
console.log('  DELETE /api/projects/:projectId/tasks/:taskId/comments/:commentId');
