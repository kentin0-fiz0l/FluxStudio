const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic teams endpoint
app.get('/api/teams', (req, res) => {
  res.json({
    success: true,
    teams: [
      {
        id: 'team-1',
        name: 'Design Team',
        description: 'Creative design and visual concepts team',
        organizationId: 'org-1',
        members: ['kentino', 'client-1']
      }
    ]
  });
});

// Basic projects endpoint
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    projects: [
      {
        id: 'project-1',
        name: 'Fall 2024 Marching Show',
        description: 'Complete uniform and visual design for fall marching season',
        status: 'in_progress'
      }
    ]
  });
});

// Basic files endpoint
app.get('/api/files', (req, res) => {
  res.json({
    success: true,
    files: [
      {
        id: 'file-1',
        name: 'project-mockup.pdf',
        type: 'application/pdf',
        size: 2048000
      }
    ]
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Flux Studio API server running on port ${PORT}`);
  console.log(`📱 Frontend: https://fluxstudio.art`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`💡 Health check: http://localhost:${PORT}/api/health`);
});