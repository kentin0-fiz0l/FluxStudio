# Debug Collab

Diagnose Yjs and WebSocket collaboration sync issues in FluxStudio.

## Usage

```
/debug-collab [--logs] [--check-server] [--check-client]
```

## Instructions

When the user invokes this skill, systematically diagnose real-time collaboration issues in the FluxStudio Yjs/WebSocket architecture.

### Architecture Overview

FluxStudio's collaboration system:
- **server-collaboration.js** - Yjs WebSocket server on port 4000
- **Transport** - WebSocket (ws) with y-protocols for sync and awareness
- **CRDT** - Yjs documents for conflict-free collaborative editing
- **Auth** - JWT token validation on WebSocket upgrade
- **Socket.IO namespaces** (server-unified.js, port 3001):
  - `/auth` - Authentication events
  - `/messaging` - Chat and presence
  - `/printing` - 3D printing updates
  - `/design-boards` - Design board collaboration

### Diagnostic Checklist

Run through these checks in order:

#### 1. Server Health
- [ ] Is `server-collaboration.js` running on port 4000?
- [ ] Check for process errors: `lsof -i :4000`
- [ ] Verify JWT_SECRET is set in environment
- [ ] Check DATABASE_URL for document persistence
- [ ] Review recent server logs for errors

#### 2. WebSocket Connection
- [ ] Client can establish WebSocket connection to `ws://localhost:4000`
- [ ] JWT token is passed correctly (query param or header)
- [ ] Token is valid and not expired
- [ ] Connection upgrade succeeds (101 status)
- [ ] No CORS issues blocking the connection

#### 3. Yjs Sync Protocol
- [ ] Initial sync (messageSync = 0) completes
- [ ] Awareness updates (messageAwareness = 1) propagate
- [ ] Auth messages (messageAuth = 2) are handled
- [ ] Document state converges across clients
- [ ] No encoding/decoding errors in lib0 messages

#### 4. Document Persistence
- [ ] Autosave interval (30s) is working
- [ ] Documents persist to database on save
- [ ] Documents reload correctly on reconnection
- [ ] No data loss between sessions

#### 5. Socket.IO Integration
- [ ] Socket.IO server running on port 3001
- [ ] Namespaces `/auth`, `/messaging` responding
- [ ] Events propagate between connected clients
- [ ] Presence (who's online) updates correctly

### Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Can't connect | Port 4000 not running | Start `server-collaboration.js` |
| Auth fails | JWT_SECRET mismatch | Ensure same secret in both servers |
| Changes don't sync | Sync protocol error | Check y-protocols version compatibility |
| Stale data | Persistence failure | Verify DATABASE_URL and autosave |
| Duplicate cursors | Awareness leak | Check cleanup on disconnect handler |
| High latency | Too many clients | Review connection pooling and broadcasts |

### Diagnostic Commands

```bash
# Check if collab server is running
lsof -i :4000

# Check if main server is running
lsof -i :3001

# Watch collab server logs
npm run dev:collab 2>&1 | grep -E 'error|warn|sync|auth'

# Test WebSocket connection
npx wscat -c ws://localhost:4000

# Check Yjs document state
node -e "const Y = require('yjs'); const doc = new Y.Doc(); console.log(doc.toJSON());"
```

## Output

1. Results of each diagnostic check (pass/fail)
2. Identified issues with root cause analysis
3. Specific fix commands or code changes needed
4. Verification steps to confirm the fix
