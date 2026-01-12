# FluxPrint Phase 2: Component Architecture

## Component Hierarchy

```
PrintingDashboard
├── Header
│   ├── Service Badge (Online/Offline)
│   ├── Refresh Button
│   └── Open External Button
│
├── Service Offline Banner (conditional)
│   ├── Alert with troubleshooting
│   └── Retry/Test buttons
│
├── Main Grid Layout
│   ├── Row 1: Status & Temperature
│   │   ├── PrinterStatusCard
│   │   │   ├── Connection Status
│   │   │   ├── Printer State Badge
│   │   │   ├── Job Progress (when printing)
│   │   │   │   ├── Progress Bar
│   │   │   │   ├── Time Elapsed
│   │   │   │   └── Time Remaining
│   │   │   └── Control Buttons
│   │   │       ├── Pause/Resume
│   │   │       └── Cancel
│   │   │
│   │   └── TemperatureMonitor
│   │       ├── Hotend Temperature Display
│   │       ├── Bed Temperature Display
│   │       ├── Preheat Presets
│   │       │   ├── PLA Button
│   │       │   ├── ABS Button
│   │       │   ├── PETG Button
│   │       │   └── Cool Button
│   │       └── Temperature Chart
│   │           ├── Hotend Line (red)
│   │           ├── Bed Line (blue)
│   │           └── Target Lines (dashed)
│   │
│   ├── Row 2: Camera & Queue
│   │   ├── CameraFeed
│   │   │   ├── MJPEG Stream
│   │   │   ├── LIVE Badge
│   │   │   ├── Snapshot Button
│   │   │   ├── Fullscreen Button
│   │   │   └── Refresh Button
│   │   │
│   │   └── PrintQueue
│   │       ├── Queue Header (with count)
│   │       ├── Clear Queue Button
│   │       ├── Queue Item List
│   │       │   └── QueueItem (repeated)
│   │       │       ├── Position Number
│   │       │       ├── File Name
│   │       │       ├── Status Badge
│   │       │       ├── Date Added
│   │       │       ├── Estimated Time
│   │       │       ├── Progress Bar (if printing)
│   │       │       └── Actions
│   │       │           ├── Start Button
│   │       │           └── Remove Button
│   │       └── Queue Stats Footer
│   │
│   └── Row 3: File Browser (Full Width)
│       └── FileBrowser
│           ├── Upload Button
│           ├── Search Input
│           ├── File List
│           │   └── FileItem (repeated)
│           │       ├── File Icon
│           │       ├── File Name
│           │       ├── File Size
│           │       ├── Upload Date
│           │       ├── Estimated Time
│           │       ├── Origin Badge
│           │       └── Actions
│           │           ├── Add to Queue
│           │           └── Delete
│           └── Storage Footer
│
└── Footer
    ├── Version Info
    └── Backend URLs
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│         usePrinterStatus Hook                   │
│  (Central Data Management)                      │
│                                                  │
│  - Manages all API calls                        │
│  - Handles polling intervals                    │
│  - Accumulates temperature history              │
│  - Provides CRUD operations                     │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Provides data & actions via props
                  │
┌─────────────────▼───────────────────────────────┐
│         PrintingDashboard                       │
│  (Main Layout Component)                        │
│                                                  │
│  - Consumes hook data                           │
│  - Distributes to child components              │
│  - Handles preheat commands                     │
│  - Manages global refresh                       │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Props down, callbacks up
                  │
    ┌─────────────┼─────────────────────┐
    │             │                     │
    ▼             ▼                     ▼
┌────────┐  ┌──────────┐        ┌──────────┐
│ Status │  │   Temp   │   ...  │  Files   │
│  Card  │  │ Monitor  │        │ Browser  │
└────────┘  └──────────┘        └──────────┘
```

## State Management

```
┌─────────────────────────────────────┐
│   PrintingDashboard State           │
│   (Minimal - mostly stateless)      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   usePrinterStatus Hook State       │
│                                      │
│   - status: PrinterStatus           │
│   - job: JobStatus                  │
│   - queue: PrintQueue               │
│   - files: FileList                 │
│   - temperature: TemperatureHistory │
│   - loading states                  │
│   - error states                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Component Local State              │
│   (UI state only)                    │
│                                      │
│   - isPausing                        │
│   - isCancelling                     │
│   - isUploadingFiles                 │
│   - searchQuery                      │
│   - isFullscreen                     │
└─────────────────────────────────────┘
```

## API Call Flow

```
User Action
    │
    ▼
Component Handler
    │
    ▼
Hook Method
    │
    ▼
fetch() API Call
    │
    ▼
Backend Proxy (/api/printing/*)
    │
    ▼
FluxPrint Service (localhost:5001)
    │
    ▼
OctoPrint API
    │
    ▼
3D Printer
```

## Polling Mechanism

```
usePrinterStatus Hook Initialization
    │
    ▼
Start Polling Intervals
    │
    ├─ Status:  Every 30 seconds
    │   └─ Includes temperature data
    │       └─ Appends to temperature history
    │
    ├─ Job:     Every 5 seconds (when printing)
    │           Every 30 seconds (idle)
    │
    ├─ Queue:   Every 30 seconds
    │
    └─ Files:   Every 60 seconds
```

## Error Handling Flow

```
API Call Fails
    │
    ▼
Hook Catches Error
    │
    ├─ Sets error state
    │
    ├─ Triggers retry (if enabled)
    │   └─ Max 3 attempts with backoff
    │
    └─ Updates service availability flag
        │
        ▼
    Dashboard Checks Flag
        │
        ├─ Show service banner (if offline)
        │
        └─ Component shows error state
            └─ Display user-friendly message
                └─ Provide retry button
```

## Responsive Layout Breakpoints

```
Mobile (< 768px)
┌─────────────────┐
│     Header      │
├─────────────────┤
│     Status      │
├─────────────────┤
│   Temperature   │
├─────────────────┤
│     Camera      │
├─────────────────┤
│     Queue       │
├─────────────────┤
│     Files       │
├─────────────────┤
│     Footer      │
└─────────────────┘

Tablet (768px - 1024px)
┌─────────────────────────┐
│         Header          │
├───────────┬─────────────┤
│  Status   │Temperature  │
├───────────┼─────────────┤
│  Camera   │   Queue     │
├───────────┴─────────────┤
│         Files           │
├─────────────────────────┤
│         Footer          │
└─────────────────────────┘

Desktop (> 1024px)
┌───────────────────────────────┐
│           Header              │
├──────────────┬────────────────┤
│    Status    │  Temperature   │
├──────────────┼────────────────┤
│   Camera     │     Queue      │
├──────────────┴────────────────┤
│           Files               │
├───────────────────────────────┤
│           Footer              │
└───────────────────────────────┘
```

## Component Communication

```
PrintingDashboard
    │
    ├─ Provides to PrinterStatusCard:
    │   ├─ status: PrinterStatus
    │   ├─ onRefresh: () => void
    │   └─ Component handles pause/resume/cancel internally
    │
    ├─ Provides to TemperatureMonitor:
    │   ├─ status: PrinterStatus
    │   ├─ history: TemperatureHistory
    │   └─ onPreheat: (target, temp) => void
    │
    ├─ Provides to CameraFeed:
    │   └─ onSnapshot: (snapshot) => void
    │
    ├─ Provides to PrintQueue:
    │   ├─ queue: PrintQueue
    │   ├─ onAddToQueue: (filename) => void
    │   ├─ onRemoveFromQueue: (id) => void
    │   └─ onStartJob: (id) => void
    │
    └─ Provides to FileBrowser:
        ├─ files: FileList
        ├─ onUpload: (files) => void
        ├─ onDelete: (filename) => void
        └─ onAddToQueue: (filename) => void
```

## Type Definitions Flow

```
src/types/printing.ts
    │
    ├─ Exports Core Types:
    │   ├─ PrinterStatus
    │   ├─ JobStatus
    │   ├─ PrintQueue
    │   ├─ FileList
    │   ├─ TemperatureHistory
    │   └─ ... many more
    │
    ├─ Exports Component Props:
    │   ├─ PrinterStatusCardProps
    │   ├─ TemperatureMonitorProps
    │   ├─ CameraFeedProps
    │   ├─ PrintQueueProps
    │   └─ FileBrowserProps
    │
    └─ Exports Hook Return Type:
        └─ UsePrinterStatusReturn
```

## Key Design Patterns

### 1. Centralized Data Management
- Single source of truth via `usePrinterStatus` hook
- All API calls go through the hook
- Components are stateless (data-wise)

### 2. Optimistic UI Updates
- Actions trigger immediately
- UI updates before confirmation
- Errors rollback changes

### 3. Progressive Enhancement
- Works without printer connected
- Degrades gracefully on errors
- Shows meaningful empty states

### 4. Real-Time Updates
- Polling-based (Phase 2)
- Different intervals per data type
- Faster polling when printing

### 5. Error Boundaries
- Each component handles own errors
- Dashboard shows global service status
- User-friendly error messages

### 6. Responsive Design
- Mobile-first approach
- Touch-friendly (44px targets)
- Adaptive layouts

### 7. Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Color contrast

---

**Visual Legend:**
- `┌─┐` = Container/Component
- `├─┤` = Horizontal divider
- `│ │` = Vertical divider
- `└─┘` = Bottom border
- `├─` = Tree branch
- `└─` = Tree end
- `▼` = Flow direction
- `→` = Data flow

---

**Document Version:** 1.0
**Created:** November 6, 2025
**Purpose:** Visual reference for component architecture
