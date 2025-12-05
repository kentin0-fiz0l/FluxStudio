# MetMap Accounts & Cloud Sync - Technical Roadmap

## Overview

This document outlines the technical approach for adding user accounts and cloud synchronization to MetMap using DigitalOcean infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MetMap Frontend                          │
│                    (Next.js @ metmap.fluxstudio.art)            │
│                      DO App Platform                            │
├─────────────────────────────────────────────────────────────────┤
│  Zustand Store  │  Auth Context  │  Sync Manager  │  IndexedDB  │
└────────┬────────┴───────┬────────┴───────┬────────┴──────┬──────┘
         │                │                │               │
         │                ▼                ▼               │
         │    ┌───────────────────────────────────┐        │
         │    │       MetMap API Service          │        │
         │    │       (DO App Platform)           │        │
         │    ├───────────────────────────────────┤        │
         │    │  NextAuth  │  API Routes │  WS    │        │
         │    └──────────────────┬────────────────┘        │
         │                       │                         │
         │                       ▼                         │
         │    ┌───────────────────────────────────┐        │
         │    │    DO Managed PostgreSQL          │        │
         │    │         (Database)                │        │
         │    └───────────────────────────────────┘        │
         │                                                 │
         └──────── Offline-first with local cache ─────────┘
```

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | Next.js 14 (existing) | Already deployed on DO App Platform |
| Backend API | Next.js API Routes | Same codebase, simpler deployment |
| Database | **DO Managed PostgreSQL** | Managed, automatic backups, scalable |
| Auth | **NextAuth.js** | OAuth + credentials, works with Next.js |
| Realtime | **Socket.io** or **Polling** | For multi-device sync |
| Offline Storage | IndexedDB (Dexie.js) | Better than localStorage for structured data |
| Hosting | **DO App Platform** | Already using for MetMap |

### DigitalOcean Services Used

| Service | Purpose | Estimated Cost |
|---------|---------|----------------|
| App Platform (existing) | Frontend + API | $5-12/mo |
| Managed PostgreSQL | User data storage | $15/mo (basic) |
| Spaces (optional) | File storage (avatars) | $5/mo |

**Total: ~$25-32/month** for full stack

---

## Data Model

### Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- NULL for OAuth users
  name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'email', -- 'email', 'google', 'github'
  provider_id TEXT, -- OAuth provider's user ID
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (for NextAuth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  duration INTEGER, -- seconds
  bpm INTEGER,
  key TEXT,
  time_signature TEXT DEFAULT '4/4',
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- soft delete for sync
  version INTEGER DEFAULT 1 -- optimistic locking
);

-- Sections
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- verse, chorus, bridge, etc.
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  confidence INTEGER DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  color TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

-- Practice Sessions
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- seconds
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  sections_practiced UUID[], -- array of section IDs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences (synced settings)
CREATE TABLE user_preferences (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  preferences JSONB DEFAULT '{}',
  metronome_settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_updated_at ON songs(updated_at);
CREATE INDEX idx_sections_song_id ON sections(song_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

---

## Implementation Phases

### Phase 1: Database & Auth Setup (Week 1-2)

**Goal:** Set up DO PostgreSQL, NextAuth, and basic user flow.

#### 1.1 DigitalOcean PostgreSQL Setup
- [ ] Create DO Managed PostgreSQL cluster
- [ ] Configure connection pooling
- [ ] Set up database schema (run migrations)
- [ ] Add connection string to App Platform env vars
- [ ] Install Prisma ORM for type-safe queries

#### 1.2 NextAuth.js Integration
- [ ] Install `next-auth` and `@auth/prisma-adapter`
- [ ] Configure OAuth providers (Google, GitHub)
- [ ] Set up email/password auth with bcrypt
- [ ] Create auth API routes
- [ ] Build login/signup UI components
- [ ] Add session management

#### 1.3 Environment Variables
```bash
# Add to DO App Platform
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
NEXTAUTH_URL=https://metmap.fluxstudio.art
NEXTAUTH_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GITHUB_ID=<from-github>
GITHUB_SECRET=<from-github>
```

#### 1.4 Files to Create
```
metmap/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── lib/
│   │   ├── prisma.ts        # Prisma client
│   │   └── auth.ts          # Auth config
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── error/page.tsx
│   │   └── ...
│   └── components/
│       └── auth/
│           ├── LoginForm.tsx
│           ├── SignupForm.tsx
│           ├── OAuthButtons.tsx
│           └── UserMenu.tsx
└── ...
```

### Phase 2: API Layer (Week 2-3)

**Goal:** REST API for songs, sections, sessions.

#### 2.1 API Routes Structure
```
metmap/src/app/api/
├── auth/[...nextauth]/route.ts  # Auth endpoints
├── songs/
│   ├── route.ts                 # GET (list), POST (create)
│   └── [id]/
│       └── route.ts             # GET, PUT, DELETE
├── sections/
│   ├── route.ts                 # POST (create)
│   └── [id]/
│       └── route.ts             # GET, PUT, DELETE
├── practice-sessions/
│   ├── route.ts                 # GET (list), POST (create)
│   └── [id]/
│       └── route.ts             # GET, PUT
├── preferences/
│   └── route.ts                 # GET, PUT
└── sync/
    └── route.ts                 # POST (bulk sync)
```

#### 2.2 API Implementation
- [ ] Create Prisma client singleton
- [ ] Implement songs CRUD endpoints
- [ ] Implement sections CRUD endpoints
- [ ] Implement practice sessions endpoints
- [ ] Implement preferences endpoints
- [ ] Add authentication middleware
- [ ] Add input validation (zod)
- [ ] Add error handling

#### 2.3 Example API Route
```typescript
// src/app/api/songs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const songs = await prisma.song.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    include: { sections: true },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(songs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const song = await prisma.song.create({
    data: {
      ...body,
      userId: session.user.id,
    },
  });

  return NextResponse.json(song, { status: 201 });
}
```

### Phase 3: Sync Engine (Week 3-4)

**Goal:** Bi-directional sync with offline support.

#### 3.1 Offline Storage (IndexedDB)
- [ ] Install Dexie.js
- [ ] Create IndexedDB schema mirroring PostgreSQL
- [ ] Implement local CRUD operations
- [ ] Add sync status tracking per record

#### 3.2 Sync Manager
```typescript
// Sync states
type SyncStatus =
  | 'synced'      // Matches server
  | 'pending'     // Local change not yet pushed
  | 'syncing'     // Currently syncing
  | 'conflict'    // Conflict detected
  | 'error';      // Sync failed

// Sync flow
async function syncAll() {
  // 1. Get local changes (pending)
  const pending = await localDb.songs.where('syncStatus').equals('pending').toArray();

  // 2. Push to server
  for (const item of pending) {
    await pushToServer(item);
  }

  // 3. Pull from server (changes since lastSync)
  const serverChanges = await fetchServerChanges(lastSyncTimestamp);

  // 4. Merge into local DB
  for (const change of serverChanges) {
    await mergeChange(change);
  }

  // 5. Update lastSyncTimestamp
  await setLastSyncTimestamp(new Date());
}
```

#### 3.3 Conflict Resolution
- **Default**: Last-write-wins (server timestamp)
- **Version check**: Compare `version` field
- **User prompt**: For critical conflicts, ask user

#### 3.4 Polling for Updates (Simple Realtime)
```typescript
// Simple polling approach (no WebSocket complexity)
useEffect(() => {
  const interval = setInterval(async () => {
    if (navigator.onLine && isAuthenticated) {
      await syncAll();
    }
  }, 30000); // Sync every 30 seconds

  return () => clearInterval(interval);
}, [isAuthenticated]);
```

#### 3.5 Files to Create
```
metmap/src/
├── lib/
│   ├── db/
│   │   ├── indexedDb.ts     # Dexie setup
│   │   └── schema.ts        # Local DB schema
│   └── sync/
│       ├── syncManager.ts   # Core sync logic
│       ├── syncQueue.ts     # Offline queue
│       └── conflicts.ts     # Conflict resolution
└── hooks/
    ├── useSync.ts           # Sync state hook
    └── useOnlineStatus.ts   # Network status
```

### Phase 4: Migration & Polish (Week 4-5)

**Goal:** Migrate existing users, polish UX.

#### 4.1 Migration Flow
```
1. User logs in for first time
2. Detect localStorage data
3. Prompt: "Import existing songs to your account?"
4. If yes:
   - Copy localStorage songs to cloud via API
   - Mark as synced locally
   - Clear localStorage (optional)
5. If no:
   - Start fresh with cloud
```

#### 4.2 Guest Mode
- [ ] Allow using app without login (current behavior)
- [ ] Show "Sign in to sync" prompt periodically
- [ ] Preserve localStorage for guest users
- [ ] Seamless upgrade path to account

#### 4.3 UI/UX Improvements
- [ ] Add sync status indicator in header
- [ ] Show last synced timestamp
- [ ] Add manual "Sync now" button
- [ ] Handle offline state gracefully
- [ ] Add loading states during sync
- [ ] Toast notifications for sync events

#### 4.4 Account Settings
- [ ] Account section (email, avatar)
- [ ] Sign out button
- [ ] Delete account option
- [ ] Export data (JSON)
- [ ] Import data

---

## DigitalOcean Setup Guide

### 1. Create Managed PostgreSQL

1. Go to DO Dashboard → Databases → Create Database Cluster
2. Choose:
   - Engine: PostgreSQL 16
   - Plan: Basic ($15/mo, 1 GB RAM, 10 GB storage)
   - Datacenter: Same region as App Platform (e.g., NYC)
   - Name: `metmap-db`
3. Create cluster
4. Get connection string from "Connection Details"
5. Add to App Platform environment variables

### 2. Update App Platform

1. Go to Apps → metmap → Settings → App Spec
2. Add environment variables:
   ```yaml
   envs:
     - key: DATABASE_URL
       value: ${metmap-db.DATABASE_URL}
       scope: RUN_AND_BUILD_TIME
     - key: NEXTAUTH_URL
       value: https://metmap.fluxstudio.art
       scope: RUN_AND_BUILD_TIME
     - key: NEXTAUTH_SECRET
       value: <generate-random-secret>
       scope: RUN_AND_BUILD_TIME
       type: SECRET
   ```
3. Link database to app (Settings → Components → Add Database)

### 3. Run Database Migrations

Option A: Via Prisma (recommended)
```bash
# Add to package.json scripts
"db:push": "prisma db push",
"db:migrate": "prisma migrate deploy"

# Run during build or manually
npx prisma db push
```

Option B: Direct SQL
```bash
# Connect via psql or DO console
psql $DATABASE_URL -f schema.sql
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?   @map("password_hash")
  name          String?
  avatarUrl     String?   @map("avatar_url")
  provider      String    @default("email")
  providerId    String?   @map("provider_id")
  emailVerified Boolean   @default(false) @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  sessions          Session[]
  songs             Song[]
  sections          Section[]
  practiceSessions  PracticeSession[]
  preferences       UserPreferences?

  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  sessionToken String   @unique @map("session_token")
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Song {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  title         String
  artist        String?
  album         String?
  duration      Int?
  bpm           Int?
  key           String?
  timeSignature String    @default("4/4") @map("time_signature")
  tags          String[]
  notes         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")
  version       Int       @default(1)

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  sections         Section[]
  practiceSessions PracticeSession[]

  @@index([userId])
  @@index([updatedAt])
  @@map("songs")
}

model Section {
  id         String    @id @default(uuid())
  songId     String    @map("song_id")
  userId     String    @map("user_id")
  name       String
  type       String
  startTime  Float     @map("start_time")
  endTime    Float     @map("end_time")
  confidence Int       @default(3)
  color      String?
  notes      String?
  sortOrder  Int       @default(0) @map("sort_order")
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")
  version    Int       @default(1)

  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([songId])
  @@map("sections")
}

model PracticeSession {
  id                String    @id @default(uuid())
  songId            String    @map("song_id")
  userId            String    @map("user_id")
  startedAt         DateTime  @map("started_at")
  endedAt           DateTime? @map("ended_at")
  duration          Int?
  rating            Int?
  notes             String?
  sectionsPracticed String[]  @map("sections_practiced")
  createdAt         DateTime  @default(now()) @map("created_at")

  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([songId])
  @@index([userId])
  @@map("practice_sessions")
}

model UserPreferences {
  userId            String   @id @map("user_id")
  preferences       Json     @default("{}")
  metronomeSettings Json     @default("{}") @map("metronome_settings")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}
```

---

## NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
};
```

---

## Security Considerations

1. **Database Security**:
   - DO Managed PostgreSQL includes SSL by default
   - Connection pooling prevents connection exhaustion
   - Use parameterized queries (Prisma handles this)

2. **Auth Security**:
   - Passwords hashed with bcrypt (cost factor 12)
   - JWT tokens for session management
   - HttpOnly cookies for session storage
   - CSRF protection built into NextAuth

3. **API Security**:
   - All endpoints require authentication
   - Input validation with zod
   - Rate limiting (implement with DO firewall or middleware)

4. **Data Security**:
   - Users can only access their own data (enforced in queries)
   - Soft deletes preserve data integrity during sync

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| DO App Platform (current) | $5-12 |
| DO Managed PostgreSQL | $15 |
| **Total** | **$20-27/mo** |

Can scale PostgreSQL as needed ($15 → $30 → $60 for larger plans).

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Database & Auth | 1-2 weeks | PostgreSQL setup, NextAuth working |
| 2. API Layer | 1 week | REST API for all entities |
| 3. Sync Engine | 1-2 weeks | Offline-first with sync |
| 4. Migration | 1 week | User migration, polish |

**Total: 4-6 weeks** for full implementation

---

## Next Steps

1. Create DO Managed PostgreSQL cluster
2. Add Prisma to MetMap
3. Implement NextAuth (Phase 1)
4. Build API routes (Phase 2)
5. Add sync layer (Phase 3)

Ready to proceed?
