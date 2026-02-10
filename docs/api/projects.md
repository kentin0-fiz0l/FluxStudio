# Projects API

## Overview

Projects are the core organizational unit in FluxStudio. Each project belongs to an organization and can have multiple members, files, conversations, and tasks.

## Endpoints

### List Projects

```http
GET /api/projects
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | all | Filter by status: `planning`, `active`, `on-hold`, `completed`, `cancelled` |
| `organizationId` | string | - | Filter by organization |
| `search` | string | - | Search in name and description |
| `limit` | number | 50 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |
| `sortBy` | string | `updatedAt` | Sort field: `name`, `createdAt`, `updatedAt`, `dueDate` |
| `sortOrder` | string | `desc` | Sort order: `asc`, `desc` |

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "proj-123",
      "name": "Fall 2024 Marching Band Uniforms",
      "description": "Complete uniform redesign for Westfield HS",
      "slug": "fall-2024-marching-band",
      "status": "active",
      "priority": "high",
      "projectType": "uniform_design",
      "serviceCategory": "marching_band",
      "serviceTier": "premium",
      "ensembleType": "high_school",
      "organizationId": "org-1",
      "organizationName": "Design Studio",
      "teamId": "team-1",
      "teamName": "Marching Arts Team",
      "managerId": "user-1",
      "managerName": "John Doe",
      "clientId": "user-2",
      "budget": 15000.00,
      "estimatedHours": 120,
      "actualHours": 45,
      "startDate": "2024-03-01",
      "dueDate": "2024-08-15",
      "memberCount": 5,
      "taskCount": 24,
      "completedTaskCount": 12,
      "progress": 50,
      "tags": ["uniforms", "brass", "woodwinds"],
      "createdAt": "2024-02-01T10:00:00Z",
      "updatedAt": "2025-02-09T12:00:00Z"
    }
  ],
  "total": 25,
  "hasMore": true
}
```

---

### Create Project

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Spring 2025 Color Guard Show",
  "description": "New show design for competition season",
  "organizationId": "org-1",
  "teamId": "team-1",
  "clientId": "user-2",
  "projectType": "show_design",
  "serviceCategory": "color_guard",
  "serviceTier": "standard",
  "ensembleType": "high_school",
  "priority": "medium",
  "budget": 8000.00,
  "estimatedHours": 80,
  "startDate": "2025-01-15",
  "dueDate": "2025-04-01",
  "tags": ["color_guard", "flags", "props"]
}
```

**Required Fields:**
- `name` - Project name (2-255 characters)
- `organizationId` - Organization UUID
- `projectType` - Type of project
- `serviceCategory` - Service category
- `serviceTier` - Service tier level
- `ensembleType` - Type of ensemble

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "proj-456",
    "name": "Spring 2025 Color Guard Show",
    "slug": "spring-2025-color-guard-show",
    "status": "planning",
    "createdAt": "2025-02-09T12:00:00Z"
  }
}
```

---

### Get Project

```http
GET /api/projects/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "proj-123",
    "name": "Fall 2024 Marching Band Uniforms",
    "description": "Complete uniform redesign...",
    "status": "active",
    "priority": "high",
    "organization": {
      "id": "org-1",
      "name": "Design Studio",
      "slug": "design-studio"
    },
    "team": {
      "id": "team-1",
      "name": "Marching Arts Team"
    },
    "manager": {
      "id": "user-1",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "client": {
      "id": "user-2",
      "name": "Director Smith",
      "email": "smith@school.edu"
    },
    "members": [
      {
        "userId": "user-3",
        "name": "Jane Designer",
        "role": "contributor",
        "joinedAt": "2024-02-05T10:00:00Z"
      }
    ],
    "milestones": [
      {
        "id": "mile-1",
        "name": "Initial Concepts",
        "dueDate": "2024-04-01",
        "completedAt": "2024-03-28T10:00:00Z"
      }
    ],
    "recentActivity": [
      {
        "type": "file_uploaded",
        "user": "Jane Designer",
        "description": "Uploaded uniform-v3.pdf",
        "timestamp": "2025-02-09T11:00:00Z"
      }
    ],
    "metadata": {},
    "settings": {},
    "createdAt": "2024-02-01T10:00:00Z",
    "updatedAt": "2025-02-09T12:00:00Z"
  }
}
```

---

### Update Project

```http
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Fall 2024 Marching Band Uniforms - Updated",
  "status": "active",
  "priority": "urgent",
  "dueDate": "2024-08-01"
}
```

**Updatable Fields:**
- `name`, `description`, `status`, `priority`
- `teamId`, `clientId`, `budget`, `estimatedHours`
- `startDate`, `dueDate`, `tags`, `metadata`, `settings`

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "proj-123",
    "name": "Fall 2024 Marching Band Uniforms - Updated",
    "status": "active",
    "priority": "urgent",
    "updatedAt": "2025-02-09T12:30:00Z"
  }
}
```

---

### Delete Project

```http
DELETE /api/projects/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Note:** Projects are soft-deleted (status set to `cancelled`).

---

### List Project Members

```http
GET /api/projects/:id/members
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "id": "member-1",
      "userId": "user-1",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": "https://...",
      "role": "manager",
      "permissions": ["manage", "edit", "view"],
      "hourlyRate": 75.00,
      "joinedAt": "2024-02-01T10:00:00Z",
      "isActive": true
    }
  ]
}
```

---

### Add Project Member

```http
POST /api/projects/:id/members
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user-3",
  "role": "contributor",
  "hourlyRate": 50.00
}
```

**Roles:**
- `manager` - Full project control
- `contributor` - Edit and create content
- `reviewer` - Review and comment only
- `viewer` - View only access

**Response:**
```json
{
  "success": true,
  "member": {
    "id": "member-3",
    "userId": "user-3",
    "role": "contributor",
    "joinedAt": "2025-02-09T12:00:00Z"
  }
}
```

---

### Remove Project Member

```http
DELETE /api/projects/:id/members/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Member removed from project"
}
```

---

### Get Project Files

```http
GET /api/projects/:id/files
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | all | Filter: `design`, `reference`, `final`, `feedback` |
| `limit` | number | 50 | Results per page |
| `offset` | number | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file-1",
      "name": "uniform-concept-v1.pdf",
      "mimeType": "application/pdf",
      "size": 2456789,
      "category": "design",
      "status": "approved",
      "version": 3,
      "thumbnailUrl": "https://...",
      "uploadedBy": {
        "id": "user-1",
        "name": "John Doe"
      },
      "createdAt": "2024-03-15T10:00:00Z"
    }
  ],
  "total": 15
}
```

---

### Get Project Activity

```http
GET /api/projects/:id/activity
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Results per page |
| `offset` | number | 0 | Pagination offset |
| `type` | string | all | Activity type filter |

**Response:**
```json
{
  "success": true,
  "activities": [
    {
      "id": "act-1",
      "type": "file_uploaded",
      "actor": {
        "id": "user-1",
        "name": "John Doe"
      },
      "target": {
        "type": "file",
        "id": "file-1",
        "name": "design-v3.pdf"
      },
      "description": "Uploaded design-v3.pdf",
      "timestamp": "2025-02-09T11:00:00Z"
    }
  ],
  "total": 150
}
```

## Project Types

| Type | Description |
|------|-------------|
| `uniform_design` | Marching band uniform design |
| `show_design` | Complete show visual design |
| `equipment_design` | Flags, props, equipment |
| `drill_writing` | Marching drill charts |
| `color_guard` | Color guard equipment and costumes |
| `custom` | Custom project type |

## Service Categories

| Category | Description |
|----------|-------------|
| `marching_band` | Marching band programs |
| `indoor_percussion` | Indoor drumline |
| `winter_guard` | Winter guard |
| `drum_corps` | DCI/DCA corps |
| `wgi` | WGI ensembles |

## Service Tiers

| Tier | Description |
|------|-------------|
| `basic` | Essential services |
| `standard` | Standard package |
| `premium` | Full-service package |
| `enterprise` | Custom enterprise solutions |
