# HLS Streaming Deployment Guide

**Target Platform**: DigitalOcean
**Date**: 2025-10-26
**Status**: Ready for deployment

---

## Prerequisites

✅ DigitalOcean account with active app
✅ Database running: `fluxstudio-db` (PostgreSQL 15)
✅ App Platform app: `fluxstudio` (ID: bd400c99-683f-4d84-ac17-e7130fef0781)
✅ doctl CLI installed and authenticated
✅ Frontend components created
✅ Backend services created
✅ FFmpeg worker service created

---

## Deployment Checklist

### Phase 1: DigitalOcean Spaces Setup (15-20 minutes)

#### Step 1: Create Spaces Bucket

```bash
# Create Spaces bucket in NYC3 region (same as database)
doctl compute spaces create fluxstudio --region nyc3

# Verify creation
doctl compute spaces list | grep fluxstudio
```

**Expected output**:
```
fluxstudio    nyc3    2025-10-26...
```

#### Step 2: Generate Spaces API Keys

**Via DigitalOcean Control Panel**:
1. Go to: https://cloud.digitalocean.com/account/api/spaces
2. Click "Generate New Key"
3. Name: `fluxstudio-hls-access`
4. Save the **Access Key** and **Secret Key** (shown only once!)

**Format**:
```
Access Key: DO00ABC123XYZ...
Secret Key: abc123def456ghi789...
```

#### Step 3: Configure CORS for Spaces

Create CORS configuration file:

```bash
cat > /tmp/spaces-cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://fluxstudio.art",
        "https://fluxstudio-uy2k4.ondigitalocean.app",
        "http://localhost:5173",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF
```

Apply CORS configuration:

```bash
# Install s3cmd if not already installed
brew install s3cmd  # macOS
# or: sudo apt install s3cmd  # Linux

# Configure s3cmd for DigitalOcean Spaces
s3cmd --configure

# When prompted:
# Access Key: [Your Spaces Access Key]
# Secret Key: [Your Spaces Secret Key]
# Default Region: nyc3
# S3 Endpoint: nyc3.digitaloceanspaces.com
# DNS-style bucket: %(bucket)s.nyc3.digitaloceanspaces.com

# Apply CORS
s3cmd setcors /tmp/spaces-cors.json s3://fluxstudio

# Verify CORS
s3cmd info s3://fluxstudio
```

#### Step 4: Test Spaces Upload

```bash
# Create test file
echo "HLS Test" > /tmp/test.txt

# Upload to Spaces
s3cmd put /tmp/test.txt s3://fluxstudio/test/test.txt

# Verify via CDN URL
curl -I https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/test/test.txt

# Should return: HTTP/2 200
```

---

### Phase 2: Database Migration (5-10 minutes)

#### Step 1: Get Database Connection String

```bash
# Database ID: 49f4dc39-3d91-4bce-aa7a-7784c8e32a66
DB_URL="postgresql://doadmin:[REDACTED]@fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
```

#### Step 2: Run HLS Migration

```bash
# Navigate to FluxStudio directory
cd /Users/kentino/FluxStudio

# Run migration
PGPASSWORD="[REDACTED]" psql -h fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com \
  -U doadmin \
  -d defaultdb \
  -p 25060 \
  --set=sslmode=require \
  -f database/migrations/011_hls_streaming.sql

# Or using full connection string:
psql "$DB_URL" -f database/migrations/011_hls_streaming.sql
```

**Expected output**:
```
ALTER TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE VIEW
CREATE VIEW
CREATE FUNCTION
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

#### Step 3: Verify Migration

```bash
# Check tables exist
psql "$DB_URL" -c "\dt transcoding_jobs"

# Check views exist
psql "$DB_URL" -c "\dv active_transcoding_jobs"
psql "$DB_URL" -c "\dv transcoding_history"

# Check function exists
psql "$DB_URL" -c "\df cleanup_old_transcoding_jobs"

# Verify file table columns
psql "$DB_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='files' AND column_name IN ('hls_manifest_url', 'transcoding_status');"
```

**Expected**:
```
      column_name      | data_type
-----------------------+-----------
 hls_manifest_url      | text
 transcoding_status    | character varying
```

---

### Phase 3: Environment Variables (5 minutes)

#### Step 1: Add Spaces Credentials to App Platform

```bash
APP_ID="bd400c99-683f-4d84-ac17-e7130fef0781"

# Add SPACES_ACCESS_KEY (replace with your actual key)
doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_ACCESS_KEY=DO00ABC123XYZ:SECRET"

# Add SPACES_SECRET_KEY (replace with your actual key)
doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_SECRET_KEY=abc123def456ghi789:SECRET"

# Add SPACES_BUCKET
doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_BUCKET=fluxstudio:VALUE"

# Add SPACES_ENDPOINT
doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_ENDPOINT=nyc3.digitaloceanspaces.com:VALUE"

# Add SPACES_REGION
doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_REGION=nyc3:VALUE"

# Add SPACES_CDN
doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_CDN=https://fluxstudio.nyc3.cdn.digitaloceanspaces.com:VALUE"
```

**Alternative: All at once**

```bash
# Create env update script
cat > /tmp/add-spaces-envs.sh << 'EOF'
#!/bin/bash
APP_ID="bd400c99-683f-4d84-ac17-e7130fef0781"

echo "Adding Spaces environment variables..."

# Replace these with your actual keys!
SPACES_ACCESS_KEY="YOUR_ACCESS_KEY_HERE"
SPACES_SECRET_KEY="YOUR_SECRET_KEY_HERE"

doctl apps update $APP_ID \
  --upsert-env-var "unified-backend:SPACES_ACCESS_KEY=$SPACES_ACCESS_KEY:SECRET" \
  --upsert-env-var "unified-backend:SPACES_SECRET_KEY=$SPACES_SECRET_KEY:SECRET" \
  --upsert-env-var "unified-backend:SPACES_BUCKET=fluxstudio:VALUE" \
  --upsert-env-var "unified-backend:SPACES_ENDPOINT=nyc3.digitaloceanspaces.com:VALUE" \
  --upsert-env-var "unified-backend:SPACES_REGION=nyc3:VALUE" \
  --upsert-env-var "unified-backend:SPACES_CDN=https://fluxstudio.nyc3.cdn.digitaloceanspaces.com:VALUE"

echo "✅ Environment variables added"
echo "⏳ App will redeploy automatically..."
EOF

chmod +x /tmp/add-spaces-envs.sh

# Edit the script to add your keys
nano /tmp/add-spaces-envs.sh

# Run the script
/tmp/add-spaces-envs.sh
```

---

### Phase 4: FFmpeg Worker Deployment (20-30 minutes)

**Option A: DigitalOcean App Platform Worker (Recommended)**

#### Step 1: Update App Spec with Worker

```bash
# Get current app spec
doctl apps spec get bd400c99-683f-4d84-ac17-e7130fef0781 > /tmp/current-app-spec.yaml

# Backup
cp /tmp/current-app-spec.yaml /tmp/current-app-spec.yaml.backup
```

Add worker configuration to the spec (add after existing services):

```yaml
workers:
  - name: ffmpeg-worker
    github:
      repo: your-username/FluxStudio
      branch: main
      deploy_on_push: true
    dockerfile_path: services/ffmpeg-worker/Dockerfile
    instance_count: 1
    instance_size_slug: basic-xs  # $6/month (1 vCPU, 512MB RAM)
    # For higher volume, use: basic-s ($12/month, 1 vCPU, 1GB RAM)
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
        value: "postgresql://doadmin:[REDACTED]@fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
      - key: SPACES_ACCESS_KEY
        scope: RUN_TIME
        type: SECRET
        value: "YOUR_SPACES_ACCESS_KEY"
      - key: SPACES_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: "YOUR_SPACES_SECRET_KEY"
      - key: SPACES_BUCKET
        scope: RUN_TIME
        value: "fluxstudio"
      - key: SPACES_ENDPOINT
        scope: RUN_TIME
        value: "nyc3.digitaloceanspaces.com"
      - key: SPACES_REGION
        scope: RUN_TIME
        value: "nyc3"
      - key: SPACES_CDN
        scope: RUN_TIME
        value: "https://fluxstudio.nyc3.cdn.digitaloceanspaces.com"
      - key: WORK_DIR
        scope: RUN_TIME
        value: "/tmp/transcoding"
      - key: CONCURRENT_JOBS
        scope: RUN_TIME
        value: "1"
      - key: POLL_INTERVAL
        scope: RUN_TIME
        value: "10000"
```

#### Step 2: Apply Updated Spec

```bash
# Update app with new spec
doctl apps update bd400c99-683f-4d84-ac17-e7130fef0781 --spec /tmp/current-app-spec.yaml

# Monitor deployment
doctl apps list-deployments bd400c99-683f-4d84-ac17-e7130fef0781
```

#### Step 3: Verify Worker Deployment

```bash
# Check worker status
doctl apps get bd400c99-683f-4d84-ac17-e7130fef0781 | grep -A 5 "ffmpeg-worker"

# View worker logs
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type RUN --component ffmpeg-worker --follow

# Should see:
# [Worker] FFmpeg Transcoding Worker starting...
# [Worker] Polling started, checking every 10 seconds
```

---

**Option B: Dedicated Droplet (Alternative)**

If you prefer a dedicated droplet for more control:

```bash
# Create droplet
doctl compute droplet create ffmpeg-worker \
  --image ubuntu-22-04-x64 \
  --size s-1vcpu-1gb \
  --region nyc3 \
  --ssh-keys 50775155 \
  --wait

# Get droplet IP
DROPLET_IP=$(doctl compute droplet list | grep ffmpeg-worker | awk '{print $3}')

echo "Droplet created at: $DROPLET_IP"

# SSH and setup
ssh root@$DROPLET_IP << 'EOF'
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Git
apt-get update
apt-get install -y git

# Clone repository (replace with your repo)
git clone https://github.com/your-username/FluxStudio.git
cd FluxStudio/services/ffmpeg-worker

# Create .env file
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://doadmin:[REDACTED]@fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
SPACES_ACCESS_KEY=YOUR_ACCESS_KEY
SPACES_SECRET_KEY=YOUR_SECRET_KEY
SPACES_BUCKET=fluxstudio
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_CDN=https://fluxstudio.nyc3.cdn.digitaloceanspaces.com
WORK_DIR=/tmp/transcoding
CONCURRENT_JOBS=1
POLL_INTERVAL=10000
ENVEOF

# Build Docker image
docker build -t ffmpeg-worker .

# Run worker
docker run -d \
  --name ffmpeg-worker \
  --restart unless-stopped \
  --env-file .env \
  ffmpeg-worker

# Check logs
docker logs -f ffmpeg-worker
EOF
```

---

### Phase 5: Testing (30 minutes)

#### Test 1: Upload Test Video

```bash
# Upload a test video to your FluxStudio app
# Use the web interface: https://fluxstudio.art

# Or via API:
TOKEN="your_auth_token"

curl -X POST https://fluxstudio.art/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@/path/to/test-video.mp4"

# Save the file ID from response
FILE_ID="<uuid-from-response>"
```

#### Test 2: Submit Transcoding Job

```bash
# Submit job
curl -X POST https://fluxstudio.art/media/transcode \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"quality\":\"high\"}"

# Response should include:
# {
#   "message": "Transcoding job submitted successfully",
#   "jobId": "job-uuid",
#   "status": "pending",
#   "hlsUrl": "https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/file-id/master.m3u8"
# }

JOB_ID="<job-uuid-from-response>"
```

#### Test 3: Monitor Progress

```bash
# Check job status every 10 seconds
watch -n 10 "curl -s https://fluxstudio.art/media/transcode/$FILE_ID \
  -H 'Authorization: Bearer $TOKEN' | jq '.'"

# Should show progress increasing:
# { "status": "processing", "progress": 0 }
# { "status": "processing", "progress": 15 }
# { "status": "processing", "progress": 30 }
# ...
# { "status": "completed", "progress": 100, "hlsManifestUrl": "https://..." }
```

#### Test 4: Verify HLS Playback

```bash
# Once completed, test manifest URL
HLS_URL="https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/$FILE_ID/master.m3u8"

curl -I $HLS_URL
# Should return: HTTP/2 200

# Download manifest
curl $HLS_URL

# Should see:
# #EXTM3U
# #EXT-X-VERSION:3
# #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
# 1080p.m3u8
# #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
# 720p.m3u8
# #EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
# 480p.m3u8
```

#### Test 5: Frontend Playback

1. Navigate to: https://fluxstudio.art
2. Find the uploaded video
3. Click play
4. Verify:
   - ✅ Video loads and plays
   - ✅ Quality selector appears
   - ✅ Quality switching works
   - ✅ All video controls work
   - ✅ No console errors

---

## Troubleshooting

### Worker Not Picking Up Jobs

**Symptom**: Jobs stay in "pending" status

**Check**:
```bash
# View worker logs
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 \
  --type RUN \
  --component ffmpeg-worker \
  --follow
```

**Should see**:
```
[Worker] Polling started, checking every 10 seconds
[Worker] Checking for pending jobs...
```

**If not**:
1. Check DATABASE_URL is correct
2. Verify worker container is running
3. Check database connectivity

---

### Transcoding Fails Immediately

**Symptom**: Job status changes to "failed" within seconds

**Check worker logs**:
```bash
doctl apps logs ... --component ffmpeg-worker | grep -i error
```

**Common issues**:
- FFmpeg not installed in container (check Dockerfile)
- Input file not accessible from Spaces
- Insufficient permissions on Spaces

**Fix**:
```bash
# Verify Spaces access
s3cmd ls s3://fluxstudio/uploads/

# Test download
s3cmd get s3://fluxstudio/uploads/test-video.mp4 /tmp/test.mp4
```

---

### HLS Files Not Accessible

**Symptom**: 403 Forbidden or 404 Not Found on HLS URLs

**Check CORS**:
```bash
curl -I -H "Origin: https://fluxstudio.art" \
  https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/test/test.txt

# Should have headers:
# access-control-allow-origin: https://fluxstudio.art
```

**Fix**:
```bash
# Reapply CORS configuration
s3cmd setcors /tmp/spaces-cors.json s3://fluxstudio
```

**Check file permissions**:
```bash
# Make files public-read
s3cmd setacl s3://fluxstudio/hls/ --acl-public --recursive
```

---

### Player Not Loading HLS

**Check browser console**:
- HLS.js errors
- CORS errors
- Network failures

**Test manifest directly**:
```bash
curl https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/FILE_ID/master.m3u8
```

**Verify HLS.js loaded**:
```javascript
// In browser console
console.log(typeof Hls)
// Should output: "function"
```

---

## Monitoring

### Check Worker Health

```bash
# View recent transcoding jobs
psql "$DB_URL" -c "SELECT * FROM active_transcoding_jobs;"

# View statistics
psql "$DB_URL" -c "
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
  FROM transcoding_jobs
  WHERE created_at > NOW() - INTERVAL '24 hours';
"
```

### Worker Logs

```bash
# Real-time logs
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 \
  --type RUN \
  --component ffmpeg-worker \
  --follow

# Last 100 lines
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 \
  --type RUN \
  --component ffmpeg-worker \
  --tail 100
```

---

## Cost Summary

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| Storage & CDN | DigitalOcean Spaces (250GB) | $5 |
| Transcoding Worker | App Platform Worker (basic-xs) | $6 |
| Database | Managed PostgreSQL (existing) | $15 |
| **Total** | | **$26/month** |

**Scaling**:
- 100-500 videos/month: $26 (current setup)
- 500-1000 videos/month: $32 (upgrade worker to basic-s)
- 1000+ videos/month: $50+ (multiple workers + more storage)

---

## Rollback Plan

If deployment fails:

```bash
# Revert app spec
doctl apps update bd400c99-683f-4d84-ac17-e7130fef0781 \
  --spec /tmp/current-app-spec.yaml.backup

# Remove environment variables
doctl apps update bd400c99-683f-4d84-ac17-e7130fef0781 \
  --unset-env-var "unified-backend:SPACES_ACCESS_KEY" \
  --unset-env-var "unified-backend:SPACES_SECRET_KEY"

# Rollback database migration (if needed)
psql "$DB_URL" << EOF
DROP VIEW IF EXISTS transcoding_history;
DROP VIEW IF EXISTS active_transcoding_jobs;
DROP FUNCTION IF EXISTS cleanup_old_transcoding_jobs();
DROP TABLE IF EXISTS transcoding_jobs;
ALTER TABLE files DROP COLUMN IF EXISTS hls_manifest_url;
ALTER TABLE files DROP COLUMN IF EXISTS transcoding_status;
EOF
```

---

## Next Steps After Deployment

1. **Monitor first few jobs** (1-2 hours)
   - Watch worker logs
   - Verify HLS output quality
   - Test playback on multiple devices

2. **Optimize worker settings** (as needed)
   - Adjust `CONCURRENT_JOBS` based on load
   - Tune `POLL_INTERVAL` for responsiveness
   - Consider scaling worker if processing is slow

3. **Set up monitoring alerts** (optional)
   - Failed job notifications
   - Storage quota alerts
   - Worker health checks

4. **Enable cleanup job** (recommended)
   ```sql
   -- Schedule cleanup to run daily at 2 AM
   SELECT cron.schedule('cleanup-transcoding-jobs', '0 2 * * *', 'SELECT cleanup_old_transcoding_jobs()');
   ```

---

## Deployment Complete!

Once all phases are complete, your HLS streaming infrastructure will be fully operational:

- ✅ Videos uploaded to DigitalOcean Spaces
- ✅ FFmpeg worker automatically transcodes to HLS
- ✅ Multi-bitrate streaming (1080p, 720p, 480p)
- ✅ CDN-accelerated delivery globally
- ✅ $26/month total cost

**Total deployment time**: 1.5-2 hours

Happy streaming! 🎥
