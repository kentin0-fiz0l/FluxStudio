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

### Runtime Safeguards

The metronome engine includes defensive guards for reliability:

- **Audio Context Failures**: Graceful fallback when Web Audio API is unavailable
- **Visual-Only Mode**: Silent practice with visual beat indicators when audio fails or for quiet environments
- **Loop Validation**: Guards against invalid loop boundaries (start >= end, negative times)
- **BPM Clamping**: Valid range enforced (20-400 BPM)
- **Iteration Limits**: Scheduler loop protection prevents infinite loops
- **State Persistence**: Playback position and loop boundaries persist across page reloads

## Beta Usage

### Features Ready for Testing

1. **Metronome Playback** - Play/pause with tempo map support
2. **Visual Beat Indicator** - Downbeat accent, beat dots
3. **Visual-Only Mode** - Silent practice with visual feedback only
4. **Tap Tempo** - Tap to detect BPM
5. **Count-In** - Optional count-in bars before playback
6. **Section Looping** - Loop individual sections during practice
7. **State Persistence** - Position and loop boundaries restore on reload

### Known Limitations

- Audio may not work in some mobile browsers until user interaction
- Tempo ramps with very short durations may sound slightly stepped
- Loop boundaries under 0.5 seconds may cause timing jitter

## Beta QA Checklist

### Tempo Accuracy
- [ ] Play at 60 BPM and verify clicks align with second marks
- [ ] Play at 120 BPM for 2 minutes without drift
- [ ] Play at 200 BPM and verify stable timing
- [ ] Play at 40 BPM (slow) and verify no stuttering

### Ramp Smoothness
- [ ] Create tempo ramp from 80 to 120 BPM over 8 seconds
- [ ] Verify gradual acceleration without audible steps
- [ ] Create deceleration ramp (120 to 80 BPM)
- [ ] Test ramp across loop boundary

### Loop Transitions
- [ ] Loop a 4-bar section and verify seamless transition
- [ ] Loop a 1-bar section at high tempo
- [ ] Loop a section with tempo change inside it
- [ ] Change loop boundaries while playing

### Tap Tempo Accuracy
- [ ] Tap 8 times at known tempo (use external reference)
- [ ] Verify detected BPM within ±2 of reference
- [ ] Test tap tempo resets after 2 seconds of no taps
- [ ] Verify tap tempo updates song BPM when callback provided

### Mobile Browser Behavior
- [ ] **iOS Safari**: First tap starts audio after user interaction
- [ ] **iOS Safari**: Visual-only mode works without audio permission
- [ ] **Android Chrome**: Audio plays reliably
- [ ] **Android Chrome**: Large touch targets are easy to hit
- [ ] Landscape orientation maintains usable layout
- [ ] Portrait orientation shows all controls

### Edge Cases
- [ ] Rapid play/pause toggling (10x in 2 seconds) doesn't crash
- [ ] Switching songs while playing stops cleanly
- [ ] Editing tempo events while playing updates timing
- [ ] Page reload during playback restores position (paused)
- [ ] Very short loop (< 1 second) handles gracefully

## Public Beta Guide

### Installing on Mobile (PWA)

MetMap works as a Progressive Web App (PWA) - you can install it on your phone's home screen for a native app experience.

**iOS (Safari):**
1. Open `metmap.fluxstudio.art` in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm

**Android (Chrome):**
1. Open `metmap.fluxstudio.art` in Chrome
2. Tap the three-dot menu (⋮)
3. Tap "Add to Home screen" or "Install app"
4. Tap "Add" to confirm

### Creating a Tempo Map

1. **Add a Song**: Tap "New Song" and enter the title and artist
2. **Set Base Tempo**: In the song editor, set the starting BPM and time signature
3. **Add Tempo Events**: Use the Tempo Map Editor to add tempo changes:
   - Choose a timestamp (in seconds)
   - Set the new BPM
   - Select change type (instant, ramp, step, or swing)
   - For ramps, set the duration of the transition
4. **Test It**: Use the metronome toggle to hear your tempo map

### Using Practice Mode Effectively

1. **Map Your Sections First**: Break the song into logical sections with timestamps
2. **Rate Your Confidence**: Give each section a 1-5 confidence rating
3. **Start a Practice Session**: Tap "Practice" on the song page
4. **Loop Weak Sections**: Toggle looping on sections you're struggling with
5. **Use the Metronome**: Enable the metronome for timing practice
6. **Mark Progress**: Update confidence as you improve
7. **End Session**: Add notes about what you worked on

### Tips for Musicians

- **Demo Song**: Try the pre-loaded "MetMap Demo Song" to see tempo changes and time signature changes in action
- **Visual-Only Mode**: Enable this for silent practice with just visual beat feedback
- **Tap Tempo**: If you're not sure of the BPM, use tap tempo to find it
- **Count-In**: Enable count-in to get ready before the metronome starts
- **Latency Calibration**: If clicks feel off, calibrate your device's audio latency

### Feature Flags

The following features can be toggled via environment variables for staged rollout:

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_TEMPO_MAP_EDITOR` | `true` | Tempo map editor UI |
| `NEXT_PUBLIC_FF_VISUAL_ONLY_MODE` | `true` | Silent visual-only mode |
| `NEXT_PUBLIC_FF_LATENCY_CALIBRATION` | `true` | Audio latency calibration |
| `NEXT_PUBLIC_FF_DEMO_SONG` | `true` | Auto-load demo song for new users |
| `NEXT_PUBLIC_FF_ONBOARDING` | `true` | Show onboarding for new users |

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Zustand (state management with localStorage persistence)
- Tailwind CSS
- Web Audio API (metronome timing)

## Deployment

See [`metmap/DEPLOYMENT.md`](./metmap/DEPLOYMENT.md) for instructions on deploying MetMap to DigitalOcean and setting up the `fluxstudio.art/metmap` redirect.
