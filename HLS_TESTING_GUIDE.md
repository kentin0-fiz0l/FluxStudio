# HLS Video Transcoding - End-to-End Testing Guide

**Deployment Status:** ✅ ACTIVE (Deployment #15)
**Date:** 2025-11-03
**All Services:** HEALTHY

---

## 📋 Pre-Test Checklist

### Infrastructure Status
- ✅ **Frontend:** https://fluxstudio.art (Status: 200)
- ✅ **Unified Backend:** /api/health (Status: HEALTHY)
- ✅ **Collaboration Service:** Running
- ✅ **Flux MCP:** Running
- ✅ **FFmpeg Worker:** Running as service with /health endpoint

### Components Deployed
1. Frontend (Static Site) - WITH HLS SUPPORT
2. Unified Backend - All secrets configured
3. Collaboration Service - DATABASE_URL set
4. Flux MCP - MCP_AUTH_TOKEN set
5. FFmpeg Worker - NOW AS SERVICE (port 8080)

---

## 🎬 Step 1: Upload a Video File

### 1.1 Access the Application
```
URL: https://fluxstudio.art
```

### 1.2 Upload Process
1. Open the site in your browser
2. Navigate to the file upload interface
3. Select a sample video file (MP4, MOV, or AVI recommended)
4. Click upload
5. **Expected Result:** Upload progress indicator shows 100%

### 1.3 What Happens Behind the Scenes
- File is uploaded to DigitalOcean Spaces (bucket: `fluxstudio`)
- A new entry is created in the `files` table with `transcoding_status='pending'`
- A new job is created in the `transcoding_jobs` table with `status='pending'`

---

## ⚙️ Step 2: Monitor Transcoding Job

### 2.1 Check Job Status via API
```bash
# Get list of transcoding jobs (requires authentication)
curl https://fluxstudio.art/api/transcoding/jobs

# Get specific job status
curl https://fluxstudio.art/api/transcoding/jobs/{JOB_ID}
```

### 2.2 Expected Job Progression
```
pending → processing (0-100%) → completed
```

### 2.3 Monitor via Database (Optional)
If you have direct database access:
```sql
-- Check transcoding jobs
SELECT id, file_id, status, progress, error_message, created_at, started_at, completed_at
FROM transcoding_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Check file transcoding status
SELECT id, filename, transcoding_status, hls_manifest_url, created_at
FROM files
ORDER BY created_at DESC
LIMIT 10;
```

### 2.4 Monitor FFmpeg Worker Logs
Via DigitalOcean Console:
```
URL: https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781

1. Click on "ffmpeg-worker" service
2. Go to "Runtime Logs" tab
3. Look for:
   - "[Worker] Starting FFmpeg transcoding worker"
   - "[Job {id}] Starting transcoding for file {file_id}"
   - "[Job {id}] Downloading from Spaces..."
   - "[Job {id}] Starting FFmpeg transcoding"
   - "[FFmpeg] Transcoding finished"
   - "[Job {id}] Uploading HLS files to Spaces"
   - "[Job {id}] Completed successfully"
```

### 2.5 Transcoding Timeline (Typical)
For a 1-minute 1080p video:
- **Download:** ~5-10 seconds
- **Transcode:** ~30-60 seconds (creates 1080p, 720p, 480p variants)
- **Upload:** ~10-20 seconds
- **Total:** ~45-90 seconds

---

## 📦 Step 3: Verify HLS Output in Spaces

### 3.1 Access DigitalOcean Spaces
```
URL: https://cloud.digitalocean.com/spaces

Bucket: fluxstudio
Region: sfo3
CDN: https://fluxstudio.sfo3.cdn.digitaloceanspaces.com
```

### 3.2 Expected File Structure
```
fluxstudio/
├── hls/
│   └── {file_id}/
│       ├── master.m3u8          (Master playlist)
│       ├── segment_0_000.ts     (1080p segments)
│       ├── segment_0_001.ts
│       ├── segment_0_002.ts
│       ├── segment_1_000.ts     (720p segments)
│       ├── segment_1_001.ts
│       ├── segment_1_002.ts
│       ├── segment_2_000.ts     (480p segments)
│       ├── segment_2_001.ts
│       └── segment_2_002.ts
```

### 3.3 HLS Manifest URL
The `hls_manifest_url` in the database should look like:
```
https://fluxstudio.sfo3.cdn.digitaloceanspaces.com/hls/{file_id}/master.m3u8
```

### 3.4 Verify Files Manually
```bash
# Test master playlist accessibility
curl -I https://fluxstudio.sfo3.cdn.digitaloceanspaces.com/hls/{file_id}/master.m3u8

# Expected Response: 200 OK
# Content-Type: application/vnd.apple.mpegurl
```

---

## ▶️ Step 4: Test Video Playback

### 4.1 In-App Playback
1. Navigate to the video library in FluxStudio
2. Find your uploaded video
3. Click the play button
4. **Expected Result:**
   - Video starts playing immediately
   - Adaptive bitrate switching works (quality adjusts to network speed)
   - No buffering or lag

### 4.2 Test with VLC (Alternative)
If in-app playback doesn't work, test the HLS stream directly:
```
1. Download VLC Media Player (https://www.videolan.org/)
2. Open VLC
3. Media → Open Network Stream
4. Enter URL: https://fluxstudio.sfo3.cdn.digitaloceanspaces.com/hls/{file_id}/master.m3u8
5. Click Play
```

### 4.3 Test with Browser DevTools
```
1. Open FluxStudio in Chrome/Firefox
2. Press F12 to open DevTools
3. Go to Network tab
4. Filter by "m3u8" or "ts"
5. Play the video
6. Verify:
   - master.m3u8 is loaded (200 OK)
   - Variant playlists are loaded (200 OK)
   - .ts segments are streaming (200 OK)
```

---

## 🐛 Troubleshooting

### Issue 1: Upload Fails
**Symptoms:** Upload button doesn't work or shows error

**Possible Causes:**
- SPACES_ACCESS_KEY or SPACES_SECRET_KEY not set
- File size exceeds MAX_FILE_SIZE (default: 50MB)

**Check:**
```bash
curl https://fluxstudio.art/api/health | jq '.storage'
```

**Fix:**
1. Go to https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781/settings
2. Verify SPACES_ACCESS_KEY and SPACES_SECRET_KEY are set for:
   - unified-backend
   - ffmpeg-worker

---

### Issue 2: Job Stays in "Pending" Status
**Symptoms:** Job created but never starts processing

**Possible Causes:**
- FFmpeg worker not polling database
- DATABASE_URL not set for ffmpeg-worker
- Worker crashed on startup

**Check FFmpeg Worker Health:**
```bash
# Via DigitalOcean Console - check ffmpeg-worker logs for:
# "[Worker] Starting FFmpeg transcoding worker"
# "[Worker] Polling started"
```

**Check Database Connection:**
```bash
# FFmpeg worker logs should show:
# "✓ Database connected"
```

---

### Issue 3: Job Fails During Processing
**Symptoms:** Job status = 'failed', error_message populated

**Common Error Messages:**

**"Failed to download video"**
- SPACES_ACCESS_KEY/SPACES_SECRET_KEY incorrect
- Input file was deleted from Spaces

**"FFmpeg transcoding failed"**
- Video format not supported
- Corrupted video file
- Insufficient memory/CPU

**"Failed to upload HLS files"**
- SPACES_SECRET_KEY incorrect
- Spaces bucket permissions issue

**Debug:**
```sql
-- Check error details
SELECT id, file_id, status, progress, error_message, completed_at
FROM transcoding_jobs
WHERE status = 'failed'
ORDER BY completed_at DESC;
```

---

### Issue 4: HLS Files Not Accessible
**Symptoms:** master.m3u8 returns 403 or 404

**Possible Causes:**
- Files not uploaded to Spaces
- ACL not set to 'public-read'
- Incorrect CDN URL

**Verify:**
1. Check Spaces console for files
2. Verify file permissions are public
3. Test CDN URL format:
   ```
   https://fluxstudio.sfo3.cdn.digitaloceanspaces.com/hls/{file_id}/master.m3u8
   ```

---

### Issue 5: Video Won't Play in Browser
**Symptoms:** Player loads but video doesn't start

**Check Browser Console:**
- Look for CORS errors
- Look for network errors (404, 403)
- Check if .m3u8 playlist loads

**Test HLS Compatibility:**
```javascript
// In browser console
if (Hls.isSupported()) {
    console.log('HLS is supported');
} else {
    console.log('HLS not supported - check browser compatibility');
}
```

**Browser Support:**
- ✅ Safari: Native HLS support
- ✅ Chrome: Requires HLS.js library
- ✅ Firefox: Requires HLS.js library
- ✅ Edge: Requires HLS.js library

---

## 📊 Performance Benchmarks

### Expected Performance
| Video Duration | Resolution | Transcode Time | Output Size |
|---------------|-----------|----------------|-------------|
| 1 minute      | 1080p     | 30-60s         | 15-25 MB    |
| 5 minutes     | 1080p     | 2-4 minutes    | 75-125 MB   |
| 10 minutes    | 1080p     | 4-8 minutes    | 150-250 MB  |

### HLS Output Details
- **Variants:** 3 (1080p, 720p, 480p)
- **Segment Duration:** 6 seconds
- **Video Codec:** H.264
- **Audio Codec:** AAC
- **Container:** MPEG-TS (.ts)

---

## ✅ Success Criteria

Your HLS transcoding system is working correctly if:

1. ✅ **Upload works:** Video file uploads successfully to Spaces
2. ✅ **Job created:** New entry appears in `transcoding_jobs` table
3. ✅ **Job processes:** Status changes from 'pending' → 'processing' → 'completed'
4. ✅ **Files generated:** HLS files appear in Spaces under `hls/{file_id}/`
5. ✅ **Manifest accessible:** master.m3u8 returns 200 OK
6. ✅ **Playback works:** Video plays smoothly in browser or VLC
7. ✅ **Adaptive streaming:** Quality switches based on network speed

---

## 📞 Support

If you encounter issues not covered in this guide:

1. **Check ffmpeg-worker logs** in DigitalOcean Console
2. **Check unified-backend logs** for upload/API errors
3. **Query database** for job status and error messages
4. **Test HLS URL** directly in VLC to isolate playback issues

**DigitalOcean Console:**
https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781

**Deployment #15 Details:**
https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781/deployments/6a3a6f57-319f-407d-ae64-e2c35c5f9250

---

## 🎉 Congratulations!

If you've completed all steps successfully, your HLS video transcoding pipeline is **fully operational**!

**Architecture Deployed:**
- ✅ Multi-bitrate adaptive streaming (1080p, 720p, 480p)
- ✅ Automatic transcoding on upload
- ✅ CDN-backed HLS delivery
- ✅ Real-time job status tracking
- ✅ Scalable worker architecture

**Next Steps:**
- Monitor transcoding jobs in production
- Optimize FFmpeg settings for quality/speed balance
- Add email notifications for completed jobs
- Implement transcoding queue prioritization
- Add support for more video formats
