# Validation Integration Example

How to integrate the validation middleware into server-auth-production.js

## Step 1: Import the Validators

Add at the top of server-auth-production.js:

```javascript
const {
  validateProjectData,
  validateTaskData,
  validateMilestoneData
} = require('./middleware/validation');
```

## Step 2: Update Project Routes

### Create Project

```javascript
// Before (no validation)
app.post('/api/projects', authenticateToken, async (req, res) => {
  // Vulnerable to XSS and invalid data
  const project = await createProject(req.body);
  res.json({ success: true, project });
});

// After (with validation)
app.post('/api/projects',
  authenticateToken,
  validateProjectData,  // Add this line
  async (req, res) => {
    // req.body is now validated and sanitized
    const project = await createProject(req.body);
    res.json({ success: true, project });
  }
);
```

### Update Project

```javascript
app.put('/api/projects/:id',
  authenticateToken,
  validateProjectData,  // Add validation
  async (req, res) => {
    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === req.params.id);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Update with validated data
    projects[projectIndex] = {
      ...projects[projectIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await saveProjects(projects);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: projects[projectIndex]
    });
  }
);
```

## Step 3: Add Task Routes

```javascript
// Create Task
app.post('/api/projects/:projectId/tasks',
  authenticateToken,
  validateTaskData,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, status, priority, assignedTo, dueDate } = req.body;

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

      // Create task with validated data
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

      if (!project.tasks) {
        project.tasks = [];
      }

      project.tasks.push(newTask);
      project.updatedAt = new Date().toISOString();

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

// Get Tasks
app.get('/api/projects/:projectId/tasks',
  authenticateToken,
  async (req, res) => {
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
  }
);

// Update Task
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

      const taskIndex = project.tasks?.findIndex(t => t.id === taskId);

      if (taskIndex === -1 || taskIndex === undefined) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Update with validated data
      const updatedTask = {
        ...project.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (updates.status === 'completed' && project.tasks[taskIndex].status !== 'completed') {
        updatedTask.completedAt = new Date().toISOString();
      }

      project.tasks[taskIndex] = updatedTask;
      project.updatedAt = new Date().toISOString();

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

// Delete Task
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

      // Check access (only owners/admins can delete)
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

      const taskIndex = project.tasks?.findIndex(t => t.id === taskId);

      if (taskIndex === -1 || taskIndex === undefined) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      project.tasks.splice(taskIndex, 1);
      project.updatedAt = new Date().toISOString();

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
```

## Step 4: Add Milestone Routes

```javascript
// Create Milestone
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

// Update Milestone
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

## Testing the Integration

### Test XSS Protection

```bash
# Test that HTML is escaped
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"xss\")</script>",
    "description": "<img src=x onerror=alert(1)>"
  }'

# Response should have escaped HTML:
# "name": "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

### Test Length Validation

```bash
# Test that long strings are rejected
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$(printf 'A%.0s' {1..201})\"}"

# Should return 400 error:
# "error": "Project name must be 200 characters or less"
```

### Test Whitelist Validation

```bash
# Test invalid status
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "status": "invalid_status"
  }'

# Should return 400 error:
# "error": "Status must be one of: planning, in_progress, on_hold, completed, cancelled"
```

### Test UUID Validation

```bash
# Test invalid UUID
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "teamId": "not-a-uuid"
  }'

# Should return 400 error:
# "error": "Team ID must be a valid UUID"
```

### Test Date Validation

```bash
# Test invalid date format
curl -X POST http://localhost:3001/api/projects/PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "dueDate": "10/30/2025"
  }'

# Should return 400 error:
# "error": "Due date must be in ISO 8601 format"
```

## Summary

With validation integrated:

1. All user input is sanitized against XSS attacks
2. Length limits are enforced
3. Status and priority values are validated
4. UUID and date formats are checked
5. Clear, user-friendly error messages are returned
6. Code is cleaner and more maintainable

The validation middleware handles all security and validation concerns, so your route handlers can focus on business logic.
