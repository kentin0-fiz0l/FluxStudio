# FluxPrint Integration - Quick Start Guide

## ✅ Phase 1 Implementation Complete

All code has been implemented for seamless FluxPrint integration into FluxStudio.

## What Was Implemented

### 1. Backend Proxy Layer ✅
**File**: `server-unified.js`
- 8 API proxy endpoints forwarding to FluxPrint service
- Error handling with graceful degradation
- File upload support with multipart/form-data
- MJPEG camera stream proxying
- Service availability checking

### 2. Database Schema ✅
**File**: `database/migrations/012_printing_integration.sql`
- `print_jobs` table linking FluxStudio projects to prints
- 3 views for active jobs, history, and statistics
- Helper functions for status updates and cleanup
- Comprehensive indexes for performance

### 3. Frontend Components ✅
**File**: `src/components/printing/PrintingDashboard.tsx`
- Full-featured printing dashboard with iframe embedding
- Service status monitoring with auto-refresh
- Error handling with troubleshooting steps
- Professional UI matching FluxStudio design system

### 4. Routing & Navigation ✅
**Files**: `src/App.tsx`, `src/components/DashboardShell.tsx`
- Added `/printing` and `/dashboard/printing` routes
- Integrated "3D Printing" link in main navigation
- Added Printer icon from lucide-react

### 5. Configuration ✅
**Files**: `.env.production`, `.env.example`
- Added FluxPrint service URL configuration
- Added OctoPrint connection settings
- Feature flag for enabling/disabling integration

## Quick Start

### 1. Ensure Services Are Running

```bash
# FluxPrint Flask Backend (Terminal 1)
cd /path/to/FluxPrint
python app.py
# Should run on http://localhost:5001

# FluxPrint React Frontend (Terminal 2)
cd /path/to/FluxPrint/frontend
npm start
# Should run on http://localhost:3000

# FluxStudio Backend (Terminal 3)
cd /Users/kentino/FluxStudio
npm run start:unified
# Runs on http://localhost:3001

# FluxStudio Frontend (Terminal 4)
cd /Users/kentino/FluxStudio
npm run dev
# Should run on http://localhost:5173
```

### 2. Run Database Migration (When DB Available)

```bash
cd /Users/kentino/FluxStudio
node run-migrations.js
```

### 3. Access Printing Dashboard

Open browser to:
- http://localhost:5173/printing
- Or click "3D Printing" in the main navigation

## Testing Checklist

### Backend Proxy (Test with curl or browser)

```bash
# Test printer status
curl http://localhost:3001/api/printing/status

# Test current job
curl http://localhost:3001/api/printing/job

# Test queue
curl http://localhost:3001/api/printing/queue

# Test files
curl http://localhost:3001/api/printing/files

# Test temperature
curl http://localhost:3001/api/printing/temperature

# Test camera stream (should show MJPEG)
open http://localhost:3001/api/printing/camera/stream
```

### Frontend Integration

1. ✅ Navigate to http://localhost:5173/printing
2. ✅ Check service status badge (should show "Service Online" if FluxPrint running)
3. ✅ Verify iframe loads FluxPrint interface
4. ✅ Click "Refresh" button - should reload status
5. ✅ Click "Open in New Tab" - should open FluxPrint directly
6. ✅ Check navigation sidebar has "3D Printing" link
7. ✅ Verify printer icon displays correctly

### Error Handling

1. Stop FluxPrint service
2. Refresh dashboard
3. Should show "Service Unavailable" alert with troubleshooting steps
4. Start FluxPrint service
5. Click "Retry Connection"
6. Should transition to showing iframe

## File Summary

### Modified Files (5)
1. `/Users/kentino/FluxStudio/server-unified.js` - Backend proxy routes
2. `/Users/kentino/FluxStudio/.env.production` - Production config
3. `/Users/kentino/FluxStudio/.env.example` - Example config
4. `/Users/kentino/FluxStudio/src/App.tsx` - Route definitions
5. `/Users/kentino/FluxStudio/src/components/DashboardShell.tsx` - Navigation

### Created Files (3)
1. `/Users/kentino/FluxStudio/database/migrations/012_printing_integration.sql` - DB schema
2. `/Users/kentino/FluxStudio/src/components/printing/PrintingDashboard.tsx` - UI component
3. `/Users/kentino/FluxStudio/PRINTING_INTEGRATION.md` - Full documentation

## Environment Variables

Add to your `.env` file:

```bash
# FluxPrint Integration
FLUXPRINT_SERVICE_URL=http://localhost:5001
FLUXPRINT_ENABLED=true
OCTOPRINT_URL=http://10.0.0.210
OCTOPRINT_CAMERA_URL=http://10.0.0.210:8080/?action=stream
```

## Troubleshooting

### Service Unavailable Error
**Problem**: Dashboard shows "FluxPrint Service Unavailable"
**Solution**:
- Check FluxPrint Flask is running: `curl http://localhost:5001/api/printer/status`
- Verify `FLUXPRINT_ENABLED=true` in environment
- Check server logs: `npm run start:unified`

### iframe Not Loading
**Problem**: Blank iframe or loading spinner forever
**Solution**:
- Check FluxPrint React frontend is running: `curl http://localhost:3000`
- Check browser console for errors
- Verify sandbox permissions in component

### Camera Stream Issues
**Problem**: Camera not showing
**Solution**:
- Verify OctoPrint running: http://10.0.0.210
- Test camera directly: http://10.0.0.210:8080/?action=stream
- Check network connectivity to printer

### Database Migration Fails
**Problem**: Migration script errors
**Solution**:
- Ensure PostgreSQL is running
- Check connection string in `.env`
- Verify user has CREATE TABLE permissions

## Next Steps (Not Implemented)

### Phase 2: Native UI Components
- Build React components instead of iframe
- Consistent design with FluxStudio
- Better mobile experience

### Phase 3: Deep Integration
- Print directly from project files
- Automatic STL → G-code conversion
- Print history in project timeline

### Phase 4: Advanced Features
- Multi-printer support
- AI-powered print optimization
- Material usage tracking
- Cost estimation

## Support

For detailed information, see:
- [PRINTING_INTEGRATION.md](PRINTING_INTEGRATION.md) - Full technical documentation
- FluxPrint documentation
- FluxStudio documentation

## Success Criteria

✅ All code implemented
✅ Documentation complete
⏳ Database migration pending (DB not running)
⏳ Manual testing pending
⏳ Security review pending
⏳ Code review pending

**Status**: Ready for Testing & Review
**Version**: 1.0.0
**Date**: November 6, 2025
