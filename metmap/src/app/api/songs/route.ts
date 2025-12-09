import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/songs - Get all songs for the authenticated user
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

    // Transform to match client-side format
    const transformedSongs = songs.map((song) => ({
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
      lastPracticed: undefined, // Will be computed from sessions
      totalPracticeSessions: 0, // Will be computed from sessions
      sections: song.sections.map((section) => ({
        id: section.id,
        name: section.name,
        type: section.type as 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'solo' | 'breakdown' | 'outro' | 'custom',
        startTime: section.startTime,
        endTime: section.endTime,
        notes: section.notes || undefined,
        confidence: section.confidence as 1 | 2 | 3 | 4 | 5,
        practiceCount: 0, // Will be computed from sessions
        lastPracticed: undefined,
        color: section.color || undefined,
      })),
    }));

    return NextResponse.json(transformedSongs);
  } catch (error) {
    console.error('Failed to fetch songs:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}

/**
 * POST /api/songs - Create a new song
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, artist, album, duration, bpm, key, timeSignature, notes, tags, sections } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const song = await prisma.song.create({
      data: {
        userId: session.user.id,
        title,
        artist: artist || null,
        album: album || null,
        duration: duration || null,
        bpm: bpm || null,
        key: key || null,
        timeSignature: timeSignature || '4/4',
        notes: notes || null,
        tags: tags || [],
        sections: sections?.length
          ? {
              create: sections.map((s: {
                name: string;
                type?: string;
                startTime: number;
                endTime: number;
                notes?: string;
                confidence?: number;
                color?: string;
                sortOrder?: number;
              }, index: number) => ({
                userId: session.user.id,
                name: s.name,
                type: s.type || 'custom',
                startTime: s.startTime,
                endTime: s.endTime,
                notes: s.notes || null,
                confidence: s.confidence || 3,
                color: s.color || null,
                sortOrder: s.sortOrder ?? index,
              })),
            }
          : undefined,
      },
      include: {
        sections: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    // Transform to match client-side format
    const transformedSong = {
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
      totalPracticeSessions: 0,
      sections: song.sections.map((section) => ({
        id: section.id,
        name: section.name,
        type: section.type as 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'solo' | 'breakdown' | 'outro' | 'custom',
        startTime: section.startTime,
        endTime: section.endTime,
        notes: section.notes || undefined,
        confidence: section.confidence as 1 | 2 | 3 | 4 | 5,
        practiceCount: 0,
        lastPracticed: undefined,
        color: section.color || undefined,
      })),
    };

    return NextResponse.json(transformedSong, { status: 201 });
  } catch (error) {
    console.error('Failed to create song:', error);
    return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
  }
}
