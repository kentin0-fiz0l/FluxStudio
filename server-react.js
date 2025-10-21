const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const db = new sqlite3.Database('fluxstudio.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    service TEXT,
    budget TEXT,
    timeline TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve fonts directory specifically (BEFORE other static files)
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

// Serve static files from React build with no-cache headers
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Upload handling for file attachments
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// API Routes
app.post('/api/contact', upload.single('attachment'), async (req, res) => {
  try {
    const { name, email, organization, service, budget, timeline, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Insert into database
    db.run(
      `INSERT INTO contacts (name, email, organization, service, budget, timeline, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, organization || '', service || '', budget || '', timeline || '', message],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error occurred'
          });
        }

        console.log('New contact submission:', { name, email, service });

        res.json({
          success: true,
          message: 'Thank you for your inquiry! We\'ll get back to you within 24 hours.',
          id: this.lastID
        });
      }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

app.post('/api/booking', async (req, res) => {
  try {
    const { name, email, service, date, time, notes } = req.body;

    // Validate required fields
    if (!name || !email || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, service, date, and time are required'
      });
    }

    // Insert into database
    db.run(
      `INSERT INTO bookings (name, email, service, date, time, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, service, date, time, notes || ''],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error occurred'
          });
        }

        console.log('New booking:', { name, email, service, date, time });

        res.json({
          success: true,
          message: 'Your consultation has been booked! We\'ll send you a confirmation email shortly.',
          id: this.lastID
        });
      }
    );
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your booking'
    });
  }
});

// Get all contacts (admin endpoint)
app.get('/api/contacts', (req, res) => {
  db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get all bookings (admin endpoint)
app.get('/api/bookings', (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve React app for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }

  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FluxStudio server running on port ${PORT}`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }
});

module.exports = app;