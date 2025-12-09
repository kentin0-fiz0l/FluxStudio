# MetMap

> **Deployment:** See [`metmap/DEPLOYMENT.md`](./metmap/DEPLOYMENT.md) for DigitalOcean setup.

MetMap is a practice tracking app for musicians. It helps you break down songs into discrete sections (verse, chorus, bridge, solo, etc.), assign confidence levels to each section, and focus your practice time on the parts that need the most work. The app is designed to be mobile-friendly so you can use it on your phone during practice sessions.

All data is stored locally in your browser's localStorage, so your songs and practice history persist between sessions without needing an account or backend. This makes MetMap work offline and keeps your data private. When deployed, MetMap lives at `metmap.fluxstudio.art` as a standalone Next.js application, separate from the main Flux Studio site.

The app includes a practice mode with section looping, confidence tracking, and session timing. After each practice session, you can rate how it went and add notes. MetMap surfaces your weakest sections so you know exactly what to focus on next time.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Song list with search and confidence overview |
| `/song/[id]` | Song editor - add/edit sections, set timestamps, track confidence |
| `/song/[id]/practice` | Practice mode - loop sections, mark progress, end session with notes |

## Features

- **Song Management**: Create songs with title, artist, duration, BPM, key, and tags
- **Section Mapping**: Define sections with start/end times, types (verse, chorus, bridge, etc.), and notes
- **Confidence Tracking**: Rate each section 1-5; color-coded visualization shows weak spots
- **Practice Mode**: Loop individual sections, skip between them, mark sections as practiced
- **Session Tracking**: Time your practice sessions, rate them, and add notes
- **Offline-First**: All data persists in localStorage; works without internet
- **PWA-Ready**: Includes manifest for add-to-homescreen on mobile

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Zustand (state management with localStorage persistence)
- Tailwind CSS

## Deployment

See [`metmap/DEPLOYMENT.md`](./metmap/DEPLOYMENT.md) for instructions on deploying MetMap to DigitalOcean and setting up the `fluxstudio.art/metmap` redirect.
