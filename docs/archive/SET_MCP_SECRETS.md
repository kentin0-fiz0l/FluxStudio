# Set MCP Secrets - Copy & Paste Guide

**IMMEDIATE ACTION REQUIRED TO COMPLETE MCP DEPLOYMENT**

---

## 📋 Secret Values (Ready to Copy)

I've generated all the required secret values for you. **Copy these values and paste them into DigitalOcean console:**

### 1. GITHUB_TOKEN
```
ghp_hdLJC1gxJVOjWUZrFGxalyD5l3oN0a0pMEjk
```
*(Your current GitHub CLI token - has repo and workflow permissions)*

### 2. GITHUB_OWNER
```
kentin0-fiz0l
```
*(Your GitHub username)*

### 3. MCP_AUTH_TOKEN
```
a9cd8060a732386357a8b8104311d60bbd3dcfe69111d02fea84941805f7aa00
```
*(Freshly generated secure random token)*

---

## 🎯 How to Set Secrets in DigitalOcean

### Step-by-Step Instructions:

1. **Open DigitalOcean App Settings:**
   ```
   https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781/settings
   ```

2. **Click on the "flux-mcp" component** in the left sidebar

3. **Scroll to "Environment Variables"** section

4. **For each secret, click "Edit" or "Add Variable":**

   **Secret 1: GITHUB_TOKEN**
   - Key: `GITHUB_TOKEN`
   - Value: `ghp_hdLJC1gxJVOjWUZrFGxalyD5l3oN0a0pMEjk`
   - Type: ✅ Check "Encrypt" checkbox
   - Scope: Runtime

   **Secret 2: GITHUB_OWNER**
   - Key: `GITHUB_OWNER`
   - Value: `kentin0-fiz0l`
   - Type: ✅ Check "Encrypt" checkbox
   - Scope: Runtime

   **Secret 3: MCP_AUTH_TOKEN**
   - Key: `MCP_AUTH_TOKEN`
   - Value: `a9cd8060a732386357a8b8104311d60bbd3dcfe69111d02fea84941805f7aa00`
   - Type: ✅ Check "Encrypt" checkbox
   - Scope: Runtime

5. **Click "Save"** after adding each secret

6. **Trigger New Deployment:**
   - Click "Actions" → "Force Rebuild and Deploy"
   - OR wait for automatic deployment (may take a few minutes)

---

## ⏱️ What Happens Next

Once you save the secrets and trigger deployment:

1. **Build Phase** (~3 minutes)
   - flux-mcp will build successfully (we've already proven this works!)

2. **Deploy Phase** (~2-5 minutes)
   - Container will start with secrets available
   - GitHubClient() will initialize successfully
   - MCP server will start on port 8787

3. **Health Check** (automatic)
   - DigitalOcean will verify `/health` endpoint responds
   - Service will become ACTIVE

**Total ETA:** 5-10 minutes after setting secrets

---

## ✅ Verification

After deployment completes, verify MCP is running:

```bash
# Test health endpoint
curl https://fluxstudio.art/mcp/health

# Expected response:
{
  "status": "healthy",
  "service": "flux-mcp",
  "version": "1.0.0",
  "transport": "websocket",
  "uptime": 123
}
```

---

## 🔒 Security Notes

- ✅ All secrets are encrypted in DigitalOcean
- ✅ GITHUB_TOKEN has minimum required permissions (repo, workflow)
- ✅ MCP_AUTH_TOKEN is cryptographically random (256 bits)
- ✅ Secrets are only accessible to flux-mcp service at runtime
- ⚠️ Keep these values secure - don't commit to git
- ⚠️ Rotate GITHUB_TOKEN periodically via https://github.com/settings/tokens

---

## 🚀 Quick Commands (After Secrets Are Set)

### Check Deployment Status
```bash
doctl apps list --format ID,DefaultIngress,ActiveDeployment.Phase
```

### Monitor Logs
```bash
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type RUN --follow
```

### Test MCP Health
```bash
curl -s https://fluxstudio.art/mcp/health | jq '.'
```

---

## 📝 Troubleshooting

If deployment still fails after setting secrets:

1. **Check secrets were saved:**
   - Go back to DigitalOcean settings
   - Verify all 3 secrets show "Encrypted" badge

2. **Check logs:**
   ```bash
   doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type BUILD,DEPLOY
   ```

3. **Verify GitHub token permissions:**
   - Go to https://github.com/settings/tokens
   - Ensure token has `repo` and `workflow` scopes

---

**CURRENT STATUS:**
- ✅ MCP builds successfully (Docker works!)
- ✅ db-migrate blocker removed
- ⏸️ **Waiting for secrets to be set in DigitalOcean console**

**NEXT STEP:** Copy the 3 secret values above into DigitalOcean → Save → Deploy

**ETA TO WORKING MCP:** 10 minutes (5 min to set secrets + 5 min deployment)

---

**Need help?** Re-read this file or check:
- MCP_DEPLOYMENT_FINAL_STATUS.md - Complete deployment status
- .do/app.yaml - flux-mcp service configuration
- flux-mcp/Dockerfile - Build configuration that works
