import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET user's camera permissions
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;

    const permissions = await prisma.userCameraPermission.findMany({
      where: { userId: id },
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
      },
    });

    return NextResponse.json(permissions);
  } catch (error: any) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// POST grant camera permission to user
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: userId } = params;
    const body = await req.json();
    const { cameraId } = body;

    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existing = await prisma.userCameraPermission.findFirst({
      where: { userId, cameraId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Permission already exists' },
        { status: 400 }
      );
    }

    const permission = await prisma.userCameraPermission.create({
      data: {
        userId,
        cameraId,
      },
      include: {
        camera: true,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error: any) {
    console.error('Grant permission error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to grant permission' },
      { status: 500 }
    );
  }
}

// DELETE revoke camera permission
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: userId } = params;
    const { searchParams } = new URL(req.url);
    const cameraId = searchParams.get('cameraId');

    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    await prisma.userCameraPermission.deleteMany({
      where: {
        userId,
        cameraId,
      },
    });

    return NextResponse.json({ message: 'Permission revoked successfully' });
  } catch (error: any) {
    console.error('Revoke permission error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke permission' },
      { status: 500 }
    );
  }
}
