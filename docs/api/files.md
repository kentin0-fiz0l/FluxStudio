# Files API

## Overview

The Files API handles file uploads, downloads, versioning, and project attachments. Files are stored in S3-compatible storage (DigitalOcean Spaces) with metadata in PostgreSQL.

## Endpoints

### List Files

```http
GET /api/files
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projectId` | string | - | Filter by project |
| `category` | string | all | `design`, `reference`, `final`, `feedback`, `other` |
| `status` | string | all | `draft`, `review`, `approved`, `rejected` |
| `mimeType` | string | - | Filter by MIME type (e.g., `image/*`) |
| `search` | string | - | Search in filename |
| `limit` | number | 50 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file-uuid",
      "name": "uniform-concept-v3.pdf",
      "originalName": "Uniform Concept Final.pdf",
      "description": "Final uniform concept design",
      "mimeType": "application/pdf",
      "size": 2456789,
      "category": "design",
      "status": "approved",
      "version": 3,
      "isLatest": true,
      "parentFileId": "file-uuid-v2",
      "thumbnailUrl": "https://...",
      "url": "/files/storage/...",
      "projectId": "proj-123",
      "project": {
        "id": "proj-123",
        "name": "Fall 2024 Uniforms"
      },
      "uploadedBy": {
        "id": "user-1",
        "name": "John Doe"
      },
      "metadata": {
        "pages": 12,
        "dimensions": null
      },
      "createdAt": "2025-02-09T10:00:00Z",
      "updatedAt": "2025-02-09T12:00:00Z"
    }
  ],
  "total": 45,
  "hasMore": true
}
```

---

### Upload File

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload |
| `projectId` | string | No | Associate with project |
| `category` | string | No | File category |
| `description` | string | No | File description |
| `parentFileId` | string | No | Parent file (for versioning) |

**Curl Example:**
```bash
curl -X POST https://api.fluxstudio.art/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/design.pdf" \
  -F "projectId=proj-123" \
  -F "category=design" \
  -F "description=Initial design concept"
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-new-uuid",
    "name": "design.pdf",
    "originalName": "design.pdf",
    "mimeType": "application/pdf",
    "size": 1234567,
    "url": "/files/storage/user123/2025/02/file.pdf",
    "thumbnailUrl": null,
    "version": 1,
    "category": "design",
    "status": "draft",
    "createdAt": "2025-02-09T12:00:00Z"
  }
}
```

**Limits:**
- Maximum file size: 50MB
- Allowed types: jpeg, jpg, png, gif, webp, svg, pdf, doc, docx, txt, zip, mp4, mov, avi, mp3, wav

---

### Get File Details

```http
GET /api/files/:fileId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-uuid",
    "name": "uniform-concept-v3.pdf",
    "originalName": "Uniform Concept Final.pdf",
    "description": "Final uniform concept design",
    "mimeType": "application/pdf",
    "size": 2456789,
    "width": null,
    "height": null,
    "duration": null,
    "pages": 12,
    "category": "design",
    "status": "approved",
    "version": 3,
    "isLatest": true,
    "parentFileId": "file-uuid-v2",
    "url": "/files/storage/...",
    "thumbnailUrl": "https://...",
    "projectId": "proj-123",
    "organizationId": "org-1",
    "uploadedBy": {
      "id": "user-1",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "previews": [
      {
        "type": "thumbnail",
        "url": "/files/preview/...",
        "width": 200,
        "height": 200,
        "pageNumber": null
      }
    ],
    "versions": [
      {
        "id": "file-uuid-v1",
        "version": 1,
        "createdAt": "2025-01-15T10:00:00Z"
      },
      {
        "id": "file-uuid-v2",
        "version": 2,
        "createdAt": "2025-02-01T10:00:00Z"
      }
    ],
    "metadata": {},
    "createdAt": "2025-02-09T10:00:00Z",
    "updatedAt": "2025-02-09T12:00:00Z"
  }
}
```

---

### Download File

```http
GET /api/files/:fileId/download
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `inline` | boolean | false | If true, display in browser instead of download |

**Response:**
- Binary file content with appropriate Content-Type header
- `Content-Disposition: attachment` (or `inline` if requested)

---

### Rename File

```http
POST /api/files/:fileId/rename
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New File Name.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-uuid",
    "name": "New File Name.pdf",
    "updatedAt": "2025-02-09T12:30:00Z"
  }
}
```

---

### Update File

```http
PUT /api/files/:fileId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Updated description",
  "category": "final",
  "status": "approved"
}
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-uuid",
    "description": "Updated description",
    "category": "final",
    "status": "approved",
    "updatedAt": "2025-02-09T12:30:00Z"
  }
}
```

---

### Delete File

```http
DELETE /api/files/:fileId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Note:** Files are soft-deleted (marked as deleted but not physically removed immediately).

---

### Attach File to Project

```http
POST /api/files/:fileId/attach
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": "proj-123",
  "role": "reference",
  "notes": "Color palette reference"
}
```

**File Roles:**
- `primary` - Main deliverable
- `reference` - Reference material
- `asset` - Design asset
- `feedback` - Client feedback

**Response:**
```json
{
  "success": true,
  "message": "File attached to project"
}
```

---

### Detach File from Project

```http
DELETE /api/files/:fileId/attach/:projectId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File detached from project"
}
```

---

### Get File Projects

List all projects a file is attached to.

```http
GET /api/files/:fileId/projects
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "proj-123",
      "name": "Fall 2024 Uniforms",
      "role": "reference",
      "notes": "Color palette reference",
      "attachedAt": "2025-02-09T10:00:00Z",
      "attachedBy": {
        "id": "user-1",
        "name": "John Doe"
      }
    }
  ]
}
```

---

### Get Project Files

List all files attached to a project.

```http
GET /api/project-files/:projectId
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Results per page |
| `offset` | number | 0 | Pagination offset |
| `role` | string | all | Filter by attachment role |

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file-uuid",
      "name": "design.pdf",
      "mimeType": "application/pdf",
      "size": 2456789,
      "role": "primary",
      "attachedAt": "2025-02-09T10:00:00Z"
    }
  ],
  "total": 12,
  "hasMore": false
}
```

## File Categories

| Category | Description |
|----------|-------------|
| `design` | Design files and concepts |
| `reference` | Reference materials |
| `final` | Approved final deliverables |
| `feedback` | Client feedback and revisions |
| `other` | Miscellaneous files |

## File Status

| Status | Description |
|--------|-------------|
| `draft` | Initial upload, not reviewed |
| `review` | Under client review |
| `approved` | Approved by client |
| `rejected` | Rejected, needs revision |

## Supported File Types

**Images:**
- JPEG, PNG, GIF, WebP, SVG

**Documents:**
- PDF, DOC, DOCX, TXT

**Media:**
- MP4, MOV, AVI (video)
- MP3, WAV (audio)

**Archives:**
- ZIP

## Error Codes

| Code | Description |
|------|-------------|
| `FILE_TOO_LARGE` | File exceeds 50MB limit |
| `INVALID_FILE_TYPE` | Unsupported file format |
| `FILE_NOT_FOUND` | File does not exist |
| `UPLOAD_FAILED` | Storage upload failed |
| `PERMISSION_DENIED` | User cannot access this file |
