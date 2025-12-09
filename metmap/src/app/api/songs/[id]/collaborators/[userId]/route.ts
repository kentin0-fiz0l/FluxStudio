import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CollaboratorRole } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PATCH /api/songs/[id]/collaborators/[userId] - Update a collaborator's role
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId, userId: collaboratorUserId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { role } = body as { role: CollaboratorRole };

    // Validate role
    if (!role || !['VIEWER', 'EDITOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user owns the song or is an admin collaborator
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        deletedAt: null,
      },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const isOwner = song.userId === session.user.id;
    if (!isOwner) {
      const userRole = await prisma.songCollaborator.findUnique({
        where: {
          songId_userId: {
            songId,
            userId: session.user.id,
          },
        },
      });
      if (userRole?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only owners and admins can manage collaborators' }, { status: 403 });
      }
    }

    // Find the collaborator
    const collaborator = await prisma.songCollaborator.findUnique({
      where: {
        songId_userId: {
          songId,
          userId: collaboratorUserId,
        },
      },
    });

    if (!collaborator) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    // Update the role
    const updatedCollaborator = await prisma.songCollaborator.update({
      where: { id: collaborator.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      collaborator: {
        id: updatedCollaborator.id,
        userId: updatedCollaborator.userId,
        role: updatedCollaborator.role,
        createdAt: updatedCollaborator.createdAt.toISOString(),
        user: {
          id: updatedCollaborator.user.id,
          name: updatedCollaborator.user.name,
          email: updatedCollaborator.user.email,
          image: updatedCollaborator.user.image,
        },
      },
    });
  } catch (error) {
    console.error('Failed to update collaborator:', error);
    return NextResponse.json({ error: 'Failed to update collaborator' }, { status: 500 });
  }
}

/**
 * DELETE /api/songs/[id]/collaborators/[userId] - Remove a collaborator
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId, userId: collaboratorUserId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user owns the song or is an admin collaborator, or is removing themselves
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        deletedAt: null,
      },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const isOwner = song.userId === session.user.id;
    const isRemovingSelf = collaboratorUserId === session.user.id;

    if (!isOwner && !isRemovingSelf) {
      const userRole = await prisma.songCollaborator.findUnique({
        where: {
          songId_userId: {
            songId,
            userId: session.user.id,
          },
        },
      });
      if (userRole?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only owners and admins can remove collaborators' }, { status: 403 });
      }
    }

    // Find the collaborator
    const collaborator = await prisma.songCollaborator.findUnique({
      where: {
        songId_userId: {
          songId,
          userId: collaboratorUserId,
        },
      },
    });

    if (!collaborator) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    // Delete the collaborator
    await prisma.songCollaborator.delete({
      where: { id: collaborator.id },
    });

    // Check if there are any remaining collaborators
    const remainingCollaborators = await prisma.songCollaborator.count({
      where: { songId },
    });

    // If no collaborators remain and no share links, set visibility back to PRIVATE
    if (remainingCollaborators === 0) {
      const shareLinksCount = await prisma.shareLink.count({
        where: { songId },
      });
      if (shareLinksCount === 0) {
        await prisma.song.update({
          where: { id: songId },
          data: { visibility: 'PRIVATE' },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove collaborator:', error);
    return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
  }
}
