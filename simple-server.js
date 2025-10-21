const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://fluxstudio.art", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from build directory
app.use(express.static(path.join(__dirname)));

// Mock API endpoints
app.get('/api/organizations', (req, res) => {
  res.json([
    { id: '1', name: 'Flux Studio', memberCount: 5 },
    { id: '2', name: 'Creative Agency', memberCount: 12 }
  ]);
});

app.get('/api/conversations', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Sarah Chen',
      lastMessage: 'The latest designs look great!',
      timestamp: '2 min ago',
      unread: 2
    },
    {
      id: '2',
      name: 'Design Team',
      lastMessage: 'Mike: Can we review the prototype?',
      timestamp: '15 min ago',
      unread: 0
    }
  ]);
});

app.get('/api/notifications', (req, res) => {
  res.json([
    {
      id: '1',
      title: 'New message',
      message: 'Sarah Chen sent you a message',
      timestamp: new Date().toISOString(),
      read: false
    }
  ]);
});

app.get('/api/teams', (req, res) => {
  res.json([
    { id: '1', name: 'Design Team', memberCount: 4 },
    { id: '2', name: 'Development Team', memberCount: 6 }
  ]);
});

app.get('/api/projects', (req, res) => {
  res.json([
    { id: '1', name: 'Brand Redesign', status: 'active' },
    { id: '2', name: 'Website Refresh', status: 'planning' }
  ]);
});

app.get('/api/files', (req, res) => {
  res.json([
    { id: '1', name: 'Logo_v2.png', size: '2.4 MB', modified: '2 hours ago' },
    { id: '2', name: 'Brand_Guidelines.pdf', size: '5.1 MB', modified: '1 day ago' }
  ]);
});

// Catch all handler for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their room
  socket.on('join', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined room`);
  });

  // Handle messages
  socket.on('message', (data) => {
    console.log('Message received:', data);
    // Broadcast to conversation participants
    socket.to(`conversation-${data.conversationId}`).emit('message', data);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(`conversation-${data.conversationId}`).emit('typing', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});