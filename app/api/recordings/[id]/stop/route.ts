import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, checkCameraAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// POST stop recording
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    // Get recording
    const recording = await prisma.recording.findUnique({
      where: { id },
      include: { camera: true },
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check access
    const userId = (user as any)?.id;
    const hasAccess = await checkCameraAccess(userId, recording.cameraId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (recording.status !== 'RECORDING') {
      return NextResponse.json(
        { error: 'Recording is not active' },
        { status: 400 }
      );
    }

    // Stop recording
    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - recording.startTime.getTime()) / 1000
    ); // duration in seconds

    const updatedRecording = await prisma.recording.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endTime,
        duration,
      },
      include: {
        camera: true,
      },
    });

    // Create alert
    await prisma.alert.create({
      data: {
        type: 'RECORDING_STOPPED',
        cameraId: recording.cameraId,
        title: 'Recording Stopped',
        message: `Recording stopped for camera ${recording.camera?.name}. Duration: ${duration}s`,
      },
    });

    return NextResponse.json(updatedRecording);
  } catch (error: any) {
    console.error('Stop recording error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to stop recording' },
      { status: 500 }
    );
  }
}
