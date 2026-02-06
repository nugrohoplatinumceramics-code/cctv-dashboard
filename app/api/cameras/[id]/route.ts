import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireAdmin, checkCameraAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET single camera
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    const hasAccess = await checkCameraAccess((user as any).id, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const camera = await prisma.camera.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error('Get camera error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch camera' },
      { status: 500 }
    );
  }
}

// PUT update camera (admin only)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;
    const body = await req.json();
    const { name, rtspUrl, description, groupId, recordingEnabled, isActive, status } = body;

    const camera = await prisma.camera.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(rtspUrl && { rtspUrl }),
        ...(description !== undefined && { description }),
        ...(groupId !== undefined && { groupId: groupId || null }),
        ...(recordingEnabled !== undefined && { recordingEnabled }),
        ...(isActive !== undefined && { isActive }),
        ...(status && { status }),
      },
      include: { group: true },
    });

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error('Update camera error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update camera' },
      { status: 500 }
    );
  }
}

// DELETE camera (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;

    await prisma.camera.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Camera deleted successfully' });
  } catch (error: any) {
    console.error('Delete camera error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete camera' },
      { status: 500 }
    );
  }
}
