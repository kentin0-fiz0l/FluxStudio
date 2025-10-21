require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

// Import environment configuration
const { config } = require('./config/environment');

// Import validation middleware
const {
  validateProjectData,
  validateTaskData,
  validateMilestoneData
} = require('./middleware/validation');

// Import dual-write service for PostgreSQL migration
const dualWriteService = require('./database/dual-write-service');

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time task updates
const io = new Server(httpServer, {
  cors: {
    origin: config.CORS_ORIGINS || process.env.CORS_ORIGINS || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const PORT = config.AUTH_PORT || process.env.PORT || 3002;
const JWT_SECRET = config.JWT_SECRET || process.env.JWT_SECRET;

// Google OAuth configuration
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Legacy file paths (still used for files and teams which aren't migrated yet)
const FILES_FILE = path.join(__dirname, 'files.json');
const TEAMS_FILE = path.join(__dirname, 'teams.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ACTIVITIES_DIR = path.join(__dirname, 'data', 'activities');

// Initialize storage files for non-migrated entities
[FILES_FILE, TEAMS_FILE].forEach((file, index) => {
  const keys = ['files', 'teams'];
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ [keys[index]]: [] }));
  }
});

// Ensure uploads and activities directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(ACTIVITIES_DIR)) {
  fs.mkdirSync(ACTIVITIES_DIR, { recursive: true });
}

// UUID generator
function uuidv4() {
  return crypto.randomUUID();
}

// Simple rate limiting (in-memory)
const rateLimitStore = new Map();
function simpleRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key).filter(time => time > windowStart);

    if (requests.length >= maxRequests) {
      return res.status(429).json({ message: 'Too many requests, please try again later' });
    }

    requests.push(now);
    rateLimitStore.set(key, requests);
    next();
  };
}

// Cleanup rate limit store every hour
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  for (const [key, requests] of rateLimitStore.entries()) {
    const filtered = requests.filter(time => time > oneHourAgo);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filtered);
    }
  }
}, 60 * 60 * 1000);

// Project-specific rate limiters
const projectCreationLimit = simpleRateLimit(10, 60 * 60 * 1000); // 10 projects per hour
const projectUpdateLimit = simpleRateLimit(30, 15 * 60 * 1000);   // 30 updates per 15 minutes
const taskCreationLimit = simpleRateLimit(50, 60 * 60 * 1000);    // 50 tasks per hour

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|zip|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Unsupported file type'));
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS || process.env.CORS_ORIGINS || '*',
  credentials: true
}));
app.use(simpleRateLimit());
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static('build'));
app.use('/uploads', express.static(UPLOADS_DIR));

// ==================================================
// LEGACY FILE HELPERS (for files and teams only)
// ==================================================

async function getFiles() {
  const data = fs.readFileSync(FILES_FILE, 'utf8');
  return JSON.parse(data).files;
}

async function saveFiles(files) {
  fs.writeFileSync(FILES_FILE, JSON.stringify({ files }, null, 2));
}

async function getTeams() {
  const data = fs.readFileSync(TEAMS_FILE, 'utf8');
  return JSON.parse(data).teams;
}

async function saveTeams(teams) {
  fs.writeFileSync(TEAMS_FILE, JSON.stringify({ teams }, null, 2));
}

// ==================================================
// HELPER FUNCTIONS (refactored to use dual-write service)
// ==================================================

// Calculate project progress based on task completion
async function calculateProjectProgress(projectId) {
  const tasks = await dualWriteService.getTasks(projectId);
  if (!tasks || tasks.length === 0) {
    return 0;
  }
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  return Math.round((completedTasks / totalTasks) * 100);
}

// ==================================================
// ACTIVITY LOGGING HELPERS (refactored to use dual-write service)
// ==================================================

function getActivitiesFilePath(projectId) {
  return path.join(ACTIVITIES_DIR, `${projectId}.json`);
}

async function getActivities(projectId) {
  // If using PostgreSQL, get from database
  if (dualWriteService.usePostgres) {
    return await dualWriteService.getActivities(projectId);
  }

  // Otherwise fall back to JSON files
  const filePath = getActivitiesFilePath(projectId);
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.activities || [];
  } catch (error) {
    console.error('Error reading activities:', error);
    return [];
  }
}

async function saveActivities(projectId, activities) {
  const filePath = getActivitiesFilePath(projectId);
  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ activities }, null, 2)
    );
  } catch (error) {
    console.error('Error saving activities:', error);
    throw error;
  }
}

async function logActivity(projectId, activity) {
  try {
    // If using PostgreSQL, use dual-write service
    if (dualWriteService.usePostgres) {
      const activityData = {
        projectId,
        type: activity.type,
        userId: activity.userId,
        userName: activity.userName,
        userEmail: activity.userEmail,
        userAvatar: activity.userAvatar || null,
        entityType: activity.entityType,
        entityId: activity.entityId,
        entityTitle: activity.entityTitle || null,
        action: activity.action,
        metadata: activity.metadata || {}
      };
      await dualWriteService.logActivity(activityData);
    } else {
      // Fall back to JSON file logging
      const activities = await getActivities(projectId);
      activities.unshift({
        id: activity.id || uuidv4(),
        projectId,
        type: activity.type,
        userId: activity.userId,
        userName: activity.userName,
        userEmail: activity.userEmail,
        userAvatar: activity.userAvatar || null,
        entityType: activity.entityType,
        entityId: activity.entityId,
        entityTitle: activity.entityTitle || null,
        action: activity.action,
        metadata: activity.metadata || {},
        timestamp: activity.timestamp || new Date().toISOString()
      });

      const trimmedActivities = activities.slice(0, 1000);
      await saveActivities(projectId, trimmedActivities);
    }

    // Emit Socket.IO event for real-time updates
    io.to(`project:${projectId}`).emit('activity:new', activity);

    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
}

// JWT helper functions
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType || user.user_type },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
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

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      usePostgres: dualWriteService.usePostgres,
      dualWriteEnabled: dualWriteService.dualWriteEnabled
    }
  });
});

// CSRF token endpoint (simplified - returns empty token for now)
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: '' });
});

// ==================================================
// AUTHENTICATION ENDPOINTS (refactored to use dual-write service)
// ==================================================

app.post('/api/auth/signup', simpleRateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password, name, userType = 'client' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const validUserTypes = ['client', 'designer', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await dualWriteService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      name,
      userType,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Create user using dual-write service
    await dualWriteService.createUser(newUser);

    const token = generateToken(newUser);
    const { password: _, ...userWithoutPassword } = newUser;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

app.post('/api/auth/login', simpleRateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await dualWriteService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordHash = user.password || user.password_hash;
    if (!passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password: _p, password_hash: _ph, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dualWriteService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _p, password_hash: _ph, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!googleClient) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }

    let user = await dualWriteService.getUserByEmail(email);

    if (user) {
      if (!user.googleId && !user.oauth_id) {
        await dualWriteService.updateUser(user.id, { googleId });
        user.googleId = googleId;
      }
    } else {
      user = {
        id: uuidv4(),
        email,
        name,
        googleId,
        userType: 'client',
        createdAt: new Date().toISOString()
      };
      await dualWriteService.createUser(user);
    }

    const token = generateToken(user);
    const { password: _p, password_hash: _ph, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: 'Google authentication error', error: error.message });
  }
});

// ==================================================
// FILES API (still using legacy JSON storage)
// ==================================================

app.post('/api/files/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = await getFiles();
    const uploadedFiles = req.files.map(file => {
      const metadata = {
        id: uuidv4(),
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        url: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString(),
        tags: [],
        description: '',
        isPublic: false
      };
      files.push(metadata);
      return metadata;
    });

    await saveFiles(files);
    res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
});

app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const userFiles = files.filter(file => file.uploadedBy === req.user.id);
    res.json({ files: userFiles });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Error retrieving files' });
  }
});

app.get('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const file = files.find(f => f.id === req.params.id && f.uploadedBy === req.user.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
});

app.put('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const fileIndex = files.findIndex(f => f.id === req.params.id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const { description, tags, isPublic } = req.body;
    files[fileIndex] = {
      ...files[fileIndex],
      description: description || files[fileIndex].description,
      tags: tags || files[fileIndex].tags,
      isPublic: isPublic !== undefined ? isPublic : files[fileIndex].isPublic,
      updatedAt: new Date().toISOString()
    };

    await saveFiles(files);
    res.json(files[fileIndex]);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ message: 'Error updating file' });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const fileIndex = files.findIndex(f => f.id === req.params.id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = files[fileIndex];
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.warn('Could not delete physical file:', err.message);
    }

    files.splice(fileIndex, 1);
    await saveFiles(files);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// ==================================================
// TEAMS API (still using legacy JSON storage)
// ==================================================

app.post('/api/teams', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const teams = await getTeams();
    const newTeam = {
      id: uuidv4(),
      name,
      description: description || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      members: [{ userId: req.user.id, role: 'owner', joinedAt: new Date().toISOString() }],
      invites: []
    };

    teams.push(newTeam);
    await saveTeams(teams);
    res.json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Error creating team' });
  }
});

app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const userTeams = teams.filter(team => team.members.some(m => m.userId === req.user.id));
    res.json({ teams: userTeams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Error retrieving teams' });
  }
});

// ==================================================
// PROJECTS API (refactored to use dual-write service)
// ==================================================

app.post('/api/projects', authenticateToken, projectCreationLimit, validateProjectData, async (req, res) => {
  try {
    const { name, description, teamId, status = 'planning', priority = 'medium', startDate, dueDate } = req.body;

    const newProject = {
      id: uuidv4(),
      name,
      description: description || '',
      teamId: teamId || null,
      status,
      priority,
      startDate: startDate || new Date().toISOString(),
      dueDate: dueDate || null,
      progress: 0,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          userId: req.user.id,
          role: 'owner',
          joinedAt: new Date().toISOString()
        }
      ],
      tasks: [],
      milestones: [],
      files: [],
      channelMetadata: null
    };

    await dualWriteService.createProject(newProject);

    res.json({
      success: true,
      message: 'Project created successfully',
      project: newProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: 'Error creating project' });
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const allProjects = await dualWriteService.getProjects();
    const userProjects = allProjects.filter(project => {
      // Handle both JSON structure (members array) and PostgreSQL structure (separate table)
      if (project.members && Array.isArray(project.members)) {
        return project.members.some(member => member.userId === req.user.id);
      }
      // If members not loaded, check createdBy
      return project.createdBy === req.user.id || project.manager_id === req.user.id;
    });

    res.json({ success: true, projects: userProjects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Error retrieving projects' });
  }
});

app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await dualWriteService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check access
    const isMember = project.members && Array.isArray(project.members)
      ? project.members.some(member => member.userId === req.user.id)
      : project.createdBy === req.user.id || project.manager_id === req.user.id;

    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Load tasks for this project
    const tasks = await dualWriteService.getTasks(req.params.id);
    project.tasks = tasks;

    res.json({ success: true, project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: 'Error retrieving project' });
  }
});

app.put('/api/projects/:id', authenticateToken, projectUpdateLimit, validateProjectData, async (req, res) => {
  try {
    const project = await dualWriteService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions
    const isMember = project.members && Array.isArray(project.members)
      ? project.members.some(m => m.userId === req.user.id)
      : project.createdBy === req.user.id;

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const member = project.members?.find(m => m.userId === req.user.id);
    if (member && member.role !== 'owner' && member.role !== 'admin' && project.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { name, description, status } = req.body;
    const updates = {
      name: name || project.name,
      description: description !== undefined ? description : project.description,
      status: status || project.status,
      updatedAt: new Date().toISOString()
    };

    await dualWriteService.updateProject(req.params.id, updates);

    const updatedProject = { ...project, ...updates };
    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Error updating project' });
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await dualWriteService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check ownership
    const isOwner = project.createdBy === req.user.id ||
                   project.manager_id === req.user.id ||
                   (project.members && project.members.some(m => m.userId === req.user.id && m.role === 'owner'));

    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Only project owners can delete projects' });
    }

    await dualWriteService.deleteProject(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: 'Error deleting project' });
  }
});

// Link a messaging channel to a project
app.post('/api/projects/:id/channel', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ message: 'Channel ID is required' });
    }

    const project = await dualWriteService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members && Array.isArray(project.members)
      ? project.members.some(m => m.userId === req.user.id)
      : project.createdBy === req.user.id;

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const channelMetadata = {
      channelId,
      channelType: 'project',
      linkedAt: new Date().toISOString()
    };

    await dualWriteService.updateProject(req.params.id, { channelMetadata });

    res.json({
      message: 'Channel linked successfully',
      project: { ...project, channelMetadata }
    });
  } catch (error) {
    console.error('Link channel error:', error);
    res.status(500).json({ message: 'Error linking channel' });
  }
});

// Get channel metadata for a project
app.get('/api/projects/:id/channel', authenticateToken, async (req, res) => {
  try {
    const project = await dualWriteService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members && Array.isArray(project.members)
      ? project.members.some(m => m.userId === req.user.id)
      : project.createdBy === req.user.id;

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      channelMetadata: project.channelMetadata || project.metadata || null,
      hasChannel: !!(project.channelMetadata || project.metadata)
    });
  } catch (error) {
    console.error('Get channel metadata error:', error);
    res.status(500).json({ message: 'Error retrieving channel' });
  }
});

// ==================================================
// TASK MANAGEMENT API (refactored to use dual-write service)
// ==================================================

app.post('/api/projects/:projectId/tasks',
  authenticateToken,
  taskCreationLimit,
  validateTaskData,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, status, priority, assignedTo, dueDate } = req.body;

      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access
      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
        : project.createdBy === req.user.id;

      if (!isMember) {
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

      await dualWriteService.createTask(projectId, newTask);

      // Update project progress
      const progress = await calculateProjectProgress(projectId);
      await dualWriteService.updateProject(projectId, {
        progress,
        updatedAt: new Date().toISOString()
      });

      // Log activity
      const user = await dualWriteService.getUserById(req.user.id);
      await logActivity(projectId, {
        type: 'task.created',
        userId: req.user.id,
        userName: user?.name || req.user.email,
        userEmail: req.user.email,
        userAvatar: user?.avatar || user?.avatar_url || null,
        entityType: 'task',
        entityId: newTask.id,
        entityTitle: newTask.title,
        action: `created task "${newTask.title}"`,
        metadata: {
          status: newTask.status,
          priority: newTask.priority
        }
      });

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

app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await dualWriteService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access
    const isMember = project.members && Array.isArray(project.members)
      ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
      : project.createdBy === req.user.id;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project'
      });
    }

    const tasks = await dualWriteService.getTasks(projectId);

    res.json({
      success: true,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching tasks'
    });
  }
});

app.put('/api/projects/:projectId/tasks/:taskId',
  authenticateToken,
  validateTaskData,
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const updates = req.body;

      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access
      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
        : project.createdBy === req.user.id;

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      // Get current task
      const tasks = await dualWriteService.getTasks(projectId);
      const oldTask = tasks.find(t => t.id === taskId);

      if (!oldTask) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Build updates
      const taskUpdates = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Set completedAt if status changed to completed
      if (updates.status === 'completed' && oldTask.status !== 'completed') {
        taskUpdates.completedAt = new Date().toISOString();
      }

      await dualWriteService.updateTask(projectId, taskId, taskUpdates);

      const updatedTask = { ...oldTask, ...taskUpdates };

      // Recalculate progress
      const progress = await calculateProjectProgress(projectId);
      await dualWriteService.updateProject(projectId, {
        progress,
        updatedAt: new Date().toISOString()
      });

      // Log activity
      const user = await dualWriteService.getUserById(req.user.id);

      let activityType = 'task.updated';
      let metadata = {};

      if (updates.status === 'completed' && oldTask.status !== 'completed') {
        activityType = 'task.completed';
      } else if (updates.status && updates.status !== oldTask.status) {
        metadata = {
          field: 'status',
          oldValue: oldTask.status,
          newValue: updates.status
        };
      } else if (updates.priority && updates.priority !== oldTask.priority) {
        metadata = {
          field: 'priority',
          oldValue: oldTask.priority,
          newValue: updates.priority
        };
      } else if (updates.assignedTo !== undefined && updates.assignedTo !== oldTask.assignedTo) {
        const assigneeUser = updates.assignedTo ? await dualWriteService.getUserById(updates.assignedTo) : null;
        metadata = {
          field: 'assignedTo',
          oldValue: oldTask.assignedTo || 'Unassigned',
          newValue: assigneeUser?.name || updates.assignedTo || 'Unassigned'
        };
      }

      await logActivity(projectId, {
        type: activityType,
        userId: req.user.id,
        userName: user?.name || req.user.email,
        userEmail: req.user.email,
        userAvatar: user?.avatar || user?.avatar_url || null,
        entityType: 'task',
        entityId: updatedTask.id,
        entityTitle: updatedTask.title,
        action: activityType === 'task.completed'
          ? `completed task "${updatedTask.title}"`
          : `updated task "${updatedTask.title}"`,
        metadata
      });

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

app.delete('/api/projects/:projectId/tasks/:taskId',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;

      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check access (only owners/admins can delete tasks)
      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
        : project.createdBy === req.user.id;

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      const member = project.members?.find(m => m.userId === req.user.id || m.userId === req.user.email);
      if (member && member.role !== 'owner' && member.role !== 'admin' && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only project owners and admins can delete tasks'
        });
      }

      // Get task before deleting
      const tasks = await dualWriteService.getTasks(projectId);
      const deletedTask = tasks.find(t => t.id === taskId);

      if (!deletedTask) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      await dualWriteService.deleteTask(projectId, taskId);

      // Recalculate progress
      const progress = await calculateProjectProgress(projectId);
      await dualWriteService.updateProject(projectId, {
        progress,
        updatedAt: new Date().toISOString()
      });

      // Log activity
      const user = await dualWriteService.getUserById(req.user.id);
      await logActivity(projectId, {
        type: 'task.deleted',
        userId: req.user.id,
        userName: user?.name || req.user.email,
        userEmail: req.user.email,
        userAvatar: user?.avatar || user?.avatar_url || null,
        entityType: 'task',
        entityId: deletedTask.id,
        entityTitle: deletedTask.title,
        action: `deleted task "${deletedTask.title}"`,
        metadata: {}
      });

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

// ==================================================
// MILESTONE MANAGEMENT API
// ==================================================

app.post('/api/projects/:projectId/milestones',
  authenticateToken,
  validateMilestoneData,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, dueDate } = req.body;

      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
        : project.createdBy === req.user.id;

      if (!isMember) {
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

      // For now, milestones are still stored in project metadata
      // TODO: Migrate milestones to separate PostgreSQL table in future sprint
      const milestones = project.milestones || [];
      milestones.push(newMilestone);
      await dualWriteService.updateProject(projectId, {
        milestones,
        updatedAt: new Date().toISOString()
      });

      // Log activity
      const user = await dualWriteService.getUserById(req.user.id);
      await logActivity(projectId, {
        type: 'milestone.created',
        userId: req.user.id,
        userName: user?.name || req.user.email,
        userEmail: req.user.email,
        userAvatar: user?.avatar || user?.avatar_url || null,
        entityType: 'milestone',
        entityId: newMilestone.id,
        entityTitle: newMilestone.title,
        action: `created milestone "${newMilestone.title}"`,
        metadata: {}
      });

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

app.put('/api/projects/:projectId/milestones/:milestoneId',
  authenticateToken,
  validateMilestoneData,
  async (req, res) => {
    try {
      const { projectId, milestoneId } = req.params;
      const updates = req.body;

      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
        : project.createdBy === req.user.id;

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this project'
        });
      }

      const milestones = project.milestones || [];
      const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);

      if (milestoneIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Milestone not found'
        });
      }

      const oldMilestone = milestones[milestoneIndex];

      const updatedMilestone = {
        ...oldMilestone,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (updates.status === 'completed' && oldMilestone.status !== 'completed') {
        updatedMilestone.completedAt = new Date().toISOString();
      }

      milestones[milestoneIndex] = updatedMilestone;
      await dualWriteService.updateProject(projectId, {
        milestones,
        updatedAt: new Date().toISOString()
      });

      // Log activity
      const user = await dualWriteService.getUserById(req.user.id);
      const activityType = (updates.status === 'completed' && oldMilestone.status !== 'completed')
        ? 'milestone.completed'
        : 'milestone.updated';

      await logActivity(projectId, {
        type: activityType,
        userId: req.user.id,
        userName: user?.name || req.user.email,
        userEmail: req.user.email,
        userAvatar: user?.avatar || user?.avatar_url || null,
        entityType: 'milestone',
        entityId: updatedMilestone.id,
        entityTitle: updatedMilestone.title,
        action: activityType === 'milestone.completed'
          ? `completed milestone "${updatedMilestone.title}"`
          : `updated milestone "${updatedMilestone.title}"`,
        metadata: {}
      });

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

// ==================================================
// ACTIVITY FEED API (refactored to use dual-write service)
// ==================================================

app.get('/api/projects/:projectId/activities',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 50, offset = 0, type, userId, dateFrom, dateTo } = req.query;

      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === req.user.id || m.userId === req.user.email)
        : project.createdBy === req.user.id;

      if (!isMember) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      let activities = await getActivities(projectId);

      // Apply filters
      if (type) {
        activities = activities.filter(a => a.type === type);
      }

      if (userId) {
        activities = activities.filter(a => a.userId === userId || a.user_id === userId);
      }

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        activities = activities.filter(a => new Date(a.timestamp) >= fromDate);
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        activities = activities.filter(a => new Date(a.timestamp) <= toDate);
      }

      // Paginate
      const total = activities.length;
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);
      const paginatedActivities = activities.slice(
        parsedOffset,
        parsedOffset + parsedLimit
      );

      res.json({
        success: true,
        activities: paginatedActivities,
        total,
        hasMore: parsedOffset + paginatedActivities.length < total
      });
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ success: false, error: 'Error fetching activities' });
    }
  }
);

// ==================================================
// ORGANIZATIONS API (still using legacy teams JSON)
// ==================================================

app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const userTeams = teams.filter(team =>
      team.members.some(member => member.userId === req.user.id)
    );

    const organizations = userTeams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      role: team.members.find(m => m.userId === req.user.id)?.role || 'member',
      createdAt: team.createdAt,
      memberCount: team.members.length
    }));

    res.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

app.post('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const organization = {
      id: uuidv4(),
      name,
      description: description || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [{
        userId: req.user.id,
        role: 'admin',
        joinedAt: new Date().toISOString()
      }],
      invites: []
    };

    const teams = await getTeams();
    teams.push(organization);
    await saveTeams(teams);

    res.status(201).json({
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        role: 'admin',
        createdAt: organization.createdAt,
        memberCount: 1
      }
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Failed to create organization' });
  }
});

// ==================================================
// SOCKET.IO REAL-TIME TASK UPDATES
// ==================================================

const projectRooms = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid or expired token'));
  }

  socket.user = decoded;
  next();
});

io.on('connection', (socket) => {
  console.log(`User connected to task socket: ${socket.user.id} (${socket.user.email})`);

  socket.on('join:project', async ({ projectId, userId, userName }) => {
    try {
      const project = await dualWriteService.getProjectById(projectId);

      if (!project) {
        socket.emit('error', { message: 'Project not found' });
        return;
      }

      const isMember = project.members && Array.isArray(project.members)
        ? project.members.some(m => m.userId === socket.user.id)
        : project.createdBy === socket.user.id;

      if (!isMember) {
        socket.emit('error', { message: 'Access denied to project' });
        return;
      }

      socket.join(`project:${projectId}`);

      if (!projectRooms.has(projectId)) {
        projectRooms.set(projectId, new Set());
      }

      const roomUsers = projectRooms.get(projectId);
      roomUsers.add({
        socketId: socket.id,
        userId: socket.user.id,
        userName: userName || socket.user.email,
        joinedAt: new Date().toISOString(),
      });

      console.log(`User ${userName} joined project ${projectId}`);

      const presenceList = Array.from(roomUsers).map(u => ({
        id: u.userId,
        name: u.userName,
        joinedAt: u.joinedAt,
      }));

      io.to(`project:${projectId}`).emit('presence:update', {
        projectId,
        users: presenceList,
      });
    } catch (error) {
      console.error('Error joining project:', error);
      socket.emit('error', { message: 'Error joining project' });
    }
  });

  socket.on('leave:project', ({ projectId, userId }) => {
    socket.leave(`project:${projectId}`);

    if (projectRooms.has(projectId)) {
      const roomUsers = projectRooms.get(projectId);
      const userEntry = Array.from(roomUsers).find(u => u.socketId === socket.id);

      if (userEntry) {
        roomUsers.delete(userEntry);
        console.log(`User ${userEntry.userName} left project ${projectId}`);

        const presenceList = Array.from(roomUsers).map(u => ({
          id: u.userId,
          name: u.userName,
          joinedAt: u.joinedAt,
        }));

        io.to(`project:${projectId}`).emit('presence:update', {
          projectId,
          users: presenceList,
        });

        if (roomUsers.size === 0) {
          projectRooms.delete(projectId);
        }
      }
    }
  });

  socket.on('task:created', async ({ projectId, task }) => {
    try {
      const user = await dualWriteService.getUserById(socket.user.id);
      const userName = user ? user.name : socket.user.email;

      socket.to(`project:${projectId}`).emit('task:created', {
        projectId,
        task,
        userId: socket.user.id,
        userName,
        timestamp: new Date().toISOString(),
      });

      console.log(`Task created broadcast: ${task.title} in project ${projectId}`);
    } catch (error) {
      console.error('Error broadcasting task:created:', error);
    }
  });

  socket.on('task:updated', async ({ projectId, task }) => {
    try {
      const user = await dualWriteService.getUserById(socket.user.id);
      const userName = user ? user.name : socket.user.email;

      socket.to(`project:${projectId}`).emit('task:updated', {
        projectId,
        task,
        userId: socket.user.id,
        userName,
        timestamp: new Date().toISOString(),
      });

      console.log(`Task updated broadcast: ${task.title} in project ${projectId}`);
    } catch (error) {
      console.error('Error broadcasting task:updated:', error);
    }
  });

  socket.on('task:deleted', async ({ projectId, taskId }) => {
    try {
      const user = await dualWriteService.getUserById(socket.user.id);
      const userName = user ? user.name : socket.user.email;

      socket.to(`project:${projectId}`).emit('task:deleted', {
        projectId,
        taskId,
        userId: socket.user.id,
        userName,
        timestamp: new Date().toISOString(),
      });

      console.log(`Task deleted broadcast: ${taskId} in project ${projectId}`);
    } catch (error) {
      console.error('Error broadcasting task:deleted:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected from task socket: ${socket.user.id}`);

    for (const [projectId, roomUsers] of projectRooms.entries()) {
      const userEntry = Array.from(roomUsers).find(u => u.socketId === socket.id);

      if (userEntry) {
        roomUsers.delete(userEntry);

        const presenceList = Array.from(roomUsers).map(u => ({
          id: u.userId,
          name: u.userName,
          joinedAt: u.joinedAt,
        }));

        io.to(`project:${projectId}`).emit('presence:update', {
          projectId,
          users: presenceList,
        });

        if (roomUsers.size === 0) {
          projectRooms.delete(projectId);
        }
      }
    }
  });
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log('Database Configuration:');
  console.log(`  - Reading from: ${dualWriteService.usePostgres ? 'PostgreSQL' : 'JSON files'}`);
  console.log(`  - Writing to: ${dualWriteService.dualWriteEnabled ? 'PostgreSQL + JSON' : 'PostgreSQL only'}`);
  console.log('API endpoints available:');
  console.log('  POST /api/auth/signup');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/auth/me');
  console.log('  POST /api/auth/logout');
  console.log('  POST /api/auth/google');
  console.log('  POST /api/files/upload');
  console.log('  GET  /api/files');
  console.log('  GET  /api/files/:id');
  console.log('  PUT  /api/files/:id');
  console.log('  DELETE /api/files/:id');
  console.log('  POST /api/teams');
  console.log('  GET  /api/teams');
  console.log('  POST /api/projects');
  console.log('  GET  /api/projects');
  console.log('  GET  /api/projects/:id');
  console.log('  PUT  /api/projects/:id');
  console.log('  DELETE /api/projects/:id');
  console.log('  POST /api/projects/:id/channel');
  console.log('  GET  /api/projects/:id/channel');
  console.log('  POST /api/projects/:projectId/tasks');
  console.log('  GET  /api/projects/:projectId/tasks');
  console.log('  PUT  /api/projects/:projectId/tasks/:taskId');
  console.log('  DELETE /api/projects/:projectId/tasks/:taskId');
  console.log('  POST /api/projects/:projectId/milestones');
  console.log('  PUT  /api/projects/:projectId/milestones/:milestoneId');
  console.log('  GET  /api/projects/:projectId/activities');
  console.log('  GET  /api/organizations');
  console.log('  POST /api/organizations');
});
