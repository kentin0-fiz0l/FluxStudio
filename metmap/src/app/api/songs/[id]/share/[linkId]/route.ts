import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; linkId: string }>;
}

/**
 * DELETE /api/songs/[id]/share/[linkId] - Delete a specific share link
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId, linkId } = await params;

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

    // Verify the share link exists and belongs to this song
    const shareLink = await prisma.shareLink.findFirst({
      where: {
        id: linkId,
        songId,
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Delete the share link
    await prisma.shareLink.delete({
      where: { id: linkId },
    });

    // Check if there are any remaining share links or collaborators
    const [remainingLinks, collaboratorCount] = await Promise.all([
      prisma.shareLink.count({ where: { songId } }),
      prisma.songCollaborator.count({ where: { songId } }),
    ]);

    // Set visibility back to PRIVATE if no links or collaborators
    if (remainingLinks === 0 && collaboratorCount === 0) {
      await prisma.song.update({
        where: { id: songId },
        data: { visibility: 'PRIVATE' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete share link:', error);
    return NextResponse.json({ error: 'Failed to delete share link' }, { status: 500 });
  }
}
