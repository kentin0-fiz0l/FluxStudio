# FluxPrint Phase 2: Quick Start Guide

## Overview
This guide helps you quickly start testing the new native FluxPrint components.

---

## What's New in Phase 2?

### Before (Phase 1)
- Single iframe embedding entire FluxPrint UI
- Limited customization
- No integration with FluxStudio design system

### After (Phase 2)
- 5 native React components + dashboard
- Full customization and theming
- Seamless FluxStudio design integration
- Better performance and user experience

---

## Files Created

```
src/components/printing/
├── index.ts                    # Component exports
├── PrintingDashboard.tsx       # Main layout (refactored)
├── PrinterStatusCard.tsx       # Printer status & job control
├── TemperatureMonitor.tsx      # Temperature display with chart
├── CameraFeed.tsx              # Live camera stream
├── PrintQueue.tsx              # Queue management
└── FileBrowser.tsx             # File browser & upload

Total: 7 files, 2,077 lines of code
```

---

## Quick Start (5 Minutes)

### 1. Ensure Dependencies
```bash
cd /Users/kentino/FluxStudio
npm install  # All dependencies already installed
```

### 2. Start FluxPrint Service
```bash
# Start FluxPrint Flask service on port 5001
# (Refer to FluxPrint documentation for startup commands)
```

### 3. Start FluxStudio
```bash
cd /Users/kentino/FluxStudio
npm run dev
```

### 4. Open Dashboard
Navigate to: `http://localhost:3000/printing`

---

## Component Breakdown

### 1. PrinterStatusCard
**What it does:** Shows printer connection status and active job
**Key features:**
- Connection indicator (green/red dot)
- Printer state badge
- Job progress (when printing)
- Pause/Resume/Cancel buttons
- Time elapsed and remaining

**Test by:**
- Start a print job
- Click Pause/Resume
- Click Cancel (with confirmation)

---

### 2. TemperatureMonitor
**What it does:** Displays temperatures with live chart
**Key features:**
- Large hotend and bed temperature displays
- Color-coded status (green=target, red=heating, blue=cooling)
- 5-minute temperature history chart
- Quick preheat presets (PLA, ABS, PETG)
- Cool down button

**Test by:**
- Click PLA preset (200°C/60°C)
- Watch chart update in real-time
- Click Cool button to set temps to 0

---

### 3. CameraFeed
**What it does:** Live printer camera stream
**Key features:**
- MJPEG stream with LIVE indicator
- Snapshot button (downloads image)
- Fullscreen button
- Stream refresh button
- Error handling with retry

**Test by:**
- Verify camera stream appears
- Click Snapshot (downloads .jpg)
- Click Fullscreen
- Disconnect camera and click Retry

---

### 4. PrintQueue
**What it does:** Manage print job queue
**Key features:**
- List of queued jobs with position numbers
- Job status badges
- Start button for first queued item
- Remove button for each item
- Clear Queue button
- Progress bar for printing jobs

**Test by:**
- Add files from FileBrowser
- Reorder queue (drag-and-drop not yet implemented)
- Start first job
- Remove items from queue

---

### 5. FileBrowser
**What it does:** Browse and upload G-code files
**Key features:**
- File list with metadata (size, date, estimated time)
- Search/filter files
- Upload button (multiple files)
- Add to Queue button (per file)
- Delete button with confirmation
- Storage usage footer

**Test by:**
- Click Upload and select .gcode files
- Search for specific files
- Add files to queue
- Delete files (shows confirmation)

---

### 6. PrintingDashboard
**What it does:** Main layout integrating all components
**Key features:**
- Responsive grid (2-col desktop, 1-col mobile)
- Service status banner
- Refresh button
- Open External button
- Real-time polling (30s intervals)

**Layout:**
```
Desktop (lg+):
┌─────────────────────────────────────┐
│ Header (Status, Buttons)            │
├────────────────┬────────────────────┤
│ Status Card    │ Temperature        │
├────────────────┼────────────────────┤
│ Camera Feed    │ Print Queue        │
├────────────────┴────────────────────┤
│ File Browser (Full Width)           │
└─────────────────────────────────────┘
```

---

## Testing Scenarios

### Happy Path
1. Open dashboard
2. Verify all components load
3. Upload a .gcode file
4. Add file to queue
5. Start print job
6. Monitor temperature
7. Watch camera feed
8. Pause/Resume print
9. Cancel print

### Error Scenarios
1. FluxPrint service offline → Service banner appears
2. No printer connected → Offline status shows
3. Invalid file upload → Error message displays
4. Network timeout → Retry button appears

---

## Common Issues & Solutions

### "Service Offline" banner shows
**Problem:** FluxPrint service not running
**Solution:**
1. Start FluxPrint service on port 5001
2. Verify with: `curl http://localhost:5001/api/status`
3. Click "Retry Connection" in dashboard

### Camera stream not loading
**Problem:** Camera URL incorrect or camera offline
**Solution:**
1. Verify camera is connected to printer
2. Check FluxPrint camera configuration
3. Click refresh button in CameraFeed
4. Check browser console for errors

### TypeScript errors
**Problem:** Missing types or imports
**Solution:**
```bash
cd /Users/kentino/FluxStudio
npm run type-check  # Verify no errors
```

### Components not updating
**Problem:** Polling not working
**Solution:**
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check network tab in DevTools
4. Manually click Refresh button

---

## API Endpoints Reference

### Status & Data
- `GET /api/printing/status` - Printer status
- `GET /api/printing/job` - Current job
- `GET /api/printing/queue` - Print queue
- `GET /api/printing/files` - File list

### Camera
- `GET /api/printing/camera/stream` - MJPEG stream
- `GET /api/printing/camera/snapshot` - Snapshot

### Control
- `POST /api/printing/job/pause` - Pause job
- `POST /api/printing/job/resume` - Resume job
- `POST /api/printing/job/cancel` - Cancel job

### Temperature
- `POST /api/printing/temperature/bed` - Set bed temp
- `POST /api/printing/temperature/hotend` - Set hotend temp

### Files & Queue
- `POST /api/printing/files/upload` - Upload files
- `DELETE /api/printing/files/{filename}` - Delete file
- `POST /api/printing/queue` - Add to queue
- `DELETE /api/printing/queue/{id}` - Remove from queue
- `POST /api/printing/queue/{id}/start` - Start job

---

## Development Workflow

### Making Changes
1. Edit component in `src/components/printing/`
2. Save (hot reload should work)
3. Check browser for updates
4. Verify TypeScript: `npm run type-check`

### Adding New Features
1. Update types in `src/types/printing.ts`
2. Add API calls to `src/hooks/usePrinterStatus.ts`
3. Update component to use new data
4. Test thoroughly

### Debugging
```typescript
// Add debug logging to components
console.log('PrinterStatus:', status);
console.log('Queue:', queue);
console.log('Files:', files);

// Check hook state
const { status, loading, error } = usePrinterStatus();
console.log({ status, loading, error });
```

---

## Browser DevTools Tips

### Network Tab
- Filter: `printing` to see API calls
- Check response times (should be < 1s)
- Verify polling intervals

### Console
- Watch for React warnings
- Check for API errors
- Monitor performance

### React DevTools
- Inspect component props
- Check re-render frequency
- Verify hook state

---

## Performance Tips

### Optimizing Polling
```typescript
// In PrintingDashboard.tsx
usePrinterStatus({
  statusInterval: 30000,  // Increase for less frequent updates
  jobInterval: 5000,      // Keep fast when printing
})
```

### Reducing Chart Data
```typescript
// In usePrinterStatus.ts
maxTempReadings: 50,  // Reduce from 100 to save memory
```

---

## Keyboard Shortcuts (Future)

Currently not implemented, but planned:
- `R` - Refresh all data
- `Space` - Pause/Resume print
- `Esc` - Close dialogs
- `S` - Take snapshot
- `F` - Toggle fullscreen camera

---

## Mobile Testing

### Responsive Breakpoints
- **Mobile:** < 768px (sm)
- **Tablet:** 768px - 1024px (md)
- **Desktop:** > 1024px (lg)

### Touch Targets
All buttons are 44x44px minimum for touch accessibility.

### Mobile Layout
All components stack vertically in single column.

---

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close dialogs

### Screen Readers
- ARIA labels on icon-only buttons
- Status announcements
- Progress updates

---

## Next Steps After Testing

1. Review testing checklist: `FLUXPRINT_PHASE2_TESTING.md`
2. Report bugs or issues
3. Suggest improvements
4. Plan Phase 3 features (WebSockets, analytics, etc.)

---

## Help & Documentation

- **Testing Checklist:** `FLUXPRINT_PHASE2_TESTING.md`
- **Implementation Summary:** `FLUXPRINT_PHASE2_COMPLETE.md`
- **Type Definitions:** `src/types/printing.ts`
- **Hook Documentation:** `src/hooks/usePrinterStatus.ts`

---

## Quick Commands

```bash
# Start development
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# View component tree
# Use React DevTools browser extension
```

---

**Status:** Ready for Testing ✅
**Last Updated:** November 6, 2025
