# Yjs Real-Time Collaboration Implementation Guide
## Weeks 5-8: Transform Flux Studio into a Live Collaboration Platform

**Goal:** Implement production-ready real-time collaborative editing using Yjs CRDT
**Timeline:** 4 weeks (Weeks 5-8 of Phase 1)
**Team:** 2 full-stack engineers
**Prerequisite:** Weeks 1-4 completed (security + monitoring)

---

## Overview

This guide provides step-by-step implementation of Yjs-based real-time collaboration, transforming Flux Studio from a static design tool into a live collaborative platform where multiple users can edit simultaneously without conflicts.

### What We're Building

**Week 5:** Cursor tracking & presence (MVP proof-of-concept)
**Week 6:** Canvas element synchronization (core collaboration)
**Week 7:** Offline support & conflict resolution (production-ready)
**Week 8:** Comments, annotations, testing & polish

### Technology Stack

- **Yjs:** CRDT library for conflict-free data structures
- **y-websocket:** WebSocket provider for network synchronization
- **y-indexeddb:** IndexedDB persistence for offline support
- **y-protocols:** Awareness API for presence/cursors
- **Socket.IO:** Fallback for additional real-time features

---

## Week 5: Cursor Tracking & Presence MVP

### Day 1-2: Yjs Provider Setup

**Install dependencies (already installed, verify):**
```bash
cd /Users/kentino/FluxStudio
npm list yjs y-websocket y-indexeddb y-protocols
```

**Create Yjs provider hook:**
```typescript
// src/hooks/useYjsProvider.ts
import { useMemo, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface UseYjsProviderOptions {
  projectId: string;
  userId: string;
  userName: string;
  userColor?: string;
}

export function useYjsProvider(options: UseYjsProviderOptions) {
  const { projectId, userId, userName, userColor } = options;

  // Create Yjs document (memoized per project)
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();

    // Enable garbage collection
    doc.gc = true;

    return doc;
  }, [projectId]);

  // Create IndexedDB persistence (offline support)
  const indexeddbProvider = useMemo(() => {
    return new IndexeddbPersistence(`fluxstudio-${projectId}`, ydoc);
  }, [projectId, ydoc]);

  // Create WebSocket provider (network sync)
  const websocketProvider = useMemo(() => {
    const accessToken = localStorage.getItem('accessToken');

    const provider = new WebsocketProvider(
      process.env.VITE_COLLABORATION_SERVER || 'ws://localhost:4000',
      `project-${projectId}`,
      ydoc,
      {
        params: {
          token: accessToken || ''
        }
      }
    );

    // Set user information in awareness
    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor || generateUserColor(userId)
    });

    return provider;
  }, [projectId, ydoc, userId, userName, userColor]);

  // Track connection status
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const handleStatus = (event: { status: 'connected' | 'disconnected' }) => {
      setStatus(event.status);
    };

    websocketProvider.on('status', handleStatus);

    return () => {
      websocketProvider.off('status', handleStatus);
    };
  }, [websocketProvider]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      websocketProvider.disconnect();
      indexeddbProvider.destroy();
    };
  }, [websocketProvider, indexeddbProvider]);

  return {
    ydoc,
    provider: websocketProvider,
    awareness: websocketProvider.awareness,
    indexeddbProvider,
    status
  };
}

// Generate consistent color for user
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];

  // Use userId to deterministically pick a color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
```

**Update server-collaboration.js:**
```javascript
// server-collaboration.js
const Y = require('yjs');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const jwt = require('jsonwebtoken');
const { query } = require('./database/config');

const wss = new WebSocketServer({
  port: 4000,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Below options specified as default values.
    clientNoContextTakeover: true, // Defaults to negotiated value
    serverNoContextTakeover: true, // Defaults to negotiated value
    serverMaxWindowBits: 10, // Defaults to negotiated value
    // You can't use `memLevel` if `clientMaxWindowBits` is `7`
    clientMaxWindowBits: 10, // Defaults to negotiated value
    // Limit message size (10MB)
    threshold: 10 * 1024 * 1024
  }
});

// Store active documents in memory
const docs = new Map();

wss.on('connection', async (conn, req) => {
  try {
    // Parse URL
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const docName = url.pathname.slice(1); // Remove leading "/"
    const token = url.searchParams.get('token');

    // Authenticate user
    if (!token) {
      conn.close(1008, 'Authentication required');
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      conn.close(1008, 'Invalid token');
      return;
    }

    const userId = decoded.id;
    const projectId = docName.replace('project-', '');

    // Verify user has access to this project
    const { rows } = await query(
      `SELECT pm.role
       FROM project_members pm
       WHERE pm.user_id = $1 AND pm.project_id = $2`,
      [userId, projectId]
    );

    if (rows.length === 0) {
      conn.close(1008, 'Access denied');
      return;
    }

    console.log(`User ${userId} connected to ${docName}`);

    // Setup Yjs WebSocket connection
    setupWSConnection(conn, req, {
      docName,
      gc: true // Enable garbage collection
    });

    // Track connection for monitoring
    const { metrics } = require('./lib/monitoring/metrics');
    metrics.websocketConnections.inc();

    conn.on('close', () => {
      console.log(`User ${userId} disconnected from ${docName}`);
      metrics.websocketConnections.dec();
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
    conn.close(1011, 'Internal server error');
  }
});

// Periodically save documents to database (optional, for backup)
setInterval(async () => {
  for (const [docName, doc] of docs.entries()) {
    try {
      const update = Y.encodeStateAsUpdate(doc);
      const projectId = docName.replace('project-', '');

      // Save to database as backup
      await query(
        `INSERT INTO yjs_snapshots (project_id, snapshot, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (project_id)
         DO UPDATE SET snapshot = $2, updated_at = NOW()`,
        [projectId, Buffer.from(update)]
      );

      console.log(`Saved snapshot for ${docName}`);
    } catch (error) {
      console.error(`Failed to save snapshot for ${docName}:`, error);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

console.log('Yjs WebSocket server running on ws://localhost:4000');
```

**Add Yjs snapshots table:**
```sql
-- database/schema.sql
CREATE TABLE yjs_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  snapshot BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yjs_snapshots_project_id ON yjs_snapshots(project_id);
```

**Update .env:**
```bash
# .env
VITE_COLLABORATION_SERVER=ws://localhost:4000

# .env.production
VITE_COLLABORATION_SERVER=wss://fluxstudio.art/collaboration
```

### Day 3-4: Cursor Tracking Implementation

**Create cursor overlay component:**
```typescript
// src/components/collaboration/CursorOverlay.tsx
import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorPosition {
  x: number;
  y: number;
}

interface UserCursor {
  id: string;
  name: string;
  color: string;
  cursor: CursorPosition;
}

interface CursorOverlayProps {
  awareness: Awareness;
  containerRef: React.RefObject<HTMLElement>;
}

export function CursorOverlay({ awareness, containerRef }: CursorOverlayProps) {
  const [cursors, setCursors] = useState<Map<number, UserCursor>>(new Map());
  const localClientId = awareness.clientID;

  useEffect(() => {
    const handleChange = () => {
      const states = awareness.getStates();
      const newCursors = new Map<number, UserCursor>();

      states.forEach((state, clientId) => {
        // Skip local user
        if (clientId === localClientId) return;

        // Skip if no user info or cursor
        if (!state.user || !state.cursor) return;

        newCursors.set(clientId, {
          id: state.user.id,
          name: state.user.name,
          color: state.user.color,
          cursor: state.cursor
        });
      });

      setCursors(newCursors);
    };

    // Listen for awareness changes
    awareness.on('change', handleChange);

    // Initial load
    handleChange();

    return () => {
      awareness.off('change', handleChange);
    };
  }, [awareness, localClientId]);

  // Track local cursor movement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let lastUpdate = 0;
    const THROTTLE_MS = 50; // Update every 50ms

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;

      lastUpdate = now;

      // Cancel any pending updates
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Schedule update
      animationFrameId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Update awareness with cursor position (percentage-based for responsiveness)
        awareness.setLocalStateField('cursor', { x, y });
      });
    };

    const handleMouseLeave = () => {
      // Remove cursor when leaving canvas
      awareness.setLocalStateField('cursor', null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [awareness, containerRef]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {Array.from(cursors.values()).map((cursor) => (
          <RemoteCursor key={cursor.id} cursor={cursor} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function RemoteCursor({ cursor }: { cursor: UserCursor }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        left: `${cursor.cursor.x}%`,
        top: `${cursor.cursor.y}%`,
        pointerEvents: 'none'
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }}
      >
        <path
          d="M5.65376 12.3673L13.5794 20.2929L15.0006 15.0006L20.293 13.5794L12.3673 5.65376C11.9768 5.26324 11.3436 5.26324 10.9531 5.65376L5.65376 10.9531C5.26324 11.3436 5.26324 11.9768 5.65376 12.3673Z"
          fill={cursor.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* User label */}
      <div
        className="absolute top-6 left-6 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
        style={{
          backgroundColor: cursor.color,
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {cursor.name}
      </div>
    </motion.div>
  );
}
```

**Create presence panel component:**
```typescript
// src/components/collaboration/PresencePanel.tsx
import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';
import { Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  color: string;
}

interface PresencePanelProps {
  awareness: Awareness;
}

export function PresencePanel({ awareness }: PresencePanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const localClientId = awareness.clientID;

  useEffect(() => {
    const handleChange = () => {
      const states = awareness.getStates();
      const activeUsers: User[] = [];

      states.forEach((state, clientId) => {
        if (state.user) {
          activeUsers.push({
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
            isLocal: clientId === localClientId
          });
        }
      });

      // Sort: local user first, then alphabetically
      activeUsers.sort((a, b) => {
        if (a.isLocal) return -1;
        if (b.isLocal) return 1;
        return a.name.localeCompare(b.name);
      });

      setUsers(activeUsers);
    };

    awareness.on('change', handleChange);
    handleChange();

    return () => {
      awareness.off('change', handleChange);
    };
  }, [awareness, localClientId]);

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold">
          Active Users ({users.length})
        </h3>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {/* Color indicator */}
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: user.color }}
            />

            {/* User name */}
            <span className="text-white text-sm flex-1">
              {user.name}
              {user.isLocal && (
                <span className="ml-2 text-xs text-white/60">(You)</span>
              )}
            </span>
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-white/60 text-sm text-center py-4">
            No other users online
          </p>
        )}
      </div>
    </div>
  );
}
```

**Integrate into workspace:**
```typescript
// src/components/workspace/CollaborativeWorkspace.tsx
import { useYjsProvider } from '@/hooks/useYjsProvider';
import { CursorOverlay } from '@/components/collaboration/CursorOverlay';
import { PresencePanel } from '@/components/collaboration/PresencePanel';
import { useAuth } from '@/contexts/AuthContext';
import { useRef } from 'react';

interface CollaborativeWorkspaceProps {
  projectId: string;
}

export function CollaborativeWorkspace({ projectId }: CollaborativeWorkspaceProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);

  const { ydoc, provider, awareness, status } = useYjsProvider({
    projectId,
    userId: user.id,
    userName: user.name
  });

  return (
    <div className="h-screen flex flex-col">
      {/* Connection status indicator */}
      <div className="bg-gray-900 border-b border-white/10 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-green-500'
                : status === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-white text-sm">
            {status === 'connected'
              ? 'Connected'
              : status === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 bg-gray-900">
        {/* Main canvas */}
        <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
          <div ref={canvasRef} className="w-full h-full relative">
            {/* Your existing canvas/workspace content */}
            <div className="p-8">
              <h2 className="text-white text-2xl">Collaborative Canvas</h2>
              <p className="text-white/60">Move your mouse to see cursors</p>
            </div>

            {/* Cursor overlay */}
            <CursorOverlay awareness={awareness} containerRef={canvasRef} />
          </div>
        </div>

        {/* Sidebar with presence */}
        <div className="w-64">
          <PresencePanel awareness={awareness} />
        </div>
      </div>
    </div>
  );
}
```

### Day 5: Testing & Polish

**Create test component:**
```typescript
// src/pages/CollaborationTest.tsx
import { CollaborativeWorkspace } from '@/components/workspace/CollaborativeWorkspace';
import { useParams } from 'react-router-dom';

export function CollaborationTest() {
  const { projectId } = useParams();

  if (!projectId) {
    return <div>Project ID required</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-white/10">
        <h1 className="text-white text-xl font-bold">
          Real-Time Collaboration Test
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Open this page in multiple tabs or browsers to see cursors
        </p>
      </div>

      <CollaborativeWorkspace projectId={projectId} />
    </div>
  );
}
```

**Add route:**
```typescript
// src/App.tsx
import { CollaborationTest } from '@/pages/CollaborationTest';

// Add to routes
<Route path="/test/collaboration/:projectId" element={<CollaborationTest />} />
```

**Testing procedure:**
```bash
# Terminal 1: Start collaboration server
cd /Users/kentino/FluxStudio
node server-collaboration.js

# Terminal 2: Start frontend
npm run dev

# Testing:
# 1. Open http://localhost:5173/test/collaboration/test-project-1
# 2. Open same URL in another tab/browser
# 3. Move mouse in each tab
# 4. Verify cursors appear in both tabs
# 5. Verify user names and colors are consistent
# 6. Test with 3-5 concurrent users
```

**Week 5 Deliverables:**
- [ ] Yjs provider hook working
- [ ] Collaboration server authenticated
- [ ] Cursor tracking smooth (<50ms latency)
- [ ] Presence panel shows active users
- [ ] Tested with 5+ concurrent users
- [ ] Connection status indicators working
- [ ] Offline persistence (IndexedDB) functioning

---

## Week 6: Canvas Element Synchronization

### Day 1-2: Yjs Data Structures for Canvas

**Create canvas sync service:**
```typescript
// src/lib/collaboration/canvasSync.ts
import * as Y from 'yjs';

export interface CanvasElement {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'image' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  imageUrl?: string;
  opacity?: number;
  zIndex: number;
  locked?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export class CanvasSyncService {
  private ydoc: Y.Doc;
  private yElements: Y.Map<any>;
  private yHistory: Y.Array<any>;

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
    this.yElements = ydoc.getMap('elements');
    this.yHistory = ydoc.getArray('history');
  }

  // Add element to canvas
  addElement(element: CanvasElement): void {
    this.yElements.set(element.id, element);

    // Add to history for undo/redo
    this.yHistory.push([{
      type: 'add',
      elementId: element.id,
      timestamp: Date.now()
    }]);
  }

  // Update element
  updateElement(id: string, updates: Partial<CanvasElement>): void {
    const current = this.yElements.get(id);
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    this.yElements.set(id, updated);
  }

  // Delete element
  deleteElement(id: string): void {
    this.yElements.delete(id);

    // Add to history
    this.yHistory.push([{
      type: 'delete',
      elementId: id,
      timestamp: Date.now()
    }]);
  }

  // Get all elements
  getElements(): CanvasElement[] {
    const elements: CanvasElement[] = [];
    this.yElements.forEach((element) => {
      elements.push(element);
    });

    // Sort by zIndex
    return elements.sort((a, b) => a.zIndex - b.zIndex);
  }

  // Get element by ID
  getElement(id: string): CanvasElement | undefined {
    return this.yElements.get(id);
  }

  // Clear canvas
  clearCanvas(): void {
    this.yElements.clear();
    this.yHistory.push([{
      type: 'clear',
      timestamp: Date.now()
    }]);
  }

  // Subscribe to changes
  onElementsChange(callback: (elements: CanvasElement[]) => void): () => void {
    const observer = () => {
      callback(this.getElements());
    };

    this.yElements.observe(observer);

    // Return unsubscribe function
    return () => {
      this.yElements.unobserve(observer);
    };
  }

  // Undo/Redo support (basic implementation)
  undo(): void {
    // Implementation depends on your undo/redo strategy
    // This is a simplified version
    if (this.yHistory.length === 0) return;

    const lastAction = this.yHistory.get(this.yHistory.length - 1);

    if (lastAction.type === 'add') {
      this.yElements.delete(lastAction.elementId);
    } else if (lastAction.type === 'delete') {
      // Would need to store deleted elements to restore them
    }

    this.yHistory.delete(this.yHistory.length - 1);
  }
}
```

**Create canvas hook:**
```typescript
// src/hooks/useCollaborativeCanvas.ts
import { useEffect, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { CanvasSyncService, CanvasElement } from '@/lib/collaboration/canvasSync';

export function useCollaborativeCanvas(ydoc: Y.Doc, userId: string) {
  const canvasSync = useMemo(() => new CanvasSyncService(ydoc), [ydoc]);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Subscribe to element changes
  useEffect(() => {
    const unsubscribe = canvasSync.onElementsChange((newElements) => {
      setElements(newElements);
    });

    // Initial load
    setElements(canvasSync.getElements());

    return unsubscribe;
  }, [canvasSync]);

  // Add element
  const addElement = (
    type: CanvasElement['type'],
    x: number,
    y: number,
    options: Partial<CanvasElement> = {}
  ) => {
    const element: CanvasElement = {
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x,
      y,
      width: options.width || 100,
      height: options.height || 100,
      rotation: 0,
      fill: options.fill || '#3B82F6',
      stroke: options.stroke || '#1E40AF',
      strokeWidth: options.strokeWidth || 2,
      opacity: options.opacity || 1,
      zIndex: elements.length,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...options
    };

    canvasSync.addElement(element);
    setSelectedElementId(element.id);
  };

  // Update element
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    canvasSync.updateElement(id, updates);
  };

  // Delete element
  const deleteElement = (id: string) => {
    canvasSync.deleteElement(id);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    canvasSync.clearCanvas();
    setSelectedElementId(null);
  };

  return {
    elements,
    selectedElementId,
    setSelectedElementId,
    addElement,
    updateElement,
    deleteElement,
    clearCanvas
  };
}
```

### Day 3-4: Interactive Canvas Component

**Create collaborative canvas:**
```typescript
// src/components/canvas/CollaborativeCanvas.tsx
import { useRef, useEffect, useState } from 'react';
import { useCollaborativeCanvas } from '@/hooks/useCollaborativeCanvas';
import * as Y from 'yjs';
import { CanvasElement } from '@/lib/collaboration/canvasSync';

interface CollaborativeCanvasProps {
  ydoc: Y.Doc;
  userId: string;
  width: number;
  height: number;
}

export function CollaborativeCanvas({ ydoc, userId, width, height }: CollaborativeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'select' | 'rectangle' | 'circle' | 'text'>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const {
    elements,
    selectedElementId,
    setSelectedElementId,
    addElement,
    updateElement,
    deleteElement
  } = useCollaborativeCanvas(ydoc, userId);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach((element) => {
      drawElement(ctx, element, element.id === selectedElementId);
    });
  }, [elements, selectedElementId, width, height]);

  // Draw single element
  const drawElement = (
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    isSelected: boolean
  ) => {
    ctx.save();

    // Apply transformations
    ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-(element.x + element.width / 2), -(element.y + element.height / 2));

    ctx.globalAlpha = element.opacity || 1;

    // Draw based on type
    switch (element.type) {
      case 'rectangle':
        ctx.fillStyle = element.fill || '#3B82F6';
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeStyle = element.stroke || '#1E40AF';
        ctx.lineWidth = element.strokeWidth || 2;
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        break;

      case 'circle':
        ctx.beginPath();
        const radius = Math.min(element.width, element.height) / 2;
        ctx.arc(
          element.x + element.width / 2,
          element.y + element.height / 2,
          radius,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = element.fill || '#3B82F6';
        ctx.fill();
        ctx.strokeStyle = element.stroke || '#1E40AF';
        ctx.lineWidth = element.strokeWidth || 2;
        ctx.stroke();
        break;

      case 'text':
        ctx.fillStyle = element.fill || '#FFFFFF';
        ctx.font = `${element.height}px Arial`;
        ctx.fillText(element.text || '', element.x, element.y + element.height);
        break;
    }

    // Draw selection box
    if (isSelected) {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(element.x - 5, element.y - 5, element.width + 10, element.height + 10);
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'select') {
      // Check if clicked on an element
      const clickedElement = elements.find((el) =>
        x >= el.x && x <= el.x + el.width &&
        y >= el.y && y <= el.y + el.height
      );

      if (clickedElement) {
        setSelectedElementId(clickedElement.id);
        setIsDragging(true);
        setDragStart({ x, y });
      } else {
        setSelectedElementId(null);
      }
    } else {
      // Create new element
      setDragStart({ x, y });
      setIsDragging(true);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'select' && selectedElementId) {
      // Move selected element
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      updateElement(selectedElementId, {
        x: elements.find((el) => el.id === selectedElementId)!.x + dx,
        y: elements.find((el) => el.id === selectedElementId)!.y + dy
      });

      setDragStart({ x, y });
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool !== 'select') {
      // Create new element
      const width = Math.abs(x - dragStart.x);
      const height = Math.abs(y - dragStart.y);

      if (width > 10 && height > 10) {
        addElement(tool, Math.min(x, dragStart.x), Math.min(y, dragStart.y), {
          width,
          height
        });
      }
    }

    setIsDragging(false);
    setDragStart(null);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedElementId) {
        deleteElement(selectedElementId);
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, deleteElement]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex gap-2">
        <button
          className={`px-4 py-2 rounded ${
            tool === 'select' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
          } text-white transition-colors`}
          onClick={() => setTool('select')}
        >
          Select
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tool === 'rectangle' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
          } text-white transition-colors`}
          onClick={() => setTool('rectangle')}
        >
          Rectangle
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tool === 'circle' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
          } text-white transition-colors`}
          onClick={() => setTool('circle')}
        >
          Circle
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tool === 'text' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
          } text-white transition-colors`}
          onClick={() => setTool('text')}
        >
          Text
        </button>

        <div className="ml-auto flex gap-2">
          <button
            className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
            onClick={() => selectedElementId && deleteElement(selectedElementId)}
            disabled={!selectedElementId}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-gray-800 rounded-lg cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Status */}
      <div className="text-white/60 text-sm">
        Elements: {elements.length} | Selected: {selectedElementId || 'None'}
      </div>
    </div>
  );
}
```

### Day 5: Testing & Integration

**Update CollaborativeWorkspace:**
```typescript
// src/components/workspace/CollaborativeWorkspace.tsx
import { CollaborativeCanvas } from '@/components/canvas/CollaborativeCanvas';

// Inside component, replace canvas content with:
<div ref={canvasRef} className="w-full h-full relative">
  <CollaborativeCanvas
    ydoc={ydoc}
    userId={user.id}
    width={1200}
    height={800}
  />

  <CursorOverlay awareness={awareness} containerRef={canvasRef} />
</div>
```

**Testing:**
```bash
# 1. Open collaboration test in multiple tabs
# 2. Draw rectangles/circles in one tab
# 3. Verify they appear in all tabs instantly
# 4. Try moving elements - should sync in real-time
# 5. Test with 5+ concurrent users
# 6. Verify no conflicts when editing same element
# 7. Check offline: disconnect network, draw, reconnect
```

**Week 6 Deliverables:**
- [ ] Canvas elements sync in real-time
- [ ] Multiple users can draw simultaneously
- [ ] No conflicts (CRDT magic working)
- [ ] Element selection and manipulation
- [ ] Undo/redo support (basic)
- [ ] Tested with 10+ concurrent users
- [ ] Performance acceptable (<100ms latency)

---

## Week 7-8: Offline Support, Comments & Production Polish

*(Detailed implementation continues...)*

**Quick overview for Weeks 7-8:**

### Week 7: Offline Support
- Implement IndexedDB persistence (already partially done)
- Conflict resolution strategies
- Sync queue for offline changes
- Background sync API

### Week 8: Comments & Polish
- Collaborative annotations system
- Comment threads with Yjs
- Load testing (50+ concurrent users)
- Performance optimization
- Documentation

---

## Testing Checklist

### Functional Testing
- [ ] 2 users can collaborate in real-time
- [ ] 10 users can collaborate simultaneously
- [ ] 50 users stress test passes
- [ ] Cursors track smoothly (<50ms)
- [ ] Elements sync instantly (<100ms)
- [ ] Offline changes sync on reconnect
- [ ] No data loss on disconnect
- [ ] No conflicts when editing same element

### Performance Testing
- [ ] WebSocket latency <100ms
- [ ] Canvas render at 60fps
- [ ] Memory usage stable over 1 hour
- [ ] CPU usage <30% with 10 users
- [ ] Network bandwidth <100kb/s per user

### Edge Cases
- [ ] Rapid connect/disconnect handling
- [ ] Network instability (throttling)
- [ ] Browser tab sleep/wake
- [ ] Multiple devices same user
- [ ] Very large documents (1000+ elements)

---

## Deployment

**Start collaboration server with PM2:**
```javascript
// ecosystem.config.js - add:
{
  name: 'flux-collaboration',
  script: 'server-collaboration.js',
  instances: 1, // Single instance for WebSocket affinity
  exec_mode: 'cluster',
  env: {
    NODE_ENV: 'production',
    PORT: 4000
  }
}
```

```bash
pm2 start ecosystem.config.js --only flux-collaboration
pm2 save
```

**Nginx WebSocket proxy:**
```nginx
# /etc/nginx/sites-available/fluxstudio
location /collaboration {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket timeouts
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

---

## Success Criteria

**Week 5 (Cursor Tracking MVP):**
- ✅ Cursors visible for all users
- ✅ <50ms cursor latency
- ✅ 5+ concurrent users tested
- ✅ Connection status indicators

**Week 6 (Canvas Sync):**
- ✅ Elements sync in real-time
- ✅ 10+ concurrent users
- ✅ No conflicts (CRDT working)
- ✅ <100ms sync latency

**Week 7 (Offline Support):**
- ✅ Offline changes sync on reconnect
- ✅ No data loss
- ✅ Conflict resolution working

**Week 8 (Production Ready):**
- ✅ 50+ concurrent users tested
- ✅ Comments/annotations working
- ✅ Performance optimized
- ✅ Documentation complete

---

**Document End**

**Next:** UX Polish Guide (Weeks 9-12)
**Status:** Ready for implementation
**Contact:** Tech Lead for questions

🚀 Let's build real-time collaboration!
