# Phase 2: Project & Team Messaging Integration - Architecture

## Overview
Phase 2 integrates real-time messaging directly into Projects and Teams, enabling context-aware collaboration within the existing FluxStudio ecosystem.

## Technical Architecture

### 1. Database Schema Updates

#### Projects Table Enhancement
```sql
ALTER TABLE projects ADD COLUMN message_channel_id VARCHAR(36);
ALTER TABLE projects ADD COLUMN auto_created_channel BOOLEAN DEFAULT TRUE;
```

#### Teams Table Enhancement
```sql
ALTER TABLE teams ADD COLUMN message_channel_id VARCHAR(36);
ALTER TABLE teams ADD COLUMN auto_created_channel BOOLEAN DEFAULT TRUE;
```

#### Conversations/Channels Table Enhancement
```sql
ALTER TABLE conversations ADD COLUMN project_id VARCHAR(36);
ALTER TABLE conversations ADD COLUMN team_id VARCHAR(36);
ALTER TABLE conversations ADD COLUMN channel_type ENUM('direct', 'group', 'project', 'team', 'organization') DEFAULT 'group';
ALTER TABLE conversations ADD COLUMN auto_created BOOLEAN DEFAULT FALSE;
```

#### Messages Table Enhancement (for @mentions)
```sql
ALTER TABLE messages ADD COLUMN mentions JSON DEFAULT '[]';
-- JSON format: [{"userId": "uuid", "name": "User Name", "offset": 0, "length": 10}]
```

#### New Table: Channel Participants (for granular permissions)
```sql
CREATE TABLE channel_participants (
  id VARCHAR(36) PRIMARY KEY,
  channel_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('owner', 'admin', 'member', 'readonly') DEFAULT 'member',
  can_read BOOLEAN DEFAULT TRUE,
  can_write BOOLEAN DEFAULT TRUE,
  can_invite BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_channel_user (channel_id, user_id)
);
```

### 2. Backend API Endpoints

#### Auth Service (port 3001) - New Endpoints

```javascript
// POST /api/projects - Enhanced to auto-create message channel
POST /api/projects
{
  name: string,
  description: string,
  teamId?: string,
  members: string[],
  autoCreateChannel: boolean = true
}
Response: {
  project: Project,
  messageChannel?: Channel
}

// POST /api/projects/:id/channel - Manually create channel for existing project
POST /api/projects/:id/channel
Response: { channel: Channel }

// GET /api/projects/:id/channel - Get project's message channel
GET /api/projects/:id/channel
Response: { channel: Channel }

// POST /api/teams - Enhanced to auto-create message channel
POST /api/teams
{
  name: string,
  description: string,
  autoCreateChannel: boolean = true
}
Response: {
  team: Team,
  messageChannel?: Channel
}

// POST /api/teams/:id/channel - Manually create channel for existing team
POST /api/teams/:id/channel
Response: { channel: Channel }

// GET /api/teams/:id/channel - Get team's message channel
GET /api/teams/:id/channel
Response: { channel: Channel }
```

#### Messaging Service (port 3004) - New Endpoints

```javascript
// POST /api/channels/project - Create project-linked channel
POST /api/channels/project
{
  projectId: string,
  name: string,
  description?: string,
  participants: string[]
}
Response: { channel: Channel }

// POST /api/channels/team - Create team-linked channel
POST /api/channels/team
{
  teamId: string,
  name: string,
  description?: string,
  participants: string[]
}
Response: { channel: Channel }

// POST /api/messages - Enhanced with @mention support
POST /api/messages
{
  channelId: string,
  content: string,
  mentions?: Array<{userId: string, name: string, offset: number, length: number}>
}
Response: { message: Message }

// GET /api/mentions - Get @mentions for current user
GET /api/mentions?unread=true
Response: { mentions: Mention[] }

// POST /api/channels/:id/participants - Add participants to channel
POST /api/channels/:id/participants
{
  userIds: string[],
  role?: 'member' | 'admin' | 'readonly'
}
Response: { participants: Participant[] }

// DELETE /api/channels/:id/participants/:userId - Remove participant
DELETE /api/channels/:id/participants/:userId
Response: { success: boolean }
```

### 3. WebSocket Events (Messaging Service)

#### New Events for Project/Team Channels

```javascript
// Server → Client
'channel:created' - Emitted when project/team channel is created
{
  channel: Channel,
  type: 'project' | 'team',
  linkedId: string
}

'user:mentioned' - Emitted when user is @mentioned
{
  messageId: string,
  channelId: string,
  mentionedBy: User,
  message: string,
  timestamp: Date
}

'channel:participant-added' - New user added to channel
{
  channelId: string,
  participant: Participant
}

'channel:participant-removed' - User removed from channel
{
  channelId: string,
  userId: string
}

// Client → Server
'channel:join-project' - Join a project's channel
{
  projectId: string
}

'channel:join-team' - Join a team's channel
{
  teamId: string
}

'message:mention' - Send message with @mentions
{
  channelId: string,
  content: string,
  mentions: Mention[]
}
```

### 4. Frontend Components

#### New Components

**`/src/components/organisms/ProjectMessagesTab.tsx`**
- Embedded messaging panel for project detail pages
- Auto-connects to project's message channel
- Shows project-specific message history
- Allows team members to communicate within project context
- Integrates with existing ChatMessage component

**`/src/components/organisms/TeamMessagesPanel.tsx`**
- Messaging panel for team pages
- Auto-connects to team's message channel
- Shows team-wide conversations
- Supports @mentions for team members

**`/src/components/molecules/MentionInput.tsx`**
- Textarea with @mention autocomplete
- Triggers user search on "@" character
- Renders autocomplete dropdown with team/project members
- Inserts mention with proper formatting

**`/src/components/molecules/MentionBadge.tsx`**
- Visual indicator for @mentions in messages
- Clickable to view user profile
- Highlights current user's mentions

#### Enhanced Components

**`MessagesNew.tsx` Enhancements:**
- Add filter for project-specific conversations
- Add filter for team-specific conversations
- Show channel type badges (Project, Team, Direct)

**`ProjectsNew.tsx` Integration:**
- Add "Messages" tab to project detail view
- Show unread message count on tab
- Embed ProjectMessagesTab component

**`TeamNew.tsx` Integration:**
- Add "Messages" section/tab
- Show unread count
- Embed TeamMessagesPanel component

### 5. Data Flow Examples

#### Creating a Project with Auto-Channel

```
1. User creates project via frontend
   ↓
2. POST /api/projects → Auth Service
   ↓
3. Auth Service creates project record
   ↓
4. Auth Service calls Messaging Service: POST /api/channels/project
   ↓
5. Messaging Service creates channel, links to projectId
   ↓
6. Auth Service updates project.message_channel_id
   ↓
7. Auth Service returns project + channel to frontend
   ↓
8. Frontend navigates to project detail
   ↓
9. ProjectMessagesTab auto-connects to WebSocket
   ↓
10. User sees empty project channel, ready to message
```

#### Sending @Mention Message

```
1. User types message with "@JohnDoe" in channel
   ↓
2. MentionInput detects "@", shows autocomplete
   ↓
3. User selects John from dropdown
   ↓
4. Frontend sends: socket.emit('message:mention', {
     channelId,
     content: "Hey @JohnDoe check this out",
     mentions: [{userId: "john-id", name: "JohnDoe", offset: 4, length: 8}]
   })
   ↓
5. Messaging Service saves message with mentions JSON
   ↓
6. Messaging Service emits to channel: 'message:new'
   ↓
7. Messaging Service emits to John: 'user:mentioned'
   ↓
8. John's UI shows notification
   ↓
9. John clicks notification → navigates to channel
```

### 6. Security Considerations

**Channel Access Control:**
- Only project/team members can access associated channels
- Verify user is project/team member before allowing channel join
- Admin/owner permissions required to add/remove channel participants

**@Mention Permissions:**
- Can only mention users who are in the channel
- Rate limit @mention notifications to prevent spam
- Log @mention events for audit trail

**Data Validation:**
- Sanitize message content before storing
- Validate mention offsets to prevent XSS
- Verify channel permissions on every WebSocket operation

### 7. Implementation Phases

**Phase 2.1: Backend Foundation (Days 1-2)**
- Database schema updates
- Auth Service API endpoints for project/team channels
- Messaging Service enhancements for project/team linking

**Phase 2.2: @Mention System (Days 2-3)**
- Message table updates for mentions
- WebSocket events for @mentions
- API endpoints for mention queries

**Phase 2.3: Frontend Components (Days 3-4)**
- ProjectMessagesTab component
- TeamMessagesPanel component
- MentionInput component with autocomplete

**Phase 2.4: Integration (Day 4-5)**
- Integrate components into ProjectsNew and TeamNew pages
- Wire up WebSocket connections
- Add notification system for @mentions

**Phase 2.5: Testing & Deployment (Day 5-6)**
- End-to-end testing
- Security audit
- UX review
- Production deployment

### 8. Migration Strategy

**For Existing Projects/Teams:**
```javascript
// Migration script: create-project-team-channels.js
// Run on deployment to create channels for existing projects/teams

async function migrateExistingProjectsAndTeams() {
  // Get all projects without message_channel_id
  const projects = await getProjectsWithoutChannels();

  for (const project of projects) {
    // Create channel
    const channel = await createProjectChannel({
      projectId: project.id,
      name: `${project.name} - Team Chat`,
      participants: project.members
    });

    // Link channel to project
    await linkChannelToProject(project.id, channel.id);
  }

  // Same for teams
  const teams = await getTeamsWithoutChannels();
  for (const team of teams) {
    const channel = await createTeamChannel({
      teamId: team.id,
      name: `${team.name} - Chat`,
      participants: team.members.map(m => m.userId)
    });

    await linkChannelToTeam(team.id, channel.id);
  }
}
```

### 9. Success Metrics

- 100% of new projects have associated message channels
- 100% of new teams have associated message channels
- @mention notifications delivered within 1 second
- Channel access control: 0 unauthorized access attempts succeed
- Message latency < 500ms for 95th percentile
- WebSocket connection stability > 99%

### 10. Rollback Plan

If issues arise:
1. Disable auto-channel creation via feature flag
2. Revert database migrations (channels remain but not auto-linked)
3. Hide Messages tabs in UI
4. Messaging Service continues to work independently
5. No data loss - all messages preserved

## Next Steps

1. Review this architecture with Security Reviewer
2. Review with UX Reviewer for user flow validation
3. Create detailed implementation tasks
4. Begin Phase 2.1 implementation
