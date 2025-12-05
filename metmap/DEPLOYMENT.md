# MetMap Deployment Guide

MetMap is designed to run as a standalone Next.js app at `metmap.fluxstudio.art`.

## Quick Start

Deploy MetMap to DigitalOcean App Platform in 4 steps:

### 1. Create the App

1. Log into [DigitalOcean](https://cloud.digitalocean.com/) → **Apps** → **Create App**
2. Select **GitHub** as the source
3. Authorize and select repo: `kentin0-fiz0l/FluxStudio`
4. Choose branch: `main`

### 2. Import the App Spec

1. In the app creation flow, click **Edit** next to the detected component
2. Click **Import App Spec** (or use "App Spec" tab)
3. Paste the contents of `metmap/.do/app.yaml` or point to the file
4. This configures:
   - Source directory: `metmap`
   - Build: `npm ci && npm run build`
   - Run: `npm start`
   - Port: `3000`
   - Feature flags (all enabled)

### 3. Deploy

1. Review the configuration
2. Select the cheapest plan (Basic, $5/mo is sufficient)
3. Click **Create Resources**
4. Wait for build and deployment (~3-5 minutes)
5. You'll get a URL like `metmap-xxxxx.ondigitalocean.app`

### 4. Attach Custom Domain

1. In your app's dashboard → **Settings** → **Domains**
2. Click **Add Domain** → enter `metmap.fluxstudio.art`
3. Add a DNS CNAME record:
   ```
   metmap  CNAME  metmap-xxxxx.ondigitalocean.app
   ```
4. Wait for SSL certificate provisioning (usually <5 minutes)

## Verification

After deployment, verify everything works:

### Basic Checks
- [ ] App loads at the DO-provided URL
- [ ] App loads at `metmap.fluxstudio.art` (after domain setup)
- [ ] No console errors in browser dev tools

### Feature Tests
- [ ] Demo song appears for first-time users
- [ ] Create a new song → verify it saves
- [ ] Navigate to practice page (`/song/[id]/practice`)
- [ ] Start metronome → hear clicks and see visual beat indicator
- [ ] Test tap tempo → verify BPM detection
- [ ] Test section looping

### Mobile/PWA
- [ ] Open on mobile device
- [ ] "Add to Home Screen" prompt appears (or use share menu)
- [ ] Installed PWA opens correctly
- [ ] Touch targets are easy to tap

## Using doctl (Optional)

If you have the [DigitalOcean CLI](https://docs.digitalocean.com/reference/doctl/) installed:

```bash
# One-time app creation (mirrors the UI steps above)
./scripts/do-create-metmap-app.sh
```

This is just a convenience wrapper—not CI. See the script for details.

---

## Architecture

```
fluxstudio.art          → Main Flux Studio site (Vite/React)
metmap.fluxstudio.art   → MetMap standalone app (Next.js) ← This app
fluxstudio.art/metmap   → Redirects to metmap.fluxstudio.art
```

## Redirect from `fluxstudio.art/metmap`

Since the main FluxStudio site uses Vite/React (not Next.js), you have several options:

### Option A: Server-level redirect (recommended)

**Nginx:**
```nginx
location /metmap {
    return 302 https://metmap.fluxstudio.art;
}
```

**Apache (.htaccess):**
```apache
Redirect 302 /metmap https://metmap.fluxstudio.art
```

### Option B: Client-side redirect

Add a simple HTML page at `public/metmap/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=https://metmap.fluxstudio.art">
  <title>Redirecting to MetMap...</title>
</head>
<body>
  <p>Redirecting to <a href="https://metmap.fluxstudio.art">MetMap</a>...</p>
</body>
</html>
```

## Environment Variables

MetMap uses localStorage only (no backend). Feature flags are configured in `.do/app.yaml`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FF_TEMPO_MAP_EDITOR` | Enable tempo map editor |
| `NEXT_PUBLIC_FF_VISUAL_ONLY_MODE` | Enable visual-only mode |
| `NEXT_PUBLIC_FF_LATENCY_CALIBRATION` | Enable latency calibration |
| `NEXT_PUBLIC_FF_DEMO_SONG` | Load demo song for new users |
| `NEXT_PUBLIC_FF_ONBOARDING` | Show onboarding for new users |

## PWA Setup

MetMap includes a `manifest.json` for PWA support. For full PWA functionality:

1. Add app icons to `public/icons/`:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
   - `icon-maskable.png` (512x512 with safe zone)

2. Consider adding a service worker for offline support (e.g., using `next-pwa`)

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Song list |
| `/song/[id]` | Song editor |
| `/song/[id]/practice` | Practice mode |

## Pre-Deployment Checklist

Before deploying:
- [ ] `npm run lint` passes (no errors)
- [ ] `npm run build` succeeds
- [ ] `npm start` runs locally
- [ ] Feature flags verified in `.do/app.yaml`
