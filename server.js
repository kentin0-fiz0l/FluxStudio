const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://fluxstudio.art', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'https://fluxstudio.art',
      'http://fluxstudio.art',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001'
    ];

    // Check if origin is in allowed list or is a subdomain of fluxstudio.art
    if (allowedOrigins.includes(origin) || origin.includes('fluxstudio.art')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add security headers for OAuth compatibility
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// File storage configuration
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept most common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mov|avi|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// In-memory storage for development (replace with database in production)
let conversations = [];
let messages = [];
let notifications = [];
let onlineUsers = new Map();
let typingUsers = new Map();

// ======================
// PULSE STATE (per user per project last-seen tracking)
// ======================
let pulseState = new Map(); // key: `${userId}:${projectId}`, value: { lastSeenAt, updatedAt }
let projectPresence = new Map(); // key: projectId, value: Map<socketId, { userId, userName, joinedAt }>

// Pulse state helpers
function getPulseStateKey(userId, projectId) {
  return `${userId}:${projectId}`;
}

function getPulseState(userId, projectId) {
  const key = getPulseStateKey(userId, projectId);
  return pulseState.get(key) || null;
}

function setPulseState(userId, projectId, lastSeenAt = new Date().toISOString()) {
  const key = getPulseStateKey(userId, projectId);
  const now = new Date().toISOString();
  pulseState.set(key, {
    userId,
    projectId,
    lastSeenAt,
    updatedAt: now
  });
  return pulseState.get(key);
}

// Project presence helpers
function getProjectPresence(projectId) {
  return projectPresence.get(projectId) || new Map();
}

function addUserToProjectPresence(projectId, socketId, userId, userName) {
  if (!projectPresence.has(projectId)) {
    projectPresence.set(projectId, new Map());
  }
  projectPresence.get(projectId).set(socketId, {
    userId,
    userName,
    joinedAt: new Date().toISOString()
  });
}

function removeUserFromProjectPresence(projectId, socketId) {
  const presence = projectPresence.get(projectId);
  if (presence) {
    presence.delete(socketId);
    if (presence.size === 0) {
      projectPresence.delete(projectId);
    }
  }
}

function getProjectPresenceList(projectId) {
  const presence = getProjectPresence(projectId);
  // Dedupe by userId (same user might have multiple tabs)
  const userMap = new Map();
  presence.forEach((data) => {
    if (!userMap.has(data.userId)) {
      userMap.set(data.userId, data);
    }
  });
  return Array.from(userMap.values());
}

// File storage
const mockFiles = new Map();
mockFiles.set('file-1', {
  id: 'file-1',
  name: 'project-mockup.pdf',
  originalName: 'Project Mockup Design.pdf',
  type: 'application/pdf',
  size: 2048000,
  url: '/placeholders/design-concepts.jpg',
  uploadedBy: 'kentino',
  uploadedAt: '2024-01-15T10:30:00Z',
  projectId: 'project-1',
  isImage: false,
  isVideo: false,
  thumbnailUrl: null
});

mockFiles.set('file-2', {
  id: 'file-2',
  name: 'reference-image.jpg',
  originalName: 'Reference Image v2.jpg',
  type: 'image/jpeg',
  size: 1536000,
  url: '/placeholders/marching-band-stadium.jpg',
  uploadedBy: 'kentino',
  uploadedAt: '2024-01-16T14:15:00Z',
  projectId: 'project-1',
  isImage: true,
  isVideo: false,
  thumbnailUrl: '/placeholders/marching-band-stadium.jpg'
});

// ======================
// NOTIFICATION SYSTEM
// ======================

// Notification helper functions
function createNotification(type, userId, data) {
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    userId,
    title: getNotificationTitle(type, data),
    message: getNotificationMessage(type, data),
    data,
    isRead: false,
    isSnoozed: false,
    priority: data.priority || 'medium',
    createdAt: new Date().toISOString(),
    readAt: null,
    snoozeUntil: null
  };

  notifications.push(notification);

  // Send real-time notification if user is online
  io.to(`user:${userId}`).emit('notification:new', notification);

  return notification;
}

function getNotificationTitle(type, data) {
  switch (type) {
    case 'message_mention':
      return 'You were mentioned';
    case 'project_assigned':
      return 'Project assignment';
    case 'task_assigned':
      return 'Task assignment';
    case 'project_update':
      return 'Project update';
    case 'file_shared':
      return 'File shared with you';
    case 'comment_reply':
      return 'New reply to your comment';
    case 'approval_request':
      return 'Approval required';
    case 'deadline_reminder':
      return 'Deadline reminder';
    case 'team_invitation':
      return 'Team invitation';
    default:
      return 'New notification';
  }
}

function getNotificationMessage(type, data) {
  switch (type) {
    case 'message_mention':
      return `${data.mentionedBy} mentioned you in ${data.conversationName}`;
    case 'project_assigned':
      return `You have been assigned to "${data.projectName}"`;
    case 'task_assigned':
      return `New task assigned: "${data.taskTitle}"`;
    case 'project_update':
      return `"${data.projectName}" has been updated`;
    case 'file_shared':
      return `${data.sharedBy} shared "${data.fileName}" with you`;
    case 'comment_reply':
      return `${data.replyBy} replied to your comment`;
    case 'approval_request':
      return `"${data.itemName}" requires your approval`;
    case 'deadline_reminder':
      return `"${data.itemName}" is due in ${data.timeRemaining}`;
    case 'team_invitation':
      return `You've been invited to join "${data.teamName}"`;
    default:
      return 'You have a new notification';
  }
}

function markNotificationAsRead(notificationId) {
  const notificationIndex = notifications.findIndex(n => n.id === notificationId);
  if (notificationIndex !== -1) {
    notifications[notificationIndex].isRead = true;
    notifications[notificationIndex].readAt = new Date().toISOString();
    return notifications[notificationIndex];
  }
  return null;
}

function getUnreadNotificationCount(userId) {
  return notifications.filter(n => n.userId === userId && !n.isRead).length;
}

// Session storage for authenticated users
let userSessions = new Map(); // token -> user
let userDatabase = new Map(); // email -> user data

// Initialize with some sample users (in production, this would be in a database)
const initializeUsers = () => {
  const sampleUsers = [
    {
      id: 'kentino',
      name: 'Kentino',
      email: 'kentino@fluxstudio.art',
      userType: 'designer',
      avatar: '/avatars/kentino.jpg',
      bio: 'Creative designer specializing in marching band uniforms and visual concepts.',
      title: 'Lead Designer',
      location: 'Austin, TX',
      timezone: 'America/Chicago',
      organizations: ['org-1'],
      preferences: {
        notifications: {
          email: true,
          push: true,
          mentions: true,
          projects: true,
          deadlines: true
        },
        display: {
          theme: 'light',
          compactMode: false,
          showAvatars: true
        },
        privacy: {
          profileVisibility: 'team',
          showOnlineStatus: true,
          allowDirectMessages: true
        }
      },
      password: 'demo', // In production, this would be hashed
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'client-1',
      name: 'Director Johnson',
      email: 'director@school.edu',
      userType: 'client',
      avatar: '/avatars/director.jpg',
      bio: 'High school band director with 15 years of experience leading competitive marching bands.',
      title: 'Band Director',
      location: 'Westfield, TX',
      timezone: 'America/Chicago',
      organizations: ['org-1'],
      preferences: {
        notifications: {
          email: true,
          push: false,
          mentions: true,
          projects: true,
          deadlines: true
        },
        display: {
          theme: 'light',
          compactMode: true,
          showAvatars: true
        },
        privacy: {
          profileVisibility: 'organization',
          showOnlineStatus: false,
          allowDirectMessages: true
        }
      },
      password: 'demo',
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  sampleUsers.forEach(user => {
    userDatabase.set(user.email, user);
  });
};

initializeUsers();

// Initialize sample conversations and messages for demonstration
const initializeConversations = () => {
  // Sample conversations
  conversations.push({
    id: 'conv-1',
    name: 'Fall 2024 Marching Band Project',
    type: 'project',
    participants: ['kentino', 'client-1'],
    lastMessage: {
      id: 'msg-3',
      content: 'The latest uniform concepts look fantastic!',
      authorId: 'client-1',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    unreadCount: 0,
    isPinned: true,
    tags: ['uniforms', 'fall-2024'],
    lastActivity: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  conversations.push({
    id: 'conv-2',
    name: 'Winter Guard Props Discussion',
    type: 'direct',
    participants: ['kentino', 'client-1'],
    lastMessage: {
      id: 'msg-6',
      content: 'Can we schedule a review for the new flag designs?',
      authorId: 'kentino',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    unreadCount: 2,
    tags: ['props', 'winter-guard'],
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  });

  conversations.push({
    id: 'conv-3',
    name: 'Spring Show Coordination',
    type: 'group',
    participants: ['kentino', 'client-1'],
    lastMessage: {
      id: 'msg-9',
      content: 'Updated storyboards are ready for review',
      authorId: 'kentino',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    unreadCount: 0,
    tags: ['spring-2024', 'storyboards'],
    lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Sample messages for conversation 1
  messages.push({
    id: 'msg-1',
    conversationId: 'conv-1',
    content: 'Hello! I\'ve uploaded the latest uniform concepts for your review.',
    authorId: 'kentino',
    type: 'text',
    status: 'read',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  });

  messages.push({
    id: 'msg-2',
    conversationId: 'conv-1',
    content: 'Please pay special attention to the color combinations for the brass section.',
    authorId: 'kentino',
    type: 'text',
    status: 'read',
    createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
  });

  messages.push({
    id: 'msg-3',
    conversationId: 'conv-1',
    content: 'The latest uniform concepts look fantastic!',
    authorId: 'client-1',
    type: 'text',
    status: 'read',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  });

  // Sample messages for conversation 2
  messages.push({
    id: 'msg-4',
    conversationId: 'conv-2',
    content: 'I\'ve completed the initial designs for the winter guard flags.',
    authorId: 'kentino',
    type: 'text',
    status: 'read',
    attachments: [{
      id: 'att-1',
      name: 'flag-designs-v1.pdf',
      type: 'application/pdf',
      size: 2456789,
      url: '/files/flag-designs-v1.pdf'
    }],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  });

  messages.push({
    id: 'msg-5',
    conversationId: 'conv-2',
    content: 'The color palette works perfectly with our theme!',
    authorId: 'client-1',
    type: 'text',
    status: 'read',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  });

  messages.push({
    id: 'msg-6',
    conversationId: 'conv-2',
    content: 'Can we schedule a review for the new flag designs?',
    authorId: 'kentino',
    type: 'text',
    status: 'delivered',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  });

  console.log(`Initialized ${conversations.length} sample conversations and ${messages.length} sample messages`);
};

initializeConversations();

// Helper function to generate unique user ID
const generateUserId = () => {
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Helper function to generate session token
const generateToken = () => {
  return 'token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Helper function to get user from token
const getUserFromToken = (token) => {
  if (!token || !token.startsWith('Bearer ')) return null;
  const actualToken = token.substring(7);
  return userSessions.get(actualToken);
};

// Mock users object for backward compatibility
const mockUsers = {};
userDatabase.forEach((user, email) => {
  mockUsers[user.id] = { ...user };
  delete mockUsers[user.id].password;
});

// Mock organization data
const mockOrganizations = new Map();
mockOrganizations.set('org-1', {
  id: 'org-1',
  name: 'Westfield High School Marching Band',
  description: 'A premier high school marching band program',
  logo: null,
  website: 'https://westfield-band.edu',
  industry: 'Education',
  size: 'medium',
  createdBy: 'kentino',
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  settings: {
    allowMemberInvites: true,
    requireApprovalForJoining: false,
    defaultMemberRole: 'member'
  },
  subscription: {
    plan: 'pro',
    status: 'active',
    memberLimit: 100,
    teamLimit: 10
  }
});

// Mock projects data
const mockProjects = new Map();

// Initialize sample project
mockProjects.set('project-1', {
  id: 'project-1',
  name: 'Fall 2024 Marching Show',
  description: 'Complete uniform and visual design for fall marching season',
  status: 'in_progress',
  priority: 'high',
  organizationId: 'org-1',
  teamId: 'team-1',
  createdBy: 'kentino',
  startDate: '2024-08-01',
  dueDate: '2024-10-15',
  progress: 65,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  members: ['kentino', 'client-1'],
  tasks: [
    {
      id: 'task-1',
      title: 'Create initial uniform concepts',
      description: 'Design 3 different uniform concepts for client review',
      status: 'completed',
      priority: 'high',
      assignedTo: 'kentino',
      dueDate: '2024-08-15',
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'task-2',
      title: 'Client feedback review',
      description: 'Review and incorporate client feedback on uniform concepts',
      status: 'in_progress',
      priority: 'medium',
      assignedTo: 'kentino',
      dueDate: '2024-09-01',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'task-3',
      title: 'Final production preparation',
      description: 'Prepare final designs for production and ordering',
      status: 'todo',
      priority: 'medium',
      assignedTo: 'kentino',
      dueDate: '2024-09-15',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  milestones: [
    {
      id: 'milestone-1',
      title: 'Concept Development Complete',
      description: 'All initial uniform concepts completed and ready for review',
      dueDate: '2024-08-20',
      status: 'completed',
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'milestone-2',
      title: 'Client Approval',
      description: 'Client approves final uniform design',
      dueDate: '2024-09-05',
      status: 'in_progress'
    },
    {
      id: 'milestone-3',
      title: 'Production Ready',
      description: 'All designs finalized and ready for production',
      dueDate: '2024-09-20',
      status: 'pending'
    }
  ],
  files: [
    {
      id: 'file-1',
      name: 'Uniform_Concepts_v3.pdf',
      type: 'design',
      uploadedBy: 'kentino',
      uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      url: '/files/project-1/Uniform_Concepts_v3.pdf',
      size: 2456789
    }
  ],
  settings: {
    isPrivate: false,
    allowComments: true,
    requireApproval: false
  }
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Find user in database
  const user = userDatabase.get(email);

  if (user && user.password === password) {
    // Generate session token
    const token = generateToken();
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    // Store session
    userSessions.set(token, userWithoutPassword);

    res.json({
      success: true,
      user: userWithoutPassword,
      token
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, userType } = req.body;

  // Check if user already exists
  if (userDatabase.has(email)) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Create new user
  const userId = generateUserId();
  const newUser = {
    id: userId,
    email,
    password, // In production, this should be hashed
    name: name || 'New User',
    userType: userType || 'client',
    avatar: `/avatars/default.jpg`,
    organizations: []
  };

  // Store in database
  userDatabase.set(email, newUser);

  // Generate session token
  const token = generateToken();
  const userWithoutPassword = { ...newUser };
  delete userWithoutPassword.password;

  // Store session
  userSessions.set(token, userWithoutPassword);

  // Update mockUsers for backward compatibility
  mockUsers[userId] = userWithoutPassword;

  res.json({
    success: true,
    user: userWithoutPassword,
    token
  });
});

app.post('/api/auth/google', (req, res) => {
  try {
    const { credential, email, name, picture } = req.body;

    console.log('Google OAuth request:', { credential: !!credential, email, name, picture });

    let userEmail = email;
    let userName = name;
    let userPicture = picture;

    // If we have a credential (JWT token), decode it to get user info
    if (credential && !email) {
      try {
        // Decode JWT token (basic decoding without verification for demo)
        const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
        userEmail = payload.email;
        userName = payload.name;
        userPicture = payload.picture;
        console.log('Decoded JWT payload:', { email: userEmail, name: userName, picture: userPicture });
      } catch (jwtError) {
        console.error('JWT decode error:', jwtError);
        return res.status(400).json({
          success: false,
          message: 'Invalid Google credential token'
        });
      }
    }

    // Validate required data
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google authentication'
      });
    }

    // Check if user exists
    let user = userDatabase.get(userEmail);

    if (!user) {
      // Create new user from Google OAuth data
      const userId = generateUserId();
      user = {
        id: userId,
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        userType: 'client', // Default to client, can be changed later
        avatar: userPicture || '/avatars/default.jpg',
        organizations: [],
        googleAuth: true
      };

      // Store in database
      userDatabase.set(userEmail, user);

      // Update mockUsers for backward compatibility
      mockUsers[userId] = { ...user };
    }

    // Generate session token
    const token = generateToken();
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    // Store session
    userSessions.set(token, userWithoutPassword);

    res.json({
      success: true,
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Google authentication'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    const actualToken = token.substring(7);
    userSessions.delete(actualToken);
  }

  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization;
  const user = getUserFromToken(token);

  if (user) {
    res.json(user);
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// Organizations endpoints
app.get('/api/organizations', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  // Get organizations the user belongs to
  const userOrganizations = Array.from(mockOrganizations.values()).filter(org =>
    currentUser.organizations?.includes(org.id)
  );

  res.json({
    organizations: userOrganizations
  });
});

app.get('/api/organizations/:id', (req, res) => {
  const org = mockOrganizations.get(req.params.id);
  if (org) {
    res.json(org);
  } else {
    res.status(404).json({ message: 'Organization not found' });
  }
});

app.get('/api/organizations/:id/teams', (req, res) => {
  const org = mockOrganizations.get(req.params.id);
  if (!org) {
    return res.status(404).json({ message: 'Organization not found' });
  }

  // Get teams for this organization
  const orgTeams = Array.from(mockTeams.values()).filter(team =>
    team.organizationId === req.params.id
  );

  res.json(orgTeams);
});

app.get('/api/organizations/:id/stats', (req, res) => {
  const org = mockOrganizations.get(req.params.id);
  if (!org) {
    return res.status(404).json({ message: 'Organization not found' });
  }

  // Mock statistics for the organization
  const stats = {
    organizationId: req.params.id,
    overview: {
      totalProjects: org.projects.length,
      activeProjects: 1,
      completedProjects: 0,
      totalMembers: org.members.length,
      totalTeams: 2
    },
    projectStats: {
      inProgress: 1,
      review: 0,
      completed: 0,
      onHold: 0
    },
    memberActivity: {
      activeToday: 2,
      activeThisWeek: 2,
      activeThisMonth: 2
    },
    recentActivity: [
      {
        type: 'project_update',
        project: 'Fall 2024 Marching Show',
        user: 'Kentino',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: 'Updated uniform concepts'
      },
      {
        type: 'file_upload',
        project: 'Fall 2024 Marching Show',
        user: 'Kentino',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        description: 'Uploaded Uniform_Concepts_v3.pdf'
      }
    ],
    usage: {
      storage: {
        used: 256 * 1024 * 1024, // 256 MB in bytes
        total: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
        percentage: 5
      },
      bandwidth: {
        used: 512 * 1024 * 1024, // 512 MB in bytes
        total: 10 * 1024 * 1024 * 1024, // 10 GB in bytes
        percentage: 5
      }
    }
  };

  res.json(stats);
});

app.post('/api/organizations', (req, res) => {
  const { name, description, website, industry, size } = req.body;

  // Validate required fields
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Organization name is required'
    });
  }

  // Create new organization
  const newOrgId = 'org-' + Date.now();
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const newOrganization = {
    id: newOrgId,
    name,
    description: description || '',
    logo: null,
    website: website || '',
    industry: industry || '',
    size: size || 'startup',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    settings: {
      allowMemberInvites: true,
      requireApprovalForJoining: false,
      defaultMemberRole: 'member'
    },
    subscription: {
      plan: 'free',
      status: 'active',
      memberLimit: 10,
      teamLimit: 3
    }
  };

  // Add to mock organizations
  mockOrganizations.set(newOrgId, newOrganization);

  // Add organization to user's organizations
  if (!currentUser.organizations) {
    currentUser.organizations = [];
  }
  if (!currentUser.organizations.includes(newOrgId)) {
    currentUser.organizations.push(newOrgId);
  }

  // Update user in database
  const userFromDB = userDatabase.get(currentUser.email);
  if (userFromDB) {
    if (!userFromDB.organizations) {
      userFromDB.organizations = [];
    }
    if (!userFromDB.organizations.includes(newOrgId)) {
      userFromDB.organizations.push(newOrgId);
    }
  }

  res.json({
    success: true,
    organization: newOrganization,
    message: 'Organization created successfully'
  });
});

// Update organization
app.put('/api/organizations/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const org = mockOrganizations.get(req.params.id);
  if (!org) {
    return res.status(404).json({ message: 'Organization not found' });
  }

  // Update organization
  const updatedOrg = {
    ...org,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockOrganizations.set(req.params.id, updatedOrg);

  res.json(updatedOrg);
});

// Invite to organization
app.post('/api/organizations/:id/invite', (req, res) => {
  const { email, role = 'member', message } = req.body;
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const org = mockOrganizations.get(req.params.id);
  if (!org) {
    return res.status(404).json({ message: 'Organization not found' });
  }

  // Mock invitation (in real implementation, send email)
  const inviteId = 'invite-' + Date.now();
  const invitation = {
    id: inviteId,
    organizationId: req.params.id,
    email,
    role,
    invitedBy: currentUser.id,
    invitedAt: new Date().toISOString(),
    status: 'pending',
    message: message || ''
  };

  console.log(`Invitation sent to ${email} for organization ${org.name}`);

  res.json({
    success: true,
    invitation,
    message: 'Invitation sent successfully'
  });
});

// Leave organization
app.post('/api/organizations/:id/leave', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const org = mockOrganizations.get(req.params.id);
  if (!org) {
    return res.status(404).json({ message: 'Organization not found' });
  }

  // Remove organization from user's organizations
  if (currentUser.organizations) {
    currentUser.organizations = currentUser.organizations.filter(orgId => orgId !== req.params.id);
  }

  // Update user in database
  const userFromDB = userDatabase.get(currentUser.email);
  if (userFromDB && userFromDB.organizations) {
    userFromDB.organizations = userFromDB.organizations.filter(orgId => orgId !== req.params.id);
  }

  res.json({
    success: true,
    message: 'Left organization successfully'
  });
});

// Mock teams data
const mockTeams = new Map();

// Teams endpoints
app.get('/api/teams', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  // Get teams for user's organizations
  const userTeams = Array.from(mockTeams.values()).filter(team =>
    currentUser.organizations?.includes(team.organizationId) ||
    team.members?.some(member => member.userId === currentUser.id)
  );

  res.json({
    teams: userTeams
  });
});

app.post('/api/teams', (req, res) => {
  const { name, description, organizationId } = req.body;
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Team name is required'
    });
  }

  const teamId = 'team-' + Date.now();
  const newTeam = {
    id: teamId,
    name,
    description: description || '',
    organizationId: organizationId || null,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    members: [{
      userId: currentUser.id,
      role: 'owner',
      joinedAt: new Date().toISOString()
    }],
    invites: []
  };

  mockTeams.set(teamId, newTeam);

  res.json({
    success: true,
    team: newTeam,
    message: 'Team created successfully'
  });
});

app.put('/api/teams/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const team = mockTeams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const updatedTeam = {
    ...team,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockTeams.set(req.params.id, updatedTeam);
  res.json(updatedTeam);
});

app.post('/api/teams/:id/invite', (req, res) => {
  const { email, role = 'member' } = req.body;
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const team = mockTeams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const inviteId = 'invite-' + Date.now();
  const invitation = {
    id: inviteId,
    email,
    role,
    invitedBy: currentUser.id,
    invitedAt: new Date().toISOString(),
    status: 'pending'
  };

  team.invites.push(invitation);
  mockTeams.set(req.params.id, team);

  console.log(`Team invitation sent to ${email} for team ${team.name}`);

  res.json({
    success: true,
    invitation,
    message: 'Invitation sent successfully'
  });
});

// Projects endpoints
app.get('/api/projects', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  // Get projects the user has access to (through organizations or teams)
  const userProjects = Array.from(mockProjects.values()).filter(project =>
    project.members.includes(currentUser.id) ||
    currentUser.organizations?.includes(project.organizationId)
  );

  res.json({
    projects: userProjects
  });
});

app.get('/api/projects/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const {
    name,
    description,
    organizationId,
    teamId,
    startDate,
    dueDate,
    priority = 'medium',
    members = []
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required'
    });
  }

  const projectId = 'project-' + Date.now();
  const newProject = {
    id: projectId,
    name,
    description: description || '',
    status: 'planning',
    priority,
    organizationId: organizationId || null,
    teamId: teamId || null,
    createdBy: currentUser.id,
    startDate: startDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || null,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [currentUser.id, ...members],
    tasks: [],
    milestones: [],
    files: [],
    settings: {
      isPrivate: false,
      allowComments: true,
      requireApproval: false
    }
  };

  mockProjects.set(projectId, newProject);

  // Send notifications to team members about project creation
  if (newProject.members && newProject.members.length > 0) {
    newProject.members.forEach(memberId => {
      if (memberId !== currentUser.id) { // Don't notify the creator
        createNotification('project_assigned', memberId, {
          projectId: newProject.id,
          projectName: newProject.name,
          assignedBy: currentUser.name || currentUser.id,
          priority: 'medium'
        });
      }
    });
  }

  res.json({
    success: true,
    project: newProject,
    message: 'Project created successfully'
  });
});

app.put('/api/projects/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to update this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const updatedProject = {
    ...project,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockProjects.set(req.params.id, updatedProject);

  res.json({
    success: true,
    project: updatedProject,
    message: 'Project updated successfully'
  });
});

app.delete('/api/projects/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Only project creator or organization owner can delete
  if (project.createdBy !== currentUser.id &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  mockProjects.delete(req.params.id);

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
});

// Task management endpoints
app.get('/api/projects/:projectId/tasks', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({
    tasks: project.tasks || []
  });
});

app.post('/api/projects/:projectId/tasks', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { title, description, assignedTo, dueDate, priority = 'medium' } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Task title is required'
    });
  }

  const taskId = 'task-' + Date.now();
  const newTask = {
    id: taskId,
    title,
    description: description || '',
    status: 'todo',
    priority,
    assignedTo: assignedTo || currentUser.id,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
    createdBy: currentUser.id
  };

  project.tasks.push(newTask);
  project.updatedAt = new Date().toISOString();
  mockProjects.set(req.params.projectId, project);

  // Send notification to the assigned user
  if (newTask.assignedTo && newTask.assignedTo !== currentUser.id) {
    createNotification('task_assigned', newTask.assignedTo, {
      taskId: newTask.id,
      taskTitle: newTask.title,
      projectName: project.name,
      assignedBy: currentUser.name || currentUser.id,
      dueDate: newTask.dueDate,
      priority: newTask.priority === 'high' ? 'high' : 'medium'
    });
  }

  res.json({
    success: true,
    task: newTask,
    message: 'Task created successfully'
  });
});

app.put('/api/projects/:projectId/tasks/:taskId', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const taskIndex = project.tasks.findIndex(task => task.id === req.params.taskId);
  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const updatedTask = {
    ...project.tasks[taskIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  // If status is being changed to completed, add completion timestamp
  if (req.body.status === 'completed' && project.tasks[taskIndex].status !== 'completed') {
    updatedTask.completedAt = new Date().toISOString();
  }

  project.tasks[taskIndex] = updatedTask;
  project.updatedAt = new Date().toISOString();
  mockProjects.set(req.params.projectId, project);

  res.json({
    success: true,
    task: updatedTask,
    message: 'Task updated successfully'
  });
});

app.delete('/api/projects/:projectId/tasks/:taskId', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const taskIndex = project.tasks.findIndex(task => task.id === req.params.taskId);
  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }

  project.tasks.splice(taskIndex, 1);
  project.updatedAt = new Date().toISOString();
  mockProjects.set(req.params.projectId, project);

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
});

// Milestone management endpoints
app.get('/api/projects/:projectId/milestones', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({
    milestones: project.milestones || []
  });
});

app.post('/api/projects/:projectId/milestones', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { title, description, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Milestone title is required'
    });
  }

  const milestoneId = 'milestone-' + Date.now();
  const newMilestone = {
    id: milestoneId,
    title,
    description: description || '',
    dueDate: dueDate || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: currentUser.id
  };

  project.milestones.push(newMilestone);
  project.updatedAt = new Date().toISOString();
  mockProjects.set(req.params.projectId, project);

  res.json({
    success: true,
    milestone: newMilestone,
    message: 'Milestone created successfully'
  });
});

app.put('/api/projects/:projectId/milestones/:milestoneId', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const project = mockProjects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Check if user has access to this project
  if (!project.members.includes(currentUser.id) &&
      !currentUser.organizations?.includes(project.organizationId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const milestoneIndex = project.milestones.findIndex(milestone => milestone.id === req.params.milestoneId);
  if (milestoneIndex === -1) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  const updatedMilestone = {
    ...project.milestones[milestoneIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  // If status is being changed to completed, add completion timestamp
  if (req.body.status === 'completed' && project.milestones[milestoneIndex].status !== 'completed') {
    updatedMilestone.completedAt = new Date().toISOString();
  }

  project.milestones[milestoneIndex] = updatedMilestone;
  project.updatedAt = new Date().toISOString();
  mockProjects.set(req.params.projectId, project);

  res.json({
    success: true,
    milestone: updatedMilestone,
    message: 'Milestone updated successfully'
  });
});

// ======================
// PROJECT PULSE ENDPOINTS
// Real-time activity feed, attention items, and presence
// ======================

// Helper: Build activity item from notification
function buildActivityItem(notification, projectId) {
  const typeToDeepLink = {
    'message_mention': `/messages?conversationId=${notification.conversationId || ''}`,
    'message_reply': `/messages?conversationId=${notification.conversationId || ''}`,
    'project_member_added': `/projects/${projectId}?tab=team`,
    'project_file_uploaded': `/file`,
    'file_shared': `/file`,
    'project_status_changed': `/projects/${projectId}`,
    'task_assigned': `/projects/${projectId}?tab=tasks`,
    'comment_reply': `/messages?conversationId=${notification.conversationId || ''}`,
    'default': `/projects/${projectId}`
  };

  const typeLabels = {
    'message_mention': 'You were mentioned',
    'message_reply': 'New reply',
    'project_member_added': 'Member joined',
    'project_file_uploaded': 'File uploaded',
    'file_shared': 'File shared',
    'project_status_changed': 'Project updated',
    'task_assigned': 'Task assigned',
    'comment_reply': 'New reply',
    'default': 'Update'
  };

  return {
    id: notification.id,
    projectId: projectId,
    type: notification.type || 'notification_created',
    actorUserId: notification.data?.mentionedBy || notification.data?.sharedBy || null,
    title: typeLabels[notification.type] || typeLabels['default'],
    entity: {
      conversationId: notification.conversationId || notification.data?.conversationId,
      messageId: notification.messageId || notification.data?.messageId,
      fileId: notification.data?.fileId,
      assetId: notification.data?.assetId,
      notificationId: notification.id
    },
    createdAt: notification.createdAt,
    deepLink: typeToDeepLink[notification.type] || typeToDeepLink['default'],
    preview: notification.message?.slice(0, 120)
  };
}

// GET /api/projects/:id/pulse/activity - Get activity stream for project
app.get('/api/projects/:id/pulse/activity', (req, res) => {
  const token = req.headers.authorization;
  const user = getUserFromToken(token);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const projectId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const cursor = req.query.cursor; // timestamp for pagination

  // Check project access
  const project = mockProjects.get(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  // Filter notifications for this project
  let projectNotifications = notifications.filter(n => {
    // Match by projectId in notification data or infer from context
    const notifProjectId = n.data?.projectId || n.projectId;
    if (notifProjectId === projectId) return true;
    // Also include notifications for project members about project-related events
    if (project.members?.includes(n.userId)) {
      const projectTypes = ['project_member_added', 'project_file_uploaded', 'project_status_changed', 'task_assigned', 'file_shared'];
      return projectTypes.includes(n.type);
    }
    return false;
  });

  // Apply cursor-based pagination
  if (cursor) {
    const cursorTime = new Date(cursor).getTime();
    projectNotifications = projectNotifications.filter(n =>
      new Date(n.createdAt).getTime() < cursorTime
    );
  }

  // Sort by createdAt descending and limit
  projectNotifications.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  projectNotifications = projectNotifications.slice(0, limit);

  // Get user's pulse state for "new" markers
  const userPulseState = getPulseState(user.id, projectId);
  const lastSeenAt = userPulseState?.lastSeenAt ? new Date(userPulseState.lastSeenAt) : null;

  // Build activity items
  const activityItems = projectNotifications.map(n => {
    const item = buildActivityItem(n, projectId);
    item.isNew = lastSeenAt ? new Date(item.createdAt) > lastSeenAt : true;
    return item;
  });

  // Build next cursor
  const nextCursor = activityItems.length === limit && activityItems.length > 0
    ? activityItems[activityItems.length - 1].createdAt
    : null;

  res.json({
    success: true,
    data: activityItems,
    pagination: {
      limit,
      cursor: nextCursor,
      hasMore: !!nextCursor
    }
  });
});

// Users endpoints
app.get('/api/users/me', (req, res) => {
  const token = req.headers.authorization;
  const user = getUserFromToken(token);

  if (user) {
    res.json(user);
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

app.get('/api/users/:id', (req, res) => {
  const user = mockUsers[req.params.id];
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// ======================
// USER PROFILE MANAGEMENT
// ======================

// Update user profile
app.put('/api/users/profile', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { name, email, bio, title, location, timezone, avatar, preferences } = req.body;

    // Validate email uniqueness if changing email
    if (email && email !== currentUser.email) {
      const existingUser = Array.from(userDatabase.values()).find(user => user.email === email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Find user in database
    const userInDb = userDatabase.get(currentUser.email);
    if (!userInDb) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user data
    const updatedUser = {
      ...userInDb,
      ...(name && { name }),
      ...(bio && { bio }),
      ...(title && { title }),
      ...(location && { location }),
      ...(timezone && { timezone }),
      ...(avatar && { avatar }),
      ...(preferences && { preferences }),
      updatedAt: new Date().toISOString()
    };

    // Handle email change
    if (email && email !== currentUser.email) {
      userDatabase.delete(currentUser.email);
      updatedUser.email = email;
      userDatabase.set(email, updatedUser);

      // Update sessions to point to new user data
      for (const [sessionToken, sessionUser] of userSessions.entries()) {
        if (sessionUser.email === currentUser.email) {
          userSessions.set(sessionToken, updatedUser);
        }
      }
    } else {
      userDatabase.set(currentUser.email, updatedUser);

      // Update current session
      for (const [sessionToken, sessionUser] of userSessions.entries()) {
        if (sessionUser.email === currentUser.email) {
          userSessions.set(sessionToken, updatedUser);
        }
      }
    }

    // Update mockUsers for backward compatibility
    mockUsers[updatedUser.id] = { ...updatedUser };
    delete mockUsers[updatedUser.id].password;

    res.json({
      success: true,
      user: { ...updatedUser, password: undefined }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user profile with statistics
app.get('/api/users/profile/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id } = req.params;
    const targetUser = mockUsers[id];

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user statistics
    const userProjects = Array.from(mockProjects.values()).filter(project =>
      project.members && project.members.includes(id)
    );

    const userMessages = messages.filter(msg => msg.authorId === id);
    const userFiles = Array.from(mockFiles.values()).filter(file => file.uploadedBy === id);

    // Calculate completion rate for projects where user is involved
    const completedProjects = userProjects.filter(project => project.status === 'completed');
    const completionRate = userProjects.length > 0 ?
      Math.round((completedProjects.length / userProjects.length) * 100) : 0;

    // Get recent activity
    const recentMessages = userMessages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const userProfile = {
      ...targetUser,
      statistics: {
        projectsCount: userProjects.length,
        completedProjects: completedProjects.length,
        completionRate,
        messagesCount: userMessages.length,
        filesUploaded: userFiles.length,
        joinedDate: targetUser.createdAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      recentActivity: recentMessages.map(msg => ({
        id: msg.id,
        type: 'message',
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        conversationId: msg.conversationId,
        createdAt: msg.createdAt
      }))
    };

    res.json({
      success: true,
      profile: userProfile
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Upload user avatar
app.post('/api/users/avatar', upload.single('avatar'), (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    // Update user in database
    const userInDb = userDatabase.get(currentUser.email);
    if (userInDb) {
      userInDb.avatar = avatarUrl;
      userInDb.updatedAt = new Date().toISOString();
      userDatabase.set(currentUser.email, userInDb);

      // Update sessions
      for (const [sessionToken, sessionUser] of userSessions.entries()) {
        if (sessionUser.email === currentUser.email) {
          userSessions.set(sessionToken, userInDb);
        }
      }

      // Update mockUsers
      mockUsers[userInDb.id] = { ...userInDb };
      delete mockUsers[userInDb.id].password;
    }

    res.json({
      success: true,
      avatarUrl,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
});

// Update user preferences
app.put('/api/users/preferences', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data'
      });
    }

    // Update user in database
    const userInDb = userDatabase.get(currentUser.email);
    if (userInDb) {
      userInDb.preferences = {
        ...userInDb.preferences,
        ...preferences
      };
      userInDb.updatedAt = new Date().toISOString();
      userDatabase.set(currentUser.email, userInDb);

      // Update sessions
      for (const [sessionToken, sessionUser] of userSessions.entries()) {
        if (sessionUser.email === currentUser.email) {
          userSessions.set(sessionToken, userInDb);
        }
      }

      // Update mockUsers
      mockUsers[userInDb.id] = { ...userInDb };
      delete mockUsers[userInDb.id].password;
    }

    res.json({
      success: true,
      preferences: userInDb.preferences,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

// Get user activity feed
app.get('/api/users/activity', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { limit = 20, offset = 0 } = req.query;

    // Collect user activities
    const activities = [];

    // Messages
    const userMessages = messages
      .filter(msg => msg.authorId === currentUser.id)
      .map(msg => ({
        id: `msg-${msg.id}`,
        type: 'message',
        title: 'Sent a message',
        description: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        conversationId: msg.conversationId,
        createdAt: msg.createdAt,
        metadata: {
          messageId: msg.id,
          conversationName: conversations.find(c => c.id === msg.conversationId)?.name || 'Unknown'
        }
      }));

    // File uploads
    const userFiles = Array.from(mockFiles.values())
      .filter(file => file.uploadedBy === currentUser.id)
      .map(file => ({
        id: `file-${file.id}`,
        type: 'file_upload',
        title: 'Uploaded a file',
        description: `Uploaded "${file.originalName}"`,
        createdAt: file.uploadedAt,
        metadata: {
          fileId: file.id,
          fileName: file.originalName,
          fileType: file.type,
          projectId: file.projectId
        }
      }));

    // Combine and sort activities
    activities.push(...userMessages, ...userFiles);
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      activities: paginatedActivities,
      total: activities.length,
      hasMore: offset + parseInt(limit) < activities.length
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity'
    });
  }
});

// Delete user account
app.delete('/api/users/account', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { confirmEmail } = req.body;

    if (confirmEmail !== currentUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Email confirmation does not match'
      });
    }

    // Remove user from database
    userDatabase.delete(currentUser.email);

    // Remove from sessions
    for (const [sessionToken, sessionUser] of userSessions.entries()) {
      if (sessionUser.email === currentUser.email) {
        userSessions.delete(sessionToken);
      }
    }

    // Remove from mockUsers
    delete mockUsers[currentUser.id];

    // Note: In production, you might want to:
    // - Anonymize user data instead of deleting
    // - Transfer ownership of projects/files
    // - Send confirmation email
    // - Log the deletion for audit purposes

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

// Change password
app.put('/api/users/password', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user from database (with password)
    const userInDb = userDatabase.get(currentUser.email);
    if (!userInDb) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password (in production, use bcrypt.compare)
    if (userInDb.password !== currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (in production, use bcrypt.hash)
    userInDb.password = newPassword;
    userInDb.updatedAt = new Date().toISOString();
    userDatabase.set(currentUser.email, userInDb);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// ======================
// GLOBAL SEARCH FUNCTIONALITY
// ======================

// Helper function to calculate search relevance score
function calculateRelevanceScore(item, query, fields) {
  let score = 0;
  const queryLower = query.toLowerCase();

  fields.forEach(field => {
    const value = field.value ? field.value.toLowerCase() : '';
    const weight = field.weight || 1;

    // Exact match gets highest score
    if (value === queryLower) {
      score += 100 * weight;
    }
    // Starts with query gets high score
    else if (value.startsWith(queryLower)) {
      score += 80 * weight;
    }
    // Contains query gets medium score
    else if (value.includes(queryLower)) {
      score += 50 * weight;
    }
    // Word boundary matches get bonus points
    if (new RegExp(`\\b${queryLower}`, 'i').test(value)) {
      score += 20 * weight;
    }
  });

  return score;
}

// Global search endpoint
app.get('/api/search', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { q: query, type, limit = 50, offset = 0 } = req.query;

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = [];

    // Search Messages
    if (!type || type === 'messages') {
      messages.forEach(message => {
        // Check if user has access to this conversation
        const conversation = conversations.find(c => c.id === message.conversationId);
        if (conversation && conversation.participants.includes(currentUser.id)) {
          const score = calculateRelevanceScore(message, query, [
            { value: message.content, weight: 2 },
            { value: message.type, weight: 0.5 }
          ]);

          if (score > 0) {
            results.push({
              id: message.id,
              type: 'message',
              title: `Message in ${conversation.name || 'Conversation'}`,
              content: message.content,
              snippet: message.content.length > 150
                ? message.content.substring(0, 150) + '...'
                : message.content,
              author: mockUsers[message.authorId]?.name || 'Unknown',
              authorId: message.authorId,
              conversationId: message.conversationId,
              conversationName: conversation.name,
              createdAt: message.createdAt,
              score
            });
          }
        }
      });
    }

    // Search Conversations
    if (!type || type === 'conversations') {
      conversations.forEach(conversation => {
        if (conversation.participants.includes(currentUser.id)) {
          const score = calculateRelevanceScore(conversation, query, [
            { value: conversation.name, weight: 3 },
            { value: conversation.type, weight: 1 },
            { value: conversation.tags ? conversation.tags.join(' ') : '', weight: 1.5 }
          ]);

          if (score > 0) {
            results.push({
              id: conversation.id,
              type: 'conversation',
              title: conversation.name,
              content: conversation.name,
              snippet: `${conversation.type} conversation with ${conversation.participants.length} participants`,
              participants: conversation.participants.map(id => mockUsers[id]?.name || id),
              lastActivity: conversation.lastActivity,
              tags: conversation.tags,
              createdAt: conversation.createdAt,
              score
            });
          }
        }
      });
    }

    // Search Projects
    if (!type || type === 'projects') {
      Array.from(mockProjects.values()).forEach(project => {
        if (project.members && project.members.includes(currentUser.id)) {
          const score = calculateRelevanceScore(project, query, [
            { value: project.name, weight: 3 },
            { value: project.description, weight: 2 },
            { value: project.status, weight: 1 },
            { value: project.tags ? project.tags.join(' ') : '', weight: 1.5 }
          ]);

          if (score > 0) {
            results.push({
              id: project.id,
              type: 'project',
              title: project.name,
              content: project.description,
              snippet: project.description && project.description.length > 150
                ? project.description.substring(0, 150) + '...'
                : project.description || 'No description',
              status: project.status,
              members: project.members.map(id => mockUsers[id]?.name || id),
              dueDate: project.dueDate,
              tags: project.tags,
              createdAt: project.createdAt,
              score
            });
          }
        }
      });
    }

    // Search Files
    if (!type || type === 'files') {
      Array.from(mockFiles.values()).forEach(file => {
        // Check if user has access (either uploaded by them or in their projects)
        const hasAccess = file.uploadedBy === currentUser.id ||
          (file.projectId && Array.from(mockProjects.values()).some(p =>
            p.id === file.projectId && p.members && p.members.includes(currentUser.id)
          ));

        if (hasAccess) {
          const score = calculateRelevanceScore(file, query, [
            { value: file.originalName, weight: 3 },
            { value: file.name, weight: 2 },
            { value: file.type, weight: 0.5 }
          ]);

          if (score > 0) {
            results.push({
              id: file.id,
              type: 'file',
              title: file.originalName,
              content: file.originalName,
              snippet: `${file.type} file, ${(file.size / 1024).toFixed(1)} KB`,
              url: file.url,
              fileType: file.type,
              size: file.size,
              uploadedBy: mockUsers[file.uploadedBy]?.name || 'Unknown',
              uploadedById: file.uploadedBy,
              projectId: file.projectId,
              isImage: file.isImage,
              isVideo: file.isVideo,
              uploadedAt: file.uploadedAt,
              score
            });
          }
        }
      });
    }

    // Search Users
    if (!type || type === 'users') {
      Object.values(mockUsers).forEach(user => {
        // Only search users in same organizations
        const hasSharedOrganization = user.organizations && currentUser.organizations &&
          user.organizations.some(org => currentUser.organizations.includes(org));

        if (hasSharedOrganization || user.id === currentUser.id) {
          const score = calculateRelevanceScore(user, query, [
            { value: user.name, weight: 3 },
            { value: user.email, weight: 2 },
            { value: user.title, weight: 1.5 },
            { value: user.bio, weight: 1 },
            { value: user.userType, weight: 1 }
          ]);

          if (score > 0) {
            results.push({
              id: user.id,
              type: 'user',
              title: user.name,
              content: user.bio || `${user.userType} at organization`,
              snippet: `${user.title || user.userType} - ${user.email}`,
              avatar: user.avatar,
              email: user.email,
              title: user.title,
              userType: user.userType,
              location: user.location,
              createdAt: user.createdAt,
              score
            });
          }
        }
      });
    }

    // Sort by relevance score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + parseInt(limit));

    // Group results by type for better organization
    const groupedResults = paginatedResults.reduce((groups, result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
      return groups;
    }, {});

    res.json({
      success: true,
      query,
      results: paginatedResults,
      groupedResults,
      total: results.length,
      hasMore: offset + parseInt(limit) < results.length,
      searchStats: {
        messages: results.filter(r => r.type === 'message').length,
        conversations: results.filter(r => r.type === 'conversation').length,
        projects: results.filter(r => r.type === 'project').length,
        files: results.filter(r => r.type === 'file').length,
        users: results.filter(r => r.type === 'user').length
      }
    });

  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// Search suggestions/autocomplete
app.get('/api/search/suggestions', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 1) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = [];
    const queryLower = query.toLowerCase();

    // Suggest conversation names
    conversations.forEach(conversation => {
      if (conversation.participants.includes(currentUser.id) &&
          conversation.name.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: conversation.name,
          type: 'conversation',
          category: 'Conversations'
        });
      }
    });

    // Suggest project names
    Array.from(mockProjects.values()).forEach(project => {
      if (project.members && project.members.includes(currentUser.id) &&
          project.name.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: project.name,
          type: 'project',
          category: 'Projects'
        });
      }
    });

    // Suggest user names
    Object.values(mockUsers).forEach(user => {
      const hasSharedOrganization = user.organizations && currentUser.organizations &&
        user.organizations.some(org => currentUser.organizations.includes(org));

      if ((hasSharedOrganization || user.id === currentUser.id) &&
          user.name.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: user.name,
          type: 'user',
          category: 'People'
        });
      }
    });

    // Suggest file names
    Array.from(mockFiles.values()).forEach(file => {
      const hasAccess = file.uploadedBy === currentUser.id ||
        (file.projectId && Array.from(mockProjects.values()).some(p =>
          p.id === file.projectId && p.members && p.members.includes(currentUser.id)
        ));

      if (hasAccess && file.originalName.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: file.originalName,
          type: 'file',
          category: 'Files'
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) =>
        index === self.findIndex(s => s.text === suggestion.text)
      )
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      suggestions: uniqueSuggestions
    });

  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
});

// Recent searches tracking
let userSearchHistory = new Map(); // userId -> array of recent searches

// Save search query to history
app.post('/api/search/history', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { query } = req.body;

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Get or create user search history
    const userHistory = userSearchHistory.get(currentUser.id) || [];

    // Add new search (avoid duplicates)
    const existingIndex = userHistory.findIndex(item => item.query === query);
    if (existingIndex !== -1) {
      userHistory.splice(existingIndex, 1);
    }

    userHistory.unshift({
      query,
      timestamp: new Date().toISOString()
    });

    // Keep only last 20 searches
    if (userHistory.length > 20) {
      userHistory.splice(20);
    }

    userSearchHistory.set(currentUser.id, userHistory);

    res.json({
      success: true,
      message: 'Search saved to history'
    });

  } catch (error) {
    console.error('Error saving search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save search'
    });
  }
});

// Get user's search history
app.get('/api/search/history', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { limit = 10 } = req.query;
    const userHistory = userSearchHistory.get(currentUser.id) || [];

    res.json({
      success: true,
      history: userHistory.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search history'
    });
  }
});

// ======================
// PAYMENT/SUBSCRIPTION SYSTEM
// ======================

// Subscription plans configuration
const subscriptionPlans = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: {
      projects: 3,
      teamMembers: 3,
      storage: '1GB',
      fileUploadSize: '10MB',
      searchHistory: 10,
      support: 'community'
    },
    limits: {
      maxProjects: 3,
      maxTeamMembers: 3,
      maxStorageBytes: 1 * 1024 * 1024 * 1024, // 1GB
      maxFileUploadBytes: 10 * 1024 * 1024, // 10MB
      maxSearchHistory: 10
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    billingCycle: 'monthly',
    features: {
      projects: 25,
      teamMembers: 15,
      storage: '50GB',
      fileUploadSize: '100MB',
      searchHistory: 100,
      support: 'email'
    },
    limits: {
      maxProjects: 25,
      maxTeamMembers: 15,
      maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
      maxFileUploadBytes: 100 * 1024 * 1024, // 100MB
      maxSearchHistory: 100
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    billingCycle: 'monthly',
    features: {
      projects: 'unlimited',
      teamMembers: 'unlimited',
      storage: '500GB',
      fileUploadSize: '1GB',
      searchHistory: 'unlimited',
      support: 'priority'
    },
    limits: {
      maxProjects: Infinity,
      maxTeamMembers: Infinity,
      maxStorageBytes: 500 * 1024 * 1024 * 1024, // 500GB
      maxFileUploadBytes: 1024 * 1024 * 1024, // 1GB
      maxSearchHistory: Infinity
    }
  }
};

// In-memory storage for billing data
let subscriptions = new Map(); // userId -> subscription data
let billingHistory = new Map(); // userId -> array of billing records
let paymentMethods = new Map(); // userId -> array of payment methods

// Initialize sample subscription data
const initializeBilling = () => {
  // Kentino has Pro subscription
  subscriptions.set('kentino', {
    id: 'sub-kentino-pro',
    userId: 'kentino',
    planId: 'pro',
    status: 'active',
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Client has Free subscription
  subscriptions.set('client-1', {
    id: 'sub-client1-free',
    userId: 'client-1',
    planId: 'free',
    status: 'active',
    currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Sample billing history for Kentino
  billingHistory.set('kentino', [
    {
      id: 'inv-kentino-001',
      subscriptionId: 'sub-kentino-pro',
      amount: 29.00,
      currency: 'USD',
      status: 'paid',
      description: 'Pro Plan - Monthly',
      periodStart: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv-kentino-002',
      subscriptionId: 'sub-kentino-pro',
      amount: 29.00,
      currency: 'USD',
      status: 'paid',
      description: 'Pro Plan - Monthly',
      periodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);

  // Sample payment method for Kentino
  paymentMethods.set('kentino', [
    {
      id: 'pm-kentino-001',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
};

initializeBilling();

// Helper function to check subscription limits
function checkSubscriptionLimit(userId, limitType, currentUsage) {
  const subscription = subscriptions.get(userId);
  if (!subscription) return false;

  const plan = subscriptionPlans[subscription.planId];
  if (!plan) return false;

  const limit = plan.limits[limitType];
  return currentUsage < limit;
}

// Get subscription plans
app.get('/api/billing/plans', (req, res) => {
  try {
    res.json({
      success: true,
      plans: Object.values(subscriptionPlans)
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
});

// Get user's current subscription
app.get('/api/billing/subscription', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const subscription = subscriptions.get(currentUser.id);

    if (!subscription) {
      // Create free subscription if none exists
      const freeSubscription = {
        id: `sub-${currentUser.id}-free`,
        userId: currentUser.id,
        planId: 'free',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      subscriptions.set(currentUser.id, freeSubscription);
    }

    const userSubscription = subscriptions.get(currentUser.id);
    const plan = subscriptionPlans[userSubscription.planId];

    res.json({
      success: true,
      subscription: {
        ...userSubscription,
        plan
      }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription'
    });
  }
});

// Update subscription plan
app.post('/api/billing/subscription/change', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { planId } = req.body;

    if (!subscriptionPlans[planId]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan ID'
      });
    }

    let subscription = subscriptions.get(currentUser.id);

    if (!subscription) {
      // Create new subscription
      subscription = {
        id: `sub-${currentUser.id}-${planId}`,
        userId: currentUser.id,
        planId,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Update existing subscription
      subscription.planId = planId;
      subscription.updatedAt = new Date().toISOString();

      // If upgrading/downgrading, reset period
      if (planId !== 'free') {
        subscription.currentPeriodStart = new Date().toISOString();
        subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    subscriptions.set(currentUser.id, subscription);

    // Create billing record if not free plan
    if (planId !== 'free') {
      const plan = subscriptionPlans[planId];
      const invoice = {
        id: `inv-${currentUser.id}-${Date.now()}`,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: 'USD',
        status: 'paid', // Simulated payment
        description: `${plan.name} Plan - Monthly`,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const userBilling = billingHistory.get(currentUser.id) || [];
      userBilling.unshift(invoice);
      billingHistory.set(currentUser.id, userBilling);
    }

    const plan = subscriptionPlans[planId];

    res.json({
      success: true,
      subscription: {
        ...subscription,
        plan
      },
      message: `Successfully ${subscription.planId === planId ? 'updated' : 'changed'} to ${plan.name} plan`
    });

  } catch (error) {
    console.error('Error changing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change subscription'
    });
  }
});

// Cancel subscription
app.post('/api/billing/subscription/cancel', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const subscription = subscriptions.get(currentUser.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    if (subscription.planId === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel free plan'
      });
    }

    // Mark for cancellation at period end
    subscription.cancelAtPeriodEnd = true;
    subscription.updatedAt = new Date().toISOString();
    subscriptions.set(currentUser.id, subscription);

    res.json({
      success: true,
      subscription,
      message: 'Subscription will be cancelled at the end of the current billing period'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

// Reactivate cancelled subscription
app.post('/api/billing/subscription/reactivate', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const subscription = subscriptions.get(currentUser.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not cancelled'
      });
    }

    // Reactivate subscription
    subscription.cancelAtPeriodEnd = false;
    subscription.updatedAt = new Date().toISOString();
    subscriptions.set(currentUser.id, subscription);

    res.json({
      success: true,
      subscription,
      message: 'Subscription reactivated successfully'
    });

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate subscription'
    });
  }
});

// Get billing history
app.get('/api/billing/history', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { limit = 20, offset = 0 } = req.query;
    const userBilling = billingHistory.get(currentUser.id) || [];

    const paginatedBilling = userBilling.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      billing: paginatedBilling,
      total: userBilling.length,
      hasMore: offset + parseInt(limit) < userBilling.length
    });

  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing history'
    });
  }
});

// Get payment methods
app.get('/api/billing/payment-methods', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const userPaymentMethods = paymentMethods.get(currentUser.id) || [];

    res.json({
      success: true,
      paymentMethods: userPaymentMethods
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
});

// Add payment method (simulated)
app.post('/api/billing/payment-methods', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { cardNumber, expiryMonth, expiryYear, cvc } = req.body;

    // Basic validation (in production, use a real payment processor)
    if (!cardNumber || !expiryMonth || !expiryYear || !cvc) {
      return res.status(400).json({
        success: false,
        message: 'All card details are required'
      });
    }

    // Simulate card processing
    const last4 = cardNumber.slice(-4);
    let brand = 'unknown';
    if (cardNumber.startsWith('4')) brand = 'visa';
    else if (cardNumber.startsWith('5')) brand = 'mastercard';
    else if (cardNumber.startsWith('3')) brand = 'amex';

    const userPaymentMethods = paymentMethods.get(currentUser.id) || [];

    // Set all existing cards as non-default
    userPaymentMethods.forEach(pm => pm.isDefault = false);

    const newPaymentMethod = {
      id: `pm-${currentUser.id}-${Date.now()}`,
      type: 'card',
      last4,
      brand,
      expiryMonth: parseInt(expiryMonth),
      expiryYear: parseInt(expiryYear),
      isDefault: true,
      createdAt: new Date().toISOString()
    };

    userPaymentMethods.push(newPaymentMethod);
    paymentMethods.set(currentUser.id, userPaymentMethods);

    res.json({
      success: true,
      paymentMethod: newPaymentMethod,
      message: 'Payment method added successfully'
    });

  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment method'
    });
  }
});

// Delete payment method
app.delete('/api/billing/payment-methods/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id } = req.params;
    const userPaymentMethods = paymentMethods.get(currentUser.id) || [];

    const methodIndex = userPaymentMethods.findIndex(pm => pm.id === id);
    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    userPaymentMethods.splice(methodIndex, 1);
    paymentMethods.set(currentUser.id, userPaymentMethods);

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method'
    });
  }
});

// Get usage statistics for current subscription period
app.get('/api/billing/usage', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const subscription = subscriptions.get(currentUser.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    const plan = subscriptionPlans[subscription.planId];

    // Calculate current usage
    const userProjects = Array.from(mockProjects.values()).filter(project =>
      project.members && project.members.includes(currentUser.id)
    );

    const userFiles = Array.from(mockFiles.values()).filter(file =>
      file.uploadedBy === currentUser.id
    );

    const totalStorageUsed = userFiles.reduce((total, file) => total + file.size, 0);

    const userSearchHistory = userSearchHistory.get(currentUser.id) || [];

    // Calculate team members (unique users in user's projects)
    const teamMembers = new Set();
    userProjects.forEach(project => {
      if (project.members) {
        project.members.forEach(memberId => {
          if (memberId !== currentUser.id) {
            teamMembers.add(memberId);
          }
        });
      }
    });

    const usage = {
      projects: {
        used: userProjects.length,
        limit: plan.limits.maxProjects,
        percentage: plan.limits.maxProjects === Infinity ? 0 :
          Math.round((userProjects.length / plan.limits.maxProjects) * 100)
      },
      teamMembers: {
        used: teamMembers.size,
        limit: plan.limits.maxTeamMembers,
        percentage: plan.limits.maxTeamMembers === Infinity ? 0 :
          Math.round((teamMembers.size / plan.limits.maxTeamMembers) * 100)
      },
      storage: {
        used: totalStorageUsed,
        limit: plan.limits.maxStorageBytes,
        percentage: Math.round((totalStorageUsed / plan.limits.maxStorageBytes) * 100),
        usedFormatted: (totalStorageUsed / (1024 * 1024)).toFixed(1) + ' MB',
        limitFormatted: plan.features.storage
      },
      searchHistory: {
        used: userSearchHistory.length,
        limit: plan.limits.maxSearchHistory,
        percentage: plan.limits.maxSearchHistory === Infinity ? 0 :
          Math.round((userSearchHistory.length / plan.limits.maxSearchHistory) * 100)
      }
    };

    res.json({
      success: true,
      subscription: {
        ...subscription,
        plan
      },
      usage
    });

  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage'
    });
  }
});

// ======================
// ANALYTICS DASHBOARD
// ======================

// Helper function to generate date range for analytics
function generateDateRange(days = 30) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper function to aggregate data by date
function aggregateByDate(items, dateField, days = 30) {
  const dateRange = generateDateRange(days);
  const aggregated = {};

  // Initialize all dates with 0
  dateRange.forEach(date => {
    aggregated[date] = 0;
  });

  // Count items by date
  items.forEach(item => {
    const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
    if (aggregated.hasOwnProperty(itemDate)) {
      aggregated[itemDate]++;
    }
  });

  return dateRange.map(date => ({
    date,
    count: aggregated[date]
  }));
}

// Get comprehensive analytics overview
app.get('/api/analytics/overview', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { timeRange = 30 } = req.query;
    const days = parseInt(timeRange);

    // User's accessible projects
    const userProjects = Array.from(mockProjects.values()).filter(project =>
      project.members && project.members.includes(currentUser.id)
    );

    // User's messages
    const userMessages = messages.filter(msg => msg.authorId === currentUser.id);

    // User's files
    const userFiles = Array.from(mockFiles.values()).filter(file =>
      file.uploadedBy === currentUser.id
    );

    // User's notifications
    const userNotifications = notifications.filter(notif => notif.userId === currentUser.id);

    // Calculate key metrics
    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter(p => p.status === 'active' || p.status === 'in-progress').length;
    const completedProjects = userProjects.filter(p => p.status === 'completed').length;
    const totalMessages = userMessages.length;
    const totalFiles = userFiles.length;
    const totalStorage = userFiles.reduce((sum, file) => sum + file.size, 0);

    // Get recent activity
    const recentActivity = [];

    // Add recent messages
    userMessages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach(msg => {
        const conversation = conversations.find(c => c.id === msg.conversationId);
        recentActivity.push({
          id: `msg-${msg.id}`,
          type: 'message',
          title: 'Sent a message',
          description: `in ${conversation?.name || 'conversation'}`,
          timestamp: msg.createdAt,
          metadata: {
            conversationId: msg.conversationId,
            messageContent: msg.content.substring(0, 50) + '...'
          }
        });
      });

    // Add recent file uploads
    userFiles
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 3)
      .forEach(file => {
        recentActivity.push({
          id: `file-${file.id}`,
          type: 'file_upload',
          title: 'Uploaded a file',
          description: file.originalName,
          timestamp: file.uploadedAt,
          metadata: {
            fileId: file.id,
            fileType: file.type,
            fileSize: file.size
          }
        });
      });

    // Sort all activity by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Generate charts data
    const messagesTrend = aggregateByDate(userMessages, 'createdAt', days);
    const filesTrend = aggregateByDate(userFiles, 'uploadedAt', days);

    // Project status distribution
    const projectsByStatus = userProjects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {});

    // File type distribution
    const filesByType = userFiles.reduce((acc, file) => {
      const category = file.isImage ? 'Images' :
                     file.isVideo ? 'Videos' :
                     file.type.includes('pdf') ? 'Documents' :
                     file.type.includes('audio') ? 'Audio' : 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Team collaboration metrics
    const collaborators = new Set();
    userProjects.forEach(project => {
      if (project.members) {
        project.members.forEach(memberId => {
          if (memberId !== currentUser.id) {
            collaborators.add(memberId);
          }
        });
      }
    });

    res.json({
      success: true,
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalMessages,
        totalFiles,
        totalStorage,
        totalCollaborators: collaborators.size,
        completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0
      },
      trends: {
        messages: messagesTrend,
        files: filesTrend
      },
      distributions: {
        projectsByStatus,
        filesByType
      },
      recentActivity: recentActivity.slice(0, 10),
      timeRange: days
    });

  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// Get project analytics
app.get('/api/analytics/projects', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { projectId, timeRange = 30 } = req.query;
    const days = parseInt(timeRange);

    let targetProjects;
    if (projectId) {
      const project = mockProjects.get(projectId);
      if (!project || !project.members || !project.members.includes(currentUser.id)) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
      }
      targetProjects = [project];
    } else {
      targetProjects = Array.from(mockProjects.values()).filter(project =>
        project.members && project.members.includes(currentUser.id)
      );
    }

    const analytics = targetProjects.map(project => {
      // Project messages
      const projectMessages = messages.filter(msg =>
        conversations.some(conv => conv.id === msg.conversationId && conv.participants.includes(currentUser.id))
      );

      // Project files
      const projectFiles = Array.from(mockFiles.values()).filter(file =>
        file.projectId === project.id
      );

      // Team activity
      const teamActivity = project.members ? project.members.map(memberId => {
        const member = mockUsers[memberId];
        const memberMessages = projectMessages.filter(msg => msg.authorId === memberId);
        const memberFiles = projectFiles.filter(file => file.uploadedBy === memberId);

        return {
          userId: memberId,
          name: member?.name || 'Unknown',
          avatar: member?.avatar,
          messagesCount: memberMessages.length,
          filesCount: memberFiles.length,
          lastActivity: Math.max(
            memberMessages.length > 0 ? new Date(memberMessages[memberMessages.length - 1].createdAt) : 0,
            memberFiles.length > 0 ? new Date(memberFiles[memberFiles.length - 1].uploadedAt) : 0
          )
        };
      }) : [];

      // Project timeline
      const timeline = [];
      projectMessages.forEach(msg => {
        timeline.push({
          type: 'message',
          timestamp: msg.createdAt,
          author: mockUsers[msg.authorId]?.name || 'Unknown',
          content: msg.content.substring(0, 100)
        });
      });
      projectFiles.forEach(file => {
        timeline.push({
          type: 'file',
          timestamp: file.uploadedAt,
          author: mockUsers[file.uploadedBy]?.name || 'Unknown',
          content: `Uploaded ${file.originalName}`
        });
      });
      timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        members: project.members ? project.members.length : 0,
        messagesCount: projectMessages.length,
        filesCount: projectFiles.length,
        storageUsed: projectFiles.reduce((sum, file) => sum + file.size, 0),
        teamActivity: teamActivity.slice(0, 10),
        recentTimeline: timeline.slice(0, 20),
        createdAt: project.createdAt,
        dueDate: project.dueDate
      };
    });

    res.json({
      success: true,
      projects: analytics,
      timeRange: days
    });

  } catch (error) {
    console.error('Error fetching project analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project analytics'
    });
  }
});

// Get team analytics
app.get('/api/analytics/team', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { timeRange = 30 } = req.query;
    const days = parseInt(timeRange);

    // Get all team members from user's projects
    const teamMembers = new Set();
    const userProjects = Array.from(mockProjects.values()).filter(project =>
      project.members && project.members.includes(currentUser.id)
    );

    userProjects.forEach(project => {
      if (project.members) {
        project.members.forEach(memberId => teamMembers.add(memberId));
      }
    });

    // Analyze each team member
    const teamAnalytics = Array.from(teamMembers).map(memberId => {
      const member = mockUsers[memberId];
      if (!member) return null;

      const memberMessages = messages.filter(msg => msg.authorId === memberId);
      const memberFiles = Array.from(mockFiles.values()).filter(file => file.uploadedBy === memberId);
      const memberProjects = userProjects.filter(project =>
        project.members && project.members.includes(memberId)
      );

      // Calculate recent activity (last 7 days)
      const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentMessages = memberMessages.filter(msg =>
        new Date(msg.createdAt) > recentThreshold
      );
      const recentFiles = memberFiles.filter(file =>
        new Date(file.uploadedAt) > recentThreshold
      );

      return {
        userId: memberId,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        userType: member.userType,
        totalMessages: memberMessages.length,
        totalFiles: memberFiles.length,
        totalProjects: memberProjects.length,
        recentMessages: recentMessages.length,
        recentFiles: recentFiles.length,
        storageUsed: memberFiles.reduce((sum, file) => sum + file.size, 0),
        lastActivity: Math.max(
          memberMessages.length > 0 ? new Date(memberMessages[memberMessages.length - 1].createdAt) : 0,
          memberFiles.length > 0 ? new Date(memberFiles[memberFiles.length - 1].uploadedAt) : 0
        ),
        joinedDate: member.createdAt
      };
    }).filter(Boolean);

    // Sort by recent activity
    teamAnalytics.sort((a, b) => b.lastActivity - a.lastActivity);

    // Team summary statistics
    const teamSummary = {
      totalMembers: teamMembers.size,
      activeMembers: teamAnalytics.filter(member =>
        member.lastActivity > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      totalMessages: teamAnalytics.reduce((sum, member) => sum + member.totalMessages, 0),
      totalFiles: teamAnalytics.reduce((sum, member) => sum + member.totalFiles, 0),
      totalStorage: teamAnalytics.reduce((sum, member) => sum + member.storageUsed, 0)
    };

    // Collaboration network (who works with whom)
    const collaborationMatrix = {};
    userProjects.forEach(project => {
      if (project.members && project.members.length > 1) {
        project.members.forEach(member1 => {
          project.members.forEach(member2 => {
            if (member1 !== member2) {
              const key = `${member1}-${member2}`;
              collaborationMatrix[key] = (collaborationMatrix[key] || 0) + 1;
            }
          });
        });
      }
    });

    res.json({
      success: true,
      teamSummary,
      members: teamAnalytics,
      collaborationMatrix,
      timeRange: days
    });

  } catch (error) {
    console.error('Error fetching team analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team analytics'
    });
  }
});

// Get performance metrics
app.get('/api/analytics/performance', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { timeRange = 30 } = req.query;
    const days = parseInt(timeRange);

    // Calculate various performance metrics
    const userProjects = Array.from(mockProjects.values()).filter(project =>
      project.members && project.members.includes(currentUser.id)
    );

    const userMessages = messages.filter(msg => msg.authorId === currentUser.id);
    const userFiles = Array.from(mockFiles.values()).filter(file => file.uploadedBy === currentUser.id);

    // Productivity metrics
    const productivity = {
      messagesPerDay: userMessages.length / days,
      filesPerDay: userFiles.length / days,
      projectsPerMonth: (userProjects.length / days) * 30,
      avgResponseTime: '2.3 hours', // Simulated
      workingDays: Math.min(days, 20) // Simulate working days
    };

    // Quality metrics
    const quality = {
      projectCompletionRate: userProjects.length > 0 ?
        (userProjects.filter(p => p.status === 'completed').length / userProjects.length) * 100 : 0,
      fileReusageRate: 75, // Simulated
      clientSatisfactionScore: 4.2, // Simulated
      collaborationScore: 85 // Simulated
    };

    // Efficiency trends
    const efficiencyTrend = generateDateRange(days).map(date => ({
      date,
      productivity: Math.random() * 100, // Simulated
      quality: Math.random() * 100, // Simulated
      collaboration: Math.random() * 100 // Simulated
    }));

    // Goal tracking
    const goals = [
      {
        id: 'messages',
        name: 'Daily Messages',
        target: 10,
        current: productivity.messagesPerDay,
        progress: Math.min((productivity.messagesPerDay / 10) * 100, 100)
      },
      {
        id: 'projects',
        name: 'Monthly Projects',
        target: 5,
        current: productivity.projectsPerMonth,
        progress: Math.min((productivity.projectsPerMonth / 5) * 100, 100)
      },
      {
        id: 'completion',
        name: 'Completion Rate',
        target: 90,
        current: quality.projectCompletionRate,
        progress: Math.min((quality.projectCompletionRate / 90) * 100, 100)
      }
    ];

    res.json({
      success: true,
      productivity,
      quality,
      efficiencyTrend,
      goals,
      timeRange: days,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics'
    });
  }
});

// Get real-time statistics
app.get('/api/analytics/realtime', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    // Real-time metrics for the current session
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Recent activity counts
    const recentMessages = messages.filter(msg =>
      msg.authorId === currentUser.id && new Date(msg.createdAt) > oneHourAgo
    ).length;

    const recentFiles = Array.from(mockFiles.values()).filter(file =>
      file.uploadedBy === currentUser.id && new Date(file.uploadedAt) > oneHourAgo
    ).length;

    // Online users count
    const onlineUsersCount = onlineUsers.size;

    // Active conversations
    const activeConversations = conversations.filter(conv =>
      conv.participants.includes(currentUser.id) &&
      new Date(conv.lastActivity) > oneDayAgo
    ).length;

    // System-wide statistics for context
    const systemStats = {
      totalUsers: Object.keys(mockUsers).length,
      totalProjects: mockProjects.size,
      totalMessages: messages.length,
      totalFiles: mockFiles.size,
      onlineUsers: onlineUsersCount
    };

    // Generate minute-by-minute activity for the last hour
    const minutelyActivity = [];
    for (let i = 59; i >= 0; i--) {
      const minute = new Date(now.getTime() - i * 60 * 1000);
      const minuteMessages = messages.filter(msg =>
        Math.abs(new Date(msg.createdAt) - minute) < 30000 // Within 30 seconds
      ).length;

      minutelyActivity.push({
        timestamp: minute.toISOString(),
        messages: minuteMessages,
        files: Math.floor(Math.random() * 3), // Simulated
        users: Math.floor(Math.random() * 5) + onlineUsersCount
      });
    }

    res.json({
      success: true,
      realtime: {
        recentMessages,
        recentFiles,
        activeConversations,
        onlineUsers: onlineUsersCount,
        lastUpdated: now.toISOString()
      },
      systemStats,
      minutelyActivity,
      alerts: [
        // Simulated alerts
        ...(recentMessages > 10 ? [{
          type: 'high_activity',
          message: 'High messaging activity detected',
          severity: 'info'
        }] : []),
        ...(onlineUsersCount > 5 ? [{
          type: 'peak_usage',
          message: 'Peak usage period',
          severity: 'warning'
        }] : [])
      ]
    });

  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time analytics'
    });
  }
});

// Export analytics data
app.get('/api/analytics/export', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { format = 'json', type = 'overview', timeRange = 30 } = req.query;

    // Gather data based on type
    let exportData = {};

    if (type === 'overview' || type === 'all') {
      const userProjects = Array.from(mockProjects.values()).filter(project =>
        project.members && project.members.includes(currentUser.id)
      );
      const userMessages = messages.filter(msg => msg.authorId === currentUser.id);
      const userFiles = Array.from(mockFiles.values()).filter(file => file.uploadedBy === currentUser.id);

      exportData.overview = {
        totalProjects: userProjects.length,
        totalMessages: userMessages.length,
        totalFiles: userFiles.length,
        exportedAt: new Date().toISOString(),
        timeRange: parseInt(timeRange),
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email
        }
      };
    }

    if (type === 'projects' || type === 'all') {
      exportData.projects = Array.from(mockProjects.values())
        .filter(project => project.members && project.members.includes(currentUser.id))
        .map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          members: project.members,
          createdAt: project.createdAt,
          dueDate: project.dueDate
        }));
    }

    if (type === 'messages' || type === 'all') {
      exportData.messages = messages
        .filter(msg => msg.authorId === currentUser.id)
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
          type: msg.type
        }));
    }

    if (format === 'csv') {
      // Convert to CSV format
      let csvContent = '';
      if (exportData.overview) {
        csvContent += 'Overview\n';
        csvContent += `Total Projects,${exportData.overview.totalProjects}\n`;
        csvContent += `Total Messages,${exportData.overview.totalMessages}\n`;
        csvContent += `Total Files,${exportData.overview.totalFiles}\n\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data: exportData,
        metadata: {
          exportType: type,
          format,
          exportedAt: new Date().toISOString(),
          exportedBy: currentUser.id
        }
      });
    }

  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics'
    });
  }
});

// ======================
// TEAMS MANAGEMENT API
// ======================

// Using existing mockTeams storage from line 1050

// Initialize sample teams
const initializeTeams = () => {
  mockTeams.set('team-1', {
    id: 'team-1',
    name: 'Design Team',
    description: 'Creative design and visual concepts team',
    organizationId: 'org-1',
    members: ['kentino', 'client-1'],
    roles: {
      'kentino': 'admin',
      'client-1': 'member'
    },
    settings: {
      visibility: 'organization',
      allowMemberInvites: true,
      requireApprovalForJoining: false
    },
    createdBy: 'kentino',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  });

  mockTeams.set('team-2', {
    id: 'team-2',
    name: 'Project Coordination',
    description: 'Project management and client coordination',
    organizationId: 'org-1',
    members: ['kentino'],
    roles: {
      'kentino': 'admin'
    },
    settings: {
      visibility: 'private',
      allowMemberInvites: false,
      requireApprovalForJoining: true
    },
    createdBy: 'kentino',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  });
};

initializeTeams();

// Get all teams for user
app.get('/api/teams', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    // Get teams where user is a member
    const userTeams = Array.from(mockTeams.values()).filter(team =>
      team.members && team.members.includes(currentUser.id)
    );

    // Add member details to each team
    const teamsWithDetails = userTeams.map(team => ({
      ...team,
      memberCount: team.members ? team.members.length : 0,
      memberDetails: team.members ? team.members.map(memberId => ({
        id: memberId,
        name: mockUsers[memberId]?.name || 'Unknown',
        avatar: mockUsers[memberId]?.avatar,
        role: team.roles[memberId] || 'member'
      })) : [],
      userRole: team.roles[currentUser.id] || 'member'
    }));

    res.json({
      success: true,
      teams: teamsWithDetails
    });

  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams'
    });
  }
});

// Get specific team details
app.get('/api/teams/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id } = req.params;
    const team = mockTeams.get(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user has access to this team
    if (!team.members || !team.members.includes(currentUser.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get team statistics
    const teamProjects = Array.from(mockProjects.values()).filter(project =>
      project.teamId === team.id
    );

    const teamFiles = Array.from(mockFiles.values()).filter(file =>
      file.teamId === team.id
    );

    // Add detailed member information
    const memberDetails = team.members ? team.members.map(memberId => {
      const member = mockUsers[memberId];
      const memberMessages = messages.filter(msg => msg.authorId === memberId);
      const memberFiles = Array.from(mockFiles.values()).filter(file => file.uploadedBy === memberId);

      return {
        id: memberId,
        name: member?.name || 'Unknown',
        email: member?.email,
        avatar: member?.avatar,
        userType: member?.userType,
        role: team.roles[memberId] || 'member',
        joinedAt: member?.createdAt,
        stats: {
          messagesCount: memberMessages.length,
          filesCount: memberFiles.length,
          projectsCount: teamProjects.filter(p => p.members && p.members.includes(memberId)).length
        }
      };
    }) : [];

    const teamWithDetails = {
      ...team,
      memberCount: team.members ? team.members.length : 0,
      memberDetails,
      userRole: team.roles[currentUser.id] || 'member',
      statistics: {
        projectsCount: teamProjects.length,
        filesCount: teamFiles.length,
        totalStorage: teamFiles.reduce((sum, file) => sum + file.size, 0)
      }
    };

    res.json({
      success: true,
      team: teamWithDetails
    });

  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team details'
    });
  }
});

// Create new team
app.post('/api/teams', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { name, description, organizationId, visibility = 'organization' } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTeam = {
      id: teamId,
      name: name.trim(),
      description: description || '',
      organizationId: organizationId || currentUser.organizations[0],
      members: [currentUser.id],
      roles: {
        [currentUser.id]: 'admin'
      },
      settings: {
        visibility,
        allowMemberInvites: true,
        requireApprovalForJoining: false
      },
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockTeams.set(teamId, newTeam);

    // Create notification for team creation
    createNotification('team_created', currentUser.id, {
      teamId,
      teamName: name,
      priority: 'medium'
    });

    res.json({
      success: true,
      team: {
        ...newTeam,
        memberCount: 1,
        memberDetails: [{
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          role: 'admin'
        }],
        userRole: 'admin'
      },
      message: 'Team created successfully'
    });

  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team'
    });
  }
});

// Update team
app.put('/api/teams/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id } = req.params;
    const team = mockTeams.get(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is admin
    const userRole = team.roles[currentUser.id];
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { name, description, settings } = req.body;

    // Update team
    if (name !== undefined) team.name = name.trim();
    if (description !== undefined) team.description = description;
    if (settings !== undefined) {
      team.settings = { ...team.settings, ...settings };
    }
    team.updatedAt = new Date().toISOString();

    mockTeams.set(id, team);

    res.json({
      success: true,
      team,
      message: 'Team updated successfully'
    });

  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team'
    });
  }
});

// Add member to team
app.post('/api/teams/:id/members', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;

    const team = mockTeams.get(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions
    const userRole = team.roles[currentUser.id];
    if (userRole !== 'admin' && !team.settings.allowMemberInvites) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Check if user exists
    if (!mockUsers[userId]) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    if (team.members && team.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member'
      });
    }

    // Add member
    if (!team.members) team.members = [];
    team.members.push(userId);
    team.roles[userId] = role;
    team.updatedAt = new Date().toISOString();

    mockTeams.set(id, team);

    // Create notification for new member
    createNotification('team_invitation', userId, {
      teamId: id,
      teamName: team.name,
      invitedBy: currentUser.name,
      priority: 'medium'
    });

    res.json({
      success: true,
      message: 'Member added successfully'
    });

  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member'
    });
  }
});

// Remove member from team
app.delete('/api/teams/:id/members/:userId', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id, userId } = req.params;
    const team = mockTeams.get(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions (admin or self-removal)
    const userRole = team.roles[currentUser.id];
    if (userRole !== 'admin' && currentUser.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Don't allow removing the last admin
    const adminCount = Object.values(team.roles).filter(role => role === 'admin').length;
    if (team.roles[userId] === 'admin' && adminCount === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last admin'
      });
    }

    // Remove member
    if (team.members) {
      team.members = team.members.filter(memberId => memberId !== userId);
    }
    delete team.roles[userId];
    team.updatedAt = new Date().toISOString();

    mockTeams.set(id, team);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member'
    });
  }
});

// Delete team
app.delete('/api/teams/:id', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const { id } = req.params;
    const team = mockTeams.get(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is admin
    const userRole = team.roles[currentUser.id];
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Remove team
    mockTeams.delete(id);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team'
    });
  }
});

// Messages endpoints
app.get('/api/messages/conversations', (req, res) => {
  const conversations = [
    {
      id: 'conv-1',
      name: 'Fall 2024 Project Discussion',
      type: 'project',
      participants: [mockUsers['kentino'], mockUsers['client-1']],
      lastMessage: {
        id: 'msg-1',
        content: 'The latest uniform concepts look fantastic!',
        author: mockUsers['client-1'],
        createdAt: new Date().toISOString()
      },
      unreadCount: 2,
      lastActivity: new Date().toISOString()
    }
  ];
  res.json(conversations);
});

app.get('/api/messages/conversations/:id/messages', (req, res) => {
  const messages = [
    {
      id: 'msg-1',
      conversationId: req.params.id,
      content: 'Hello! I\'ve uploaded the latest uniform concepts for your review.',
      author: mockUsers['kentino'],
      type: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2',
      conversationId: req.params.id,
      content: 'The latest uniform concepts look fantastic! I love the new color scheme.',
      author: mockUsers['client-1'],
      type: 'text',
      status: 'delivered',
      createdAt: new Date().toISOString()
    }
  ];
  res.json(messages);
});

// Notifications endpoints
app.get('/api/notifications', (req, res) => {
  const notifications = [
    {
      id: 'notif-1',
      type: 'approval_request',
      priority: 'high',
      title: 'Design Approval Required',
      message: 'Fall 2024 uniform designs need your approval',
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-2',
      type: 'message',
      priority: 'medium',
      title: 'New Message from Director Johnson',
      message: 'I\'ve reviewed the latest concepts...',
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ];
  res.json(notifications);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve React app for all non-API routes
app.use((req, res, next) => {
  // If it's an API route, let it continue to 404
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // For all other routes, serve the React app
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Real-time messaging and presence tracking
const connectedUsers = new Map(); // Map of userId to socketId
const activeConversations = new Map(); // Map of conversationId to Set of userIds
const typingIndicators = new Map(); // Map of conversationId to Map of userId to timestamp

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User authentication and presence
  socket.on('user:join', (userData) => {
    const { userId, name, userType } = userData;

    // Store user connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      userId,
      name,
      userType,
      connectedAt: new Date(),
      isOnline: true,
      lastSeen: new Date()
    });

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Broadcast user online status
    socket.broadcast.emit('user:online', {
      userId,
      name,
      userType,
      isOnline: true,
      lastSeen: new Date()
    });

    console.log(`User ${name} (${userId}) joined`);
  });

  // Join conversation rooms
  socket.on('conversation:join', (conversationId, userId) => {
    socket.join(`conversation:${conversationId}`);

    // Track active participants
    if (!activeConversations.has(conversationId)) {
      activeConversations.set(conversationId, new Set());
    }
    activeConversations.get(conversationId).add(userId);

    // Notify others in conversation
    socket.to(`conversation:${conversationId}`).emit('user:joined-conversation', {
      conversationId,
      userId,
      timestamp: new Date()
    });
  });

  // Leave conversation rooms
  socket.on('conversation:leave', (conversationId, userId) => {
    socket.leave(`conversation:${conversationId}`);

    // Remove from active participants
    if (activeConversations.has(conversationId)) {
      activeConversations.get(conversationId).delete(userId);
    }

    // Notify others in conversation
    socket.to(`conversation:${conversationId}`).emit('user:left-conversation', {
      conversationId,
      userId,
      timestamp: new Date()
    });
  });

  // Real-time message sending
  socket.on('message:send', (messageData) => {
    const {
      conversationId,
      content,
      type = 'text',
      priority = 'medium',
      author,
      attachments = [],
      mentions = [],
      replyTo
    } = messageData;

    // Create message object
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      content,
      type,
      priority,
      author,
      attachments,
      mentions,
      replyTo,
      status: 'sent',
      createdAt: new Date().toISOString(),
      editedAt: null,
      reactions: []
    };

    // Store message persistently
    messages.push(message);

    // Update conversation's last message and activity
    const conversationIndex = conversations.findIndex(c => c.id === conversationId);
    if (conversationIndex !== -1) {
      conversations[conversationIndex].lastMessage = message.content;
      conversations[conversationIndex].lastActivity = message.createdAt;
      conversations[conversationIndex].updatedAt = new Date().toISOString();
    }

    // Broadcast message to conversation participants
    io.to(`conversation:${conversationId}`).emit('message:received', message);

    // Send push notifications for mentions or high priority
    if (mentions.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      mentions.forEach(mentionedUserId => {
        createNotification('message_mention', mentionedUserId, {
          messageId: message.id,
          conversationId,
          conversationName: conversation?.name || 'Unknown conversation',
          mentionedBy: author,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          priority: priority === 'critical' || priority === 'high' ? 'high' : 'medium'
        });
      });
    }

    console.log(`Message sent in conversation ${conversationId} by ${author.name}`);
  });

  // Typing indicators
  socket.on('typing:start', (conversationId, userId) => {
    if (!typingIndicators.has(conversationId)) {
      typingIndicators.set(conversationId, new Map());
    }
    typingIndicators.get(conversationId).set(userId, Date.now());

    // Broadcast typing indicator to others in conversation
    socket.to(`conversation:${conversationId}`).emit('typing:started', {
      conversationId,
      userId,
      timestamp: new Date()
    });

    // Auto-clear typing after 3 seconds
    setTimeout(() => {
      if (typingIndicators.has(conversationId)) {
        typingIndicators.get(conversationId).delete(userId);
        socket.to(`conversation:${conversationId}`).emit('typing:stopped', {
          conversationId,
          userId,
          timestamp: new Date()
        });
      }
    }, 3000);
  });

  socket.on('typing:stop', (conversationId, userId) => {
    if (typingIndicators.has(conversationId)) {
      typingIndicators.get(conversationId).delete(userId);
    }

    socket.to(`conversation:${conversationId}`).emit('typing:stopped', {
      conversationId,
      userId,
      timestamp: new Date()
    });
  });

  // Message reactions
  socket.on('message:react', (messageId, conversationId, reaction, userId) => {
    const reactionData = {
      messageId,
      conversationId,
      reaction,
      userId,
      timestamp: new Date()
    };

    // Add reaction to the message persistently
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      // Check if user already reacted
      const existingReactionIndex = messages[messageIndex].reactions.findIndex(
        r => r.userId === userId && r.reaction === reaction
      );

      if (existingReactionIndex === -1) {
        // Add new reaction
        messages[messageIndex].reactions.push({
          reaction,
          userId,
          timestamp: new Date().toISOString()
        });
      } else {
        // Remove existing reaction (toggle)
        messages[messageIndex].reactions.splice(existingReactionIndex, 1);
      }
    }

    // Broadcast reaction to conversation participants
    io.to(`conversation:${conversationId}`).emit('message:reaction-added', reactionData);
  });

  // Message status updates (read receipts)
  socket.on('message:read', (messageId, conversationId, userId) => {
    socket.to(`conversation:${conversationId}`).emit('message:status-updated', {
      messageId,
      conversationId,
      status: 'read',
      readBy: userId,
      timestamp: new Date()
    });
  });

  // Message editing
  socket.on('message:edit', (messageId, conversationId, newContent, userId) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1 && messages[messageIndex].author === userId) {
      messages[messageIndex].content = newContent;
      messages[messageIndex].editedAt = new Date().toISOString();

      // Broadcast edited message to conversation participants
      io.to(`conversation:${conversationId}`).emit('message:edited', {
        messageId,
        conversationId,
        newContent,
        editedAt: messages[messageIndex].editedAt,
        editedBy: userId
      });
    }
  });

  // Message deletion
  socket.on('message:delete', (messageId, conversationId, userId) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1 && messages[messageIndex].author === userId) {
      messages.splice(messageIndex, 1);

      // Broadcast message deletion to conversation participants
      io.to(`conversation:${conversationId}`).emit('message:deleted', {
        messageId,
        conversationId,
        deletedBy: userId,
        timestamp: new Date().toISOString()
      });
    }
  });

  // User disconnection
  socket.on('disconnect', () => {
    // Find and remove user from connected users
    let disconnectedUser = null;
    for (const [userId, userData] of connectedUsers.entries()) {
      if (userData.socketId === socket.id) {
        disconnectedUser = { userId, ...userData };
        connectedUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUser) {
      // Update user's last seen and offline status
      const { userId, name } = disconnectedUser;

      // Broadcast user offline status
      socket.broadcast.emit('user:offline', {
        userId,
        name,
        isOnline: false,
        lastSeen: new Date()
      });

      // Remove from active conversations
      for (const [conversationId, participants] of activeConversations.entries()) {
        if (participants.has(userId)) {
          participants.delete(userId);
          socket.to(`conversation:${conversationId}`).emit('user:left-conversation', {
            conversationId,
            userId,
            timestamp: new Date()
          });
        }
      }

      console.log(`User ${name} (${userId}) disconnected`);
    }

    console.log('User disconnected:', socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Clean up stale typing indicators every 5 seconds
setInterval(() => {
  const now = Date.now();
  for (const [conversationId, userMap] of typingIndicators.entries()) {
    for (const [userId, timestamp] of userMap.entries()) {
      if (now - timestamp > 5000) { // 5 seconds timeout
        userMap.delete(userId);
        io.to(`conversation:${conversationId}`).emit('typing:stopped', {
          conversationId,
          userId,
          timestamp: new Date()
        });
      }
    }
  }
}, 5000);

// API endpoint to get online users
app.get('/api/users/online', (req, res) => {
  const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
    userId: user.userId,
    name: user.name,
    userType: user.userType,
    isOnline: true,
    lastSeen: user.lastSeen,
    connectedAt: user.connectedAt
  }));

  res.json(onlineUsers);
});

// API endpoint to get conversation participants
app.get('/api/conversations/:id/participants', (req, res) => {
  const conversationId = req.params.id;
  const participants = activeConversations.get(conversationId) || new Set();

  const participantData = Array.from(participants).map(userId => {
    const userData = connectedUsers.get(userId);
    return {
      userId,
      isOnline: !!userData,
      ...(userData && {
        name: userData.name,
        userType: userData.userType,
        connectedAt: userData.connectedAt
      })
    };
  });

  res.json(participantData);
});

// ========================================
// MESSAGING API ENDPOINTS
// ========================================

// Get conversations
app.get('/api/conversations', (req, res) => {
  const { type, priority, hasUnread, isArchived, isMuted, isPinned, projectId, participantId, tags } = req.query;

  let filteredConversations = [...conversations];

  // Apply filters
  if (type) filteredConversations = filteredConversations.filter(c => c.type === type);
  if (priority) filteredConversations = filteredConversations.filter(c => c.metadata.priority === priority);
  if (hasUnread === 'true') filteredConversations = filteredConversations.filter(c => c.unreadCount > 0);
  if (isArchived === 'true') filteredConversations = filteredConversations.filter(c => c.metadata.isArchived);
  if (isMuted === 'true') filteredConversations = filteredConversations.filter(c => c.metadata.isMuted);
  if (isPinned === 'true') filteredConversations = filteredConversations.filter(c => c.metadata.isPinned);
  if (projectId) filteredConversations = filteredConversations.filter(c => c.projectId === projectId);
  if (participantId) filteredConversations = filteredConversations.filter(c =>
    c.participants.some(p => p.id === participantId)
  );

  // Sort by last activity
  filteredConversations.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  res.json(filteredConversations);
});

// Get specific conversation
app.get('/api/conversations/:id', (req, res) => {
  const conversation = conversations.find(c => c.id === req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json(conversation);
});

// Create conversation
app.post('/api/conversations', (req, res) => {
  const { type, name, description, participants, projectId, metadata } = req.body;

  // Get current user from token
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const conversation = {
    id: `conv-${Date.now()}`,
    type,
    name,
    description,
    participants: participants.map(id => {
      const userData = Object.values(mockUsers).find(u => u.id === id);
      if (!userData) {
        throw new Error(`User not found: ${id}`);
      }
      return {
        id: userData.id,
        name: userData.name,
        userType: userData.userType,
        avatar: userData.avatar,
        isOnline: connectedUsers.has(userData.id),
      };
    }),
    projectId,
    organizationId: 'org-1',
    teamId: null,
    metadata: {
      isArchived: false,
      isMuted: false,
      isPinned: false,
      priority: 'medium',
      tags: [],
      ...metadata
    },
    lastActivity: new Date(),
    unreadCount: 0,
    permissions: {
      canWrite: true,
      canAddMembers: true,
      canArchive: true,
      canDelete: true
    },
    createdBy: currentUser,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  conversations.push(conversation);
  res.json(conversation);
});

// Update conversation
app.patch('/api/conversations/:id', (req, res) => {
  const conversationIndex = conversations.findIndex(c => c.id === req.params.id);
  if (conversationIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  conversations[conversationIndex] = {
    ...conversations[conversationIndex],
    ...req.body,
    updatedAt: new Date()
  };

  res.json(conversations[conversationIndex]);
});

// Add participants
app.post('/api/conversations/:id/participants', (req, res) => {
  const { userIds } = req.body;
  const conversationIndex = conversations.findIndex(c => c.id === req.params.id);

  if (conversationIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const newParticipants = userIds.map(id => {
    const userData = Object.values(mockUsers).find(u => u.id === id);
    if (!userData) {
      throw new Error(`User not found: ${id}`);
    }
    return {
      id: userData.id,
      name: userData.name,
      userType: userData.userType,
      avatar: userData.avatar,
      isOnline: connectedUsers.has(userData.id),
    };
  });

  conversations[conversationIndex].participants.push(...newParticipants);
  conversations[conversationIndex].updatedAt = new Date();

  res.json(conversations[conversationIndex]);
});

// Get messages for conversation
app.get('/api/conversations/:id/messages', (req, res) => {
  const { limit = 50, offset = 0, before } = req.query;
  const conversationId = req.params.id;

  let conversationMessages = messages.filter(m => m.conversationId === conversationId);

  if (before) {
    conversationMessages = conversationMessages.filter(m =>
      new Date(m.createdAt) < new Date(before)
    );
  }

  // Sort by creation date (newest first for pagination)
  conversationMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply pagination
  const paginatedMessages = conversationMessages.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  // Reverse for chronological order
  res.json(paginatedMessages.reverse());
});

// Send message
app.post('/api/messages', (req, res) => {
  const message = {
    id: `msg-${Date.now()}`,
    ...req.body,
    status: 'sent',
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  messages.push(message);

  // Update conversation's last message and activity
  const conversationIndex = conversations.findIndex(c => c.id === message.conversationId);
  if (conversationIndex !== -1) {
    conversations[conversationIndex].lastMessage = message;
    conversations[conversationIndex].lastActivity = message.createdAt;
    conversations[conversationIndex].updatedAt = new Date();
  }

  res.json(message);
});

// Search messages
app.get('/api/messages/search', (req, res) => {
  const {
    query,
    conversationId,
    authorId,
    messageType,
    hasAttachments,
    dateFrom,
    dateTo,
    tags,
    priority,
    isUnread,
    limit = 50,
    offset = 0
  } = req.query;

  let filteredMessages = [...messages];

  // Apply filters
  if (query) {
    const queryLower = query.toLowerCase();
    filteredMessages = filteredMessages.filter(m =>
      m.content.toLowerCase().includes(queryLower) ||
      m.author.name.toLowerCase().includes(queryLower)
    );
  }

  if (conversationId) filteredMessages = filteredMessages.filter(m => m.conversationId === conversationId);
  if (authorId) filteredMessages = filteredMessages.filter(m => m.author.id === authorId);
  if (messageType) filteredMessages = filteredMessages.filter(m => m.type === messageType);
  if (hasAttachments === 'true') filteredMessages = filteredMessages.filter(m => m.attachments && m.attachments.length > 0);
  if (priority) filteredMessages = filteredMessages.filter(m => m.metadata?.priority === priority);

  if (dateFrom) filteredMessages = filteredMessages.filter(m => new Date(m.createdAt) >= new Date(dateFrom));
  if (dateTo) filteredMessages = filteredMessages.filter(m => new Date(m.createdAt) <= new Date(dateTo));

  // Sort by relevance and date
  filteredMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply pagination
  const paginatedMessages = filteredMessages.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json(paginatedMessages);
});

// Mark message as read
app.post('/api/messages/:id/read', (req, res) => {
  const messageIndex = messages.findIndex(m => m.id === req.params.id);
  if (messageIndex !== -1) {
    messages[messageIndex].status = 'read';
    messages[messageIndex].updatedAt = new Date();
  }
  res.json({ success: true });
});

// Get notifications
app.get('/api/notifications', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const { limit = 50, offset = 0, unreadOnly, type } = req.query;

  let filteredNotifications = notifications.filter(n => n.userId === currentUser.id);

  if (unreadOnly === 'true') {
    filteredNotifications = filteredNotifications.filter(n => !n.isRead);
  }

  if (type) {
    filteredNotifications = filteredNotifications.filter(n => n.type === type);
  }

  // Sort by creation date (newest first)
  filteredNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply pagination
  const paginatedNotifications = filteredNotifications.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json(paginatedNotifications);
});

// Mark notification as read
app.post('/api/notifications/:id/read', (req, res) => {
  const notificationIndex = notifications.findIndex(n => n.id === req.params.id);
  if (notificationIndex !== -1) {
    notifications[notificationIndex].isRead = true;
    notifications[notificationIndex].readAt = new Date();
  }
  res.json({ success: true });
});

// Mark all notifications as read
app.post('/api/notifications/read-all', (req, res) => {
  notifications.forEach(notification => {
    notification.isRead = true;
    notification.readAt = new Date();
  });
  res.json({ success: true });
});

// Snooze notification
app.post('/api/notifications/:id/snooze', (req, res) => {
  const { snoozeUntil } = req.body;
  const notificationIndex = notifications.findIndex(n => n.id === req.params.id);

  if (notificationIndex !== -1) {
    notifications[notificationIndex].isSnoozed = true;
    notifications[notificationIndex].snoozeUntil = new Date(snoozeUntil);
  }

  res.json({ success: true });
});

// Get unread notification count
app.get('/api/notifications/unread-count', (req, res) => {
  const token = req.headers.authorization;
  const currentUser = getUserFromToken(token);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const unreadCount = getUnreadNotificationCount(currentUser.id);
  res.json({ count: unreadCount });
});

// ======================
// FILE STORAGE ENDPOINTS
// ======================

// Upload files
app.post('/api/files/upload', upload.array('files', 10), (req, res) => {
  try {
    // Get user from auth token
    const token = req.headers.authorization;
    const currentUser = getUserFromToken(token);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { projectId } = req.body;
    const uploadedFiles = [];

    req.files.forEach(file => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');

      const fileRecord = {
        id: fileId,
        name: file.filename,
        originalName: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        uploadedBy: currentUser.name || currentUser.email,
        uploadedAt: new Date().toISOString(),
        projectId: projectId || null,
        isImage,
        isVideo,
        thumbnailUrl: isImage ? `/uploads/${file.filename}` : null
      };

      mockFiles.set(fileId, fileRecord);
      uploadedFiles.push(fileRecord);
    });

    res.json(uploadedFiles);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get files (optionally filtered by project)
app.get('/api/files', (req, res) => {
  try {
    const { projectId } = req.query;
    let files = Array.from(mockFiles.values());

    if (projectId) {
      files = files.filter(file => file.projectId === projectId);
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get a specific file
app.get('/api/files/:fileId', (req, res) => {
  try {
    const file = mockFiles.get(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Delete a file
app.delete('/api/files/:fileId', (req, res) => {
  try {
    const file = mockFiles.get(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the physical file
    const filePath = path.join(__dirname, 'uploads', file.name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from storage
    mockFiles.delete(req.params.fileId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Update file metadata
app.put('/api/files/:fileId', (req, res) => {
  try {
    const file = mockFiles.get(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { originalName, projectId } = req.body;

    if (originalName) file.originalName = originalName;
    if (projectId !== undefined) file.projectId = projectId;

    mockFiles.set(req.params.fileId, file);
    res.json(file);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Flux Studio API server running on port ${PORT}`);
  console.log(`📱 Frontend: https://fluxstudio.art`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`💡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ WebSocket server running for real-time messaging`);
});

module.exports = { app, server, io };