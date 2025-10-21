#!/bin/bash

# FluxStudio Messaging Architecture Deployment Script
# Production deployment to 167.172.208.61

echo "🚀 Starting FluxStudio Messaging Architecture Deployment..."

# Configuration
SERVER="root@167.172.208.61"
REMOTE_PATH="/var/www/fluxstudio"
LOCAL_BUILD="build/"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Build the production bundle
print_status "Building production bundle..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Build failed. Exiting."
    exit 1
fi
print_success "Build completed successfully!"

# Step 2: Upload production environment file
print_status "Uploading production environment configuration..."
scp .env.production $SERVER:$REMOTE_PATH/.env
if [ $? -ne 0 ]; then
    print_warning "Failed to upload .env.production file"
fi

# Step 3: Upload build files
print_status "Uploading build files to production server..."
rsync -avz --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.env.local \
    --exclude=.env \
    --exclude=*.log \
    build/ $SERVER:$REMOTE_PATH/

if [ $? -ne 0 ]; then
    print_error "Failed to upload build files"
    exit 1
fi
print_success "Build files uploaded successfully!"

# Step 4: Upload messaging components source (for server-side rendering if needed)
print_status "Uploading messaging components..."
rsync -avz \
    --exclude=node_modules \
    src/components/messaging/ $SERVER:$REMOTE_PATH/src/components/messaging/

rsync -avz \
    src/services/messageIntelligenceService.ts $SERVER:$REMOTE_PATH/src/services/

rsync -avz \
    src/types/messaging.ts $SERVER:$REMOTE_PATH/src/types/

print_success "Messaging components uploaded!"

# Step 5: Upload package files
print_status "Uploading package configuration..."
scp package.json package-lock.json $SERVER:$REMOTE_PATH/
print_success "Package files uploaded!"

# Step 6: Install dependencies and start services on server
print_status "Installing dependencies and starting services on production server..."
ssh $SERVER << 'ENDSSH'
cd /var/www/fluxstudio

# Install/update dependencies
echo "Installing dependencies..."
npm ci --production

# Create WebSocket service file
cat > /etc/systemd/system/fluxstudio-websocket.service << 'EOF'
[Unit]
Description=FluxStudio WebSocket Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/fluxstudio
ExecStart=/usr/bin/node websocket-server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=fluxstudio-websocket

[Install]
WantedBy=multi-user.target
EOF

# Create WebSocket server file
cat > websocket-server.js << 'EOJS'
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Room management
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost:8080');
  const pathParts = url.pathname.split('/');
  const roomType = pathParts[1]; // annotation, session, etc.
  const roomId = pathParts[2];

  if (!roomId) {
    ws.close();
    return;
  }

  // Join room
  ws.room = roomId;
  ws.roomType = roomType;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);

  console.log(`Client joined ${roomType} room: ${roomId}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // Broadcast to all clients in the same room
      const room = rooms.get(roomId);
      if (room) {
        room.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    // Remove from room
    const room = rooms.get(roomId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
    console.log(`Client left ${roomType} room: ${roomId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    roomId: roomId,
    roomType: roomType
  }));
});

const PORT = process.env.WEBSOCKET_PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
EOJS

# Reload systemd and start services
echo "Starting WebSocket service..."
systemctl daemon-reload
systemctl enable fluxstudio-websocket
systemctl restart fluxstudio-websocket

# Check service status
systemctl status fluxstudio-websocket --no-pager

# Create nginx configuration for WebSocket
cat > /etc/nginx/sites-available/fluxstudio-ws << 'EONGINX'
upstream websocket {
    server localhost:8080;
}

server {
    listen 80;
    server_name ws.fluxstudio.com;

    location / {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EONGINX

# Enable nginx configuration
ln -sf /etc/nginx/sites-available/fluxstudio-ws /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Restart main application
echo "Restarting main application..."
pm2 restart fluxstudio || pm2 start server.js --name fluxstudio

echo "Deployment complete on server!"
ENDSSH

if [ $? -eq 0 ]; then
    print_success "Services started successfully on production server!"
else
    print_warning "Some services may have failed to start. Please check the server logs."
fi

# Step 7: Verify deployment
print_status "Verifying deployment..."
curl -s -o /dev/null -w "%{http_code}" http://167.172.208.61:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Application is accessible!"
else
    print_warning "Application may not be accessible. Please check server configuration."
fi

# Step 8: Upload integration guide
print_status "Uploading integration guide..."
scp MESSAGING_INTEGRATION_GUIDE.md $SERVER:$REMOTE_PATH/docs/
print_success "Documentation uploaded!"

# Summary
echo ""
echo "════════════════════════════════════════════════════════"
echo ""
print_success "🎉 Deployment Complete!"
echo ""
echo "📝 Deployment Summary:"
echo "   • Production build created and optimized"
echo "   • Files uploaded to 167.172.208.61"
echo "   • WebSocket server configured on port 8080"
echo "   • Nginx proxy configured for WebSocket"
echo "   • Services restarted"
echo ""
echo "🔗 Access Points:"
echo "   • Main Application: http://167.172.208.61:3000"
echo "   • WebSocket Server: ws://167.172.208.61:8080"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure DNS for ws.fluxstudio.com"
echo "   2. Setup SSL certificates with certbot"
echo "   3. Configure firewall rules for port 8080"
echo "   4. Monitor application logs: pm2 logs fluxstudio"
echo "   5. Monitor WebSocket logs: journalctl -u fluxstudio-websocket -f"
echo ""
echo "════════════════════════════════════════════════════════"