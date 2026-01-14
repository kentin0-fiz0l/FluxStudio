# FluxStudio 2.0 Rearchitecture

This document describes the architectural changes made to FluxStudio to improve scalability, maintainability, and developer experience.

## Overview

FluxStudio 2.0 introduces a monorepo architecture using Turborepo with three core packages:

1. **@fluxstudio/database** - Prisma ORM for type-safe database access
2. **@fluxstudio/realtime** - Unified Yjs-based real-time collaboration
3. **@fluxstudio/shared** - Common types, constants, and utilities

## Directory Structure

```
FluxStudio/
├── apps/
│   └── web/                    # Main web application
├── packages/
│   ├── database/               # Prisma database layer
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Prisma schema
│   │   └── src/
│   │       ├── client.ts       # Singleton PrismaClient
│   │       └── index.ts
│   ├── realtime/               # Real-time collaboration
│   │   └── src/
│   │       ├── server/
│   │       │   ├── FluxRealtimeServer.ts
│   │       │   ├── DocumentStore.ts
│   │       │   └── RedisPubSub.ts
│   │       └── client/
│   │           ├── FluxRealtimeProvider.ts
│   │           └── hooks.ts
│   └── shared/                 # Shared utilities
│       └── src/
│           ├── types.ts
│           ├── constants.ts
│           └── utils.ts
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml         # pnpm workspace config
```

## Key Changes

### 1. Turborepo Monorepo Setup

**Before:** Single-package structure with all code in one repository.

**After:** Monorepo with separate packages for database, realtime, and shared code.

**Benefits:**
- Shared packages across multiple apps
- Parallel builds with task caching
- Clear separation of concerns
- Independent versioning

### 2. Prisma ORM (packages/database)

**Before:** Manual database adapters (`database/*-adapter.js`) with raw SQL queries.

**After:** Prisma ORM with type-safe generated client.

**Migration Path:**
1. Schema converted from `database/schema.sql` to `prisma/schema.prisma`
2. Manual adapters replaced with Prisma client methods
3. Type safety throughout the application

**Usage:**
```typescript
import { prisma, User, Project } from "@fluxstudio/database";

// Type-safe queries
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { projects: true }
});
```

### 3. Unified Yjs Real-time (packages/realtime)

**Before:** Socket.IO + Yjs running separately with custom sync logic.

**After:** Pure Yjs with y-websocket protocol and Redis pub/sub for scaling.

**Architecture:**
```
┌─────────────────┐     ┌─────────────────┐
│  Client 1       │     │  Client 2       │
│  (Browser)      │     │  (Browser)      │
└────────┬────────┘     └────────┬────────┘
         │ WebSocket             │ WebSocket
         │                       │
┌────────▼───────────────────────▼────────┐
│          FluxRealtimeServer             │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │DocumentStore│  │   RedisPubSub    │  │
│  └─────────────┘  └────────┬─────────┘  │
└────────────────────────────┼────────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis       │
                    │  (Pub/Sub)      │
                    └─────────────────┘
```

**Server Features:**
- `FluxRealtimeServer`: WebSocket server handling Yjs sync protocol
- `DocumentStore`: In-memory document management with TTL-based cleanup
- `RedisPubSub`: Cross-server communication for horizontal scaling

**Client Features:**
- `FluxRealtimeProvider`: WebSocket client with auto-reconnect
- React hooks: `useFluxDocument`, `useFluxPresence`, `useYMap`, `useYArray`, `useYText`

**Usage:**
```typescript
// Server
import { FluxRealtimeServer } from "@fluxstudio/realtime/server";

const server = new FluxRealtimeServer({
  port: 4444,
  redis: { redis: process.env.REDIS_URL },
  authenticate: async (token, docName) => {
    // Verify JWT token
    return { userId, permissions: ["read", "write"] };
  },
});

server.start();

// Client (React)
import { useFluxDocument, useFluxPresence } from "@fluxstudio/realtime/client";

function CollaborativeEditor({ docId }) {
  const { doc, status, awareness } = useFluxDocument({
    url: "ws://localhost:4444",
    docName: docId,
    token: authToken,
  });

  const { remoteStates, setPresence } = useFluxPresence(awareness, {
    user: { id: userId, name: userName, color: userColor }
  });

  // Use doc.getMap(), doc.getArray(), doc.getText() for shared data
}
```

### 4. Shared Package (packages/shared)

Common code shared across all packages and apps:

**Types (`types.ts`):**
- User, Organization, Team, Project types
- Message, Notification, File types
- API response types

**Constants (`constants.ts`):**
- Role definitions (USER_TYPES, ORG_ROLES, etc.)
- Status enums (PROJECT_STATUSES, FILE_STATUSES)
- Color palettes (BRAND_COLORS, PRESENCE_COLORS)
- API endpoints and WebSocket events
- Limits and error codes

**Utilities (`utils.ts`):**
- String helpers: `slugify`, `truncate`, `capitalize`
- File helpers: `formatFileSize`, `getFileExtension`
- Date helpers: `formatRelativeTime`, `isToday`
- Function helpers: `debounce`, `throttle`, `retry`
- Array/Object helpers: `groupBy`, `unique`, `pick`, `omit`

**Usage:**
```typescript
import {
  User,
  PROJECT_STATUSES,
  slugify,
  formatFileSize
} from "@fluxstudio/shared";
```

## CI/CD Updates

The CI workflow has been updated for the monorepo:

- **Node.js 20** (upgraded from 18)
- **pnpm** package manager (replaced npm)
- **Turborepo** for parallel builds
- **Prisma generation** before builds

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- Redis (optional, for horizontal scaling)

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @fluxstudio/database db:generate

# Build all packages
pnpm turbo build

# Run development servers
pnpm turbo dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fluxstudio

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Realtime server
REALTIME_PORT=4444
```

## Migration Guide

### From Manual Adapters to Prisma

**Before:**
```javascript
const adapter = require('./database/projects-adapter');
const project = await adapter.getProjectById(id);
```

**After:**
```typescript
import { prisma } from "@fluxstudio/database";
const project = await prisma.project.findUnique({ where: { id } });
```

### From Socket.IO to Yjs

**Before:**
```javascript
socket.on('doc:update', (data) => {
  // Manual sync logic
});
```

**After:**
```typescript
const { doc } = useFluxDocument({
  url: 'ws://localhost:4444',
  docName: 'my-doc'
});
// Updates sync automatically via Yjs
```

## Performance Improvements

1. **Build Caching**: Turborepo caches build outputs, reducing CI time by ~70%
2. **Parallel Execution**: Independent tasks run in parallel
3. **Connection Pooling**: Prisma handles database connection pooling
4. **Document GC**: Inactive documents are automatically unloaded from memory
5. **Horizontal Scaling**: Redis pub/sub enables multiple server instances

## Future Roadmap

- [ ] Migration scripts for existing data
- [ ] WebSocket authentication middleware
- [ ] Rate limiting for realtime connections
- [ ] Offline support with IndexedDB persistence
- [ ] End-to-end encryption for sensitive documents
