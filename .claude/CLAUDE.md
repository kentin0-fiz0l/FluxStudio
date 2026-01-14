# FluxStudio

Creative collaboration platform for design teams, enabling real-time collaboration, AI-assisted design workflows, and seamless project management.

## Quick Start

```bash
npm install
npm run dev          # Start frontend (port 5173)
npm run dev:unified  # Start backend API (port 3001)
npm run dev:collab   # Start collaboration service (port 4000)
npm run dev:all      # Start all services
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast HMR and optimized builds
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** + **Radix UI** - Styling and UI primitives
- **Framer Motion** - Animations

### Real-Time Collaboration
- **Yjs** - CRDT-based collaborative editing
- **Socket.IO** - WebSocket transport for real-time events
- **y-websocket** - Yjs WebSocket provider
- **Tiptap** - Collaborative rich text editor with Yjs integration

### Backend
- **Express 5** - API server
- **PostgreSQL** - Primary database
- **Redis** - Caching and pub/sub for real-time events
- **AWS S3** - File storage
- **JWT** - Authentication with refresh tokens

### Integrations
- **Anthropic AI** - Design assistance (`@anthropic-ai/sdk`)
- **Stripe** - Payments
- **Figma** - Design import
- **Slack/GitHub** - OAuth and notifications

## Project Structure

```
FluxStudio/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── ui/            # Radix UI primitives
│   │   ├── collaboration/ # Real-time collaboration
│   │   ├── messaging/     # Chat components
│   │   ├── ai/            # AI assistant components
│   │   └── analytics/     # Dashboard widgets
│   ├── services/          # API clients
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React Context providers
│   └── types/             # TypeScript definitions
├── server-unified.js      # Main API server
├── server-collaboration.js # Yjs collaboration server
├── routes/                # Express route handlers
├── middleware/            # Express middleware
├── lib/                   # Backend utilities
│   ├── auth/             # Authentication
│   ├── security/         # Security utilities
│   └── monitoring/       # Metrics and logging
├── database/              # Database layer
└── docs/                  # Documentation
```

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | System architecture and data flow diagrams |
| `docs/API_DOCUMENTATION.md` | REST API reference and examples |
| `docs/ENVIRONMENT_SETUP.md` | Development environment configuration |
| `docs/SECURITY.md` | Security best practices |
| `docs/VALIDATION_GUIDE.md` | Input validation patterns |
| `docs/AGENT_SYSTEM_GUIDE.md` | AI agent implementation guide |
| `docs/ROADMAP.md` | Feature roadmap and planning |

## API Conventions

### Base URL
- Production: `https://api.fluxstudio.art`
- Local: `http://localhost:3001`

### Authentication
All protected endpoints require JWT Bearer token:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fluxstudio.art/api/auth/me
```

### Response Format
```json
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Key Endpoints
- `POST /api/auth/login` - Authenticate user
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/organizations` - List organizations
- `POST /api/messages` - Send message
- `POST /api/ai/analyze-design` - AI design analysis

## Implementation Workflow

### Adding a New Feature
1. **Understand the spec** - Check `docs/` for relevant documentation
2. **Create components** - Add to `src/components/` following existing patterns
3. **Add API routes** - Create route handler in `routes/`
4. **Connect with services** - Use `src/services/` for API calls
5. **Add real-time** - Use Socket.IO for live updates if needed

### Real-Time Collaboration Pattern
```typescript
// 1. Create Yjs document
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:4000',
  'document-id',
  ydoc
);

// 2. Bind to shared data types
const ytext = ydoc.getText('content');
const yarray = ydoc.getArray('items');

// 3. Observe changes
ytext.observe(event => {
  console.log('Text changed:', event);
});
```

### Socket.IO Events Pattern
```typescript
// Client-side
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/messaging');
socket.emit('join:project', { projectId });
socket.on('message:new', (message) => { ... });

// Server-side namespaces:
// /auth - Authentication events
// /messaging - Chat and presence
```

### State Management Pattern
```typescript
// Zustand store
import { create } from 'zustand';

const useProjectStore = create((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
}));

// TanStack Query for server state
const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.getProjects(),
});
```

## Testing

```bash
npm run test          # Run Vitest unit tests
npm run test:watch    # Watch mode
npm run test:ui       # Vitest UI
npm run test:integration  # Jest integration tests
```

## Deployment

- **Production**: DigitalOcean App Platform
- **Database**: Managed PostgreSQL
- **Cache**: Managed Redis
- **Storage**: DigitalOcean Spaces (S3-compatible)

```bash
npm run build         # Build frontend
npm run deploy        # Deploy to production
npm run verify        # Verify deployment
```

## Development Tips

- Use `npm run lint` before committing
- Run `npm run typecheck` to verify TypeScript
- Check `docs/ARCHITECTURE.md` for data flow understanding
- Real-time features use both Socket.IO (events) and Yjs (CRDT sync)
- UI components are in `src/components/ui/` using Radix primitives
