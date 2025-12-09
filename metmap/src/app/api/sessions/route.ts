import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sessions - Get all practice sessions for the authenticated user
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    const sessions = await prisma.practiceSession.findMany({
      where: {
        userId: session.user.id,
        ...(songId ? { songId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            artist: true,
          },
        },
      },
    });

    // Transform to match client-side format
    const transformedSessions = sessions.map((s: typeof sessions[number]) => ({
      id: s.id,
      songId: s.songId,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString(),
      duration: s.duration || 0,
      sectionsPracticed: s.sectionsPracticed,
      notes: s.notes || undefined,
      rating: s.rating as 1 | 2 | 3 | 4 | 5 | undefined,
      song: {
        title: s.song.title,
        artist: s.song.artist || '',
      },
    }));

    return NextResponse.json(transformedSessions);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

/**
 * POST /api/sessions - Create a new practice session
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { songId, startedAt, endedAt, duration, sectionsPracticed, notes, rating } = body;

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    // Verify the song belongs to the user
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const practiceSession = await prisma.practiceSession.create({
      data: {
        songId,
        userId: session.user.id,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : null,
        duration: duration || null,
        sectionsPracticed: sectionsPracticed || [],
        notes: notes || null,
        rating: rating || null,
      },
    });

    // Transform to match client-side format
    const transformedSession = {
      id: practiceSession.id,
      songId: practiceSession.songId,
      startedAt: practiceSession.startedAt.toISOString(),
      endedAt: practiceSession.endedAt?.toISOString(),
      duration: practiceSession.duration || 0,
      sectionsPracticed: practiceSession.sectionsPracticed,
      notes: practiceSession.notes || undefined,
      rating: practiceSession.rating as 1 | 2 | 3 | 4 | 5 | undefined,
    };

    return NextResponse.json(transformedSession, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
