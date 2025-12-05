# MetMap

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
- **Tempo Map**: Define tempo events throughout a song with support for instant, ramp, step, and swing change types
- **Programmable Metronome**: High-precision Web Audio API metronome with tempo map support
- **Practice Mode**: Loop individual sections, skip between them, mark sections as practiced
- **Session Tracking**: Time your practice sessions, rate them, and add notes
- **Offline-First**: All data persists in localStorage; works without internet
- **PWA-Ready**: Includes manifest for add-to-homescreen on mobile

### Tempo Map + Metronome

MetMap includes a programmable metronome that can follow complex tempo maps:

- **Tempo Events**: Define tempo changes at specific timestamps with BPM, time signature, and change type
- **Change Types**:
  - `instant` - Immediate tempo change
  - `ramp` - Gradual tempo change over a duration (accelerando/ritardando)
  - `step` - Stepped changes (1 BPM per beat)
  - `swing` - Swing feel with configurable percentage
- **Time Signatures**: Full support for any time signature (4/4, 3/4, 6/8, 7/8, etc.)
- **Count-In**: Optional 2-bar count-in before playback starts
- **Tap Tempo**: Tap to set BPM with averaging over recent taps
- **Visual Beat Display**: Real-time beat indicator with accented downbeats

## Architecture

### Metronome Timing Engine

The metronome uses a "look-ahead" scheduling approach for sample-accurate timing:

1. **JavaScript Timer**: A `setInterval` timer runs every ~25ms (the scheduler)
2. **Look-Ahead Window**: The scheduler looks 100ms ahead and schedules any beats in that window
3. **Web Audio API**: The AudioContext handles precise timing of scheduled oscillator sounds
4. **Decoupled Timing**: This decouples the UI thread timing (imprecise, subject to jank) from audio timing (sample-accurate)

This architecture ensures clicks never drift or stutter, even when the UI is busy rendering. The scheduler generates sine wave clicks using `OscillatorNode` with different frequencies for downbeats (1000Hz) vs other beats (800Hz), with a sharp attack and quick exponential decay envelope.

Tempo ramping uses linear interpolation across beats, and the engine automatically handles loop boundaries and count-in sequences.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Zustand (state management with localStorage persistence)
- Tailwind CSS

## Deployment

See [`metmap/DEPLOYMENT.md`](./metmap/DEPLOYMENT.md) for instructions on deploying MetMap to DigitalOcean and setting up the `fluxstudio.art/metmap` redirect.
