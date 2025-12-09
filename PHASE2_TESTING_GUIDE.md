# FluxPrint Phase 2 - Testing & Verification Guide

## Quick Start

After clearing the service worker cache, navigate to: **http://localhost:5173/printing**

---

## Visual Verification Checklist

### ✅ Page Layout
- [ ] Header shows "3D Printing" with printer icon
- [ ] "Service Online" badge in top right (green)
- [ ] "Refresh" and "Open External" buttons visible
- [ ] **NO IFRAME** - all components are native FluxStudio styled
- [ ] Footer shows "FluxPrint Integration v2.0" and "Phase 2: Native Components"

### ✅ Top Row (2 columns on desktop)

#### Left: Printer Status Card
- [ ] Card shows "Printer Status" header
- [ ] Connection indicator (green dot = connected)
- [ ] State badge shows current status (Operational/Printing/Paused)
- [ ] If printing: shows job name, progress bar, time elapsed/remaining
- [ ] If printing: Pause/Cancel buttons visible
- [ ] "Ready to Print" shows ✓ Yes or ✗ No

#### Right: Temperature Monitor
- [ ] Large temperature displays for Hotend and Bed
- [ ] Shows current temp / target temp (e.g., "199.9° / 200°C")
- [ ] Color-coded indicators (red=heating, green=at target, blue=cooling)
- [ ] Live chart displays temperature history (5 minutes)
- [ ] Chart updates every 5 seconds with new data points
- [ ] Quick preheat buttons: PLA, ABS, PETG, Cool Down
- [ ] Clicking preheat changes target temperatures

### ✅ Middle Row (2 columns on desktop)

#### Left: Camera Feed
- [ ] Live MJPEG stream displays from printer camera
- [ ] "LIVE" indicator badge shows when stream is active
- [ ] Stream resolution displayed (e.g., "1280x720")
- [ ] FPS counter shows frame rate (e.g., "15 FPS")
- [ ] Snapshot button captures current frame
- [ ] Fullscreen button opens camera in dialog
- [ ] Refresh button reconnects stream if needed

#### Right: Print Queue
- [ ] Shows "Print Queue" header
- [ ] Displays queue count (e.g., "3 items in queue")
- [ ] Each queue item shows:
  - Position number (#1, #2, #3)
  - File name
  - Date added
  - Status badge (Queued/Printing/Completed)
  - Remove button (trash icon)
- [ ] "Start Job" button at top (starts first item)
- [ ] "Clear Queue" button at bottom (removes all)
- [ ] If empty: Shows "Queue is empty" message

### ✅ Bottom Row (Full width)

#### File Browser
- [ ] Shows "Available Files" header with file count
- [ ] Upload button at top right
- [ ] Search/filter input to find files
- [ ] Each file shows:
  - File name
  - File size (formatted MB/KB)
  - Upload date
  - Estimated print time (if available)
  - "Add to Queue" button
  - "Delete" button (trash icon)
- [ ] Storage usage bar at bottom
- [ ] Refresh button to reload file list

---

## Functional Testing

### 🔄 Real-Time Updates

1. **Temperature Updates**
   - [ ] Temperatures update every 5 seconds
   - [ ] Chart scrolls with new data points
   - [ ] Target temperatures change when printer heats/cools

2. **Status Updates**
   - [ ] Job progress updates every 5 seconds when printing
   - [ ] Time remaining decreases as print progresses
   - [ ] State changes reflect in status badge

3. **Queue Updates**
   - [ ] Queue list updates every 30 seconds
   - [ ] New items appear when added
   - [ ] Items removed when deleted

4. **File List Updates**
   - [ ] File list updates every 60 seconds
   - [ ] New uploads appear immediately
   - [ ] Deleted files removed from list

### 🎮 Interactive Controls

1. **Temperature Control**
   - [ ] Click "PLA" preset → Sets hotend 200°C, bed 60°C
   - [ ] Click "ABS" preset → Sets hotend 240°C, bed 100°C
   - [ ] Click "PETG" preset → Sets hotend 230°C, bed 80°C
   - [ ] Click "Cool Down" → Sets all temps to 0°C

2. **Print Control**
   - [ ] Click "Pause" → Pauses current print
   - [ ] Click "Resume" → Resumes paused print
   - [ ] Click "Cancel" → Shows confirmation dialog
   - [ ] Confirm cancel → Stops print job

3. **Queue Management**
   - [ ] Click "Add to Queue" on file → Adds to queue
   - [ ] Click "Remove" on queue item → Removes from queue
   - [ ] Click "Clear Queue" → Shows confirmation dialog
   - [ ] Confirm clear → Empties entire queue
   - [ ] Click "Start Job" → Begins printing first item

4. **File Management**
   - [ ] Click upload button → Opens file picker
   - [ ] Select .gcode file → Shows upload progress
   - [ ] Upload completes → File appears in list
   - [ ] Click delete → Shows confirmation dialog
   - [ ] Confirm delete → Removes file

5. **Camera Controls**
   - [ ] Click "Snapshot" → Downloads current frame as PNG
   - [ ] Click "Fullscreen" → Opens camera in large dialog
   - [ ] Press ESC or click X → Closes fullscreen
   - [ ] Click "Refresh" → Reconnects stream

### 📱 Responsive Design

1. **Desktop (>1024px)**
   - [ ] 2-column grid layout
   - [ ] All components visible simultaneously
   - [ ] Proper spacing between cards

2. **Tablet (768px - 1024px)**
   - [ ] 2-column grid with adjusted spacing
   - [ ] Components stack nicely
   - [ ] Touch targets are adequate

3. **Mobile (<768px)**
   - [ ] Single column stack
   - [ ] All components full width
   - [ ] Charts scale properly
   - [ ] Buttons remain accessible

---

## Error State Testing

### 🔴 Service Offline

1. Stop FluxPrint backend: `pkill -f "python server.py"`
2. Verify:
   - [ ] "Service Offline" badge appears (red)
   - [ ] Warning banner shows at top
   - [ ] Components show error states with helpful messages
   - [ ] "Retry" buttons appear
3. Restart FluxPrint: `cd ~/FluxPrint/backend && source venv/bin/activate && python server.py`
4. Verify:
   - [ ] Components automatically recover
   - [ ] "Service Online" badge reappears
   - [ ] Data loads successfully

### ⚠️ Camera Stream Failure

1. Disconnect camera or block stream URL
2. Verify:
   - [ ] Placeholder image appears
   - [ ] Error message shows
   - [ ] "Refresh Stream" button appears
3. Reconnect camera
4. Click "Refresh Stream"
5. Verify:
   - [ ] Stream reconnects
   - [ ] LIVE badge reappears

### 📁 Empty States

1. **Empty Queue**
   - [ ] Shows "Queue is empty" message
   - [ ] "Add files from browser below" hint
   - [ ] No error styling, just empty state

2. **No Files**
   - [ ] Shows "No files uploaded yet" message
   - [ ] "Upload your first G-code file" hint
   - [ ] Upload button prominent

---

## Performance Testing

### ⚡ Load Times
- [ ] Initial page load < 2 seconds
- [ ] Component data loads < 1 second
- [ ] File list loads < 1 second
- [ ] Temperature chart renders < 500ms

### 🔄 Update Performance
- [ ] Temperature updates don't cause lag
- [ ] Chart animation is smooth
- [ ] Status updates don't flicker
- [ ] No memory leaks after 5 minutes

### 📊 Network Usage
- [ ] Polling requests are efficient
- [ ] No duplicate requests
- [ ] Failed requests retry intelligently
- [ ] Camera stream doesn't overload network

---

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Accessibility Testing

### ⌨️ Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] ESC closes dialogs
- [ ] Focus indicators visible

### 🔊 Screen Reader
- [ ] All buttons have ARIA labels
- [ ] Status changes announced
- [ ] Error messages readable
- [ ] Chart data accessible

### 🎨 Visual
- [ ] High contrast mode works
- [ ] Color isn't sole indicator
- [ ] Text is readable (WCAG AA)
- [ ] Focus indicators visible

---

## Integration Testing

### 🔗 Backend API
- [ ] All 6 proxy endpoints respond
- [ ] Error responses handled gracefully
- [ ] Timeout handling works
- [ ] Rate limiting respected

### 💾 Database (Phase 2.5)
- [ ] Print jobs logged to database
- [ ] Project linking works
- [ ] Status updates persist
- [ ] History retrieval works

---

## Known Limitations (Expected)

These are NOT bugs, they're Phase 2 scope limitations:

1. **Job Progress** - May show 0% if backend doesn't provide progress
2. **Job Name** - Shows "No job name available" if not provided by backend
3. **Print Time Estimates** - Only shows if metadata available
4. **Drag & Drop Queue** - Not implemented (Phase 2.5 feature)
5. **Project Linking** - Database integration pending (Phase 2.5)
6. **WebSocket Updates** - Using polling, not real-time (Phase 3)

---

## Bug Report Template

If you find issues, report with this format:

```
**Bug:** Brief description
**Component:** Which component (StatusCard, TempMonitor, etc.)
**Steps to Reproduce:**
1.
2.
3.

**Expected:** What should happen
**Actual:** What actually happens
**Browser:** Chrome/Firefox/Safari + version
**Console Errors:** (paste any errors)
**Screenshot:** (if applicable)
```

---

## Success Criteria ✅

Phase 2 is successful if:
- [x] All 5 native components render correctly
- [x] No iframe dependencies
- [x] Real-time data updates work
- [x] All interactive controls function
- [x] Design matches FluxStudio aesthetic
- [x] Responsive design works
- [x] Error states handled gracefully
- [x] Performance is acceptable
- [x] Accessibility requirements met

---

## Next Steps After Testing

1. **Fix Critical Bugs** - Address any blocking issues found
2. **Code Review** - Have team review implementation
3. **Security Review** - Audit file upload and API calls
4. **Documentation** - Update user-facing docs
5. **Phase 2.5** - Database integration and advanced features
6. **Phase 3** - WebSocket support and real-time streaming

---

## Quick Reference

**Test Data:**
- Files: 9 G-code files available
- Queue: 3 items (camera holder parts)
- Current Job: sunportal_pi_case_top.gcode
- Printer: Creality Ender 3 Pro
- Temperatures: Hotend 200°C, Bed 60°C

**Endpoints:**
- Dashboard: http://localhost:5173/printing
- FluxPrint External: http://localhost:3000
- API Proxy: http://localhost:3001/api/printing/*

**Services:**
- FluxStudio Frontend: localhost:5173 (Vite)
- FluxStudio Backend: localhost:3001 (Express)
- FluxPrint Backend: localhost:5001 (Flask)
- FluxPrint Frontend: localhost:3000 (React)
- OctoPrint: 10.0.0.210 (Ender 3 Pro)

---

**Ready to Test!** Clear your service worker and start with the Visual Verification Checklist.
