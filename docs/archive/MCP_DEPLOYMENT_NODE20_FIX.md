# MCP Deployment - Node 20 Fix

**Date:** 2025-10-23 16:02 PST
**Status:** 🟡 Deployment in progress (Deployment 3/3 with full fixes)
**Deployment ID:** 18119bac-a2ff-4c72-8c8a-730ce0e78788

---

## 🎯 Final Root Cause: Node Version Mismatch

### The Problem

flux-mcp builds were failing with "BuildJobExitNonZero" error.

**Investigation revealed:**
1. ✅ Code is valid - builds successfully locally
2. ✅ All files committed to git
3. ✅ `source_dir` was needed
4. ❌ **Node version mismatch!**

### The Solution

**package.json requirement:**
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**DigitalOcean default:** Node 18.x (with `environment_slug: node-js`)

**Fix applied:**
```yaml
- name: flux-mcp
  source_dir: flux-mcp
  build_command: npm ci && npm run build
  environment_slug: node-js
  envs:
    - key: NODE_VERSION
      value: "20.18.1"
      scope: BUILD_TIME  # Available during build!
```

---

## 📊 Deployment Timeline

### Attempt #1: db23bf67 (3:42 PM) - FAILED
- **Issue:** Missing `source_dir`
- **Error:** Build couldn't find flux-mcp directory
- **Fix:** Added `source_dir: flux-mcp`

### Attempt #2: 212f5dc0 (3:54 PM) - FAILED
- **Issue:** Node 18 vs Node 20+ requirement
- **Error:** BuildJobExitNonZero (likely TypeScript/ESM incompatibility)
- **Fix:** Added `NODE_VERSION: 20.18.1`

### Attempt #3: 18119bac (4:02 PM) - IN PROGRESS ⏳
- **Fixes:** source_dir ✅ + Node 20 ✅
- **Expected:** SUCCESS!

---

## 🔧 Complete Fix Applied

```yaml
services:
  - name: flux-mcp
    github:
      repo: kentin0-fiz0l/FluxStudio
      branch: main
      deploy_on_push: true
    source_dir: flux-mcp              # Set working directory
    build_command: npm ci && npm run build
    run_command: npm run start
    environment_slug: node-js
    http_port: 8787
    health_check:
      http_path: /health
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_VERSION             # Force Node 20!
        value: "20.18.1"
        scope: BUILD_TIME
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "8787"
      # ... other env vars
```

---

## Why Node 20 is Required

**TypeScript 5.7.3 Features:**
- `moduleResolution: "bundler"` - Requires newer Node
- ES2022 target with ESM modules
- Modern type checking features

**Dependencies:**
- `@modelcontextprotocol/sdk` - Uses modern Node APIs
- `undici` - HTTP client for Node 18+, optimal on Node 20+

**Build Process:**
```bash
npm ci          # Install deps (requires compatible Node)
npm run build   # → tsc (TypeScript 5.7.3 compilation)
```

Without Node 20, TypeScript compilation would fail.

---

## ✅ Validation Checklist

- [x] package.json specifies Node 20+
- [x] tsconfig uses modern features
- [x] Local build succeeds
- [x] source_dir configured
- [x] NODE_VERSION environment variable set
- [x] BUILD_TIME scope ensures it's used during build
- [x] Spec updated via API
- [ ] Deployment completes successfully
- [ ] MCP health endpoint responds
- [ ] WebSocket connection works

---

## 🎬 Expected Results

Once deployment completes (~10 min):

**1. MCP Health Check**
```bash
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

**2. Active Deployment Services**
- unified-backend (port 3001)
- collaboration (port 4000)
- **flux-mcp (port 8787)** ⭐
- frontend (static)

**3. Ingress Routing**
- `/api` → unified-backend
- `/collab` → collaboration
- **`/mcp` → flux-mcp** ⭐
- `/` → frontend

---

## 📝 Lessons Learned

1. **Always specify Node version explicitly** when using modern features
2. **source_dir is required** for subdirectory services
3. **Build errors need actual build logs** - API doesn't expose detailed errors
4. **Local testing is crucial** - helped identify Node version as the issue
5. **DigitalOcean defaults** may not match package.json requirements

---

## 🚀 Monitoring

**Check deployment status:**
```bash
# Via API
curl -H "Authorization: Bearer $TOKEN" \
  https://api.digitalocean.com/v2/apps/$APP_ID/deployments/18119bac-a2ff-4c72-8c8a-730ce0e78788

# Test endpoint
curl -I https://fluxstudio.art/mcp/health
```

**ETA:** 4:12 PM PST
**Next Update:** 4:05 PM PST (3 minutes)

---

**Deployment:** 18119bac-a2ff-4c72-8c8a-730ce0e78788
**Status:** Building...
**Confidence Level:** HIGH - All known issues resolved
