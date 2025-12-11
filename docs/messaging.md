# FluxStudio Messaging System

This document describes the messaging system architecture, database schema, REST APIs, and Socket.IO events.

## Overview

The messaging system provides:
- Real-time conversations between users
- Notifications for mentions, messages, and system events
- Socket.IO for live updates
- REST API fallback when WebSocket is unavailable

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend       │────▶│  Unified Backend │────▶│   PostgreSQL     │
│  (React/Vite)    │     │  (Express/Node)  │     │   Database       │
│                  │     │                  │     │                  │
│  - messagingService    │  - REST API      │     │  - conversations │
│  - socketService │◀───▶│  - Socket.IO     │     │  - messages      │
│  - MessagingContext    │    /messaging    │     │  - notifications │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## Database Schema

### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Conversation title (nullable) |
| description | TEXT | Optional description |
| type | VARCHAR(50) | 'direct', 'group', 'project', 'team' |
| organization_id | UUID | FK to organizations (nullable) |
| project_id | UUID | FK to projects (nullable) |
| team_id | UUID | FK to teams (nullable) |
| created_by | UUID | FK to users |
| last_message_at | TIMESTAMP | Last message timestamp |
| metadata | JSONB | Additional metadata |
| settings | JSONB | Conversation settings |
| is_archived | BOOLEAN | Archive status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### conversation_participants
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK to conversations |
| user_id | UUID | FK to users |
| role | VARCHAR(50) | 'owner', 'admin', 'member' |
| joined_at | TIMESTAMP | When user joined |
| last_read_at | TIMESTAMP | Last read position |
| is_muted | BOOLEAN | Mute notifications |
| is_pinned | BOOLEAN | Pin to top |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK to conversations |
| author_id | UUID | FK to users |
| content | TEXT | Message body |
| message_type | VARCHAR(50) | 'text', 'file', 'image', 'system' |
| priority | VARCHAR(50) | 'low', 'normal', 'high', 'urgent' |
| status | VARCHAR(50) | 'sent', 'delivered', 'read' |
| reply_to_id | UUID | FK to parent message (nullable) |
| thread_id | UUID | Thread grouping (nullable) |
| mentions | UUID[] | Array of mentioned user IDs |
| attachments | JSONB | File attachments |
| metadata | JSONB | Additional metadata |
| edited_at | TIMESTAMP | Edit timestamp (nullable) |
| deleted_at | TIMESTAMP | Soft delete timestamp (nullable) |
| created_at | TIMESTAMP | Creation timestamp |

### notifications
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| type | VARCHAR(100) | Notification type |
| title | VARCHAR(255) | Notification title |
| message | TEXT | Notification body |
| data | JSONB | Additional data |
| priority | VARCHAR(50) | 'low', 'medium', 'high', 'urgent' |
| is_read | BOOLEAN | Read status |
| read_at | TIMESTAMP | When marked as read (nullable) |
| action_url | TEXT | Deep link URL (nullable) |
| expires_at | TIMESTAMP | Expiration (nullable) |
| created_at | TIMESTAMP | Creation timestamp |

## REST API Endpoints

All endpoints require authentication via `Authorization: Bearer <token>` header.

### Notifications

#### GET /api/notifications
Get user's notifications.

**Query Parameters:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "type": "message_mention",
      "title": "New mention",
      "message": "You were mentioned in...",
      "isRead": false,
      "createdAt": "2025-01-12T10:00:00Z"
    }
  ],
  "total": 10
}
```

#### POST /api/notifications/read
Mark notifications as read.

**Request Body:**
```json
// Mark specific notifications
{ "ids": ["uuid1", "uuid2"] }

// Mark all as read
{ "all": true }
```

**Response:**
```json
{
  "success": true,
  "marked": [...]
}
```

### Conversations

#### GET /api/conversations
Get user's conversations.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "name": "Project Discussion",
      "type": "group",
      "lastMessageAt": "2025-01-12T10:00:00Z",
      "unreadCount": 3
    }
  ],
  "total": 5
}
```

#### GET /api/conversations/:id
Get single conversation with messages.

**Query Parameters:**
- `limit` (default: 50) - number of messages

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "name": "Project Discussion",
    "messages": [...],
    "participants": [...]
  }
}
```

**Errors:**
- 403: Not a participant
- 404: Conversation not found

#### POST /api/conversations
Create new conversation.

**Request Body:**
```json
{
  "participantIds": ["user-uuid-1", "user-uuid-2"],
  "title": "New Discussion",
  "type": "group",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "name": "New Discussion",
    "participants": [...]
  }
}
```

#### GET /api/conversations/:id/messages
Get messages in a conversation.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "messages": [...],
  "conversationId": "uuid",
  "total": 100
}
```

#### POST /api/conversations/:id/messages
Send a message.

**Request Body:**
```json
{
  "body": "Hello world!",
  "messageType": "text"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "content": "Hello world!",
    "authorId": "user-uuid",
    "createdAt": "2025-01-12T10:00:00Z"
  }
}
```

#### POST /api/conversations/:id/read
Mark conversation as read.

**Request Body:**
```json
{
  "messageId": "optional-last-read-message-id"
}
```

## Socket.IO Events

### Connection

Connect to the `/messaging` namespace:

```javascript
const socket = io('https://fluxstudio.art/messaging', {
  path: '/api/socket.io',
  auth: {
    token: 'jwt-token'
  }
});
```

### Client → Server Events

#### `user:join`
Authenticate user session.
```javascript
socket.emit('user:join', { userId: 'uuid' });
```

#### `conversation:join`
Join a conversation room.
```javascript
socket.emit('conversation:join', conversationId, userId);
```

#### `conversation:leave`
Leave a conversation room.
```javascript
socket.emit('conversation:leave', conversationId, userId);
```

#### `message:send`
Send a message (also sent via REST API).
```javascript
socket.emit('message:send', {
  conversationId: 'uuid',
  content: 'Hello!',
  type: 'text'
});
```

#### `typing:start` / `typing:stop`
Typing indicators.
```javascript
socket.emit('typing:start', conversationId, userId);
socket.emit('typing:stop', conversationId, userId);
```

### Server → Client Events

#### `message:new`
New message in a conversation.
```javascript
socket.on('message:new', (message) => {
  // { id, conversationId, content, authorId, authorName, createdAt }
});
```

#### `message:received`
Message delivery confirmation.

#### `typing:started` / `typing:stopped`
Typing indicator events.
```javascript
socket.on('typing:started', ({ conversationId, userId, timestamp }) => {
  // Show typing indicator
});
```

#### `user:online` / `user:offline`
Presence events.

#### `notification:new`
New notification (sent to user's personal room).
```javascript
socket.on('notification:new', (notification) => {
  // { id, type, title, message, data }
});
```

## Environment Variables

### Backend (server-unified.js)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_WEBSOCKET` | Enable Socket.IO | `true` |
| `USE_DATABASE` | Use PostgreSQL | `true` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `CORS_ORIGINS` | Allowed origins | Required |

### Frontend (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_SOCKET_URL` | WebSocket server URL |
| `VITE_API_BASE_URL` | REST API base URL |

## Testing Locally

1. Start the backend:
```bash
npm run dev:server
# Runs on http://localhost:3001
```

2. Start the frontend:
```bash
npm run dev
# Runs on http://localhost:5173
# API proxy routes /api/* to localhost:3001
```

3. Test the messaging page:
- Log in at http://localhost:5173/login
- Navigate to http://localhost:5173/messages
- Open browser DevTools to see API calls and Socket.IO events

## Troubleshooting

### 401/403 Errors
- Check that the JWT token is valid and not expired
- Verify the user is a participant in the conversation

### WebSocket Connection Failed (504)
- Check that `ENABLE_WEBSOCKET=true` on the backend
- Verify the Socket.IO path matches between frontend and backend
- Check CORS origins include your domain

### Messages Not Appearing
- Verify the REST API response format matches what the frontend expects
- Check browser console for errors in messagingService
- Ensure the user is a participant in the conversation

## Feature Flags

To disable messaging system:

```bash
# Backend
MESSAGING_ENABLED=false

# Frontend will fall back to REST-only mode if Socket.IO fails
```
