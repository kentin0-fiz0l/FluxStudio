import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CollaboratorRole = 'VIEWER' | 'EDITOR' | 'ADMIN';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/songs/[id]/collaborators - List all collaborators for a song
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user owns the song or is a collaborator
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        deletedAt: null,
        OR: [
          { userId: session.user.id },
          {
            collaborators: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Only owner and admins can view collaborators
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

    const collaborators = await prisma.songCollaborator.findMany({
      where: { songId },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      collaborators: collaborators.map((c: typeof collaborators[number]) => ({
        id: c.id,
        userId: c.userId,
        role: c.role,
        createdAt: c.createdAt.toISOString(),
        user: {
          id: c.user.id,
          name: c.user.name,
          email: c.user.email,
          image: c.user.image,
        },
      })),
    });
  } catch (error) {
    console.error('Failed to fetch collaborators:', error);
    return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
  }
}

/**
 * POST /api/songs/[id]/collaborators - Add a collaborator by email
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, role = 'VIEWER' } = body as { email: string; role?: CollaboratorRole };

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate role
    if (!['VIEWER', 'EDITOR', 'ADMIN'].includes(role)) {
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
        return NextResponse.json({ error: 'Only owners and admins can add collaborators' }, { status: 403 });
      }
    }

    // Find the user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!userToAdd) {
      return NextResponse.json({ error: 'User not found. They must create an account first.' }, { status: 404 });
    }

    // Can't add owner as collaborator
    if (userToAdd.id === song.userId) {
      return NextResponse.json({ error: 'Cannot add the owner as a collaborator' }, { status: 400 });
    }

    // Check if already a collaborator
    const existingCollaborator = await prisma.songCollaborator.findUnique({
      where: {
        songId_userId: {
          songId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingCollaborator) {
      return NextResponse.json({ error: 'User is already a collaborator' }, { status: 400 });
    }

    // Add the collaborator
    const collaborator = await prisma.songCollaborator.create({
      data: {
        songId,
        userId: userToAdd.id,
        role,
        invitedBy: session.user.id,
      },
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

    // Update song visibility to SHARED if it was PRIVATE
    if (song.visibility === 'PRIVATE') {
      await prisma.song.update({
        where: { id: songId },
        data: { visibility: 'SHARED' },
      });
    }

    return NextResponse.json({
      collaborator: {
        id: collaborator.id,
        userId: collaborator.userId,
        role: collaborator.role,
        createdAt: collaborator.createdAt.toISOString(),
        user: {
          id: collaborator.user.id,
          name: collaborator.user.name,
          email: collaborator.user.email,
          image: collaborator.user.image,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to add collaborator:', error);
    return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 });
  }
}
