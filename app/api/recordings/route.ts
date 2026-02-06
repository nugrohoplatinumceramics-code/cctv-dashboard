import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, checkCameraAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET all recordings (filtered by user permissions)
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const cameraId = searchParams.get('cameraId');

    const userRole = (user as any)?.role;
    const userId = (user as any)?.id;

    // Build query based on user role
    let whereClause: any = {};

    if (userRole !== 'ADMIN') {
      // Regular user can only see recordings from cameras they have access to
      const userCameras = await prisma.userCameraPermission.findMany({
        where: { userId },
        select: { cameraId: true },
      });
      const cameraIds = userCameras.map((p: any) => p.cameraId);
      whereClause.cameraId = { in: cameraIds };
    }

    if (cameraId) {
      whereClause.cameraId = cameraId;
      // Check access for specific camera
      const hasAccess = await checkCameraAccess(userId, cameraId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const recordings = await prisma.recording.findMany({
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
            email: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100, // Limit to latest 100 recordings
    });

    return NextResponse.json(recordings);
  } catch (error: any) {
    console.error('Get recordings error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}

// POST start new recording
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

    // Check if there's already an active recording for this camera
    const activeRecording = await prisma.recording.findFirst({
      where: {
        cameraId,
        status: 'RECORDING',
      },
    });

    if (activeRecording) {
      return NextResponse.json(
        { error: 'Camera is already recording' },
        { status: 400 }
      );
    }

    // Create recording entry
    const timestamp = Date.now();
    const filename = `recording_${cameraId}_${timestamp}.mp4`;
    const filepath = `/recordings/${filename}`;

    const recording = await prisma.recording.create({
      data: {
        cameraId,
        userId,
        filename,
        filepath,
        status: 'RECORDING',
      },
      include: {
        camera: true,
      },
    });

    // Create alert
    await prisma.alert.create({
      data: {
        type: 'RECORDING_STARTED',
        cameraId,
        title: 'Recording Started',
        message: `Recording started for camera ${recording.camera?.name}`,
      },
    });

    return NextResponse.json(recording, { status: 201 });
  } catch (error: any) {
    console.error('Start recording error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start recording' },
      { status: 500 }
    );
  }
}
