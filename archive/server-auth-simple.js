require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || '720630e2126867ec9663bfffbd643595ea20d10133bf880659f8ad6bbaf611af473feb47b04e9f8a124c43d301bba06697c5fae5a13b8dec0932f0319cc3b2d2';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://fluxstudio.art,https://www.fluxstudio.art';

// Google OAuth client
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Simple file-based storage
const USERS_FILE = path.join(__dirname, 'users.json');
const FILES_FILE = path.join(__dirname, 'files.json');
const TEAMS_FILE = path.join(__dirname, 'teams.json');

// Initialize files if they don't exist
[USERS_FILE, FILES_FILE, TEAMS_FILE].forEach(file => {
  if (!fs.existsSync(file)) {
    const key = path.basename(file, '.json');
    fs.writeFileSync(file, JSON.stringify({ [key]: [] }));
  }
});

// Cryptographically secure UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

// CORS configuration
const corsOptions = {
  origin: CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for X-Forwarded-For headers
app.set('trust proxy', 1);

// Helper functions
function getUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

function getUserByEmail(email) {
  const users = getUsers();
  return users.find(user => user.email === email);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, userType = 'client' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
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

    users.push(newUser);
    saveUsers(users);

    const token = generateToken(newUser);
    const { password: _, ...userWithoutPassword } = newUser;

    console.log('✅ User signup successful:', email);
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    console.log('✅ User login successful:', email);
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Google OAuth
app.post('/api/auth/google', async (req, res) => {
  try {
    console.log('📱 Google OAuth request received');
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!googleClient) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    // Verify the Google ID token
    console.log('🔐 Verifying Google token...');
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;
    console.log('✅ Google token verified:', email);

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }

    // Check if user exists
    let users = getUsers();
    let user = users.find(u => u.email === email);

    if (user) {
      console.log('👤 Existing user found:', email);
      if (!user.googleId) {
        user.googleId = googleId;
        saveUsers(users);
      }
    } else {
      console.log('👤 Creating new user:', email);
      user = {
        id: uuidv4(),
        email,
        name,
        googleId,
        userType: 'client',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
    }

    const token = generateToken(user);
    const { password, googleId: _, ...userWithoutPassword } = user;

    console.log('🎉 Google OAuth successful for:', email);
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('❌ Google OAuth error:', error.message);
    res.status(500).json({ message: 'Google authentication error', error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Organizations endpoint (simplified)
app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    // Return empty array for now
    res.json({ organizations: [] });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

// CSRF token endpoint (simplified - just return a token)
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken });
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Simplified Auth Server running on port ${PORT}`);
  console.log(`📊 Google OAuth: ${googleClient ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔒 CORS Origins: ${CORS_ORIGIN}`);
  console.log(`\n✅ API Endpoints:`);
  console.log(`  POST /api/auth/signup`);
  console.log(`  POST /api/auth/login`);
  console.log(`  POST /api/auth/google ⭐`);
  console.log(`  GET  /api/auth/me`);
  console.log(`  POST /api/auth/logout`);
  console.log(`  GET  /api/organizations`);
  console.log(`  GET  /api/csrf-token`);
  console.log(`  GET  /health`);
  console.log(`\n🎯 Ready for OAuth requests!`);
});
