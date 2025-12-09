import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/sessions/[id] - Update a practice session (e.g., end it)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the session belongs to the user
    const existingSession = await prisma.practiceSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const { endedAt, duration, sectionsPracticed, notes, rating } = body;

    const practiceSession = await prisma.practiceSession.update({
      where: { id },
      data: {
        endedAt: endedAt ? new Date(endedAt) : existingSession.endedAt,
        duration: duration ?? existingSession.duration,
        sectionsPracticed: sectionsPracticed ?? existingSession.sectionsPracticed,
        notes: notes !== undefined ? (notes || null) : existingSession.notes,
        rating: rating ?? existingSession.rating,
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

    return NextResponse.json(transformedSession);
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id] - Delete a practice session
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the session belongs to the user
    const existingSession = await prisma.practiceSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete the session
    await prisma.practiceSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
