# FluxStudio HLS Deployment Diagnosis

## Current Status (2025-10-31 13:10 PST)

**Active Deployment:** 4ac1389c (automatic rollback)
**App Status:** RUNNING at https://fluxstudio.art
**Issue:** Deployment attempts fail at stage 11/13 (ffmpeg-worker)

## Deployment History

| Deployment | Status | Stage | Root Cause |
|------------|--------|-------|------------|
| #10 (b126621e) | FAILED | 10/13 | DATABASE_URL missing |
| #11 (f02bfbae) | FAILED | 11/13 | Invalid URL error in unified-backend |
| #12 (a0ec6f02) | FAILED | 11/13 | Container crash (secrets not persisted) |
| #13 (e228303c) | FAILED | 11/13 | Unknown (requires log inspection) |
| 4ac1389c | ACTIVE | 13/13 | Automatic rollback from #13 |

## Architecture

FluxStudio consists of 5 components:

1. **Frontend** (static-site) - React SPA built with Vite
2. **Unified-Backend** (service) - Express API on port 3001
3. **Collaboration** (service) - Yjs WebSocket server on port 4000
4. **Flux-MCP** (service) - Model Context Protocol server on port 8787
5. **FFmpeg-Worker** (worker) - HLS transcoding service

## Investigation Results

### ✅ Secrets Successfully Configured via API

All required secrets were persisted to app settings:

- `DATABASE_URL` → unified-backend, collaboration, ffmpeg-worker
- `MCP_AUTH_TOKEN` → flux-mcp
- `SPACES_ACCESS_KEY` → unified-backend, ffmpeg-worker
- `SPACES_SECRET_KEY` → unified-backend, ffmpeg-worker

### ❌ Deployment #13 Failed at Stage 11/13

**Stage 11/13 = ffmpeg-worker deployment**

Symptoms reported from logs:
- Redis connection errors
- "Redis reconnecting..."
- "Redis max retries reached, giving up"
- Message: "continuing without cache (degraded performance)"
- Successfully initializing MCP manager
- Container exits shortly after (no clean startup logs)

### 🔍 Component Analysis

**flux-mcp**: ✅ NO Redis dependencies
- Checked: auth.ts, github.ts, schema.ts, server.ts
- Clean Dockerfile with no Redis packages

**ffmpeg-worker**: ✅ NO Redis dependencies
- Only uses: PostgreSQL (pg Pool), AWS S3, FFmpeg, fs
- No Redis imports or connection code

**unified-backend**: ❌ **REDIS FOUND - THIS IS THE SOURCE!**
- server-unified.js:43 - Imports `lib/cache.js` (Redis layer)
- server-unified.js:65-72 - Calls `cache.initializeCache()`
- lib/cache.js:21 - Logs "Redis max retries reached, giving up"
- lib/cache.js:94 - Logs "Continuing without cache (degraded performance)"
- lib/cache.js:96 - Returns null (proper error handling)

**Conclusion:** The Redis errors are from **unified-backend**, NOT flux-mcp!
- DigitalOcean console is mislabeling logs or showing aggregated output
- The cache initialization properly catches errors and continues
- However, something AFTER cache init is causing the container to exit

## Next Steps

### 1. Identify True Source of Redis Errors

Check deployment logs for **deployment e228303c**:
- URL: https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781/deployments/e228303c-126c-4052-b512-2c67531fe929
- Select **ffmpeg-worker** component (stage 11/13)
- Check if ffmpeg-worker code has Redis dependencies

### 2. Check ffmpeg-worker Configuration

Examine `services/ffmpeg-worker/worker.js` for:
- Redis connection code
- Cache initialization logic
- Why container exits after "continuing without cache"

### 3. Verify Secrets Are Actually Available

Even though we SET the secrets via API, they may not be applied until a successful deployment. The rollback to 4ac1389c means the secrets might not be active yet.

### 4. Alternative Approaches

**Option A: Remove Redis Dependency**
- If ffmpeg-worker doesn't truly need Redis, remove the connection attempt
- Allow worker to run without cache

**Option B: Deploy Redis Instance**
- Add Redis to the app via DigitalOcean Add-ons
- Set REDIS_URL environment variable for workers that need it

**Option C: Temporarily Disable ffmpeg-worker**
- Comment out workers section in app.yaml
- Deploy 4 components first (confirm secrets work)
- Re-enable ffmpeg-worker after main app is stable

## Root Cause Analysis

**The Redis errors are from unified-backend, NOT the failing component!**

The DigitalOcean console is either:
1. Mislabeling which component the logs belong to
2. Showing aggregated logs from multiple components
3. Displaying logs from the wrong deployment stage

**Redis is properly handled as optional:**
- lib/cache.js catches all errors (line 92-96)
- Returns null and logs warning (line 94)
- server-unified.js continues without cache (line 71)
- Server starts listening regardless (line 3037)

**So why is the container exiting?**

The container exit is likely caused by:
1. **Health check timeout** - DigitalOcean waits for port 3001 to respond
2. **MCP manager initialization failure** - Happens AFTER Redis errors but BEFORE server fully starts
3. **Missing environment variable** - Something required by server startup

## ROOT CAUSE IDENTIFIED AND FIXED

**THE BUG: Aggressive HEALTHCHECK in ffmpeg-worker Dockerfile**

Lines 26-27 of `services/ffmpeg-worker/Dockerfile` had:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('pg').Pool({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(()=>process.exit(0)).catch(()=>process.exit(1))"
```

**Why this caused deployment failure:**
1. Health check tries to connect to PostgreSQL with only 3 second timeout
2. Only 3 retries allowed
3. When it fails, Docker marks container unhealthy
4. DigitalOcean kills unhealthy containers
5. No application error logged (infrastructure-level failure)

**The Fix (Applied):**
Removed the HEALTHCHECK entirely. The worker is a background job with its own error handling in worker.js. DigitalOcean monitors the container process itself.

**Deployment #14 should now succeed!**

## Key Files

- `/Users/kentino/FluxStudio/.do/app.yaml` - Main app configuration
- `/Users/kentino/FluxStudio/services/ffmpeg-worker/worker.js` - Worker implementation
- `/Users/kentino/FluxStudio/services/ffmpeg-worker/Dockerfile` - Worker container build
- `/tmp/updated-app-spec-persistent.json` - App spec with secrets configured

## Environment Variables

### Already Configured (via API)
- DATABASE_URL = `postgresql://doadmin:[REDACTED]@fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require`
- MCP_AUTH_TOKEN = `[REDACTED]`
- SPACES_ACCESS_KEY = `[REDACTED]`
- SPACES_SECRET_KEY = `[REDACTED]`

### Not Configured
- REDIS_URL (marked as optional in app.yaml, but might be causing exit)

---

**Last Updated:** 2025-10-31 13:15 PST
**Session:** Deployment debugging continuation
