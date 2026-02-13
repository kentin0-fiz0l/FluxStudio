require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import our new services
const { database, query } = require('./database/config');
const { fileStorage, upload } = require('./lib/storage');
const { paymentService } = require('./lib/payments');

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
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://fluxstudio.art',
      'http://fluxstudio.art',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001'
    ];

    if (allowedOrigins.includes(origin) || origin.includes('fluxstudio.art')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/webhook', limit: '10mb' })); // For Stripe webhooks
app.use(express.static(path.join(__dirname, 'build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Real-time presence tracking
const connectedUsers = new Map();
const activeConversations = new Map();
const typingIndicators = new Map();

// Initialize database
async function initializeServer() {
  try {
    console.log('🔄 Initializing FluxStudio server...');

    // Initialize database
    await database.initialize();
    console.log('✅ Database initialized');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 FluxStudio server running on port ${PORT}`);
      console.log(`📱 Frontend: https://fluxstudio.art`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`💡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`⚡ WebSocket server running for real-time features`);
    });
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// Helper functions
const generateToken = () => {
  return 'fs-' + Date.now() + '-' + Math.random().toString(36).substr(2, 16);
};

const getUserFromToken = async (token) => {
  if (!token || !token.startsWith('Bearer ')) return null;
  const actualToken = token.substring(7);

  try {
    const result = await query(
      'SELECT * FROM users WHERE id = (SELECT user_id FROM user_sessions WHERE token = $1 AND expires_at > NOW())',
      [actualToken]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, userType = 'client', phone, timezone = 'America/New_York' } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await query(`
      INSERT INTO users (email, name, password_hash, user_type, phone, timezone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, user_type, phone, timezone, avatar_url, created_at
    `, [email, name, passwordHash, userType, phone, timezone]);

    const user = userResult.rows[0];

    // Create Stripe customer
    try {
      await paymentService.createCustomer(user);
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError);
      // Don't fail registration if Stripe fails
    }

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      'INSERT INTO user_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, user.id, expiresAt]
    );

    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const userResult = await query(`
      SELECT id, email, name, password_hash, user_type, phone, timezone, avatar_url, created_at, last_login
      FROM users WHERE email = $1 AND is_active = true
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO user_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, user.id, expiresAt]
    );

    // Remove password hash from response
    delete user.password_hash;

    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, email, name, picture } = req.body;

    let userEmail = email;
    let userName = name;
    let userPicture = picture;

    // Decode JWT if provided
    if (credential && !email) {
      try {
        const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
        userEmail = payload.email;
        userName = payload.name;
        userPicture = payload.picture;
      } catch (jwtError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google credential'
        });
      }
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    let userResult = await query('SELECT * FROM users WHERE email = $1', [userEmail]);
    let user;

    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await query(`
        INSERT INTO users (email, name, user_type, avatar_url, oauth_provider, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, user_type, phone, timezone, avatar_url, created_at
      `, [userEmail, userName || userEmail.split('@')[0], 'client', userPicture, 'google', true]);

      user = newUserResult.rows[0];

      // Create Stripe customer
      try {
        await paymentService.createCustomer(user);
      } catch (stripeError) {
        console.error('Stripe customer creation failed:', stripeError);
      }
    } else {
      user = userResult.rows[0];
      delete user.password_hash;
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO user_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, user.id, expiresAt]
    );

    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (token && token.startsWith('Bearer ')) {
      const actualToken = token.substring(7);
      await query('DELETE FROM user_sessions WHERE token = $1', [actualToken]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication check failed'
    });
  }
});

// ========================================
// ORGANIZATIONS ENDPOINTS
// ========================================

app.get('/api/organizations', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const result = await query(`
      SELECT o.*, om.role, om.joined_at
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1 AND om.is_active = true
      ORDER BY o.name
    `, [user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

app.post('/api/organizations', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const {
      name,
      description,
      type,
      location,
      contact_email,
      contact_phone,
      website
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Organization name and type are required'
      });
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingOrg = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
      if (existingOrg.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create organization
    const orgResult = await query(`
      INSERT INTO organizations (
        name, slug, description, type, location, contact_email, contact_phone, website, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, slug, description, type, location, contact_email, contact_phone, website, user.id]);

    const organization = orgResult.rows[0];

    // Add creator as owner
    await query(`
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES ($1, $2, $3)
    `, [organization.id, user.id, 'owner']);

    // Create Stripe customer for organization
    try {
      await paymentService.createOrganizationCustomer(organization);
    } catch (stripeError) {
      console.error('Stripe organization customer creation failed:', stripeError);
    }

    res.json({
      success: true,
      organization
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, message: 'Failed to create organization' });
  }
});

app.get('/api/organizations/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const result = await query(`
      SELECT o.*, om.role
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id = $1 AND om.user_id = $2 AND om.is_active = true
    `, [req.params.id, user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organization' });
  }
});

// ========================================
// PROJECTS ENDPOINTS
// ========================================

app.get('/api/projects', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { organization_id, status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT p.*, o.name as organization_name, u.name as manager_name, c.name as client_name
      FROM projects p
      JOIN organizations o ON p.organization_id = o.id
      JOIN users u ON p.manager_id = u.id
      LEFT JOIN users c ON p.client_id = c.id
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1 AND pm.is_active = true
    `;
    const params = [user.id];
    let paramCount = 1;

    if (organization_id) {
      paramCount++;
      sql += ` AND p.organization_id = $${paramCount}`;
      params.push(organization_id);
    }

    if (status) {
      paramCount++;
      sql += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const {
      name,
      description,
      organization_id,
      client_id,
      project_type,
      service_category,
      service_tier,
      ensemble_type,
      budget,
      start_date,
      due_date,
      tags = []
    } = req.body;

    if (!name || !organization_id || !project_type || !service_category || !service_tier || !ensemble_type) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, organization_id, project_type, service_category, service_tier, ensemble_type'
      });
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingProject = await query(
        'SELECT id FROM projects WHERE organization_id = $1 AND slug = $2',
        [organization_id, slug]
      );
      if (existingProject.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create project
    const projectResult = await query(`
      INSERT INTO projects (
        name, slug, description, organization_id, manager_id, client_id,
        project_type, service_category, service_tier, ensemble_type,
        budget, start_date, due_date, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      name, slug, description, organization_id, user.id, client_id,
      project_type, service_category, service_tier, ensemble_type,
      budget, start_date, due_date, tags
    ]);

    const project = projectResult.rows[0];

    // Add project manager
    await query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
    `, [project.id, user.id, 'manager']);

    // Add client as viewer if specified
    if (client_id) {
      await query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
      `, [project.id, client_id, 'viewer']);
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const result = await query(`
      SELECT p.*, o.name as organization_name, u.name as manager_name, c.name as client_name, pm.role as user_role
      FROM projects p
      JOIN organizations o ON p.organization_id = o.id
      JOIN users u ON p.manager_id = u.id
      LEFT JOIN users c ON p.client_id = c.id
      JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1 AND pm.user_id = $2 AND pm.is_active = true
    `, [req.params.id, user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = result.rows[0];

    // Get project milestones
    const milestonesResult = await query(`
      SELECT * FROM project_milestones
      WHERE project_id = $1
      ORDER BY order_index
    `, [project.id]);

    project.milestones = milestonesResult.rows;

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
});

// ========================================
// FILE UPLOAD ENDPOINTS
// ========================================

app.post('/api/files/upload', upload.array('files', 10), async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const {
      project_id,
      organization_id,
      category = 'other',
      description = ''
    } = req.body;

    if (!organization_id) {
      return res.status(400).json({ success: false, message: 'organization_id is required' });
    }

    const uploadResults = await fileStorage.uploadFiles(req.files, {
      userId: user.id,
      projectId: project_id,
      organizationId: organization_id,
      category,
      description
    });

    res.json({
      success: true,
      files: uploadResults.results,
      errors: uploadResults.errors
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const {
      project_id,
      organization_id,
      category,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    const files = await fileStorage.searchFiles(search, {
      organizationId: organization_id,
      projectId: project_id,
      category,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch files' });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Check file ownership/permissions
    const fileResult = await query(`
      SELECT f.*, pm.role
      FROM files f
      LEFT JOIN project_members pm ON f.project_id = pm.project_id AND pm.user_id = $1
      WHERE f.id = $2 AND (f.uploaded_by = $1 OR pm.role IN ('manager', 'contributor'))
    `, [user.id, req.params.id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found or access denied' });
    }

    await fileStorage.deleteFile(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// ========================================
// PAYMENT ENDPOINTS
// ========================================

app.get('/api/payments/pricing', (req, res) => {
  res.json(paymentService.getAllServicePricing());
});

app.post('/api/payments/create-intent', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { project_id, customizations = {} } = req.body;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

    // Get project details
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get organization's Stripe customer ID
    const orgResult = await query('SELECT stripe_customer_id FROM organizations WHERE id = $1', [project.organization_id]);
    const customerId = orgResult.rows[0]?.stripe_customer_id;

    const result = await paymentService.createProjectPaymentIntent(project, {
      customizations,
      customerId
    });

    res.json({
      success: true,
      client_secret: result.paymentIntent.client_secret,
      invoice: result.invoice,
      pricing: result.pricing
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment intent' });
  }
});

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    await paymentService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ success: false, message: 'Webhook handling failed' });
  }
});

// ========================================
// HEALTH CHECK & FALLBACK
// ========================================

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: dbHealth,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Serve React app for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
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

// Initialize server
initializeServer();

module.exports = { app, server, io };