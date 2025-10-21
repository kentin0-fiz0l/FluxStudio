# Phase 2: Advanced Features & GitHub Integration

**Planning Date:** October 17, 2025
**Status:** 📋 Planning
**Prerequisites:** Phase 1 Complete ✅

---

## 🎯 Phase 2 Overview

Building on the successful OAuth integration framework from Phase 1, Phase 2 will add GitHub integration, enhance existing integrations with advanced features, and implement the MCP (Model Context Protocol) UI for natural language database queries.

### Goals

1. **GitHub Integration** - Complete the OAuth framework with GitHub
2. **Advanced Figma Features** - Component library sync, design tokens
3. **Advanced Slack Features** - Task automation, workflow integrations
4. **MCP User Interface** - Natural language database queries
5. **Performance Optimizations** - Redis cache, CDN, WebSockets
6. **Additional Integrations** - Google Drive, Jira, Trello

---

## 📅 Timeline

**Estimated Duration:** 2-3 weeks
**Target Completion:** Early November 2025

### Week 1: GitHub Integration
- Days 1-2: GitHub OAuth setup
- Days 3-4: Repository linking UI
- Day 5: Issue sync implementation
- Days 6-7: Testing and documentation

### Week 2: Advanced Features
- Days 8-9: Figma component library sync
- Days 10-11: Slack task automation
- Days 12-13: MCP UI implementation
- Day 14: Integration testing

### Week 3: Performance & Polish
- Days 15-16: Redis cache implementation
- Days 17-18: Performance optimizations
- Days 19-20: User testing and bug fixes
- Day 21: Production deployment

---

## 🔧 Feature Breakdown

### 1. GitHub Integration

**OAuth Configuration:**
```bash
GITHUB_CLIENT_ID=<to be configured>
GITHUB_CLIENT_SECRET=<to be configured>
GITHUB_REDIRECT_URI=https://fluxstudio.art/api/integrations/github/callback
```

**Scopes Required:**
- `repo` - Full control of private repositories
- `read:org` - Read org and team membership
- `read:user` - Read user profile data
- `user:email` - Read user email addresses

**Features to Implement:**

#### A. Repository Linking
- List user's repositories
- Link repository to FluxStudio project
- Display repo info (stars, forks, last commit)
- Branch selection

#### B. Issue Sync
- Two-way sync between GitHub Issues and FluxStudio Tasks
- Create task from issue
- Create issue from task
- Status synchronization
- Label mapping

#### C. Pull Request Tracking
- List open PRs for linked repo
- PR status in task view
- Merge conflict detection
- Review request notifications

#### D. Commit History
- Display recent commits for project
- Commit author attribution
- File change diff viewer
- Link commits to tasks

**UI Components:**
```typescript
// New components needed
GitHubIntegration.tsx       // Main integration card
RepositoryBrowser.tsx        // Browse and select repos
RepositoryCard.tsx           // Display repo info
IssueSyncPanel.tsx           // Issue ↔ Task sync UI
PullRequestList.tsx          // List PRs
CommitHistory.tsx            // Commit timeline
```

**API Endpoints:**
```
GET    /api/integrations/github/repositories
GET    /api/integrations/github/repositories/:owner/:repo
POST   /api/integrations/github/repositories/:owner/:repo/link
GET    /api/integrations/github/issues
POST   /api/integrations/github/issues/:number/sync
GET    /api/integrations/github/pulls
GET    /api/integrations/github/commits
POST   /api/integrations/github/webhook
```

**Database Schema:**
```sql
CREATE TABLE github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  repo_full_name VARCHAR(255) NOT NULL,  -- owner/repo
  default_branch VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE github_issue_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  github_issue_number INT NOT NULL,
  repo_full_name VARCHAR(255) NOT NULL,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_github_repos_user ON github_repositories(user_id);
CREATE INDEX idx_github_repos_project ON github_repositories(project_id);
CREATE INDEX idx_github_issue_task ON github_issue_mappings(task_id);
```

---

### 2. Advanced Figma Features

#### A. Component Library Sync
- Detect Figma components in files
- Import component metadata
- Update notification when components change
- Component usage tracking across projects

**Implementation:**
```typescript
// lib/figma-components.js
class FigmaComponentManager {
  async syncComponents(fileKey) {
    const file = await figmaClient.getFile(fileKey);
    const components = this.extractComponents(file);
    await this.saveToDatabase(components);
    return components;
  }

  extractComponents(file) {
    // Parse Figma file structure
    // Find all components
    // Extract properties
  }
}
```

#### B. Design Token Extraction
- Extract colors from Figma styles
- Extract typography tokens
- Export as CSS variables
- Export as Tailwind config
- Export as JSON

**UI:**
```typescript
// DesignTokenPanel.tsx
<div>
  <h3>Design Tokens</h3>
  <TokenList tokens={colors} type="color" />
  <TokenList tokens={typography} type="text" />

  <ExportButton format="css" />
  <ExportButton format="tailwind" />
  <ExportButton format="json" />
</div>
```

#### C. Real-time Collaboration
- WebSocket connection to Figma file
- Live cursor positions
- Commenting in real-time
- Presence indicators

#### D. Version History
- List file versions
- Compare versions (diff)
- Restore to previous version
- Version changelog

**API Endpoints:**
```
GET    /api/integrations/figma/files/:fileKey/components
POST   /api/integrations/figma/files/:fileKey/components/sync
GET    /api/integrations/figma/files/:fileKey/tokens
POST   /api/integrations/figma/files/:fileKey/tokens/export
GET    /api/integrations/figma/files/:fileKey/versions
POST   /api/integrations/figma/files/:fileKey/versions/:id/restore
```

---

### 3. Advanced Slack Features

#### A. Task Creation from Messages
- React to message with emoji to create task
- Message content → task description
- Extract assignees from mentions
- Extract due dates from natural language
- Link thread to task for context

**Implementation:**
```javascript
// Slack event subscription
app.event('reaction_added', async ({ event }) => {
  if (event.reaction === 'white_check_mark') {
    const message = await getMessageContent(event.item.ts);
    const task = await createTaskFromMessage(message);
    await postTaskLink(event.item.channel, task.id);
  }
});
```

#### B. Project Update Automation
- Auto-post when task status changes
- Daily standup summaries
- Weekly progress reports
- Milestone completion announcements

#### C. Notification Customization
- Per-project Slack channel mapping
- Custom notification templates
- Notification frequency settings
- Digest mode (batch notifications)

#### D. Workflow Integrations
- Slack workflow builder integration
- Custom slash commands
- Interactive message actions
- Modal dialogs for task creation

**API Endpoints:**
```
POST   /api/integrations/slack/tasks/create-from-message
POST   /api/integrations/slack/notifications/configure
GET    /api/integrations/slack/notifications/settings
POST   /api/integrations/slack/workflows/:id/execute
```

**Database Schema:**
```sql
CREATE TABLE slack_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  channel_id VARCHAR(100) NOT NULL,
  team_id VARCHAR(100) NOT NULL,
  notification_types JSONB,  -- {taskCreated: true, statusChanged: false, ...}
  digest_enabled BOOLEAN DEFAULT false,
  digest_frequency VARCHAR(20),  -- 'daily', 'weekly'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. MCP (Model Context Protocol) UI

**Goal:** Allow users to query their FluxStudio data using natural language

#### A. Query Interface
```typescript
// MCPQueryPanel.tsx
<div className="mcp-panel">
  <h2>Ask Your Data</h2>

  <textarea
    placeholder="Ask a question about your projects, tasks, or team..."
    value={query}
    onChange={e => setQuery(e.target.value)}
  />

  <Button onClick={executeQuery}>Ask</Button>

  {results && (
    <ResultsDisplay
      data={results.data}
      visualization={results.chartType}
      sql={results.generatedSql}
    />
  )}
</div>
```

#### B. Example Queries
- "Show me tasks completed in the last 7 days"
- "Which projects have the most overdue tasks?"
- "List all team members who haven't logged in this week"
- "What's the average task completion time by project?"
- "Show me trending activity by hour of day"

#### C. Visualizations
- Table view (default)
- Bar chart
- Line graph
- Pie chart
- Timeline

#### D. Query History
- Save favorite queries
- Recent queries list
- Share queries with team
- Schedule queries (daily/weekly reports)

**Implementation:**
```typescript
// src/services/mcpService.ts
class MCPService {
  async query(naturalLanguageQuery: string) {
    const response = await fetch('/api/mcp/query', {
      method: 'POST',
      body: JSON.stringify({ query: naturalLanguageQuery })
    });

    return response.json();
    // Returns: { data: [], chartType: 'bar', generatedSql: '...' }
  }

  async getTools() {
    // Get available MCP tools/capabilities
  }

  async saveQuery(query: string, name: string) {
    // Save to favorites
  }
}
```

**UI Location:**
- New page: `/analytics`
- Or: Dashboard widget
- Or: Settings > Advanced > Data Explorer

---

### 5. Performance Optimizations

#### A. Redis Cache Implementation
**Currently:** Cache errors (NOAUTH Authentication required)
**Fix:** Configure Redis auth properly

```bash
# Install Redis
apt-get install redis-server

# Configure Redis auth
redis-cli
> CONFIG SET requirepass "your-secure-password"
> AUTH your-secure-password
> CONFIG REWRITE
```

**Update server:**
```javascript
// lib/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// Use for OAuth token caching
// Use for API response caching
// Use for session storage
```

#### B. CDN for Static Assets
- Upload build/ assets to CDN
- Update URLs in HTML
- Enable gzip/brotli compression
- Set long cache headers

**Providers to consider:**
- Cloudflare (free tier)
- AWS CloudFront
- Fastly

#### C. WebSocket for Real-time Updates
```javascript
// server-collaboration.js (already exists)
io.on('connection', (socket) => {
  socket.on('subscribe-project', (projectId) => {
    socket.join(`project-${projectId}`);
  });

  // Emit when task status changes
  io.to(`project-${projectId}`).emit('task-updated', task);
});
```

**Frontend:**
```typescript
// hooks/useRealtime.ts
export function useRealtime(projectId: string) {
  useEffect(() => {
    const socket = io('https://fluxstudio.art');
    socket.emit('subscribe-project', projectId);

    socket.on('task-updated', (task) => {
      // Update local state
    });

    return () => socket.disconnect();
  }, [projectId]);
}
```

#### D. Code Splitting
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', '@radix-ui/react-*'],
          'integrations': ['./src/components/organisms/*Integration.tsx']
        }
      }
    }
  }
});
```

---

### 6. Additional Integrations (Future)

#### A. Google Drive
- OAuth integration
- File picker
- Upload to Drive
- Embed Drive files
- Real-time collaboration

#### B. Jira
- Issue sync (like GitHub)
- Sprint tracking
- Epic linking
- Agile board view

#### C. Trello
- Board sync
- Card ↔ Task mapping
- Label synchronization
- Due date sync

#### D. Asana
- Project sync
- Task mapping
- Team sync
- Progress tracking

---

## 📊 Success Metrics

### Phase 2 Completion Criteria

- [ ] GitHub OAuth working end-to-end
- [ ] Repository linking functional
- [ ] Issue sync bidirectional
- [ ] Figma component sync working
- [ ] Design token export functional
- [ ] Slack task creation working
- [ ] Slack automation configured
- [ ] MCP UI deployed and tested
- [ ] Redis cache operational
- [ ] WebSocket real-time updates live
- [ ] Performance improved (>50% faster)
- [ ] User testing completed
- [ ] Documentation updated

### Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Page Load Time | ~150ms | <100ms | 33% faster |
| API Response | ~200ms | <100ms | 50% faster |
| Bundle Size | 1.71 MB | <1.5 MB | 12% smaller |
| Time to Interactive | ~2s | <1s | 50% faster |

---

## 🛠️ Technical Requirements

### Development Environment
- Node.js 18+
- PostgreSQL 14
- Redis 6+
- Git
- PM2 (production)

### New Dependencies
```json
{
  "@octokit/rest": "^19.0.0",           // GitHub API
  "socket.io": "^4.5.0",                // WebSocket
  "socket.io-client": "^4.5.0",         // WebSocket client
  "ioredis": "^5.3.0",                  // Redis client
  "recharts": "^2.5.0",                 // Charts for MCP
  "react-syntax-highlighter": "^15.5.0" // SQL display
}
```

### Database Migrations
- 008_github_integration.sql
- 009_figma_components.sql
- 010_slack_notifications.sql
- 011_mcp_query_history.sql

---

## 📚 Documentation Plan

### New Documentation
1. **GITHUB_OAUTH_GUIDE.md** (15,000 words)
   - GitHub app setup
   - Webhook configuration
   - API usage examples

2. **ADVANCED_FEATURES_GUIDE.md** (10,000 words)
   - Component library sync
   - Design token extraction
   - Slack automation

3. **MCP_USER_GUIDE.md** (8,000 words)
   - Natural language queries
   - Visualization options
   - Query examples

4. **PERFORMANCE_OPTIMIZATION.md** (5,000 words)
   - Redis setup
   - CDN configuration
   - WebSocket guide

### Updated Documentation
- PHASE_1_COMPLETE.md → Add Phase 2 results
- OAUTH_TESTING_GUIDE.md → Add GitHub testing
- Production deployment guide

---

## 🚧 Risks & Mitigation

### Risk 1: GitHub API Rate Limiting
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Implement caching for GitHub data
- Use conditional requests (ETags)
- Consider GitHub App instead of OAuth App (higher limits)

### Risk 2: Complex Issue Sync Logic
**Impact:** High
**Probability:** High
**Mitigation:**
- Start with one-way sync (GitHub → FluxStudio)
- Add bidirectional after testing
- Implement conflict resolution UI

### Risk 3: Redis Configuration
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Test locally first
- Use managed Redis (DigitalOcean)
- Implement graceful fallback

### Risk 4: Performance Regression
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Benchmark before and after
- Load testing with k6
- Monitor production metrics

---

## 💰 Cost Considerations

### Infrastructure Costs
- **Redis:** $15/month (DigitalOcean managed)
- **CDN:** $0-20/month (Cloudflare free tier likely sufficient)
- **Additional Storage:** $5/month (for GitHub cache)
- **Total:** ~$20-40/month additional

### API Costs
- GitHub API: Free (5,000 requests/hour)
- Figma API: Free (unlimited for team files)
- Slack API: Free
- **Total:** $0/month

---

## 🎯 Phase 2 Deliverables

### Code Deliverables
1. GitHub integration (OAuth + all features)
2. Advanced Figma features (3 new features)
3. Advanced Slack features (4 new features)
4. MCP UI (complete interface)
5. Redis cache implementation
6. WebSocket real-time updates
7. Performance optimizations

### Documentation Deliverables
1. GitHub OAuth guide
2. Advanced features guide
3. MCP user guide
4. Performance optimization guide
5. Updated testing guide
6. API reference updates

### Testing Deliverables
1. Unit tests for new features
2. Integration tests for GitHub sync
3. E2E tests for MCP
4. Performance benchmarks
5. User acceptance testing

---

## 📞 Stakeholder Communication

### Weekly Status Updates
- Progress on GitHub integration
- Performance metrics
- Blockers and risks
- Next week's plan

### Demo Schedule
- Week 1: GitHub OAuth demo
- Week 2: Advanced features demo
- Week 3: Final demo + user testing

---

## ✅ Definition of Done

Phase 2 is complete when:
- ✅ All features implemented and tested
- ✅ GitHub OAuth working end-to-end
- ✅ Issue sync bidirectional
- ✅ MCP UI deployed
- ✅ Performance targets met
- ✅ Redis cache operational
- ✅ Documentation complete
- ✅ User testing positive
- ✅ Production deployment successful
- ✅ No critical bugs

---

**Prepared by:** Claude Code AI
**Date:** October 17, 2025
**Version:** 1.0
**Status:** Planning - Awaiting Phase 1 User Testing Completion
