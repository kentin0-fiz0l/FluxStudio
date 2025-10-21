# FluxStudio API Documentation

## Overview

FluxStudio provides a comprehensive RESTful API for creative design collaboration. This API enables third-party integrations, automation, and custom applications built on top of the FluxStudio platform.

**Base URL:** `https://api.fluxstudio.art`
**API Version:** v1
**Authentication:** Bearer Token (JWT)

## Quick Start

### 1. Authentication

All API requests require authentication using a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fluxstudio.art/api/auth/me
```

### 2. Get your API Token

```bash
curl -X POST https://api.fluxstudio.art/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "your_password"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "your@email.com",
      "name": "Your Name"
    }
  }
}
```

## Authentication Endpoints

### POST /api/auth/login
Authenticate a user and receive an access token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "userType": "client|designer|admin"
    }
  }
}
```

### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "userType": "client|designer|admin"
}
```

### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "userType": "string",
    "createdAt": "string"
  }
}
```

### POST /api/auth/logout
Logout and invalidate current token.

## Organization Endpoints

### GET /api/organizations
List all organizations for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "createdAt": "string",
        "memberCount": "number",
        "projectCount": "number"
      }
    ]
  }
}
```

### POST /api/organizations
Create a new organization.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "website": "string",
  "industry": "string",
  "size": "startup|small|medium|large|enterprise"
}
```

### GET /api/organizations/{id}
Get specific organization details.

### PUT /api/organizations/{id}
Update organization information.

### DELETE /api/organizations/{id}
Delete an organization.

## Team Endpoints

### GET /api/organizations/{orgId}/teams
List teams within an organization.

### POST /api/organizations/{orgId}/teams
Create a new team.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "permissions": ["string"],
  "memberIds": ["string"]
}
```

### GET /api/teams/{id}
Get team details.

### PUT /api/teams/{id}
Update team information.

### DELETE /api/teams/{id}
Delete a team.

## Project Endpoints

### GET /api/projects
List projects with optional filtering.

**Query Parameters:**
- `organizationId` (optional): Filter by organization
- `teamId` (optional): Filter by team
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "status": "draft|active|review|completed|archived",
        "organizationId": "string",
        "teamId": "string",
        "createdAt": "string",
        "updatedAt": "string",
        "fileCount": "number",
        "collaboratorCount": "number"
      }
    ],
    "total": "number",
    "limit": "number",
    "offset": "number"
  }
}
```

### POST /api/projects
Create a new project.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "organizationId": "string",
  "teamId": "string",
  "type": "web|mobile|branding|print|other",
  "deadline": "string",
  "budget": "number"
}
```

### GET /api/projects/{id}
Get project details including files and collaborators.

### PUT /api/projects/{id}
Update project information.

### DELETE /api/projects/{id}
Delete a project and all associated files.

## File Management Endpoints

### GET /api/projects/{projectId}/files
List files in a project.

### POST /api/projects/{projectId}/files
Upload a file to a project.

**Request:** Multipart form data
- `file`: File data
- `metadata`: JSON string with file metadata

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "type": "string",
    "size": "number",
    "url": "string",
    "thumbnailUrl": "string",
    "uploadedAt": "string",
    "uploadedBy": "string"
  }
}
```

### GET /api/files/{id}
Get file details and download URL.

### PUT /api/files/{id}
Update file metadata.

### DELETE /api/files/{id}
Delete a file.

## Messaging Endpoints

### GET /api/messages
Get messages with optional filtering.

**Query Parameters:**
- `projectId` (optional): Filter by project
- `channelId` (optional): Filter by channel
- `limit` (optional): Number of results
- `before` (optional): Messages before timestamp

### POST /api/messages
Send a new message.

**Request Body:**
```json
{
  "content": "string",
  "projectId": "string",
  "channelId": "string",
  "type": "text|file|system",
  "metadata": {}
}
```

## AI Assistant Endpoints

### POST /api/ai/analyze-design
Analyze a design and get AI suggestions.

**Request Body:**
```json
{
  "projectId": "string",
  "designElements": [],
  "context": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "string",
        "type": "color|layout|typography|spacing|accessibility",
        "title": "string",
        "description": "string",
        "confidence": "number",
        "impact": "low|medium|high",
        "implementation": {
          "css": "string",
          "instructions": "string"
        }
      }
    ]
  }
}
```

### POST /api/ai/generate-palette
Generate AI-powered color palettes.

### POST /api/ai/analyze-layout
Analyze layout for usability issues.

## Analytics Endpoints

### GET /api/analytics/overview
Get overview analytics for user's accessible projects.

### GET /api/analytics/projects/{id}
Get detailed analytics for a specific project.

### GET /api/analytics/team/{id}
Get team performance analytics.

## Webhooks

FluxStudio supports webhooks for real-time notifications of events.

### Supported Events

- `project.created`
- `project.updated`
- `project.completed`
- `file.uploaded`
- `file.updated`
- `message.sent`
- `team.member.added`
- `team.member.removed`

### Webhook Configuration

Configure webhooks in your organization settings or via API:

```bash
curl -X POST https://api.fluxstudio.art/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/fluxstudio",
    "events": ["project.created", "file.uploaded"],
    "secret": "your-webhook-secret"
  }'
```

### Webhook Payload

```json
{
  "event": "project.created",
  "timestamp": "2023-01-01T00:00:00Z",
  "data": {
    "project": {
      "id": "string",
      "name": "string",
      "organizationId": "string"
    }
  },
  "signature": "sha256=..."
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute
- **File upload endpoints**: 2 requests per minute
- **General API endpoints**: 100 requests per 15 minutes

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401): Missing or invalid token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @fluxstudio/api-client
```

```javascript
import FluxStudio from '@fluxstudio/api-client';

const client = new FluxStudio({
  apiKey: 'your-api-token',
  baseURL: 'https://api.fluxstudio.art'
});

// Get projects
const projects = await client.projects.list();

// Upload file
const file = await client.files.upload(projectId, fileData);
```

### Python
```bash
pip install fluxstudio-api
```

```python
from fluxstudio import FluxStudioClient

client = FluxStudioClient(api_key='your-api-token')

# Get projects
projects = client.projects.list()

# Create project
project = client.projects.create({
    'name': 'My Project',
    'organizationId': 'org_123'
})
```

### cURL Examples

```bash
# List projects
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.fluxstudio.art/api/projects"

# Create project
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","organizationId":"org_123"}' \
  "https://api.fluxstudio.art/api/projects"

# Upload file
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.png" \
  -F "metadata={\"name\":\"Design Mockup\"}" \
  "https://api.fluxstudio.art/api/projects/proj_123/files"
```

## Support and Resources

- **API Status**: https://status.fluxstudio.art
- **Support**: support@fluxstudio.art
- **Developer Forum**: https://community.fluxstudio.art
- **Changelog**: https://docs.fluxstudio.art/changelog

## Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication, projects, teams, files
- AI assistant integration
- Real-time messaging
- Analytics endpoints

---

*Last updated: October 2025*