# FluxStudio Admin Dashboard - Deployment Guide

**Date**: 2025-10-15
**Sprint**: 13, Day 6
**Status**: Ready for Production Deployment

---

## 🎯 Quick Start

This guide will help you deploy the FluxStudio admin dashboard to production in **under 10 minutes**.

---

## ✅ Prerequisites Checklist

Before deploying, ensure:

- [x] Backend API is running (flux-auth service)
- [x] Node.js and npm are installed locally
- [x] Access to production server (root@167.172.208.61)
- [ ] JWT_SECRET is set in production .env
- [ ] REACT_APP_API_URL is configured
- [ ] Admin user credentials created

---

## 📦 Step 1: Install Dependencies

```bash
cd /Users/kentino/FluxStudio

# Install required npm packages
npm install react-router-dom
npm install chart.js react-chartjs-2
npm install @types/react-router-dom --save-dev
```

**Expected Output**: Successfully installed packages

---

## ⚙️ Step 2: Configure Environment

Create or update `.env.production`:

```bash
cat > .env.production << 'EOF'
# API Configuration
REACT_APP_API_URL=https://fluxstudio.art

# Build Configuration
GENERATE_SOURCEMAP=false
EOF
```

**Verify**:
```bash
cat .env.production
```

---

## 🏗️ Step 3: Build Admin Dashboard

```bash
# Build the React application
npm run build

# Verify build completed successfully
ls -lh build/
```

**Expected Output**:
- `build/` directory created
- `build/index.html` exists
- `build/static/` contains JS/CSS bundles

**Estimated Build Time**: 30-60 seconds

---

## 🚀 Step 4: Deploy to Production

### Option A: Full Deployment (Recommended)

```bash
# Deploy entire build folder to production
rsync -avz --delete --exclude=node_modules \
  build/ root@167.172.208.61:/var/www/fluxstudio/admin/

# Verify deployment
ssh root@167.172.208.61 "ls -lh /var/www/fluxstudio/admin/"
```

### Option B: Update Only (Faster)

```bash
# Deploy only changed files
rsync -avz --exclude=node_modules \
  build/ root@167.172.208.61:/var/www/fluxstudio/admin/
```

**Expected Output**: Files transferred successfully

---

## 🔐 Step 5: Create Admin User Token

### Method 1: Using Node.js Script

```bash
ssh root@167.172.208.61 << 'ENDSSH'
cd /var/www/fluxstudio

# Create admin token
node -e "
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Create admin token
const token = jwt.sign(
  {
    id: 'admin_' + Date.now(),
    email: 'admin@fluxstudio.art',
    role: 'admin',
    userType: 'admin'
  },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '7d' }
);

console.log('');
console.log('='.repeat(80));
console.log('ADMIN TOKEN CREATED');
console.log('='.repeat(80));
console.log('');
console.log('Email: admin@fluxstudio.art');
console.log('Role: admin (Level 3 - Full Access)');
console.log('Expires: 7 days');
console.log('');
console.log('Token:');
console.log(token);
console.log('');
console.log('Add to Authorization header:');
console.log('Authorization: Bearer ' + token);
console.log('');
console.log('='.repeat(80));
console.log('');
"
ENDSSH
```

### Method 2: Using Admin Middleware Function

```bash
ssh root@167.172.208.61 << 'ENDSSH'
cd /var/www/fluxstudio

# Use the built-in createAdminToken function
node -e "
require('dotenv').config();
const { createAdminToken } = require('./lib/middleware/adminAuth');

console.log('\nCreating admin token...\n');
createAdminToken('admin@fluxstudio.art', 'admin');
"
ENDSSH
```

**Save the token** - You'll need it to login!

---

## 🌐 Step 6: Configure Nginx (If Needed)

If admin dashboard is served separately:

```bash
ssh root@167.172.208.61 << 'ENDSSH'
# Add to Nginx configuration
cat >> /etc/nginx/sites-available/fluxstudio << 'EOF'

# Admin Dashboard
location /admin {
    alias /var/www/fluxstudio/admin;
    try_files $uri $uri/ /admin/index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
ENDSSH
```

---

## ✅ Step 7: Verify Deployment

### 7.1 Check Backend Service

```bash
ssh root@167.172.208.61 "pm2 status flux-auth"
```

**Expected**: Status should be "online" with stable uptime

### 7.2 Test API Endpoints

```bash
# Test health endpoint (no auth required)
curl -s https://fluxstudio.art/api/admin/health \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" | jq

# Expected: System health information
```

### 7.3 Test Admin Dashboard

Open in browser:
```
https://fluxstudio.art/admin/login
```

**Expected**:
- Login page loads
- No console errors
- Professional dark theme UI

### 7.4 Test Login Flow

1. Open `https://fluxstudio.art/admin/login`
2. Enter email: `admin@fluxstudio.art`
3. Enter password: (your user password from database)
4. Click "Sign In"

**Expected**:
- Redirect to `/admin/dashboard`
- Dashboard loads with metrics
- No authentication errors

---

## 🧪 Testing Checklist

After deployment, verify each feature:

### Authentication ✅
- [ ] Login page loads
- [ ] Login with admin credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Token persists across page refresh
- [ ] Logout clears token and redirects

### Dashboard ✅
- [ ] Security metrics load
- [ ] Recent events display
- [ ] System health shows status
- [ ] Performance summary appears

### Blocked IPs ✅
- [ ] IP list loads with pagination
- [ ] Filter by score works
- [ ] Unblock button appears (don't test yet)
- [ ] Whitelist button appears (don't test yet)

### Tokens ✅
- [ ] Token list loads
- [ ] Search functionality works
- [ ] Status filter works
- [ ] Statistics display correctly

### Events ✅
- [ ] Event timeline displays
- [ ] Filters work (type, severity, date)
- [ ] Event details modal opens
- [ ] Export buttons appear (don't test yet)

### Performance ✅
- [ ] Performance metrics load
- [ ] System health displays
- [ ] Auto-refresh toggle works
- [ ] Time period selector works

### Navigation ✅
- [ ] Sidebar navigation works
- [ ] Active route highlights
- [ ] All pages accessible
- [ ] Role-based filtering (if moderator/analyst)

---

## 🔧 Troubleshooting

### Issue: Login Page Doesn't Load

**Check**:
```bash
# Verify admin files exist
ssh root@167.172.208.61 "ls -lh /var/www/fluxstudio/admin/"

# Check nginx configuration
ssh root@167.172.208.61 "nginx -t"

# Check nginx error log
ssh root@167.172.208.61 "tail -50 /var/log/nginx/error.log"
```

**Solution**: Re-deploy admin folder

### Issue: API Calls Fail (401 Unauthorized)

**Check**:
```bash
# Verify backend is running
ssh root@167.172.208.61 "pm2 status flux-auth"

# Check if token is valid
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq
```

**Solution**: Create new admin token

### Issue: CORS Errors

**Check**: Backend CORS configuration
```bash
ssh root@167.172.208.61 "grep CORS_ORIGINS /var/www/fluxstudio/.env"
```

**Solution**: Add admin origin to CORS_ORIGINS

### Issue: Dashboard Shows No Data

**Check**:
```bash
# Test API endpoint directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://fluxstudio.art/api/admin/security/blocked-ips/stats
```

**Solution**: Verify backend API is responding

### Issue: Console Shows Module Not Found

**Rebuild and redeploy**:
```bash
rm -rf build/
npm run build
rsync -avz build/ root@167.172.208.61:/var/www/fluxstudio/admin/
```

---

## 📊 Performance Monitoring

After deployment, monitor:

### Backend Service
```bash
# Watch PM2 status
ssh root@167.172.208.61 "pm2 monit"

# Check logs
ssh root@167.172.208.61 "pm2 logs flux-auth --lines 50"
```

### Dashboard Performance
```bash
# Check bundle size
ls -lh build/static/js/*.js
ls -lh build/static/css/*.css

# Expected: Total < 1 MB
```

### API Response Times
Use the Performance dashboard in the admin portal to monitor:
- Request latency (should be < 500ms)
- Error rate (should be < 1%)
- System health (should be "healthy")

---

## 🔐 Security Best Practices

### After Deployment:

1. **Change Default Credentials**
   - Update admin password in database
   - Rotate JWT_SECRET

2. **Enable HTTPS** (Already done ✅)
   - Verify SSL certificate
   - Force HTTPS redirect

3. **Configure Rate Limiting** (Already done ✅)
   - Backend: 10 req/min per admin
   - Verify it's working

4. **Monitor Audit Logs**
   ```bash
   ssh root@167.172.208.61 "tail -f /var/www/fluxstudio/logs/security.log"
   ```

5. **Restrict Admin Access**
   - Consider IP whitelist
   - Use VPN for admin access
   - Enable 2FA (future enhancement)

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1):
- [ ] Test all admin features
- [ ] Verify security metrics
- [ ] Check system health
- [ ] Review audit logs

### Week 1:
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Fix any bugs
- [ ] Optimize queries

### Month 1:
- [ ] Review security events
- [ ] Analyze usage patterns
- [ ] Plan enhancements
- [ ] Update documentation

---

## 🚀 Quick Commands Reference

### Deployment
```bash
# Full deployment pipeline
npm run build && \
rsync -avz build/ root@167.172.208.61:/var/www/fluxstudio/admin/ && \
echo "✅ Deployment complete!"
```

### Create Admin Token
```bash
ssh root@167.172.208.61 "cd /var/www/fluxstudio && node -e \"require('dotenv').config(); const {createAdminToken} = require('./lib/middleware/adminAuth'); createAdminToken('admin@fluxstudio.art', 'admin');\""
```

### Check Service Status
```bash
ssh root@167.172.208.61 "pm2 status flux-auth"
```

### View Logs
```bash
ssh root@167.172.208.61 "pm2 logs flux-auth --lines 100 --nostream"
```

### Restart Service (if needed)
```bash
ssh root@167.172.208.61 "pm2 restart flux-auth"
```

---

## 📞 Support & Documentation

### Documentation Files:
- `SPRINT_13_DAY_5_COMPLETE.md` - Backend API documentation
- `SPRINT_13_DAY_6_FINAL_COMPLETE.md` - Frontend implementation details
- `ADMIN_DEPLOYMENT_GUIDE.md` - This file

### API Documentation:
- All admin endpoints: See Day 5 documentation
- Authentication flow: JWT with RBAC
- Rate limiting: 10 requests/minute

### Component Documentation:
- Each component file includes JSDoc comments
- Hook usage examples in source code
- Route configuration in AdminApp.tsx

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ Login page loads at `/admin/login`
2. ✅ Admin can login with valid credentials
3. ✅ Dashboard displays real metrics
4. ✅ All navigation links work
5. ✅ No console errors
6. ✅ Backend service is stable
7. ✅ API calls return data
8. ✅ Performance is acceptable (< 1s page loads)

---

## 🎉 Completion

Once all steps are complete and tests pass:

**Your FluxStudio Admin Dashboard is LIVE!** 🚀

Access it at: `https://fluxstudio.art/admin`

---

**Deployment Guide v1.0**
*Created: 2025-10-15*
*Sprint 13, Day 6*
