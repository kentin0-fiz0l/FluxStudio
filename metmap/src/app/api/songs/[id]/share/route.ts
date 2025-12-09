import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/songs/[id]/share - Get all share links for a song
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    const shareLinks = await prisma.shareLink.findMany({
      where: { songId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(shareLinks);
  } catch (error) {
    console.error('Failed to fetch share links:', error);
    return NextResponse.json({ error: 'Failed to fetch share links' }, { status: 500 });
  }
}

/**
 * POST /api/songs/[id]/share - Create a new share link
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    const body = await request.json().catch(() => ({}));
    const { expiresInDays } = body;

    // Generate a unique token
    const token = randomBytes(16).toString('hex');

    // Calculate expiration if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create the share link
    const shareLink = await prisma.shareLink.create({
      data: {
        songId,
        token,
        expiresAt,
        createdBy: session.user.id,
      },
    });

    // Update song visibility to SHARED if it was PRIVATE
    if (song.visibility === 'PRIVATE') {
      await prisma.song.update({
        where: { id: songId },
        data: { visibility: 'SHARED' },
      });
    }

    return NextResponse.json({
      ...shareLink,
      shareUrl: `/shared/${token}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create share link:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}

/**
 * DELETE /api/songs/[id]/share - Delete all share links for a song
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    // Delete all share links
    await prisma.shareLink.deleteMany({
      where: { songId },
    });

    // Check if there are any collaborators
    const collaboratorCount = await prisma.songCollaborator.count({
      where: { songId },
    });

    // Set visibility back to PRIVATE if no collaborators
    if (collaboratorCount === 0) {
      await prisma.song.update({
        where: { id: songId },
        data: { visibility: 'PRIVATE' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete share links:', error);
    return NextResponse.json({ error: 'Failed to delete share links' }, { status: 500 });
  }
}
