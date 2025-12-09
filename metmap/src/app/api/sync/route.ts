import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface LocalStorageSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bpm?: number;
  key?: string;
  timeSignature?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastPracticed?: string;
  totalPracticeSessions: number;
  sections: Array<{
    id: string;
    name: string;
    type: string;
    startTime: number;
    endTime: number;
    notes?: string;
    confidence: number;
    practiceCount: number;
    lastPracticed?: string;
    color?: string;
  }>;
}

interface LocalStorageSession {
  id: string;
  songId: string;
  startedAt: string;
  endedAt?: string;
  duration: number;
  sectionsPracticed: string[];
  notes?: string;
  rating?: number;
}

interface SyncRequest {
  songs?: LocalStorageSong[];
  sessions?: LocalStorageSession[];
  lastSyncedAt?: string;
}

/**
 * POST /api/sync - Sync localStorage data to the database
 *
 * This endpoint handles bidirectional sync between localStorage and the database.
 * It uploads local data and returns the merged result.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: SyncRequest = await request.json();
    const { songs: localSongs = [], sessions: localSessions = [] } = body;

    // Map to track local ID -> database ID for songs
    const songIdMap = new Map<string, string>();

    // Process songs
    for (const localSong of localSongs) {
      // Check if this song already exists (by matching title + artist for the user)
      const existingSong = await prisma.song.findFirst({
        where: {
          userId: session.user.id,
          title: localSong.title,
          artist: localSong.artist || null,
          deletedAt: null,
        },
      });

      if (existingSong) {
        // Update existing song if local version is newer
        const localUpdatedAt = new Date(localSong.updatedAt);
        if (localUpdatedAt > existingSong.updatedAt) {
          await prisma.song.update({
            where: { id: existingSong.id },
            data: {
              album: localSong.album || null,
              duration: localSong.duration || null,
              bpm: localSong.bpm || null,
              key: localSong.key || null,
              timeSignature: localSong.timeSignature || '4/4',
              notes: localSong.notes || null,
              tags: localSong.tags || [],
              updatedAt: localUpdatedAt,
            },
          });
        }
        songIdMap.set(localSong.id, existingSong.id);

        // Sync sections for existing song
        for (const localSection of localSong.sections) {
          // Try to find matching section by name and time range
          const existingSection = await prisma.section.findFirst({
            where: {
              songId: existingSong.id,
              name: localSection.name,
              deletedAt: null,
            },
          });

          if (existingSection) {
            // Update if confidence changed
            if (localSection.confidence !== existingSection.confidence) {
              await prisma.section.update({
                where: { id: existingSection.id },
                data: {
                  confidence: localSection.confidence,
                  startTime: localSection.startTime,
                  endTime: localSection.endTime,
                  notes: localSection.notes || null,
                  color: localSection.color || null,
                },
              });
            }
          } else {
            // Create new section
            await prisma.section.create({
              data: {
                songId: existingSong.id,
                userId: session.user.id,
                name: localSection.name,
                type: localSection.type || 'custom',
                startTime: localSection.startTime,
                endTime: localSection.endTime,
                notes: localSection.notes || null,
                confidence: localSection.confidence || 3,
                color: localSection.color || null,
              },
            });
          }
        }
      } else {
        // Create new song
        const newSong = await prisma.song.create({
          data: {
            userId: session.user.id,
            title: localSong.title,
            artist: localSong.artist || null,
            album: localSong.album || null,
            duration: localSong.duration || null,
            bpm: localSong.bpm || null,
            key: localSong.key || null,
            timeSignature: localSong.timeSignature || '4/4',
            notes: localSong.notes || null,
            tags: localSong.tags || [],
            createdAt: new Date(localSong.createdAt),
            updatedAt: new Date(localSong.updatedAt),
            sections: {
              create: localSong.sections.map((s, index) => ({
                userId: session.user.id,
                name: s.name,
                type: s.type || 'custom',
                startTime: s.startTime,
                endTime: s.endTime,
                notes: s.notes || null,
                confidence: s.confidence || 3,
                color: s.color || null,
                sortOrder: index,
              })),
            },
          },
        });
        songIdMap.set(localSong.id, newSong.id);
      }
    }

    // Process practice sessions
    for (const localSession of localSessions) {
      // Map the songId to the database ID
      const dbSongId = songIdMap.get(localSession.songId);
      if (!dbSongId) {
        // Try to find the song by the original ID (if it was already synced)
        const existingSong = await prisma.song.findFirst({
          where: {
            userId: session.user.id,
            deletedAt: null,
          },
        });
        if (!existingSong) continue;
      }

      const songId = dbSongId || localSession.songId;

      // Check if this session already exists (by matching startedAt)
      const existingSessionRecord = await prisma.practiceSession.findFirst({
        where: {
          userId: session.user.id,
          songId,
          startedAt: new Date(localSession.startedAt),
        },
      });

      if (!existingSessionRecord) {
        // Create new practice session
        await prisma.practiceSession.create({
          data: {
            songId,
            userId: session.user.id,
            startedAt: new Date(localSession.startedAt),
            endedAt: localSession.endedAt ? new Date(localSession.endedAt) : null,
            duration: localSession.duration || null,
            sectionsPracticed: localSession.sectionsPracticed || [],
            notes: localSession.notes || null,
            rating: localSession.rating || null,
          },
        });
      }
    }

    // Fetch all data to return to client
    const dbSongs = await prisma.song.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const dbSessions = await prisma.practiceSession.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { startedAt: 'desc' },
    });

    // Transform to match client-side format
    const transformedSongs = dbSongs.map((song: typeof dbSongs[number]) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || '',
      album: song.album || undefined,
      duration: song.duration || 0,
      bpm: song.bpm || undefined,
      key: song.key || undefined,
      timeSignature: song.timeSignature || '4/4',
      notes: song.notes || undefined,
      tags: song.tags,
      createdAt: song.createdAt.toISOString(),
      updatedAt: song.updatedAt.toISOString(),
      lastPracticed: undefined,
      totalPracticeSessions: dbSessions.filter((s: typeof dbSessions[number]) => s.songId === song.id).length,
      sections: song.sections.map((section: typeof song.sections[number]) => ({
        id: section.id,
        name: section.name,
        type: section.type,
        startTime: section.startTime,
        endTime: section.endTime,
        notes: section.notes || undefined,
        confidence: section.confidence,
        practiceCount: 0,
        lastPracticed: undefined,
        color: section.color || undefined,
      })),
    }));

    const transformedSessions = dbSessions.map((s: typeof dbSessions[number]) => ({
      id: s.id,
      songId: s.songId,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString(),
      duration: s.duration || 0,
      sectionsPracticed: s.sectionsPracticed,
      notes: s.notes || undefined,
      rating: s.rating || undefined,
    }));

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      data: {
        songs: transformedSongs,
        sessions: transformedSessions,
      },
    });
  } catch (error) {
    console.error('Failed to sync data:', error);
    return NextResponse.json({ error: 'Failed to sync data' }, { status: 500 });
  }
}

/**
 * GET /api/sync - Get the current sync status and all user data
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const songs = await prisma.song.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const sessions = await prisma.practiceSession.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { startedAt: 'desc' },
    });

    // Transform to match client-side format
    const transformedSongs = songs.map((song: typeof songs[number]) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || '',
      album: song.album || undefined,
      duration: song.duration || 0,
      bpm: song.bpm || undefined,
      key: song.key || undefined,
      timeSignature: song.timeSignature || '4/4',
      notes: song.notes || undefined,
      tags: song.tags,
      createdAt: song.createdAt.toISOString(),
      updatedAt: song.updatedAt.toISOString(),
      lastPracticed: undefined,
      totalPracticeSessions: sessions.filter((s: typeof sessions[number]) => s.songId === song.id).length,
      sections: song.sections.map((section: typeof song.sections[number]) => ({
        id: section.id,
        name: section.name,
        type: section.type,
        startTime: section.startTime,
        endTime: section.endTime,
        notes: section.notes || undefined,
        confidence: section.confidence,
        practiceCount: 0,
        lastPracticed: undefined,
        color: section.color || undefined,
      })),
    }));

    const transformedSessions = sessions.map((s: typeof sessions[number]) => ({
      id: s.id,
      songId: s.songId,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString(),
      duration: s.duration || 0,
      sectionsPracticed: s.sectionsPracticed,
      notes: s.notes || undefined,
      rating: s.rating || undefined,
    }));

    return NextResponse.json({
      data: {
        songs: transformedSongs,
        sessions: transformedSessions,
      },
    });
  } catch (error) {
    console.error('Failed to fetch sync data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
