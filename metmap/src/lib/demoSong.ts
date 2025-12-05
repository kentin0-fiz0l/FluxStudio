/**
 * MetMap Demo Song
 *
 * A sample song that demonstrates all MetMap features:
 * - Multiple tempo changes (instant and ramp)
 * - Time signature change (4/4 → 7/8)
 * - Multiple sections with varying confidence levels
 * - A good section for loop practice
 */

import { Song, Section, TempoEvent, generateId } from '@/types/metmap';

const DEMO_SONG_MARKER = '__metmap_demo_song__';

/**
 * Create the demo song with fixed IDs for consistency
 */
export function createDemoSong(): Song {
  const songId = 'demo-song-' + DEMO_SONG_MARKER;
  const now = new Date().toISOString();

  const sections: Section[] = [
    {
      id: generateId(),
      name: 'Intro',
      type: 'intro',
      startTime: 0,
      endTime: 16,
      confidence: 4,
      practiceCount: 0,
      notes: 'Steady 4/4 at 100 BPM. Good warm-up section.',
    },
    {
      id: generateId(),
      name: 'Verse 1',
      type: 'verse',
      startTime: 16,
      endTime: 48,
      confidence: 3,
      practiceCount: 0,
      notes: 'Watch for the tempo ramp starting at 32s.',
    },
    {
      id: generateId(),
      name: 'Build-up',
      type: 'bridge',
      startTime: 48,
      endTime: 64,
      confidence: 2,
      practiceCount: 0,
      notes: 'Tempo accelerates from 100 to 130 BPM. Practice this section!',
    },
    {
      id: generateId(),
      name: 'Chorus',
      type: 'chorus',
      startTime: 64,
      endTime: 96,
      confidence: 3,
      practiceCount: 0,
      notes: 'Fast section at 130 BPM. High energy!',
    },
    {
      id: generateId(),
      name: 'Breakdown (7/8)',
      type: 'bridge',
      startTime: 96,
      endTime: 124,
      confidence: 1,
      practiceCount: 0,
      notes: 'Time signature changes to 7/8! Count carefully: 1-2-3-4-5-6-7',
    },
    {
      id: generateId(),
      name: 'Outro',
      type: 'outro',
      startTime: 124,
      endTime: 156,
      confidence: 4,
      practiceCount: 0,
      notes: 'Back to 4/4, tempo slows to 90 BPM for the ending.',
    },
  ];

  const tempoEvents: TempoEvent[] = [
    {
      id: generateId(),
      time: 48,
      bpm: 130,
      timeSignature: { beats: 4, noteValue: 4 },
      changeType: 'ramp',
      rampDuration: 16,
      label: 'Accelerando to chorus',
    },
    {
      id: generateId(),
      time: 96,
      bpm: 120,
      timeSignature: { beats: 7, noteValue: 8 },
      changeType: 'instant',
      label: '7/8 breakdown',
    },
    {
      id: generateId(),
      time: 124,
      bpm: 90,
      timeSignature: { beats: 4, noteValue: 4 },
      changeType: 'ramp',
      rampDuration: 8,
      label: 'Ritardando to outro',
    },
  ];

  return {
    id: songId,
    title: 'MetMap Demo Song',
    artist: 'MetMap Tutorial',
    duration: 156,
    bpm: 100,
    key: 'C major',
    tags: ['demo', 'tutorial', 'tempo-changes'],
    sections,
    tempoEvents,
    defaultTimeSignature: { beats: 4, noteValue: 4 },
    createdAt: now,
    updatedAt: now,
    totalPracticeSessions: 0,
  };
}

/**
 * Check if a song is the demo song
 */
export function isDemoSong(song: Song): boolean {
  return song.id.includes(DEMO_SONG_MARKER) || song.title === 'MetMap Demo Song';
}

/**
 * Get the recommended practice section (the one with lowest confidence)
 */
export function getRecommendedPracticeSection(song: Song): Section | null {
  if (!song.sections.length) return null;
  return [...song.sections].sort((a, b) => a.confidence - b.confidence)[0];
}
