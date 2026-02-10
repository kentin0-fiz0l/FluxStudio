# FluxStudio Database Schema

## Overview

FluxStudio uses PostgreSQL as its primary database. The schema supports multi-tenant organizations, real-time collaboration, and comprehensive project management.

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │────<│ organization_   │>────│  organizations  │
│                 │     │    members      │     │                 │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                                │
         │         ┌─────────────────┐                   │
         └────────<│  team_members   │>──────────────────┤
                   └─────────────────┘                   │
                            │                            │
                   ┌────────┴────────┐                   │
                   │     teams       │<──────────────────┘
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
┌────────┴────────┐ ┌───────┴───────┐ ┌────────┴────────┐
│    projects     │ │ conversations │ │     files       │
└────────┬────────┘ └───────┬───────┘ └─────────────────┘
         │                  │
┌────────┴────────┐ ┌───────┴───────┐
│ project_members │ │   messages    │
└─────────────────┘ └───────────────┘
```

## Core Tables

### users

Primary user table for authentication and profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| name | VARCHAR(255) | NOT NULL | Display name |
| password_hash | VARCHAR(255) | NULLABLE | Hashed password (NULL for OAuth users) |
| user_type | VARCHAR(50) | NOT NULL | `client`, `designer`, `admin` |
| avatar_url | TEXT | | Profile picture URL |
| phone | VARCHAR(20) | | Phone number |
| timezone | VARCHAR(50) | DEFAULT 'America/New_York' | User timezone |
| preferences | JSONB | DEFAULT '{}' | User preferences |
| oauth_provider | VARCHAR(50) | | OAuth provider name |
| oauth_id | VARCHAR(255) | | OAuth provider user ID |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| last_login | TIMESTAMP WITH TIME ZONE | | Last login timestamp |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_oauth` on `(oauth_provider, oauth_id)`

### organizations

Multi-tenant organization container.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Organization name |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly identifier |
| description | TEXT | | Organization description |
| type | VARCHAR(100) | NOT NULL | `high_school`, `university`, `independent`, etc. |
| location | TEXT | | Physical location |
| contact_email | VARCHAR(255) | | Contact email |
| contact_phone | VARCHAR(20) | | Contact phone |
| website | VARCHAR(255) | | Website URL |
| logo_url | TEXT | | Logo image URL |
| settings | JSONB | DEFAULT '{}' | Organization settings |
| subscription_tier | VARCHAR(50) | DEFAULT 'free' | Subscription level |
| subscription_status | VARCHAR(50) | DEFAULT 'active' | Subscription status |
| billing_email | VARCHAR(255) | | Billing contact email |
| stripe_customer_id | VARCHAR(255) | | Stripe customer ID |
| created_by | UUID | FK users(id) | Creator user ID |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_organizations_slug` on `slug`

### projects

Core project entity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Project name |
| description | TEXT | | Project description |
| slug | VARCHAR(255) | NOT NULL | URL-friendly identifier |
| organization_id | UUID | FK organizations(id) | Parent organization |
| team_id | UUID | FK teams(id) | Assigned team |
| manager_id | UUID | FK users(id), NOT NULL | Project manager |
| client_id | UUID | FK users(id) | Client user |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'planning' | `planning`, `active`, `on-hold`, `completed`, `cancelled` |
| priority | VARCHAR(50) | NOT NULL, DEFAULT 'medium' | `low`, `medium`, `high`, `urgent` |
| project_type | VARCHAR(100) | NOT NULL | Type of project |
| service_category | VARCHAR(100) | NOT NULL | Service category |
| service_tier | VARCHAR(50) | NOT NULL | Service tier level |
| ensemble_type | VARCHAR(100) | NOT NULL | Type of ensemble |
| budget | DECIMAL(10,2) | | Project budget |
| estimated_hours | INTEGER | | Estimated hours |
| actual_hours | INTEGER | DEFAULT 0 | Actual hours spent |
| start_date | DATE | | Project start date |
| due_date | DATE | | Project due date |
| completion_date | DATE | | Actual completion date |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |
| settings | JSONB | DEFAULT '{}' | Project settings |
| tags | TEXT[] | DEFAULT '{}' | Project tags |
| is_template | BOOLEAN | DEFAULT FALSE | Is this a template |
| template_id | UUID | FK projects(id) | Source template |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_projects_organization` on `organization_id`
- `idx_projects_status` on `status`
- UNIQUE on `(organization_id, slug)`

### files

File storage and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Display name |
| original_name | VARCHAR(255) | NOT NULL | Original filename |
| description | TEXT | | File description |
| file_path | TEXT | NOT NULL | Storage path |
| file_url | TEXT | NOT NULL | Access URL |
| thumbnail_url | TEXT | | Thumbnail URL |
| mime_type | VARCHAR(100) | NOT NULL | MIME type |
| file_size | BIGINT | NOT NULL | Size in bytes |
| width | INTEGER | | Image/video width |
| height | INTEGER | | Image/video height |
| duration | INTEGER | | Video/audio duration (seconds) |
| pages | INTEGER | | PDF page count |
| category | VARCHAR(50) | NOT NULL, DEFAULT 'other' | `design`, `reference`, `final`, `feedback`, `other` |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'draft' | `draft`, `review`, `approved`, `rejected` |
| version | INTEGER | NOT NULL, DEFAULT 1 | Version number |
| is_latest | BOOLEAN | DEFAULT TRUE | Is latest version |
| parent_file_id | UUID | FK files(id) | Previous version |
| project_id | UUID | FK projects(id) | Associated project |
| organization_id | UUID | FK organizations(id), NOT NULL | Owner organization |
| uploaded_by | UUID | FK users(id), NOT NULL | Uploader |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Upload timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_files_project` on `project_id`
- `idx_files_organization` on `organization_id`

### messages

Messaging and conversation content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| conversation_id | UUID | FK conversations(id), NOT NULL | Parent conversation |
| author_id | UUID | FK users(id), NOT NULL | Message author |
| content | TEXT | | Message content |
| message_type | VARCHAR(50) | NOT NULL, DEFAULT 'text' | `text`, `file`, `image`, `system` |
| priority | VARCHAR(50) | NOT NULL, DEFAULT 'normal' | `low`, `normal`, `high`, `urgent` |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'sent' | `sent`, `delivered`, `read` |
| reply_to_id | UUID | FK messages(id) | Reply parent message |
| thread_id | UUID | | Thread grouping ID |
| mentions | UUID[] | DEFAULT '{}' | Mentioned user IDs |
| attachments | JSONB | DEFAULT '[]' | Attachment metadata |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |
| edited_at | TIMESTAMP WITH TIME ZONE | | Last edit timestamp |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete timestamp |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_messages_conversation` on `conversation_id`
- `idx_messages_created_at` on `created_at`

## Security Tables

### refresh_tokens

JWT refresh token storage for session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Token identifier |
| user_id | UUID | FK users(id), NOT NULL | Token owner |
| token_hash | VARCHAR(255) | NOT NULL | Hashed token value |
| device_info | JSONB | | Device metadata |
| ip_address | VARCHAR(45) | | Client IP address |
| expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Token expiration |
| revoked_at | TIMESTAMP WITH TIME ZONE | | Revocation timestamp |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |

### security_events

Security audit log.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Event identifier |
| user_id | UUID | FK users(id) | Associated user |
| event_type | VARCHAR(100) | NOT NULL | Event type code |
| severity | VARCHAR(20) | NOT NULL | `info`, `warning`, `critical` |
| description | TEXT | | Event description |
| ip_address | VARCHAR(45) | | Client IP |
| user_agent | TEXT | | Browser user agent |
| metadata | JSONB | DEFAULT '{}' | Additional data |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Event timestamp |

## Recommended Indexes

Add these indexes for improved query performance:

```sql
-- Full-text search on messages
CREATE INDEX idx_messages_content_search ON messages
USING GIN (to_tsvector('english', content));

-- Composite index for project queries
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);

-- Index for file versioning
CREATE INDEX idx_files_parent ON files(parent_file_id) WHERE parent_file_id IS NOT NULL;

-- Index for unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
WHERE is_read = FALSE;

-- Index for active conversation participants
CREATE INDEX idx_conversation_participants_active
ON conversation_participants(user_id, conversation_id)
WHERE is_muted = FALSE;
```

## Triggers

### updated_at Auto-Update

All tables with `updated_at` columns have a trigger to automatically update the timestamp:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applied to all relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Data Types

### JSONB Fields

Common JSONB structures:

**User Preferences:**
```json
{
  "notifications": {
    "email": true,
    "push": true,
    "mentions": true
  },
  "display": {
    "theme": "light",
    "compactMode": false
  }
}
```

**File Metadata:**
```json
{
  "dimensions": { "width": 1920, "height": 1080 },
  "colorProfile": "sRGB",
  "dpi": 300,
  "layers": 12
}
```

## Backup Strategy

1. **Automated backups**: Daily full backups via pg_dump
2. **Point-in-time recovery**: WAL archiving enabled
3. **Retention**: 30 days for daily backups, 90 days for weekly
4. **Testing**: Monthly restore tests to verify backup integrity

## Performance Considerations

1. **Connection pooling**: Use PgBouncer in production
2. **Statement timeout**: Set to 30 seconds to prevent runaway queries
3. **Vacuum**: Configure autovacuum for optimal performance
4. **Monitoring**: Use pg_stat_statements for query analysis
