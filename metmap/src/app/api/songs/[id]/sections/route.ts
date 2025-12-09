import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/songs/[id]/sections - Get all sections for a song
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

    const sections = await prisma.section.findMany({
      where: {
        songId,
        deletedAt: null,
      },
      orderBy: { startTime: 'asc' },
    });

    // Transform to match client-side format
    const transformedSections = sections.map((section) => ({
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
    }));

    return NextResponse.json(transformedSections);
  } catch (error) {
    console.error('Failed to fetch sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

/**
 * POST /api/songs/[id]/sections - Create a new section
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

    const body = await request.json();
    const { name, type, startTime, endTime, notes, confidence, color, sortOrder } = body;

    if (!name || startTime === undefined || endTime === undefined) {
      return NextResponse.json(
        { error: 'Name, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Get the count of existing sections for sortOrder
    const existingSections = await prisma.section.count({
      where: { songId, deletedAt: null },
    });

    const section = await prisma.section.create({
      data: {
        songId,
        userId: session.user.id,
        name,
        type: type || 'custom',
        startTime,
        endTime,
        notes: notes || null,
        confidence: confidence || 3,
        color: color || null,
        sortOrder: sortOrder ?? existingSections,
      },
    });

    // Update the song's updatedAt timestamp
    await prisma.song.update({
      where: { id: songId },
      data: { updatedAt: new Date() },
    });

    // Transform to match client-side format
    const transformedSection = {
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
    };

    return NextResponse.json(transformedSection, { status: 201 });
  } catch (error) {
    console.error('Failed to create section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
