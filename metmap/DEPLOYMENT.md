# MetMap Deployment Guide

MetMap is designed to run as a standalone Next.js app at `metmap.fluxstudio.art`.

## Architecture

```
fluxstudio.art          → Main Flux Studio site (Vite/React)
metmap.fluxstudio.art   → MetMap standalone app (Next.js) ← This app
fluxstudio.art/metmap   → Redirects to metmap.fluxstudio.art
```

## Deploying MetMap to DigitalOcean

### 1. Push to a separate GitHub repo

```bash
cd metmap
git init
git add .
git commit -m "chore: initial MetMap scaffolding"
git remote add origin git@github.com:<your-username>/metmap.git
git push -u origin main
```

### 2. Create DigitalOcean App

1. Log into DigitalOcean → Apps → Create App
2. Connect your GitHub repo (`metmap`)
3. DO should auto-detect Next.js. If not:
   - Build command: `npm run build`
   - Run command: `npm start`
4. Deploy to get a default URL like `metmap-xxxxx.ondigitalocean.app`

### 3. Add Custom Domain

1. In the DO App settings → Domains
2. Add: `metmap.fluxstudio.art`
3. Create DNS record:
   ```
   metmap  CNAME  metmap-xxxxx.ondigitalocean.app
   ```
4. Wait for SSL certificate provisioning

## Redirect from `fluxstudio.art/metmap`

Since the main FluxStudio site uses Vite/React (not Next.js), you have several options:

### Option A: Server-level redirect (recommended)

If using Nginx/Apache on the main site:

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

Add to FluxStudio's `index.html` or create a redirect component:

```javascript
// In FluxStudio's router (React Router v6)
<Route
  path="/metmap"
  element={<Navigate to="https://metmap.fluxstudio.art" replace />}
/>
```

Or add a simple HTML page at `public/metmap/index.html`:

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

### Option C: DigitalOcean App Platform redirect

If the main site is also on DO App Platform, you can add a redirect rule in the app spec:

```yaml
routes:
  - path: /metmap
    redirect:
      uri: https://metmap.fluxstudio.art
      redirect_code: 302
```

## Environment Variables

MetMap currently uses localStorage only (no backend required). If you add backend features later:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | API base URL if separate from app |

## PWA Setup

MetMap includes a `manifest.json` for PWA support. For full PWA functionality:

1. Add app icons to `public/icons/`:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
   - `icon-maskable.png` (512x512 with safe zone)

2. Consider adding a service worker for offline support (e.g., using `next-pwa`)

## Routing Summary

MetMap runs at root (`/`), so its routes are:

| Route | Purpose |
|-------|---------|
| `/` | Song list |
| `/song/[id]` | Song editor |
| `/song/[id]/practice` | Practice mode |

No `/metmap` prefix needed within the app itself.
