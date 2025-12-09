import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/songs/[id] - Get a single song by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const song = await prisma.song.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

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
    };

    return NextResponse.json(transformedSong);
  } catch (error) {
    console.error('Failed to fetch song:', error);
    return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 });
  }
}

/**
 * PUT /api/songs/[id] - Update a song
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First verify the song belongs to the user
    const existingSong = await prisma.song.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!existingSong) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, artist, album, duration, bpm, key, timeSignature, notes, tags } = body;

    const song = await prisma.song.update({
      where: { id },
      data: {
        title: title ?? existingSong.title,
        artist: artist !== undefined ? (artist || null) : existingSong.artist,
        album: album !== undefined ? (album || null) : existingSong.album,
        duration: duration !== undefined ? duration : existingSong.duration,
        bpm: bpm !== undefined ? (bpm || null) : existingSong.bpm,
        key: key !== undefined ? (key || null) : existingSong.key,
        timeSignature: timeSignature ?? existingSong.timeSignature,
        notes: notes !== undefined ? (notes || null) : existingSong.notes,
        tags: tags ?? existingSong.tags,
      },
      include: {
        sections: {
          where: { deletedAt: null },
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
    };

    return NextResponse.json(transformedSong);
  } catch (error) {
    console.error('Failed to update song:', error);
    return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
  }
}

/**
 * DELETE /api/songs/[id] - Soft delete a song
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the song belongs to the user
    const existingSong = await prisma.song.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!existingSong) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Soft delete the song and its sections
    const now = new Date();
    await prisma.$transaction([
      prisma.song.update({
        where: { id },
        data: { deletedAt: now },
      }),
      prisma.section.updateMany({
        where: { songId: id },
        data: { deletedAt: now },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete song:', error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }
}
