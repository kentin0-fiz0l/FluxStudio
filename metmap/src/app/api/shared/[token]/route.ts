import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/shared/[token] - Get a shared song by token (public endpoint)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    // Find the share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        song: {
          include: {
            sections: {
              where: { deletedAt: null },
              orderBy: { startTime: 'asc' },
            },
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if link has expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Check if song still exists
    if (!shareLink.song || shareLink.song.deletedAt) {
      return NextResponse.json({ error: 'Song no longer exists' }, { status: 404 });
    }

    const song = shareLink.song;

    // Get current user session (optional - for checking if they can edit)
    const session = await getServerSession(authOptions);
    const isOwner = session?.user?.id === song.userId;

    // Check if user is a collaborator
    let collaboratorRole = null;
    if (session?.user?.id && !isOwner) {
      const collaborator = await prisma.songCollaborator.findUnique({
        where: {
          songId_userId: {
            songId: song.id,
            userId: session.user.id,
          },
        },
      });
      collaboratorRole = collaborator?.role || null;
    }

    // Transform to shared format (excludes private data like confidence, practice counts)
    const sharedSong = {
      id: song.id,
      title: song.title,
      artist: song.artist || '',
      album: song.album || undefined,
      duration: song.duration || 0,
      bpm: song.bpm || undefined,
      key: song.key || undefined,
      timeSignature: song.timeSignature || '4/4',
      // Don't include personal notes in shared view
      tags: song.tags,
      createdAt: song.createdAt.toISOString(),
      owner: {
        name: song.user.name || 'Anonymous',
        image: song.user.image,
      },
      sections: song.sections.map((section: typeof song.sections[number]) => ({
        id: section.id,
        name: section.name,
        type: section.type,
        startTime: section.startTime,
        endTime: section.endTime,
        // Don't include confidence, practice count, or notes in shared view
        color: section.color || undefined,
      })),
      // Access info
      isOwner,
      canEdit: isOwner || collaboratorRole === 'EDITOR' || collaboratorRole === 'ADMIN',
      collaboratorRole,
    };

    return NextResponse.json(sharedSong);
  } catch (error) {
    console.error('Failed to fetch shared song:', error);
    return NextResponse.json({ error: 'Failed to fetch shared song' }, { status: 500 });
  }
}

/**
 * POST /api/shared/[token]/copy - Copy a shared song to user's library
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { token } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to copy songs' }, { status: 401 });
  }

  try {
    // Find the share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        song: {
          include: {
            sections: {
              where: { deletedAt: null },
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if link has expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Check if song still exists
    if (!shareLink.song || shareLink.song.deletedAt) {
      return NextResponse.json({ error: 'Song no longer exists' }, { status: 404 });
    }

    const originalSong = shareLink.song;

    // Don't copy if user already owns the song
    if (originalSong.userId === session.user.id) {
      return NextResponse.json({ error: 'You already own this song' }, { status: 400 });
    }

    // Create a copy of the song
    const copiedSong = await prisma.song.create({
      data: {
        userId: session.user.id,
        title: originalSong.title,
        artist: originalSong.artist,
        album: originalSong.album,
        duration: originalSong.duration,
        bpm: originalSong.bpm,
        key: originalSong.key,
        timeSignature: originalSong.timeSignature,
        tags: originalSong.tags,
        visibility: 'PRIVATE',
        sections: {
          create: originalSong.sections.map((section: typeof originalSong.sections[number], index: number) => ({
            userId: session.user.id,
            name: section.name,
            type: section.type,
            startTime: section.startTime,
            endTime: section.endTime,
            color: section.color,
            confidence: 3, // Reset confidence for new owner
            sortOrder: index,
          })),
        },
      },
      include: {
        sections: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      songId: copiedSong.id,
      message: 'Song copied to your library',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to copy shared song:', error);
    return NextResponse.json({ error: 'Failed to copy song' }, { status: 500 });
  }
}
