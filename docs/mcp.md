# Flux Studio MCP Server

Model Context Protocol (MCP) server for Flux Studio, providing AI-powered build management and deployment automation via GitHub Actions integration.

## Overview

The Flux MCP server exposes two primary tools:

1. **`builds.createPreview`** - Trigger preview deployments for Git branches
2. **`builds.tailLogs`** - Fetch workflow run status and logs

The server runs as a WebSocket service and integrates with DigitalOcean App Platform for automated PR previews and production deployments.

## Architecture

```
┌─────────────────┐      WebSocket      ┌──────────────┐
│  Flux Studio    │ ←──────────────────→ │  MCP Server  │
│  Frontend (UI)  │      JSON-RPC        │  (Node.js)   │
└─────────────────┘                      └──────┬───────┘
                                                 │
                                                 │ GitHub API
                                                 ↓
                                         ┌──────────────────┐
                                         │  GitHub Actions  │
                                         │  Workflows       │
                                         └──────────────────┘
```

## Local Development

### Prerequisites

- Node.js 20+
- npm or yarn
- GitHub Personal Access Token (fine-grained)

### Setup

1. **Navigate to MCP server directory:**

   ```bash
   cd apps/flux-mcp
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**

   ```bash
   # .env
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GITHUB_OWNER=your-github-username
   GITHUB_REPO=FluxStudio
   GITHUB_WORKFLOW_FILE=deploy.yml
   PORT=8787
   NODE_ENV=development
   ```

   **GitHub Token Requirements:**
   - Repository access to your FluxStudio repo
   - Permissions: `actions:write` (to dispatch workflows), `actions:read` (to read run status)

5. **Start the server:**

   ```bash
   npm run dev
   ```

   The server will start on `ws://localhost:8787/mcp`

### Frontend Configuration

Point the web app to your local MCP server:

```bash
# In the root .env file
VITE_MCP_WS_URL=ws://localhost:8787/mcp
```

Then start the web application:

```bash
npm run dev
```

## Testing

### Manual Testing

1. **Health Check:**

   ```bash
   curl http://localhost:8787/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "flux-mcp",
     "version": "1.0.0"
   }
   ```

2. **WebSocket Connection:**

   Use the Flux Studio UI to test the MCP tools:
   - Open AI Workspace panel (right sidebar)
   - Navigate to "Preview" tab
   - Enter a branch name (e.g., `feat/test`)
   - Click "Create Preview"

3. **Check Logs:**

   - Copy the run ID from the preview result
   - Navigate to "Logs" tab
   - Enter the run ID
   - Click "Fetch"

### Automated Tests

```bash
npm run test
```

## Claude Code Integration

You can connect Claude Code directly to the MCP server:

1. Open Claude Code Settings
2. Navigate to MCP section
3. Add WebSocket connection:
   - URL: `ws://localhost:8787/mcp`
   - Name: `Flux MCP`

4. Test tools:
   ```
   Use builds.createPreview to deploy branch feat/example
   ```

## API Reference

### Tool: `builds.createPreview`

Triggers a GitHub Actions workflow dispatch for a specific branch.

**Input Schema:**

```typescript
{
  branch: string;          // Required: Git branch name
  payload?: object;        // Optional: Workflow dispatch inputs
}
```

**Example:**

```json
{
  "branch": "feat/new-feature",
  "payload": {
    "environment": "preview"
  }
}
```

**Response:**

```json
{
  "run_id": 12345678,
  "status": "queued",
  "html_url": "https://github.com/owner/repo/actions/runs/12345678",
  "created_at": "2025-10-22T12:00:00Z",
  "head_branch": "feat/new-feature"
}
```

### Tool: `builds.tailLogs`

Fetches workflow run status and logs URL.

**Input Schema:**

```typescript
{
  run_id: number;  // Required: GitHub Actions run ID
}
```

**Example:**

```json
{
  "run_id": 12345678
}
```

**Response (formatted text):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workflow Run: Deploy to DigitalOcean App Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run ID:      #12345678
Status:      completed
Conclusion:  success
Created:     10/22/2025, 12:00:00 PM
Updated:     10/22/2025, 12:05:00 PM

🔗 Links:
   Web UI:   https://github.com/owner/repo/actions/runs/12345678
   Logs ZIP: https://github.com/owner/repo/actions/runs/12345678/logs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Production Deployment

The MCP server is automatically deployed to DigitalOcean App Platform via the `flux-mcp` service defined in `.do/app.yaml`.

### Environment Variables (Production)

Set these in DigitalOcean App Platform:

| Variable | Type | Description |
|----------|------|-------------|
| `GITHUB_TOKEN` | Secret | GitHub Personal Access Token |
| `GITHUB_OWNER` | Secret | GitHub repository owner |
| `GITHUB_REPO` | Plain | Repository name (FluxStudio) |
| `GITHUB_WORKFLOW_FILE` | Plain | Workflow filename (deploy.yml) |
| `PORT` | Plain | Server port (8787) |
| `NODE_ENV` | Plain | Environment (production) |
| `TRANSPORT` | Plain | Transport mode (websocket) |

### Production URL

```
wss://fluxstudio.art/mcp
```

## Troubleshooting

### Connection Refused

**Problem:** Cannot connect to MCP server

**Solutions:**
- Check server is running: `curl http://localhost:8787/health`
- Verify port is not in use: `lsof -i :8787`
- Check firewall settings

### GitHub API Rate Limit

**Problem:** "rate limit exceeded" errors

**Solutions:**
- Use authenticated requests (ensure `GITHUB_TOKEN` is set)
- GitHub authenticated rate limit: 5,000 requests/hour
- Wait for rate limit reset (check headers in error response)

### Workflow Not Found

**Problem:** "No workflow runs found for this branch"

**Solutions:**
- Ensure branch exists in repository
- Verify workflow file name matches `GITHUB_WORKFLOW_FILE`
- Check workflow has run at least once for the branch
- Wait 2-3 seconds after dispatch (initial delay in code)

### Invalid Token

**Problem:** "Failed to dispatch workflow: 401" or "Failed to fetch run info: 401"

**Solutions:**
- Verify `GITHUB_TOKEN` is valid
- Check token has required permissions (`actions:write`, `actions:read`)
- Regenerate token if expired

## Security Considerations

1. **Token Security:**
   - Never commit `.env` files
   - Use fine-grained tokens with minimal permissions
   - Rotate tokens regularly

2. **Production:**
   - All tokens stored as encrypted secrets in DigitalOcean
   - WebSocket connections over TLS (wss://)
   - CORS restricted to fluxstudio.art domain

3. **Rate Limiting:**
   - GitHub API has rate limits (5000/hour authenticated)
   - MCP server doesn't implement additional rate limiting
   - Consider adding rate limiting for public deployments

## Contributing

When modifying the MCP server:

1. Update schemas in `src/schema.ts`
2. Implement tool logic in `src/github.ts`
3. Update server handlers in `src/server.ts`
4. Add tests for new functionality
5. Update this documentation

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [GitHub Actions REST API](https://docs.github.com/en/rest/actions)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Flux Studio Documentation](../README.md)
