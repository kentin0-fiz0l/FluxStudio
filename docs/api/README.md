# FluxStudio API Documentation

## Overview

FluxStudio provides a RESTful API for managing creative design projects, real-time collaboration, messaging, and file management. The API is built on Express.js and uses JWT for authentication.

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.fluxstudio.art` |
| Staging | `https://api-staging.fluxstudio.art` |
| Local | `http://localhost:3001` |

## Authentication

All protected endpoints require a JWT Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fluxstudio.art/api/auth/me
```

### Getting a Token

```bash
# Login with email/password
curl -X POST https://api.fluxstudio.art/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "userType": "designer"
  }
}
```

### Token Refresh

```bash
curl -X POST https://api.fluxstudio.art/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }  // Optional validation errors
}
```

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| File Upload | 20 requests | 15 minutes |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets

## API Endpoints

See individual endpoint documentation:

- [Authentication](./authentication.md)
- [Projects](./projects.md)
- [Messages](./messages.md)
- [Files](./files.md)
- [Organizations](./organizations.md)
- [Users](./users.md)
- [Notifications](./notifications.md)

## Quick Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Login with Google OAuth |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate tokens |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project by ID |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/members` | List project members |
| POST | `/api/projects/:id/members` | Add project member |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List files |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files/:id` | Get file metadata |
| GET | `/api/files/:id/download` | Download file |
| DELETE | `/api/files/:id` | Delete file |
| POST | `/api/files/:id/attach` | Attach file to project |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List organizations |
| POST | `/api/organizations` | Create organization |
| GET | `/api/organizations/:id` | Get organization |
| PUT | `/api/organizations/:id` | Update organization |
| GET | `/api/organizations/:id/members` | List members |

## WebSocket Events

FluxStudio uses Socket.IO for real-time features.

### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.fluxstudio.art', {
  path: '/api/socket.io',
  auth: { token: 'your_jwt_token' }
});
```

### Messaging Namespace (`/messaging`)
| Event | Direction | Description |
|-------|-----------|-------------|
| `message:new` | Server -> Client | New message received |
| `message:send` | Client -> Server | Send message |
| `typing:start` | Client -> Server | User started typing |
| `typing:stop` | Client -> Server | User stopped typing |
| `user:online` | Server -> Client | User came online |
| `user:offline` | Server -> Client | User went offline |

### Collaboration Namespace (Port 4000)
Uses Yjs WebSocket protocol for CRDT-based real-time editing.

```javascript
import { WebsocketProvider } from 'y-websocket';

const provider = new WebsocketProvider(
  'wss://collab.fluxstudio.art',
  'document-id',
  ydoc
);
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `DUPLICATE_ENTRY` | Resource already exists |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `INVALID_FILE_TYPE` | Unsupported file format |

## CORS

The API allows requests from:
- `https://fluxstudio.art`
- `http://localhost:3000`
- `http://localhost:5173`

Custom origins can be configured via the `CORS_ORIGINS` environment variable.

## Health Check

```bash
curl https://api.fluxstudio.art/health

# Response
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-02-09T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```
