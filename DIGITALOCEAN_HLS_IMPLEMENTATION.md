# DigitalOcean HLS Streaming Implementation

**Status**: 🚧 **In Progress** - Core worker complete, integration pending
**Cost**: ~$26/month (vs $90/month for AWS)
**Approach**: Self-hosted FFmpeg on DigitalOcean

---

## Executive Summary

Building a **cost-effective HLS streaming solution** entirely on DigitalOcean, eliminating AWS dependencies and FairPlay DRM complexity. This implementation focuses on:

- ✅ **Adaptive HLS streaming** (1080p, 720p, 480p)
- ✅ **Self-hosted transcoding** using FFmpeg
- ✅ **DigitalOcean Spaces** for storage + CDN
- ❌ **No DRM** (can be added later if needed)

**Cost savings**: 71% reduction compared to AWS implementation

---

## ✅ Completed Components

### 1. FFmpeg Transcoding Worker

**Location**: `/services/ffmpeg-worker/`

**Files Created**:
- `worker.js` (400+ lines) - Main transcoding service
- `package.json` - Dependencies
- `Dockerfile` - Container configuration
- `.env.example` - Configuration template

**Features**:
```javascript
// Job polling and processing
- Polls PostgreSQL for pending jobs every 10 seconds
- Downloads video from DigitalOcean Spaces
- Transcodes to HLS with 3 quality levels (1080p, 720p, 480p)
- Uploads HLS segments back to Spaces
- Real-time progress updates in database
- Graceful shutdown handling
- Automatic cleanup
```

**Key Functions**:
- `startWorker()` - Main polling loop
- `processJob()` - Handle single transcoding job
- `transcodeToHLS()` - FFmpeg HLS conversion
- `downloadFromSpaces()` - Download from DO Spaces
- `uploadHLSToSpaces()` - Upload HLS files to Spaces

---

## 📋 Remaining Implementation

### Phase 1: Update Existing Services (2-3 hours)

#### 1.1 Update `transcoding-service.js`

**Changes needed**:
```javascript
// Replace AWS MediaConvert with job submission to database
async function createTranscodingJob({ fileId, fileName, s3Key }) {
  // Store job in database (worker will pick it up)
  const result = await query(
    `INSERT INTO transcoding_jobs
     (id, file_id, status, input_url, output_prefix, created_at)
     VALUES ($1, $2, 'pending', $3, $4, NOW())
     RETURNING id`,
    [uuidv4(), fileId, s3Key, `hls/${fileId}/`]
  );

  return {
    jobId: result.rows[0].id,
    status: 'pending'
  };
}

// Remove AWS KMS functions (not needed without DRM)
// Remove generateContentKey()
// Remove storeContentKey()
```

#### 1.2 Update `server-unified.js` API Endpoints

**Changes**:
```javascript
// POST /media/transcode - Simplify, remove DRM logic
app.post('/media/transcode', authenticateToken, async (req, res) => {
  const { fileId } = req.body;

  // No subscription tier check (no DRM)
  // Just submit job
  const job = await transcodingService.createTranscodingJob({
    fileId,
    fileName: file.name,
    s3Key: extractKeyFromUrl(file.file_url)
  });

  res.json({ jobId: job.jobId, status: 'pending' });
});
```

### Phase 2: Frontend Updates (1-2 hours)

#### 2.1 Simplify `SecureVideoPlayer.tsx`

**Changes**:
- Remove all FairPlay DRM code (lines 75-150)
- Keep HLS.js for adaptive streaming
- Remove DRM status indicator
- Rename to `HLSVideoPlayer.tsx` for clarity

```tsx
// Before (600+ lines with DRM)
// After (~300 lines, HLS-only)
export function HLSVideoPlayer({ fileId, hlsUrl, poster }) {
  // HLS.js initialization
  // Standard video controls
  // Quality selector
  // No DRM logic
}
```

#### 2.2 Simplify `DRMUploadOptions.tsx`

**Rename**: `HLSUploadOptions.tsx`

**Changes**:
- Remove DRM toggle
- Remove subscription tier checks
- Keep transcoding toggle and quality presets
- Simpler UI

```tsx
// Before (700+ lines with DRM/subscription logic)
// After (~200 lines, HLS-only)
export function HLSUploadOptions({ fileId, fileName }) {
  return (
    <>
      <Toggle label="Enable HLS Streaming" />
      <QualityPresets />
      <TranscodingProgress />
    </>
  );
}
```

### Phase 3: Database (30 minutes)

#### 3.1 Simplified Migration

**File**: `database/migrations/011_hls_streaming.sql`

```sql
-- Add HLS columns to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS hls_manifest_url TEXT,
ADD COLUMN IF NOT EXISTS transcoding_status VARCHAR(50) DEFAULT 'pending';

-- Transcoding jobs table (simplified, no DRM columns)
CREATE TABLE IF NOT EXISTS transcoding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  input_url TEXT NOT NULL,
  output_prefix VARCHAR(255),
  manifest_url TEXT,
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_transcoding_jobs_status
ON transcoding_jobs(status)
WHERE status IN ('pending', 'processing');

-- No content_keys table
-- No media_licenses table
-- No subscription_tiers table (can add later for storage limits)
```

### Phase 4: DigitalOcean Spaces Setup (1 hour)

#### 4.1 Create Spaces Bucket

```bash
# Via DigitalOcean Control Panel:
# 1. Create Spaces bucket: "fluxstudio"
# 2. Enable CDN
# 3. Set CORS policy
# 4. Generate API keys

# Or via doctl CLI:
doctl spaces create fluxstudio --region nyc3
doctl spaces cors set fluxstudio --cors-json cors-config.json
```

#### 4.2 Configure CORS

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://fluxstudio.art", "http://localhost:5173"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

#### 4.3 Update Environment Variables

```bash
# .env.production
SPACES_ACCESS_KEY=DO00EXAMPLE123456
SPACES_SECRET_KEY=examplesecretkey123456789
SPACES_BUCKET=fluxstudio
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_CDN=https://fluxstudio.nyc3.cdn.digitaloceanspaces.com
```

### Phase 5: Worker Deployment (2 hours)

#### Option A: DigitalOcean Droplet

**Recommended for low volume (<100 videos/month)**

```bash
# 1. Create droplet ($6/month Basic plan)
doctl compute droplet create ffmpeg-worker \
  --image ubuntu-22-04-x64 \
  --size s-1vcpu-1gb \
  --region nyc3

# 2. SSH into droplet
ssh root@<droplet-ip>

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Clone repo and build
git clone https://github.com/your-org/FluxStudio.git
cd FluxStudio/services/ffmpeg-worker
docker build -t ffmpeg-worker .

# 5. Run worker
docker run -d \
  --name ffmpeg-worker \
  --restart unless-stopped \
  --env-file .env \
  ffmpeg-worker

# 6. Monitor logs
docker logs -f ffmpeg-worker
```

#### Option B: DigitalOcean App Platform

**Better for scaling, auto-restart**

Add to `.do/app.yaml`:
```yaml
workers:
  - name: ffmpeg-worker
    github:
      repo: your-org/FluxStudio
      branch: main
      deploy_on_push: true
    dockerfile_path: services/ffmpeg-worker/Dockerfile
    instance_count: 1
    instance_size_slug: basic-xs  # $6/month
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: SPACES_ACCESS_KEY
        scope: RUN_TIME
        type: SECRET
      - key: SPACES_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
      - key: SPACES_BUCKET
        value: fluxstudio
      - key: SPACES_ENDPOINT
        value: nyc3.digitaloceanspaces.com
      - key: WORK_DIR
        value: /tmp/transcoding
```

---

## Complete File Checklist

### ✅ Created

- [x] `/services/ffmpeg-worker/worker.js`
- [x] `/services/ffmpeg-worker/package.json`
- [x] `/services/ffmpeg-worker/Dockerfile`
- [x] `/services/ffmpeg-worker/.env.example`

### 📝 To Update

- [ ] `/services/transcoding-service.js` - Remove AWS, use database jobs
- [ ] `/server-unified.js` - Simplify transcode endpoints
- [ ] `/src/components/media/SecureVideoPlayer.tsx` - Remove DRM, keep HLS
- [ ] `/src/components/media/DRMUploadOptions.tsx` - Simplify for HLS-only

### 🆕 To Create

- [ ] `/services/ffmpeg-worker/README.md` - Setup and deployment guide
- [ ] `/database/migrations/011_hls_streaming.sql` - Simplified schema
- [ ] `/docs/DIGITALOCEAN_SPACES_SETUP.md` - Spaces configuration guide
- [ ] `/src/components/media/HLSVideoPlayer.tsx` - Renamed, simplified player
- [ ] `/src/components/media/HLSUploadOptions.tsx` - Renamed, simplified UI

### 🗑️ To Remove (Optional)

- [ ] `/services/fairplay-license-server/` - Not needed without DRM
- [ ] `/database/migrations/010_drm_support.sql` - DRM-specific schema
- [ ] `/docs/AWS_FAIRPLAY_SETUP_GUIDE.md` - AWS-specific docs

---

## Workflow: Upload to Playback

### 1. User Uploads Video

```
POST /files/upload
→ Video saved to DigitalOcean Spaces
→ File record created in database
```

### 2. User Enables HLS

```tsx
<HLSUploadOptions fileId="uuid" fileName="video.mp4" />
→ User clicks "Start Processing"
→ POST /media/transcode
→ Job inserted into transcoding_jobs table with status='pending'
```

### 3. Worker Picks Up Job

```
FFmpeg Worker polls database every 10s
→ Finds pending job
→ Downloads video from Spaces
→ Transcodes to HLS (1080p, 720p, 480p)
→ Progress: 0% → 10% → ... → 90% → 100%
→ Uploads HLS segments to Spaces
→ Updates job status = 'completed'
→ Updates files.hls_manifest_url
```

### 4. User Views Video

```tsx
<HLSVideoPlayer
  fileId="uuid"
  hlsUrl="https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/uuid/master.m3u8"
/>
→ HLS.js loads manifest
→ Detects user bandwidth
→ Automatically selects quality (1080p/720p/480p)
→ Smooth adaptive playback
```

---

## Cost Breakdown

| Service | Details | Monthly Cost |
|---------|---------|-------------|
| **DigitalOcean Spaces** | 250GB storage + CDN included | $5 |
| **FFmpeg Worker Droplet** | 1GB RAM, 1 vCPU | $6 |
| **Database** | Managed PostgreSQL (existing) | $15 |
| **App Platform** | Main FluxStudio app (existing) | $0 (covered) |
| **Total** | | **$26/month** |

**Scalability**:
- **100 videos/month**: $26 (worker handles easily)
- **500 videos/month**: $32 (upgrade worker to $12/month droplet)
- **1000+ videos/month**: $50+ (add second worker, more storage)

**vs AWS MediaConvert**:
- AWS: ~$90/month for 100 videos
- DigitalOcean: $26/month for 100 videos
- **Savings: $64/month (71%)**

---

## Testing Plan

### 1. Test Worker Locally

```bash
cd services/ffmpeg-worker
npm install

# Create .env from .env.example
cp .env.example .env

# Edit .env with your credentials

# Run worker
npm start

# In another terminal, submit test job:
psql $DATABASE_URL -c "
  INSERT INTO transcoding_jobs (id, file_id, status, input_url, output_prefix)
  VALUES (
    gen_random_uuid(),
    'test-file-id',
    'pending',
    'https://fluxstudio.nyc3.digitaloceanspaces.com/uploads/test-video.mp4',
    'hls/test/'
  )
"

# Watch worker logs for processing
```

### 2. Test HLS Playback

```bash
# After transcoding completes, test manifest:
curl https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/test/master.m3u8

# Should see:
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
480p.m3u8
```

### 3. Test Frontend

```tsx
// Test HLS player component
<HLSVideoPlayer
  fileId="test-file-id"
  hlsUrl="https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/test/master.m3u8"
/>

// Expected: Video plays, quality selector works
```

---

## Migration from AWS Implementation

If you've already implemented the AWS/FairPlay version:

### 1. Keep What Works

```bash
# Keep these files (they're DRM-optional):
- database/migrations/010_drm_support.sql (just ignore DRM tables)
- src/components/media/SecureVideoPlayer.tsx (disable DRM features)
```

### 2. Replace

```bash
# Replace these:
- services/transcoding-service.js → Use new version with Spaces
- server-unified.js endpoints → Simplify, remove DRM checks
```

### 3. Add

```bash
# Add worker:
- services/ffmpeg-worker/* (new service)
```

### 4. Environment Variables

```bash
# Remove AWS vars:
- AWS_MEDIACONVERT_ENDPOINT
- AWS_MEDIACONVERT_ROLE
- AWS_KMS_KEY_ID
- FPS_* variables

# Add DO Spaces vars:
+ SPACES_ACCESS_KEY
+ SPACES_SECRET_KEY
+ SPACES_BUCKET
+ SPACES_ENDPOINT
+ SPACES_CDN
```

---

## Future Enhancements

### Near-term (Next Sprint)
1. **Thumbnail Extraction** - Extract keyframe during transcoding
2. **Email Notifications** - Alert when transcoding completes
3. **Retry Logic** - Auto-retry failed jobs
4. **Storage Quotas** - Limit uploads based on user tier

### Medium-term (Next Quarter)
1. **Parallel Workers** - Scale to multiple droplets for high volume
2. **Audio-only Transcoding** - Podcast/music streaming
3. **Live Streaming** - Real-time HLS for streams
4. **CDN Purge** - Automatic cache invalidation

### Long-term (If Needed)
1. **Add DRM Back** - FairPlay with minimal AWS (just KMS)
2. **Widevine Support** - Android DRM via Cloudflare Stream integration
3. **AI Encoding** - Quality-based encoding vs fixed bitrates

---

## Next Steps to Complete Implementation

1. **Update transcoding-service.js** (30 min)
2. **Simplify video player component** (1 hour)
3. **Create simplified upload UI** (1 hour)
4. **Run database migration** (15 min)
5. **Set up DigitalOcean Spaces** (30 min)
6. **Deploy worker to droplet** (1 hour)
7. **End-to-end test** (1 hour)

**Total estimated time**: ~5-6 hours

---

## Support & Resources

- **DigitalOcean Spaces Docs**: https://docs.digitalocean.com/products/spaces/
- **FFmpeg HLS Guide**: https://ffmpeg.org/ffmpeg-formats.html#hls-2
- **HLS.js Documentation**: https://github.com/video-dev/hls.js/
- **Fluent-FFmpeg**: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg

---

**Status**: Worker service complete, integration work remaining
**Next Priority**: Update transcoding-service.js to submit jobs to database
**Estimated Completion**: 1 day of focused work
