# MetMap Accounts & Cloud Sync - Technical Roadmap

## Overview

This document outlines the technical approach for adding user accounts and cloud synchronization to MetMap, enabling users to access their songs, practice history, and settings across multiple devices.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MetMap Frontend                          │
│                    (Next.js @ metmap.fluxstudio.art)            │
├─────────────────────────────────────────────────────────────────┤
│  Zustand Store  │  Auth Context  │  Sync Manager  │  IndexedDB  │
└────────┬────────┴───────┬────────┴───────┬────────┴──────┬──────┘
         │                │                │               │
         │                ▼                ▼               │
         │    ┌───────────────────────────────────┐        │
         │    │         Supabase Backend          │        │
         │    ├───────────────────────────────────┤        │
         │    │  Auth  │  Database  │  Realtime   │        │
         │    │ (OAuth)│ (Postgres) │   (Sync)    │        │
         │    └───────────────────────────────────┘        │
         │                                                 │
         └──────── Offline-first with local cache ─────────┘
```

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Backend | **Supabase** | Managed PostgreSQL + Auth + Realtime subscriptions, generous free tier |
| Auth | Supabase Auth | Built-in OAuth (Google, GitHub), magic links, email/password |
| Database | PostgreSQL (via Supabase) | Relational data fits song/section/session model well |
| Realtime Sync | Supabase Realtime | WebSocket-based sync for multi-device updates |
| Offline Storage | IndexedDB (via Dexie.js) | Better than localStorage for structured data |
| State Management | Zustand (existing) | Add sync middleware layer |

### Why Supabase over alternatives?

| Option | Pros | Cons |
|--------|------|------|
| **Supabase** ✓ | Free tier, Postgres, Auth built-in, Realtime, Row-level security | Vendor lock-in |
| Firebase | Real-time, mobile SDKs | NoSQL (less suited), Google lock-in |
| Custom (Express + Postgres) | Full control | More dev time, must handle auth/scaling |
| Serverless (DO Functions) | Scales well | Cold starts, more complexity |

---

## Data Model

### Database Schema (PostgreSQL)

```sql
-- Users (managed by Supabase Auth, extended with profile)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  preferences JSONB DEFAULT '{}',
  metronome_settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_updated_at ON songs(updated_at);
CREATE INDEX idx_sections_song_id ON sections(song_id);
CREATE INDEX idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can CRUD own songs"
  ON songs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own sections"
  ON sections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own practice sessions"
  ON practice_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up Supabase, auth UI, and basic user flow.

#### 1.1 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Configure OAuth providers (Google, GitHub)
- [ ] Set up database schema
- [ ] Configure Row-Level Security
- [ ] Generate TypeScript types from schema

#### 1.2 Auth Integration
- [ ] Install `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`
- [ ] Create Supabase client utilities
- [ ] Add auth context provider
- [ ] Build login/signup UI components
- [ ] Implement OAuth login flow
- [ ] Add email/password option
- [ ] Handle auth state persistence

#### 1.3 Files to Create
```
metmap/src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── types.ts         # Generated types
│   └── auth/
│       └── authContext.tsx  # Auth provider
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── OAuthButtons.tsx
│   │   └── UserMenu.tsx
│   └── ...
└── app/
    ├── auth/
    │   ├── login/page.tsx
    │   ├── signup/page.tsx
    │   └── callback/route.ts  # OAuth callback
    └── ...
```

### Phase 2: Data Layer (Week 2-3)

**Goal:** Cloud CRUD operations for songs, sections, sessions.

#### 2.1 API Layer
- [ ] Create data access functions for songs
- [ ] Create data access functions for sections
- [ ] Create data access functions for practice sessions
- [ ] Create data access functions for preferences
- [ ] Add optimistic locking (version field)

#### 2.2 Zustand Store Updates
- [ ] Add `isAuthenticated` state
- [ ] Add `user` state
- [ ] Create async actions for CRUD operations
- [ ] Handle loading/error states
- [ ] Maintain backward compatibility with localStorage

#### 2.3 Files to Create/Modify
```
metmap/src/
├── lib/
│   └── supabase/
│       ├── songs.ts         # Song CRUD
│       ├── sections.ts      # Section CRUD
│       ├── sessions.ts      # Practice session CRUD
│       └── preferences.ts   # User preferences CRUD
└── stores/
    └── useMetMapStore.ts    # Add cloud sync actions
```

### Phase 3: Sync Engine (Week 3-4)

**Goal:** Bi-directional sync with conflict resolution.

#### 3.1 Offline Storage (IndexedDB)
- [ ] Install Dexie.js
- [ ] Create IndexedDB schema mirroring Postgres
- [ ] Implement local CRUD operations
- [ ] Add sync status tracking per record

#### 3.2 Sync Manager
- [ ] Create sync queue for offline changes
- [ ] Implement push sync (local → cloud)
- [ ] Implement pull sync (cloud → local)
- [ ] Handle conflicts (last-write-wins or prompt user)
- [ ] Add Supabase Realtime subscription for live updates

#### 3.3 Sync States
```typescript
type SyncStatus =
  | 'synced'      // Matches server
  | 'pending'     // Local change not yet pushed
  | 'syncing'     // Currently syncing
  | 'conflict'    // Conflict detected
  | 'error';      // Sync failed

interface SyncableRecord {
  id: string;
  localVersion: number;
  serverVersion: number;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  pendingChanges: object | null;
}
```

#### 3.4 Conflict Resolution Strategy
```
1. On save:
   - If offline: Save locally, mark as 'pending'
   - If online: Push to server, update local

2. On reconnect:
   - Push all 'pending' changes
   - Pull changes since lastSyncedAt
   - Compare versions for conflicts

3. On conflict:
   - Default: Last-write-wins (server timestamp)
   - Option: Prompt user to choose
   - Merge: For additive changes (e.g., new sections)
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
│       ├── conflicts.ts     # Conflict resolution
│       └── realtime.ts      # Supabase Realtime
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
   - Copy localStorage songs to cloud
   - Mark as synced
   - Clear localStorage (optional)
5. If no:
   - Start fresh with cloud
   - Keep localStorage separate (guest mode)
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

#### 4.4 Settings Page Updates
- [ ] Account section (email, avatar)
- [ ] Sign out button
- [ ] Delete account option
- [ ] Export data (JSON)
- [ ] Import data

---

## API Reference

### Authentication

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in with OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${origin}/auth/callback` }
});

// Sign in with email
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Data Operations

```typescript
// lib/supabase/songs.ts
export async function getSongs(userId: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('*, sections(*)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createSong(song: Omit<Song, 'id'>) {
  const { data, error } = await supabase
    .from('songs')
    .insert(song)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSong(id: string, updates: Partial<Song>) {
  const { data, error } = await supabase
    .from('songs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSong(id: string) {
  // Soft delete
  const { error } = await supabase
    .from('songs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
```

### Realtime Sync

```typescript
// lib/sync/realtime.ts
export function subscribeToChanges(userId: string, onUpdate: (payload: any) => void) {
  const channel = supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'songs',
        filter: `user_id=eq.${userId}`
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sections',
        filter: `user_id=eq.${userId}`
      },
      onUpdate
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only
```

---

## Security Considerations

1. **Row-Level Security**: All tables have RLS enabled - users can only access their own data
2. **Auth Tokens**: Supabase handles JWT tokens securely
3. **HTTPS**: All traffic encrypted (handled by DO/Supabase)
4. **Input Validation**: Validate all inputs before database operations
5. **Rate Limiting**: Supabase has built-in rate limiting
6. **Sensitive Data**: No PII stored beyond email; passwords hashed by Supabase

---

## Testing Strategy

### Unit Tests
- Auth flows (login, logout, session refresh)
- Data operations (CRUD)
- Sync logic (queue, conflicts)

### Integration Tests
- Full auth → sync flow
- Offline → online transition
- Multi-device sync

### E2E Tests
- User signup → create song → sync → login on new device → see song

---

## Rollout Strategy

1. **Feature Flag**: Gate behind `NEXT_PUBLIC_FF_CLOUD_SYNC`
2. **Beta Period**: Enable for opt-in users first
3. **Gradual Rollout**: 10% → 50% → 100%
4. **Fallback**: localStorage always works if cloud fails

---

## Cost Estimate (Supabase)

| Tier | Users | Cost | Includes |
|------|-------|------|----------|
| Free | 0-500 MAU | $0 | 500MB DB, 1GB storage, 2M requests |
| Pro | 500+ MAU | $25/mo | 8GB DB, 100GB storage, unlimited requests |

For MetMap's initial launch, the free tier should be sufficient.

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Foundation | 1-2 weeks | Auth working, can sign in |
| 2. Data Layer | 1 week | Cloud CRUD for songs |
| 3. Sync Engine | 1-2 weeks | Offline-first with sync |
| 4. Migration | 1 week | Existing user migration, polish |

**Total: 4-6 weeks** for full implementation

---

## Next Steps

1. Create Supabase project
2. Set up database schema
3. Implement auth (Phase 1)
4. Iterate from there

Ready to proceed?
