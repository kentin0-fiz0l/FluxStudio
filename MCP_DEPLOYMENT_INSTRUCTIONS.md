# MCP MVP Production Deployment Instructions

## Status: READY FOR DEPLOYMENT

All agent reviews have APPROVED the MCP MVP implementation:
- Code Review: APPROVED
- Security Review: APPROVED
- UX Review: APPROVED
- Tech Lead Review: APPROVED

---

## Step 1: Create Pull Request

Since gh CLI authentication is currently failing, create the PR via GitHub web interface:

### Instructions:

1. Navigate to: https://github.com/kentin0-fiz0l/FluxStudio/compare/main...feat/mcp-mvp

2. Click "Create pull request"

3. **Title:**
   ```
   MCP MVP: AI-powered build management with security hardening
   ```

4. **Description:**
   Copy the entire contents from `/Users/kentino/FluxStudio/MCP_MVP_PR_DESCRIPTION.md`

5. Click "Create pull request"

6. Self-approve the PR (you are the owner)

7. Merge the PR using "Squash and merge" or "Merge commit" (your preference)

---

## Step 2: Configure DigitalOcean Secrets

### Generated Credentials

**MCP Auth Token (Generated):**
```
81014aba878ef97a4f3dc9d964647f7e9ee00c6c6d1ddfd7a56b5fb9312e2f10
```

**IMPORTANT:** This token has been cryptographically generated with 256 bits of entropy (32 bytes). Store it securely.

### DigitalOcean Configuration

1. **Navigate to App Settings:**
   - Go to: https://cloud.digitalocean.com/apps
   - Select the `fluxstudio` app
   - Go to "Settings" → "App-Level Environment Variables" OR service-specific environment variables

2. **Configure flux-mcp Service Secrets:**

   Navigate to: Settings → Components → flux-mcp → Environment Variables

   Add the following secrets:

   | Variable Name | Type | Value |
   |--------------|------|-------|
   | `MCP_AUTH_TOKEN` | Secret (encrypted) | `81014aba878ef97a4f3dc9d964647f7e9ee00c6c6d1ddfd7a56b5fb9312e2f10` |
   | `GITHUB_TOKEN` | Secret (encrypted) | Your GitHub PAT (see below) |
   | `GITHUB_OWNER` | Secret (encrypted) | `kentin0-fiz0l` |

3. **Configure frontend Service Secrets:**

   Navigate to: Settings → Components → frontend → Environment Variables

   Add the following secret:

   | Variable Name | Type | Value |
   |--------------|------|-------|
   | `VITE_MCP_AUTH_TOKEN` | Secret (encrypted) | `81014aba878ef97a4f3dc9d964647f7e9ee00c6c6d1ddfd7a56b5fb9312e2f10` |

   **Note:** This MUST be the same token as `MCP_AUTH_TOKEN`

### GitHub Personal Access Token (PAT)

If you don't have a GitHub PAT with the required permissions, create one:

1. Go to: https://github.com/settings/tokens/new
2. Select "Fine-grained token"
3. **Token name:** `FluxStudio MCP Production`
4. **Expiration:** 90 days (or custom)
5. **Repository access:** Only select repositories → `kentin0-fiz0l/FluxStudio`
6. **Permissions:**
   - Repository permissions → Actions: Read and write
7. Click "Generate token"
8. Copy the token and save it securely
9. Add it as `GITHUB_TOKEN` secret in DigitalOcean (step 2 above)

---

## Step 3: Configure GitHub Repository Secrets

Verify these secrets exist in your GitHub repository:

1. Navigate to: https://github.com/kentin0-fiz0l/FluxStudio/settings/secrets/actions

2. **Required Secrets:**

   | Secret Name | Value | Purpose |
   |-------------|-------|---------|
   | `DIGITALOCEAN_ACCESS_TOKEN` | Your DO token | Deploy to App Platform |
   | `VITE_MCP_WS_URL` | `wss://fluxstudio.art/mcp` | MCP WebSocket URL |
   | `VITE_SOCKET_URL` | `wss://fluxstudio.art` | Socket.IO URL |
   | `VITE_APP_URL` | `https://fluxstudio.art` | App URL |

3. If any are missing, click "New repository secret" and add them

---

## Step 4: Monitor GitHub Actions Deployment

After merging the PR, the deployment will automatically start:

### Monitor Deployment:

1. Navigate to: https://github.com/kentin0-fiz0l/FluxStudio/actions

2. Click on the latest "Deploy to DigitalOcean App Platform" workflow run

3. **Expected Steps:**
   - Checkout code
   - Setup Node.js
   - Install dependencies (root)
   - Install MCP server dependencies
   - **Build MCP server** ← NEW STEP
   - Build web application
   - Deploy to DigitalOcean
   - Report deployment status

4. **Watch for:**
   - Green checkmarks on all steps
   - Build time: ~5-8 minutes
   - Deployment success message

### If Deployment Fails:

1. Check build logs for errors
2. Common issues:
   - Missing secrets (check DigitalOcean App Platform settings)
   - Build errors (check package.json scripts)
   - Health check failures (check server logs in DigitalOcean)

---

## Step 5: Verify Production Deployment

### Health Check Verification

1. **Test MCP Server Health:**
   ```bash
   curl https://fluxstudio.art/health
   ```

   **Expected Response:**
   ```json
   {
     "status": "healthy",
     "service": "flux-mcp",
     "version": "1.0.0"
   }
   ```

2. **Test Main API Health:**
   ```bash
   curl https://fluxstudio.art/api/health
   ```

### WebSocket Connection Test

You can't easily test WebSocket from command line, so use the browser:

1. Navigate to: https://fluxstudio.art/connectors
2. Check that "Flux Deploy" shows as "Connected" (green status)
3. Open browser console (F12)
4. Look for: `[MCP Client] Connected` log message

### UI Verification

1. **Connectors Page:**
   - Navigate to: https://fluxstudio.art/connectors
   - Verify "Flux Deploy" integration shows as "Connected"
   - Verify UI renders correctly

2. **AI Workspace Panel:**
   - Look for floating button on right edge of screen
   - Click to open AI Workspace panel
   - Verify "MCP Server Connected" indicator in footer
   - Check both "Preview" and "Logs" tabs render

### Authentication Test

1. **Open AI Workspace Panel**
2. **Test Preview Form:**
   - Enter a valid branch name (e.g., `feat/mcp-mvp`)
   - Click "Create Preview"
   - Should succeed if authenticated correctly
   - If fails with "Unauthorized", check token configuration

### Rate Limiting Test

Open browser console and run this JavaScript:

```javascript
// Test rate limiting (should fail after 30 requests)
async function testRateLimit() {
  const client = new WebSocket('wss://fluxstudio.art/mcp?token=81014aba878ef97a4f3dc9d964647f7e9ee00c6c6d1ddfd7a56b5fb9312e2f10');

  client.onopen = () => {
    console.log('Connected');
    for (let i = 0; i < 35; i++) {
      client.send(JSON.stringify({
        jsonrpc: '2.0',
        id: i,
        method: 'tools/list'
      }));
    }
  };

  client.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.error?.code === -32000) {
      console.log('Rate limit hit:', msg.error.message);
    }
  };
}

testRateLimit();
```

**Expected:** After 30 requests, you should see rate limit error messages.

---

## Step 6: Production Testing Checklist

Complete this checklist to verify all features work:

### MCP Server Tests

- [ ] Health check returns 200 OK
- [ ] WebSocket connection succeeds with valid token
- [ ] WebSocket connection fails with invalid token (test with wrong token)
- [ ] Rate limiting triggers after 30 requests in 60 seconds
- [ ] Server logs show connection events

### Frontend Tests

- [ ] Connectors page loads successfully
- [ ] "Flux Deploy" integration shows as "Connected"
- [ ] AI Workspace panel opens/closes correctly
- [ ] Preview tab renders form correctly
- [ ] Logs tab renders input correctly
- [ ] MCP connection status shows "Connected"

### Integration Tests

- [ ] Create preview for a test branch (e.g., `feat/mcp-mvp`)
- [ ] Verify preview deployment triggers in GitHub Actions
- [ ] Get run ID from preview result
- [ ] Fetch logs using run ID
- [ ] Verify logs display correctly
- [ ] Check GitHub Actions run completes successfully

### Error Handling Tests

- [ ] Test with invalid branch name (should show error)
- [ ] Test with invalid run ID (should show error)
- [ ] Disconnect internet and verify reconnection works
- [ ] Test rate limiting (should show rate limit error after 30 req)

---

## Step 7: Rollback Plan (If Needed)

If critical issues are discovered:

### Option 1: Revert the Merge Commit

```bash
# Find the merge commit hash
git log --oneline main | head -5

# Revert the merge commit
git revert -m 1 <merge-commit-hash>

# Push to trigger redeployment
git push origin main
```

### Option 2: Manual Rollback in DigitalOcean

1. Go to: DigitalOcean App Platform > fluxstudio > Settings
2. Navigate to "Deployments" tab
3. Find the previous successful deployment
4. Click "Redeploy"

### Option 3: Disable MCP Server

If you want to keep the merge but disable MCP:

1. Go to: DigitalOcean App Platform > fluxstudio > Settings
2. Navigate to Components > flux-mcp
3. Scale instance count to 0
4. Save changes

---

## Success Criteria

Deployment is successful when ALL of the following are true:

- ✅ PR merged to main without conflicts
- ✅ GitHub Actions deployment completes successfully
- ✅ All health checks passing in DigitalOcean
- ✅ MCP server accessible at `wss://fluxstudio.art/mcp`
- ✅ Frontend loads without errors
- ✅ Connectors page shows "Flux Deploy" as connected
- ✅ AI Workspace panel opens and connects to MCP server
- ✅ Preview creation works (triggers GitHub Actions)
- ✅ Log fetching works (displays workflow run info)
- ✅ Authentication verified (requires token)
- ✅ Rate limiting verified (30 req/min enforced)
- ✅ No console errors in browser
- ✅ No server errors in DigitalOcean logs

---

## Troubleshooting

### Issue: MCP Server Health Check Fails

**Symptoms:** Health check at `/health` returns 503 or timeout

**Diagnosis:**
1. Check DigitalOcean logs for flux-mcp service
2. Look for startup errors or crashes

**Solutions:**
- Verify all required environment variables are set
- Check PORT is set to 8787
- Verify TRANSPORT is set to "websocket"
- Ensure GITHUB_TOKEN is valid

### Issue: WebSocket Connection Refused

**Symptoms:** Browser console shows WebSocket connection error

**Diagnosis:**
1. Check if MCP server is running (health check)
2. Verify WebSocket routing in DigitalOcean

**Solutions:**
- Verify `.do/app.yaml` has correct route: `/mcp`
- Check VITE_MCP_WS_URL is `wss://fluxstudio.art/mcp`
- Ensure MCP_AUTH_TOKEN matches between frontend and server

### Issue: Authentication Fails

**Symptoms:** WebSocket closes immediately with "Unauthorized"

**Diagnosis:**
1. Check browser console for auth token
2. Verify token in DigitalOcean matches

**Solutions:**
- Regenerate token if needed
- Update both `MCP_AUTH_TOKEN` and `VITE_MCP_AUTH_TOKEN`
- Redeploy both services after updating

### Issue: Rate Limiting Too Aggressive

**Symptoms:** Users hitting rate limits during normal usage

**Solutions:**
1. Increase rate limit in `apps/flux-mcp/src/server.ts`:
   ```typescript
   const rateLimiter = new RateLimiter(60000, 50); // 50 req/min instead of 30
   ```
2. Commit and redeploy

### Issue: GitHub Actions Fails to Trigger

**Symptoms:** Preview creation succeeds but no workflow run

**Diagnosis:**
1. Check GitHub token permissions
2. Verify workflow file exists in `.github/workflows/deploy.yml`

**Solutions:**
- Ensure GITHUB_TOKEN has `actions:write` permission
- Verify GITHUB_OWNER and GITHUB_REPO are correct
- Check workflow dispatch permissions in GitHub repo settings

---

## Post-Deployment Actions

After successful deployment:

1. **Announce the feature:**
   - Update changelog
   - Notify team members
   - Add to release notes

2. **Monitor for 24 hours:**
   - Check DigitalOcean logs for errors
   - Monitor GitHub Actions usage
   - Watch for rate limiting issues
   - Track WebSocket connection stability

3. **Gather feedback:**
   - Test with real workflows
   - Identify UX improvements
   - Document any edge cases

4. **Plan enhancements:**
   - Review agent recommendations from this deployment
   - Prioritize: Monitoring, load testing, error handling improvements
   - Schedule follow-up sprint

---

## Generated Artifacts

The following files have been created for this deployment:

1. `/Users/kentino/FluxStudio/MCP_MVP_PR_DESCRIPTION.md` - PR description
2. `/Users/kentino/FluxStudio/MCP_DEPLOYMENT_INSTRUCTIONS.md` - This file
3. `/Users/kentino/FluxStudio/docs/mcp.md` - MCP documentation (already in repo)

## Credentials Reference

**MCP Auth Token:**
```
81014aba878ef97a4f3dc9d964647f7e9ee00c6c6d1ddfd7a56b5fb9312e2f10
```

**Important:** After deployment, store this token in your password manager and delete this file for security.

---

## Next Steps

1. [ ] Create PR via GitHub web interface
2. [ ] Configure DigitalOcean secrets
3. [ ] Merge PR
4. [ ] Monitor GitHub Actions deployment
5. [ ] Verify production deployment
6. [ ] Complete testing checklist
7. [ ] Generate production verification report

**Estimated Time:** 30-45 minutes

**Ready to proceed!**
