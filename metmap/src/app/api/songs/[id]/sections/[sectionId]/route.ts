import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
}

/**
 * PUT /api/songs/[id]/sections/[sectionId] - Update a section
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId, sectionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the section belongs to the user
    const existingSection = await prisma.section.findFirst({
      where: {
        id: sectionId,
        songId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, startTime, endTime, notes, confidence, color, sortOrder } = body;

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: {
        name: name ?? existingSection.name,
        type: type ?? existingSection.type,
        startTime: startTime ?? existingSection.startTime,
        endTime: endTime ?? existingSection.endTime,
        notes: notes !== undefined ? (notes || null) : existingSection.notes,
        confidence: confidence ?? existingSection.confidence,
        color: color !== undefined ? (color || null) : existingSection.color,
        sortOrder: sortOrder ?? existingSection.sortOrder,
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

    return NextResponse.json(transformedSection);
  } catch (error) {
    console.error('Failed to update section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

/**
 * DELETE /api/songs/[id]/sections/[sectionId] - Soft delete a section
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { id: songId, sectionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the section belongs to the user
    const existingSection = await prisma.section.findFirst({
      where: {
        id: sectionId,
        songId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Soft delete the section
    await prisma.section.update({
      where: { id: sectionId },
      data: { deletedAt: new Date() },
    });

    // Update the song's updatedAt timestamp
    await prisma.song.update({
      where: { id: songId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
