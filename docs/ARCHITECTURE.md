# FluxStudio Architecture

This document provides an overview of FluxStudio's system architecture, including component interactions, data flow, and deployment topology.

## System Overview

FluxStudio is a creative design collaboration platform built with a modern microservices-inspired architecture, featuring real-time collaboration, secure authentication, and extensive third-party integrations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUXSTUDIO ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   Clients   │
                                    │ (Browser/   │
                                    │  Mobile)    │
                                    └──────┬──────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │      CDN / Nginx       │
                              │   (Static Assets +     │
                              │    Reverse Proxy)      │
                              └───────────┬────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
           ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
           │   Frontend    │    │    Unified    │    │ Collaboration │
           │   (React +    │    │    Backend    │    │    Service    │
           │    Vite)      │    │  (Express +   │    │  (WebSocket   │
           │   Port 5173   │    │  Socket.IO)   │    │    + Yjs)     │
           │               │    │   Port 3001   │    │   Port 4000   │
           └───────────────┘    └───────┬───────┘    └───────┬───────┘
                                        │                     │
                    ┌───────────────────┼─────────────────────┤
                    │                   │                     │
                    ▼                   ▼                     ▼
           ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
           │  PostgreSQL   │    │     Redis     │    │    AWS S3     │
           │   Database    │    │    Cache      │    │  File Storage │
           └───────────────┘    └───────────────┘    └───────────────┘
```

---

## Component Architecture

### Frontend (React + Vite)

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Radix UI primitives
│   ├── messaging/      # Real-time chat components
│   ├── collaboration/  # Live editing components
│   ├── analytics/      # Dashboard components
│   └── ...
├── pages/              # Route-level components
├── services/           # API client services
├── hooks/              # Custom React hooks
├── contexts/           # React Context providers
├── types/              # TypeScript definitions
└── utils/              # Helper functions
```

**Key Technologies:**
- React 18 with TypeScript
- Vite for fast HMR and builds
- TanStack Query for server state
- Tailwind CSS + Radix UI
- Socket.IO client for real-time
- Yjs for CRDT collaboration

### Unified Backend (Express + Socket.IO)

```
├── server-unified.js    # Main entry point
├── routes/              # API route handlers
├── middleware/          # Express middleware
│   ├── security.js     # Rate limiting, CORS, Helmet
│   ├── validation.js   # Input validation
│   └── csrf.js         # CSRF protection
├── lib/                 # Core services
│   ├── auth/           # Authentication logic
│   ├── security/       # Security utilities
│   ├── monitoring/     # Metrics & logging
│   ├── cache.js        # Redis caching
│   ├── storage.js      # S3 file storage
│   └── payments.js     # Stripe integration
└── database/            # Database layer
    ├── config.js       # Connection pool
    ├── schema.sql      # DDL definitions
    └── migrations/     # Schema migrations
```

**Socket.IO Namespaces:**
- `/auth` - Authentication events, performance metrics
- `/messaging` - Real-time chat, typing indicators, presence

### Collaboration Service (Yjs + WebSocket)

Dedicated service for real-time document collaboration using CRDT (Conflict-free Replicated Data Types).

**Features:**
- Live cursor tracking
- Real-time text/design editing
- Automatic conflict resolution
- Presence awareness

---

## Data Flow Diagrams

### Authentication Flow

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Client │────▶│ Backend │────▶│ Database │     │  OAuth   │
└────────┘     └─────────┘     └──────────┘     │ Provider │
                    │                           └──────────┘
                    │              ▲                  ▲
                    │              │                  │
                    └──────────────┴──────────────────┘

1. Client sends credentials (email/password or OAuth token)
2. Backend validates against database or OAuth provider
3. JWT token generated and returned
4. Client stores token, includes in subsequent requests
5. Backend validates JWT on each protected request
```

### Real-Time Messaging Flow

```
┌────────┐  WebSocket   ┌─────────┐  Pub/Sub   ┌───────┐
│Client A│◀────────────▶│ Backend │◀──────────▶│ Redis │
└────────┘              └─────────┘            └───────┘
                             │                      ▲
┌────────┐  WebSocket        │                      │
│Client B│◀──────────────────┘──────────────────────┘
└────────┘

1. Client A sends message via WebSocket
2. Backend persists to PostgreSQL
3. Backend publishes to Redis pub/sub
4. All connected clients receive message
5. Typing indicators and presence via same channel
```

### File Upload Flow

```
┌────────┐     ┌─────────┐     ┌───────┐     ┌─────┐
│ Client │────▶│ Backend │────▶│  S3   │     │ CDN │
└────────┘     └─────────┘     └───────┘     └─────┘
     │              │               │            │
     │              ▼               │            │
     │         ┌─────────┐         │            │
     │         │Validate │         │            │
     │         │ + Scan  │         │            │
     │         └─────────┘         │            │
     │              │               ▼            │
     │              └──────────▶ Store ──────────┘
     │                              │
     └◀─────── Presigned URL ◀─────┘

1. Client requests upload URL
2. Backend validates file type/size
3. Backend generates presigned S3 URL
4. Client uploads directly to S3
5. CDN serves files globally
```

---

## Database Schema (Key Entities)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  organizations  │     │     teams       │     │     users       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │◀───┐│ id              │  ┌─▶│ id              │
│ name            │    ││ organization_id │──┘  │ email           │
│ slug            │    │└─────────────────┘     │ password_hash   │
│ settings        │    │                        │ oauth_provider  │
└─────────────────┘    │                        └─────────────────┘
         │             │                                 │
         │             │     ┌─────────────────┐        │
         │             └────▶│    projects     │◀───────┘
         │                   ├─────────────────┤
         └──────────────────▶│ id              │
                             │ organization_id │
                             │ name            │
                             │ status          │
                             └─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
           ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
           │    files      │ │   messages    │ │   comments    │
           ├───────────────┤ ├───────────────┤ ├───────────────┤
           │ id            │ │ id            │ │ id            │
           │ project_id    │ │ project_id    │ │ project_id    │
           │ s3_key        │ │ user_id       │ │ user_id       │
           │ mime_type     │ │ content       │ │ content       │
           └───────────────┘ └───────────────┘ └───────────────┘
```

---

## External Service Integrations

```
                              ┌─────────────────┐
                              │   FluxStudio    │
                              │     Backend     │
                              └────────┬────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        │              │               │               │              │
        ▼              ▼               ▼               ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│    Stripe    ││    AWS S3    ││   Sentry     ││   Slack      ││   Figma      │
│  (Payments)  ││  (Storage)   ││ (Monitoring) ││(Notifications││  (Design     │
│              ││              ││              ││   & Chat)    ││   Import)    │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
        │              │               │               │              │
        └──────────────┴───────────────┼───────────────┴──────────────┘
                                       │
                              ┌────────▼────────┐
                              │  OAuth Providers│
                              │ (Google, Apple, │
                              │  GitHub)        │
                              └─────────────────┘
```

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Stripe** | Payment processing, subscriptions | `lib/payments.js` |
| **AWS S3** | File storage, CDN origin | `lib/storage.js` |
| **Sentry** | Error tracking, performance monitoring | `lib/monitoring/sentry.js` |
| **Slack** | Team notifications, OAuth | `src/services/slackService.ts` |
| **Figma** | Design file import | `src/services/figmaService.ts` |
| **GitHub** | Repository integration, OAuth | `src/services/githubService.ts` |
| **Google** | OAuth authentication | `src/services/GoogleOAuthManager.ts` |
| **Anthropic** | AI design assistance | Direct SDK |

---

## Deployment Architecture

### Production (DigitalOcean App Platform)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DigitalOcean App Platform                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Frontend   │  │  Backend    │  │  Collaboration Service  │ │
│  │  (Static)   │  │  (Web)      │  │  (Worker)               │ │
│  │             │  │             │  │                         │ │
│  │  Nginx +    │  │  Node.js    │  │  Node.js + WebSocket    │ │
│  │  React SPA  │  │  Express    │  │  Yjs Server             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────────┐ │
│  │                    Managed Services                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐│ │
│  │  │  PostgreSQL  │  │    Redis     │  │   Spaces (S3)    ││ │
│  │  │  (Database)  │  │   (Cache)    │  │  (File Storage)  ││ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Local Development (Docker Compose)

```bash
docker-compose up
```

Services:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend (port 3001)
- Collaboration (port 4000)
- Frontend (port 80)

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Layer 1: Edge Security                                  ││
│  │ • CDN with DDoS protection                              ││
│  │ • SSL/TLS termination                                   ││
│  │ • WAF rules                                             ││
│  └────────────────────────────────────────────────────────┘│
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐│
│  │ Layer 2: Application Security                           ││
│  │ • Helmet (security headers)                             ││
│  │ • CORS policy                                           ││
│  │ • Rate limiting                                         ││
│  │ • CSRF protection                                       ││
│  │ • Input validation                                      ││
│  └────────────────────────────────────────────────────────┘│
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐│
│  │ Layer 3: Authentication & Authorization                 ││
│  │ • JWT with refresh tokens                               ││
│  │ • OAuth 2.0 (Google, Apple, GitHub)                     ││
│  │ • Role-based access control                             ││
│  │ • Session management                                    ││
│  └────────────────────────────────────────────────────────┘│
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐│
│  │ Layer 4: Data Security                                  ││
│  │ • Encrypted connections (SSL)                           ││
│  │ • Password hashing (bcrypt)                             ││
│  │ • Sensitive data encryption                             ││
│  │ • Parameterized queries (SQL injection prevention)      ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    Observability Stack                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Prometheus  │  │   Grafana   │  │       Loki          │ │
│  │  (Metrics)  │  │ (Dashboards)│  │   (Log Aggregation) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │  Sentry   │                            │
│                    │  (Errors) │                            │
│                    └───────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Collected Metrics:
• Request latency (p50, p95, p99)
• Error rates by endpoint
• Active WebSocket connections
• Database query performance
• Cache hit rates
• File upload/download speeds
```

---

## Related Documentation

- [Environment Setup](./ENVIRONMENT_SETUP.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Best Practices](./SECURITY.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
