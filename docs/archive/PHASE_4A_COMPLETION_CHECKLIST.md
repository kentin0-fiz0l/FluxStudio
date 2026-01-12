# Phase 4A Completion Checklist

**Target**: Complete Phase 4A by End of Week
**Goal**: Connect frontend to backend, add security, enable real-time updates

---

## Day 1: Backend API Implementation

### Morning (4 hours): Core Endpoints

#### Endpoint 1: Quick Print Submission
- [ ] Create endpoint: `POST /api/printing/quick-print`
- [ ] Add JWT authentication middleware
- [ ] Validate request body (material, quality, copies, etc.)
- [ ] Check project/file authorization
- [ ] Create print job in database (print_jobs table)
- [ ] Submit to FluxPrint queue (HTTP request to port 5001)
- [ ] Return jobId and queueId
- [ ] Add error handling (try/catch, status codes)
- [ ] Test with Postman

**Expected Response**:
```json
{
  "success": true,
  "jobId": "cuid123",
  "queueId": 42,
  "estimatedStartTime": "2025-11-07T14:30:00Z"
}
```

#### Endpoint 2: Print Estimate
- [ ] Create endpoint: `POST /api/printing/estimate`
- [ ] Add JWT authentication
- [ ] Fetch file from database
- [ ] Call FluxPrint estimation API (if available)
- [ ] Fallback to rough calculation if API unavailable
- [ ] Return PrintEstimate object
- [ ] Add caching (Redis, 5 min TTL)
- [ ] Test with various file sizes

**Expected Response**:
```json
{
  "timeHours": 4,
  "timeMinutes": 30,
  "materialGrams": 175,
  "materialCost": 3.5,
  "totalCost": 3.5,
  "confidence": "high"
}
```

### Afternoon (3 hours): File Management

#### Endpoint 3: File Upload
- [ ] Create endpoint: `POST /api/projects/files/upload`
- [ ] Configure Multer middleware
  - Max file size: 100 MB
  - Allowed types: STL, OBJ, GLTF, GLB, GCODE, 3MF
  - Destination: uploads/:projectId/
  - Unique filename: crypto.randomBytes(16)
- [ ] Add JWT authentication
- [ ] Check project authorization
- [ ] Validate file MIME type
- [ ] Sanitize filename (remove special chars)
- [ ] Save file metadata to database (files table)
- [ ] Return uploaded file objects
- [ ] Test with various file types

**Expected Response**:
```json
{
  "success": true,
  "files": [
    {
      "id": "cuid456",
      "name": "camera-mount.stl",
      "size": 2456789,
      "type": "model/stl",
      "uploadedAt": "2025-11-07T12:00:00Z"
    }
  ]
}
```

#### Endpoint 4: List Project Files
- [ ] Create endpoint: `GET /api/projects/:projectId/files`
- [ ] Add JWT authentication
- [ ] Check project authorization
- [ ] Query files from database
- [ ] Include print status (join print_jobs)
- [ ] Add pagination (default: 20 per page)
- [ ] Return files array
- [ ] Test with project that has 50+ files

**Expected Response**:
```json
{
  "files": [
    {
      "id": "cuid456",
      "name": "camera-mount.stl",
      "size": 2456789,
      "type": "model/stl",
      "uploadedAt": "2025-11-07T12:00:00Z",
      "uploadedBy": "user@example.com",
      "printStatus": "completed",
      "printProgress": 100
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### Security Additions
- [ ] Add rate limiting middleware
  - Print submissions: 10 per 15 minutes
  - File uploads: 20 per 15 minutes
  - Estimates: 100 per 15 minutes
- [ ] Add input sanitization (DOMPurify for notes field)
- [ ] Add CORS configuration (strict origin checking)
- [ ] Add helmet middleware for security headers
- [ ] Log all print submissions for audit trail

### Testing
- [ ] Create Postman collection with all 4 endpoints
- [ ] Test happy paths
- [ ] Test error cases (401, 403, 404, 413, 429)
- [ ] Test with invalid inputs
- [ ] Test rate limiting (exceed limits)
- [ ] Test file upload with oversized file
- [ ] Test authorization (user tries to access another's project)

---

## Day 2: Frontend API Integration

### Morning (3 hours): QuickPrintDialog API Wiring

#### Update handlePrintSubmit
- [ ] Replace mock onPrint with real API call
- [ ] Add loading state during submission
- [ ] Show toast notification on success
- [ ] Show error toast with retry option
- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show permission error)
- [ ] Handle 429 (rate limit exceeded)
- [ ] Test in browser

**Code Update**:
```typescript
const handlePrintSubmit = async (config: QuickPrintConfig) => {
  if (!selectedFile) return;
  setIsPrinting(true);

  try {
    const response = await fetch('/api/printing/quick-print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        fileId: selectedFile.id,
        projectId: project.id,
        config,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        navigate('/login', { state: { from: location } });
        return;
      }
      throw new Error(await response.text());
    }

    const result = await response.json();

    toast.success('Print job queued!', {
      description: `${selectedFile.name} added to print queue`,
      action: {
        label: 'View Queue',
        onClick: () => navigate('/printing/queue'),
      },
    });

    onClose();
  } catch (error) {
    toast.error('Print failed', {
      description: error.message,
      action: {
        label: 'Retry',
        onClick: () => handlePrintSubmit(config),
      },
    });
  } finally {
    setIsPrinting(false);
  }
};
```

#### Replace calculateEstimate with API call
- [ ] Create fetchEstimate() function
- [ ] Call API when material/quality changes
- [ ] Add debounce (500ms) to prevent excessive calls
- [ ] Show loading skeleton during fetch
- [ ] Fallback to client calculation if API fails
- [ ] Cache results in React Query
- [ ] Test estimate updates

**Code Update**:
```typescript
const { data: estimate, isLoading: estimateLoading } = useQuery({
  queryKey: ['print-estimate', selectedFile?.id, material, quality, copies],
  queryFn: () => fetchPrintEstimate(selectedFile!.id, material, quality, copies),
  enabled: !!selectedFile,
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  fallback: calculateRoughEstimate(selectedFile?.size || 0, material, quality, copies),
});
```

### Afternoon (3 hours): ProjectFilesTab API Wiring

#### Replace mock files with API query
- [ ] Install React Query (if not already installed)
- [ ] Create useProjectFiles hook
- [ ] Fetch files from API
- [ ] Add loading skeleton (FileGridSkeleton component)
- [ ] Add error state with retry button
- [ ] Add pagination controls
- [ ] Test with empty project
- [ ] Test with 100+ files

**Code Update**:
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['project-files', project.id],
  queryFn: () => fetchProjectFiles(project.id),
  refetchInterval: 30000, // Refresh every 30 seconds
});

if (isLoading) {
  return <FileGridSkeleton />;
}

if (error) {
  return (
    <ErrorState
      title="Failed to load files"
      description={error.message}
      action={{
        label: 'Retry',
        onClick: refetch,
      }}
    />
  );
}

const files = data?.files || [];
```

#### Implement file upload
- [ ] Add react-dropzone dependency
- [ ] Create handleUpload function
- [ ] Show upload progress (if possible)
- [ ] Invalidate query on successful upload
- [ ] Show toast notification
- [ ] Handle errors (file too large, invalid type)
- [ ] Test with multiple files
- [ ] Test drag-and-drop

**Code Update**:
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: handleUpload,
  accept: {
    'model/stl': ['.stl'],
    'model/obj': ['.obj'],
    'model/gltf+json': ['.gltf'],
    'model/gltf-binary': ['.glb'],
    'text/x-gcode': ['.gcode'],
  },
  maxSize: 100 * 1024 * 1024, // 100 MB
});

const handleUpload = async (acceptedFiles: File[]) => {
  const formData = new FormData();
  acceptedFiles.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('projectId', project.id);

  try {
    const response = await fetch('/api/projects/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');

    const result = await response.json();
    toast.success(`Uploaded ${acceptedFiles.length} file(s)`);

    // Refresh file list
    queryClient.invalidateQueries(['project-files', project.id]);
  } catch (error) {
    toast.error('Upload failed', {
      description: error.message,
    });
  }
};
```

---

## Day 3: WebSocket Real-Time Updates

### Morning (3 hours): WebSocket Infrastructure

#### Create WebSocket Context
- [ ] Create PrintWebSocketContext.tsx
- [ ] Connect to WebSocket server
- [ ] Implement authentication (pass JWT token)
- [ ] Handle connect/disconnect events
- [ ] Implement reconnection logic (exponential backoff)
- [ ] Store connection status in state
- [ ] Wrap app with provider in main.tsx
- [ ] Test connection in browser

**Code**:
```typescript
// src/contexts/PrintWebSocketContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface PrintWebSocketContextValue {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
}

const PrintWebSocketContext = createContext<PrintWebSocketContextValue>({
  socket: null,
  connected: false,
  reconnecting: false,
});

export const PrintWebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const socket = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!token) return;

    socket.current = io('http://localhost:3001', {
      path: '/ws',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.current.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setReconnecting(false);
    });

    socket.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socket.current.on('reconnecting', () => {
      console.log('WebSocket reconnecting...');
      setReconnecting(true);
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [token]);

  return (
    <PrintWebSocketContext.Provider value={{ socket: socket.current, connected, reconnecting }}>
      {children}
    </PrintWebSocketContext.Provider>
  );
};

export const usePrintWebSocket = () => useContext(PrintWebSocketContext);
```

#### Backend WebSocket Setup
- [ ] Add Socket.IO to server-unified.js
- [ ] Implement authentication middleware
- [ ] Create project subscription rooms
- [ ] Emit print:status-update events
- [ ] Emit print:completed events
- [ ] Emit file:uploaded events
- [ ] Test with multiple clients

**Code**:
```javascript
// server-unified.js
const { Server } = require('socket.io');

const io = new Server(server, {
  path: '/ws',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Invalid token'));
    }
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userEmail}`);

  socket.on('subscribe:project-files', async (data) => {
    const { projectId } = data;

    // Verify access
    const hasAccess = await checkProjectAccess(socket.userId, projectId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    socket.join(`project:${projectId}`);
    console.log(`User ${socket.userEmail} subscribed to project ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userEmail}`);
  });
});

// Helper: Emit print status updates
const emitPrintStatusUpdate = (projectId, data) => {
  io.to(`project:${projectId}`).emit('print:status-update', data);
};

// Helper: Emit print completed
const emitPrintCompleted = (projectId, data) => {
  io.to(`project:${projectId}`).emit('print:completed', data);
};

module.exports = { io, emitPrintStatusUpdate, emitPrintCompleted };
```

### Afternoon (2 hours): Frontend WebSocket Integration

#### Subscribe to print status updates in ProjectFilesTab
- [ ] Use usePrintWebSocket hook
- [ ] Subscribe to project on mount
- [ ] Listen for print:status-update
- [ ] Update React Query cache on status update
- [ ] Show toast notification on print:completed
- [ ] Unsubscribe on unmount
- [ ] Test status updates

**Code Update**:
```typescript
// In ProjectFilesTab.tsx
const { socket, connected } = usePrintWebSocket();
const queryClient = useQueryClient();

useEffect(() => {
  if (!socket || !connected) return;

  // Subscribe to project updates
  socket.emit('subscribe:project-files', { projectId: project.id });

  // Listen for status updates
  socket.on('print:status-update', (data: {
    fileId: string;
    jobId: string;
    status: PrintJobStatus;
    progress: number;
  }) => {
    // Update file in React Query cache
    queryClient.setQueryData(
      ['project-files', project.id],
      (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          files: oldData.files.map((file: ProjectFile) =>
            file.id === data.fileId
              ? { ...file, printStatus: data.status, printProgress: data.progress }
              : file
          ),
        };
      }
    );
  });

  // Listen for completed prints
  socket.on('print:completed', (data: {
    fileId: string;
    jobId: string;
    status: 'completed' | 'failed';
  }) => {
    toast.success(
      data.status === 'completed' ? 'Print completed!' : 'Print failed',
      {
        description: `Job ${data.jobId}`,
        action: {
          label: 'View Details',
          onClick: () => navigate(`/printing/history?jobId=${data.jobId}`),
        },
      }
    );

    // Refresh file list
    queryClient.invalidateQueries(['project-files', project.id]);
  });

  return () => {
    socket.off('print:status-update');
    socket.off('print:completed');
  };
}, [socket, connected, project.id, queryClient]);
```

---

## Day 4: Testing & Refinement

### Morning (3 hours): End-to-End Testing

#### Test Scenario 1: Happy Path
- [ ] Create new project
- [ ] Upload STL file (drag-and-drop)
- [ ] Verify file appears in grid
- [ ] Click "Print" button on file card
- [ ] QuickPrintDialog opens with file context
- [ ] Select PLA material
- [ ] Select Standard quality
- [ ] Click "Print"
- [ ] Verify toast notification appears
- [ ] Verify file status changes to "Queued"
- [ ] Monitor status badge (should update to "Printing")
- [ ] Wait for completion (or simulate)
- [ ] Verify status changes to "Completed"
- [ ] Verify completion notification appears

#### Test Scenario 2: Error Handling
- [ ] Test with expired JWT (should redirect to login)
- [ ] Test with unauthorized project access (403 error)
- [ ] Test file upload with oversized file (413 error)
- [ ] Test print submission at rate limit (429 error)
- [ ] Test with network failure (offline)
- [ ] Test WebSocket reconnection (kill connection)
- [ ] Verify error toasts appear
- [ ] Verify retry buttons work

#### Test Scenario 3: Multiple Projects
- [ ] Create 2 projects
- [ ] Upload files to both
- [ ] Print from Project A
- [ ] Switch to Project B
- [ ] Verify Project B files don't show Project A status
- [ ] Print from Project B
- [ ] Switch back to Project A
- [ ] Verify status updates still work

#### Test Scenario 4: Concurrent Prints
- [ ] Upload 3 STL files
- [ ] Queue all 3 for printing
- [ ] Verify all show "Queued" status
- [ ] Verify first starts printing
- [ ] Verify status badges update correctly
- [ ] Verify completion notifications for all 3

#### Test Scenario 5: Mobile Responsiveness
- [ ] Open on mobile device (or DevTools mobile view)
- [ ] Test file grid (should show 1 column)
- [ ] Test QuickPrintDialog (should be scrollable)
- [ ] Test material selection (cards should stack)
- [ ] Test file upload (drag-and-drop fallback)
- [ ] Verify all touch interactions work

### Afternoon (2 hours): Performance Testing

#### Test with Large File List
- [ ] Upload 100 files to a project
- [ ] Measure initial load time (should be <2s)
- [ ] Test scrolling performance (should be smooth)
- [ ] Test file search/filter (if implemented)
- [ ] Consider virtualization if slow (react-window)

#### Test WebSocket Performance
- [ ] Simulate 10 concurrent print jobs
- [ ] Verify status updates arrive within 1 second
- [ ] Monitor browser DevTools Network tab
- [ ] Check for memory leaks (heap snapshots)
- [ ] Verify socket doesn't reconnect unnecessarily

---

## Day 5: Security Hardening & Documentation

### Morning (3 hours): Security Audit

#### Review All Endpoints
- [ ] Check authentication on every endpoint
- [ ] Check authorization (project/file access)
- [ ] Verify rate limiting is applied
- [ ] Test SQL injection (use prepared statements)
- [ ] Test XSS (sanitize all inputs)
- [ ] Test CSRF (verify CSRF tokens)
- [ ] Check file upload validation (magic bytes)
- [ ] Verify error messages don't leak sensitive info

#### Penetration Testing
- [ ] Try to access another user's files
- [ ] Try to submit prints to another user's project
- [ ] Try to upload malicious files (PHP, EXE, etc.)
- [ ] Try to exceed rate limits
- [ ] Try to inject scripts in notes field
- [ ] Try to upload 1GB file
- [ ] Try to call endpoints without authentication

#### Add Audit Logging
- [ ] Log all print submissions (user, project, file, timestamp)
- [ ] Log all file uploads (user, project, filename, size)
- [ ] Log all failed authentication attempts
- [ ] Log all rate limit violations
- [ ] Store logs in database or log file
- [ ] Add log rotation (if file-based)

### Afternoon (2 hours): Documentation

#### Update PHASE_4A_DESIGNER_FIRST_FOUNDATION.md
- [ ] Mark API integration as complete
- [ ] Mark WebSocket updates as complete
- [ ] Add "Deployment Ready" section
- [ ] Document environment variables needed
- [ ] Document database migrations required

#### Create API Documentation
- [ ] Document all 4 endpoints (OpenAPI/Swagger)
- [ ] Add example requests/responses
- [ ] Document error codes
- [ ] Add authentication instructions
- [ ] Add rate limiting details

#### Create Troubleshooting Guide
- [ ] Common error messages and fixes
- [ ] WebSocket connection issues
- [ ] File upload errors
- [ ] Print submission failures
- [ ] Performance issues

#### Update User Guide
- [ ] Add screenshots of QuickPrintDialog
- [ ] Add screenshots of file upload
- [ ] Document material selection
- [ ] Document quality presets
- [ ] Add FAQ section

---

## Success Criteria

### Phase 4A is complete when:
- [x] QuickPrintDialog component built (650 lines)
- [x] ProjectFilesTab component built (500 lines)
- [x] Type system extended (120+ lines)
- [ ] API endpoints implemented and tested (4 endpoints)
- [ ] WebSocket real-time updates working
- [ ] Security hardening complete (auth, validation, rate limiting)
- [ ] End-to-end tests passing (5 scenarios)
- [ ] Documentation complete (API, troubleshooting, user guide)
- [ ] No critical security vulnerabilities
- [ ] Performance acceptable (<2s load, <1s updates)

### Deployment Checklist
- [ ] Environment variables set (JWT_SECRET, FLUXPRINT_URL, etc.)
- [ ] Database migrations run (print_jobs table, files table)
- [ ] Backend deployed (server-unified.js running)
- [ ] Frontend deployed (Vite build)
- [ ] WebSocket server accessible (port 3001)
- [ ] FluxPrint service accessible (port 5001)
- [ ] HTTPS enabled (production only)
- [ ] Rate limiting configured
- [ ] Error monitoring enabled (Sentry)
- [ ] Analytics tracking added (PostHog, Mixpanel)

---

## Progress Tracking

### Completed ✅
- QuickPrintDialog component (Phase 4A)
- ProjectFilesTab component (Phase 4A)
- Type system extensions (Phase 4A)
- Architecture planning (Phase 4A)
- UX design and flows (Phase 4A)

### In Progress 🔄
- API integration (Day 1-2)
- WebSocket updates (Day 3)
- Testing (Day 4)
- Security hardening (Day 5)

### Not Started ⏳
- Phase 4B: 3D Preview
- Phase 4B: Printability Analysis
- Phase 4B: Post-Print Feedback
- Phase 4B: Smart Recommendations

---

**Estimated Completion**: End of Week
**Next Phase Start**: Week 2 (Phase 4B Sprint 1)
