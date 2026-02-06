import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, checkCameraAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET all snapshots (filtered by user permissions)
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const cameraId = searchParams.get('cameraId');

    const userRole = (user as any)?.role;
    const userId = (user as any)?.id;

    let whereClause: any = {};

    if (userRole !== 'ADMIN') {
      const userCameras = await prisma.userCameraPermission.findMany({
        where: { userId },
        select: { cameraId: true },
      });
      const cameraIds = userCameras.map((p: any) => p.cameraId);
      whereClause.cameraId = { in: cameraIds };
    }

    if (cameraId) {
      whereClause.cameraId = cameraId;
      const hasAccess = await checkCameraAccess(userId, cameraId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const snapshots = await prisma.snapshot.findMany({
      where: whereClause,
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            group: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(snapshots);
  } catch (error: any) {
    console.error('Get snapshots error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

// POST capture new snapshot
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { cameraId } = body;

    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    const userId = (user as any)?.id;
    const hasAccess = await checkCameraAccess(userId, cameraId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create snapshot entry
    const timestamp = Date.now();
    const filename = `snapshot_${cameraId}_${timestamp}.jpg`;
    const filepath = `/snapshots/${filename}`;

    const snapshot = await prisma.snapshot.create({
      data: {
        cameraId,
        userId,
        filename,
        filepath,
      },
      include: {
        camera: true,
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error: any) {
    console.error('Capture snapshot error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to capture snapshot' },
      { status: 500 }
    );
  }
}
