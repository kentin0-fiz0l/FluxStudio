# Sprint 1: Projects Backend Foundation

**Duration**: 3-4 days
**Status**: Ready to Start
**Dependencies**: Security remediation must be completed first

## Overview

Sprint 1 focuses on implementing the missing backend endpoints and data layer improvements required for the Projects feature to be fully functional.

## Goals

1. Implement Task Management API endpoints
2. Implement Milestone Management API endpoints
3. Fix File-Project association
4. Add input validation and sanitization
5. Implement rate limiting
6. Extend project data model
7. Add comprehensive error handling

## Prerequisites

- [ ] Production credentials rotated (see SECURITY_REMEDIATION_URGENT.md)
- [ ] `.env.production` removed from git history
- [ ] All agent review reports read and understood

## Implementation Tasks

### Task 1: Add Input Validation Middleware (4 hours)

**Files to Create/Modify**:
- `/Users/kentino/FluxStudio/middleware/validation.js` (new)
- `/Users/kentino/FluxStudio/server-auth-production.js` (modify)

**Implementation**:

```javascript
// middleware/validation.js
const validator = require('validator');

/**
 * Sanitize and validate project creation data
 */
function validateProjectData(req, res, next) {
  const { name, description, teamId, status, priority } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Project name is required and must be a non-empty string'
    });
  }

  // Sanitize inputs
  req.body.name = validator.escape(validator.trim(name));

  if (description) {
    if (typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Description must be a string'
      });
    }
    req.body.description = validator.escape(validator.trim(description));
  }

  // Validate length limits
  if (req.body.name.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Project name must be 200 characters or less'
    });
  }

  if (req.body.description && req.body.description.length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'Description must be 2000 characters or less'
    });
  }

  // Validate status whitelist
  const validStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Status must be one of: ${validStatuses.join(', ')}`
    });
  }

  // Validate priority whitelist
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      error: `Priority must be one of: ${validPriorities.join(', ')}`
    });
  }

  // Validate teamId format (UUID)
  if (teamId && !validator.isUUID(teamId)) {
    return res.status(400).json({
      success: false,
      error: 'teamId must be a valid UUID'
    });
  }

  next();
}

/**
 * Validate task creation data
 */
function validateTaskData(req, res, next) {
  const { title, description, status, priority, assignedTo, dueDate } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Task title is required'
    });
  }

  req.body.title = validator.escape(validator.trim(title));

  if (description) {
    req.body.description = validator.escape(validator.trim(description));
  }

  // Validate status
  const validStatuses = ['todo', 'in_progress', 'completed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Task status must be one of: ${validStatuses.join(', ')}`
    });
  }

  // Validate priority
  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      error: `Task priority must be one of: ${validPriorities.join(', ')}`
    });
  }

  // Validate dueDate format
  if (dueDate && !validator.isISO8601(dueDate)) {
    return res.status(400).json({
      success: false,
      error: 'dueDate must be in ISO 8601 format'
    });
  }

  next();
}

/**
 * Validate milestone creation data
 */
function validateMilestoneData(req, res, next) {
  const { title, description, dueDate } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Milestone title is required'
    });
  }

  req.body.title = validator.escape(validator.trim(title));

  if (description) {
    req.body.description = validator.escape(validator.trim(description));
  }

  if (dueDate && !validator.isISO8601(dueDate)) {
    return res.status(400).json({
      success: false,
      error: 'dueDate must be in ISO 8601 format'
    });
  }

  next();
}

module.exports = {
  validateProjectData,
  validateTaskData,
  validateMilestoneData
};
```

**Install Dependencies**:
```bash
npm install validator
```

**Update server-auth-production.js**:
```javascript
// At the top of the file
const { validateProjectData, validateTaskData, validateMilestoneData } = require('./middleware/validation');

// Update POST /api/projects endpoint
app.post('/api/projects', authenticateToken, validateProjectData, async (req, res) => {
  // ... existing implementation
});
```

**Testing**:
```bash
# Test XSS prevention
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","description":"Test"}'

# Should return escaped: &lt;script&gt;alert(1)&lt;/script&gt;

# Test length validation
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$(printf 'A%.0s' {1..201})\"}"

# Should return 400 error
```

---

### Task 2: Implement Task Management Endpoints (6 hours)

**Files to Modify**:
- `/Users/kentino/FluxStudio/server-auth-production.js`

**Implementation**:

```javascript
// ======================
// Task Management API
// ======================

/**
 * Create a task in a project
 */
app.post('/api/projects/:projectId/tasks',
  authenticateToken,
  validateTaskData,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, status, priority, assignedTo, dueDate } = req.body;

      // Get projects
      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check user has access to project
      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      // Create task
      const newTask = {
        id: uuidv4(),
        title,
        description: description || '',
        status: status || 'todo',
        priority: priority || 'medium',
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      // Initialize tasks array if needed
      if (!project.tasks) {
        project.tasks = [];
      }

      project.tasks.push(newTask);
      project.updatedAt = new Date().toISOString();

      // Update project progress
      project.progress = calculateProjectProgress(project);

      await saveProjects(projects);

      res.json({
        success: true,
        message: 'Task created successfully',
        task: newTask
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating task'
      });
    }
  }
);

/**
 * Get all tasks for a project
 */
app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access
    const isMember = project.members.some(m =>
      m.userId === req.user.id || m.userId === req.user.email
    );

    if (!isMember && project.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project'
      });
    }

    res.json({
      success: true,
      tasks: project.tasks || []
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching tasks'
    });
  }
});

/**
 * Update a task
 */
app.put('/api/projects/:projectId/tasks/:taskId',
  authenticateToken,
  validateTaskData,
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const updates = req.body;

      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access
      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      // Find task
      const taskIndex = project.tasks?.findIndex(t => t.id === taskId);

      if (taskIndex === -1 || taskIndex === undefined) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Update task
      const updatedTask = {
        ...project.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Set completedAt if status changed to completed
      if (updates.status === 'completed' && project.tasks[taskIndex].status !== 'completed') {
        updatedTask.completedAt = new Date().toISOString();
      }

      project.tasks[taskIndex] = updatedTask;
      project.updatedAt = new Date().toISOString();

      // Recalculate progress
      project.progress = calculateProjectProgress(project);

      await saveProjects(projects);

      res.json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating task'
      });
    }
  }
);

/**
 * Delete a task
 */
app.delete('/api/projects/:projectId/tasks/:taskId',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;

      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access (only owners/admins can delete tasks)
      const member = project.members.find(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!member && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      if (member && member.role !== 'owner' && member.role !== 'admin' && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only project owners and admins can delete tasks'
        });
      }

      // Find and remove task
      const taskIndex = project.tasks?.findIndex(t => t.id === taskId);

      if (taskIndex === -1 || taskIndex === undefined) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      project.tasks.splice(taskIndex, 1);
      project.updatedAt = new Date().toISOString();

      // Recalculate progress
      project.progress = calculateProjectProgress(project);

      await saveProjects(projects);

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({
        success: false,
        error: 'Error deleting task'
      });
    }
  }
);

/**
 * Helper: Calculate project progress based on task completion
 */
function calculateProjectProgress(project) {
  if (!project.tasks || project.tasks.length === 0) {
    return 0;
  }

  const completedTasks = project.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = project.tasks.length;

  return Math.round((completedTasks / totalTasks) * 100);
}
```

**Testing**:
```bash
# Create a task
curl -X POST http://localhost:3001/api/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement authentication",
    "description": "Add JWT authentication",
    "priority": "high",
    "dueDate": "2025-10-30T00:00:00Z"
  }'

# Get all tasks
curl http://localhost:3001/api/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN"

# Update task status
curl -X PUT http://localhost:3001/api/projects/$PROJECT_ID/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Delete task
curl -X DELETE http://localhost:3001/api/projects/$PROJECT_ID/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

### Task 3: Implement Milestone Management Endpoints (4 hours)

**Implementation** (add to server-auth-production.js):

```javascript
// ======================
// Milestone Management API
// ======================

/**
 * Create a milestone in a project
 */
app.post('/api/projects/:projectId/milestones',
  authenticateToken,
  validateMilestoneData,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, dueDate } = req.body;

      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access
      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      const newMilestone = {
        id: uuidv4(),
        title,
        description: description || '',
        dueDate: dueDate || null,
        status: 'pending',
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      if (!project.milestones) {
        project.milestones = [];
      }

      project.milestones.push(newMilestone);
      project.updatedAt = new Date().toISOString();

      await saveProjects(projects);

      res.json({
        success: true,
        message: 'Milestone created successfully',
        milestone: newMilestone
      });
    } catch (error) {
      console.error('Create milestone error:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating milestone'
      });
    }
  }
);

/**
 * Update a milestone
 */
app.put('/api/projects/:projectId/milestones/:milestoneId',
  authenticateToken,
  validateMilestoneData,
  async (req, res) => {
    try {
      const { projectId, milestoneId } = req.params;
      const updates = req.body;

      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access
      const isMember = project.members.some(m =>
        m.userId === req.user.id || m.userId === req.user.email
      );

      if (!isMember && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      const milestoneIndex = project.milestones?.findIndex(m => m.id === milestoneId);

      if (milestoneIndex === -1 || milestoneIndex === undefined) {
        return res.status(404).json({
          success: false,
          error: 'Milestone not found'
        });
      }

      const updatedMilestone = {
        ...project.milestones[milestoneIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Set completedAt if status changed to completed
      if (updates.status === 'completed' &&
          project.milestones[milestoneIndex].status !== 'completed') {
        updatedMilestone.completedAt = new Date().toISOString();
      }

      project.milestones[milestoneIndex] = updatedMilestone;
      project.updatedAt = new Date().toISOString();

      await saveProjects(projects);

      res.json({
        success: true,
        message: 'Milestone updated successfully',
        milestone: updatedMilestone
      });
    } catch (error) {
      console.error('Update milestone error:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating milestone'
      });
    }
  }
);
```

---

### Task 4: Implement Rate Limiting (3 hours)

**Files to Create**:
- `/Users/kentino/FluxStudio/middleware/rateLimiting.js`

**Implementation**:

```javascript
// middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for project creation
 * Limit: 10 projects per hour per user
 */
const projectCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Too many projects created. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id // Per-user limiting
});

/**
 * Rate limiter for project updates
 * Limit: 30 updates per 15 minutes per user
 */
const projectUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    error: 'Too many project updates. Please try again later.',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => req.user.id
});

/**
 * Rate limiter for task creation
 * Limit: 50 tasks per hour per user
 */
const taskCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many tasks created. Please try again later.'
  },
  keyGenerator: (req) => req.user.id
});

module.exports = {
  projectCreationLimiter,
  projectUpdateLimiter,
  taskCreationLimiter
};
```

**Install Dependencies**:
```bash
npm install express-rate-limit
```

**Update server-auth-production.js**:
```javascript
const {
  projectCreationLimiter,
  projectUpdateLimiter,
  taskCreationLimiter
} = require('./middleware/rateLimiting');

// Apply rate limiters
app.post('/api/projects',
  authenticateToken,
  projectCreationLimiter,
  validateProjectData,
  async (req, res) => { /* ... */ }
);

app.put('/api/projects/:id',
  authenticateToken,
  projectUpdateLimiter,
  async (req, res) => { /* ... */ }
);

app.post('/api/projects/:projectId/tasks',
  authenticateToken,
  taskCreationLimiter,
  validateTaskData,
  async (req, res) => { /* ... */ }
);
```

---

## Testing Checklist

- [ ] Input validation prevents XSS attacks
- [ ] Length limits enforced on all text fields
- [ ] Status/priority whitelists working
- [ ] Task CRUD operations functional
- [ ] Milestone CRUD operations functional
- [ ] Project progress calculates correctly
- [ ] Rate limiting blocks excessive requests
- [ ] Proper error messages returned
- [ ] Authorization checks prevent unauthorized access
- [ ] All endpoints return consistent JSON format

## Success Criteria

1. All task management endpoints operational
2. All milestone endpoints operational
3. Input validation blocks malicious inputs
4. Rate limiting prevents abuse
5. Project progress auto-calculates
6. All tests passing
7. Error handling comprehensive
8. API documentation updated

## Deployment

```bash
# Build frontend
npm run build

# Deploy to production
scp -r build/* root@167.172.208.61:/var/www/fluxstudio/
scp server-auth-production.js root@167.172.208.61:/var/www/fluxstudio/
scp -r middleware/ root@167.172.208.61:/var/www/fluxstudio/

# Restart services
ssh root@167.172.208.61 "cd /var/www/fluxstudio && pm2 restart all"
```

## Next Sprint

Sprint 2 will build the Task Management UI components using the endpoints created in this sprint.
