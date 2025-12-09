import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/user/profile/avatar - Upload profile picture
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${session.user.id}-${Date.now()}.${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Get buffer from file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // URL for the uploaded image
    const imageUrl = `/uploads/avatars/${filename}`;

    // Get current user to delete old avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    // Delete old avatar if it exists and is a local file
    if (currentUser?.image?.startsWith('/uploads/avatars/')) {
      const oldFilePath = path.join(process.cwd(), 'public', currentUser.image);
      if (existsSync(oldFilePath)) {
        await unlink(oldFilePath).catch(() => {
          // Ignore errors when deleting old file
        });
      }
    }

    // Update user's image in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile/avatar - Remove profile picture
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    // Delete local avatar file if exists
    if (currentUser?.image?.startsWith('/uploads/avatars/')) {
      const filePath = path.join(process.cwd(), 'public', currentUser.image);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {
          // Ignore errors when deleting
        });
      }
    }

    // Clear image in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      message: 'Avatar removed successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Failed to remove avatar:', error);
    return NextResponse.json(
      { error: 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}
