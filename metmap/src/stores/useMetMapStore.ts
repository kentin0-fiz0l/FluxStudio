'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Song,
  Section,
  TempoEvent,
  TimeSignature,
  PracticeSession,
  MetMapPreferences,
  MetMapState,
  DEFAULT_PREFERENCES,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_BPM,
  generateId,
  createSong,
  createSection,
  createTempoEvent,
} from '@/types/metmap';

/**
 * MetMap Store Actions
 */
interface MetMapActions {
  // Song actions
  addSong: (song: Partial<Song> & Pick<Song, 'title' | 'artist'>) => Song;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  getSong: (id: string) => Song | undefined;

  // Section actions
  addSection: (
    songId: string,
    section: Partial<Section> & Pick<Section, 'name' | 'startTime' | 'endTime'>
  ) => Section | undefined;
  updateSection: (songId: string, sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (songId: string, sectionId: string) => void;
  reorderSections: (songId: string, sectionIds: string[]) => void;

  // Tempo event actions
  addTempoEvent: (
    songId: string,
    event: Partial<TempoEvent> & Pick<TempoEvent, 'time' | 'bpm'>
  ) => TempoEvent | undefined;
  updateTempoEvent: (songId: string, eventId: string, updates: Partial<TempoEvent>) => void;
  deleteTempoEvent: (songId: string, eventId: string) => void;
  updateSongTempo: (songId: string, bpm: number, timeSignature?: TimeSignature) => void;

  // Practice actions
  startPracticeSession: (songId: string) => PracticeSession;
  endPracticeSession: (sessionId: string, notes?: string, rating?: 1 | 2 | 3 | 4 | 5) => void;
  recordSectionPractice: (sessionId: string, sectionId: string) => void;
  updateSectionConfidence: (songId: string, sectionId: string, confidence: 1 | 2 | 3 | 4 | 5) => void;

  // Preferences
  updatePreferences: (updates: Partial<MetMapPreferences>) => void;

  // Utility
  importSong: (songData: Song) => void;
  exportSong: (songId: string) => Song | undefined;
  clearAllData: () => void;
}

type MetMapStore = MetMapState & MetMapActions;

/**
 * Main MetMap store with localStorage persistence.
 * All data is automatically saved to localStorage and synced across tabs.
 */
export const useMetMapStore = create<MetMapStore>()(
  persist(
    (set, get) => ({
      // Initial state
      songs: [],
      sessions: [],
      preferences: DEFAULT_PREFERENCES,

      // Song actions
      addSong: (partial) => {
        const song = createSong(partial);
        set((state) => ({
          songs: [...state.songs, song],
        }));
        return song;
      },

      updateSong: (id, updates) => {
        set((state) => ({
          songs: state.songs.map((song) =>
            song.id === id
              ? { ...song, ...updates, updatedAt: new Date().toISOString() }
              : song
          ),
        }));
      },

      deleteSong: (id) => {
        set((state) => ({
          songs: state.songs.filter((song) => song.id !== id),
          // Also delete associated practice sessions
          sessions: state.sessions.filter((session) => session.songId !== id),
        }));
      },

      getSong: (id) => {
        return get().songs.find((song) => song.id === id);
      },

      // Section actions
      addSection: (songId, partial) => {
        const section = createSection(partial);
        let addedSection: Section | undefined;

        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              addedSection = section;
              // Insert section in order by startTime
              const sections = [...song.sections, section].sort(
                (a, b) => a.startTime - b.startTime
              );
              return {
                ...song,
                sections,
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));

        return addedSection;
      },

      updateSection: (songId, sectionId, updates) => {
        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              return {
                ...song,
                sections: song.sections.map((section) =>
                  section.id === sectionId ? { ...section, ...updates } : section
                ),
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));
      },

      deleteSection: (songId, sectionId) => {
        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              return {
                ...song,
                sections: song.sections.filter((s) => s.id !== sectionId),
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));
      },

      reorderSections: (songId, sectionIds) => {
        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              const sectionMap = new Map(song.sections.map((s) => [s.id, s]));
              const reordered = sectionIds
                .map((id) => sectionMap.get(id))
                .filter((s): s is Section => s !== undefined);
              return {
                ...song,
                sections: reordered,
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));
      },

      // Tempo event actions
      addTempoEvent: (songId, partial) => {
        const event = createTempoEvent(partial);
        let addedEvent: TempoEvent | undefined;

        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              addedEvent = event;
              // Insert event in order by time
              const tempoEvents = [...(song.tempoEvents || []), event].sort(
                (a, b) => a.time - b.time
              );
              return {
                ...song,
                tempoEvents,
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));

        return addedEvent;
      },

      updateTempoEvent: (songId, eventId, updates) => {
        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              const tempoEvents = (song.tempoEvents || [])
                .map((event) =>
                  event.id === eventId ? { ...event, ...updates } : event
                )
                .sort((a, b) => a.time - b.time);
              return {
                ...song,
                tempoEvents,
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));
      },

      deleteTempoEvent: (songId, eventId) => {
        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              return {
                ...song,
                tempoEvents: (song.tempoEvents || []).filter((e) => e.id !== eventId),
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));
      },

      updateSongTempo: (songId, bpm, timeSignature) => {
        set((state) => ({
          songs: state.songs.map((song) => {
            if (song.id === songId) {
              return {
                ...song,
                bpm,
                ...(timeSignature && { defaultTimeSignature: timeSignature }),
                updatedAt: new Date().toISOString(),
              };
            }
            return song;
          }),
        }));
      },

      // Practice actions
      startPracticeSession: (songId) => {
        const session: PracticeSession = {
          id: generateId(),
          songId,
          startedAt: new Date().toISOString(),
          duration: 0,
          sectionsPracticed: [],
        };

        set((state) => ({
          sessions: [...state.sessions, session],
        }));

        return session;
      },

      endPracticeSession: (sessionId, notes, rating) => {
        const now = new Date();

        set((state) => {
          const session = state.sessions.find((s) => s.id === sessionId);
          if (!session) return state;

          const startedAt = new Date(session.startedAt);
          const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

          return {
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    endedAt: now.toISOString(),
                    duration,
                    notes: notes ?? s.notes,
                    rating: rating ?? s.rating,
                  }
                : s
            ),
            // Update song's lastPracticed and totalPracticeSessions
            songs: state.songs.map((song) =>
              song.id === session.songId
                ? {
                    ...song,
                    lastPracticed: now.toISOString(),
                    totalPracticeSessions: song.totalPracticeSessions + 1,
                    updatedAt: now.toISOString(),
                  }
                : song
            ),
          };
        });
      },

      recordSectionPractice: (sessionId, sectionId) => {
        const now = new Date().toISOString();

        set((state) => {
          const session = state.sessions.find((s) => s.id === sessionId);
          if (!session) return state;

          return {
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    sectionsPracticed: [...new Set([...s.sectionsPracticed, sectionId])],
                  }
                : s
            ),
            // Update section's practiceCount and lastPracticed
            songs: state.songs.map((song) =>
              song.id === session.songId
                ? {
                    ...song,
                    sections: song.sections.map((section) =>
                      section.id === sectionId
                        ? {
                            ...section,
                            practiceCount: section.practiceCount + 1,
                            lastPracticed: now,
                          }
                        : section
                    ),
                  }
                : song
            ),
          };
        });
      },

      updateSectionConfidence: (songId, sectionId, confidence) => {
        set((state) => ({
          songs: state.songs.map((song) =>
            song.id === songId
              ? {
                  ...song,
                  sections: song.sections.map((section) =>
                    section.id === sectionId ? { ...section, confidence } : section
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : song
          ),
        }));
      },

      // Preferences
      updatePreferences: (updates) => {
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        }));
      },

      // Utility
      importSong: (songData) => {
        // Generate new IDs to avoid collisions
        const newSong: Song = {
          ...songData,
          id: generateId(),
          sections: songData.sections.map((s) => ({
            ...s,
            id: generateId(),
          })),
          tempoEvents: (songData.tempoEvents || []).map((e) => ({
            ...e,
            id: generateId(),
          })),
          defaultTimeSignature: songData.defaultTimeSignature || DEFAULT_TIME_SIGNATURE,
          bpm: songData.bpm || DEFAULT_BPM,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          songs: [...state.songs, newSong],
        }));
      },

      exportSong: (songId) => {
        return get().songs.find((song) => song.id === songId);
      },

      clearAllData: () => {
        set({
          songs: [],
          sessions: [],
          preferences: DEFAULT_PREFERENCES,
        });
      },
    }),
    {
      name: 'metmap-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Handle migrations between versions
      migrate: (persistedState, version) => {
        const state = persistedState as MetMapState;

        if (version === 0) {
          // Migration from version 0 to 1: add preferences
          return {
            ...state,
            preferences: {
              ...DEFAULT_PREFERENCES,
              ...(state?.preferences ?? {}),
            },
          };
        }

        if (version === 1) {
          // Migration from version 1 to 2: add tempo events to songs
          return {
            ...state,
            songs: (state.songs || []).map((song) => ({
              ...song,
              tempoEvents: song.tempoEvents || [],
              defaultTimeSignature: song.defaultTimeSignature || DEFAULT_TIME_SIGNATURE,
              bpm: song.bpm || DEFAULT_BPM,
            })),
          };
        }

        return persistedState as MetMapStore;
      },
    }
  )
);

/**
 * Hook to get songs sorted by last practiced (most recent first)
 */
export function useSongsByLastPracticed() {
  return useMetMapStore((state) =>
    [...state.songs].sort((a, b) => {
      if (!a.lastPracticed && !b.lastPracticed) return 0;
      if (!a.lastPracticed) return 1;
      if (!b.lastPracticed) return -1;
      return new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime();
    })
  );
}

/**
 * Hook to get songs sorted by creation date (newest first)
 */
export function useSongsByCreated() {
  return useMetMapStore((state) =>
    [...state.songs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
}

/**
 * Hook to get practice statistics for a song
 */
export function useSongStats(songId: string) {
  return useMetMapStore((state) => {
    const song = state.songs.find((s) => s.id === songId);
    const sessions = state.sessions.filter((s) => s.songId === songId);

    if (!song) return null;

    const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const avgConfidence =
      song.sections.length > 0
        ? song.sections.reduce((sum, s) => sum + s.confidence, 0) / song.sections.length
        : 0;
    const weakestSections = [...song.sections]
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 3);

    return {
      totalSessions: sessions.length,
      totalPracticeTime,
      avgConfidence,
      weakestSections,
      lastPracticed: song.lastPracticed,
    };
  });
}
