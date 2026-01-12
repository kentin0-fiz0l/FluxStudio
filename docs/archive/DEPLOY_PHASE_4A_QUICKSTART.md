# Phase 4A: Quick Deployment Guide
**FluxPrint Designer-First Integration - Production Ready**

---

## TL;DR - Deploy in 5 Minutes

```bash
# 1. Navigate to FluxStudio
cd /Users/kentino/FluxStudio

# 2. Run automated deployment script
./deploy-phase-4a.sh

# 3. Follow prompts and monitor deployment
# Script will:
#   - Verify TypeScript compilation
#   - Build frontend (npm run build)
#   - Commit and push changes (optional)
#   - Deploy to DigitalOcean
#   - Monitor deployment progress
#   - Verify deployment success
```

---

## What Gets Deployed

### Frontend Components (1,280 lines)
- **QuickPrintDialog.tsx** (650 lines) - Designer-friendly print interface
- **ProjectFilesTab.tsx** (500 lines) - File grid with print buttons
- **useProjectFiles.ts** (292 lines) - React Query hook with WebSocket

### Backend APIs (620 lines)
- `POST /api/printing/quick-print` - Submit print job (with auth/CSRF/rate limit)
- `POST /api/printing/estimate` - Get print estimates
- `GET /api/projects/:id/files` - List project files
- `POST /api/projects/:id/files/upload` - Upload files (with validation)
- `DELETE /api/projects/:id/files/:id` - Delete file

### Security Features
- JWT authentication on all endpoints
- CSRF protection on state-changing operations
- Rate limiting (10 req/min per user)
- File validation (magic bytes + extension + size)
- Path traversal protection
- Input sanitization

### Real-Time Features
- WebSocket project rooms (Socket.IO)
- Live print status updates
- Automatic UI refresh on status changes

---

## Manual Deployment Steps

If you prefer manual control:

### 1. Build Frontend
```bash
cd /Users/kentino/FluxStudio
npm install
npm run build

# Verify build
ls -la dist/
```

### 2. Configure Environment
```bash
# Update production environment variables
nano .env.production

# Critical variables:
# - JWT_SECRET (must be unique and secure)
# - DATABASE_URL (PostgreSQL connection string)
# - DO_SPACES_ACCESS_KEY (DigitalOcean Spaces)
# - DO_SPACES_SECRET_KEY (DigitalOcean Spaces)
# - FLUXPRINT_SERVICE_URL (http://localhost:5001)
```

### 3. Commit Changes
```bash
git add .
git commit -m "Deploy Phase 4A: Designer-First Printing"
git push origin main
```

### 4. Deploy to DigitalOcean
```bash
# Trigger deployment
doctl apps create-deployment bd400c99-683f-4d84-ac17-e7130fef0781

# Monitor deployment
doctl apps list-deployments bd400c99-683f-4d84-ac17-e7130fef0781
```

---

## Post-Deployment Verification

### 1. Frontend Access Test
```bash
# Visit app URL
open https://unified-backend-lfx7p.ondigitalocean.app

# Or check with curl
curl -I https://unified-backend-lfx7p.ondigitalocean.app
# Expected: HTTP/2 200
```

### 2. Backend Health Check
```bash
curl https://unified-backend-lfx7p.ondigitalocean.app/api/health

# Expected response:
# {"status":"healthy","timestamp":"2025-11-07T..."}
```

### 3. Print Endpoint Test (Requires Auth)
```bash
# Login to get JWT token
TOKEN=$(curl -X POST https://unified-backend-lfx7p.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}' \
  | jq -r '.token')

# Test estimate endpoint
curl -X POST https://unified-backend-lfx7p.ondigitalocean.app/api/printing/estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "filename":"test.stl",
    "material":"PLA",
    "quality":"standard"
  }'

# Expected response:
# {
#   "timeHours": 4,
#   "timeMinutes": 30,
#   "materialCost": 3.50,
#   "materialGrams": 175,
#   "confidence": "medium"
# }
```

### 4. WebSocket Connection Test
Open browser console at https://unified-backend-lfx7p.ondigitalocean.app and check:

```javascript
// Network tab → WS → Should see:
// ws://unified-backend-lfx7p.ondigitalocean.app/socket.io/?EIO=4&transport=websocket
// Status: 101 Switching Protocols (connected)
```

### 5. End-to-End Workflow Test

**User Flow**:
1. Login at https://unified-backend-lfx7p.ondigitalocean.app
2. Navigate to any project
3. Click "Files" tab
4. Upload STL file (camera-mount.stl, etc.)
5. Click "Print" button on file card
6. QuickPrintDialog opens
7. Select material (e.g., PLA) and quality (e.g., Standard)
8. Click "Print"
9. Toast appears: "Print queued! Job #XXX"
10. File card shows "Queued" badge
11. After 5-10s, badge changes to "Printing 5%"
12. Progress updates automatically without refresh

**Expected Database State**:
```sql
-- Check print job was created
SELECT * FROM print_jobs ORDER BY queued_at DESC LIMIT 1;

-- Expected result:
-- id | project_id | file_name | status | material_type | queued_at
-- ---+------------+-----------+--------+---------------+-----------
-- cx...| px... | camera-mount.stl | queued | PLA | 2025-11-07...
```

---

## Rollback Instructions

If deployment fails or causes issues:

### Option 1: Revert to Previous Deployment
```bash
# List recent deployments
doctl apps list-deployments bd400c99-683f-4d84-ac17-e7130fef0781

# Find last successful deployment ID (before Phase 4A)
# Redeploy previous version
doctl apps create-deployment bd400c99-683f-4d84-ac17-e7130fef0781 \
  --deployment-id <PREVIOUS_DEPLOYMENT_ID>
```

### Option 2: Revert Git Commit
```bash
# Revert Phase 4A commit
git revert HEAD
git push origin main

# DigitalOcean will auto-deploy reverted state
```

### Option 3: Disable FluxPrint Feature
```bash
# Temporarily disable feature via environment variable
doctl apps update bd400c99-683f-4d84-ac17-e7130fef0781 \
  --env FLUXPRINT_ENABLED=false

# This hides Print buttons and reverts to Phase 3D behavior
# No data loss, fully reversible
```

---

## Troubleshooting

### Issue: Build fails with TypeScript errors
```bash
# Check TypeScript errors
npx tsc --noEmit

# Common fixes:
# 1. Update types: npm install --save-dev @types/react @types/node
# 2. Clear cache: rm -rf node_modules .tsc-cache && npm install
# 3. Check tsconfig.json paths
```

### Issue: Deployment succeeds but Print button doesn't appear
**Cause**: Frontend build didn't include new components
**Fix**:
```bash
# Force rebuild
rm -rf dist/ node_modules/.vite
npm run build
git add dist/
git commit -m "Force rebuild frontend"
git push origin main
```

### Issue: Print submission returns 401 Unauthorized
**Cause**: JWT token missing or invalid
**Fix**:
1. Logout and login again to get fresh token
2. Check browser console for token errors
3. Verify JWT_SECRET is set in backend .env.production

### Issue: WebSocket not connecting
**Cause**: CORS or proxy configuration
**Fix**:
1. Check browser console for WebSocket errors
2. Verify CORS_ORIGIN in backend .env.production
3. Check DigitalOcean App Platform WebSocket configuration

### Issue: File upload fails with 413 Payload Too Large
**Cause**: Nginx/proxy body size limit
**Fix**:
```bash
# Update DigitalOcean App Platform settings
# → Settings → Components → unified-backend
# → Add environment variable:
# NGINX_CLIENT_MAX_BODY_SIZE=100M
```

---

## Monitoring Commands

### Check App Status
```bash
# Overall app status
doctl apps get bd400c99-683f-4d84-ac17-e7130fef0781

# Recent deployments
doctl apps list-deployments bd400c99-683f-4d84-ac17-e7130fef0781

# Current deployment details
doctl apps get-deployment bd400c99-683f-4d84-ac17-e7130fef0781 <DEPLOYMENT_ID>
```

### View Logs
```bash
# Backend logs (last 100 lines)
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type run --tail 100

# Build logs
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type build

# Follow logs in real-time
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type run --follow
```

### Database Queries
```bash
# Connect to database
PGPASSWORD="your-password" psql -h db-host -U doadmin -d fluxstudio

# Check recent print jobs
SELECT id, file_name, status, material_type, queued_at
FROM print_jobs
ORDER BY queued_at DESC
LIMIT 10;

# Count jobs by status
SELECT status, COUNT(*) as count
FROM print_jobs
GROUP BY status;

# Check failed prints in last 24 hours
SELECT file_name, status, queued_at
FROM print_jobs
WHERE status = 'failed'
AND queued_at > NOW() - INTERVAL '24 hours';
```

---

## Success Metrics (Day 1)

Track these metrics after deployment:

### Adoption
- [ ] At least 5 print jobs submitted via QuickPrintDialog
- [ ] 80%+ of prints from project files (not /printing dashboard)
- [ ] 90%+ of users select presets (not custom settings)

### Performance
- [ ] <3s average time from "Print" click to "Queued" toast
- [ ] <500ms WebSocket status update latency
- [ ] >95% API success rate (non-5xx responses)

### Quality
- [ ] <5% error rate on print submissions
- [ ] 0 security vulnerabilities found
- [ ] <3 critical bugs reported

### User Feedback
- [ ] >8/10 on "printing feels easy and natural"
- [ ] >7/10 on "estimates are accurate enough"
- [ ] Positive feedback on real-time status updates

---

## Next Steps After Deployment

### Week 1: Monitor and Stabilize
- Monitor error logs daily
- Collect user feedback
- Fix critical bugs
- Optimize performance bottlenecks

### Week 2-4: Phase 4B Planning
- Gather requirements for 3D preview
- Research STL parsing libraries (Three.js)
- Design printability analysis algorithm
- Plan user testing sessions

### Month 2: Phase 4B Development
- Implement 3D model preview
- Add printability analysis (overhangs, thin walls)
- Create post-print feedback loop
- Build smart material recommendations

---

## Documentation

- **Full Deployment Guide**: `PHASE_4A_PRODUCTION_DEPLOYMENT.md`
- **Implementation Details**: `PHASE_4A_IMPLEMENTATION_COMPLETE.md`
- **Executive Summary**: `PHASE_4A_EXECUTIVE_SUMMARY.md`
- **Design Principles**: `PHASE_4A_DESIGNER_FIRST_FOUNDATION.md`

---

## Support

### Emergency Contacts
- **On-Call Engineer**: Check Slack #fluxstudio-oncall
- **DevOps**: Check #infrastructure channel
- **Product Manager**: Check #product-updates

### Resources
- **DigitalOcean Console**: https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781
- **GitHub Repository**: https://github.com/kentin0-fiz0l/FluxStudio
- **Production App**: https://unified-backend-lfx7p.ondigitalocean.app

---

**Last Updated**: November 7, 2025
**Status**: ✅ Production Ready
**Deployment Script**: `./deploy-phase-4a.sh`
